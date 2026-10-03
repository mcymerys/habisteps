---
project: habistep
researched_at: 2026-09-27
recommended_platform: Cloudflare Workers + Pages
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript/JavaScript (Node 22 target)
  framework: Astro 7 SSR + React 19 islands
  runtime: Cloudflare Workers (nodejs_compat)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

Habistep is already deployed here (`wrangler.jsonc`, `src/worker.ts`, an existing Cron Trigger for the weekly-review job), so this recommendation carries zero migration cost — the alternative platforms (Vercel, Netlify, Render, Railway, Fly.io) all require swapping the Astro adapter and re-plumbing the scheduled job. Cloudflare scored 5/5 (Pass) on all agent-friendly criteria, is the cheapest option at every scale point researched ($5–$20/mo through 100k users), is the only genuinely edge-native choice (the developer said global latency matters), and — a late addition to this research — its CPU-time billing model does not charge for time spent waiting on external HTTP calls, making a future LLM-based SMART-goal-evaluation feature effectively free to run, backed by Cloudflare's own GA, free-tier AI Gateway for caching/rate-limiting/observability of that LLM traffic.

## Platform Comparison

Hard filters applied: none dropped any candidate — the developer confirmed the app needs no persistent connections (WebSockets/long-lived workers), so serverless-only platforms (Cloudflare, Vercel, Netlify) were not excluded. Weights applied per interview: minimize cost (Q2), no existing platform familiarity (Q3, no tie-break bonus), global/edge reach matters (Q4), external providers (Supabase) are fine (Q5, no co-location bonus).

| Platform       | CLI-first                                        | Managed/Serverless                                                                           | Agent-readable docs                               | Stable deploy API | MCP / Integration                    | Total             |
| -------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------- | ------------------------------------ | ----------------- |
| **Cloudflare** | Pass                                             | Pass                                                                                         | Pass                                              | Pass              | Pass                                 | 5 Pass            |
| Vercel         | Pass                                             | Pass                                                                                         | Pass                                              | Pass              | Partial (MCP beta)                   | 4 Pass, 1 Partial |
| Netlify        | Partial (rollback is UI-only, no CLI subcommand) | Pass                                                                                         | Pass                                              | Pass              | Pass                                 | 4 Pass, 1 Partial |
| Render         | Partial (CLI rollback thinner than dashboard)    | Pass                                                                                         | Pass                                              | Pass              | Pass                                 | 4 Pass, 1 Partial |
| Railway        | Partial (full rollback is dashboard-only)        | Pass                                                                                         | Pass                                              | Pass              | Partial (MCP server new/early, 2026) | 3 Pass, 2 Partial |
| Fly.io         | Pass                                             | Partial (raw VM; no native cron-expression scheduler, needs Supercronic/Cron Manager add-on) | Partial (no confirmed GitHub markdown doc source) | Pass              | Pass                                 | 3 Pass, 2 Partial |

Notes per platform:

- **Cloudflare**: `wrangler deploy`/`rollback`/`tail` are all GA and deterministic; `nodejs_compat`/`nodejs_compat_v2` cover the Supabase client; `llms.txt`/`llms-full.txt` published per-product plus a docs-for-agents index; hosted OAuth-backed MCP servers (Workers, D1, R2, DNS) are GA.
- **Vercel**: official `@astrojs/vercel` adapter is GA; CLI deploy/rollback/logs are GA; llms.txt/llms-full.txt are GA; native WebSocket support is public beta (not needed here); Vercel MCP is public beta, read-only-leaning.
- **Netlify**: official `@astrojs/netlify` adapter is GA; Scheduled Functions are GA but have a hard 10s(free)/26s(paid) execution timeout — a real risk if the weekly-review job's Supabase writes grow heavy; Netlify MCP Server is GA since mid-2025.
- **Render**: native Node web service + official Astro deploy guide; native Cron Job service type (GA) is a clean fit for the weekly job; official MCP server GA since Aug 2025 with Claude Code plugin support; free tier spins down after 15 min idle, unsuitable for production.
- **Railway**: usage-based billing (~$5–15/mo regardless of request volume, driven by allocated compute not requests); native per-service Cron Schedule (GA) with a 5-minute minimum interval and best-effort timing, fine for a weekly job but requires moving the job into its own Railway service; MCP server launched 2026, early/less battle-tested.
- **Fly.io**: runs full VMs (only platform here with unrestricted persistent-process/WebSocket support, not needed for this MVP); free tier mostly removed for new accounts (2h/7-day trial only); no native cron-expression scheduler — requires bundling Supercronic or using the community Cron Manager pattern, a real architectural deviation from the current Cron-Trigger-based job.

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

Wins on every criterion, costs the least at every researched scale (see Risk Register / scale notes below), is already the live deployment target (no migration risk), and is edge-native, matching the developer's stated preference for global reach.

#### 2. Vercel

