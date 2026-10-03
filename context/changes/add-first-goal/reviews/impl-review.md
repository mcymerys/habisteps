<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Add a goal with target, minimum and schedule

- **Plan**: context/changes/add-first-goal/plan.md
- **Scope**: Full plan
- **Reviewed phases**: 1, 2, 3, 4
- **Date**: 2026-10-03
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warnings, 2 observations

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | WARNING |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | PASS    |
| Success Criteria    | PASS    |

## Success criteria evidence

- `npx astro check`: 0 errors, 0 warnings, 0 hints (43 files).
- `npm run build`: complete.
- `npm run lint`: 91 prettier errors, all in `eslint.config.js`, which is CRLF in the local working tree but LF in the index (`git ls-files --eol`: `i/lf w/crlf`). Local Windows checkout artefact; every feature file is LF; CI lint passes. Not a finding.
- `npm run smoke` against a fresh local production preview + local Supabase: all 19 steps PASS, including 404 / absence from list for user B.
- GitHub PR #19 (still OPEN, not merged): `ci` pass, `smoke` pass, `deploy` skipped (PR).
- Manual items 1.4-1.5, 2.4-2.6, 3.4-3.8, 4.4-4.5 are ticked with commit SHAs; the diff supports them (policies, CHECK constraints, 404 path, cross-user smoke steps are all present).

## Findings

### F1 — Schema accepts values the database rejects (500 instead of 400)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/schemas/goal.ts:39-42, 71-72 (and :89 for name)
- **Detail**: Flexible `target` / `minimum` have `.min(1)` but no upper bound, while `freq_target` / `freq_minimum` are `smallint` (max 32767) in supabase/migrations/20261002100000_create_goals.sql:37-38. `POST /api/goals` with `target: 40000` passes zod, the insert fails with Postgres 22003, and the endpoint answers 500 `{error:"server"}`; the form shows a generic error instead of a field error on the Schedule step. Same class: a name containing `\u0000` passes zod but Postgres `text` rejects NUL (hand-crafted requests only).
- **Fix**: Add `.max(32767)` to the flexible `target` / `minimum` in the shared schema (not 7: the plan and PRD defer the >7/week SMART warning to S-06, so there is no business upper limit), and optionally refuse `\0` in `name`.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Zod schema must mirror database column types, not just CHECK constraints (added `.max(32767)` to flexible target/minimum and a NUL refine on `name` in src/lib/schemas/goal.ts; lint and astro check pass, 32768/40000/NUL now rejected by zod; lesson in context/foundation/lessons.md)

### F2 — Undeclared `revoke` / `grant` in the migration

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: supabase/migrations/20261002100000_create_goals.sql:90-94
- **Detail**: The migration revokes all privileges from `anon` and `authenticated` and grants only select/insert/update to `authenticated`. The plan does not mention table grants. It is consistent with "no anon access, no delete" and strengthens it, so it is benign, but the plan is no longer the full source of truth.
- **Fix**: Add a one-line addendum to plan.md noting the grants as intentional hardening.
- **Decision**: FIXED (addendum bullet added to plan.md under the migration RLS contract)

### F3 — Deadline "today" is computed in UTC

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/schemas/goal.ts:33-35
- **Detail**: `new Date().toISOString().slice(0,10)` is the UTC date while `<input type=date>` yields the user's local date. A user west of UTC (e.g. UTC-5 at 21:00 local) picking today's date is rejected with "Deadline can't be in the past". For Poland (UTC+1/+2) the skew is only more lenient, so no failure. The plan explicitly specifies "today's UTC date".
- **Fix**: Skip for the MVP (plan-specified behaviour, target users are in UTC+1/+2); revisit if users appear west of UTC.
- **Decision**: SKIPPED for S-01 + follow-up queued: decide the timezone model (user IANA timezone, "today"/week boundaries, weekly cron) when planning S-02. See context/changes/add-first-goal/follow-ups/review-fixes.md
