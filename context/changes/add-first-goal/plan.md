# Add a goal with target, minimum and schedule — Implementation Plan

## Overview

Roadmap slice **S-01** (`add-first-goal`, HAB-6). A signed-in user lands on their goal list at `/dashboard`, adds a goal through a six-step form (name → type/deadline → optional end condition → schedule → category → priority), and is taken to the goal's detail page showing a 0-day streak and text progress. This is the first slice to create domain tables, so owner-only row-level security ships in the same migration, and the smoke test proves a second user cannot see the goal.

## Current State Analysis

- No domain data at all: `supabase/migrations/` does not exist, so there are zero tables and zero RLS policies.
- Auth is complete: `src/middleware.ts` resolves `context.locals.user` on every request and redirects anonymous users away from `PROTECTED_ROUTES` (currently only `/dashboard`).
- `src/pages/dashboard.astro` is a starter placeholder ("This page is only for authenticated users") with a sign-out form; `src/components/Topbar.astro:10` already links signed-in users to `/dashboard`.
- `src/pages/api/auth/signin.ts` redirects to `/` after a successful sign-in, which renders the starter `Welcome.astro` hero.
- Auth forms are React islands using native `<form method="POST">` + server redirect + `?error=`; field styling lives in `src/components/auth/FormField.tsx`.
- **zod is not installed** although `CLAUDE.md` requires it for API input validation; `src/types.ts` does not exist yet.
- `scripts/smoke.mjs` is a zero-dependency HTTP smoke test with a cookie jar; the CI `smoke` job runs it against a production preview backed by a local Supabase started with `supabase start`, which applies `supabase/migrations/` automatically.
- Local Supabase has `enable_confirmations = false` (`supabase/config.toml:209`), so a freshly signed-up account can sign in immediately.

## Desired End State

- `public.goals` exists with enums, CHECK constraints encoding the PRD's goal shape, and RLS allowing each authenticated user to select / insert / update only their own rows (no delete — NFR-005).
- `POST /api/goals` validates JSON with a shared zod schema and creates a goal owned by the caller (201 `{ id }`, 400 field errors, 401 when signed out).
- After sign-in the user lands on `/dashboard`, which lists their goals (priority ascending, then oldest first) or an empty state with an "Add goal" link.
- `/goals/new` hosts the six-step React form; on success the browser navigates to `/goals/<id>`.
- `/goals/<id>` shows the goal's parameters, `Streak: 0 days`, and a weekly progress line; another user (or a malformed id) gets a 404.
- `npm run smoke` passes and covers: anonymous 401/redirect, validation 400, create + view as owner, and 404 / absence from list for a second user.

### Key Discoveries:

- `src/middleware.ts:4` — `PROTECTED_ROUTES` is a prefix list; adding `/goals` protects both `/goals/new` and `/goals/<id>`. API routes must answer 401 themselves (a redirect is wrong for `fetch`).
- `src/pages/api/auth/signin.ts:22` — the post-sign-in redirect target; smoke step "signin accepts correct password" asserts its `location`.
- `src/lib/supabase.ts` — the cookie-based server client uses the anon key + the user's JWT, so every query through it is subject to RLS. Do not use the service-role key anywhere in this slice.
- `scripts/smoke.mjs:24` — `request()` only supports form bodies and returns status/location; it needs a JSON body option and the response text.
- `.github/workflows/ci.yml` smoke job — no workflow change needed; the new migration is applied by `supabase start`.

## What We're NOT Doing

- **Behaviour after a one-off goal's deadline passes** (PRD Open Question 1) — deferred to S-02 (logging) / S-08 (archive); S-01 only stores and displays the deadline.
- **Logging a day, real streak/XP computation** — S-02. The detail page shows fixed `0` values.
- **SMART warnings** (frequency > 7/week, target > 3× minimum) — S-06. S-01 enforces only logical consistency, with no upper frequency limit.
- **Goal slots and queueing** — S-09. Priority is stored but every goal is shown as active.
- **Editing and archiving** — S-07 / S-08. The update RLS policy is created now (owner-only) so S-07 needs no policy migration; no delete policy is ever created.
- **Public/private visibility** — S-13.
- **Today-view sorting and "Show more"** — S-05 replaces the S-01 list ordering.
- **A test runner / unit tests** — F-01 (`domain-rule-checks`) owns the harness. Pure helpers added here are written so F-01 can cover them later.
- **Generated Supabase DB types** — row types are hand-written in `src/types.ts`.
- **New shadcn components** — native inputs styled with Tailwind + `cn()`, matching the auth forms.

