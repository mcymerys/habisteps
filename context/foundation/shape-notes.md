---
project: Habistep
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  mvp_target: 1-10
timeline_budget:
  mvp_weeks: 6
  hard_deadline: 2026-11-07
  after_hours_only: true
created: 2026-09-25
updated: 2026-09-26
completed_phase_7: 2026-09-26
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 24
  quality_check_status: accepted
---

# Shape Notes: Habistep

## Vision & Problem Statement

**Problem**: Ludzie chcą budować nawyki, ale ustawiają je zbyt ambitnie od razu, chcą robić wszystko naraz, tracą motywację bez widocznego postępu i bez struktury nie wiedzą, czy postęp jest wystarczający.

**Core insight**: Istniejące aplikacje do śledzenia nawyków (fitness tracker, habit tracker) rejestrują wykonanie, ale nie pomagają w ustawieniu realnego celu na początek. Brakuje im: (1) edukacji o realnych celach (SMART, rozróżnienie minimum survival vs. aspiracji), (2) widocznego postępu poprzez grywalizację (streaki, XP, poziomy, odznaki), (3) adaptacyjnego planu — cotygodniowe sugestie zmian na bazie tego, co zadziałało, (4) poczucia odpowiedzialności przez znajomych i cele publiczne.

**Solution direction**: Aplikacja edukuje o realnych celach (target + minimum, walidacja SMART), pokazuje postęp poprzez grywalizację (streaki, XP, poziomy, odznaki), adaptuje plan co tydzień na bazie wykonania (Weekly Review z sugestiami), i wspiera odpowiedzialność społeczną (znajomi, cele publiczne/prywatne).

---

## User & Persona

**Primary persona**: Developer (Java 10+ lat doświadczenia), chcący zbudować to dla siebie.

**Target group**: Osoby chcące się zmienić — ludzie motywowani do budowania nawyków, gotowi do struktury.

**Pain dimensions addressed**:

- Brak struktury / jasności — walidacja SMART, cele z targetem i minimum
- Brak motywacji / widocznego postępu — streaki, XP, poziomy, odznaki
- Zbyt wiele tego naraz — paraliż — limit slotów na nawyki rosnący z poziomem, kolejkowanie wg priorytetu
- Brak społeczności / poczucia odpowiedzialności — znajomi, cele publiczne/prywatne

---

## Access Control

**Authentication**: Email + password AND OAuth/social (Google, GitHub, Apple itp.)

**Authorization model**: Flat — każdy zalogowany użytkownik ma pełny dostęp do swoich danych (nawyki, cele, postęp). Dodatkowo: relacja "znajomi" (symetryczna, po akceptacji zaproszenia) daje ograniczony, read-only dostęp do _publicznych_ celów i postępu drugiej strony — nigdy do celów prywatnych.

**Roles**: Brak ról administracyjnych w MVP (admin/moderator dodaj jeśli trzeba w v1.1).

---

## Success Criteria

### Primary

Użytkownik zaloguje się, zobaczy listę celów na dziś, doda nowy cel z targetem i minimum (nazwa, termin, warunek końcowy target/minimum, częstotliwość target/minimum, kategoria, priorytet), zobaczy pasek postępu i streak dla tego celu, zdobędzie XP za odhaczenie dnia, po tygodniu zobaczy ekran Weekly Review z podsumowaniem i ewentualną sugestią zmiany celu, oraz będzie mógł zaprosić znajomego i zobaczyć jego publiczny cel. To udowadnia, że aplikacja działa jako całość (nie tylko jako lista CRUD).

**MVP Przepływ** (6 tygodni, 10-15h/tydzień, praca po godzinach):

1. Login (email + password OR OAuth)
2. Home — lista celów na dziś do odhaczenia
3. Dodaj cel (forma multi-step):
   - Nazwa
   - Termin (deadline vs. bezterminowy)
   - Warunek końcowy: target (np. "1h") i minimum (np. "30min")
   - Częstotliwość: target (np. "5x/tydzień") i minimum (np. "2x/tydzień")
   - Kategoria (hardcodowana lista)
   - Priorytet (używany do kolejkowania celów ponad limit slotów)
