---
change_id: log-daily-completion
title: Log a day and see streak and XP
status: new
created: 2026-10-03
updated: 2026-10-03
archived_at: null
---

## Notes

s-02 from @context/foundation/roadmap.md

Decide the time zone model BEFORE running `/10x-plan log-daily-completion`: "today" (the day a log belongs to) and the Monday–Sunday week boundary (flexible streak reset) both depend on it. Options: one app-wide zone vs the user's own IANA zone (e.g. `Europe/Warsaw`) stored per user. Context: roadmap S-02 Unknowns (also S-03's open zone question) and the S-01 impl-review follow-up F3 in `context/changes/add-first-goal/follow-ups/review-fixes.md` (after `/10x-archive` it moves to `context/archive/2026-10-01-add-first-goal/follow-ups/review-fixes.md`). Also see `context/foundation/lessons.md` ("Route all 'today' and week-boundary logic through one date helper").
