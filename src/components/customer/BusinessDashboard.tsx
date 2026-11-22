import { useState, type FormEvent } from 'react'
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Link2,
  Lock,
  Save,
  Star,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invalidateQrRedirectCache } from '../../lib/cache'
import { qrPublicUrl } from '../../lib/config'
import {
  BUSINESS_PURPOSES,
  isUrlReachable,
  isValidDestinationUrl,
  normalizeDestinationUrl,
} from '../../lib/validation'
import { rpcErrorMessage, type BusinessPurpose, type CustomerDashboardData } from '../../types'
import { Spinner } from '../Spinner'
import { CustomerAccountSettings } from './CustomerAccountSettings'

interface BusinessDashboardProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  onRefresh: () => Promise<void>
  onStartOnboarding?: () => void
  onLogout: () => void
}

export function BusinessDashboard({
  dashboard,
  sessionToken,
  onRefresh,
  onStartOnboarding,
  onLogout,
}: BusinessDashboardProps) {
  const qrNumber = dashboard.qr.qr_number

  const [businessName, setBusinessName] = useState(dashboard.qr.business_name || '')
  const [purpose, setPurpose] = useState<BusinessPurpose>(
    dashboard.qr.business_purpose || 'google_reviews',
  )
  const [destinationUrl, setDestinationUrl] = useState(dashboard.qr.destination_url || '')
  const [activeTab, setActiveTab] = useState<'setup' | 'account'>('setup')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedPurposeMeta =
    BUSINESS_PURPOSES.find((p) => p.id === purpose) ?? BUSINESS_PURPOSES[0]

  function handleTestLink() {
    setError(null)
    const normalized = normalizeDestinationUrl(destinationUrl)
    if (!isValidDestinationUrl(normalized)) {
      setError('Enter a valid http:// or https:// URL first before testing.')
      return
    }
    setDestinationUrl(normalized)
    window.open(normalized, '_blank', 'noopener,noreferrer')
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const normalized = normalizeDestinationUrl(destinationUrl)
    if (!isValidDestinationUrl(normalized)) {
      setError('Please enter a valid http:// or https:// destination URL.')
      return
    }
    setDestinationUrl(normalized)

    setSaving(true)
    const reachable = await isUrlReachable(normalized)
    if (!reachable) {
      setSaving(false)
      setError('Local or private URLs cannot be used as public QR destinations.')
      return
    }

    const { data, error: rpcError } = await supabase.rpc('customer_save_business_settings', {
      p_session_token: sessionToken,
      p_business_name: businessName.trim() || null,
      p_business_purpose: purpose,
      p_destination_url: normalized,
    })
    setSaving(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    invalidateQrRedirectCache(qrNumber)
    setSuccess('Business destination saved & active! All scans now redirect directly to this URL.')
    await onRefresh()
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 relative z-10">
      {/* Header */}
      <div className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric/10 text-electric border border-electric/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-base text-ink">{qrNumber}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-electric/10 text-electric border border-electric/20 px-2.5 py-0.5 text-[11px] font-semibold">
                <Lock className="h-3 w-3" /> Business Direct Redirect
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              QR Link: <span className="font-mono font-medium text-ink">{qrPublicUrl(qrNumber)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onStartOnboarding && (
            <button
              type="button"
              onClick={onStartOnboarding}
              className="rounded-xl border border-surface-border bg-zinc-50 px-3 py-2 text-xs font-semibold text-ink hover:bg-zinc-100 transition-colors"
            >
              Setup Wizard
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-surface-border px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-zinc-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-surface-border bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'setup' ? 'bg-electric text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Business QR Setup
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'account' ? 'bg-electric text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          QR Code &amp; Security
        </button>
      </div>

      {activeTab === 'account' ? (
        <CustomerAccountSettings qrNumber={qrNumber} sessionToken={sessionToken} />
      ) : (
        <form onSubmit={handleSave} className="rounded-2xl border border-surface-border bg-white p-5 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Business QR Setup</h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">
              Scans redirect straight to your chosen destination with zero intermediate pages. Only one active destination URL is active at a time.
            </p>
          </div>

          {/* Business Purpose Selection */}
          <div>
            <label className="mb-2 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
              Select Business Purpose
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {BUSINESS_PURPOSES.map((item) => {
                const active = purpose === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPurpose(item.id)
                      setSuccess(null)
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-electric bg-electric/5 ring-1 ring-electric/30'
                        : 'border-surface-border bg-white hover:border-zinc-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      {item.id === 'google_reviews' && (
                        <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-ink-muted leading-snug">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Business Name */}
          <div>
            <label htmlFor="businessName" className="mb-1.5 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
              Business Name (Optional)
            </label>
            <input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Spread Cafe & Bakery"
              className="w-full rounded-xl border border-surface-border px-3.5 py-2.5 text-sm text-ink focus:border-electric focus:outline-none"
            />
          </div>

          {/* Single Destination URL */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="businessUrl" className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                <Link2 className="h-3.5 w-3.5 text-electric" />
                <span>
                  {purpose === 'google_reviews' ? 'Google Review URL *' : 'Destination URL *'}
                </span>
              </label>

              <button
                type="button"
                onClick={handleTestLink}
                className="inline-flex items-center gap-1 text-xs font-semibold text-electric hover:text-electric-hover"
              >
                <span>Test / Open Link</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              id="businessUrl"
              value={destinationUrl}
              onChange={(e) => {
                setDestinationUrl(e.target.value)
                setSuccess(null)
              }}
              inputMode="url"
              placeholder={selectedPurposeMeta.placeholder}
              className="w-full rounded-xl border border-surface-border px-3.5 py-3 text-sm font-mono text-ink focus:border-electric focus:outline-none"
            />

            {purpose === 'google_reviews' && (
              <p className="mt-1.5 text-[11px] text-ink-muted">
                Paste your official Google Business Profile review link (e.g. from Google Maps → Share → Ask for reviews). Visitors will be redirected straight to Google.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <span className="text-[11px] text-ink-muted">
              QR scans: <strong className="text-ink">{dashboard.qr.scan_count ?? 0}</strong>
            </span>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-electric px-5 py-3 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all disabled:opacity-60"
            >
              {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
              <span>{saving ? 'Saving...' : 'Save & Activate Redirection'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

