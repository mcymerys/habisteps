---
project: Habistep
version: 2
status: draft
created: 2026-09-26
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  mvp_target: 1-10
timeline_budget:
  mvp_weeks: 6
  hard_deadline: 2026-11-07
  after_hours_only: true
---

# PRD: Habistep

## Vision & Problem Statement

People trying to build habits set goals that are too ambitious from day one, try to change everything at once, lose motivation without a visible sense of progress, and — without any structure around the goal itself — have no way to tell whether the progress they are making is actually enough.

Existing habit/fitness trackers log completion but do not help a user set a realistic goal in the first place. They lack: education about realistic goal-setting (a target vs. a survivable minimum, SMART validation), visible progress through gamification (streaks, XP, levels, badges), an adaptive plan that revises itself weekly based on what actually happened, and a sense of accountability through friends and public goals.

## User & Persona

**Primary persona**: A developer with 10+ years of professional experience, building this tool for their own use.

**Target group**: People who want to change — motivated to build habits, ready to work within structure rather than against it.

Pain dimensions this product addresses:

- Lack of structure/clarity — SMART validation, goals defined with both a target and a minimum.
- Lack of motivation/visible progress — streaks, XP, levels, badges.
- Doing too much at once, leading to paralysis — a slot limit on simultaneously tracked habits that grows with level, with priority-based queueing beyond the limit.
- Lack of community/accountability — friends, public/private goals.

## Success Criteria

### Primary

- A user logs in, sees today's goal list, adds a new goal with a target and a minimum (name, deadline, target/minimum end condition, target/minimum frequency, category, priority), sees a progress indicator and streak for that goal, earns XP for checking off a day, sees a Weekly Review screen after a week summarizing outcomes with an optional goal-adjustment suggestion, and can invite a friend and view that friend's public goal. This end-to-end path proves the app functions as a coherent whole, not a CRUD list.

### Secondary

- Streak visualized as a calendar view (not just a number).
- OAuth login (Google, GitHub, Apple) — email/password alone is sufficient as the must-have login method.
- Ability to add details after logging "Done less" / "Done more" (e.g., actual time/count achieved).

### Guardrails

- **Privacy**: A user's goals and progress are private and secure. A goal marked private is never visible to anyone, including friends. A public goal is visible only to accepted friends — never to all users of the app.
- **Performance**: All operations complete in < 2s (home load, adding a goal, Weekly Review).
- **Uptime**: The app must run without interruption.
- **Persistence**: User data must never be lost.
- **Weekly Review reliability**: the weekly summary must be available to every user, every week, without any manual intervention.

## User Stories

### US-01: Create and view a new goal

- **Given** the user is logged in and viewing the home page with no goals listed
- **When** the user clicks "Add goal" and fills the multi-step form (name "Exercise", no deadline since it is a recurring goal, end condition target "1 hour" / minimum "30 minutes", flexible frequency target "5x/week" / minimum "2x/week", category "Fitness", priority "High") and submits it
- **Then** the goal appears in the home page list, the user is taken to the goal detail page, sees a progress bar (0% initially) and a streak counter (0 days), and can mark the goal done for today

### US-02: Login with email and password

- **Given** the user is on the login page
- **When** the user enters a valid email and password and clicks "Sign in"
- **Then** login succeeds, the user is redirected to the home page with their goals, and the session is maintained

### US-03: View home page with today's goals and motivational message

- **Given** the user is logged in and has 2 goals due today, both completed
- **When** the user views the home page
- **Then** goals are sorted by when they need to be executed (deadline/frequency), both show as completed, a motivational message appears ("That's all for today, you're on track"), and a "Show more" button is available to see goals for other days

### US-04: Mark goal with four completion options

- **Given** the user is viewing a goal detail page (e.g., "Exercise" — target 1h, minimum 30min, 5x/week target / 2x/week minimum)
- **When** the user selects one of: Done, Not done, Done less, Done more
- **Then** the streak updates accordingly ("Done less", "Done" and "Done more" all meet the minimum and keep the streak alive; a period that ends below the minimum breaks it), the user earns XP by option ("Done less" 5 XP; "Done" 10 XP; "Done more" 15 XP; "Not done" 0 XP), and the goal status reflects the selection

### US-05: Edit existing goal

- **Given** the user is viewing a goal detail page for "Exercise"
- **When** the user clicks "Edit goal", modifies any field, and submits
- **Then** the goal is updated on the home page and detail page, and its streak and progress history are preserved

### US-06: Archive goal

- **Given** the user is viewing a goal they want to stop tracking
- **When** the user clicks "Archive goal"
- **Then** the goal is hidden from the active goals list on the home page, remains stored (not deleted), remains viewable via "Show more" or an archive section, and its streak/progress data is preserved

