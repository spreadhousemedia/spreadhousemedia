import { useState, type FormEvent } from 'react'
import {
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  Link2,
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
import {
  rpcErrorMessage,
  type BusinessPurpose,
  type CustomerDashboardData,
  type UsageType,
} from '../../types'
import { Spinner } from '../Spinner'
import { CustomerAccountSettings } from './CustomerAccountSettings'

interface BusinessDashboardProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  multiQrCount?: number
  onOpenMultiQr?: () => void
  onRefresh: () => Promise<void>
  onSwitchMode?: () => void
  onModeSwitched?: (nextMode?: UsageType | 'reset') => Promise<void>
  onStartOnboarding?: () => void
  onLogout: () => void
}

export function BusinessDashboard({
  dashboard,
  sessionToken,
  multiQrCount = 1,
  onOpenMultiQr,
  onRefresh,
  onSwitchMode,
  onModeSwitched,
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
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-white">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-base text-ink">{qrNumber}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Direct Link Profile</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              QR Link: <span className="font-mono font-medium text-ink">{qrPublicUrl(qrNumber)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onSwitchMode && (
            <button
              type="button"
              onClick={onSwitchMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-ink hover:border-[#171717]/40 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Switch Mode</span>
            </button>
          )}
          {onOpenMultiQr && (
            <button
              type="button"
              onClick={onOpenMultiQr}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-3 py-2 text-xs font-bold text-ink hover:border-[#171717]/40 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Multi-QR{multiQrCount > 1 ? ` (${multiQrCount})` : ''}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-zinc-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'setup' ? 'bg-[#171717] text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Direct Link
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'account' ? 'bg-[#171717] text-white' : 'text-ink-muted hover:text-ink'
          }`}
        >
          QR Code &amp; Mode
        </button>
      </div>

      {activeTab === 'account' ? (
        <CustomerAccountSettings
          qrNumber={qrNumber}
          sessionToken={sessionToken}
          currentUsageType={dashboard.qr.usage_type}
          onModeSwitched={onModeSwitched ?? onRefresh}
          onReauth={onLogout}
        />
      ) : (
        <form onSubmit={handleSave} className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Direct Link Profile</h2>
            <p className="mt-1 text-xs sm:text-sm text-ink-muted">
              Paste any URL below and click Save. Scanning <span className="font-mono font-semibold text-ink">{qrNumber}</span> opens that link immediately with zero extra screens.
            </p>
          </div>

          {/* Primary Input: Paste Link & Save */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="businessUrl" className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Link2 className="h-3.5 w-3.5 text-[#171717]" />
                <span>Paste Your Destination Link *</span>
              </label>

              {destinationUrl.trim() && (
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#171717] hover:underline"
                >
                  <span>Test Link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
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
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5 text-sm font-mono text-ink focus:border-[#171717] focus:outline-none"
            />

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
                Total scans: <strong className="text-ink">{dashboard.qr.scan_count ?? 0}</strong>
              </span>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:bg-[#262626] shadow-sm transition-all disabled:opacity-60"
              >
                {saving ? <Spinner size={16} /> : <Save className="h-4 w-4" />}
                <span>{saving ? 'Saving…' : 'Save & Activate Link'}</span>
              </button>
            </div>
          </div>

          {/* Optional Label & Quick Type Presets */}
          <div className="pt-5 border-t border-[#E5E7EB] space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-ink-muted mr-1">Link type (optional):</span>
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
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? 'border-[#171717] bg-[#171717] text-white'
                        : 'border-[#E5E7EB] bg-[#F7F7F5] text-ink-secondary hover:border-[#171717]/40'
                    }`}
                  >
                    {item.id === 'google_reviews' && <Star className="h-3 w-3 text-amber-400" />}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            <div>
              <label htmlFor="businessName" className="mb-1 block text-xs font-semibold text-ink">
                Label / Business Name (Optional)
              </label>
              <input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={120}
                placeholder="e.g. Spread Cafe Google Reviews"
                className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-sm text-ink focus:border-[#171717] focus:outline-none"
              />
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

