---
project: Habistep
version: 1
status: draft
created: 2026-09-29
updated: 2026-09-29
prd_version: 2
main_goal: speed
top_blocker: time
milestone_id: mvp-end-to-end-path
milestone_seq: 1
milestone_status: open
---

# Roadmap: Habistep

> Derived from `context/foundation/prd.md` (v2) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: MVP end-to-end path** — Status: open

- **Intent:** Deliver the PRD's primary success path as one coherent app: a user adds a goal with a target and a minimum, logs days, sees streak and XP, receives a Weekly Review with an optional goal-scaling suggestion, levels up into more goal slots, and can view a friend's public goal.
- **Source materials:** `context/foundation/prd.md` (v2)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** all must-have FRs (FR-001, FR-003–FR-007, FR-009, FR-010, FR-012, FR-014–FR-024) and US-01–US-11. Nice-to-have FR-002, FR-008, FR-013 are parked.

## Vision recap

People building habits set goals that are too ambitious, try to change everything at once, and lose motivation without visible progress. Habistep helps a user set a realistic goal in the first place — every goal has a target and a survivable minimum, checked against SMART criteria — then makes progress visible through streaks, XP, levels and badges, limits how many habits run at once, revises goals weekly based on what actually happened (suggested, never forced), and adds accountability through friends who can see public goals.

## North star

**S-04: User can accept or dismiss a suggestion to lower or raise a goal in the Weekly Review** — the north star is the smallest end-to-end slice whose successful delivery proves the product's central promise (here: an adaptive plan that revises itself from real results), placed as early as its prerequisites allow because the rest of the app only matters if this works. Under the `speed` goal it is sequenced directly after the two slices it needs (adding a goal, logging a day), ahead of slots, levels, badges and friends, so the riskiest part — scheduled weekly evaluation — surfaces early.

## At a glance

| ID   | Change ID                | Outcome (user can …)                                                              | Prerequisites | PRD refs                                      | Status   |
| ---- | ------------------------ | --------------------------------------------------------------------------------- | ------------- | --------------------------------------------- | -------- |
| F-01 | domain-rule-checks       | (foundation) automated checks for goal rules run locally and in CI                | —             | NFR-005, Business Logic                       | ready    |
| S-01 | add-first-goal           | add a goal with target, minimum and a flexible or fixed-days schedule, and see it listed and on its detail page | —             | US-01, US-02, FR-001, FR-004, FR-005, FR-014, NFR-002 | ready    |
| S-02 | log-daily-completion     | mark a goal Done / Not done / Done less / Done more and see streak and XP update  | S-01, F-01    | US-04, FR-005, FR-006, FR-016, FR-017         | proposed |
| S-03 | weekly-review-screen     | open a Weekly Review of last week's outcome, streak and XP per goal               | S-02          | US-08, FR-019, NFR-003, NFR-006               | proposed |
| S-04 | goal-scaling-suggestion  | accept or dismiss a suggestion to lower or raise a goal in the Weekly Review      | S-03          | US-08, FR-020                                 | proposed |
| S-05 | today-home-view          | see today's goals in execution order, a motivational message when all are done, and "Show more" | S-02 | US-03, FR-003, FR-012, NFR-003         | proposed |
| S-06 | smart-goal-warnings      | get SMART warnings in the add-goal form and stay on the step until fixed          | S-01          | US-07, FR-007                                 | proposed |
| S-07 | edit-goal                | edit a goal's fields, thresholds and priority without losing its history          | S-01          | US-05, FR-009                                 | proposed |
| S-08 | archive-goal             | archive a goal so it leaves the active list but stays retrievable                 | S-01          | US-06, FR-010, NFR-005                        | proposed |
| S-09 | goal-slots-and-queue     | track at most 3 active goals, with extra goals queued by priority                 | S-01, S-08    | FR-014, FR-015                                | proposed |
| S-10 | level-up-unlocks-slot    | level up from XP, gain a slot, and see the top queued goal become active          | S-02, S-09    | US-09, FR-018                                 | proposed |
| S-11 | goal-badges              | earn a perfect-week badge with its bonus XP and streak badges at 7/30/100 days    | S-03          | US-11, FR-017, FR-021, FR-022                 | proposed |
| S-12 | invite-friend            | share an invite link that a recipient accepts to become a mutual friend           | —             | US-10, FR-023                                 | ready    |
| S-13 | friends-public-goals     | mark goals public or private and view a friend's public goals read-only           | S-12, S-02    | US-10, FR-024, NFR-002                        | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                        | Chain                                   | Note                                                                                           |
| ------ | ---------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A      | Goal setup and management    | `S-01` → `S-06` → `S-07` → `S-08`       | `S-01` heads the whole roadmap; the rest can run alongside Stream B once it lands.            |
| B      | Daily loop and Weekly Review | `F-01` → `S-02` → `S-03` → `S-04` → `S-05` | Critical path to the north star under `speed`; joins Stream A at `S-01`.                    |
| C      | Progression                  | `S-09` → `S-10` → `S-11`                | `S-09` joins Stream A at `S-08`; `S-10` joins Stream B at `S-02`; `S-11` joins Stream B at `S-03`. |
| D      | Friends                      | `S-12` → `S-13`                         | `S-12` can start immediately in parallel; `S-13` joins Stream B at `S-02`.                     |