## Implementation Approach

Bottom-up along the standard layering for a database change: migration → shared types + zod schema → service → API → pages and island → end-to-end smoke check. One zod schema is the single definition of a valid goal: the React island validates each step against a slice of it, and the API re-validates the full payload because the server cannot trust the client. The database CHECK constraints repeat the essential invariants as a last line of defence, so a bug in either validation layer cannot store an inconsistent goal that S-02 would later mis-evaluate.

Data shape decisions (from the planning interview):

| Concept                  | Storage                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Goal type                | enum `goal_kind`: `recurring`, `one_off`; `deadline date` present **iff** `one_off`                                                                                                                                                                          |
| End condition (optional) | `end_target_value numeric`, `end_minimum_value numeric`, `end_unit goal_unit` — all three NULL or all three set; `0 < minimum ≤ target`                                                                                                                      |
| Unit list                | enum `goal_unit`: `minutes`, `hours`, `times`, `pages`, `km`, `steps`                                                                                                                                                                                        |
| Schedule                 | enum `schedule_mode`: `flexible` (requires `freq_target`, `freq_minimum` smallint with `1 ≤ minimum ≤ target`, no upper bound; `fixed_days` NULL) or `fixed_days` (requires `fixed_days smallint[]`, non-empty, ISO weekdays 1=Mon…7=Sun; freq columns NULL) |
| Category                 | enum `goal_category`: `fitness`, `health`, `learning`, `work_productivity`, `relationships`, `finance`, `other` (FR-004 list)                                                                                                                                |
| Priority                 | `smallint` 1–5, **1 = highest**; default 3                                                                                                                                                                                                                   |

## Critical Implementation Details

- **Malformed ids must 404, not 500.** Postgres raises an error for a non-UUID compared against a `uuid` column; validate `Astro.params.id` with zod's uuid check before querying, and treat "no row" (RLS-hidden or nonexistent) the same way, so another user's goal is indistinguishable from a missing one.
- **Getting the request-scoped client.** `locals` only carries `user`, so the endpoint and pages call `createClient(request.headers, cookies)` (`Astro.request.headers` / `Astro.cookies` in pages) and pass it to the service. It returns `null` when Supabase env is missing: the endpoint answers `500 { error: "server" }`, pages throw.
- **Never trust `user_id` from the request body.** The zod schema does not declare it (unknown keys are stripped), the service sets it from `locals.user.id`, and the insert RLS `WITH CHECK` rejects any mismatch.

## Phase 1: Data model, RLS and validation schema

### Overview

Create the `goals` table with owner-only RLS, add zod, and define the shared goal schema and TypeScript types that all later phases use.

### Changes Required:

#### 1. Goals migration

**File**: `supabase/migrations/<YYYYMMDDHHmmss>_create_goals.sql`

**Intent**: Create the four enums and the `public.goals` table described in the Implementation Approach table, enforce the shape invariants with CHECK constraints, and enable RLS with granular owner-only policies per the project convention and the "configure RLS early" decision.

**Contract**:

- Columns: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `name text not null` (trimmed length 1–100), `kind goal_kind not null`, `deadline date null`, the three end-condition columns, `schedule_mode schedule_mode not null`, `freq_target smallint`, `freq_minimum smallint`, `fixed_days smallint[]`, `category goal_category not null`, `priority smallint not null default 3` (1–5), `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- Named CHECK constraints: deadline iff one-off; end condition all-or-none with `0 < minimum ≤ target`; schedule exclusivity (flexible ⇒ freq set, `1 ≤ min ≤ target`, `fixed_days` null; fixed ⇒ `cardinality(fixed_days) ≥ 1`, `fixed_days <@ '{1,2,3,4,5,6,7}'`, freq null); priority between 1 and 5.
- Index on `(user_id, priority, created_at)` for the dashboard query.
- `create extension if not exists moddatetime schema extensions;` and a `before update` trigger `goals_set_updated_at` executing `extensions.moddatetime(updated_at)`, so `updated_at` is correct once S-07 adds editing.
- `alter table public.goals enable row level security;` Policies for role `authenticated` only: `goals_select_own` (USING `(select auth.uid()) = user_id`), `goals_insert_own` (WITH CHECK same), `goals_update_own` (USING + WITH CHECK same). No `anon` policies and **no delete policy** (NFR-005: goals are archived, never hard-deleted). A header comment states both omissions are intentional.
- _Addendum (impl review F2):_ the migration also resets table grants — `revoke all ... from anon, authenticated`, then `grant select, insert, update ... to authenticated` — because Supabase grants every privilege on new `public` tables by default. This is intentional least-privilege hardening on top of RLS (so even a missing policy cannot expose DELETE or anon access); S-07 needs no new grant for editing.

#### 2. zod dependency

**File**: `package.json`

**Intent**: Install `zod` as a runtime dependency (`npm install zod`); it is bundled into the island as well as used on the server.

**Contract**: `dependencies.zod` added; lockfile updated.

#### 3. Shared goal schema

**File**: `src/lib/schemas/goal.ts`

**Intent**: Single definition of a valid new goal used by the API (full payload) and the form (per step), including rules the database cannot express (deadline not in the past, de-duplicated sorted weekdays, trimmed name).

**Contract**:

- `createGoalSchema` — object with `name`, `timing` (discriminated union on `kind`: `{ kind: "recurring" }` or `{ kind: "one_off", deadline }` with `deadline` ISO `YYYY-MM-DD` refined to `≥` today's UTC date, with "today" computed inside the refinement on every parse, never at module scope — a module-level date is frozen in a Worker isolate and stale in a long-open tab; the "deadline iff one-off" rule is structural, not a refinement), `endCondition` (`null` or `{ targetValue, minimumValue, unit }` with `0 < minimum ≤ target`), `schedule` (discriminated union on `mode`: `{ mode: "flexible", target, minimum }` integers with `1 ≤ minimum ≤ target`, or `{ mode: "fixed_days", days }` non-empty array of 1–7, normalised to unique ascending), `category`, `priority` (integer 1–5). Cross-field rules use refinements whose issue `path` points at the offending field (e.g. `["endCondition","minimumValue"]`) so errors can be mapped to a step. **Every cross-field rule lives inside a nested object (`timing`, `endCondition`, `schedule`), never on the top-level object**: zod skips a top-level refinement while any other key is still invalid (i.e. while later steps are empty) and `.pick()` throws on refined objects — verified on zod 4.6.5 during plan review.
- `goalStepFields` — ordered list mapping each of the six steps to the top-level keys it owns (`name`; `timing`; `endCondition`; `schedule`; `category`; `priority`), used by the form to validate one step and to find the first step containing a server error.
- Exported inferred type `CreateGoalInput`.
- Enum value arrays (`GOAL_KINDS`, `GOAL_UNITS`, `GOAL_CATEGORIES`, `SCHEDULE_MODES`) exported as the single source for both the schema and UI option lists; they must match the SQL enums exactly.

#### 4. Shared types

**File**: `src/types.ts`

**Intent**: Hand-written entity and DTO types per the `CLAUDE.md` convention.

**Contract**: `GoalRow` (snake_case, mirrors the table), `Goal` (camelCase domain entity with `timing` / `endCondition` / `schedule` shaped like the schema), `CreateGoalResponse = { id: string }`, `ApiValidationError = { error: "validation"; fieldErrors: Record<string, string[]> }`, `ApiError = { error: string }`.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly on a fresh local database: `npx supabase db reset`
- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`

#### Manual Verification:

- In Supabase Studio, `public.goals` shows RLS enabled with exactly three policies (select/insert/update, role `authenticated`) and no delete policy
- In the SQL editor, inserting a recurring goal with a deadline, and a flexible goal with `freq_minimum > freq_target`, are both rejected by named CHECK constraints

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Goal service, API endpoint and routing

### Overview

Add the data-access service and `POST /api/goals`, protect the new page routes, and land signed-in users on `/dashboard`.

### Changes Required:

#### 1. Goal service

**File**: `src/lib/services/goals.ts`

**Intent**: Keep Supabase queries and row ↔ entity mapping out of pages and endpoints; all functions take the request-scoped Supabase client so RLS always applies.

**Contract**:

- `createGoal(supabase, userId, input: CreateGoalInput): Promise<{ id: string }>` — maps the input to columns (flattens `timing` into `kind` / `deadline`, sets `user_id` explicitly) and inserts, returning the id; throws on database error.
- `listGoals(supabase): Promise<Goal[]>` — ordered by `priority asc, created_at asc`.
- `getGoal(supabase, id: string): Promise<Goal | null>` — `null` when no row is visible.
- A private `toGoal(row: GoalRow): Goal` mapper.