### US-07: Multi-step form submission and validation

- **Given** the user is on Step 1 of the add-goal form
- **When** the user fills all steps (name → deadline → target/minimum end condition → target/minimum frequency → category → priority) and clicks "Create goal"
- **Then** the form validates all fields including SMART validation (e.g., warns if the target frequency is physically unrealistic, or if the target is set far above the minimum without justification); an invalid field shows an error and keeps the user on that step; a fully valid submission creates the goal with its streak counter starting at 0

### US-08: Weekly Review with a goal-scaling suggestion

- **Given** the user has a goal "Exercise" (target 5x/week, minimum 2x/week) and logged only 1 day in the past week, below minimum
- **When** the user opens the Weekly Review screen at the start of the new week
- **Then** the screen shows last week's outcome ("Missed — 1/2 minimum"), current streak status, XP earned last week, and a suggestion to lower the goal's minimum; the user can accept the suggestion (goal updates) or dismiss it (goal stays unchanged) — nothing changes without explicit action

### US-09: Leveling up unlocks a new goal slot

- **Given** the user has 3 active goal slots, all filled, and one additional goal queued (locked) by priority
- **When** the user's accumulated XP crosses the threshold for the next level
- **Then** the user is notified of the new level, the active goal slot count increases by one, and the highest-priority queued goal automatically becomes active and starts being tracked

### US-10: Invite a friend and view their public goal

- **Given** the user wants to add an accountability partner
- **When** the user generates and shares an invite link, and the recipient opens it and accepts
- **Then** both users become friends, the user can see the friend's public goals read-only (including progress and streak), and any goal the friend marked private remains invisible to the user

### US-11: Earn a perfect week badge

- **Given** the user met the full target (not just minimum) for a goal every required day this past week
- **When** the week ends and Weekly Review is generated
- **Then** the goal shows "Perfect week" status for the past week, the user earns the "Perfect week" badge for that goal, and the associated bonus XP

## Functional Requirements

### Goal management

- FR-003: User can view all goals sorted by when they need to be executed (by deadline/frequency); if all today's goals are completed, show a motivational message ("That's all for today, you're on track"); a "Show more" control reveals goals for other days. Priority: must-have

  > Socrates: Counter-argument considered: "Show only today's goals might hide important tasks." Resolution: kept, with "Show more" toggle for other days.

- FR-004: User can add a new goal through a multi-step form (Step 1: name, Step 2: deadline — only for non-recurring goals; recurring goals have no deadline, Step 3: end condition — target and minimum, Step 4: frequency — either flexible (target and minimum times per week, e.g. 5x/2x) or fixed weekdays (e.g. Mon/Wed/Fri), Step 5: category, Step 6: priority). The category step offers a fixed list: Fitness, Health, Learning, Work/Productivity, Relationships, Finance, Other. Priority: must-have

  > Socrates: Counter-argument considered: "Multi-step form might cause drop-off at step 2." Resolution: kept; user accepted the flow.

- FR-005: User can view a goal's detail page with streak count and text-based progress. Priority: must-have

  > Socrates: Counter-argument considered: "Visual progress bar takes effort; text is enough." Resolution: text-based only on MVP; visual bar in v2.

- FR-006: User can mark a goal as: Done (full target met), Not done (minimum not met), Done less (minimum met, target not met), Done more (target exceeded). Priority: must-have

  > Socrates: Counter-argument considered: "Four options are complex; binary (Done/Not done) is simpler." Resolution: kept; four options provide the nuance needed for adaptive feedback.

- FR-007: App validates goal SMART criteria and warns if unrealistic: when the target frequency exceeds 7x/week (physically impossible for a once-daily habit), or when the target end-condition/frequency value is more than 3x the minimum value. Priority: must-have

  > Socrates: Counter-argument considered: "Extra validation UX is more work in an already expanded MVP." Resolution: kept as must-have; this is the app's core insight (helping users set realistic goals), not a cosmetic add-on.

- FR-009: User can edit an existing goal, including target/minimum thresholds and priority. Priority: must-have

  > Socrates: Counter-argument considered: "Edit is extra work; user could delete + re-add." Resolution: kept; edit is simpler UX.

- FR-010: User can archive a goal (hide from active list, data preserved). Priority: must-have

  > Socrates: Counter-argument considered: "Delete is simpler than archive." Resolution: archive chosen; preserves data for history/insights later.

- FR-012: App shows a motivational message when all today's goals are completed. Priority: must-have

  > Socrates: No counter-argument; reinforces engagement.

- FR-014: User can set a priority on each goal, used to order which goals are active vs. queued when the slot limit is reached. Priority: must-have

  > Socrates: No separate challenge; priority is a prerequisite for FR-015's queueing mechanic, confirmed alongside it.

