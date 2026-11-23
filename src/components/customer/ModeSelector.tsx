import { useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Lock,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
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
  const isBusinessGroup = selected === 'business' || selected === 'business_profile'

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-surface-border bg-white p-6 sm:p-9 shadow-xl relative z-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-electric/10 border border-electric/20 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-electric">
          <Sparkles className="h-3.5 w-3.5" />
          Step 2 · Choose Your QR Mode
        </span>

        <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Select Your QR Experience
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-lg mx-auto leading-relaxed">
          Choose how <span className="font-mono font-bold text-ink">{qrNumber}</span> behaves when scanned or tapped via NFC.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* A. Personal Profile */}
        <button
          type="button"
          onClick={() => setSelected('personal')}
          className={`group text-left rounded-2xl border-2 p-5 transition-all flex flex-col justify-between ${
            selected === 'personal'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
              : 'border-surface-border bg-white hover:border-zinc-300'
          }`}
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  selected === 'personal'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200'
                }`}
              >
                <User className="h-5 w-5" />
              </span>
              {selected === 'personal' && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <p className="mt-4 text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
              A · Personal Profile
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">Share All Your Links in One Place</h2>
            <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
              Build a personal digital identity with your curated avatar, social icons, custom links, and light/dark themes.
            </p>
            <ul className="mt-4 space-y-1.5 text-[11px] text-ink-secondary">
              <li>• Multiple social links (Instagram, YouTube, LinkedIn, etc.)</li>
              <li>• Custom links (Portfolio, Website, Booking)</li>
              <li>• Curated 3D avatar + Light &amp; Dark profile design</li>
            </ul>
          </div>

          <div className="mt-5 pt-3 border-t border-emerald-200/70 text-[11px] font-semibold text-emerald-800">
            QR opens your Personal Profile (/p/…)
          </div>
        </button>

        {/* B. Business (B1 Direct Link OR B2 Business Profile) */}
        <div
          className={`rounded-2xl border-2 p-5 transition-all space-y-3 ${
            isBusinessGroup
              ? 'border-electric bg-electric/[0.03] shadow-sm'
              : 'border-surface-border bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isBusinessGroup ? 'bg-electric text-white' : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-electric">
                B · Business
              </p>
              <h2 className="text-base font-bold text-ink leading-tight">
                Choose How to Use Your Business QR
              </h2>
            </div>
          </div>

          {/* B1: Direct Link */}
          <button
            type="button"
            onClick={() => setSelected('business')}
            className={`w-full text-left rounded-xl border-2 p-3.5 transition-all ${
              selected === 'business'
                ? 'border-sky-600 bg-sky-50/70'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    selected === 'business' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">B1. Direct Link (Instant Redirect)</p>
                  <p className="text-[11px] text-ink-muted">No profile page — opens 1 destination immediately</p>
                </div>
              </div>
              {selected === 'business' && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-secondary">
              Ideal for Google Reviews, digital menus, payment links, or your main website.
            </p>
          </button>

          {/* B2: Business Profile */}
          <button
            type="button"
            onClick={() => setSelected('business_profile')}
            className={`w-full text-left rounded-xl border-2 p-3.5 transition-all ${
              selected === 'business_profile'
                ? 'border-electric bg-electric/10'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    selected === 'business_profile'
                      ? 'bg-electric text-white'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-ink">B2. Business Profile (Multi-Link)</p>
                  <p className="text-[11px] text-ink-muted">Show all your business links &amp; details</p>
                </div>
              </div>
              {selected === 'business_profile' && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-electric text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-ink-secondary">
              Includes Business Name, Category, Location, Google Reviews &amp; Maps, WhatsApp, Instagram, and Website.
            </p>
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-900">
        <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <span>
          Your selected mode is locked after setup to protect your QR behavior. Only authorized support can switch modes later.
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onSelect(selected)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-electric px-6 py-3 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all disabled:opacity-60"
        >
          {submitting && <Spinner size={16} />}
          <span>
            {selected === 'personal'
              ? 'Continue with Personal Profile'
              : selected === 'business'
                ? 'Continue with Business Direct Link'
                : 'Continue with Business Profile'}
          </span>
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