## Baseline

What's already in place in the codebase as of `2026-09-29` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — SSR pages with interactive islands and a component library (`src/layouts/Layout.astro`, `src/components/ui/`); no domain screens yet, only a placeholder `src/pages/dashboard.astro`.
- **Backend / API:** partial — only auth endpoints exist (`src/pages/api/auth/{signin,signup,signout}.ts`); no domain endpoints and no input-validation library installed.
- **Data:** partial — database client wired (`src/lib/supabase.ts`, `supabase/config.toml`) but no migrations directory: zero tables, zero row-level security policies.
- **Auth:** present — email + password sign-in/sign-up with cookie sessions and route protection (`src/middleware.ts`, `PROTECTED_ROUTES`). Covers FR-001 mechanics.
- **Deploy / infra:** present — edge deploy with auto-deploy on merge to master (`wrangler.jsonc`, `.github/workflows/ci.yml`: lint, type check, build, smoke, deploy); weekly scheduled trigger (Mondays 06:00 UTC) wired to `src/worker.ts`, job body is a stub (`src/lib/jobs/weekly-review.ts`).
- **Observability:** partial — platform request logs enabled (`wrangler.jsonc` `observability.enabled`); otherwise console logging only, no error tracking or job-failure alerting.

## Foundations

### F-01: Automated checks for domain rules

- **Outcome:** (foundation) a minimal automated check path for pure goal rules (streak, XP, level thresholds, weekly evaluation) runs locally and in CI, with one real rule check in place.
- **Change ID:** domain-rule-checks
- **PRD refs:** Business Logic (streak, leveling, weekly evaluation rules), NFR-005
- **Unlocks:** verification path for S-02 (streak and XP rules), S-03/S-04 (weekly evaluation and suggestion thresholds), S-10 (quadratic level curve), S-11 (perfect week and milestone thresholds).
- **Prerequisites:** —
- **Parallel with:** S-01, S-06, S-07, S-08, S-09, S-12
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced before S-02 because today's CI only covers lint/build/HTTP smoke; the rule-heavy slices would otherwise ship with untested arithmetic. Must stay a thin harness, not a test suite for features that don't exist yet.
- **Status:** ready

## Slices

### S-01: Add a goal with target and minimum

- **Outcome:** User can sign in, land on their goal list, add a goal through the multi-step form (name, deadline for one-off goals only, target/minimum end condition, schedule — flexible target/minimum times per week or fixed weekdays — category, priority) and see it on its detail page with a 0-day streak and text progress; no other user can read it.
- **Change ID:** add-first-goal
- **PRD refs:** US-01, US-02, FR-001, FR-004, FR-005, FR-014, NFR-002
- **Prerequisites:** —
- **Parallel with:** F-01, S-12
- **Blockers:** —
- **Unknowns:**
  - What happens when a one-off goal's deadline passes before it is completed? (PRD v2 Open Question 1; in-progress and completed behaviour is settled in PRD Business Logic, One-off goals) — Owner: user. Block: no.
- **Risk:** First slice to create tables, so owner-only row-level security is set up here, not deferred; replaces the placeholder post-login landing.
- **Status:** ready

### S-02: Log a day and see streak and XP

- **Outcome:** User can mark a goal Done / Not done / Done less / Done more for today and see its streak and XP update: Done less, Done and Done more keep the streak and earn a fixed 5 / 10 / 15 XP; Not done earns nothing.
- **Change ID:** log-daily-completion
- **PRD refs:** US-04, FR-005, FR-006, FR-016, FR-017
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-06, S-07, S-08, S-09, S-12
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Carries both streak modes from PRD v2 Business Logic (flexible: reset only at the end of a Monday–Sunday week whose minimum was missed; fixed weekdays: break as soon as a scheduled day passes unmet); every later slice reads this slice's log data, so its rules must be right first.
- **Status:** proposed