- FR-015: New user starts with 3 active goal slots; goals added beyond the slot limit are queued (locked, not tracked) in priority order until a slot frees up or the user levels up. Priority: must-have
  > Socrates: Counter-argument considered: "A slot limit could discourage a new user who wants to track 5 habits immediately." Resolution: starting limit raised from 1 to 3 to reduce onboarding friction, while keeping the focus-forcing mechanic that supports the app's core insight (avoid doing too much at once).

### Authentication

- FR-001: User can log in with email and password. Priority: must-have
  > Socrates: No counter-argument; login is fundamental for a multi-user app.

### Gamification

- FR-016: User earns a fixed amount of XP per logged option, not cumulative: "Done less" 5 XP, "Done" 10 XP, "Done more" 15 XP, "Not done" 0 XP. Priority: must-have

  > Socrates: Counter-argument considered: "Fixed XP regardless of goal difficulty could be trivially farmed with easy goals." Resolution: kept; farming isn't a real risk in a single-user MVP with no cross-user ranking.

- FR-017: User earns a +50 XP bonus for a perfect week (the full target met every required instance of the week). Meeting the target on a single day has no separate bonus — it is already reflected in the per-option XP of FR-016. Priority: must-have

  > Socrates: No separate challenge; addressed together with FR-016.

- FR-018: Accumulated XP unlocks levels; each level increases the number of active goal slots available. The threshold to reach level 2 (the first level-up), L2, equals the total XP a user earns by completing one perfect week for a goal (every required "Done" at full target for that week, plus the perfect-week bonus). The threshold to reach level n (n ≥ 2) is L2 × (n-1)². Priority: must-have

  > Socrates: Covered by the FR-015 challenge above (starting slots raised to 3; leveling still grows the limit).

- FR-021: User earns a "perfect week" badge when a goal's full target is met every required instance in a week. Priority: must-have

  > Socrates: No separate challenge; badge criteria follow directly from FR-017's perfect-week definition.

- FR-022: User earns streak-milestone badges at 7, 30, and 100 days for a given goal. Priority: must-have
  > Socrates: Counter-argument considered: "A 100-day streak can't realistically be reached before the first deadline in a 6-week MVP, so is it worth building now?" Resolution: kept; the threshold-comparison logic is simple and reusable, and the badge remains valuable to the user after the deadline passes.

### Weekly Review

- FR-019: User can view a "Weekly Review" screen summarizing, for each goal, the past week's outcome (target met / minimum met / missed), current streak, and XP earned that week. Priority: must-have

  > Socrates: Counter-argument considered: "A dedicated screen is more scope than a home-page banner." Resolution: kept as a dedicated screen; it's the natural home for the suggestion-accept/reject flow in FR-020.

- FR-020: App generates a suggestion to lower a goal's target/minimum if the week fell below minimum, or to raise it if the target was exceeded for 2 consecutive weeks; user must explicitly accept or dismiss the suggestion — nothing changes automatically. Priority: must-have
  > Socrates: Counter-argument considered: "Automatic suggestions could feel pushy or demotivating (\"the app is telling me I'm weak\")." Resolution: kept, but framed as an optional, dismissible proposal the user must actively accept — no goal is changed without explicit consent.

### Social

- FR-023: User can invite a friend via a shareable link; the recipient can accept to establish a mutual friend relationship. Priority: must-have

  > Socrates: Counter-argument considered: "This is a full social feature (invite flow, visibility, moderation) competing for scope against XP/levels/Weekly Review in a 6-week solo project — it may not fit." Resolution: kept in MVP but scoped to the minimum: link-based invite/accept and read-only visibility only (no chat, no notifications, no feed).

- FR-024: User can mark a goal as public or private; a public goal's progress and streak are visible, read-only, to accepted friends. Private goals are never visible to anyone else. Priority: must-have
  > Socrates: No separate challenge; visibility rule is the direct counterpart to the Access Control model and the privacy guardrail.

### Secondary (nice-to-have)

- FR-002: User can log in with OAuth (Google, GitHub, Apple). Priority: nice-to-have
- FR-008: User can view streak as a calendar visualization. Priority: nice-to-have
- FR-013: User can add details after marking "Done less" or "Done more" (e.g., actual count/duration). Priority: nice-to-have

## Non-Functional Requirements

- NFR-001: The product remains usable on the last 2 major versions of the four mainstream browsers (Chrome, Firefox, Safari, Edge). Priority: must-have
- NFR-002: A private goal is never visible to any other user; a public goal is visible only to accepted friends, never to unrelated users. Priority: must-have
- NFR-003: All operations (home load, add goal, mark done, Weekly Review load) complete in < 2s. Priority: must-have
- NFR-004: The product is available ≥ 99.5% of the time. Priority: must-have
- NFR-005: No user data is ever lost; archived goals remain retrievable indefinitely, with no retention limit. Priority: must-have
- NFR-006: Every user's Weekly Review becomes available within 24 hours of their tracking week ending, every week, without manual intervention. Priority: must-have