4. Widok celu — pasek postępu + streak (minimum podtrzymuje streak, target daje bonus)
5. Odhaczanie dnia (Done / Not done / Done less / Done more) → XP za każde Done, bonus XP za pełny target
6. Poziomy — zdobyte XP odblokowują kolejne sloty na nawyki (start: 3 sloty aktywne, kolejne cele czekają w kolejce wg priorytetu)
7. Weekly Review — cotygodniowy ekran podsumowania (zaliczony/nie, streak, zdobyte XP) + sugestia obniżenia/podniesienia celu do zaakceptowania lub odrzucenia
8. Odznaki — perfect week + streak milestones (7/30/100 dni)
9. Znajomi — zaproszenie linkiem, akceptacja, podgląd read-only publicznych celów/streaków znajomego

### Secondary

Mile widziane na MVP (jeśli będzie czas):

- Wizualizacja streaka (calendar view, nie tylko liczba)
- Login przez OAuth (Google, GitHub, Apple) — email/password wystarcza jako must-have
- Możliwość dopisania szczegółów po "Done less" / "Done more" (np. faktyczny czas/liczba)

### Guardrails

Rzeczy, które **nie mogą się zepsuć**:

- **Prywatność**: Cele i postęp użytkownika są prywatne i bezpieczne; cel oznaczony jako prywatny nie jest widoczny dla nikogo, w tym znajomych. Cel publiczny jest widoczny wyłącznie dla zaakceptowanych znajomych, nigdy dla wszystkich użytkowników.
- **Wydajność**: Operacje < 2s (załadowanie home, dodawanie celu, Weekly Review)
- **Uptime**: Aplikacja musi działać bez przerw
- **Persistencja**: Dane użytkownika nie mogą się zgubić
- **Niezawodność Weekly Review**: cotygodniowe podsumowanie musi być dostępne dla każdego użytkownika, co tydzień, bez ręcznej interwencji

---

## Timeline acknowledgment

Acknowledged on 2026-09-26: 6-week MVP (10-15h/week, after-hours) requires sustained dedication across an expanded scope (dual-threshold goals, XP/levels, Weekly Review with auto-suggestions, badges, friends); user accepted the cost after reviewing the scope-down alternative and chose to commit to the full scope within the longer timeline.

---

## Functional Requirements

### MVP (must-have)

- FR-001: User can log in with email and password. Priority: must-have

  > Socrates: No counter-argument; login is fundamental for multi-user app.

- FR-003: User can view all goals sorted by when they need to be executed (by deadline/frequency); if all today's goals completed, show motivational message "That's all for today, you're on track"; click "Show more" to view goals for other days. Priority: must-have

  > Socrates: Counter-argument considered: "Show only today's goals might hide important tasks." Resolution: kept with "Show more" toggle for other days.

- FR-004: User can add a new goal through a multi-step form (Step 1: name, Step 2: deadline, Step 3: end condition — target and minimum, Step 4: frequency — target and minimum, Step 5: category, Step 6: priority). Priority: must-have

  > Socrates: Counter-argument considered: "Multi-step form might cause drop-off at step 2." Resolution: kept; user accepted the flow.

- FR-005: User can view a goal's detail page with streak count and text-based progress. Priority: must-have

  > Socrates: Counter-argument considered: "Visual progress bar takes effort; text is enough." Resolution: text-based only on MVP; visual bar in v2.

- FR-006: User can mark a goal as: Done, Not done, Done less (partial), Done more (exceeded). Priority: must-have

  > Socrates: Counter-argument considered: "Four options are complex; binary (Done/Not done) is simpler." Resolution: kept; four options provide nuance needed for adaptive feedback.

- FR-007: App validates goal SMART criteria and warns if unrealistic (e.g., target far above minimum, or frequency exceeding physical limits). Priority: must-have

  > Socrates: Counter-argument considered: "Extra validation UX is more work in an already expanded MVP." Resolution: kept as must-have; this is the app's core insight (helping users set realistic goals), not a cosmetic add-on.

- FR-009: User can edit an existing goal, including target/minimum thresholds and priority. Priority: must-have

  > Socrates: Counter-argument considered: "Edit is extra work; user could delete + re-add." Resolution: kept; edit is simpler UX.

- FR-010: User can archive a goal (hide from active list, data preserved). Priority: must-have

  > Socrates: Counter-argument considered: "Delete is simpler than archive." Resolution: archive chosen; preserves data for history/insights later.

