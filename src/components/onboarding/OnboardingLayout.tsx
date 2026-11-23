import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Check, CloudOff, Loader2, LogOut } from 'lucide-react'
import { ProgressIndicator } from './ProgressIndicator'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface OnboardingLayoutProps {
  qrNumber: string
  modeLabel?: string
  currentStep: number
  totalSteps: number
  stepLabel: string
  saveStatus: SaveStatus
  wide?: boolean
  onBack?: () => void
  onSwitchMode?: () => void
  onLogout: () => void
  children: ReactNode
}

export function OnboardingLayout({
  qrNumber,
  modeLabel,
  currentStep,
  totalSteps,
  stepLabel,
  saveStatus,
  wide = false,
  onBack,
  onSwitchMode,
  onLogout,
  children,
}: OnboardingLayoutProps) {
  const containerWidth = wide ? 'max-w-5xl' : 'max-w-2xl'

  return (
    <div className="min-h-screen bg-atmospheric-light text-ink flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-surface-border bg-white/85 backdrop-blur-md">
        <div className={`mx-auto flex ${containerWidth} items-center justify-between px-4 py-3 sm:px-6`}>
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center" title="SpreadNFC">
              <img src="/logo.png" alt="SpreadNFC" className="h-6 w-auto object-contain" />
            </Link>
            <span className="h-3.5 w-px bg-surface-border" aria-hidden="true" />
            <span className="rounded-md bg-lavender-subtle border border-lavender-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-cetacean">
              {qrNumber}
            </span>
            {modeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F7F7F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#171717]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>{modeLabel}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <CloudOff className="h-3 w-3" />
                <span>Retry save</span>
              </span>
            )}

            {onSwitchMode && (
              <button
                type="button"
                onClick={onSwitchMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-[#171717]/40 hover:bg-ghost transition-colors"
                title="Switch between Personal Profile, Business Profile, or Direct Link"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Switch Mode</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-ink-secondary hover:bg-ghost hover:text-ink transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className={`mx-auto ${containerWidth} px-4 pb-3 sm:px-6`}>
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabel={stepLabel}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className={`mx-auto w-full ${containerWidth} flex-1 px-4 py-6 sm:px-6 sm:py-8`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] font-medium text-ink-secondary hover:text-ink transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        {children}
      </main>
    </div>
  )
}

