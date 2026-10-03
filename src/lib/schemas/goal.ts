import { z } from "zod";

// Single source for the option lists: the schema and the UI both read these.
// They must match the SQL enums in supabase/migrations/*_create_goals.sql exactly.
export const GOAL_KINDS = ["recurring", "one_off"] as const;
export const GOAL_UNITS = ["minutes", "hours", "times", "pages", "km", "steps"] as const;
export const SCHEDULE_MODES = ["flexible", "fixed_days"] as const;
export const GOAL_CATEGORIES = [
  "fitness",
  "health",
  "learning",
  "work_productivity",
  "relationships",
  "finance",
  "other",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Rejects both malformed strings and impossible dates such as 2026-02-31
// (Date would silently roll those over to March).
function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const deadlineSchema = z
  .string()
  .refine(isRealDate, "Pick a deadline date")
  // "Today" is computed on every parse. A module-level date would be frozen for the lifetime of
  // a Worker isolate (and of a long-open browser tab). ISO dates compare correctly as strings.
  .refine(
    (value) => !isRealDate(value) || value >= new Date().toISOString().slice(0, 10),
    "Deadline can't be in the past",
  );

const positiveNumber = z.number({ error: "Enter a number" }).positive("Must be greater than 0");
const positiveInteger = z
  .number({ error: "Enter a whole number" })
  .int("Enter a whole number")
  .min(1, "Must be at least 1");

// Cross-field rules live inside the nested objects (timing / endCondition / schedule) and never on the
// top-level object: zod skips a top-level refinement while any other key is still invalid, which would
// silence the rule whenever a later step is still empty.

// "deadline iff one-off" is structural: only the one_off variant has a deadline key, and zod strips
// unknown keys, so a recurring goal can never carry one.
const timingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("recurring") }),
  z.object({ kind: z.literal("one_off"), deadline: deadlineSchema }),
]);

const endConditionSchema = z
  .object({
    targetValue: positiveNumber,
    minimumValue: positiveNumber,
    unit: z.enum(GOAL_UNITS, { error: "Pick a unit" }),
  })
  .refine((value) => value.minimumValue <= value.targetValue, {
    message: "Minimum can't be greater than the target",
    path: ["minimumValue"],
  })
  .nullable();

const scheduleSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("flexible"),
      target: positiveInteger,
      minimum: positiveInteger,
    })
    .refine((value) => value.minimum <= value.target, {
      message: "Minimum can't be greater than the target",
      path: ["minimum"],
    }),
  z.object({
    mode: z.literal("fixed_days"),
    // ISO weekdays: 1 = Monday ... 7 = Sunday. Normalised to unique, ascending.
    days: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Pick at least one day")
      .transform((days) => [...new Set(days)].sort((a, b) => a - b)),
  }),
]);

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name can be at most 100 characters"),
  timing: timingSchema,
  endCondition: endConditionSchema,
  schedule: scheduleSchema,
  category: z.enum(GOAL_CATEGORIES, { error: "Pick a category" }),
  // 1 = highest priority
  priority: z.number({ error: "Pick a priority" }).int().min(1, "Priority is 1-5").max(5, "Priority is 1-5"),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

// The six form steps, in order, and the top-level keys each one owns. The form uses this to keep only
// the current step's issues and to jump to the first step that contains a server-side error.
export const goalStepFields = [
  ["name"],
  ["timing"],
  ["endCondition"],
  ["schedule"],
  ["category"],
  ["priority"],
] as const satisfies readonly (readonly (keyof CreateGoalInput)[])[];
