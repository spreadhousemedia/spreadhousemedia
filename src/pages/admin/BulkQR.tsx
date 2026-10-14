import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  CheckCircle2,
  Download,
  KeyRound,
  FileSpreadsheet,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Printer,
  Radio,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  isUrlReachable,
  isValidDestinationUrl,
  isValidPassword,
  normalizeDestinationUrl,
  SERIES_PREFIX_PATTERN,
} from '../../lib/validation'
import { rpcErrorMessage, type PasswordMode } from '../../types'
import { downloadBulkQrPdf, downloadBulkQrZip } from '../../lib/qr'
import { downloadPasswordsCsv, downloadNfcEncodingCsv } from '../../lib/csv'
import { invalidateAdminQrCache } from '../../lib/cache'
import { Spinner } from '../../components/Spinner'

type Stage = 'form' | 'preview' | 'result'

interface PreviewData {
  total: number
  first: string
  last: string
}

interface ResultData {
  batch_id: string
  total: number
  password_mode: PasswordMode
  passwords: { qr_number: string; password: string }[] | null
}

export function BulkQR() {
  const [stage, setStage] = useState<Stage>('form')
  const [batchName, setBatchName] = useState('')
  const [seriesPrefix, setSeriesPrefix] = useState('')
  const [startNumber, setStartNumber] = useState('')
  const [endNumber, setEndNumber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [printLimit, setPrintLimit] = useState<number | 'all'>('all')
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('common')
  const [commonPassword, setCommonPassword] = useState('')
  const [defaultUrl, setDefaultUrl] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<string[] | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ResultData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null)

  function handleStartNumberChange(val: string) {
    setStartNumber(val)
    if (/^\d+$/.test(val.trim())) {
      const s = parseInt(val.trim(), 10)
      if (/^\d+$/.test(quantity.trim())) {
        const q = parseInt(quantity.trim(), 10)
        if (q > 0) {
          setEndNumber(String(s + q - 1).padStart(val.length, '0'))
        }
      } else if (/^\d+$/.test(endNumber.trim())) {
        const e = parseInt(endNumber.trim(), 10)
        if (e >= s) {
          setQuantity(String(e - s + 1))
        }
      }
    }
  }

  function handleQuantityChange(val: string) {
    setQuantity(val)
    if (/^\d+$/.test(val.trim())) {
      const q = parseInt(val.trim(), 10)
      const sStr = startNumber.trim() || '1'
      if (!startNumber.trim()) {
        setStartNumber('1')
      }
      const s = parseInt(sStr, 10)
      if (q > 0) {
        setEndNumber(String(s + q - 1).padStart(sStr.length, '0'))
      }
    }
  }

  function handleEndNumberChange(val: string) {
    setEndNumber(val)
    if (/^\d+$/.test(val.trim()) && /^\d+$/.test(startNumber.trim())) {
      const s = parseInt(startNumber.trim(), 10)
      const e = parseInt(val.trim(), 10)
      if (e >= s) {
        setQuantity(String(e - s + 1))
      }
    }
  }

  function applyQuantityPreset(qty: number) {
    const qStr = String(qty)
    setQuantity(qStr)
    const sStr = startNumber.trim() || '1'
    if (!startNumber.trim()) {
      setStartNumber('1')
    }
    const s = parseInt(sStr, 10)
    setEndNumber(String(s + qty - 1).padStart(sStr.length, '0'))
  }

  function validate(urlValue: string): boolean {
    const errors: Record<string, string> = {}
    if (!batchName.trim()) errors.batchName = 'Batch name is required.'
    if (!SERIES_PREFIX_PATTERN.test(seriesPrefix.trim())) errors.seriesPrefix = '1-10 letters/numbers only.'
    if (!/^\d+$/.test(startNumber.trim())) errors.startNumber = 'Numbers only.'
    if (!/^\d+$/.test(endNumber.trim())) errors.endNumber = 'Numbers only.'
    if (
      /^\d+$/.test(startNumber.trim()) &&
      /^\d+$/.test(endNumber.trim()) &&
      parseInt(startNumber, 10) > parseInt(endNumber, 10)
    ) {
      errors.endNumber = 'End number must be greater than or equal to start number.'
    }
    if (passwordMode === 'common' && !isValidPassword(commonPassword)) {
      errors.commonPassword = 'Password must be at least 4 characters.'
    }
    if (urlValue && !isValidDestinationUrl(urlValue)) {
      errors.defaultUrl = 'Please enter a valid URL.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function runBatch(dryRun: boolean, urlValue: string) {
    const { data, error } = await supabase.rpc('admin_create_batch', {
      p_batch_name: batchName.trim(),
      p_series_prefix: seriesPrefix.trim().toUpperCase(),
      p_start_number: startNumber.trim(),
      p_end_number: endNumber.trim(),
      p_password_mode: passwordMode,
      p_common_password: passwordMode === 'common' ? commonPassword : null,
      p_default_url: urlValue || null,
      p_dry_run: dryRun,
    })
    return { data, error }
  }

  async function handlePreviewSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setConflicts(null)

    const normalizedUrl = normalizeDestinationUrl(defaultUrl)
    setDefaultUrl(normalizedUrl)
    if (!validate(normalizedUrl)) return

    setSubmitting(true)

    if (normalizedUrl) {
      const reachable = await isUrlReachable(normalizedUrl)
      if (!reachable) {
        setSubmitting(false)
        setFieldErrors((prev) => ({ ...prev, defaultUrl: "We couldn't open this link. Please double-check it." }))
        return
      }
    }

    const { data, error } = await runBatch(true, normalizedUrl)
    setSubmitting(false)

    if (error || !data?.ok) {
      if (data?.error === 'duplicates') {
        setConflicts(data.conflicts ?? [])
        setFormError(`${data.conflicts?.length ?? 0} QR number(s) in this range already exist.`)
      } else {
        setFormError(rpcErrorMessage(data?.error ?? error?.message))
      }
      return
    }
    setPreview({ total: data.total, first: data.first, last: data.last })
    setStage('preview')
  }

  async function handleConfirmGenerate() {
    setSubmitting(true)
    setFormError(null)
    const { data, error } = await runBatch(false, normalizeDestinationUrl(defaultUrl))
    setSubmitting(false)

    if (error || !data?.ok) {
      setFormError(rpcErrorMessage(data?.error ?? error?.message))
      setStage('form')
      return
    }
    invalidateAdminQrCache()
    setResult({
      batch_id: data.batch_id,
      total: data.total,
      password_mode: data.password_mode,
      passwords: data.passwords ?? null,
    })
    setStage('result')
  }

  async function getBatchQrNumbers(): Promise<string[]> {
    if (!result) return []
    const { data } = await supabase
      .from('qr_codes')
      .select('qr_number')
      .eq('batch_id', result.batch_id)
      .order('qr_number')
    return ((data as any[]) ?? []).map((r) => r.qr_number as string)
  }

  async function handleBulkDownload(format: 'png' | 'svg' | 'pdf') {
    try {
      let numbers = await getBatchQrNumbers()
      if (numbers.length === 0) return
      if (printLimit !== 'all' && typeof printLimit === 'number' && printLimit > 0) {
        numbers = numbers.slice(0, printLimit)
      }
      setDownloadProgress({ done: 0, total: numbers.length })
      const baseName = batchName.trim().replace(/\s+/g, '_')
      if (format === 'pdf') {
        await downloadBulkQrPdf(numbers, `${baseName}_print_${numbers.length}.pdf`, (done, total) => setDownloadProgress({ done, total }))
      } else {
        await downloadBulkQrZip(numbers, format, `${baseName}_${format}.zip`, (done, total) =>
          setDownloadProgress({ done, total }),
        )
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed. Please try again.')
    } finally {
      setDownloadProgress(null)
    }
  }

  async function handleNfcEncodingDownload() {
    try {
      let numbers = await getBatchQrNumbers()
      if (numbers.length === 0) return
      if (printLimit !== 'all' && typeof printLimit === 'number' && printLimit > 0) {
        numbers = numbers.slice(0, printLimit)
      }
      const baseName = batchName.trim().replace(/\s+/g, '_')
      const rows = numbers.map((num) => ({
        serial_number: num,
        label: `${batchName} #${num}`,
      }))
      await downloadNfcEncodingCsv(rows, `${baseName}_nfc_manufacturing_${numbers.length}.csv`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'NFC export failed. Please try again.')
    }
  }

  function resetAll() {
    setStage('form')
    setBatchName('')
    setSeriesPrefix('')
    setStartNumber('')
    setEndNumber('')
    setQuantity('')
    setPrintLimit('all')
    setPasswordMode('common')
    setCommonPassword('')
    setDefaultUrl('')
    setFieldErrors({})
    setFormError(null)
    setConflicts(null)
    setPreview(null)
    setResult(null)
  }

  if (stage === 'result' && result) {
    const selectedPrintCount = printLimit === 'all' ? result.total : Math.min(Number(printLimit), result.total)

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="theme-card rounded-2xl border p-6 sm:p-8 text-center shadow-xl transition-all">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="theme-text-main mt-4 text-xl sm:text-2xl font-bold">
            {result.total} Codes Generated
          </h1>
          <p className="theme-text-muted mt-1 text-sm">
            Batch "{batchName}" is successfully created and ready to manufacture &amp; print.
          </p>

          {/* Quantity to Print Selector */}
          <div className="mt-5 rounded-2xl border border-brand-200/60 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-500/5 p-4 text-left">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold theme-text-main flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Quantity to Print / Encode:
              </span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                {selectedPrintCount} Cards / Standees
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPrintLimit('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                  printLimit === 'all'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'theme-subtle theme-hover'
                }`}
              >
                All {result.total} Codes
              </button>
              {result.total > 20 && (
                <button
                  type="button"
                  onClick={() => setPrintLimit(20)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                    printLimit === 20
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'theme-subtle theme-hover'
                  }`}
                >
                  First 20 (Test Sheet)
                </button>
              )}
              {result.total > 50 && (
                <button
                  type="button"
                  onClick={() => setPrintLimit(50)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                    printLimit === 50
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'theme-subtle theme-hover'
                  }`}
                >
                  First 50
                </button>
              )}
              {result.total > 100 && (
                <button
                  type="button"
                  onClick={() => setPrintLimit(100)}
                  className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                    printLimit === 100
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'theme-subtle theme-hover'
                  }`}
                >
                  First 100
                </button>
              )}
            </div>
          </div>

          {/* NFC Chip Manufacturing Export */}
          <div className="mt-4 p-3.5 rounded-2xl border border-cyan-200 dark:border-cyan-500/20 bg-cyan-50/60 dark:bg-cyan-500/5 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                NFC Chip Manufacturing Specification:
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200">
                NTAG213 / NTAG215 / NTAG216
              </span>
            </div>
            <p className="text-[11px] text-cyan-800/80 dark:text-cyan-300/70 mb-2.5">
              CSV mapping each card's serial to its dynamic redirect URL (<code className="font-mono">spreadnfc.in/q/SERIAL</code>). Load this directly into your batch writer machine or desktop encoder.
            </p>
            <button
              type="button"
              onClick={handleNfcEncodingDownload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-colors"
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Download NFC Encoding CSV ({selectedPrintCount} Cards)</span>
            </button>
          </div>

          {result.password_mode === 'unique' && result.passwords && (
            <button
              type="button"
              onClick={() =>
                downloadPasswordsCsv(result.passwords!, `${batchName.trim().replace(/\s+/g, '_')}_passwords.csv`)
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Download Packaging Setup Codes CSV (For Welcome Slips)</span>
            </button>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleBulkDownload('pdf')}
              disabled={!!downloadProgress}
              className="sm:col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 transition-all disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              Print PDF Sheet ({selectedPrintCount} Standees)
            </button>

            <button
              type="button"
              onClick={() => handleBulkDownload('png')}
              disabled={!!downloadProgress}
              className="theme-subtle inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover transition-colors disabled:opacity-60 sm:col-span-1"
            >
              <Download className="h-3.5 w-3.5" />
              PNG ZIP
            </button>
            <button
              type="button"
              onClick={() => handleBulkDownload('svg')}
              disabled={!!downloadProgress}
              className="theme-subtle inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover transition-colors disabled:opacity-60 sm:col-span-1"
            >
              <Download className="h-3.5 w-3.5" />
              SVG ZIP
            </button>
            <button
              type="button"
              onClick={() => handleBulkDownload('pdf')}
              disabled={!!downloadProgress}
              className="theme-subtle inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover transition-colors disabled:opacity-60 sm:col-span-1"
            >
              <Download className="h-3.5 w-3.5" />
              Raw PDF
            </button>
          </div>

          {downloadProgress && (
            <p className="theme-text-muted mt-4 flex items-center justify-center gap-2 text-xs">
              <Spinner size={14} className="text-brand-600" />
              Generating export {downloadProgress.done} of {downloadProgress.total}...
            </p>
          )}

          <div className="theme-border mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 border-t pt-5 text-sm">
            <button
              type="button"
              onClick={resetAll}
              className="w-full sm:w-auto font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Create Another Batch
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

  if (stage === 'preview' && preview) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="theme-text-main text-xl sm:text-2xl font-bold tracking-tight">
            Confirm Bulk Generation
          </h1>
          <p className="theme-text-muted mt-1 text-xs sm:text-sm">
            Review the series configuration before writing records to the database.
          </p>
        </div>

        <div className="theme-card space-y-4 rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors text-sm">
          <SummaryRow label="Batch Name" value={batchName} />
          <SummaryRow label="Series Range" value={`${preview.first} – ${preview.last}`} mono />
          <SummaryRow label="Quantity to Print" value={`${preview.total} Standees`} />
          <SummaryRow
            label="Password Mode"
            value={passwordMode === 'common' ? 'Same Password For All' : 'Auto Generate Unique Passwords'}
          />
          <SummaryRow
            label="Default URL"
            value={defaultUrl.trim() || 'Not set — first scan will prompt for destination link'}
          />

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setStage('form')}
              disabled={submitting}
              className="theme-subtle inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold theme-hover transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmGenerate}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60 transition-all hover:scale-[1.01]"
            >
              {submitting && <Spinner size={16} />}
              {submitting ? `Generating ${preview.total} QR codes...` : `Confirm & Generate (${preview.total} Codes)`}
            </button>
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
            <Layers className="h-4.5 w-4.5" />
          </span>
          <h1 className="theme-text-main text-xl sm:text-2xl font-bold tracking-tight">
            Create Bulk QR
          </h1>
        </div>
        <p className="theme-text-muted mt-1 text-xs sm:text-sm">
          Generate large batches of consecutive QR codes with unique or common passwords.
        </p>
      </div>

      <form
        onSubmit={handlePreviewSubmit}
        noValidate
        className="theme-card space-y-4 rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors"
      >
        <Field label="Batch Name" error={fieldErrors.batchName}>
          <input
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. September Restaurant Batch"
            className={inputClass(!!fieldErrors.batchName)}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Series Prefix" error={fieldErrors.seriesPrefix}>
            <input
              value={seriesPrefix}
              onChange={(e) => setSeriesPrefix(e.target.value)}
              placeholder="e.g. Z or TABLE"
              className={inputClass(!!fieldErrors.seriesPrefix)}
            />
          </Field>
          <Field label="Start Number" error={fieldErrors.startNumber}>
            <input
              value={startNumber}
              onChange={(e) => handleStartNumberChange(e.target.value)}
              placeholder="100"
              className={inputClass(!!fieldErrors.startNumber)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quantity to Print / Generate" error={fieldErrors.quantity}>
            <input
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="e.g. 300"
              className={inputClass(!!fieldErrors.quantity)}
            />
            {/* Quick Presets */}
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className="theme-text-muted">Presets:</span>
              {[50, 100, 250, 500].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => applyQuantityPreset(qty)}
                  className="rounded-md border px-2 py-0.5 font-medium theme-subtle theme-hover hover:border-brand-500 transition-colors"
                >
                  +{qty}
                </button>
              ))}
            </div>
          </Field>

          <Field label="End Number (Auto-calculated)" error={fieldErrors.endNumber}>
            <input
              value={endNumber}
              onChange={(e) => handleEndNumberChange(e.target.value)}
              placeholder="399"
              className={inputClass(!!fieldErrors.endNumber)}
            />
          </Field>
        </div>

        {seriesPrefix && startNumber && endNumber && !fieldErrors.seriesPrefix && !fieldErrors.startNumber && !fieldErrors.endNumber && (
          <div className="theme-subtle rounded-xl p-3 text-xs theme-text-muted font-mono border flex items-center justify-between">
            <span>
              Preview Range: <strong className="theme-text-main">{seriesPrefix.toUpperCase()}{startNumber.padStart(startNumber.length, '0')} … {seriesPrefix.toUpperCase()}{endNumber}</strong>
            </span>
            <span className="font-bold text-brand-600 dark:text-brand-400">
              Total: {parseInt(endNumber, 10) - parseInt(startNumber, 10) + 1} Standees
            </span>
          </div>
        )}

        <div>
          <label className="theme-text-main mb-2 block text-xs font-semibold uppercase tracking-wider">
            Initial Setup Code Mode (For Packaging Slips)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPasswordMode('unique')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                passwordMode === 'unique'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'theme-subtle theme-hover'
              }`}
            >
              <KeyRound className="h-4 w-4 shrink-0 mt-0.5 text-brand-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="theme-text-main text-xs font-bold block">Unique Codes</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Recommended</span>
                </div>
                <span className="theme-text-muted text-[11px]">Separate code per card slip</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPasswordMode('common')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                passwordMode === 'common'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'theme-subtle theme-hover'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-brand-500" />
              <div>
                <span className="theme-text-main text-xs font-bold block">Shared Setup Code</span>
                <span className="theme-text-muted text-[11px]">For single client / internal team</span>
              </div>
            </button>
          </div>
        </div>

        {passwordMode === 'common' && (
          <Field label="Common Setup Code" error={fieldErrors.commonPassword}>
            <input
              value={commonPassword}
              onChange={(e) => setCommonPassword(e.target.value)}
              placeholder="e.g. TF-BATCH-SETUP"
              className={inputClass(!!fieldErrors.commonPassword)}
            />
            <p className="theme-text-muted mt-1 text-[11px]">
              This setup code will be printed on all slips in this batch.
            </p>
          </Field>
        )}

        {passwordMode === 'unique' && (
          <p className="rounded-xl border border-brand-200/80 dark:border-brand-500/20 bg-brand-50/70 dark:bg-brand-500/10 p-3 text-xs text-brand-800 dark:text-brand-300">
            A unique random Setup Code will be generated for each card in this batch. You will receive a CSV download button to print welcome slips for your delivery boxes. Customers will use their code to claim the card and set their own private password.
          </p>
        )}

        <Field label="Default Destination URL (optional)" error={fieldErrors.defaultUrl}>
          <input
            value={defaultUrl}
            onChange={(e) => setDefaultUrl(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            className={inputClass(!!fieldErrors.defaultUrl)}
          />
          <p className="theme-text-muted mt-1.5 text-xs">
            Leave blank so each QR's first scanner sets the destination. Fill in only if the whole batch shares one URL.
          </p>
        </Field>

        {formError && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </p>
            {conflicts && conflicts.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px]">
                {conflicts.slice(0, 8).map((c) => (
                  <li key={c}>{c} already exists</li>
                ))}
                {conflicts.length > 8 && <li>and {conflicts.length - 8} more…</li>}
              </ul>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60 transition-all hover:scale-[1.01]"
        >
          {submitting && <Spinner size={16} />}
          {submitting ? 'Checking range...' : 'Review Batch'}
        </button>
      </form>
    </div>
  )
}

function SummaryRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="theme-border flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <span className="theme-text-muted">{label}</span>
      <span className={`theme-text-main text-right font-semibold ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="theme-text-main mb-1.5 block text-xs font-semibold uppercase tracking-wider">
        {label}
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
