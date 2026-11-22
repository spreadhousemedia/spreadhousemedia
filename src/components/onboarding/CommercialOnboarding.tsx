import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  Link2,
  Pencil,
  ShoppingBag,
  Star,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invalidateQrRedirectCache } from '../../lib/cache'
import { qrPublicUrl } from '../../lib/config'
import { downloadSingleQr, generateQrDataUrl } from '../../lib/qr'
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
} from '../../types'
import { Spinner } from '../Spinner'
import { OnboardingLayout, type SaveStatus } from './OnboardingLayout'

interface CommercialOnboardingProps {
  dashboard: CustomerDashboardData
  sessionToken: string
  onRefresh: () => Promise<void>
  onCompleteToEditor: () => void
  onLogout: () => void
}

const STEP_LABELS: Record<number, string> = {
  1: 'Choose purpose',
  2: 'Add business link',
  3: 'Activated',
}

function PurposeIcon({ purpose }: { purpose: BusinessPurpose }) {
  switch (purpose) {
    case 'google_reviews':
      return <Star className="h-5 w-5 text-amber-500" />
    case 'website':
      return <Globe className="h-5 w-5 text-blue-600" />
    case 'payment':
      return <CreditCard className="h-5 w-5 text-emerald-600" />
    case 'feedback':
      return <FileSpreadsheet className="h-5 w-5 text-violet-600" />
    case 'product':
      return <ShoppingBag className="h-5 w-5 text-rose-600" />
    default:
      return <Link2 className="h-5 w-5 text-[#42413D]" />
  }
}

