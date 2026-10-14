import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  QrCode,
  Link2,
  Lock,
  Tag,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  isValidQrNumber,
  normalizeDestinationUrl,
  normalizeQrNumber,
} from '../../lib/validation'
import { rpcErrorMessage } from '../../types'
import { downloadSingleQr, generateQrDataUrl } from '../../lib/qr'
import { qrPublicUrl } from '../../lib/config'
import { invalidateAdminQrCache } from '../../lib/cache'
import { Spinner } from '../../components/Spinner'

export function CreateQR() {
  const [qrNumber, setQrNumber] = useState('')
  const [qrName, setQrName] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ qr_number: string; setup_code: string } | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Initialize with a clean auto-generated setup code
  useEffect(() => {
    if (!password) {
      setPassword('TF-' + Math.random().toString(36).slice(2, 6).toUpperCase())
    }
  }, [])

  useEffect(() => {
    if (!created) {
      setPreviewDataUrl(null)
      return
    }
    generateQrDataUrl(created.qr_number).then(setPreviewDataUrl)
  }, [created])

  function validate(urlValue: string): boolean {
    const errors: Record<string, string> = {}
    if (!isValidQrNumber(qrNumber)) errors.qrNumber = 'Use letters, numbers, hyphens or underscores only.'
    if (!qrName.trim()) errors.qrName = 'QR name is required.'
    if (urlValue && !isValidDestinationUrl(urlValue)) errors.destinationUrl = 'Please enter a valid URL.'
    if (!isValidPassword(password)) errors.password = 'Setup code must be at least 4 characters.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setCreated(null)

    const trimmedUrl = normalizeDestinationUrl(destinationUrl)
    setDestinationUrl(trimmedUrl)
    if (!validate(trimmedUrl)) return

    setSubmitting(true)

    if (trimmedUrl) {
      const reachable = await isUrlReachable(trimmedUrl)
      if (!reachable) {
        setSubmitting(false)
        setFieldErrors((prev) => ({ ...prev, destinationUrl: "We couldn't open this link. Please double-check it." }))
        return
      }
    }

    const { data, error } = await supabase.rpc('admin_create_single_qr', {
      p_qr_number: normalizeQrNumber(qrNumber),
      p_qr_name: qrName.trim(),
      p_destination_url: trimmedUrl,
      p_password: password.trim(),
      p_status: status,
    })
    setSubmitting(false)

    if (error || !data?.ok) {
      setFormError(rpcErrorMessage(data?.error ?? error?.message))
      return
    }
    invalidateAdminQrCache()
    setCreated({ qr_number: data.qr_number, setup_code: password.trim() })
  }

  async function handleCopy() {
    if (!created) return
    await navigator.clipboard.writeText(qrPublicUrl(created.qr_number))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function resetForm() {
    setQrNumber('')
    setQrName('')
    setDestinationUrl('')
    setPassword('TF-' + Math.random().toString(36).slice(2, 6).toUpperCase())
    setStatus('active')
    setFieldErrors({})
    setFormError(null)
    setCreated(null)
  }

  if (created) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="theme-card rounded-2xl border p-6 sm:p-8 text-center shadow-xl transition-all">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="theme-text-main mt-4 text-xl font-bold">QR Code Created!</h1>
          <p className="theme-text-muted mt-1 text-sm font-mono font-medium">
            {created.qr_number} is ready to print & deploy.
          </p>

          {/* Setup Code Notice for Packaging */}
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700">Packaging Setup Code:</span>
              <span className="font-mono font-extrabold text-sm tracking-wider text-amber-950">{created.setup_code}</span>
            </div>
            <p className="text-[11px] text-amber-800/80 mt-1">
              Print or write this code on the welcome slip inside the box. Customer will use it once to activate their card and set their own password.
            </p>
          </div>

          {previewDataUrl ? (
            <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white p-3 shadow-inner">
              <img
                src={previewDataUrl}
                alt={`QR code for ${created.qr_number}`}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white p-3">
              <Spinner size={32} className="text-brand-600" />
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="theme-text-muted mt-3.5 inline-flex items-center gap-1.5 break-all text-xs font-medium hover:text-brand-500 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied link!' : qrPublicUrl(created.qr_number)}</span>
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => downloadSingleQr(created.qr_number, 'png')}
              className="theme-subtle inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-hover transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => downloadSingleQr(created.qr_number, 'svg')}
              className="theme-subtle inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-hover transition-colors"
            >
              <Download className="h-4 w-4" />
              Download SVG
            </button>
          </div>

          <div className="theme-border mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 border-t pt-5 text-sm">
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Create Another QR
            </button>
            <span className="theme-text-muted hidden sm:inline opacity-40">•</span>
            <Link
              to="/admin/manage"
              className="theme-text-muted w-full sm:w-auto font-medium hover:text-white"
            >
              Go to Manage QR
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/20">
            <PlusCircle className="h-4.5 w-4.5" />
          </span>
          <h1 className="theme-text-main text-xl sm:text-2xl font-bold tracking-tight">
            Create Single QR
          </h1>
        </div>
        <p className="theme-text-muted mt-1 text-xs sm:text-sm">
          Create an individual dynamic QR code with password protection.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="theme-card space-y-4 rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors"
      >
        <Field label="QR Number" icon={QrCode} error={fieldErrors.qrNumber}>
          <input
            value={qrNumber}
            onChange={(e) => setQrNumber(e.target.value)}
            placeholder="e.g. Z100"
            className={inputClass(!!fieldErrors.qrNumber)}
          />
        </Field>

        <Field label="QR Name" icon={Tag} error={fieldErrors.qrName}>
          <input
            value={qrName}
            onChange={(e) => setQrName(e.target.value)}
            placeholder="e.g. Rooftop Restaurant Menu"
            className={inputClass(!!fieldErrors.qrName)}
          />
        </Field>

        <Field label="Destination Link (optional)" icon={Link2} error={fieldErrors.destinationUrl}>
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            className={inputClass(!!fieldErrors.destinationUrl)}
          />
          <p className="theme-text-muted mt-1.5 text-xs">
            Leave blank to let whoever scans this QR first set the destination themselves.
          </p>
        </Field>

        <Field label="Initial Setup Code (Packaging Slip)" icon={Lock} error={fieldErrors.password}>
          <div className="flex gap-2">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. TF-XXXX"
              className={inputClass(!!fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => setPassword('TF-' + Math.random().toString(36).slice(2, 6).toUpperCase())}
              className="theme-subtle px-3 py-2 rounded-xl border text-xs font-semibold theme-hover shrink-0 transition-colors"
              title="Generate a random setup code"
            >
              Generate
            </button>
          </div>
          <p className="theme-text-muted mt-1.5 text-xs">
            Print this on the delivery slip inside the box. Customer uses this once upon first scan to claim the card and set their own password.
          </p>
        </Field>

        <div>
          <label className="theme-text-main mb-1.5 block text-xs font-semibold uppercase tracking-wider">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            className={inputClass(false)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60 transition-all hover:scale-[1.01]"
        >
          {submitting && <Spinner size={16} />}
          {submitting ? 'Creating QR...' : 'Create QR Code'}
        </button>
      </form>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="theme-text-main mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        {Icon && <Icon className="theme-text-muted h-3.5 w-3.5" />}
        <span>{label}</span>
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return `theme-input w-full rounded-xl border px-3.5 py-2.5 text-sm transition-colors focus:border-brand-500 ${
    hasError
      ? 'border-rose-500'
      : ''
  }`
}
