import { useCallback, useState } from "react";

/** Tracks which step of a wizard is showing; the component only decides what each step renders. */
export function useMultiStepForm(stepCount: number) {
  const [step, setStep] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      setStep(Math.min(Math.max(index, 0), stepCount - 1));
    },
    [stepCount],
  );
  const next = useCallback(() => {
    setStep((current) => Math.min(current + 1, stepCount - 1));
  }, [stepCount]);
  const back = useCallback(() => {
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  return { step, isFirst: step === 0, isLast: step === stepCount - 1, next, back, goTo };
}
