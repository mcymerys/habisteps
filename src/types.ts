import type { CreateGoalInput, GOAL_CATEGORIES, GOAL_KINDS, GOAL_UNITS, SCHEDULE_MODES } from "@/lib/schemas/goal";

export type GoalKind = (typeof GOAL_KINDS)[number];
export type GoalUnit = (typeof GOAL_UNITS)[number];
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

/** A row of `public.goals`, exactly as the database returns it (snake_case). */
export interface GoalRow {
  id: string;
  user_id: string;
  name: string;
  kind: GoalKind;
  deadline: string | null;
  end_target_value: number | null;
  end_minimum_value: number | null;
  end_unit: GoalUnit | null;
  schedule_mode: ScheduleMode;
  freq_target: number | null;
  freq_minimum: number | null;
  fixed_days: number[] | null;
  category: GoalCategory;
  priority: number;
  created_at: string;
  updated_at: string;
}

/** Domain entity: the validated goal shape plus its identity and timestamps. */
export interface Goal extends CreateGoalInput {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalResponse {
  id: string;
}

/** `fieldErrors` is keyed by dotted issue path, e.g. `"schedule.minimum"`. */
export interface ApiValidationError {
  error: "validation";
  fieldErrors: Record<string, string[]>;
}

export interface ApiError {
  error: string;
}
