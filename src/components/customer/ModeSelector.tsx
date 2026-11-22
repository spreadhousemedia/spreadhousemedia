import { useState } from 'react'
import { Building2, Check, Lock, Sparkles, User, ArrowRight } from 'lucide-react'
import type { UsageType } from '../../types'
import { Spinner } from '../Spinner'

interface ModeSelectorProps {
  qrNumber: string
  submitting: boolean
  error: string | null
  onSelect: (mode: UsageType) => Promise<void>
}

export function ModeSelector({ qrNumber, submitting, error, onSelect }: ModeSelectorProps) {
  const [selected, setSelected] = useState<UsageType>('personal')

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-surface-border bg-white p-6 sm:p-9 shadow-xl relative z-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-electric/10 border border-electric/20 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-electric">
          <Sparkles className="h-3.5 w-3.5" />
          Step 3 · Choose Experience
        </span>

        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Select Your QR Experience
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-lg mx-auto leading-relaxed">
          Choose how <span className="font-mono font-bold text-ink">{qrNumber}</span> should behave whenever someone scans it or taps your NFC card.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option 1: Personal Use */}
        <button
          type="button"
          onClick={() => setSelected('personal')}
          className={`group text-left rounded-2xl border-2 p-5 transition-all ${
            selected === 'personal'
              ? 'border-electric bg-electric/5 shadow-sm'
              : 'border-surface-border bg-white hover:border-zinc-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                selected === 'personal'
                  ? 'bg-electric text-white'
                  : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
              }`}
            >
              <User className="h-5 w-5" />
            </span>
            {selected === 'personal' && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-electric text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <p className="mt-4 text-xs font-mono font-bold uppercase tracking-wider text-electric">
            Option 1
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink">Personal Use</h2>
          <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
            Create your own digital profile and share all your social media accounts through one QR code.
          </p>
          <ul className="mt-3.5 space-y-1 text-[11px] text-ink-secondary">
            <li>• Curated 3D avatar, tagline &amp; custom username</li>
            <li>• Unlimited social &amp; custom links</li>
            <li>• Light &amp; dark profile themes</li>
          </ul>
        </button>

        {/* Option 2: Business Use */}
        <button
          type="button"
          onClick={() => setSelected('business')}
          className={`group text-left rounded-2xl border-2 p-5 transition-all ${
            selected === 'business'
              ? 'border-electric bg-electric/5 shadow-sm'
              : 'border-surface-border bg-white hover:border-zinc-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                selected === 'business'
                  ? 'bg-electric text-white'
                  : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
              }`}
            >
              <Building2 className="h-5 w-5" />
            </span>
            {selected === 'business' && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-electric text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <p className="mt-4 text-xs font-mono font-bold uppercase tracking-wider text-electric">
            Option 2
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink">Commercial / Business Use</h2>
          <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
            Use your QR code to redirect visitors directly to a Google Review page, business website, payment link, or catalog.
          </p>
          <ul className="mt-3.5 space-y-1 text-[11px] text-ink-secondary">
            <li>• Instant direct redirection (no profile page)</li>
            <li>• Ideal for Google Reviews, menus &amp; payments</li>
            <li>• Update destination URL anytime</li>
          </ul>
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-900">
        <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <span>
          Your selected experience is locked after setup to protect your QR behavior. Only authorized support can switch modes later.
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => onSelect(selected)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-5 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all disabled:opacity-60"
      >
        {submitting && <Spinner size={16} />}
        <span>
          {submitting
            ? 'Saving Selection...'
            : selected === 'personal'
              ? 'Continue to Personal Profile Setup'
              : 'Continue to Commercial Setup'}
        </span>
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </div>
  )
}

