<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Add a goal with target, minimum and schedule

- **Plan**: context/changes/add-first-goal/plan.md
- **Mode**: Deep (codebase verification done inline — small repo; zod behaviour verified empirically on zod 4.6.5)
- **Date**: 2026-10-01
- **Verdict**: REVISE → SOUND after triage
- **Findings**: 1 critical, 1 warning, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | FAIL |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding
7/7 paths ✓, 4/4 symbols ✓ (signin redirect is `signin.ts:20`, not `:22` — trivial), brief↔plan ✓, Progress↔Phase ✓

## Findings

### F1 — Per-step validation can't enforce the kind/deadline rule

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 1 §3 (createGoalSchema, goalStepFields); Phase 3 §4
- **Detail**: `kind`/`deadline` were top-level keys guarded by a top-level refinement. On zod 4.6.5, `.pick()` throws on refined objects, and a full safeParse of step-2 state never runs the top-level refinement while later steps are empty — so "Next" would not block a one-off goal with a missing or past deadline (manual criterion 3.6).
- **Fix A ⭐ Recommended**: Nest as `timing: { kind: "recurring" } | { kind: "one_off", deadline }`; form validates a step via full safeParse filtered by `goalStepFields[step]`.
  - Strength: "iff" becomes structural; nested refinements verified to fire on partial state.
  - Tradeoff: API payload shape changes (DB unchanged; service flattens).
  - Confidence: HIGH — tested empirically.
  - Blind spot: None significant.
- **Fix B**: Six per-step schemas composed into the full schema.
  - Strength: Keeps flat payload.
  - Tradeoff: Composition code; drift risk.
  - Confidence: MED — not prototyped.
  - Blind spot: Typing the composed output.
- **Decision**: FIXED (Fix A)

### F2 — No step applies the migration to production before merge

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Migration Notes / Progress (Phase 4)
- **Detail**: CI auto-deploys on merge; sign-in now lands on `/dashboard`, which queries `goals`. Without `supabase db push` first, prod sign-ins 500. Only Migration Notes mentioned it.
- **Fix**: Phase 4 manual criterion + Progress row 4.5 (`npx supabase db push` before merging).
- **Decision**: FIXED

### F3 — "Today" for the deadline check must be computed at parse time

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 §3
- **Detail**: A module-level date is frozen in a Worker isolate and stale in a long-open tab.
- **Fix**: Contract note — compute "today" inside the refinement on every parse.
- **Decision**: FIXED

### F4 — Where pages/endpoints get the Supabase client is unspecified

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 §1–2, Phase 3 §2, §6
- **Detail**: `locals` holds only `user`; `createClient()` can return `null` (`src/lib/supabase.ts:6`).
- **Fix**: Critical Implementation Details bullet — call `createClient(request.headers, cookies)`; null → endpoint 500, pages throw.
- **Decision**: FIXED

### F5 — `updated_at` has no trigger

- **Severity**: 🔍 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 §1
- **Detail**: `default now()` fires only on insert; the column would silently stay equal to `created_at` after S-07 edits.
- **Fix**: `moddatetime` extension + `before update` trigger in the migration.
- **Decision**: FIXED
