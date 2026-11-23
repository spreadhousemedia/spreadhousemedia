import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Briefcase,
  Building2,
  ExternalLink,
  Layers,
  Lock,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Shield,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { profilePublicUrl, qrPublicUrl } from '../../lib/config'
import { fetchMultiQrSummary } from '../../lib/profileApi'
import {
  clearAllMultiQrVaultSessions,
  listMultiQrVault,
  registerQrSessionInVault,
  removeQrFromVault,
  syncVaultWithServerSummaries,
  updateQrLabelInVault,
} from '../../lib/multiQrVault'
import { isValidPassword, normalizeQrNumber } from '../../lib/validation'
import { rpcErrorMessage, type MultiQrSummaryItem } from '../../types'
import { Spinner } from '../Spinner'

const PRESET_LABELS = ['Profile QR', 'Reviews QR', 'WhatsApp QR', 'Menu QR', 'Website QR']

interface MultiQrManagerProps {
  open: boolean
  activeQrNumber: string
  onClose: () => void
  onSwitchQr: (qrNumber: string, sessionToken: string) => Promise<void>
  onLogoutAll: () => void
}

type AddStep = 'closed' | 'lookup' | 'login' | 'verify_setup' | 'activate'

export function MultiQrManager({
  open,
  activeQrNumber,
  onClose,
  onSwitchQr,
  onLogoutAll,
}: MultiQrManagerProps) {
  const [items, setItems] = useState<MultiQrSummaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [switchingQr, setSwitchingQr] = useState<string | null>(null)
  const [editingLabelQr, setEditingLabelQr] = useState<string | null>(null)
  const [labelInput, setLabelInput] = useState('')

  // Connect Another QR state (requires cryptographic password or setup-code proof)
  const [addStep, setAddStep] = useState<AddStep>('closed')
  const [newQrNumber, setNewQrNumber] = useState('')
  const [newQrLabel, setNewQrLabel] = useState('')
  const [requiresSetupCode, setRequiresSetupCode] = useState(true)
  const [setupCode, setSetupCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const refreshSummaries = useCallback(async () => {
    const entries = listMultiQrVault()
    if (entries.length === 0) {
      setItems([])
      return
    }
    setLoading(true)
    const { ok, items: serverItems } = await fetchMultiQrSummary(entries.map((e) => e.sessionToken))
    setLoading(false)
    if (ok) {
      const synced = syncVaultWithServerSummaries(serverItems)
      setItems(synced)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    refreshSummaries()
  }, [open, refreshSummaries])

  if (!open) return null

  function resetAddForm() {
    setAddStep('closed')
    setNewQrNumber('')
    setNewQrLabel('')
    setSetupCode('')
    setPassword('')
    setConfirmPassword('')
    setAddError(null)
  }

  async function handleLookupNewQr(e: FormEvent) {
    e.preventDefault()
    setAddError(null)
    const norm = normalizeQrNumber(newQrNumber)
    if (!norm) {
      setAddError('Please enter a QR code number.')
      return
    }
    setNewQrNumber(norm)
    setAddBusy(true)
    const { data, error } = await supabase.rpc('request_qr_update', { p_qr_number: norm })
    setAddBusy(false)

    if (error || !data?.ok) {
      setAddError(rpcErrorMessage(data?.error ?? error?.message))
      return
    }

    setRequiresSetupCode(data.requires_setup_code !== false)
    if (data.is_claimed) {
      setAddStep('login')
    } else if (data.requires_setup_code !== false) {
      setAddStep('verify_setup')
    } else {
      setAddStep('activate')
    }
  }

  async function handleLoginNewQr(e: FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!password) {
      setAddError('Enter the password for this QR code.')
      return
    }
    const norm = normalizeQrNumber(newQrNumber)
    setAddBusy(true)
    const { data, error } = await supabase.rpc('customer_login_qr', {
      p_qr_number: norm,
      p_password: password,
    })
    setAddBusy(false)

    if (error || !data?.ok || !data?.session_token) {
      setAddError(rpcErrorMessage(data?.error ?? error?.message))
      return
    }

    registerQrSessionInVault(norm, data.session_token as string, newQrLabel)
    resetAddForm()
    await refreshSummaries()
  }

  async function handleVerifySetupNewQr(e: FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!setupCode.trim()) {
      setAddError('Enter the packaging setup code.')
      return
    }
    const norm = normalizeQrNumber(newQrNumber)
    setAddBusy(true)
    const { data, error } = await supabase.rpc('verify_setup_code', {
      p_qr_number: norm,
      p_setup_code: setupCode.trim(),
    })
    setAddBusy(false)

    if (error || !data?.ok) {
      setAddError(rpcErrorMessage(data?.error ?? error?.message))
      return
    }
    setAddStep('activate')
  }

  async function handleActivateNewQr(e: FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!isValidPassword(password)) {
      setAddError('Password must be at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setAddError('Passwords do not match.')
      return
    }
    const norm = normalizeQrNumber(newQrNumber)
    setAddBusy(true)
    const { data, error } = await supabase.rpc('customer_claim_qr', {
      p_qr_number: norm,
      p_setup_code: requiresSetupCode ? setupCode.trim() : null,
      p_new_password: password,
      p_destination_url: null,
      p_owner_email: null,
      p_usage_type: null,
    })
    setAddBusy(false)

    if (error || !data?.ok || !data?.session_token) {
      setAddError(rpcErrorMessage(data?.error ?? error?.message))
      return
    }

    registerQrSessionInVault(norm, data.session_token as string, newQrLabel)
    resetAddForm()
    await refreshSummaries()
  }

  function handleSaveLabel(qrNumber: string) {
    updateQrLabelInVault(qrNumber, labelInput)
    setItems((prev) =>
      prev.map((item) =>
        item.qr_number === qrNumber ? { ...item, label: labelInput.trim() || undefined } : item,
      ),
    )
    setEditingLabelQr(null)
  }

  function handleRemoveQr(qrNumber: string) {
    removeQrFromVault(qrNumber)
    if (qrNumber.toUpperCase() === activeQrNumber.toUpperCase()) {
      onClose()
      onLogoutAll()
      return
    }
    setItems((prev) => prev.filter((item) => item.qr_number !== qrNumber))
  }

  function handleSignOutAll() {
    clearAllMultiQrVaultSessions()
    onClose()
    onLogoutAll()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Multi-QR Management"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-surface-border bg-white p-5 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-ink tracking-tight">
                Multi-QR Management
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Switch between your authenticated QR codes (Profile QR, Reviews QR, WhatsApp QR, Menu QR) in one secure workspace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-zinc-100"
            aria-label="Close Multi-QR Manager"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 flex items-start gap-2 text-xs text-emerald-900">
          <Shield className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
          <span>
            Each QR code requires its own password or packaging setup code to unlock. Sessions are server-verified and stored only in this browser tab.
          </span>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddStep(addStep === 'closed' ? 'lookup' : 'closed')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Another QR</span>
            </button>
            <button
              type="button"
              onClick={refreshSummaries}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleSignOutAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock All QRs</span>
            </button>
          )}
        </div>

        {/* Connect Another QR Inline Wizard */}
        {addStep !== 'closed' && (
          <div className="rounded-2xl border border-electric/30 bg-electric/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-electric flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>Unlock &amp; Add QR to Workspace</span>
              </p>
              <button
                type="button"
                onClick={resetAddForm}
                className="text-xs font-semibold text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>

            {addStep === 'lookup' && (
              <form onSubmit={handleLookupNewQr} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-muted uppercase">
                      QR Number *
                    </label>
                    <input
                      value={newQrNumber}
                      onChange={(e) => setNewQrNumber(normalizeQrNumber(e.target.value))}
                      placeholder="e.g. TF-1002"
                      className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-muted uppercase">
                      Workspace Tag (Optional)
                    </label>
                    <input
                      value={newQrLabel}
                      onChange={(e) => setNewQrLabel(e.target.value)}
                      maxLength={40}
                      placeholder="e.g. Reviews QR, Menu QR"
                      className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs text-ink focus:border-electric focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABELS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewQrLabel(preset)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                        newQrLabel === preset
                          ? 'border-electric bg-electric/10 text-electric'
                          : 'border-zinc-200 bg-white text-ink-muted hover:border-zinc-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                {addError && <p className="text-xs text-rose-600 font-medium">{addError}</p>}
                <button
                  type="submit"
                  disabled={addBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-electric px-4 py-2 text-xs font-bold text-white hover:bg-electric-hover disabled:opacity-60"
                >
                  {addBusy && <Spinner size={13} />}
                  <span>Verify QR Number</span>
                </button>
              </form>
            )}

            {addStep === 'login' && (
              <form onSubmit={handleLoginNewQr} className="space-y-3">
                <p className="text-xs text-ink-muted">
                  Enter the password for <strong className="font-mono text-ink">{newQrNumber}</strong> to unlock it.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter QR password"
                  autoFocus
                  className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
                />
                {addError && <p className="text-xs text-rose-600 font-medium">{addError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={addBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-electric px-4 py-2 text-xs font-bold text-white hover:bg-electric-hover disabled:opacity-60"
                  >
                    {addBusy && <Spinner size={13} />}
                    <Lock className="h-3.5 w-3.5" />
                    <span>Unlock &amp; Add QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddStep('lookup')
                      setAddError(null)
                    }}
                    className="text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {addStep === 'verify_setup' && (
              <form onSubmit={handleVerifySetupNewQr} className="space-y-3">
                <p className="text-xs text-ink-muted">
                  <strong className="font-mono text-ink">{newQrNumber}</strong> is unclaimed. Enter its Packaging Setup Code.
                </p>
                <input
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder="Packaging Setup Code"
                  autoFocus
                  className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
                />
                {addError && <p className="text-xs text-rose-600 font-medium">{addError}</p>}
                <button
                  type="submit"
                  disabled={addBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {addBusy && <Spinner size={13} />}
                  <span>Verify Setup Code</span>
                </button>
              </form>
            )}

            {addStep === 'activate' && (
              <form onSubmit={handleActivateNewQr} className="space-y-3">
                <p className="text-xs text-ink-muted">
                  Set a password to claim <strong className="font-mono text-ink">{newQrNumber}</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-xl border border-surface-border bg-white px-3 py-2 text-xs font-mono text-ink focus:border-electric focus:outline-none"
                  />
                </div>
                {addError && <p className="text-xs text-rose-600 font-medium">{addError}</p>}
                <button
                  type="submit"
                  disabled={addBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {addBusy && <Spinner size={13} />}
                  <span>Claim &amp; Add to Workspace</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Unlocked QR Cards */}
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={24} className="text-electric" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-xs text-ink-muted">
            No unlocked QR sessions found. Click <strong>Connect Another QR</strong> to add a QR code.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isCurrent = item.qr_number.toUpperCase() === activeQrNumber.toUpperCase()
              const isProfileMode =
                item.usage_type === 'personal' || item.usage_type === 'business_profile'
              const liveTarget = isProfileMode
                ? profilePublicUrl(item.public_slug || item.qr_number)
                : item.destination_url || qrPublicUrl(item.qr_number)

              return (
                <div
                  key={item.qr_number}
                  className={`rounded-2xl border p-4 transition-all ${
                    isCurrent
                      ? 'border-electric bg-electric/[0.04] shadow-2xs'
                      : 'border-surface-border bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-ink">
                          {item.qr_number}
                        </span>
                        {item.label && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                            <Tag className="h-2.5 w-2.5" />
                            {item.label}
                          </span>
                        )}
                        <ModeBadge usageType={item.usage_type} />
                        {isCurrent && (
                          <span className="rounded-full bg-electric text-white px-2 py-0.5 text-[10px] font-bold">
                            Editing Now
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-ink truncate">
                        {item.profile_name || item.business_name || item.qr_name}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
                        <a
                          href={liveTarget}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-electric hover:underline truncate max-w-[260px]"
                        >
                          <span className="truncate">
                            {isProfileMode
                              ? `/p/${item.public_slug || item.qr_number}`
                              : item.destination_url || 'Destination pending'}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <span>· {item.scan_count} scans</span>
                        {isProfileMode && <span>· {item.active_links_count} active links</span>}
                      </div>

                      {editingLabelQr === item.qr_number && (
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            value={labelInput}
                            onChange={(e) => setLabelInput(e.target.value)}
                            maxLength={40}
                            placeholder="Tag (e.g. Reviews QR)"
                            className="rounded-lg border border-surface-border px-2.5 py-1 text-xs text-ink focus:border-electric focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveLabel(item.qr_number)}
                            className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLabelQr(null)}
                            className="text-[11px] text-ink-muted hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLabelQr(item.qr_number)
                          setLabelInput(item.label || '')
                        }}
                        title="Set Workspace Tag"
                        className="rounded-xl border border-surface-border p-2 text-ink-muted hover:text-ink hover:bg-zinc-50"
                      >
                        <Tag className="h-3.5 w-3.5" />
                      </button>

                      {!isCurrent && (
                        <button
                          type="button"
                          disabled={switchingQr === item.qr_number}
                          onClick={async () => {
                            setSwitchingQr(item.qr_number)
                            await onSwitchQr(item.qr_number, item.session_token)
                            setSwitchingQr(null)
                            onClose()
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-electric px-3 py-2 text-xs font-bold text-white hover:bg-electric-hover disabled:opacity-60"
                        >
                          {switchingQr === item.qr_number ? (
                            <Spinner size={12} />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5" />
                          )}
                          <span>Open Editor</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveQr(item.qr_number)}
                        title="Lock & remove from workspace"
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ModeBadge({ usageType }: { usageType: MultiQrSummaryItem['usage_type'] }) {
  if (usageType === 'personal') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
        <User className="h-2.5 w-2.5" /> Personal Profile
      </span>
    )
  }
  if (usageType === 'business_profile') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
        <Briefcase className="h-2.5 w-2.5" /> Business Profile
      </span>
    )
  }
  if (usageType === 'business') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold">
        <Building2 className="h-2.5 w-2.5" /> Direct Link
      </span>
    )
  }
  return (
    <span className="rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5 text-[10px] font-bold">
      Setup Pending
    </span>
  )
}

