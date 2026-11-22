import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invalidateQrRedirectCache } from '../../lib/cache'
import { isValidPassword, normalizeQrNumber } from '../../lib/validation'
import { rpcErrorMessage, type CustomerDashboardData, type UsageType } from '../../types'
import { Spinner } from '../../components/Spinner'
import { ModeSelector } from '../../components/customer/ModeSelector'

const PersonalOnboarding = lazy(() =>
  import('../../components/onboarding/PersonalOnboarding').then((m) => ({
    default: m.PersonalOnboarding,
  })),
)
const CommercialOnboarding = lazy(() =>
  import('../../components/onboarding/CommercialOnboarding').then((m) => ({
    default: m.CommercialOnboarding,
  })),
)
const PersonalDashboard = lazy(() =>
  import('../../components/customer/PersonalDashboard').then((m) => ({
    default: m.PersonalDashboard,
  })),
)
const BusinessDashboard = lazy(() =>
  import('../../components/customer/BusinessDashboard').then((m) => ({
    default: m.BusinessDashboard,
  })),
)

type PageMode =
  | 'lookup'
  | 'verify_setup'
  | 'activate'
  | 'login'
  | 'select_mode'
  | 'dashboard'

const SESSION_PREFIX = 'spreadnfc_customer_session_'

function getStoredSession(qr: string): string | null {
  try {
    return sessionStorage.getItem(`${SESSION_PREFIX}${qr}`)
  } catch {
    return null
  }
}

