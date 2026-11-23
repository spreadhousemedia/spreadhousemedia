import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  QrCode,
  RotateCcw,
  ShieldCheck,
  User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { qrPublicUrl } from '../../lib/config'
import { resetCustomerQrProfile, switchCustomerUsageMode } from '../../lib/profileApi'
import { isValidPassword } from '../../lib/validation'
import { rpcErrorMessage, type UsageType } from '../../types'
import { Spinner } from '../Spinner'
import { ViewQrModal } from '../ViewQrModal'

interface CustomerAccountSettingsProps {
  qrNumber: string
  sessionToken: string
  currentUsageType?: UsageType | null
  onModeSwitched?: () => Promise<void>
}

const MODE_OPTIONS: Array<{
  id: UsageType
  label: string
  description: string
  icon: typeof User
}> = [
    {
      id: 'personal',
      label: 'Personal Profile',
      description: 'Multi-link bio, avatar, and professional or funky themes',
      icon: User,
    },
    {
      id: 'business_profile',
      label: 'Business Profile',
      description: 'Brand logo, hours, Call/WhatsApp/Maps, and minimalist themes',
      icon: Building2,
    },
    {
      id: 'business',
      label: 'Business Direct Link',
      description: 'Instant redirect to Google Reviews, digital menu, or website',
      icon: ExternalLink,
    },
  ]

