import type { CreateGoalInput } from "@/lib/schemas/goal";
import type { GoalCategory, GoalUnit } from "@/types";

// Pure display helpers. They take only the slice of a goal they read, so they work for a stored Goal
// and for a not-yet-saved CreateGoalInput (the form's summary step).

const PRIORITY_LABELS = ["Highest", "High", "Medium", "Low", "Lowest"];

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  fitness: "Fitness",
  health: "Health",
  learning: "Learning",
  work_productivity: "Work & productivity",
  relationships: "Relationships",
  finance: "Finance",
  other: "Other",
};

const UNIT_LABELS: Record<GoalUnit, string> = {
  minutes: "minutes",
  hours: "hours",
  times: "times",
  pages: "pages",
  km: "km",
  steps: "steps",
};

const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 1 = highest ... 5 = lowest. */
export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority - 1] ?? String(priority);
}

export function categoryLabel(category: GoalCategory): string {
  return CATEGORY_LABELS[category];
}

export function unitLabel(unit: GoalUnit): string {
  return UNIT_LABELS[unit];
}

/** ISO weekday: 1 = Mon ... 7 = Sun. */
export function weekdayShort(day: number): string {
  return WEEKDAYS_SHORT[day - 1] ?? String(day);
}

function daysList(days: number[]): string {
  return days.map(weekdayShort).join(", ");
}

/** `5x/week (minimum 2x)` or `Mon, Wed, Fri`. */
export function scheduleSummary(goal: Pick<CreateGoalInput, "schedule">): string {
  const { schedule } = goal;
  return schedule.mode === "flexible"
    ? `${schedule.target}x/week (minimum ${schedule.minimum}x)`
    : daysList(schedule.days);
}

/** `60 minutes (minimum 30)`, or `null` when the goal has no end condition. */
export function endConditionSummary(goal: Pick<CreateGoalInput, "endCondition">): string | null {
  const { endCondition } = goal;
  if (!endCondition) return null;
  return `${endCondition.targetValue} ${unitLabel(endCondition.unit)} (minimum ${endCondition.minimumValue})`;
}

/** S-02 passes the real count instead of the default of 0. */
export function weeklyProgressText(goal: Pick<CreateGoalInput, "schedule">, completedThisWeek = 0): string {
  const { schedule } = goal;
  return schedule.mode === "flexible"
    ? `This week: ${completedThisWeek} / ${schedule.target} (minimum ${schedule.minimum})`
    : `This week: ${completedThisWeek} / ${schedule.days.length} scheduled days (${daysList(schedule.days)})`;
}
