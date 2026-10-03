-- Goals: the first domain table (slice S-01, add-first-goal).
--
-- Access model: owner-only. Each authenticated user can select / insert / update
-- only their own rows (RLS keyed on user_id = auth.uid()).
-- Two omissions are intentional:
--   * no policies for the `anon` role  - signed-out visitors can never read or write goals;
--   * no DELETE policy                 - goals are archived, never hard-deleted (NFR-005).

create extension if not exists moddatetime schema extensions;

create type public.goal_kind as enum ('recurring', 'one_off');
create type public.goal_unit as enum ('minutes', 'hours', 'times', 'pages', 'km', 'steps');
create type public.schedule_mode as enum ('flexible', 'fixed_days');
create type public.goal_category as enum (
  'fitness',
  'health',
  'learning',
  'work_productivity',
  'relationships',
  'finance',
  'other'
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  kind public.goal_kind not null,
  -- present if and only if kind = 'one_off'
  deadline date,
  -- optional end condition: all three columns set, or all three NULL
  end_target_value numeric,
  end_minimum_value numeric,
  end_unit public.goal_unit,
  schedule_mode public.schedule_mode not null,
  -- flexible schedule: target / minimum times per week
  freq_target smallint,
  freq_minimum smallint,
  -- fixed-days schedule: ISO weekdays, 1 = Monday ... 7 = Sunday
  fixed_days smallint[],
  category public.goal_category not null,
  -- 1 = highest priority
  priority smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goals_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint goals_deadline_iff_one_off check ((kind = 'one_off') = (deadline is not null)),
  constraint goals_end_condition_shape check (
    (end_target_value is null and end_minimum_value is null and end_unit is null)
    or (
      end_target_value is not null
      and end_minimum_value is not null
      and end_unit is not null
      and end_minimum_value > 0
      and end_minimum_value <= end_target_value
    )
  ),
  constraint goals_schedule_shape check (
    (
      schedule_mode = 'flexible'
      and freq_target is not null
      and freq_minimum is not null
      and freq_minimum >= 1
      and freq_minimum <= freq_target
      and fixed_days is null
    )
    or (
      schedule_mode = 'fixed_days'
      and fixed_days is not null
      and cardinality(fixed_days) >= 1
      and fixed_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      and freq_target is null
      and freq_minimum is null
    )
  ),
  constraint goals_priority_range check (priority between 1 and 5)
);

-- Dashboard query: one user's goals ordered by priority, then oldest first.
create index goals_user_priority_created_idx on public.goals (user_id, priority, created_at);

create trigger goals_set_updated_at
  before update on public.goals
  for each row
  execute function extensions.moddatetime (updated_at);

alter table public.goals enable row level security;

-- Supabase grants every privilege on new public tables to anon and authenticated by default.
-- Reset to least privilege so the table does not depend on those defaults: anon gets nothing,
-- authenticated gets select / insert / update only (no DELETE, see header). RLS still decides which rows.
revoke all on public.goals from anon, authenticated;
grant select, insert, update on public.goals to authenticated;

create policy goals_select_own on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy goals_insert_own on public.goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy goals_update_own on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
