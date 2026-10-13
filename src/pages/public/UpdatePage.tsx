import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { isUrlReachable, isValidDestinationUrl, normalizeDestinationUrl, normalizeQrNumber } from '../../lib/validation'
import { rpcErrorMessage } from '../../types'
import { Spinner } from '../../components/Spinner'

type Step = 'form' | 'password' | 'success'

export function UpdatePage() {
  const [searchParams] = useSearchParams()
  const scannedQrNumber = searchParams.get('qr')
  const qrNumberLocked = !!scannedQrNumber

  const [step, setStep] = useState<Step>('form')
  const [qrNumber, setQrNumber] = useState(scannedQrNumber ?? '')
  const [newUrl, setNewUrl] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showQrHelp, setShowQrHelp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleStepOneSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!qrNumber.trim()) {
      setError('Please enter a QR number.')
      return
    }
    const normalizedUrl = normalizeDestinationUrl(newUrl)
    if (!isValidDestinationUrl(normalizedUrl)) {
      setError('Please enter a valid URL.')
      return
    }
    setNewUrl(normalizedUrl)

    setSubmitting(true)

    const reachable = await isUrlReachable(normalizedUrl)
    if (!reachable) {
      setSubmitting(false)
      setError("We couldn't open this link. Please check it and try again.")
      return
    }

    const { data, error: rpcError } = await supabase.rpc('request_qr_update', {
      p_qr_number: normalizeQrNumber(qrNumber),
      p_new_url: normalizedUrl,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }
    setStep('password')
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!password) {
      setError('Please enter the password.')
      return
    }

    setSubmitting(true)
    const { data, error: rpcError } = await supabase.rpc('confirm_qr_update', {
      p_qr_number: normalizeQrNumber(qrNumber),
      p_new_url: normalizeDestinationUrl(newUrl),
      p_password: password,
    })
    setSubmitting(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }
    setStep('success')
  }

  // Once saved, this is done: take them to the link now, same as scanning the
  // QR would. No path back to re-submit from this screen — editing again
  // later goes through the normal QR number + password flow, same as anyone
  // else who knows the password.
  useEffect(() => {
    if (step !== 'success') return
    const timer = setTimeout(() => {
      window.location.replace(newUrl.trim())
    }, 2500)
    return () => clearTimeout(timer)
  }, [step, newUrl])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-soft text-ink px-4 py-12 relative overflow-hidden">
      {/* Diffused ambient light fields */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

      {/* Spread NFC Brand Header */}
      <div className="mb-6 text-center relative z-10">
        <Link to="/" className="inline-block transition-transform duration-200 hover:scale-105" title="Spread NFC Home">
          <img src="/logo.png" alt="Spread NFC" className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-7 sm:p-9 shadow-xl relative z-10">
        {step === 'form' && (
          <form onSubmit={handleStepOneSubmit} noValidate>
            <HeaderIcon>
              <path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.43" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 11a5 5 0 00-7.07 0L5 12.93a5 5 0 007.07 7.07l1.43-1.43" strokeLinecap="round" strokeLinejoin="round" />
            </HeaderIcon>
            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight">
              {qrNumberLocked ? (
                <>
                  Set Up Your{' '}
                  <span className="font-editorial italic font-normal text-electric">
                    Smart Card &amp; Standee
                  </span>
                </>
              ) : (
                <>
                  Update Your{' '}
                  <span className="font-editorial italic font-normal text-electric">
                    NFC &amp; QR Destination
                  </span>
                </>
              )}
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              {qrNumberLocked
                ? 'Device detected via tap or scan! Enter the website or profile link it should open, and your product is live.'
                : 'Enter your serial number and new destination link. Future NFC taps and QR scans will open this link immediately.'}
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="qrNumber" className="block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                    Serial Number (NFC / QR)
                  </label>
                  {!qrNumberLocked && (
                    <button
                      type="button"
                      onClick={() => setShowQrHelp((s) => !s)}
                      className="text-xs font-semibold text-electric hover:text-electric-hover flex items-center gap-1 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
                      </svg>
                      <span>Where to find this?</span>
                    </button>
                  )}
                </div>
                <input
                  id="qrNumber"
                  value={qrNumber}
                  onChange={(e) => setQrNumber(normalizeQrNumber(e.target.value))}
                  placeholder="e.g. Z100 or TF-100"
                  readOnly={qrNumberLocked}
                  className={`w-full rounded-xl border px-3.5 py-3 text-sm font-mono focus:border-electric focus:outline-none transition-colors ${
                    qrNumberLocked
                      ? 'border-surface-border bg-surface-subtle text-ink-muted'
                      : 'border-surface-border text-ink bg-white placeholder:text-zinc-400'
                  }`}
                  autoCapitalize="characters"
                />

                {showQrHelp && !qrNumberLocked && (
                  <div className="mt-2.5 rounded-xl border border-electric/20 bg-electric/5 p-4 text-xs text-ink space-y-2.5">
                    <p className="font-bold flex items-center gap-1.5 text-electric">
                      <span>📍 Where to find your serial number:</span>
                    </p>
                    <ul className="space-y-1.5 text-ink-muted list-disc list-inside">
                      <li>
                        <strong className="text-ink">On NFC Smart Cards:</strong> Laser-engraved on the bottom-back of your PVC, Metal, or Bamboo card (e.g. <code>Z100</code>). Tapping your phone on the card also opens this page with the serial auto-filled!
                      </li>
                      <li>
                        <strong className="text-ink">On Acrylic Standees:</strong> Printed directly below the QR code graphic on your tabletop display.
                      </li>
                      <li>
                        <strong className="text-ink">Dual Hardware Sync:</strong> Updating this link updates both the NFC tap and QR scan simultaneously without rewriting the physical chip.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="newUrl" className="mb-1.5 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                  New Destination Link
                </label>
                <input
                  id="newUrl"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/menu"
                  inputMode="url"
                  autoFocus={qrNumberLocked}
                  className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:outline-none transition-colors"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all duration-200 disabled:opacity-60"
              >
                {submitting && <Spinner size={16} />}
                {submitting ? 'Verifying Link...' : 'Continue to Password'}
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-ink-muted">
              In case you need assistance, our support team is available 24/7.
            </p>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} noValidate>
            <HeaderIcon>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" />
            </HeaderIcon>
            <h1 className="text-center text-2xl font-extrabold text-ink tracking-tight">
              Enter Private Password
            </h1>
            <p className="mt-2 text-center text-xs sm:text-sm text-ink-muted leading-relaxed">
              Enter the private password for this QR serial to authorize and save the new destination.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
                  Private Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 pr-10 text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:outline-none transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-muted hover:text-ink transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
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
                {submitting ? 'Saving New Link...' : 'Save & Update Device'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('form')
                  setPassword('')
                  setError(null)
                }}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors pt-1"
              >
                ← Back to Link
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-ink-muted">
              In case you forgot your password, contact support with your QR serial.
            </p>
          </form>
        )}

        {step === 'success' && (
          <div>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 border border-green-200">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className="mt-4 text-center text-xl font-bold text-gray-900">Destination Saved Successfully!</h1>
            <p className="mt-2 text-center text-sm text-gray-500">
              Both NFC taps and QR scans will now redirect to your new link instantly.
            </p>

            <div className="mt-5 space-y-2 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">Serial Number</span>
                <span className="font-medium text-gray-900">{normalizeQrNumber(qrNumber)}</span>
              </div>
              <div className="flex justify-between gap-2 break-all">
                <span className="shrink-0 text-gray-500">New URL</span>
                <span className="text-right font-medium text-gray-900">{newUrl.trim()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.replace(newUrl.trim())}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 py-3.5 text-sm font-bold text-white hover:bg-electric-hover shadow-md transition-all"
            >
              Continue to My Link
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
              <Spinner size={12} />
              Redirecting automatically…
            </p>
          </div>
        )}
      </div>

      {/* Attribution below card */}
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

function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 text-electric border border-electric/20 shadow-xs">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {children}
      </svg>
    </span>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
        <path d="M9.5 5.3A10.4 10.4 0 0112 5c5 0 9 4 10 7-0.4 1.1-1.2 2.4-2.3 3.6M6.2 6.7C4.2 8 2.8 9.9 2 12c1 3 5 7 10 7 1.3 0 2.5-.2 3.6-.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
