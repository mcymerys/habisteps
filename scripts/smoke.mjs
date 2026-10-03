// Smoke test: proves the built app, the Cloudflare adapter and the Supabase auth flow still work together.
// Zero dependencies on purpose. Run against a live server: BASE_URL=http://localhost:4321 node scripts/smoke.mjs

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const runId = Date.now();
const email = `smoke-${runId}@example.com`;
const emailB = `smoke-b-${runId}@example.com`;
const password = "Smoke-Test-Passw0rd!";
const goalName = `Smoke goal ${runId}`;
let goalId = ""; // captured from the create response, used by the owner and cross-user steps
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(response) {
  for (const raw of response.headers.getSetCookie()) {
    const [pair, ...attrs] = raw.split(";");
    const [name, ...rest] = pair.split("=");
    const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
    if (expired) jar.delete(name.trim());
    else jar.set(name.trim(), rest.join("="));
  }
}

async function request(path, { method = "GET", form, json } = {}) {
  const response = await fetch(BASE_URL + path, {
    method,
    redirect: "manual",
    headers: {
      Cookie: cookieHeader(),
      Origin: BASE_URL,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(json ? { "Content-Type": "application/json" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : json ? JSON.stringify(json) : undefined,
  });
  storeCookies(response);
  return {
    status: response.status,
    location: response.headers.get("location") ?? "",
    body: await response.text(),
  };
}

const validGoal = {
  name: goalName,
  timing: { kind: "recurring" },
  endCondition: { targetValue: 60, minimumValue: 30, unit: "minutes" },
  schedule: { mode: "flexible", target: 5, minimum: 2 },
  category: "fitness",
  priority: 2,
};

// Guards the cross-user steps: without a captured id they would request /goals/ and pass on a 404 for the wrong reason.
function requestGoalPage() {
  if (!goalId) return { status: 0, location: "", body: "no goal id captured, the create step failed" };
  return request(`/goals/${goalId}`);
}

// Each step: [name, run, expected]. expected may set status, location (prefix match), bodyIncludes,
// bodyExcludes and capture(actual), which runs after the checks to stash values for later steps.
const steps = [
  ["home renders", () => request("/"), { status: 200 }],
  ["dashboard redirects anonymous user", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "anonymous create goal is rejected",
    () => request("/api/goals", { method: "POST", json: validGoal }),
    { status: 401 },
  ],
  ["new goal page redirects anonymous user", () => request("/goals/new"), { status: 302, location: "/auth/signin" }],
  [
    "signup creates account",
    () => request("/api/auth/signup", { method: "POST", form: { email, password } }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "signin rejects wrong password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password: "wrong" } }),
    { status: 302, location: "/auth/signin?error=" },
  ],
  [
    "signin accepts correct password",
    () => request("/api/auth/signin", { method: "POST", form: { email, password } }),
    { status: 302, location: "/dashboard" },
  ],
  ["dashboard renders for signed-in user", () => request("/dashboard"), { status: 200 }],
  [
    "create goal rejects minimum above target",
    () =>
      request("/api/goals", {
        method: "POST",
        json: { ...validGoal, schedule: { mode: "flexible", target: 2, minimum: 5 } },
      }),
    { status: 400, bodyIncludes: "schedule.minimum" },
  ],
  [
    "create goal as user A",
    () => request("/api/goals", { method: "POST", json: validGoal }),
    {
      status: 201,
      capture: (actual) => {
        try {
          goalId = JSON.parse(actual.body).id ?? "";
        } catch {
          goalId = "";
        }
      },
    },
  ],
  ["user A sees own goal page", requestGoalPage, { status: 200, bodyIncludes: goalName }],
  ["user A sees goal on dashboard", () => request("/dashboard"), { status: 200, bodyIncludes: goalName }],
  ["signout clears session", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
  ["dashboard redirects after signout", () => request("/dashboard"), { status: 302, location: "/auth/signin" }],
  [
    "signup creates user B",
    () => request("/api/auth/signup", { method: "POST", form: { email: emailB, password } }),
    { status: 302, location: "/auth/confirm-email" },
  ],
  [
    "signin accepts user B",
    () => request("/api/auth/signin", { method: "POST", form: { email: emailB, password } }),
    { status: 302, location: "/dashboard" },
  ],
  ["user B gets 404 for user A goal", requestGoalPage, { status: 404 }],
  ["user B dashboard does not list user A goal", () => request("/dashboard"), { status: 200, bodyExcludes: goalName }],
  ["user B signout", () => request("/api/auth/signout", { method: "POST" }), { status: 302, location: "/" }],
];

let failed = 0;
for (const [name, run, expected] of steps) {
  const actual = await run();
  const problems = [];
  if (actual.status !== expected.status) problems.push(`expected status ${expected.status}`);
  if (expected.location !== undefined && !actual.location.startsWith(expected.location)) {
    problems.push(`expected location ${expected.location}`);
  }
  if (expected.bodyIncludes !== undefined && !actual.body.includes(expected.bodyIncludes)) {
    problems.push(`expected body to include "${expected.bodyIncludes}"`);
  }
  if (expected.bodyExcludes !== undefined && actual.body.includes(expected.bodyExcludes)) {
    problems.push(`expected body to exclude "${expected.bodyExcludes}"`);
  }
  expected.capture?.(actual);

  const ok = problems.length === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> ${actual.status} ${actual.location}`);
  if (!ok) {
    failed++;
    for (const problem of problems) console.log(`      ${problem}`);
  }
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll smoke steps passed");
process.exit(failed ? 1 : 0);
