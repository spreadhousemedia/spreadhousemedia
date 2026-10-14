import { useState } from 'react'
import { Pencil, X, KeyRound, Sparkles, CheckCircle2, ShieldAlert, Copy, Check, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from './Spinner'
import {
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  normalizeDestinationUrl,
} from '../lib/validation'
import { invalidateQrRedirectCache } from '../lib/cache'
import type { QrStatus } from '../types'

export interface EditableQrRow {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
  password_changed?: boolean
  claimed_at?: string | null
  owner_email?: string | null
}

interface EditQrModalProps {
  row: EditableQrRow
  onClose: () => void
  onSaved: () => void
}

export function EditQrModal({ row, onClose, onSaved }: EditQrModalProps) {
  const [qrName, setQrName] = useState(row.qr_name)
  const [destinationUrl, setDestinationUrl] = useState(row.destination_url ?? '')
  const [status, setStatus] = useState<QrStatus>(row.status)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  // Reset to unclaimed / issue new setup code
  const [issuedSetupCode, setIssuedSetupCode] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [isUnclaiming, setIsUnclaiming] = useState(false)

  async function handleSave() {
    setError(null)
    if (!qrName.trim()) {
      setError('QR name is required.')
      return
    }
    const trimmedUrl = normalizeDestinationUrl(destinationUrl)
    if (trimmedUrl && !isValidDestinationUrl(trimmedUrl)) {
      setError('Please enter a valid URL.')
      return
    }
    setDestinationUrl(trimmedUrl)
    setSaving(true)

    if (trimmedUrl && trimmedUrl !== (row.destination_url ?? '')) {
      const reachable = await isUrlReachable(trimmedUrl)
      if (!reachable) {
        setSaving(false)
        setError("We couldn't open this link. Please double-check it.")
        return
      }
    }

    const { error: updateError } = await supabase
      .from('qr_codes')
      .update({ qr_name: qrName.trim(), destination_url: trimmedUrl || null, status })
      .eq('id', row.id)
    setSaving(false)
    if (updateError) {
      setError('Could not save changes. Please try again.')
      return
    }
    invalidateQrRedirectCache(row.qr_number)
    onSaved()
  }

  async function handleResetPassword() {
    setPasswordMessage(null)
    if (!isValidPassword(newPassword)) {
      setPasswordMessage('Password must be at least 4 characters.')
      return
    }
    setResettingPassword(true)
    const { data, error: rpcError } = await supabase.rpc('admin_reset_qr_password', {
      p_qr_id: row.id,
      p_new_password: newPassword,
    })
    setResettingPassword(false)
    if (rpcError || !data?.ok) {
      setPasswordMessage('Could not reset password. Please try again.')
      return
    }
    setNewPassword('')
    setPasswordMessage('Password updated successfully.')
  }

  async function handleIssueNewSetupCode() {
    setPasswordMessage(null)
    // Generate a clean 6-character uppercase setup code
    const randomCode = 'TF-' + Math.random().toString(36).slice(2, 6).toUpperCase()

    setIsUnclaiming(true)
    const { data, error: rpcError } = await supabase.rpc('admin_reset_qr_unclaimed', {
      p_qr_id: row.id,
      p_new_setup_code: randomCode,
    })
    setIsUnclaiming(false)

    if (rpcError || !data?.ok) {
      setPasswordMessage('Could not reset card to unclaimed. Please try again.')
      return
    }

    setIssuedSetupCode(randomCode)
    setPasswordMessage('Card has been reset to UNCLAIMED with new Setup Code!')
  }

  async function copySetupCode() {
    if (!issuedSetupCode) return
    await navigator.clipboard.writeText(issuedSetupCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="theme-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theme-border flex items-center justify-between pb-3 border-b">
          <div>
            <h3 className="theme-text-main text-lg font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              Edit {row.qr_number}
            </h3>
            <p className="theme-text-muted mt-0.5 text-xs">
              QR number is permanent and linked to the physical standee or smart card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-text-muted hover:text-white rounded-lg p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ownership & Claim Status Banner */}
        <div className="mt-4 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Customer Claim Status:</span>
            {row.password_changed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Claimed & Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]">
                <Sparkles className="h-3 w-3 text-amber-600" />
                Unclaimed (Setup Pending)
              </span>
            )}
          </div>
          {row.password_changed && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-slate-500">
              {row.claimed_at && (
                <p>
                  Claimed On: <span className="text-slate-800 dark:text-slate-200 font-medium">{new Date(row.claimed_at).toLocaleString()}</span>
                </p>
              )}
              {row.owner_email && (
                <p>
                  Registered Email: <span className="text-slate-800 dark:text-slate-200 font-medium">{row.owner_email}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider">
              QR Name
            </label>
            <input
              value={qrName}
              onChange={(e) => setQrName(e.target.value)}
              className="theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider">
              Destination Link
            </label>
            <input
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="Not set — first scan will prompt for it"
              className="theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as QrStatus)}
              className="theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="theme-subtle rounded-xl border px-4 py-2 text-xs font-medium theme-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 disabled:opacity-60 transition-colors"
            >
              {saving && <Spinner size={14} />}
              Save Changes
            </button>
          </div>

          {/* Customer Support & Security Reset Section */}
          <div className="theme-border border-t pt-4 space-y-3">
            <div>
              <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-brand-500" />
                Customer Support: Reset to Unclaimed
              </label>
              <p className="text-[11px] theme-text-muted mb-2">
                If the customer forgot their password, reset this card to generate a fresh Setup Code so they can claim it again.
              </p>

              <button
                type="button"
                onClick={handleIssueNewSetupCode}
                disabled={isUnclaiming}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-300 dark:border-brand-700 bg-brand-50/70 dark:bg-brand-500/10 py-2 px-3 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-100 transition-colors"
              >
                {isUnclaiming && <Spinner size={12} />}
                <Sparkles className="h-3.5 w-3.5" />
                <span>Issue New Setup Code (Reset Ownership)</span>
              </button>

              {issuedSetupCode && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">New Setup Code:</span>
                    <span className="font-mono font-extrabold text-sm tracking-wider">{issuedSetupCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={copySetupCode}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                  >
                    {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{codeCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Direct Admin Password Override */}
            <div className="pt-2 border-t border-dashed theme-border">
              <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                Direct Admin Password Override
              </label>
              <div className="flex gap-2">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set explicit password (min 4 chars)"
                  className="theme-input flex-1 rounded-xl border px-3.5 py-2 text-xs focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover disabled:opacity-60 transition-colors"
                >
                  {resettingPassword && <Spinner size={12} />}
                  Apply
                </button>
              </div>
            </div>

            {passwordMessage && (
              <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {passwordMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
