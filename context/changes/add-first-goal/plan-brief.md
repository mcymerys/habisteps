# Add a goal with target, minimum and schedule — Plan Brief

> Full plan: `context/changes/add-first-goal/plan.md`

## What & Why

Roadmap slice S-01 (HAB-6): a signed-in user lands on their goal list, adds a goal through a six-step form, and sees it on a detail page with a 0-day streak and text progress. It heads the whole roadmap — every later slice (logging, Weekly Review, slots, friends) reads the goal model created here — and, as the first slice to create tables, it ships owner-only row-level security from day one.

## Starting Point

Auth (email + password, cookie sessions, `PROTECTED_ROUTES` middleware) and CI with an HTTP smoke test against local Supabase already exist. There are no tables, no migrations, no zod, and `/dashboard` is a starter placeholder; sign-in currently lands on the starter hero at `/`.

## Desired End State

After sign-in the user lands on `/dashboard` with their goals listed (or an empty state). "Add goal" opens `/goals/new`, a six-step form that blocks invalid steps inline; submitting creates the goal and opens `/goals/<id>`, showing its parameters, `Streak: 0 days` and e.g. `This week: 0 / 5 (minimum 2)`. Any other user — or a malformed URL — gets a 404, and CI proves it on every PR.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| End condition | Optional numeric target + minimum + one shared unit | S-06 (3× rule) and S-04 (suggested new values) need numbers; some habits have no measurable amount. |
| Unit | Fixed list: minutes, hours, times, pages, km, steps | Comparable values without parsing free text. |
| Priority | Integer 1–5, **1 = highest** (default 3) | Matches the P1/P2 convention; fewer ties for S-09 queueing than three levels. |
| Goal list location | `/dashboard`; sign-in redirects there | Reuses the existing protected route and Topbar link. |
| One-off deadline passed (PRD OQ1) | Deferred to S-02 / S-08 | S-01 has no logging or archive to act on it; it only stores and shows the deadline. |
| Form submission | React island, JSON `fetch` to `POST /api/goals` | Nested data and per-field server errors mapped back to the right step. |
| Frequency limits | Logical only: `1 ≤ minimum ≤ target`, no upper cap | Leaves the "> 7x/week" warn-or-justify flow to S-06. |
| Fixed weekdays | Day set only, no separate min/target count | PRD: a missed scheduled day breaks the streak immediately. |
| Isolation check | Extend `scripts/smoke.mjs` with a second user | Automated in CI, zero new dependencies; F-01 owns the unit-test harness. |
| Progress text | `This week: 0 / N …` with fixed 0 until S-02 | Final format now, so S-02 only supplies the real count. |

## Scope

**In scope:**
- `goals` table, enums, CHECK constraints, RLS (select/insert/update own; no delete)
- `zod`, shared goal schema, `src/types.ts`, goal service
- `POST /api/goals`; `/goals` route protection; sign-in → `/dashboard`
- `/dashboard` list, `/goals/new` six-step form, `/goals/<id>` detail
- Smoke test: 401/redirect, 400, owner create + read, second user 404

**Out of scope:**
- Logging days, real streak/XP (S-02); SMART warnings (S-06); edit / archive (S-07 / S-08)
- Slots and queueing (S-09); public/private and friends (S-13); today-view ordering (S-05)
- Post-deadline behaviour of one-off goals; unit-test runner (F-01); generated DB types

## Architecture / Approach

Layered bottom-up: SQL migration (shape invariants as CHECK constraints + RLS) → `src/lib/schemas/goal.ts` (one zod schema, validated per step in the island and in full in the API) → `src/lib/services/goals.ts` (queries through the request-scoped, RLS-bound Supabase client) → `POST /api/goals` → Astro pages + `AddGoalForm` island with a `useMultiStepForm` hook. Display text comes from pure helpers in `src/lib/goal-format.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Data model, RLS and schema | `goals` table with owner-only RLS; zod schema; types | Model choices here are read by every later slice |
| 2. Service, API and routing | `POST /api/goals`, `/goals` protection, sign-in → `/dashboard` | Returning redirects instead of 401 JSON to `fetch` |
| 3. List, form and detail | Three screens covering US-01 | Mapping server field errors back to the right step |
| 4. Isolation smoke test | CI proof that user B cannot see user A's goal | A test that passes even when RLS is loosened (checked manually) |

**Prerequisites:** Docker running for local Supabase (`npx supabase start`); no dependency on F-01.
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- Deadline "not in the past" uses the UTC date; the per-user time-zone question is still open (roadmap S-03), so a user near midnight may see a ±1-day edge.
- The hosted database needs `npx supabase db push` before or with the deploy, since the CI deploy job does not run migrations.
- No delete policy: until S-08 exists, a goal created by mistake can only be removed manually by an operator.

## Success Criteria (Summary)

- The US-01 walk-through works end to end: empty list → six-step form → detail page with streak 0 and weekly progress text → goal on the list.
- A second account cannot see or open the first account's goal, verified automatically by the smoke test in CI.
