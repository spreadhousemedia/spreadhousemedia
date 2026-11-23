interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabel: string
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  stepLabel,
}: ProgressIndicatorProps) {
  const pct = Math.max(8, Math.min(100, Math.round((currentStep / totalSteps) * 100)))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-ink">{stepLabel}</span>
        <span className="font-mono text-ink-muted">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E6F0]"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7040F0] to-[#A577FF] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