#### 2. Create-goal endpoint

**File**: `src/pages/api/goals/index.ts`

**Intent**: JSON endpoint for the form; validates with `createGoalSchema` and creates the goal for the signed-in user.

**Contract**: `export const prerender = false`; `POST` only. Responses (JSON, `Content-Type: application/json`): `401 { error: "unauthorized" }` when `locals.user` is null; `400 { error: "validation", fieldErrors }` for invalid JSON or schema failures (`fieldErrors` keyed by dotted issue path, e.g. `"schedule.minimum"`); `201 { id }` on success; `500 { error: "server" }` on database failure (log the error server-side, do not echo it).

#### 3. Route protection and landing

**Files**: `src/middleware.ts`, `src/pages/api/auth/signin.ts`

**Intent**: Pages under `/goals` require a session, and a successful sign-in lands on the goal list instead of the starter hero.

**Contract**: `PROTECTED_ROUTES = ["/dashboard", "/goals"]`; signin success redirects to `/dashboard` (error redirects unchanged).

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Build passes: `npm run build`

#### Manual Verification:

- With `npm run dev`, signing in redirects to `/dashboard`
- Signed out, `curl -i -X POST http://localhost:4321/api/goals -H "Content-Type: application/json" -H "Origin: http://localhost:4321" -d '{}'` returns 401 JSON
- Signed in (cookie copied from the browser), a valid payload returns 201 with an id and the row appears in Studio with the correct `user_id`; a payload with schedule minimum greater than target returns 400 with a `schedule.minimum` field error

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Goal list, multi-step form and detail page

### Overview

Build the three user-facing screens: the list at `/dashboard`, the six-step form at `/goals/new`, and the detail page at `/goals/<id>`.

### Changes Required:

#### 1. Display helpers

**File**: `src/lib/goal-format.ts`

**Intent**: Pure functions producing the user-facing text, so the pages stay declarative and F-01 can unit-test them later.

**Contract**: `priorityLabel(1–5)` → `Highest | High | Medium | Low | Lowest`; `categoryLabel`, `unitLabel`; `weekdayShort(1–7)` → `Mon…Sun`; `scheduleSummary(goal)` (e.g. `5x/week (minimum 2x)` or `Mon, Wed, Fri`); `endConditionSummary(goal)` → `60 minutes (minimum 30)` or `null`; `weeklyProgressText(goal, completedThisWeek = 0)` → `This week: 0 / 5 (minimum 2)` for flexible, `This week: 0 / 3 scheduled days (Mon, Wed, Fri)` for fixed days. S-02 passes the real count instead of the default.

#### 2. Goal list

**File**: `src/pages/dashboard.astro`

**Intent**: Replace the placeholder with the user's goal list (via `listGoals`), keeping the existing sign-out form and visual style.

**Contract**: Each item links to `/goals/<id>` and shows name, category, priority label, schedule summary and, for one-off goals, the deadline. Empty state: a short message and an "Add goal" link to `/goals/new`; the "Add goal" link is also present when the list is non-empty.

#### 3. Multi-step form state hook

**File**: `src/components/hooks/useMultiStepForm.ts`

**Intent**: Encapsulate step index and navigation so the form component only renders steps (convention: hooks live in `src/components/hooks/`).

**Contract**: `useMultiStepForm(stepCount)` → `{ step, isFirst, isLast, next, back, goTo }`.

#### 4. Add-goal form island

**Files**: `src/components/goals/AddGoalForm.tsx` (plus per-step subcomponents in `src/components/goals/` as the implementer sees fit)

**Intent**: Collect all six steps in client state, validate the current step with the shared schema before advancing, and submit the complete goal as JSON.

**Contract**:

- Steps: (1) name; (2) recurring vs one-off, with a date input shown only for one-off; (3) "Measure each completion?" toggle — when on, target value, minimum value and a unit select from `GOAL_UNITS`; (4) flexible (target and minimum times per week) vs fixed weekdays (Mon–Sun checkboxes); (5) category select; (6) priority 1–5 with labels (default 3) and a read-only summary of all answers, with a "Create goal" button.
- "Next" runs `createGoalSchema.safeParse` on the whole form state and keeps only the issues whose `path[0]` is in `goalStepFields[step]` (no `.pick()`), showing them inline; "Back" keeps entered values.
- Submit: `fetch("/api/goals", { method: "POST", body: JSON })`. 201 → `window.location.assign("/goals/<id>")`; 400 → map `fieldErrors` to fields and jump to the first step containing an error; 401 → navigate to `/auth/signin`; network/500 → general error message, stay on the last step with values intact. The submit button is disabled while the request is pending.
- Inputs styled consistently with `src/components/auth/FormField.tsx`; classes merged with `cn()`; no Next.js directives.