- FR-012: App shows motivational message when all today's goals are completed. Priority: must-have

  > Socrates: No counter-argument; reinforces engagement.

- FR-014: User can set a priority on each goal, used to order which goals are active vs. queued when the slot limit is reached. Priority: must-have

  > Socrates: No separate challenge; priority is a prerequisite for FR-015's queueing mechanic, confirmed alongside it.

- FR-015: New user starts with 3 active goal slots; goals added beyond the slot limit are queued (locked, not tracked) in priority order until a slot frees up or the user levels up. Priority: must-have

  > Socrates: Counter-argument considered: "A slot limit could discourage a new user who wants to track 5 habits immediately." Resolution: starting limit raised from 1 to 3 to reduce onboarding friction, while keeping the focus-forcing mechanic that supports the app's core insight (avoid doing too much at once).

- FR-016: User earns a fixed amount of XP for each "Done" logged for a goal. Priority: must-have

  > Socrates: Counter-argument considered: "Fixed XP regardless of goal difficulty could be trivially farmed with easy goals." Resolution: kept; farming isn't a real risk in a single-user MVP with no cross-user ranking.

- FR-017: User earns bonus XP for meeting the full target (not just minimum) on a given day, and an additional bonus for a perfect week. Priority: must-have

  > Socrates: No separate challenge; addressed together with FR-016.

- FR-018: Accumulated XP unlocks levels; each level increases the number of active goal slots available. Priority: must-have

  > Socrates: Covered by the FR-015 challenge above (starting slots raised to 3; leveling still grows the limit).

- FR-019: User can view a "Weekly Review" screen summarizing, for each goal, the past week's outcome (target met / minimum met / missed), current streak, and XP earned that week. Priority: must-have

  > Socrates: Counter-argument considered: "A dedicated screen is more scope than a home-page banner." Resolution: kept as a dedicated screen; it's the natural home for the suggestion-accept/reject flow in FR-020.

- FR-020: App generates a suggestion to lower a goal's target/minimum if the week fell below minimum, or to raise it if the target was exceeded for multiple consecutive weeks; user must explicitly accept or dismiss the suggestion — nothing changes automatically. Priority: must-have

  > Socrates: Counter-argument considered: "Automatic suggestions could feel pushy or demotivating (\"the app is telling me I'm weak\")." Resolution: kept, but framed as an optional, dismissible proposal the user must actively accept — no goal is changed without explicit consent.

- FR-021: User earns a "perfect week" badge when a goal's full target is met every required instance in a week. Priority: must-have

  > Socrates: No separate challenge; badge criteria follow directly from FR-017's perfect-week definition.

- FR-022: User earns streak-milestone badges at 7, 30, and 100 days for a given goal. Priority: must-have

  > Socrates: Counter-argument considered: "A 100-day streak can't realistically be reached before the first deadline in a 6-week MVP, so is it worth building now?" Resolution: kept; the threshold-comparison logic is simple and reusable, and the badge remains valuable to the user after the deadline passes.

- FR-023: User can invite a friend via a shareable link; the recipient can accept to establish a mutual friend relationship. Priority: must-have

  > Socrates: Counter-argument considered: "This is a full social feature (invite flow, visibility, moderation) competing for scope against XP/levels/Weekly Review in a 6-week solo project — it may not fit." Resolution: kept in MVP but scoped to the minimum: link-based invite/accept and read-only visibility only (no chat, no notifications, no feed).

- FR-024: User can mark a goal as public or private; a public goal's progress and streak are visible, read-only, to accepted friends. Private goals are never visible to anyone else. Priority: must-have
  > Socrates: No separate challenge; visibility rule is the direct counterpart to the Access Control model and the privacy guardrail.

### Secondary (nice-to-have)

- FR-002: User can log in with OAuth (Google, GitHub, Apple). Priority: nice-to-have

- FR-008: User can view streak as a calendar visualization. Priority: nice-to-have

- FR-013: User can add details after marking "Done less" or "Done more" (e.g., actual count/duration). Priority: nice-to-have

---

## User Stories

### US-01: Create and view a new goal

**Given**: User is logged in and viewing the home page with no goals listed.

**When**: User clicks "Add goal" and fills the form:

- Name: "Exercise"
- Deadline: "Tomorrow"
- End condition: target "1 hour", minimum "30 minutes"
- Frequency: target "5x/week", minimum "2x/week"
- Category: "Fitness"
- Priority: "High"

Then submits the form.

**Then**:

- Goal appears in the home page list
- User is taken to the goal detail page
- User sees the goal with a progress bar (0% complete initially) and streak counter (0 days)
- User can mark the goal as done today

---

### US-02: Login with email and password

**Given**: User is on the login page.

**When**: User enters email "user@example.com" and password "SecurePass123", then clicks "Sign in".

**Then**:

- Login succeeds (credentials valid)
- User is redirected to home page with their goals
- Session is maintained

---

### US-03: View home page with today's goals and motivational message

**Given**: User is logged in and has 2 goals due today (both completed).

**When**: User views the home page.

**Then**:

- Goals are sorted by when they need to be executed (deadline/frequency)
- Both goals show as completed (checkmarks)
- Motivational message appears: "That's all for today, you're on track"
- "Show more" button visible to see goals for other days

---

### US-04: Mark goal with 4 options (Done, Not done, Done less, Done more)

**Given**: User is viewing a goal detail page (e.g., "Exercise - target 1h, minimum 30min, 5x/week target / 2x/week minimum").

**When**: User clicks on the goal mark-as-done section.

**Then**:

- User sees 4 options:
  1. Done (full completion)
  2. Not done
  3. Done less (partial, e.g., 15 min instead of 30)
  4. Done more (exceeded, e.g., 45 min)
- User selects one option (e.g., "Done less")
- Streak updates accordingly (minimum threshold met keeps the streak alive; falling short of minimum breaks it)
- User earns XP for the logged "Done"; meeting the full target earns bonus XP
- Goal status reflects the selection

---

### US-05: Edit existing goal

**Given**: User is viewing a goal detail page for "Exercise".

**When**: User clicks "Edit goal" button.

**Then**:

- Edit form pre-fills with current goal data (name, deadline, target/minimum end condition, target/minimum frequency, category, priority)
- User can modify any field
- User submits the form
- Goal is updated on the home page and detail page
- Streak and progress history are preserved

---

### US-06: Archive goal

**Given**: User is viewing a goal that they want to stop tracking.

**When**: User clicks "Archive goal" button.

**Then**:

- Goal is hidden from the active goals list on home page
- Goal is still stored (not deleted)
- User can view archived goals via "Show more" or archive section
- Streak and progress data are preserved

---

### US-07: Multi-step form — handle form submission and validation

**Given**: User is on Step 1 of the add goal form (name entry).

**When**: User fills all steps (name → deadline → target/minimum end condition → target/minimum frequency → category → priority) and clicks "Create goal".

**Then**:

- Form validates all fields, including SMART validation (e.g., warns if target frequency is physically unrealistic, or if target is set far above minimum without justification)
- If any field is invalid, user sees error message and stays on that step
- If all valid, goal is created and user sees goal detail page
- Streak counter starts at 0

---

### US-08: Weekly Review with a goal-scaling suggestion

**Given**: User has a goal "Exercise" (target 5x/week, minimum 2x/week) and logged only 1 day this past week (below minimum).

**When**: User opens the Weekly Review screen at the start of the new week.

**Then**:

- Screen shows the goal's outcome for last week: "Missed (1/2 minimum)"
- Screen shows current streak status and XP earned last week
- A suggestion appears: "Lower this goal's minimum to make it more achievable?"
- User can accept the suggestion (goal is updated) or dismiss it (goal stays unchanged) — no change happens without explicit action

---

### US-09: Leveling up unlocks a new goal slot

**Given**: User has 3 active goal slots, all filled, and one additional goal queued (locked) by priority.

**When**: User's accumulated XP crosses the threshold for the next level.

**Then**:

- User is notified they've reached a new level
- Active goal slot count increases by one
- The highest-priority queued goal automatically becomes active and starts being tracked

---

### US-10: Invite a friend and view their public goal

**Given**: User wants to add an accountability partner.

**When**: User generates an invite link and shares it; the recipient opens the link and accepts.

**Then**:

- Both users are now friends
- User can see the friend's public goals in a read-only view, including progress and streak
- Any goal the friend marked private remains invisible to the user

---

### US-11: Earn a perfect week badge

**Given**: User met the full target (not just minimum) for a goal every required day this past week.

