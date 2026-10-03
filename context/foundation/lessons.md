# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Zod schema must mirror database column types, not just CHECK constraints

- **Context**: src/lib/schemas/goal.ts:39-42, 71-72 (and :89 for name) — flexible `target`/`minimum` vs `smallint` columns `freq_target`/`freq_minimum` in supabase/migrations/20261002100000_create_goals.sql
- **Problem**: Flexible target/minimum have .min(1) but no upper bound, while the columns are smallint (max 32767). A payload with target: 40000 passes zod, Postgres rejects it (22003) and the endpoint answers 500 instead of a 400 field error. Same class: a name containing \u0000 passes zod but Postgres text rejects NUL.
- **Rule**: Every column with a bounded type (smallint, varchar(n), ...) needs a matching limit in the zod schema, so bad input gives a 400 field error, never a 500.
- **Applies to**: src/lib/schemas/*, new migrations and API endpoints
