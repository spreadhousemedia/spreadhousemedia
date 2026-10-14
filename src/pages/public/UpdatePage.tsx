import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Lock,
  Link2,
  KeyRound,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  QrCode,
  RotateCcw,
  Shield,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  normalizeDestinationUrl,
  normalizeQrNumber,
} from '../../lib/validation'
import { rpcErrorMessage } from '../../types'
import { Spinner } from '../../components/Spinner'
import { invalidateAdminQrCache, invalidateQrRedirectCache } from '../../lib/cache'

type PageMode = 'lookup' | 'verify_setup' | 'activate' | 'update' | 'success'

export function UpdatePage() {
  const [searchParams] = useSearchParams()
  const scannedQrNumber = searchParams.get('qr')
  const qrNumberLocked = !!scannedQrNumber

  const [mode, setMode] = useState<PageMode>('lookup')
  const [qrNumber, setQrNumber] = useState(scannedQrNumber ?? '')
  const [existingUrl, setExistingUrl] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState('')

  // Setup / Activation fields
  const [requiresSetupCode, setRequiresSetupCode] = useState(true)
  const [setupCode, setSetupCode] = useState('')
  const [isSetupVerified, setIsSetupVerified] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  // Update existing card fields
  const [currentPassword, setCurrentPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showQrHelp, setShowQrHelp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Success summary details
  const [successDetails, setSuccessDetails] = useState<{
    qrNumber: string
    url: string
    isNewClaim: boolean
  } | null>(null)

  // Automatically inspect scanned QR on mount
  useEffect(() => {
    if (scannedQrNumber) {
      checkQrStatus(scannedQrNumber)
    }
  }, [scannedQrNumber])

  async function checkQrStatus(serial: string) {
    const norm = normalizeQrNumber(serial)
    if (!norm) return
    setError(null)
    setChecking(true)

    const { data, error: rpcError } = await supabase.rpc('request_qr_update', {
      p_qr_number: norm,
    })
    setChecking(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      setMode('lookup')
      return
    }

    setExistingUrl(data.destination_url || null)
    if (data.destination_url && !newUrl) {
      setNewUrl(data.destination_url)
    }

    const hasExistingDestination = Boolean(data.destination_url && data.destination_url.trim().length > 0)
    const isClaimed = Boolean(data.is_claimed)
    const reqSetup = data.requires_setup_code !== false
    setRequiresSetupCode(reqSetup)

    if (hasExistingDestination && isClaimed) {
      // Scenario A: Existing Active Device -> Owner Update Portal
      setMode('update')
    } else if (reqSetup) {
      // Scenario C: Fresh Device with Packaging Setup Code -> Step 1 Verification
      setMode('verify_setup')
    } else {
      // Scenario B: Fresh Device with Open Direct Claim -> Direct Activation
      setMode('activate')
    }
  }

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault()
    if (!qrNumber.trim()) {
      setError('Please enter your QR code number.')
      return
    }
    checkQrStatus(qrNumber)
  }

  // Handle Scenario C Step 1: Packaging Code Verification
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

    // Successfully verified packaging ownership on server
    setIsSetupVerified(true)
    setMode('activate')
  }

  // Handle first-time card activation / claiming (Scenario B & Scenario C Step 2)
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

    const normalizedUrl = normalizeDestinationUrl(newUrl)
    if (!isValidDestinationUrl(normalizedUrl)) {
      setError('Please enter a valid destination link (e.g. https://instagram.com/yourbrand).')
      return
    }
    setNewUrl(normalizedUrl)

    setSubmitting(true)

    const reachable = await isUrlReachable(normalizedUrl)
    if (!reachable) {
      setSubmitting(false)
      setError("We couldn't open this link. Please double-check it and try again.")
      return
    }

    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('customer_claim_qr', {
      p_qr_number: norm,
      p_setup_code: requiresSetupCode ? setupCode.trim() : null,
      p_new_password: newPassword,
      p_destination_url: normalizedUrl,
      p_owner_email: ownerEmail.trim() || null,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    // Invalidate caches so subsequent scans immediately redirect to this new link
    invalidateQrRedirectCache(norm)
    invalidateAdminQrCache()

    setSuccessDetails({
      qrNumber: norm,
      url: normalizedUrl,
      isNewClaim: true,
    })
    setMode('success')
  }

  // Handle Scenario A: destination update for already claimed card
  async function handleUpdateSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const normalizedUrl = normalizeDestinationUrl(newUrl)
    if (!isValidDestinationUrl(normalizedUrl)) {
      setError('Please enter a valid destination link.')
      return
    }
    setNewUrl(normalizedUrl)

    if (!currentPassword) {
      setError('Please enter your personal password.')
      return
    }

    setSubmitting(true)

    const reachable = await isUrlReachable(normalizedUrl)
    if (!reachable) {
      setSubmitting(false)
      setError("We couldn't open this link. Please check it and try again.")
      return
    }

    const norm = normalizeQrNumber(qrNumber)
    const { data, error: rpcError } = await supabase.rpc('confirm_qr_update', {
      p_qr_number: norm,
      p_new_url: normalizedUrl,
      p_password: currentPassword,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    // Invalidate caches so scans immediately reflect the updated destination URL
    invalidateQrRedirectCache(norm)
    invalidateAdminQrCache()

    setSuccessDetails({
      qrNumber: norm,
      url: normalizedUrl,
      isNewClaim: false,
    })
    setMode('success')
  }

  // Auto-redirect upon success after 3.5s
  useEffect(() => {
    if (mode !== 'success' || !successDetails?.url) return
    const timer = setTimeout(() => {
      window.location.replace(successDetails.url)
    }, 3500)
    return () => clearTimeout(timer)
  }, [mode, successDetails])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-soft text-ink px-4 py-12 relative overflow-hidden">
      {/* Ambient gradient glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center relative z-10">
        <Link to="/" className="inline-block transition-transform duration-200 hover:scale-105" title="Spread NFC Home">
          <img src="/logo.png" alt="Spread NFC" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-7 sm:p-9 shadow-xl relative z-10">
        {/* LOOKUP SCREEN (if not scanned from URL) */}
        {mode === 'lookup' && (
          <form onSubmit={handleLookupSubmit} noValidate>
            <HeaderBadge icon={QrCode} color="electric">
              DEVICE ACTIVATION &amp; UPDATE
            </HeaderBadge>

            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
              Manage Your{' '}
              <span className="font-editorial italic font-normal text-electric">
                Smart Card &amp; Standee
              </span>
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              Enter your QR code number to activate your new device or update its destination link.
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
                      <span>📍 Where to find your QR Code Number:</span>
                    </p>
                    <ul className="space-y-1.5 text-ink-muted list-disc list-inside">
                      <li>
                        <strong className="text-ink">On Smart Cards:</strong> Laser-engraved on the bottom-back of your PVC, Metal, or Bamboo card. Tapping your phone automatically detects it!
                      </li>
                      <li>
                        <strong className="text-ink">On Tabletop Standees:</strong> Printed directly below the QR code graphic on the acrylic stand.
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

        {/* SCENARIO C — STEP 1: PACKAGING CODE VERIFICATION */}
        {mode === 'verify_setup' && (
          <form onSubmit={handleVerifySetupSubmit} noValidate>
            <HeaderBadge icon={Shield} color="amber">
              SECURITY VERIFICATION • STEP 1 OF 2
            </HeaderBadge>

            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
              Verify Packaging{' '}
              <span className="font-editorial italic font-normal text-amber-600">
                Setup Code
              </span>
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              To protect your smart device from unauthorized claiming, please enter the setup code printed on your delivery slip or card box.
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
                  <span className="text-[10px] text-amber-700 font-sans font-medium">Inside box / delivery slip</span>
                </label>
                <input
                  id="setupCodeInput"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder="e.g. TF-A1B2 or 123456"
                  autoFocus
                  className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none transition-colors"
                />
                <p className="mt-1 text-[11px] text-ink-muted">
                  Protects your smart card so only the recipient with the physical packaging can claim it.
                </p>
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

        {/* SCENARIO B & C — STEP 2: ACTIVATE & CONNECT DESTINATION */}
        {mode === 'activate' && (
          <form onSubmit={handleActivateSubmit} noValidate>
            <HeaderBadge icon={Sparkles} color="emerald">
              {requiresSetupCode ? 'NEW ACTIVATION • STEP 2 OF 2' : 'DIRECT CARD ACTIVATION'}
            </HeaderBadge>

            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
              Connect Your{' '}
              <span className="font-editorial italic font-normal text-emerald-600">
                Smart Card
              </span>
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              Enter your destination website or profile, then create a personal password to manage future link updates.
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
              {/* Destination URL */}
              <div>
                <label htmlFor="activateUrl" className="mb-1.5 flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                  <Link2 className="h-3.5 w-3.5 text-emerald-600" />
                  Destination Website / Profile Link
                </label>
                <input
                  id="activateUrl"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://instagram.com/yourhandle or website"
                  inputMode="url"
                  autoFocus
                  className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-2.5 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Create New Password */}
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

              {/* Confirm Password */}
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

              {/* Recovery Email (Optional) */}
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
                  placeholder="you@example.com (for password reset)"
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
                {submitting ? 'Activating Card...' : 'Claim & Activate My Card'}
              </button>

              {!qrNumberLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setMode(requiresSetupCode ? 'verify_setup' : 'lookup')
                    setError(null)
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors pt-1"
                >
                  ← Back
                </button>
              )}
            </div>
          </form>
        )}

        {/* SCENARIO A — OWNER UPDATE PORTAL (Already Claimed) */}
        {mode === 'update' && (
          <form onSubmit={handleUpdateSubmit} noValidate>
            <HeaderBadge icon={Lock} color="electric">
              OWNER UPDATE PORTAL
            </HeaderBadge>

            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight mt-3">
              Update Your{' '}
              <span className="font-editorial italic font-normal text-electric">
                NFC &amp; QR Destination
              </span>
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              This card is registered to you. Enter your personal password to update where NFC taps and QR scans redirect.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-center justify-between">
              <span className="text-zinc-500">QR Code Number:</span>
              <span className="font-mono font-bold">{normalizeQrNumber(qrNumber)}</span>
            </div>

            <div className="mt-5 space-y-4">
              {/* New Destination Link */}
              <div>
                <label htmlFor="newUrl" className="mb-1.5 flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                  <Link2 className="h-3.5 w-3.5 text-electric" />
                  New Destination Link
                </label>
                <input
                  id="newUrl"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/menu"
                  inputMode="url"
                  autoFocus
                  className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:outline-none transition-colors"
                />
                {existingUrl && existingUrl !== newUrl && (
                  <p className="mt-1 text-[11px] text-ink-muted truncate">
                    Current: <span className="font-mono">{existingUrl}</span>
                  </p>
                )}
              </div>

              {/* Personal Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="currentPassword" className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    <Lock className="h-3.5 w-3.5 text-electric" />
                    Your Personal Password
                  </label>
                  <Link
                    to="/support"
                    className="text-[11px] text-electric hover:underline font-medium"
                    title="Forgot password support"
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
                {submitting ? 'Saving New Destination...' : 'Save & Update Destination'}
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

            <p className="mt-5 text-center text-xs text-ink-muted">
              Need assistance? Our support team is available 24/7.
            </p>
          </form>
        )}

        {/* SUCCESS SCREEN */}
        {mode === 'success' && successDetails && (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </span>

            <h1 className="mt-4 text-2xl font-bold text-gray-900 tracking-tight">
              {successDetails.isNewClaim ? 'Card Claimed & Activated!' : 'Destination Updated!'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 leading-relaxed">
              {successDetails.isNewClaim
                ? 'Your card is now personal to you. Future NFC taps and QR scans will open your new destination instantly.'
                : 'Both NFC taps and QR scans will now redirect to your new link instantly.'}
            </p>

            <div className="mt-5 space-y-2 rounded-xl bg-gray-50 border border-gray-200 p-4 text-left text-xs sm:text-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-500">QR Code Number</span>
                <span className="font-mono font-bold text-gray-900">{successDetails.qrNumber}</span>
              </div>
              <div className="flex justify-between items-start gap-2 break-all pt-1 border-t border-gray-200/60">
                <span className="shrink-0 text-gray-500">Destination</span>
                <span className="text-right font-medium text-electric truncate max-w-[200px]">
                  {successDetails.url}
                </span>
              </div>
              {successDetails.isNewClaim && (
                <div className="pt-2 border-t border-gray-200/60 text-[11px] text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Setup code has been deactivated. Your personal password is now active.</span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => window.location.replace(successDetails.url)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all"
              >
                <span>Continue to Destination Link</span>
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(successDetails.isNewClaim ? 'update' : 'lookup')
                  setSetupCode('')
                  setCurrentPassword('')
                  setError(null)
                }}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors py-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Edit Again</span>
              </button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
              <Spinner size={12} />
              Redirecting automatically…
            </p>
          </div>
        )}
      </div>

      {/* Attribution footer */}
      <div className="mt-6 text-center">
        <a
          href="https://etromo.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          <span>Designed &amp; Developed by</span>
          <span className="font-bold text-ink hover:text-electric transition-colors">ETROMO</span>
          <span className="text-ink-muted font-mono">(etromo.in)</span>
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
  const isEmerald = color === 'emerald'
  const isAmber = color === 'amber'
  let styleClasses = 'bg-electric/10 text-electric border border-electric/20'
  if (isEmerald) {
    styleClasses = 'bg-emerald-100/80 text-emerald-700 border border-emerald-300'
  } else if (isAmber) {
    styleClasses = 'bg-amber-100/80 text-amber-800 border border-amber-300'
  }

  return (
    <div className="flex justify-center">
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider ${styleClasses}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{children}</span>
      </span>
    </div>
  )
}