function setStoredSession(qr: string, token: string): void {
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${qr}`, token)
  } catch {
    // ignore storage errors
  }
}

function clearStoredSession(qr: string): void {
  try {
    sessionStorage.removeItem(`${SESSION_PREFIX}${qr}`)
  } catch {
    // ignore storage errors
  }
}

export function UpdatePage() {
  const [searchParams] = useSearchParams()
  const scannedQrNumber = searchParams.get('qr')
  const qrNumberLocked = Boolean(scannedQrNumber)

  const [mode, setMode] = useState<PageMode>('lookup')
  const [qrNumber, setQrNumber] = useState(scannedQrNumber ?? '')

  // Setup / Activation fields
  const [requiresSetupCode, setRequiresSetupCode] = useState(true)
  const [setupCode, setSetupCode] = useState('')
  const [isSetupVerified, setIsSetupVerified] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  // Existing owner login
  const [currentPassword, setCurrentPassword] = useState('')
  const [detectedUsageType, setDetectedUsageType] = useState<UsageType | null>(null)

  // Authenticated Customer Dashboard state
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null)
  const [forceWizard, setForceWizard] = useState(false)
  const [wizardDoneToEditor, setWizardDoneToEditor] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showQrHelp, setShowQrHelp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadCustomerDashboard = useCallback(async (token: string, normQr: string) => {
    const { data, error: rpcError } = await supabase.rpc('customer_get_dashboard', {
      p_session_token: token,
    })

    if (rpcError || !data?.ok) {
      clearStoredSession(normQr)
      setSessionToken(null)
      setDashboard(null)
      return false
    }

    const dash = {
      qr: data.qr,
      profile: data.profile ?? null,
      links: data.links ?? [],
    } as CustomerDashboardData

    setDashboard(dash)
    if (!dash.qr.usage_type) {
      setMode('select_mode')
    } else {
      setMode('dashboard')
    }
    return true
  }, [])

  const checkQrStatus = useCallback(
    async (serial: string) => {
      const norm = normalizeQrNumber(serial)
      if (!norm) return
      setError(null)
      setChecking(true)

      // Resume active customer session if still valid
      const existingToken = getStoredSession(norm)
      if (existingToken) {
        const resumed = await loadCustomerDashboard(existingToken, norm)
        if (resumed) {
          setSessionToken(existingToken)
          setChecking(false)
          return
        }
      }

      const { data, error: rpcError } = await supabase.rpc('request_qr_update', {
        p_qr_number: norm,
      })
      setChecking(false)

      if (rpcError || !data?.ok) {
        setError(rpcErrorMessage(data?.error ?? rpcError?.message))
        setMode('lookup')
        return
      }

      const isClaimed = Boolean(data.is_claimed)
      const reqSetup = data.requires_setup_code !== false
      setRequiresSetupCode(reqSetup)
      setDetectedUsageType((data.usage_type as UsageType | null) ?? null)

      if (isClaimed) {
        setMode('login')
      } else if (reqSetup) {
        setMode('verify_setup')
      } else {
        setMode('activate')
      }
    },
    [loadCustomerDashboard],
  )

  useEffect(() => {
    if (scannedQrNumber) {
      checkQrStatus(scannedQrNumber)
    }
  }, [scannedQrNumber, checkQrStatus])

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault()
    if (!qrNumber.trim()) {
      setError('Please enter your QR code number.')
      return
    }
    checkQrStatus(qrNumber)
  }

  async function handleVerifySetupSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!setupCode.trim()) {
      setError('Please enter the Packaging Setup Code found on your delivery slip or card box.')
      return
    }

    setSubmitting(true)
    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('verify_setup_code', {
      p_qr_number: norm,
      p_setup_code: setupCode.trim(),
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    setIsSetupVerified(true)
    setMode('activate')
  }

  async function handleActivateSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (requiresSetupCode && !setupCode.trim()) {
      setError('Packaging Setup Code is required.')
      setMode('verify_setup')
      return
    }

    if (!isValidPassword(newPassword)) {
      setError('New password must be at least 4 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setSubmitting(true)
    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('customer_claim_qr', {
      p_qr_number: norm,
      p_setup_code: requiresSetupCode ? setupCode.trim() : null,
      p_new_password: newPassword,
      p_destination_url: null,
      p_owner_email: ownerEmail.trim() || null,
      p_usage_type: null,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok || !data?.session_token) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    const token = data.session_token as string
    setSessionToken(token)
    setStoredSession(norm, token)
    invalidateQrRedirectCache(norm)

    await loadCustomerDashboard(token, norm)
  }

  async function handleOwnerLoginSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!currentPassword) {
      setError('Please enter your personal password.')
      return
    }

    setSubmitting(true)
    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('customer_login_qr', {
      p_qr_number: norm,
      p_password: currentPassword,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok || !data?.session_token) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    const token = data.session_token as string
    setSessionToken(token)
    setStoredSession(norm, token)
    setCurrentPassword('')
    await loadCustomerDashboard(token, norm)
  }

  async function handleModeSelect(chosen: UsageType) {
    if (!sessionToken) return
    setError(null)
    setSubmitting(true)

    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('customer_select_usage_mode', {
      p_session_token: sessionToken,
      p_usage_type: chosen,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    invalidateQrRedirectCache(norm)
    await loadCustomerDashboard(sessionToken, norm)
  }

  function handleCustomerLogout() {
    const norm = normalizeQrNumber(qrNumber)
    clearStoredSession(norm)
    setSessionToken(null)
    setDashboard(null)
    setForceWizard(false)
    setWizardDoneToEditor(false)
    setCurrentPassword('')
    setError(null)
    setMode(qrNumberLocked ? 'login' : 'lookup')
  }

  const isWideMode = mode === 'dashboard' || mode === 'select_mode'

  const isFirstTimePersonalSetup =
    mode === 'dashboard' &&
    dashboard?.qr.usage_type === 'personal' &&
    !wizardDoneToEditor &&
    (forceWizard || (!dashboard.profile?.is_published && !dashboard.profile?.profile_name?.trim()))

  const isFirstTimeCommercialSetup =
    mode === 'dashboard' &&
    dashboard?.qr.usage_type === 'business' &&
    !wizardDoneToEditor &&
    (forceWizard || !dashboard.qr.destination_url?.trim())

  if (isFirstTimePersonalSetup && dashboard && sessionToken) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3]">
            <Spinner size={26} className="text-[#141413]" />
          </div>
        }
      >
        <PersonalOnboarding
          dashboard={dashboard}
          sessionToken={sessionToken}
          onRefresh={async () => {
            await loadCustomerDashboard(sessionToken, dashboard.qr.qr_number)
          }}
          onCompleteToEditor={() => {
            setForceWizard(false)
            setWizardDoneToEditor(true)
          }}
          onLogout={handleCustomerLogout}
        />
      </Suspense>
    )
  }

  if (isFirstTimeCommercialSetup && dashboard && sessionToken) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3]">
            <Spinner size={26} className="text-[#141413]" />
          </div>
        }
      >
        <CommercialOnboarding
          dashboard={dashboard}
          sessionToken={sessionToken}
          onRefresh={async () => {
            await loadCustomerDashboard(sessionToken, dashboard.qr.qr_number)
          }}
          onCompleteToEditor={() => {
            setForceWizard(false)
            setWizardDoneToEditor(true)
          }}
          onLogout={handleCustomerLogout}
        />
      </Suspense>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F6F3] text-ink px-4 py-10 relative overflow-hidden">
      {/* Ambient gradient glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center relative z-10">
        <Link to="/" className="inline-block transition-transform duration-200 hover:scale-105" title="Spread NFC Home">
          <img src="/logo.png" alt="Spread NFC" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      {/* PHASE 2: MODE SELECTION */}
      {mode === 'select_mode' && (
        <ModeSelector
          qrNumber={normalizeQrNumber(qrNumber)}
          submitting={submitting}
          error={error}
          onSelect={handleModeSelect}
        />
      )}

      {/* PHASE 3–5: PERSONAL OR BUSINESS DASHBOARD */}
      {mode === 'dashboard' && dashboard && sessionToken && (
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <Spinner size={26} className="text-[#141413]" />
            </div>
          }
        >
          {dashboard.qr.usage_type === 'personal' ? (
            <PersonalDashboard
              dashboard={dashboard}
              sessionToken={sessionToken}
              onRefresh={async () => {
                await loadCustomerDashboard(sessionToken, dashboard.qr.qr_number)
              }}
              onStartOnboarding={() => {
                setWizardDoneToEditor(false)
                setForceWizard(true)
              }}
              onLogout={handleCustomerLogout}
            />
          ) : (
            <BusinessDashboard
              dashboard={dashboard}
              sessionToken={sessionToken}
              onRefresh={async () => {
                await loadCustomerDashboard(sessionToken, dashboard.qr.qr_number)
              }}
              onStartOnboarding={() => {
                setWizardDoneToEditor(false)
                setForceWizard(true)
              }}
              onLogout={handleCustomerLogout}
            />
          )}
        </Suspense>
      )}

      {/* LOOKUP / SETUP CODE / FIRST-TIME PASSWORD / OWNER LOGIN */}
      {!isWideMode && (
        <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-7 sm:p-9 shadow-xl relative z-10">
          {mode === 'lookup' && (
            <form onSubmit={handleLookupSubmit} noValidate>
              <HeaderBadge icon={QrCode} color="electric">
                DEVICE ACTIVATION &amp; DASHBOARD
              </HeaderBadge>

              <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
                Manage Your{' '}
                <span className="font-editorial italic font-normal text-electric">
                  Smart Card &amp; Standee
                </span>
              </h1>
              <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
                Enter your QR code number to activate your new device or open your Personal / Business dashboard.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="qrNumber" className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                      QR Code Number (NFC / QR)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQrHelp((s) => !s)}
                      className="text-xs font-semibold text-electric hover:text-electric-hover flex items-center gap-1 transition-colors"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Where to find this?</span>
                    </button>
                  </div>
                  <input
                    id="qrNumber"
                    value={qrNumber}
                    onChange={(e) => setQrNumber(normalizeQrNumber(e.target.value))}
                    placeholder="e.g. TF-1001 or Z100"
                    autoFocus
                    className="w-full rounded-xl border border-surface-border px-3.5 py-3 text-sm font-mono text-ink bg-white placeholder:text-zinc-400 focus:border-electric focus:outline-none transition-colors"
                    autoCapitalize="characters"
                  />

                  {showQrHelp && (
                    <div className="mt-2.5 rounded-xl border border-electric/20 bg-electric/5 p-4 text-xs text-ink space-y-2">
                      <p className="font-bold flex items-center gap-1.5 text-electric">
                        <span>Where to find your QR Code Number:</span>
                      </p>
                      <ul className="space-y-1.5 text-ink-muted list-disc list-inside">
                        <li>
                          <strong className="text-ink">Method 1:</strong> Scan your QR or check the printed label below the QR code.
                        </li>
                        <li>
                          <strong className="text-ink">Method 2:</strong> Need help? Reach out via our <Link to="/support" className="text-electric underline">Support Desk</Link>.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={checking}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all duration-200 disabled:opacity-60"
                >
                  {checking && <Spinner size={16} />}
                  {checking ? 'Verifying Device...' : 'Continue'}
                  {!checking && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {mode === 'verify_setup' && (
            <form onSubmit={handleVerifySetupSubmit} noValidate>
              <HeaderBadge icon={Shield} color="amber">
                SECURITY VERIFICATION • STEP 1 OF 3
              </HeaderBadge>

              <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
                Verify Packaging{' '}
                <span className="font-editorial italic font-normal text-amber-600">
                  Setup Code
                </span>
              </h1>
              <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
                Enter the temporary setup code printed on your delivery slip or card packaging.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between">
                <span className="font-medium text-amber-800">QR Code Number:</span>
                <span className="font-mono font-bold tracking-wide">{normalizeQrNumber(qrNumber)}</span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="setupCodeInput" className="mb-1.5 flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                      Packaging Setup Code
                    </span>
                    <span className="text-[10px] text-amber-700 font-sans font-medium">Inside box / slip</span>
                  </label>
                  <input
                    id="setupCodeInput"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value)}
                    placeholder="e.g. TF-A1B2 or 123456"
                    autoFocus
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-amber-700 shadow-md transition-all duration-200 disabled:opacity-60"
                >
                  {submitting && <Spinner size={16} />}
                  {submitting ? 'Verifying Code...' : 'Verify Setup Code'}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>

                {!qrNumberLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('lookup')
                      setError(null)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors pt-1"
                  >
                    ← Change QR Code Number
                  </button>
                )}
              </div>
            </form>
          )}

          {mode === 'activate' && (
            <form onSubmit={handleActivateSubmit} noValidate>
              <HeaderBadge icon={Sparkles} color="emerald">
                {requiresSetupCode ? 'CREATE PASSWORD • STEP 2 OF 3' : 'CREATE YOUR PASSWORD'}
              </HeaderBadge>

              <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
                Secure Your{' '}
                <span className="font-editorial italic font-normal text-emerald-600">
                  Smart Card
                </span>
              </h1>
              <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
                Create your personal password first. Next, you&apos;ll choose Personal Profile or Business Direct Redirection.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 flex items-center justify-between">
                <span className="font-medium">QR Code Number:</span>
                <span className="font-mono font-bold tracking-wide">{normalizeQrNumber(qrNumber)}</span>
              </div>

              {isSetupVerified && (
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-100/70 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>Packaging setup code verified successfully.</span>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="newPassword" className="mb-1.5 flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    Create Your Personal Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      autoFocus
                      className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 pr-10 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-muted hover:text-ink transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1.5 flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="ownerEmail" className="mb-1.5 flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-emerald-600" />
                      Recovery Email
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">Optional</span>
                  </label>
                  <input
                    id="ownerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 shadow-md transition-all duration-200 disabled:opacity-60"
                >
                  {submitting && <Spinner size={16} />}
                  <span>{submitting ? 'Claiming Device...' : 'Claim Card & Continue'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleOwnerLoginSubmit} noValidate>
              <HeaderBadge icon={Lock} color="electric">
                CUSTOMER DASHBOARD LOGIN
              </HeaderBadge>

              <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
                Sign In to{' '}
                <span className="font-editorial italic font-normal text-electric">
                  Your QR Dashboard
                </span>
              </h1>
              <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
                Enter your personal password to manage your{' '}
                {detectedUsageType === 'personal'
                  ? 'digital profile and social links.'
                  : detectedUsageType === 'business'
                    ? 'business destination URL.'
                    : 'smart QR configuration.'}
              </p>

              <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-center justify-between">
                <span className="text-zinc-500">QR Code Number:</span>
                <span className="font-mono font-bold">{normalizeQrNumber(qrNumber)}</span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="currentPassword" className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                      <Lock className="h-3.5 w-3.5 text-electric" />
                      Your Personal Password
                    </label>
                    <Link
                      to="/support"
                      className="text-[11px] text-electric hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      autoFocus
                      className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 pr-10 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-muted hover:text-ink transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all duration-200 disabled:opacity-60"
                >
                  {submitting && <Spinner size={16} />}
                  <span>{submitting ? 'Signing In...' : 'Open My Dashboard'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>

                {!qrNumberLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('lookup')
                      setError(null)
                    }}
                    className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors pt-1"
                  >
                    ← Change QR Code Number
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* Attribution footer */}
      <div className="mt-8 text-center relative z-10">
        <a
          href="https://etromo.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          <span>Powered by</span>
          <span className="font-bold text-ink hover:text-electric transition-colors">SpreadNFC</span>
          <span className="text-ink-muted font-mono">· ETROMO</span>
        </a>
      </div>
    </div>
  )
}

function HeaderBadge({
  icon: Icon,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: 'electric' | 'emerald' | 'amber'
  children: React.ReactNode
}) {
  let styleClasses = 'bg-electric/10 text-electric border border-electric/20'
  if (color === 'emerald') {
    styleClasses = 'bg-emerald-100/80 text-emerald-700 border border-emerald-300'
  } else if (color === 'amber') {
    styleClasses = 'bg-amber-100/80 text-amber-800 border border-amber-300'
  }

  return (
    <div className="flex justify-center">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-bold tracking-wider uppercase ${styleClasses}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{children}</span>
      </span>
    </div>
  )
}
