import { GOAL_CATEGORIES, GOAL_UNITS, createGoalSchema } from "@/lib/schemas/goal";
import {
  categoryLabel,
  endConditionSummary,
  priorityLabel,
  scheduleSummary,
  unitLabel,
  weekdayShort,
} from "@/lib/goal-format";
import { Choice, Field, FieldError, inputClass, selectClass } from "@/components/goals/fields";
import { toPayload, type FieldErrors, type FormState } from "@/components/goals/form-state";
import type { GoalCategory, GoalUnit } from "@/types";

export interface StepProps {
  state: FormState;
  errors: FieldErrors;
  update: (patch: Partial<FormState>) => void;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const PRIORITIES = [1, 2, 3, 4, 5];

export function NameStep({ state, errors, update }: StepProps) {
  return (
    <Field id="goal-name" label="What do you want to do?" error={errors.name}>
      <input
        id="goal-name"
        type="text"
        value={state.name}
        onChange={(e) => {
          update({ name: e.target.value });
        }}
        placeholder="e.g. Exercise"
        className={inputClass(!!errors.name)}
      />
    </Field>
  );
}

export function TypeStep({ state, errors, update }: StepProps) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-blue-100/80">Is this goal recurring or a one-off?</legend>
        <Choice
          type="radio"
          name="kind"
          label="Recurring - I keep doing it"
          checked={state.kind === "recurring"}
          onChange={() => {
            update({ kind: "recurring" });
          }}
        />
        <Choice
          type="radio"
          name="kind"
          label="One-off - finish it by a deadline"
          checked={state.kind === "one_off"}
          onChange={() => {
            update({ kind: "one_off" });
          }}
        />
      </fieldset>

      {state.kind === "one_off" && (
        <Field id="goal-deadline" label="Deadline" error={errors["timing.deadline"]}>
          <input
            id="goal-deadline"
            type="date"
            value={state.deadline}
            onChange={(e) => {
              update({ deadline: e.target.value });
            }}
            className={inputClass(!!errors["timing.deadline"])}
          />
        </Field>
      )}
    </div>
  );
}

