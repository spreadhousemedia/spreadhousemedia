import { useState, type FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, Lock, QrCode, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { qrPublicUrl } from '../../lib/config'
import { isValidPassword } from '../../lib/validation'
import { rpcErrorMessage } from '../../types'
import { Spinner } from '../Spinner'
import { ViewQrModal } from '../ViewQrModal'

interface CustomerAccountSettingsProps {
  qrNumber: string
  sessionToken: string
}

export function CustomerAccountSettings({ qrNumber, sessionToken }: CustomerAccountSettingsProps) {
  const [showQrModal, setShowQrModal] = useState(false)
  const [copiedQr, setCopiedQr] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const permanentQrUrl = qrPublicUrl(qrNumber)

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
            className={`rounded-xl border px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
              message.type === 'ok'
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