**When**: The week ends and Weekly Review is generated.

**Then**:

- Goal shows "Perfect week" status for the past week
- User earns the "Perfect week" badge for that goal
- User earns the associated bonus XP

---

## Business Logic

**Core rule**: Aplikacja edukuje użytkownika o realnych celach poprzez rozróżnienie target/minimum i walidację SMART, pokazuje postęp poprzez grywalizację (streaki podtrzymywane przez minimum, XP i bonusy za target/perfect week, poziomy, odznaki), ogranicza liczbę jednocześnie śledzonych nawyków (sloty rosnące z poziomem, kolejkowanie wg priorytetu) aby użytkownik nie porzucał wszystkiego naraz, oraz co tydzień ocenia wykonanie i proponuje (nigdy nie wymusza) korektę celu w górę lub w dół — a znajomi z widokiem na publiczne cele budują poczucie odpowiedzialności.

**Streak rule**: osiągnięcie minimum (częstotliwość i warunek końcowy) w danym okresie podtrzymuje streak; osiągnięcie pełnego targetu dodaje bonus XP i, jeśli dotyczy to każdego wymaganego dnia tygodnia, odznakę "perfect week".

**Leveling rule**: XP sumuje się z każdego zalogowanego "Done" (stała wartość) plus bonusy za target/perfect week; przekroczenie progu XP podnosi poziom, co zwiększa limit aktywnych slotów na cele o jeden — kolejne, wcześniej zakolejkowane cele (wg priorytetu) stają się aktywne automatycznie.

**Weekly evaluation rule**: na koniec każdego tygodnia aplikacja porównuje wykonanie z target/minimum dla każdego celu; tydzień poniżej minimum generuje sugestię obniżenia celu, kilka kolejnych tygodni powyżej targetu generuje sugestię podniesienia celu — użytkownik musi jawnie zaakceptować sugestię, inaczej cel pozostaje bez zmian.

---

## Non-Functional Requirements

- NFR-001: App supports most popular browsers (Chrome, Firefox, Safari, Edge - last 2 versions). Priority: must-have
- NFR-002: User data is private and secure; a private goal is never visible to any other user; a public goal is visible only to accepted friends, never to unrelated users. Priority: must-have
- NFR-003: Performance: all operations < 2s (home load, add goal, mark done, Weekly Review load). Priority: must-have
- NFR-004: Uptime: app available 99.5% of the time. Priority: must-have
- NFR-005: Persistence: user data never lost; archived goals stored indefinitely (no retention limit). Priority: must-have
- NFR-006: Every user's Weekly Review becomes available within 24 hours of their tracking week ending, every week, without manual intervention. Priority: must-have

**Not on MVP**: Offline access (planned for mobile app in v2).

---

## Non-Goals

- Brak czatu / komentarzy między znajomymi — tylko odczyt postępu (read-only) w MVP
- Brak globalnego rankingu / leaderboard między wszystkimi użytkownikami aplikacji — widoczność ograniczona do znajomych
- Brak grupowych challenges między znajomymi — to v2
- Brak dodatkowych odznak poza ustalonym zestawem (perfect week, streak milestones 7/30/100 dni) — inne odznaki to v2
- Brak integracji z innymi aplikacjami (Google Calendar, Fitbit, Slack itp.) — to v2
- Brak algorytmu AI/ML do rekomendacji nawyków — sugestie skalowania celu to prosta reguła progowa, nie model uczenia maszynowego
- Brak zespołowego trackowania / organizacji — MVP dla indywidualnych użytkowników i ich sieci znajomych, nie zespołów/firm

---

## Quality Cross-Check

**Result: All elements present. Status: ACCEPTED.**

- Access Control: ✓ present (email + password + OAuth planned; flat user model + read-only friend visibility for public goals)
- Business Logic: ✓ present (streak/leveling/weekly-evaluation rules stated as one-sentence-anchored domain rules, not CRUD)
- Project artifacts: ✓ present (shape-notes.md with complete checkpoint)
- Timeline-cost acknowledged: ✓ present (6-week MVP, explicit acknowledgment recorded 2026-09-26 after scope-down alternative was reviewed and declined)
- Non-Goals: ✓ present (7 non-goals clearly listed, scoped to the expanded feature set)
- Preserved behavior: n/a (greenfield project)