export function CustomerAccountSettings({
  qrNumber,
  sessionToken,
  currentUsageType,
  onModeSwitched,
}: CustomerAccountSettingsProps) {
  const [showQrModal, setShowQrModal] = useState(false)
  const [copiedQr, setCopiedQr] = useState(false)

  const [pendingMode, setPendingMode] = useState<UsageType | null>(null)
  const [switchingMode, setSwitchingMode] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resettingQr, setResettingQr] = useState(false)
  const [modeError, setModeError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const permanentQrUrl = qrPublicUrl(qrNumber)

  async function handleConfirmModeSwitch() {
    if (!pendingMode || pendingMode === currentUsageType) {
      setPendingMode(null)
      return
    }
    setModeError(null)
    setSwitchingMode(true)
    const res = await switchCustomerUsageMode(sessionToken, qrNumber, pendingMode)
    setSwitchingMode(false)

    if (!res.ok) {
      setModeError(res.error || 'Could not switch profile mode. Please try again.')
      return
    }

    setPendingMode(null)
    if (onModeSwitched) {
      await onModeSwitched()
    }
  }

  async function handleConfirmResetQr() {
    setModeError(null)
    setResettingQr(true)
    const res = await resetCustomerQrProfile(sessionToken, qrNumber)
    setResettingQr(false)

    if (!res.ok) {
      setModeError(res.error || 'Could not reset QR profile. Please try again.')
      return
    }

    setConfirmingReset(false)
    setPendingMode(null)
    if (onModeSwitched) {
      await onModeSwitched()
    }
  }

  async function handleCopyQrUrl() {
    await navigator.clipboard.writeText(permanentQrUrl)
    setCopiedQr(true)
    setTimeout(() => setCopiedQr(false), 1500)
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!currentPassword) {
      setMessage({ type: 'err', text: 'Please enter your current password.' })
      return
    }
    if (!isValidPassword(newPassword)) {
      setMessage({ type: 'err', text: 'New password must be at least 4 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'err', text: 'New passwords do not match.' })
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('customer_change_password', {
      p_session_token: sessionToken,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    })
    setSaving(false)

    if (error || !data?.ok) {
      setMessage({ type: 'err', text: rpcErrorMessage(data?.error ?? error?.message) })
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage({
      type: 'ok',
      text: 'Password updated! Your QR code and links continue working without interruption.',
    })
  }

  return (
    <div className="space-y-5">
      {/* QR Code & Permanent URL Card */}
      <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <QrCode className="h-4 w-4 text-electric" />
              <span>Permanent QR &amp; NFC Link</span>
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              This dynamic QR URL never changes—even when you update your links or custom username.
            </p>
            <p className="mt-2 font-mono text-xs text-zinc-700 break-all bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 inline-block">
              {permanentQrUrl}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyQrUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-zinc-50 px-3 py-2 text-xs font-semibold text-ink hover:bg-zinc-100 transition-colors"
            >
              {copiedQr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedQr ? 'Copied' : 'Copy QR URL'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>View / Download QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Profile Mode Card */}
      {currentUsageType && onModeSwitched && (
        <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-[#171717]" />
                <span>Change Profile Mode</span>
              </h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                Switch QR <span className="font-mono font-semibold text-ink">{qrNumber}</span> anytime between Personal Profile, Business Profile, or Direct Link. Your saved links and data are preserved.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isCurrent = currentUsageType === opt.id
              const isSelected = pendingMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={switchingMode}
                  onClick={() => {
                    setModeError(null)
                    setPendingMode(isCurrent ? null : opt.id)
                  }}
                  className={`rounded-xl border p-3.5 text-left transition-all ${isCurrent
                    ? 'border-[#171717] bg-[#F7F7F5] ring-1 ring-[#171717]'
                    : isSelected
                      ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                      : 'border-[#E5E7EB] bg-white hover:border-[#171717]/40'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{opt.label}</span>
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>

          {pendingMode && pendingMode !== currentUsageType && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-3">
              <p className="flex items-start gap-2 text-xs text-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Switch <strong>{qrNumber}</strong> to{' '}
                  <strong>{MODE_OPTIONS.find((m) => m.id === pendingMode)?.label}</strong>? Your existing profile details, links, and redirect URL remain safely stored in the database.
                </span>
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={switchingMode}
                  onClick={() => {
                    setPendingMode(null)
                    setModeError(null)
                  }}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={switchingMode}
                  onClick={handleConfirmModeSwitch}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#171717] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#262626] disabled:opacity-60"
                >
                  {switchingMode && <Spinner size={13} />}
                  <span>{switchingMode ? 'Switching…' : 'Confirm Switch'}</span>
                </button>
              </div>
            </div>
          )}

          {modeError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {modeError}
            </p>
          )}

          {/* Reset QR & Start Fresh */}
          <div className="pt-3 border-t border-[#E5E7EB] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <p className="text-xs font-bold text-ink">Reset QR &amp; Start Fresh</p>
                <p className="text-[11px] text-ink-muted">
                  Clear your current profile, links, and redirect URL to set up {qrNumber} from scratch. Your password stays the same.
                </p>
              </div>
              {!confirmingReset && (
                <button
                  type="button"
                  disabled={switchingMode || resettingQr}
                  onClick={() => {
                    setPendingMode(null)
                    setModeError(null)
                    setConfirmingReset(true)
                  }}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset My QR</span>
                </button>
              )}
            </div>

            {confirmingReset && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 space-y-3">
                <p className="flex items-start gap-2 text-xs text-rose-900">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Are you sure you want to reset <strong>{qrNumber}</strong>? This clears your current mode, profile info, links, and redirect URL and takes you back to fresh setup. Your login password will stay active.
                  </span>
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={resettingQr}
                    onClick={() => {
                      setConfirmingReset(false)
                      setModeError(null)
                    }}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resettingQr}
                    onClick={handleConfirmResetQr}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {resettingQr ? <Spinner size={13} /> : <RotateCcw className="h-3.5 w-3.5" />}
                    <span>{resettingQr ? 'Resetting…' : 'Yes, Reset QR'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password & Security Card */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-surface-border bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-electric" />
              <span>Account Settings &amp; Password</span>
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Update the personal password used to manage QR <span className="font-mono font-semibold">{qrNumber}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords((s) => !s)}
            className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1"
          >
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{showPasswords ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-mono font-semibold uppercase text-ink-muted">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-mono font-semibold uppercase text-ink-muted">
              New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 4 chars"
              className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-mono font-semibold uppercase text-ink-muted">
              Confirm Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter"
              className="w-full rounded-xl border border-surface-border px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
            />
          </div>
        </div>

        {message && (
          <p
            role="alert"
            className={`rounded-xl border px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
          >
            {message.type === 'ok' ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-electric px-4 py-2 text-xs font-bold text-white hover:bg-electric-hover transition-colors disabled:opacity-60"
          >
            {saving && <Spinner size={14} />}
            <span>Update Password</span>
          </button>
        </div>
      </form>

      {showQrModal && <ViewQrModal qrNumber={qrNumber} onClose={() => setShowQrModal(false)} />}
    </div>
  )
}