### S-03: Weekly Review screen

- **Outcome:** User can open a Weekly Review for the past Monday–Sunday week showing, per goal, target met / minimum met / missed, current streak, and XP earned; the review is produced for every user every week with no manual step.
- **Change ID:** weekly-review-screen
- **PRD refs:** US-08, FR-019, NFR-003, NFR-006
- **Prerequisites:** S-02
- **Parallel with:** S-05, S-06, S-07, S-08, S-09, S-10, S-12, S-13
- **Blockers:** —
- **Unknowns:**
  - Which time zone defines the Monday–Sunday boundary (single app-wide zone vs per user)? — Owner: user. Block: no.
- **Risk:** Turns the scheduled-job stub into real work; a silent job failure would violate NFR-006, so failure must be visible, not just logged.
- **Status:** proposed

### S-04: Accept or dismiss a goal-scaling suggestion

- **Outcome:** User can see, in the Weekly Review, a suggestion to lower a goal after a week below minimum or raise it after 2 consecutive weeks above target, and accept it (goal updates) or dismiss it (goal unchanged).
- **Change ID:** goal-scaling-suggestion
- **PRD refs:** US-08, FR-020
- **Prerequisites:** S-03
- **Parallel with:** S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:**
  - Which value does a suggestion change (minimum, target, frequency or end condition), and by how much? — Owner: user. Block: no.
- **Risk:** North star; the "raise" rule needs 2 weeks of history, so verification relies on seeded logs rather than waiting for real weeks.
- **Status:** proposed

### S-05: Today's goals on the home page

- **Outcome:** User can see today's goals sorted by when they must be executed, with completed state, a motivational message ("That's all for today, you're on track") when all are done, and "Show more" for other days.
- **Change ID:** today-home-view
- **PRD refs:** US-03, FR-003, FR-012, NFR-003
- **Prerequisites:** S-02
- **Parallel with:** S-03, S-04, S-06, S-07, S-08, S-09, S-10, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:**
  - For flexible weekly goals (e.g. 2x/week), which goals count as "due today" — any goal whose weekly minimum isn't met yet? — Owner: user. Block: no.
- **Risk:** Sequenced after the north star because S-01 already gives a usable list; this slice refines it into the daily view.
- **Status:** proposed

### S-06: SMART warnings in the add-goal form

- **Outcome:** User gets a warning when the target frequency exceeds 7x/week or a target value is more than 3x its minimum, and stays on the invalid step until it's fixed or justified.
- **Change ID:** smart-goal-warnings
- **PRD refs:** US-07, FR-007
- **Prerequisites:** S-01
- **Parallel with:** F-01, S-02, S-03, S-04, S-05, S-07, S-08, S-09, S-10, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Independent of the critical path, so it's a good candidate to run in parallel with S-02; also applies to S-07's edit form if that lands first.
- **Status:** proposed

### S-07: Edit a goal

- **Outcome:** User can edit any field of a goal, including thresholds and priority, and see the change on the list and detail page with streak and history preserved.
- **Change ID:** edit-goal
- **PRD refs:** US-05, FR-009
- **Prerequisites:** S-01
- **Parallel with:** F-01, S-02, S-03, S-04, S-05, S-06, S-08, S-09, S-10, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:**
  - When thresholds change mid-week (by edit or an accepted suggestion), which values does that week's evaluation use? — Owner: user. Block: no.
- **Risk:** Preserving history across threshold changes interacts with weekly evaluation; the same answer must apply to S-04's accept action.
- **Status:** proposed

### S-08: Archive a goal

- **Outcome:** User can archive a goal so it disappears from the active list, stays retrievable via "Show more" or an archive section, and keeps its streak and progress data.
- **Change ID:** archive-goal
- **PRD refs:** US-06, FR-010, NFR-005
- **Prerequisites:** S-01
- **Parallel with:** F-01, S-02, S-03, S-04, S-05, S-06, S-07, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Establishes "never hard-delete" for goals (NFR-005); sequenced before S-09 because archiving is how a slot frees up.
- **Status:** proposed

### S-09: Goal slots and priority queue

