import { Fragment } from "react";
import { CheckCircle } from "lucide-react";

export function ProgressStepper({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <>
      <div className="mb-lw-md text-center text-[13px] font-medium text-lw-text-muted">
        Step {currentStep + 1} of {steps.length}
      </div>
      <div className="mb-lw-lg flex items-start justify-center">
        {steps.map((label, index) => (
          <Fragment key={label}>
            <div className="flex w-[120px] flex-col items-center gap-[6px]">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  index <= currentStep
                    ? "bg-lw-accent"
                    : "border border-lw-border bg-transparent"
                }`}
              >
                {index < currentStep && <CheckCircle size={14} className="text-lw-text-on-accent" />}
              </div>
              <div className="text-center text-[13px] font-medium text-lw-text-muted">{label}</div>
            </div>
            {index < steps.length - 1 && <div className="mt-lw-md h-px w-12 bg-lw-border" />}
          </Fragment>
        ))}
      </div>
    </>
  );
}