Strong runner-up — GA adapter, CLI, and docs, comparable agent-friendliness to Cloudflare. The gap: Pro-tier cost is higher for continuous production use than Cloudflare's Free/$5 tiers, and its WebSocket/MCP surfaces are still beta, a soft signal against it when Cloudflare's equivalents are already GA. Migrating would mean replacing `@astrojs/cloudflare` with `@astrojs/vercel` and moving the weekly job from a Workers Cron Trigger to a Vercel Cron Job hitting an API route.

#### 3. Netlify

Comparable strengths to Vercel (GA adapter, GA MCP server, published llms.txt), but its Scheduled Functions carry a hard 10s/26s execution timeout that is a genuine risk for a fan-out weekly-review job as it grows, and its CLI has no rollback subcommand (rollback is dashboard-only), a minor but real gap against the CLI-first criterion.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. Lock-in to Workers-specific runtime quirks: a known open bug where Astro's SSR middleware can mis-detect Node under certain `compatibility_date` values (GitHub astro#14511), requiring a `disable_nodejs_process_v2` compatibility-flag workaround — debugging edge-runtime-specific serialization issues costs real time in a 6-week solo, after-hours timeline.
2. The Free tier's 10ms-CPU-per-invocation ceiling is easy to exceed once SMART-validation, XP/streak math, and the still-TODO weekly-review generation logic land, forcing a move to the Paid plan ($5/mo) sooner and with less warning than expected.
3. Cron Triggers share the same CPU-time model as regular requests (though with a much larger 15-minute budget for ≥1hr intervals) — a weekly-review job that iterates over all users' goals could still hit that ceiling at moderate scale, and Cloudflare's own documented escape valve (fanning out through Cloudflare Queues) is a real architecture change, not a config flag.
4. Any future stateful/real-time feature (e.g., live friend-activity notifications — explicitly out of MVP scope today but a plausible v2 direction) would require Durable Objects, a materially different and costlier programming model than plain Workers.
5. Debugging happens inside a V8 isolate, not a familiar Node process — stack traces and runtime behavior differ from "plain Node," adding cognitive overhead for a developer not already steeped in the Workers mental model.

### Pre-Mortem — How This Could Fail

The team deployed Habistep's Astro SSR app on Cloudflare Workers for the MVP. Six months later, it was a slow-burning headache rather than a dramatic failure. The assumption that "it's already running there, so it's the safe choice" masked that nobody had budgeted real time to learn the Workers runtime model deeply. The weekly-review job — flagged as a TODO at scaffolding time — grew complex once goal/streak/XP logic landed, and it started intermittently failing on the free tier's 10ms CPU ceiling for users with many goals, silently skipping their Weekly Review (violating the "every user, every week" guardrail) until CPU-time metrics were added weeks later. The Astro-middleware body-serialization bug resurfaced after a routine compatibility-date bump, costing a full evening to trace to a one-line compatibility-flag fix. None of this was fatal, but each incident ate hours that a 6-week, after-hours-only solo timeline couldn't spare, and the "it's basically free" cost assumption quietly became a real monthly bill once traffic and job logic arrived.

### Unknown Unknowns

- Cron Triggers have their own logging/observability path, separate from HTTP request logs — diagnosing "why didn't this user get their Weekly Review" requires learning `wrangler tail` filtering for scheduled events specifically.
- A `compatibility_date` bump — even from a routine dependency update — can silently change low-level Node-compat behavior (as the middleware bug shows); Workers apps should treat compatibility-date changes with the same caution as a runtime major-version upgrade, which isn't obvious from marketing pages.
- The CPU-time limit is compute time, not wall-clock time: network I/O to Supabase (or a future LLM API) doesn't count against it, but JSON parsing/serialization and business logic (SMART validation, XP calculations) do — easy to misjudge when estimating whether you'll exceed a tier.
- `wrangler rollback` reverts code but not any side effects already written to the external Supabase database during a bad deploy — that safety net (migration discipline, backups) has to be built separately, not assumed from the platform.
- Cloudflare's hosted MCP server uses OAuth tied to a Cloudflare account/API token; a token scoped too broadly could let an agent touch other Workers/zones on the same account beyond this project — scope a dedicated, narrow API token rather than relying on default OAuth session permissions.

## Operational Story

