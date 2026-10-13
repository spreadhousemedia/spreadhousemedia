import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { parseCsvFile, downloadSampleCsv, type CsvRawRow } from '../../lib/csv'
import { normalizeDestinationUrl } from '../../lib/validation'
import { invalidateAdminQrCache } from '../../lib/cache'
import { Spinner } from '../../components/Spinner'

type Stage = 'upload' | 'preview' | 'result'

interface CsvError {
  row: number
  qr_number?: string
  error: string
}

interface PreviewData {
  total: number
  valid_count: number
  error_count: number
  errors: CsvError[]
}

interface ResultData {
  created: number
  error_count: number
  errors: CsvError[]
}

const ERROR_LABELS: Record<string, string> = {
  missing_qr_number: 'Missing QR number',
  invalid_url: 'Invalid URL',
  invalid_password: 'Password too short (min 4 characters)',
  duplicate_in_file: 'Duplicate QR number within this file',
  already_exists: 'QR number already exists',
}

const CHUNK_SIZE = 250

export function UploadCSV() {
  const [stage, setStage] = useState<Stage>('upload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<CsvRawRow[]>([])
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(false)
  const [progressText, setProgressText] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [templateDownloaded, setTemplateDownloaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true)
    setError(null)
    try {
      await downloadSampleCsv()
      setTemplateDownloaded(true)
      setTimeout(() => setTemplateDownloaded(false), 3000)
    } catch {
      setError('Could not trigger CSV template download. Please try again.')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    setProgressText(null)
    if (/\.(pdf)$/i.test(file.name)) {
      setError(
        'PDF files cannot be edited as spreadsheets. To bulk import QR codes, please click "Download Sample CSV Template" below, edit your records in Excel or Google Sheets, and upload the .csv file.'
      )
      return
    }
    if (/\.(json)$/i.test(file.name)) {
      setError(
        'This is a JSON database backup. To restore database records from a JSON file, please use the Data Backup & Migration tool.'
      )
      return
    }
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setError('Please upload a valid .csv spreadsheet file.')
      return
    }
    setFileName(file.name)
    setLoading(true)
    try {
      const parsed = await parseCsvFile(file)
      const normalized = parsed.map((row) =>
        row.destination_url ? { ...row, destination_url: normalizeDestinationUrl(row.destination_url) } : row,
      )
      setRows(normalized)

      if (normalized.length <= CHUNK_SIZE) {
        setProgressText('Validating records...')
        const { data, error: rpcError } = await supabase.rpc('admin_process_qr_csv', {
          p_rows: normalized,
          p_dry_run: true,
        })
        if (rpcError || !data?.ok) {
          setError('Could not validate this file. Please check its format and try again.')
          setLoading(false)
          setProgressText(null)
          return
        }
        setPreview(data)
      } else {
        // Stream in chunks of 250 rows to prevent DB timeouts
        let totalValid = 0
        const allErrors: CsvError[] = []
        const totalChunks = Math.ceil(normalized.length / CHUNK_SIZE)

        for (let i = 0; i < normalized.length; i += CHUNK_SIZE) {
          const chunk = normalized.slice(i, i + CHUNK_SIZE)
          const chunkIdx = Math.floor(i / CHUNK_SIZE) + 1
          setProgressText(`Validating batch ${chunkIdx} of ${totalChunks} (${Math.round((i / normalized.length) * 100)}%)...`)

          const { data, error: rpcError } = await supabase.rpc('admin_process_qr_csv', {
            p_rows: chunk,
            p_dry_run: true,
          })

          if (rpcError || !data?.ok) {
            setError(`Validation error on batch ${chunkIdx}. Please check formatting.`)
            setLoading(false)
            setProgressText(null)
            return
          }

          totalValid += data.valid_count ?? 0
          if (data.errors) {
            allErrors.push(
              ...data.errors.map((e: CsvError) => ({
                ...e,
                row: e.row + i,
              })),
            )
          }
        }

        setPreview({
          total: normalized.length,
          valid_count: totalValid,
          error_count: allErrors.length,
          errors: allErrors,
        })
      }

      setStage('preview')
    } catch {
      setError('Could not parse this CSV file. Please check its column headers and try again.')
    } finally {
      setLoading(false)
      setProgressText(null)
    }
  }

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      if (rows.length <= CHUNK_SIZE) {
        setProgressText('Importing QR codes...')
        const { data, error: rpcError } = await supabase.rpc('admin_process_qr_csv', {
          p_rows: rows,
          p_dry_run: false,
        })
        if (rpcError || !data?.ok) {
          setError('Import failed. Please try again.')
          setLoading(false)
          setProgressText(null)
          return
        }
        invalidateAdminQrCache()
        setResult(data)
      } else {
        // Chunked batch insertion with live streaming progress
        let totalCreated = 0
        const allErrors: CsvError[] = []
        const totalChunks = Math.ceil(rows.length / CHUNK_SIZE)

        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE)
          const chunkIdx = Math.floor(i / CHUNK_SIZE) + 1
          setProgressText(`Importing batch ${chunkIdx} of ${totalChunks} (${Math.round((i / rows.length) * 100)}%)...`)

          const { data, error: rpcError } = await supabase.rpc('admin_process_qr_csv', {
            p_rows: chunk,
            p_dry_run: false,
          })

          if (rpcError || !data?.ok) {
            setError(`Import halted on batch ${chunkIdx}. Some records may have been inserted.`)
            setLoading(false)
            setProgressText(null)
            return
          }

          totalCreated += data.created ?? 0
          if (data.errors) allErrors.push(...data.errors)
        }

        invalidateAdminQrCache()
        setResult({
          created: totalCreated,
          error_count: allErrors.length,
          errors: allErrors,
        })
      }
      setStage('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please try again.')
    } finally {
      setLoading(false)
      setProgressText(null)
    }
  }

  function reset() {
    setStage('upload')
    setFileName(null)
    setRows([])
    setPreview(null)
    setResult(null)
    setError(null)
    setProgressText(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  if (stage === 'result' && result) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="theme-card rounded-2xl border p-6 sm:p-8 text-center shadow-xl transition-all">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="theme-text-main mt-4 text-xl sm:text-2xl font-bold">
            {result.created} QR Codes Imported!
          </h1>
          {result.error_count > 0 && (
            <p className="theme-text-muted mt-1 text-sm">
              {result.error_count} row(s) were skipped due to validation errors.
            </p>
          )}

          <div className="theme-border mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 border-t pt-5 text-sm">
            <button
              type="button"
              onClick={reset}
              className="w-full sm:w-auto font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Upload Another File
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
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="theme-text-main text-xl sm:text-2xl font-bold tracking-tight">
            Review CSV Import
          </h1>
          <p className="theme-text-muted mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-mono">
            <FileSpreadsheet className="h-4 w-4 text-brand-500" />
            <span>{fileName}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Rows" value={preview.total} tone="gray" />
          <StatCard label="Valid Rows" value={preview.valid_count} tone="green" />
          <StatCard label="Errors" value={preview.error_count} tone="red" />
          <StatCard
            label="Duplicates"
            value={preview.errors.filter((e) => e.error === 'duplicate_in_file' || e.error === 'already_exists').length}
            tone="amber"
          />
        </div>

        {preview.errors.length > 0 && (
          <div className="theme-card overflow-hidden rounded-2xl border shadow-sm">
            <div className="theme-table-header flex items-center gap-2 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>Rows with Errors ({preview.errors.length})</span>
            </div>
            <ul className="divide-y theme-border max-h-64 overflow-y-auto text-xs sm:text-sm">
              {preview.errors.map((err, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2.5">
                  <span className="theme-text-sub font-mono">
                    Row {err.row}
                    {err.qr_number ? ` (${err.qr_number})` : ''}
                  </span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">
                    {ERROR_LABELS[err.error] ?? err.error}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400"
          >
            {error}
          </p>
        )}

        {loading && progressText && (
          <div className="rounded-xl border border-brand-200 dark:border-brand-500/20 bg-brand-50/70 dark:bg-brand-500/10 p-3 text-xs text-brand-800 dark:text-brand-300 flex items-center gap-2">
            <Spinner size={14} className="text-brand-600 shrink-0" />
            <span className="font-semibold">{progressText}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            disabled={loading}
            className="theme-subtle flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-hover transition-colors"
          >
            Cancel & Re-upload
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading || preview.valid_count === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-60 transition-all hover:scale-[1.01]"
          >
            {loading && <Spinner size={16} />}
            {loading ? (progressText || 'Creating QR codes...') : `Import ${preview.valid_count} Valid QR Codes`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/20">
            <UploadCloud className="h-4.5 w-4.5" />
          </span>
          <h1 className="theme-text-main text-xl sm:text-2xl font-bold tracking-tight">
            Upload CSV
          </h1>
        </div>
        <p className="theme-text-muted mt-1 text-xs sm:text-sm">
          Bulk import QR codes, names, links, and passwords using a spreadsheet.
        </p>
      </div>

      <div className="theme-card rounded-2xl border p-5 sm:p-7 shadow-sm transition-colors">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
            dragOver
              ? 'border-brand-500 bg-brand-500/10'
              : 'theme-subtle theme-hover'
          }`}
        >
          {loading ? (
            <Spinner size={32} className="text-brand-600" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm mb-3">
              <UploadCloud className="h-7 w-7" />
            </div>
          )}
          <p className="theme-text-main text-sm font-semibold">
            {loading ? (progressText || 'Validating CSV records...') : 'Drag & drop your CSV file here'}
          </p>
          {!loading && (
            <p className="theme-text-muted mt-1 text-xs">
              or tap to browse from device (.csv)
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="theme-subtle mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold theme-hover transition-colors shadow-sm disabled:opacity-60"
        >
          {downloadingTemplate ? (
            <Spinner size={14} className="text-brand-600" />
          ) : templateDownloaded ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Download className="theme-text-muted h-3.5 w-3.5" />
          )}
          <span className="theme-text-main">
            {downloadingTemplate
              ? 'Generating Sample Template...'
              : templateDownloaded
              ? 'Sample CSV Template Downloaded!'
              : 'Download Sample CSV Template (.csv)'}
          </span>
        </button>

        <p className="theme-text-muted mt-3 text-center text-xs">
          Columns: <code className="theme-text-main font-mono">qr_number, qr_name, destination_url, password</code>.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone = 'gray',
}: {
  label: string
  value: number
  tone?: 'gray' | 'green' | 'red' | 'amber'
}) {
  const tones: Record<string, string> = {
    gray: 'theme-text-main',
    green: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="theme-card rounded-2xl border p-4 text-center shadow-sm">
      <p className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      <p className="theme-text-muted mt-1 text-xs font-medium">{label}</p>
    </div>
  )
}