export function MeasureStep({ state, errors, update }: StepProps) {
  return (
    <div className="space-y-4">
      <Choice
        type="checkbox"
        name="measure"
        label="Measure each completion (e.g. 60 minutes)"
        checked={state.measure}
        onChange={(measure) => {
          update({ measure });
        }}
      />

      {state.measure ? (
        <>
          <Field id="goal-target-value" label="Target value" error={errors["endCondition.targetValue"]}>
            <input
              id="goal-target-value"
              type="number"
              inputMode="decimal"
              step="any"
              value={state.targetValue}
              onChange={(e) => {
                update({ targetValue: e.target.value });
              }}
              placeholder="60"
              className={inputClass(!!errors["endCondition.targetValue"])}
            />
          </Field>
          <Field id="goal-minimum-value" label="Minimum value" error={errors["endCondition.minimumValue"]}>
            <input
              id="goal-minimum-value"
              type="number"
              inputMode="decimal"
              step="any"
              value={state.minimumValue}
              onChange={(e) => {
                update({ minimumValue: e.target.value });
              }}
              placeholder="30"
              className={inputClass(!!errors["endCondition.minimumValue"])}
            />
          </Field>
          <Field id="goal-unit" label="Unit" error={errors["endCondition.unit"]}>
            <select
              id="goal-unit"
              value={state.unit}
              onChange={(e) => {
                update({ unit: e.target.value as GoalUnit | "" });
              }}
              className={selectClass(!!errors["endCondition.unit"])}
            >
              <option value="">Select a unit</option>
              {GOAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </Field>
        </>
      ) : (
        <p className="text-sm text-blue-100/50">Skip this if you only want to track whether you did it.</p>
      )}
    </div>
  );
}

export function ScheduleStep({ state, errors, update }: StepProps) {
  function toggleDay(day: number, selected: boolean) {
    update({ days: selected ? [...state.days, day] : state.days.filter((d) => d !== day) });
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-blue-100/80">When will you do it?</legend>
        <Choice
          type="radio"
          name="scheduleMode"
          label="Flexible - a number of times per week"
          checked={state.scheduleMode === "flexible"}
          onChange={() => {
            update({ scheduleMode: "flexible" });
          }}
        />
        <Choice
          type="radio"
          name="scheduleMode"
          label="Fixed days - the same weekdays"
          checked={state.scheduleMode === "fixed_days"}
          onChange={() => {
            update({ scheduleMode: "fixed_days" });
          }}
        />
      </fieldset>

      {state.scheduleMode === "flexible" ? (
        <>
          <Field id="goal-freq-target" label="Target times per week" error={errors["schedule.target"]}>
            <input
              id="goal-freq-target"
              type="number"
              inputMode="numeric"
              step="1"
              value={state.freqTarget}
              onChange={(e) => {
                update({ freqTarget: e.target.value });
              }}
              placeholder="5"
              className={inputClass(!!errors["schedule.target"])}
            />
          </Field>
          <Field id="goal-freq-minimum" label="Minimum times per week" error={errors["schedule.minimum"]}>
            <input
              id="goal-freq-minimum"
              type="number"
              inputMode="numeric"
              step="1"
              value={state.freqMinimum}
              onChange={(e) => {
                update({ freqMinimum: e.target.value });
              }}
              placeholder="2"
              className={inputClass(!!errors["schedule.minimum"])}
            />
          </Field>
        </>
      ) : (
        <fieldset>
          <legend className="mb-1 text-sm text-blue-100/80">Days</legend>
          <div className="grid grid-cols-4 gap-2">
            {WEEKDAYS.map((day) => (
              <Choice
                key={day}
                type="checkbox"
                name="days"
                label={weekdayShort(day)}
                checked={state.days.includes(day)}
                onChange={(selected) => {
                  toggleDay(day, selected);
                }}
              />
            ))}
          </div>
          <FieldError message={errors["schedule.days"]} />
        </fieldset>
      )}
    </div>
  );
}

export function CategoryStep({ state, errors, update }: StepProps) {
  return (
    <Field id="goal-category" label="Category" error={errors.category}>
      <select
        id="goal-category"
        value={state.category}
        onChange={(e) => {
          update({ category: e.target.value as GoalCategory | "" });
        }}
        className={selectClass(!!errors.category)}
      >
        <option value="">Select a category</option>
        {GOAL_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {categoryLabel(category)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function PriorityStep({ state, errors, update }: StepProps) {
  // Re-parse the form to show the normalised answers (trimmed name, sorted days). If something is
  // still invalid the summary is simply hidden; the step that owns the error will report it.
  const parsed = createGoalSchema.safeParse(toPayload(state));
  const goal = parsed.success ? parsed.data : null;
  const endCondition = goal ? endConditionSummary(goal) : null;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm text-blue-100/80">How important is it? (1 = highest)</legend>
        {PRIORITIES.map((priority) => (
          <Choice
            key={priority}
            type="radio"
            name="priority"
            label={`${priority} - ${priorityLabel(priority)}`}
            checked={state.priority === priority}
            onChange={() => {
              update({ priority });
            }}
          />
        ))}
        <FieldError message={errors.priority} />
      </fieldset>

      {goal && (
        <dl className="space-y-1 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
          <SummaryRow label="Goal" value={goal.name} />
          <SummaryRow
            label="Type"
            value={goal.timing.kind === "one_off" ? `One-off, by ${goal.timing.deadline}` : "Recurring"}
          />
          {endCondition && <SummaryRow label="Each time" value={endCondition} />}
          <SummaryRow label="Schedule" value={scheduleSummary(goal)} />
          <SummaryRow label="Category" value={categoryLabel(goal.category)} />
          <SummaryRow label="Priority" value={priorityLabel(goal.priority)} />
        </dl>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-blue-100/60">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}