- **Preview deploys**: Cloudflare Pages/Workers builds a preview deployment per branch/PR automatically via the Git integration; preview URLs are public by default unless Cloudflare Access is configured to gate them — worth adding Access if preview content should stay private.
- **Secrets**: `SUPABASE_URL`/`SUPABASE_KEY` are declared server-only via `astro:env/server` in `astro.config.mjs`; runtime secrets (including `SUPABASE_SERVICE_ROLE_KEY` for the weekly job) live in Cloudflare Workers Secrets (`wrangler secret put`), readable only by the Worker at runtime — never checked into git. Local dev secrets go in `.dev.vars` (gitignored). Rotation is a `wrangler secret put` re-run; no separate revocation step is needed since old values are simply overwritten.
- **Rollback**: `wrangler rollback [deployment-id]` (or `wrangler deployments list` then rollback) creates a new deployment instantly, reverting code across all routes/domains — typically seconds, no rebuild. Caveat: this reverts code only, not any data already written to the external Supabase database by a bad deploy, so a bad migration needs its own DB-level recovery plan.
- **Approval**: routine `wrangler deploy` to production can run unattended by CI (GitHub Actions auto-deploy-on-merge per this project's existing setup). A human should approve: rotating `SUPABASE_SERVICE_ROLE_KEY` or any production secret, and any Supabase migration that alters existing data shape. An agent may safely run `wrangler deploy`, `wrangler rollback`, and read-only log/tail commands unattended.
- **Logs**: `wrangler tail` streams live logs from the Worker (filter by status/method); for the weekly Cron Trigger specifically, filter `wrangler tail` for scheduled-event invocations rather than HTTP requests. Cloudflare's hosted MCP servers (`mcp.cloudflare.com/mcp`) also expose Workers/observability tools for structured, agent-driven log/status queries as an alternative to raw CLI output parsing.

## Risk Register

| Risk                                                                                                                                                     | Source                                                    | Likelihood           | Impact | Mitigation                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free-tier 10ms CPU/invocation ceiling silently breaks the weekly-review job as its logic grows, causing missed Weekly Reviews (violates NFR-006)         | Devil's advocate / Research finding                       | M                    | H      | Move to Workers Paid plan ($5/mo) before implementing real weekly-review generation logic; add CPU-time metrics/alerting on the scheduled handler                                                                                                     |
| Astro SSR middleware mis-detects Node under certain `compatibility_date` values (astro#14511), causing body-serialization errors                         | Research finding                                          | L                    | M      | Pin `compatibility_date`, test after any bump; apply `disable_nodejs_process_v2` compatibility flag if the bug surfaces                                                                                                                               |
| A single Cron Trigger invocation can't finish iterating all users' Weekly Reviews once user count grows (even with the 15-min budget for ≥1hr intervals) | Pre-mortem / Research finding                             | M (at 10k+ users)    | M      | Adopt the documented Cloudflare Queues fan-out pattern: cron enqueues per-user jobs, a queue-consumer Worker processes them with its own longer wall-time budget                                                                                      |
| `wrangler rollback` reverts code but not data already written to external Supabase during a bad deploy                                                   | Unknown unknowns                                          | L                    | H      | Treat Supabase migrations with the same care as production DB changes elsewhere: reversible migrations, backups before risky deploys, staged rollout for schema changes                                                                               |
| Overly broad Cloudflare MCP OAuth token scope lets an agent touch unrelated Workers/zones on the same account                                            | Unknown unknowns                                          | L                    | M      | Create a dedicated, narrowly-scoped API token for MCP/agent use rather than relying on default OAuth session permissions                                                                                                                              |
| Future stateful/real-time feature (e.g., live friend notifications) would require Durable Objects, a materially different programming model              | Devil's advocate                                          | L (not in MVP scope) | M      | Revisit architecture explicitly if/when a v2 feature requires persistent connections; not a blocker for the current MVP scope                                                                                                                         |
| LLM-based SMART-goal evaluation (planned future feature) adds external API dependency and cost                                                           | Research finding (developer-requested scale/LLM research) | M (if built)         | L      | Network wait time on `fetch()` does not count against Workers CPU billing, so LLM calls are cheap to run; route calls through Cloudflare's free-tier AI Gateway for caching, rate-limiting, and observability                                         |
| Weekly-review fan-out cost climbs with user growth                                                                                                       | Research finding (developer-requested scale research)     | L                    | L      | Cost stays low through 100k users on current estimates (~$5/mo at 1k, ~$5.15/mo at 10k, ~$20/mo at 100k users, at an estimated 12.5 req/user/day) — revisit if actual CPU-ms/request diverges significantly from the ~10ms/request estimate used here |

**Note on scale estimates**: the cost figures above assume ~12.5 requests/user/day and ~10ms CPU-time/request; the CPU-time-per-request figure is an estimate, not a documented platform constant, since it depends on this app's actual SSR render cost and Supabase round-trip work. Revisit with real production metrics once traffic exists.

## Getting Started

1. The project is already scaffolded for Cloudflare — confirm `wrangler.jsonc`'s `compatibility_date` is current and re-test after any bump, given the known Astro-middleware body-serialization issue on certain dates.
2. Local dev: `npx wrangler dev` for a Workers-accurate local server (or `npm run dev` for the plain Astro dev server, per existing project scripts); test the cron path with `npx wrangler dev --test-scheduled` and trigger it via `curl "http://localhost:8787/__scheduled?cron=0+6+*+*+1"`.
3. Set production secrets before first deploy: `npx wrangler secret put SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (the last one only needed by the Worker's `scheduled()` handler, never exposed client-side).
4. Deploy with `npx wrangler deploy`; verify with `npx wrangler tail` that both HTTP requests and the scheduled weekly job are logging as expected.
5. Once the weekly-review job's generation logic is implemented (currently a TODO per `src/lib/jobs/weekly-review.ts`), move to the Workers Paid plan ($5/mo) before it runs against real user data, and add basic CPU-time/error alerting on the scheduled handler.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Full production-scale architecture (multi-region HA, disaster recovery, SLA commitments) — the 1k/10k/100k user cost and cron-scaling notes above are directional estimates for planning, not a production architecture plan
