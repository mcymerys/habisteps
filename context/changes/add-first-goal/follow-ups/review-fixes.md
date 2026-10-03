# Review follow-ups: add-first-goal

Queued from `reviews/impl-review.md`. Nothing here blocks merging S-01.

## F3 — Decide the timezone model before planning S-02

- **Source**: impl review F3 (SKIPPED for S-01), src/lib/schemas/goal.ts:34
- **Today**: "today" is computed in UTC, in exactly one place — the one-off deadline check in `deadlineSchema` (`new Date().toISOString().slice(0, 10)`). Stored values are safe: `deadline` is a `date`, `created_at` is `timestamptz`.
- **Why it matters for S-02+**: logging a day ("mark done for today"), streaks and weekly progress all need a day boundary and a week boundary. With UTC, a user in Poland (UTC+1/+2) who logs at 00:30 local time (22:30 UTC the previous day) would get the log attributed to _yesterday_, and a missed day can break a streak at the wrong moment.
- **Decide when planning S-02** (once, for all date logic):
  1. Where the user's timezone lives (e.g. an IANA name such as `Europe/Warsaw` stored per user, set from `Intl.DateTimeFormat().resolvedOptions().timeZone`).
  2. One helper for "today in the user's timezone" and "start of the user's week" (Mon-Sun, ISO weekdays as in the goals schema).
  3. How the weekly Review Cron Trigger (runs in UTC) picks the week boundary per user.
  4. Then revisit the deadline check: turn the constant `createGoalSchema` into one that receives "today", or accept deadlines >= UTC today minus 1 day as a cheap interim fix.
- **Propagated to** (so planning S-02 finds it without searching): `context/foundation/roadmap.md` (S-02 Unknowns, cross-linked in S-03), `context/changes/log-daily-completion/change.md` (Notes), `context/foundation/lessons.md` ("Route all 'today' and week-boundary logic through one date helper").
- **Status**: OPEN