export function CommercialOnboarding({
  dashboard,
  sessionToken,
  onRefresh,
  onCompleteToEditor,
  onLogout,
}: CommercialOnboardingProps) {
  const qrNumber = dashboard.qr.qr_number

  const [step, setStep] = useState<number>(1)
  const [purpose, setPurpose] = useState<BusinessPurpose>(
    dashboard.qr.business_purpose || 'google_reviews',
  )
  const [businessName, setBusinessName] = useState(dashboard.qr.business_name || '')
  const [destinationUrl, setDestinationUrl] = useState(dashboard.qr.destination_url || '')

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copiedQr, setCopiedQr] = useState(false)

  const selectedPurposeMeta =
    BUSINESS_PURPOSES.find((p) => p.id === purpose) ?? BUSINESS_PURPOSES[0]
  const permanentQrUrl = qrPublicUrl(qrNumber)

  useEffect(() => {
    if (step !== 3) return
    let cancelled = false
    generateQrDataUrl(qrNumber).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [step, qrNumber])

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

  async function handleActivateCommercial() {
    setError(null)
    const normalized = normalizeDestinationUrl(destinationUrl)
    if (!isValidDestinationUrl(normalized)) {
      setError('Please enter a valid http:// or https:// destination URL.')
      return
    }
    setDestinationUrl(normalized)

    setSaving(true)
    setSaveStatus('saving')
    const reachable = await isUrlReachable(normalized)
    if (!reachable) {
      setSaving(false)
      setSaveStatus('error')
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
      setSaveStatus('error')
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    setSaveStatus('saved')
    invalidateQrRedirectCache(qrNumber)
    setStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    await onRefresh()
  }

  async function handleCopyQr() {
    await navigator.clipboard.writeText(permanentQrUrl)
    setCopiedQr(true)
    setTimeout(() => setCopiedQr(false), 1500)
  }

  return (
    <OnboardingLayout
      qrNumber={qrNumber}
      currentStep={step}
      totalSteps={3}
      stepLabel={STEP_LABELS[step] ?? 'Commercial Setup'}
      saveStatus={saveStatus}
      onBack={step === 2 ? () => setStep(1) : undefined}
      onLogout={onLogout}
    >
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
              What will this QR do?
            </h1>
            <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
              Commercial QR codes redirect customers straight to your chosen business link with zero intermediate screens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUSINESS_PURPOSES.map((item) => {
              const selected = purpose === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPurpose(item.id)}
                  aria-pressed={selected}
                  className={`relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-[#141413] bg-white ring-1 ring-[#141413] shadow-[0_2px_10px_rgba(20,20,19,0.06)]'
                      : 'border-[#E6E4DF] bg-white/80 hover:border-[#CBC8C0] hover:bg-white'
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F6F3] border border-[#E6E4DF]">
                    <PurposeIcon purpose={item.id} />
                  </span>
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="text-[14px] font-semibold text-[#141413]">{item.label}</p>
                    <p className="mt-1 text-[12px] text-[#5C5B57] leading-snug">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={`absolute top-3.5 right-3.5 flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected
                        ? 'border-[#141413] bg-[#141413] text-white'
                        : 'border-[#D5D2CA] text-transparent'
                    }`}
                    aria-hidden="true"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setStep(2)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="inline-flex h-12 w-full sm:w-auto sm:min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28]"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
              Connect your {selectedPurposeMeta.label}
            </h1>
            <p className="mt-2 text-[15px] text-[#5C5B57] leading-relaxed">
              Anyone who scans <span className="font-mono font-semibold text-[#141413]">{qrNumber}</span> will go directly to this destination.
            </p>
          </div>

          <div className="space-y-5 rounded-2xl border border-[#E6E4DF] bg-white p-5 sm:p-6">
            <div>
              <label htmlFor="comm-biz-name" className="mb-1.5 flex items-center justify-between text-[13px] font-semibold text-[#141413]">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-[#5C5B57]" />
                  <span>Business Name</span>
                </span>
                <span className="text-[12px] font-normal text-[#6F6E69]">Optional</span>
              </label>
              <input
                id="comm-biz-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={120}
                placeholder="e.g. Spread Cafe & Bakery"
                className="w-full rounded-xl border border-[#E6E4DF] bg-white px-4 py-3 text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="comm-dest-url" className="text-[13px] font-semibold text-[#141413]">
                  {purpose === 'google_reviews' ? 'Google Review URL *' : 'Destination URL *'}
                </label>
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#141413] hover:underline"
                >
                  <span>Test link</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                id="comm-dest-url"
                value={destinationUrl}
                onChange={(e) => {
                  setDestinationUrl(e.target.value)
                  setError(null)
                }}
                inputMode="url"
                placeholder={selectedPurposeMeta.placeholder}
                className="w-full rounded-xl border border-[#E6E4DF] bg-white px-4 py-3.5 font-mono text-[14px] text-[#141413] placeholder:text-[#9E9C96] focus:border-[#141413] focus:outline-none"
              />
              {purpose === 'google_reviews' && (
                <p className="mt-2 text-[12px] text-[#5C5B57] leading-relaxed">
                  Paste your official Google Business review link (from Google Business Profile → Ask for reviews). Customers will open the Google rating screen directly.
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] font-medium text-rose-700">
                {error}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-[#E6E4DF] bg-[#F7F6F3]/95 px-4 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleActivateCommercial}
                className="inline-flex h-12 w-full sm:w-auto sm:min-w-[210px] items-center justify-center gap-2 rounded-xl bg-[#141413] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#2A2A28] disabled:opacity-60"
              >
                {saving && <Spinner size={16} />}
                <span>{saving ? 'Activating…' : 'Save & Activate QR'}</span>
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-3 pt-2">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.025em] leading-[1.15] text-[#141413]">
              Your commercial QR is active.
            </h1>
            <p className="mx-auto max-w-md text-[15px] text-[#5C5B57] leading-relaxed">
              Every scan of <span className="font-mono font-semibold text-[#141413]">{qrNumber}</span> now redirects straight to your {selectedPurposeMeta.label.toLowerCase()}.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E6E4DF] bg-white p-6 space-y-5 shadow-[0_2px_12px_rgba(20,20,19,0.04)]">
            <div className="rounded-2xl border border-[#E6E4DF] bg-[#FAF9F7] p-4 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#6F6E69]">
                Active Redirect Destination
              </p>
              <p className="break-all font-mono text-[13px] font-semibold text-[#141413]">
                {destinationUrl}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyQr}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413]"
                >
                  {copiedQr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedQr ? 'Copied QR link' : 'Copy permanent QR link'}</span>
                </button>
                <a
                  href={permanentQrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2A2A28]"
                >
                  <span>Test live redirect</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 border-t border-[#E6E4DF] pt-5">
              <div className="h-32 w-32 shrink-0 rounded-2xl border border-[#E6E4DF] bg-white p-2 flex items-center justify-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR ${qrNumber}`} className="h-full w-full object-contain" />
                ) : (
                  <Spinner size={22} className="text-[#5C5B57]" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <p className="font-mono text-[15px] font-bold text-[#141413]">{qrNumber}</p>
                <p className="text-[12px] text-[#5C5B57]">
                  You can update this destination link anytime without reprinting your card or standee.
                </p>
                <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => downloadSingleQr(qrNumber, 'png')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSingleQr(qrNumber, 'svg')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6E4DF] bg-[#FAF9F7] px-3 py-2 text-[12px] font-semibold text-[#141413] hover:border-[#141413]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>SVG</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onCompleteToEditor}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E6E4DF] bg-white px-5 py-3 text-[14px] font-semibold text-[#141413] hover:border-[#141413]"
            >
              <Pencil className="h-4 w-4" />
              <span>Open Commercial Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </OnboardingLayout>
  )
}