- **Outcome:** User can track at most 3 active goals; goals added beyond the limit are queued (locked, not tracked) in priority order, and archiving an active goal activates the top queued one.
- **Change ID:** goal-slots-and-queue
- **PRD refs:** FR-014, FR-015
- **Prerequisites:** S-01, S-08
- **Parallel with:** F-01, S-02, S-03, S-04, S-05, S-06, S-07, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:**
  - Can the user manually swap an active goal with a queued one, or does only priority decide? — Owner: user. Block: no.
- **Risk:** Changes what "active" means for every list and review; landing it after the north star avoids reworking S-03/S-04 around queued goals mid-flight.
- **Status:** proposed

### S-10: Level up unlocks a goal slot

- **Outcome:** User is notified when accumulated XP crosses the next level threshold (L2 = XP of one perfect week; level n = L2 × (n-1)²), gains one active slot, and sees the highest-priority queued goal become active.
- **Change ID:** level-up-unlocks-slot
- **PRD refs:** US-09, FR-018
- **Prerequisites:** S-02, S-09
- **Parallel with:** S-03, S-04, S-05, S-06, S-07, S-11, S-12, S-13
- **Blockers:** —
- **Unknowns:** —
- **Risk:** L2 depends on the goal's frequency (one perfect week's XP), so the threshold rule needs F-01 checks to avoid off-by-one levels.
- **Status:** proposed

### S-11: Perfect-week and streak badges

- **Outcome:** User earns a "Perfect week" badge and +50 XP when a goal's full target is met every required instance in a Monday–Sunday week, and streak badges at 7, 30 and 100 days, visible on the goal.
- **Change ID:** goal-badges
- **PRD refs:** US-11, FR-017, FR-021, FR-022
- **Prerequisites:** S-03
- **Parallel with:** S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-12, S-13
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Awarded at week close alongside the Weekly Review, so it reuses S-03's evaluation rather than a second weekly computation.
- **Status:** proposed

### S-12: Invite a friend

- **Outcome:** User can generate a shareable invite link; a recipient who opens it and accepts becomes a mutual friend, visible in both users' friend lists.
- **Change ID:** invite-friend
- **PRD refs:** US-10, FR-023
- **Prerequisites:** —
- **Parallel with:** F-01, S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11
- **Blockers:** —
- **Unknowns:**
  - Is an invite link single-use and does it expire? — Owner: user. Block: no.
- **Risk:** Only touches auth and a new relationship record, so it can run fully in parallel with the critical path to offset the `time` blocker.
- **Status:** ready

### S-13: View a friend's public goals

