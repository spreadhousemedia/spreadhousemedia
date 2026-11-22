import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CloudOff, Loader2, LogOut } from 'lucide-react'
import { ProgressIndicator } from './ProgressIndicator'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface OnboardingLayoutProps {
  qrNumber: string
  currentStep: number
  totalSteps: number
  stepLabel: string
  saveStatus: SaveStatus
  onBack?: () => void
  onLogout: () => void
  children: ReactNode
}

export function OnboardingLayout({
  qrNumber,
  currentStep,
  totalSteps,
  stepLabel,
  saveStatus,
  onBack,
  onLogout,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#141413] flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#E6E4DF] bg-[#F7F6F3]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center" title="SpreadNFC">
              <img src="/logo.png" alt="SpreadNFC" className="h-6 w-auto object-contain" />
            </Link>
            <span className="h-3.5 w-px bg-[#DCD9D2]" aria-hidden="true" />
            <span className="rounded-md bg-white border border-[#E6E4DF] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#42413D]">
              {qrNumber}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6F6E69]">
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

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#5C5B57] hover:bg-white hover:text-[#141413] transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 pb-3 sm:px-6">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabel={stepLabel}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] font-medium text-[#5C5B57] hover:text-[#141413] transition-colors"
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

