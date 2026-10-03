# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Zod schema must mirror database column types, not just CHECK constraints

- **Context**: src/lib/schemas/goal.ts:39-42, 71-72 (and :89 for name) — flexible `target`/`minimum` vs `smallint` columns `freq_target`/`freq_minimum` in supabase/migrations/20261002100000_create_goals.sql
- **Problem**: Flexible target/minimum have .min(1) but no upper bound, while the columns are smallint (max 32767). A payload with target: 40000 passes zod, Postgres rejects it (22003) and the endpoint answers 500 instead of a 400 field error. Same class: a name containing \u0000 passes zod but Postgres text rejects NUL.
- **Rule**: Every column with a bounded type (smallint, varchar(n), ...) needs a matching limit in the zod schema, so bad input gives a 400 field error, never a 500.
- **Applies to**: src/lib/schemas/*, new migrations and API endpoints

## Route all "today" and week-boundary logic through one date helper

- **Context**: src/lib/schemas/goal.ts:34 — the one-off deadline check computes "today" as `new Date().toISOString().slice(0, 10)`, i.e. the UTC date. Found in the add-first-goal impl review (F3, skipped for S-01).
- **Problem**: A UTC "today" differs from the user's local date for a few hours a day. Harmless for a deadline check, but for logging a day, streaks and Monday–Sunday weeks it attributes a log made at 00:30 in Poland to the previous day and can break a streak at the wrong moment. The timezone model (one app-wide zone vs a per-user IANA zone) is still undecided — see roadmap S-02/S-03 Unknowns.
- **Rule**: Do not compute "today", day boundaries or week boundaries inline with `new Date()` / `toISOString()` in feature code. Put them behind one shared helper in `src/lib/`, and settle the timezone model (roadmap S-02 Unknowns) before planning anything that logs, scores or evaluates by day or week.
- **Applies to**: S-02 onward (logging, streaks, XP, Weekly Review, today view, badges) and the weekly Cron job in `src/lib/jobs/`; the deadline check in `src/lib/schemas/goal.ts` is the only existing exception.
