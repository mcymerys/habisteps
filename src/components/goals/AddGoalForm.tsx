import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerError } from "@/components/auth/ServerError";
import { useMultiStepForm } from "@/components/hooks/useMultiStepForm";
import {
  STEP_TITLES,
  firstStepWithError,
  initialState,
  toPayload,
  validateAll,
  validateStep,
  type FieldErrors,
  type FormState,
} from "@/components/goals/form-state";
import {
  CategoryStep,
  MeasureStep,
  NameStep,
  PriorityStep,
  ScheduleStep,
  TypeStep,
  type StepProps,
} from "@/components/goals/steps";
import { createGoalSchema } from "@/lib/schemas/goal";
import type { ApiValidationError, CreateGoalResponse } from "@/types";

const STEP_COMPONENTS: ((props: StepProps) => React.JSX.Element)[] = [
  NameStep,
  TypeStep,
  MeasureStep,
  ScheduleStep,
  CategoryStep,
  PriorityStep,
];

const GENERIC_ERROR = "Something went wrong. Please try again.";

export default function AddGoalForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { step, isFirst, isLast, next, back, goTo } = useMultiStepForm(STEP_COMPONENTS.length);

  // Editing anything clears the shown errors; "Next" / submit re-validate and show what is still wrong.
  function update(patch: Partial<FormState>) {
    setState((prev) => ({ ...prev, ...patch }));
    setErrors({});
    setGeneralError(null);
  }

  function handleNext() {
    const stepErrors = validateStep(state, step);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) next();
  }

  async function submit() {
    // Each step was validated on "Next", but re-check everything: the user can jump back and edit.
    const allErrors = validateAll(state);
    const failingStep = firstStepWithError(Object.keys(allErrors));
    if (failingStep !== -1) {
      setErrors(allErrors);
      goTo(failingStep);
      return;
    }
    const parsed = createGoalSchema.safeParse(toPayload(state));
    if (!parsed.success) return;

    setPending(true);
    setGeneralError(null);
    let navigating = false;
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 201) {
        const { id }: CreateGoalResponse = await response.json();
        navigating = true;
        window.location.assign(`/goals/${id}`);
      } else if (response.status === 401) {
        navigating = true;
        window.location.assign("/auth/signin");
      } else if (response.status === 400) {
        const body: ApiValidationError = await response.json();
        const serverErrors: FieldErrors = {};
        for (const [key, messages] of Object.entries(body.fieldErrors)) {
          serverErrors[key] = messages[0];
        }
        setErrors(serverErrors);
        const target = firstStepWithError(Object.keys(serverErrors));
        if (target !== -1) goTo(target);
        else setGeneralError("_" in serverErrors ? serverErrors._ : GENERIC_ERROR);
      } else {
        setGeneralError(GENERIC_ERROR);
      }
    } catch {
      setGeneralError(GENERIC_ERROR);
    } finally {
      // Keep the button disabled while the browser navigates away.
      if (!navigating) setPending(false);
    }
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    if (isLast) void submit();
    else handleNext();
  }

  const StepComponent = STEP_COMPONENTS[step];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <p className="mb-2 text-sm text-blue-100/60">
          Step {step + 1} of {STEP_COMPONENTS.length} - {STEP_TITLES[step]}
        </p>
        <div className="h-1 rounded-full bg-white/10">
          <div
            className="h-1 rounded-full bg-purple-400 transition-all"
            style={{ width: `${((step + 1) / STEP_COMPONENTS.length) * 100}%` }}
          />
        </div>
      </div>

      <StepComponent state={state} errors={errors} update={update} />

      <ServerError message={generalError} />

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={isFirst || pending}
          className="rounded-lg text-white hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {/* Distinct keys so React never reuses one DOM button for both roles mid-click. */}
        {isLast ? (
          <Button
            key="submit"
            type="submit"
            disabled={pending}
            className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500"
          >
            <Plus className="size-4" />
            {pending ? "Creating..." : "Create goal"}
          </Button>
        ) : (
          <Button
            key="next"
            type="submit"
            className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500"
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