**Not on MVP**: Offline access (planned for a mobile app in v2).

## Business Logic

**Core rule**: The app teaches the user to set realistic goals by distinguishing a target from a minimum and validating against SMART criteria, makes progress visible through gamification (streaks sustained by the minimum, XP and bonuses for meeting the target or a perfect week, levels, badges), limits how many habits can be tracked at once (a slot count that grows with level, with priority-based queueing beyond that limit) so the user doesn't abandon everything at once, and every week evaluates actual performance and proposes — never forces — a change to a goal's difficulty; friends with visibility into public goals add a layer of social accountability.

**Streak rule**: reaching the minimum (frequency and end condition) within the relevant period sustains the streak; reaching the full target earns more XP (see Completion options), and — if true for every required day of the week — a "perfect week" badge. The tracking week runs Monday–Sunday. A goal uses one of two scheduling modes:

- _Flexible_ (N times per week): the streak is not broken while the week's minimum can still be met; it resets only at the end of a week in which the minimum was not reached (e.g. for "2x/week" minimum, fewer than 2 completions by Sunday).
- _Fixed weekdays_: the streak breaks as soon as a scheduled day passes without at least the minimum end condition.

**One-off goals**: a one-off goal is the only kind of goal with a deadline; it keeps the frequency step (flexible or fixed weekdays) and has a streak under the same rules while it is in progress. Once the goal is fully completed it stops counting toward the streak — the streak is frozen (it neither grows nor breaks) and the goal no longer appears in the Weekly Review.

**Completion options**: "Done less" = minimum met, target not met (streak kept, 5 XP); "Done" = target met (streak kept, 10 XP); "Done more" = target exceeded (streak kept, 15 XP; counts as above target for the weekly raise suggestion); "Not done" = minimum not met (0 XP). Amounts are fixed per option, not added together.

**Leveling rule**: XP accumulates from every logged completion ("Done less" 5 XP, "Done" 10 XP, "Done more" 15 XP) plus a +50 XP bonus for a perfect week; crossing an XP threshold raises the level, which increases the active goal slot limit by one — the next queued goal (by priority) becomes active automatically. The threshold to reach level 2 (L2) equals the total XP earned by completing one perfect week for a goal; the threshold to reach level n (n ≥ 2) is L2 × (n-1)² — a quadratic curve, so each level costs progressively more XP than the last, while the growing slot limit keeps pace by giving the user more goals to earn XP from.

**Weekly evaluation rule**: at the end of each week, the app compares actual performance against each goal's target/minimum; a week below minimum generates a suggestion to lower the goal, 2 consecutive weeks above target generate a suggestion to raise it — the user must explicitly accept the suggestion, otherwise the goal is left unchanged.

## Access Control

**Authentication**: Email + password (must-have). OAuth/social login (Google, GitHub, Apple) is nice-to-have (FR-002).

**Authorization model**: Flat — every logged-in user has full access to their own data (goals, progress, history). A symmetric "friend" relationship, established after an invite is accepted, grants limited, read-only access to the other party's _public_ goals and progress — never to private goals.

**Roles**: No administrative roles in the MVP (admin/moderator may be added in v1.1 if needed).

## Non-Goals

- No chat/comments between friends — read-only progress visibility only in the MVP.
- No global leaderboard/ranking across all users of the app — visibility is limited to friends.
- No group challenges between friends — deferred to v2.
- No badges beyond the fixed MVP set (perfect week, streak milestones at 7/30/100 days) — additional badges are v2.
- No integrations with other apps (Google Calendar, Fitbit, Slack, etc.) — deferred to v2.
- No AI/ML-based habit recommendation algorithm — the goal-scaling suggestion is a simple threshold rule, not a learned model.
- No team/organization-level tracking — the MVP serves individual users and their personal friend network, not teams or companies.
- No offline access — planned for a mobile app in v2, not this web-app MVP.

## Open Questions

All gaps identified during PRD generation (XP amounts, level threshold curve, category list, SMART-validation thresholds, Weekly Review suggestion timing) were resolved with the user and are reflected in the sections above. v2 (2026-09-29) added the scheduling modes, the Monday–Sunday week, the no-deadline rule for recurring goals and the completion-option XP mapping.

1. **What happens when a one-off goal's deadline passes before it is completed?** (Behaviour while in progress and after completion is settled — see Business Logic, One-off goals.) — Owner: user. Blocks: nothing yet (resolve while planning goal creation).
