import { Fragment } from 'react'
import { CheckCircle } from 'lucide-react'

interface ProgressStepperProps {
  steps: string[]
  currentStep: number
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <>
      <div className="lw-progress-label-top">
        Step {currentStep + 1} of {steps.length}
      </div>
      <div className="lw-progress">
        {steps.map((label, i) => (
          <Fragment key={label}>
            <div className="lw-progress-step">
              <div className={`lw-progress-circle ${i < currentStep ? 'active' : i === currentStep ? 'active' : 'inactive'}`}>
                {i < currentStep && <CheckCircle size={14} color="var(--lw-success)" />}
              </div>
              <div className="lw-progress-step-label">{label}</div>
            </div>
            {i < steps.length - 1 && <div className="lw-progress-line" />}
          </Fragment>
        ))}
      </div>
    </>
  )
}
