import { useState } from 'react'
import { Pencil, X, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from './Spinner'
import {
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  normalizeDestinationUrl,
} from '../lib/validation'
import type { QrStatus } from '../types'

export interface EditableQrRow {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
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
    setPasswordMessage('Password updated.')
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
              QR number is permanent and linked to the physical standee.
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

          {/* Password Reset Section */}
          <div className="theme-border border-t pt-4">
            <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              Reset Security Password
            </label>
            <div className="flex gap-2">
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 4 chars)"
                className="theme-input flex-1 rounded-xl border px-3.5 py-2 text-xs focus:border-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resettingPassword}
                className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover disabled:opacity-60 transition-colors"
              >
                {resettingPassword && <Spinner size={12} />}
                Reset
              </button>
            </div>
            {passwordMessage && (
              <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{passwordMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
