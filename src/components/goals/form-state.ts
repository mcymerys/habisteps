import { createGoalSchema, goalStepFields } from "@/lib/schemas/goal";
import type { GoalCategory, GoalKind, GoalUnit, ScheduleMode } from "@/types";

/**
 * Raw form state. Numbers are kept as strings because that is what an <input> holds; `toPayload`
 * converts them so the shared zod schema is the only place that decides what is valid.
 */
export interface FormState {
  name: string;
  kind: GoalKind;
  deadline: string;
  measure: boolean;
  targetValue: string;
  minimumValue: string;
  unit: GoalUnit | "";
  scheduleMode: ScheduleMode;
  freqTarget: string;
  freqMinimum: string;
  days: number[];
  category: GoalCategory | "";
  priority: number;
}

/** Error messages keyed by dotted issue path (`"schedule.minimum"`), the same keys the API returns. */
export type FieldErrors = Record<string, string>;

export const initialState: FormState = {
  name: "",
  kind: "recurring",
  deadline: "",
  measure: false,
  targetValue: "",
  minimumValue: "",
  unit: "",
  scheduleMode: "flexible",
  freqTarget: "",
  freqMinimum: "",
  days: [],
  category: "",
  priority: 3,
};

export const STEP_TITLES = ["Name", "Type", "Measure", "Schedule", "Category", "Priority"] as const;

// Empty input -> undefined, so the schema reports "Enter a number" instead of treating "" as 0.
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

/** Builds the (possibly incomplete) object that `createGoalSchema` is run against. */
export function toPayload(state: FormState): unknown {
  return {
    name: state.name,
    timing: state.kind === "one_off" ? { kind: "one_off", deadline: state.deadline } : { kind: "recurring" },
    endCondition: state.measure
      ? {
          targetValue: toNumber(state.targetValue),
          minimumValue: toNumber(state.minimumValue),
          unit: state.unit === "" ? undefined : state.unit,
        }
      : null,
    schedule:
      state.scheduleMode === "flexible"
        ? { mode: "flexible", target: toNumber(state.freqTarget), minimum: toNumber(state.freqMinimum) }
        : { mode: "fixed_days", days: state.days },
    category: state.category === "" ? undefined : state.category,
    priority: state.priority,
  };
}

interface Issue {
  path: PropertyKey[];
  message: string;
}

/** Keeps the first message per field. */
function toFieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    errors[key] ??= issue.message;
  }
  return errors;
}

function stepOwnsKey(step: number, key: string): boolean {
  return (goalStepFields[step] as readonly string[]).includes(key.split(".")[0]);
}

/**
 * Validates the whole form but returns only the issues that belong to `step`. We filter instead of
 * `.pick()`-ing a sub-schema because the schema's nested refinements can't be picked.
 */
export function validateStep(state: FormState, step: number): FieldErrors {
  const result = createGoalSchema.safeParse(toPayload(state));
  if (result.success) return {};
  return toFieldErrors(result.error.issues.filter((issue) => stepOwnsKey(step, issue.path.map(String).join("."))));
}

/** Validates every step at once. */
export function validateAll(state: FormState): FieldErrors {
  const result = createGoalSchema.safeParse(toPayload(state));
  return result.success ? {} : toFieldErrors(result.error.issues);
}

/** Index of the first step that owns one of the given error keys, or -1 when none does. */
export function firstStepWithError(errorKeys: string[]): number {
  return goalStepFields.findIndex((_, index) => errorKeys.some((key) => stepOwnsKey(index, key)));
}