- **Outcome:** User can mark each goal public or private, and see an accepted friend's public goals read-only with progress and streak; private goals are never visible to anyone else, and public goals never to non-friends.
- **Change ID:** friends-public-goals
- **PRD refs:** US-10, FR-024, NFR-002
- **Prerequisites:** S-12, S-02
- **Parallel with:** S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11
- **Blockers:** —
- **Unknowns:** —
- **Risk:** The only cross-user read in the product; a mistaken access rule leaks private goals, so the friend/non-friend/private cases need an automated check.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Issue                                                    | Linear                                                    | Change ID               | Suggested issue title                                         | Ready for `/10x-plan` | Notes                                          |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- | --------------------- | ---------------------------------------------- |
| F-01       | [#3](https://github.com/mcymerys/habisteps/issues/3)     | [HAB-5](https://linear.app/habistep/issue/HAB-5)          | domain-rule-checks      | Add automated checks for goal rules to local runs and CI      | yes                   | Run `/10x-plan domain-rule-checks`             |
| S-01       | [#4](https://github.com/mcymerys/habisteps/issues/4)     | [HAB-6](https://linear.app/habistep/issue/HAB-6)          | add-first-goal          | Add a goal with target and minimum via multi-step form        | yes                   | Run `/10x-plan add-first-goal`                 |
| S-02       | [#5](https://github.com/mcymerys/habisteps/issues/5)     | [HAB-7](https://linear.app/habistep/issue/HAB-7)          | log-daily-completion    | Log daily completion with streak and XP                       | no                    | Needs S-01, F-01                               |
| S-03       | [#6](https://github.com/mcymerys/habisteps/issues/6)     | [HAB-8](https://linear.app/habistep/issue/HAB-8)          | weekly-review-screen    | Generate and show the Weekly Review every week                | no                    | Needs S-02                                     |
| S-04       | [#7](https://github.com/mcymerys/habisteps/issues/7)     | [HAB-9](https://linear.app/habistep/issue/HAB-9)          | goal-scaling-suggestion | Suggest lowering/raising a goal; accept or dismiss            | no                    | Needs S-03 (north star)                        |
| S-05       | [#8](https://github.com/mcymerys/habisteps/issues/8)     | [HAB-10](https://linear.app/habistep/issue/HAB-10)        | today-home-view         | Home page: today's goals, motivational message, "Show more"   | no                    | Needs S-02                                     |
| S-06       | [#9](https://github.com/mcymerys/habisteps/issues/9)     | [HAB-11](https://linear.app/habistep/issue/HAB-11)        | smart-goal-warnings     | SMART validation warnings in the add-goal form                | no                    | Needs S-01                                     |
| S-07       | [#10](https://github.com/mcymerys/habisteps/issues/10)   | [HAB-12](https://linear.app/habistep/issue/HAB-12)        | edit-goal               | Edit a goal while preserving its history                      | no                    | Needs S-01                                     |
| S-08       | [#11](https://github.com/mcymerys/habisteps/issues/11)   | [HAB-13](https://linear.app/habistep/issue/HAB-13)        | archive-goal            | Archive a goal without deleting its data                      | no                    | Needs S-01                                     |
| S-09       | [#12](https://github.com/mcymerys/habisteps/issues/12)   | [HAB-14](https://linear.app/habistep/issue/HAB-14)        | goal-slots-and-queue    | Limit active goals to 3 and queue the rest by priority        | no                    | Needs S-01, S-08                               |
| S-10       | [#13](https://github.com/mcymerys/habisteps/issues/13)   | [HAB-15](https://linear.app/habistep/issue/HAB-15)        | level-up-unlocks-slot   | Level up from XP to unlock an extra goal slot                 | no                    | Needs S-02, S-09                               |
| S-11       | [#14](https://github.com/mcymerys/habisteps/issues/14)   | [HAB-16](https://linear.app/habistep/issue/HAB-16)        | goal-badges             | Award perfect-week and 7/30/100-day streak badges             | no                    | Needs S-03                                     |
| S-12       | [#15](https://github.com/mcymerys/habisteps/issues/15)   | [HAB-17](https://linear.app/habistep/issue/HAB-17)        | invite-friend           | Invite a friend with a shareable link                         | yes                   | Run `/10x-plan invite-friend`                  |
| S-13       | [#16](https://github.com/mcymerys/habisteps/issues/16)   | [HAB-18](https://linear.app/habistep/issue/HAB-18)        | friends-public-goals    | Public/private goals visible read-only to friends             | no                    | Needs S-12, S-02                               |

This table is the clean handoff to Jira/Linear or any MCP-backed backlog. Include one row for every `F-NN` and `S-NN`. It should be compact enough to copy into issues, but it must not duplicate the detailed roadmap body.

## Open Roadmap Questions

No roadmap-wide questions are open. The 2026-09-29 rule decisions (scheduling modes including fixed weekdays, Monday–Sunday week, no deadline for recurring goals, completion-option XP) were folded into PRD v2; the remaining one-off-goal question is PRD Open Question 1 and stays with S-01.

## Parked

- **OAuth login (Google, GitHub, Apple) — FR-002** — Why parked: nice-to-have; email + password is the must-have method and already exists.
- **Streak calendar visualization — FR-008** — Why parked: nice-to-have; `speed` goal keeps progress text-only (FR-005).
- **Details after "Done less" / "Done more" — FR-013** — Why parked: nice-to-have; the chosen option alone decides XP and streak (PRD v2 Completion options).
- **Visual progress bar** — Why parked: FR-005 resolution defers it to v2.
- **Chat / comments between friends** — Why parked: PRD §Non-Goals.
- **Global leaderboard across all users** — Why parked: PRD §Non-Goals.
- **Group challenges between friends** — Why parked: PRD §Non-Goals (v2).
- **Badges beyond perfect week and 7/30/100-day streaks** — Why parked: PRD §Non-Goals (v2).
- **Integrations (calendar, fitness trackers, chat apps)** — Why parked: PRD §Non-Goals (v2).
- **Learned habit-recommendation model** — Why parked: PRD §Non-Goals; the suggestion is a threshold rule.
- **Team / organization tracking** — Why parked: PRD §Non-Goals.
- **Offline access** — Why parked: PRD §Non-Goals (planned for a mobile app in v2).

## Milestone History

## Done
