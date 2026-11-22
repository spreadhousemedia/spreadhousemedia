import { useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  Pencil,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { profilePublicUrl } from '../lib/config'
import { invalidateProfileCache, invalidateQrRedirectCache } from '../lib/cache'
import {
  BUSINESS_PURPOSES,
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  normalizeDestinationUrl,
} from '../lib/validation'
import { rpcErrorMessage, type BusinessPurpose, type QrStatus, type UsageType } from '../types'
import { Spinner } from './Spinner'

export interface EditableQrRow {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
  password_changed?: boolean
  claimed_at?: string | null
  owner_email?: string | null
  usage_type?: UsageType | null
  business_name?: string | null
  business_purpose?: BusinessPurpose | null
  qr_profiles?: {
    id: string
    public_slug: string | null
    is_published: boolean
    profile_name: string
    qr_links?: Array<{ id: string; is_active: boolean }>
  } | null
}

interface EditQrModalProps {
  row: EditableQrRow
  onClose: () => void
  onSaved: () => void
}

export function EditQrModal({ row, onClose, onSaved }: EditQrModalProps) {
  const [qrName, setQrName] = useState(row.qr_name)
  const [destinationUrl, setDestinationUrl] = useState(row.destination_url ?? '')
  const [businessName, setBusinessName] = useState(row.business_name ?? '')
  const [businessPurpose, setBusinessPurpose] = useState<BusinessPurpose>(
    row.business_purpose ?? 'custom',
  )
  const [status, setStatus] = useState<QrStatus>(row.status)
  const [usageType, setUsageType] = useState<UsageType | null>(row.usage_type ?? null)
  const [pendingModeSwitch, setPendingModeSwitch] = useState<UsageType | null | undefined>(undefined)
  const [switchingMode, setSwitchingMode] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  const [issuedSetupCode, setIssuedSetupCode] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [isUnclaiming, setIsUnclaiming] = useState(false)

  const activeLinksCount =
    row.qr_profiles?.qr_links?.filter((l) => l.is_active).length ?? 0
  const totalLinksCount = row.qr_profiles?.qr_links?.length ?? 0
  const profileIdentifier = row.qr_profiles?.public_slug || row.qr_number

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
      .update({
        qr_name: qrName.trim(),
        destination_url: trimmedUrl || null,
        business_name: businessName.trim() || null,
        business_purpose: usageType === 'business' ? businessPurpose : row.business_purpose ?? null,
        status,
      })
      .eq('id', row.id)

    setSaving(false)
    if (updateError) {
      setError('Could not save changes. Please try again.')
      return
    }
    invalidateQrRedirectCache(row.qr_number)
    invalidateProfileCache(profileIdentifier)
    onSaved()
  }

  async function handleConfirmModeSwitch() {
    if (pendingModeSwitch === undefined) return
    setError(null)
    setSwitchingMode(true)
    const { data, error: rpcError } = await supabase.rpc('admin_set_qr_usage_type', {
      p_qr_id: row.id,
      p_usage_type: pendingModeSwitch,
    })
    setSwitchingMode(false)

    if (rpcError || !data?.ok) {
      setError(rpcErrorMessage(data?.error ?? rpcError?.message))
      return
    }

    setUsageType(pendingModeSwitch)
    setPendingModeSwitch(undefined)
    invalidateQrRedirectCache(row.qr_number)
    setPasswordMessage(
      pendingModeSwitch
        ? `Mode switched to ${pendingModeSwitch.toUpperCase()}. Existing data was preserved.`
        : 'Mode reset to Unassigned (customer can pick mode on next setup).',
    )
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
        className="theme-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl transition-all"
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
                Claimed &amp; Active
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
                  Claimed On:{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {new Date(row.claimed_at).toLocaleString()}
                  </span>
                </p>
              )}
              {row.owner_email && (
                <p>
                  Registered Email:{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{row.owner_email}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Experience Mode Management (Admin Only) */}
        <div className="mt-3 p-3.5 rounded-xl border theme-border theme-subtle space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold theme-text-main">QR Experience Mode:</span>
            {usageType === 'personal' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 text-[11px]">
                <User className="h-3 w-3" /> Personal Profile
              </span>
            ) : usageType === 'business' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 text-[11px]">
                <Building2 className="h-3 w-3" /> Business Direct Redirect
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-zinc-200 text-zinc-700 text-[11px]">
                Unassigned
              </span>
            )}
          </div>

          {usageType === 'personal' && row.qr_profiles && (
            <div className="pt-2 border-t theme-border flex items-center justify-between gap-2 text-[11px]">
              <div className="theme-text-muted">
                <strong className="theme-text-main">{row.qr_profiles.profile_name || row.qr_number}</strong>{' '}
                · {activeLinksCount}/{totalLinksCount} active links ·{' '}
                <span className={row.qr_profiles.is_published ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                  {row.qr_profiles.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <a
                href={profilePublicUrl(profileIdentifier)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline shrink-0"
              >
                <span>Open /p/</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] theme-text-muted mr-1">Support Mode Switch:</span>
            {usageType !== 'personal' && (
              <button
                type="button"
                onClick={() => setPendingModeSwitch('personal')}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                Switch to Personal
              </button>
            )}
            {usageType !== 'business' && (
              <button
                type="button"
                onClick={() => setPendingModeSwitch('business')}
                className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
              >
                Switch to Business
              </button>
            )}
            {usageType !== null && (
              <button
                type="button"
                onClick={() => setPendingModeSwitch(null)}
                className="rounded-lg border theme-border px-2.5 py-1 text-[11px] font-medium theme-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Reset Mode
              </button>
            )}
          </div>

          {pendingModeSwitch !== undefined && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 space-y-2">
              <p className="flex items-start gap-1.5 text-[11px] font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Confirm changing <strong>{row.qr_number}</strong> to{' '}
                  <strong>{pendingModeSwitch ? pendingModeSwitch.toUpperCase() : 'UNASSIGNED'}</strong>? Existing profile links and business URLs will be preserved in the database.
                </span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingModeSwitch(undefined)}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={switchingMode}
                  onClick={handleConfirmModeSwitch}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                >
                  {switchingMode && <Spinner size={11} />}
                  Confirm Switch
                </button>
              </div>
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

          {usageType === 'business' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider">
                  Business Name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Optional business label"
                  className="theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider">
                  Business Purpose
                </label>
                <select
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value as BusinessPurpose)}
                  className="theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
                >
                  {BUSINESS_PURPOSES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {usageType !== 'personal' && (
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
          )}

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

            <div className="pt-2 border-t border-dashed theme-border">
              <label className="theme-text-main mb-1 block text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                Direct Password Override
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