#### 5. New-goal page

**File**: `src/pages/goals/new.astro`

**Intent**: Host the island inside `Layout`.

**Contract**: Renders `<AddGoalForm client:load />` with a back link to `/dashboard`.

#### 6. Goal detail page

**File**: `src/pages/goals/[id].astro`

**Intent**: Show one goal with streak and text progress; 404 for anything not visible to the current user.

**Contract**: Validates `Astro.params.id` as a UUID, calls `getGoal`; when invalid or `null`, sets `Astro.response.status = 404` and renders a "Goal not found" message with a link to `/dashboard`. Otherwise shows name, category, priority label, type (and deadline for one-off), end-condition summary when present, schedule summary, `Streak: 0 days`, and `weeklyProgressText(goal)`.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Build passes: `npm run build`

#### Manual Verification:

- US-01 walk-through: from an empty `/dashboard`, add "Exercise" (recurring, 60/30 minutes, flexible 5/2 per week, Fitness, priority 2) → lands on its detail page showing `Streak: 0 days` and `This week: 0 / 5 (minimum 2)`, and the goal is listed on `/dashboard`
- A one-off goal with fixed days Mon/Wed/Fri shows its deadline and `This week: 0 / 3 scheduled days (Mon, Wed, Fri)`; a goal without an end condition shows no end-condition line
- "Next" is blocked with an inline error for an empty name, a one-off goal without a deadline, a past deadline, minimum greater than target (both end condition and frequency), and fixed days with no day selected; "Back" preserves entered values
- Two goals with different priorities appear on `/dashboard` with the priority-1 goal first
- `/goals/not-a-uuid` and a random valid UUID both show "Goal not found" with HTTP 404

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Cross-user isolation in the smoke test

### Overview

Extend the existing CI smoke test so the owner-only access rule (NFR-002) and the new endpoint are verified on every push and PR.

### Changes Required:

#### 1. Smoke test

**File**: `scripts/smoke.mjs`

**Intent**: Add goal creation and a second account to prove that RLS hides one user's goal from another through the real HTTP path, without adding dependencies.

**Contract**:

- `request()` gains a `json` body option (sends `Content-Type: application/json`) and returns `{ status, location, body }` (response text); expectations gain optional `bodyIncludes` / `bodyExcludes` checks and steps may capture values (the created goal id) for later steps.
- Updated existing step: "signin accepts correct password" expects `location` `/dashboard`.
- New steps, in order: anonymous `POST /api/goals` → 401; anonymous `GET /goals/new` → 302 `/auth/signin`; user A (after sign-in) posts a payload with schedule minimum > target → 400; user A posts a valid goal named `Smoke goal <timestamp>` → 201 and the id is captured; A `GET /goals/<id>` → 200 and the body includes the name; A `GET /dashboard` → body includes the name; A signs out; user B signs up and signs in; B `GET /goals/<id>` → 404; B `GET /dashboard` → 200 and the body excludes the name; B signs out.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Smoke test passes against a local production preview with local Supabase: `npm run build`, `npm run preview -- --port 4321`, then `BASE_URL=http://localhost:4321 npm run smoke`
- CI `smoke` job passes on the pull request

#### Manual Verification:

- Temporarily changing `goals_select_own` to `using (true)` locally (`npx supabase db reset` after the edit) makes the B-side smoke steps fail, then reverting restores a pass — proving the test actually detects a leak
- Before merging the PR (merge auto-deploys, and sign-in now lands on `/dashboard`, which queries `goals`), `npx supabase db push` has applied the migration to the linked hosted project and `public.goals` is visible there

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- None in this slice — F-01 introduces the harness. `src/lib/goal-format.ts` and `src/lib/schemas/goal.ts` are pure and are the first candidates for F-01 to cover (minimum ≤ target boundaries, deadline = today accepted, weekday de-duplication).

### Integration Tests:

- `scripts/smoke.mjs` (Phase 4): auth gate, validation error, create + read as owner, invisibility to a second user.

### Manual Testing Steps:

1. Sign in → land on empty `/dashboard` → "Add goal".
2. Complete the US-01 example and confirm the detail page text.
3. Try each invalid input listed in Phase 3 and confirm the form blocks on the right step.
4. Sign in as a second user in a private window and open the first user's goal URL → 404.

## Performance Considerations

NFR-003 (< 2 s): the dashboard is one indexed query per user (`user_id, priority, created_at`); the detail page is a primary-key lookup. No caching needed at this scale (1–10 users).

## Migration Notes

First migration in the repository; there is no existing data. Applies locally via `npx supabase db reset` and in CI via `supabase start`. For the hosted project, apply with `npx supabase db push` before (or together with) deploying the Worker — the deploy job does not run migrations, so deploying the code first would make `/dashboard` fail against a database with no `goals` table.

## References

- Roadmap slice: `context/foundation/roadmap.md` — S-01 (`add-first-goal`)
- PRD: `context/foundation/prd.md` — US-01, US-02, FR-001, FR-004, FR-005, FR-014, NFR-002; Business Logic (scheduling modes, one-off goals)
- Auth form pattern: `src/components/auth/SignInForm.tsx`, `src/components/auth/FormField.tsx`
- Route protection: `src/middleware.ts:4`
- Smoke harness: `scripts/smoke.mjs`; CI job: `.github/workflows/ci.yml` (`smoke`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Data model, RLS and validation schema

#### Automated

- [x] 1.1 Migration applies cleanly on a fresh local database: `npx supabase db reset` — 3cbe623
- [x] 1.2 Linting passes: `npm run lint` — 3cbe623
- [x] 1.3 Type checking passes: `npx astro check` — 3cbe623

#### Manual

- [x] 1.4 In Supabase Studio, `public.goals` shows RLS enabled with exactly three policies (select/insert/update, role `authenticated`) and no delete policy — 3cbe623
- [x] 1.5 In the SQL editor, inserting a recurring goal with a deadline, and a flexible goal with `freq_minimum > freq_target`, are both rejected by named CHECK constraints — 3cbe623

### Phase 2: Goal service, API endpoint and routing

#### Automated

- [x] 2.1 Linting passes: `npm run lint` — 4e7af36
- [x] 2.2 Type checking passes: `npx astro check` — 4e7af36
- [x] 2.3 Build passes: `npm run build` — 4e7af36

#### Manual

- [x] 2.4 With `npm run dev`, signing in redirects to `/dashboard` — 4e7af36
- [x] 2.5 Signed out, POST `/api/goals` returns 401 JSON — 4e7af36
- [x] 2.6 Signed in, a valid payload returns 201 and the row has the correct `user_id`; schedule minimum > target returns 400 with a `schedule.minimum` field error — 4e7af36

### Phase 3: Goal list, multi-step form and detail page

#### Automated

- [x] 3.1 Linting passes: `npm run lint` — ce9ec61
- [x] 3.2 Type checking passes: `npx astro check` — ce9ec61
- [x] 3.3 Build passes: `npm run build` — ce9ec61

#### Manual

- [x] 3.4 US-01 walk-through lands on the detail page with `Streak: 0 days` and `This week: 0 / 5 (minimum 2)`, and the goal is listed on `/dashboard` — ce9ec61
- [x] 3.5 One-off fixed-days goal shows deadline and scheduled-days progress; goal without end condition shows no end-condition line — ce9ec61
- [x] 3.6 "Next" blocks each invalid input with an inline error; "Back" preserves values — ce9ec61
- [x] 3.7 Priority-1 goal is listed before a lower-priority goal on `/dashboard` — ce9ec61
- [x] 3.8 `/goals/not-a-uuid` and a random valid UUID return 404 "Goal not found" — ce9ec61

### Phase 4: Cross-user isolation in the smoke test

#### Automated

- [x] 4.1 Linting passes: `npm run lint` — 9895038
- [x] 4.2 Smoke test passes against a local production preview with local Supabase — 9895038
- [x] 4.3 CI `smoke` job passes on the pull request — 9895038

#### Manual

- [x] 4.4 Loosening `goals_select_own` locally makes the B-side smoke steps fail; reverting restores a pass — 9895038
- [x] 4.5 `npx supabase db push` applied to the linked hosted project before merging the PR — 9895038
