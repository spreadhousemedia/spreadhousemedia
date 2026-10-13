import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Database,
  DownloadCloud,
  FileSpreadsheet,
  FileJson,
  KeyRound,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  UploadCloud,
  QrCode,
  Link2,
  FileDown,
  Check,
  ArrowRight,
  Archive,
  FileText,
  Printer,
} from 'lucide-react'
import {
  exportFullDatabaseJson,
  exportQrMasterCsv,
  exportBatchesCsv,
  exportPasswordsCsv,
  exportMigrationAuditPdf,
  exportFullMigrationZip,
  restoreFromFile,
  fetchFullDataset,
  getLastBackupTime,
  type BackupPayload,
} from '../../lib/backup'
import { Spinner } from '../../components/Spinner'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function DataBackup() {
  const [loadingStats, setLoadingStats] = useState(true)
  const [stats, setStats] = useState<{
    totalQrs: number
    totalBatches: number
    activeQrs: number
    withDestination: number
    batchesList: Array<{ id: string; batch_name: string }>
  }>({
    totalQrs: 0,
    totalBatches: 0,
    activeQrs: 0,
    withDestination: 0,
    batchesList: [],
  })

  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupTime())
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [zipProgress, setZipProgress] = useState<string | null>(null)

  // Custom filter export state
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Restore file state
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePreview, setRestorePreview] = useState<{
    date: string
    qrCount: number
    batchCount: number
  } | null>(null)
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge')
  const [restoring, setRestoring] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    setLoadingStats(true)
    try {
      const { batches, qr_codes } = await fetchFullDataset()
      const activeCount = qr_codes.filter((q) => q.status === 'active').length
      const withDestCount = qr_codes.filter((q) => !!q.destination_url).length

      setStats({
        totalQrs: qr_codes.length,
        totalBatches: batches.length,
        activeQrs: activeCount,
        withDestination: withDestCount,
        batchesList: batches.map((b) => ({ id: b.id, batch_name: b.batch_name })),
      })
      setLastBackup(getLastBackupTime())
    } catch {
      // Ignore load error
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function triggerFeedback(type: string) {
    setDownloadSuccess(type)
    setLastBackup(getLastBackupTime())
    setTimeout(() => setDownloadSuccess(null), 3000)
  }

  async function handleExportJson() {
    setDownloading('json')
    try {
      await exportFullDatabaseJson()
      triggerFeedback('json')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleExportQrCsv() {
    setDownloading('qrcsv')
    try {
      await exportQrMasterCsv()
      triggerFeedback('qrcsv')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleExportBatchesCsv() {
    setDownloading('batchescsv')
    try {
      await exportBatchesCsv()
      triggerFeedback('batchescsv')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleExportPasswordsCsv() {
    setDownloading('pwdcsv')
    try {
      await exportPasswordsCsv()
      triggerFeedback('pwdcsv')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleExportPdf() {
    setDownloading('pdf')
    try {
      await exportMigrationAuditPdf()
      triggerFeedback('pdf')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'PDF export failed')
    } finally {
      setDownloading(null)
    }
  }

  async function handleExportZip() {
    setDownloading('zip')
    setZipProgress('Starting archive generation...')
    try {
      await exportFullMigrationZip((txt) => setZipProgress(txt))
      triggerFeedback('zip')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Migration bundle export failed')
    } finally {
      setDownloading(null)
      setZipProgress(null)
    }
  }

  async function handleCustomExport() {
    setDownloading('custom')
    try {
      await exportQrMasterCsv({
        batchId: selectedBatch || undefined,
        status: selectedStatus || undefined,
      })
      triggerFeedback('custom')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  // Handle Restore File Selection (Supports .json and .csv)
  async function handleFileSelect(file: File) {
    setRestoreError(null)
    setRestoreSuccess(null)
    setRestoreFile(file)
    const name = file.name.toLowerCase()

    if (name.endsWith('.pdf')) {
      setRestorePreview(null)
      setRestoreError(
        'PDF files are printable audit documents and cannot be imported directly. Please select a .json backup or .csv spreadsheet file to restore records.',
      )
      return
    }

    if (name.endsWith('.csv')) {
      try {
        const text = await file.text()
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0)
        const rowCount = Math.max(0, lines.length - 1)
        setRestorePreview({
          date: 'Spreadsheet (.CSV) Import',
          qrCount: rowCount,
          batchCount: 0,
        })
      } catch {
        setRestorePreview(null)
        setRestoreError('Could not parse CSV file records.')
      }
      return
    }

    try {
      const text = await file.text()
      const parsed: BackupPayload = JSON.parse(text)
      if (!parsed.qr_codes || !Array.isArray(parsed.qr_codes)) {
        throw new Error('Not a valid Spread NFC backup format.')
      }
      setRestorePreview({
        date: parsed.exported_at ? new Date(parsed.exported_at).toLocaleString() : 'System Backup (.JSON)',
        qrCount: parsed.qr_codes.length,
        batchCount: parsed.batches?.length ?? 0,
      })
    } catch (err) {
      setRestorePreview(null)
      setRestoreError(err instanceof Error ? err.message : 'Could not parse JSON backup.')
    }
  }

  async function handleConfirmRestore() {
    if (!restoreFile) return
    setRestoring(true)
    setRestoreError(null)
    setRestoreSuccess(null)
    try {
      const result = await restoreFromFile(restoreFile, restoreMode)
      setRestoreSuccess(result.message)
      setRestoreConfirmOpen(false)
      setRestoreFile(null)
      setRestorePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadData()
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Restore failed.')
    } finally {
      setRestoring(false)
    }
  }

  const formatLastBackup = (iso: string | null) => {
    if (!iso) return 'Never'
    try {
      const date = new Date(iso)
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Never'
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="theme-text-main text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Data Backup & Migration
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-0.5 border border-purple-200/50 dark:border-purple-500/20">
              <Database className="w-3.5 h-3.5" /> Security & Migration
            </span>
          </div>
          <p className="theme-text-muted mt-1 text-xs sm:text-sm">
            Export complete database snapshots, spreadsheets, printable PDF audit reports, or full migration archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loadingStats}
            className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold theme-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin text-brand-600' : 'theme-text-muted'}`} />
            <span className="theme-text-main">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={downloading === 'pdf' || stats.totalQrs === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {downloading === 'pdf' ? (
              <Spinner size={14} className="text-white" />
            ) : downloadSuccess === 'pdf' ? (
              <Check className="h-4 w-4 text-emerald-300" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span>{downloadSuccess === 'pdf' ? 'PDF Exported!' : 'Audit PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportZip}
            disabled={downloading === 'zip' || stats.totalQrs === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {downloading === 'zip' ? (
              <Spinner size={14} className="text-white" />
            ) : downloadSuccess === 'zip' ? (
              <Check className="h-4 w-4 text-emerald-300" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            <span>{downloadSuccess === 'zip' ? 'Bundle Exported!' : 'All in One (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {zipProgress && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-500/10 p-3 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
          <Spinner size={14} className="text-purple-600 shrink-0" />
          <span className="font-semibold">{zipProgress}</span>
        </div>
      )}

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
        <div className="theme-card relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="theme-text-muted text-xs sm:text-sm font-medium">Total QR Codes</span>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/20">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="theme-text-main text-2xl sm:text-3xl font-extrabold tracking-tight">
              {loadingStats ? '—' : stats.totalQrs}
            </p>
            <span className="text-[11px] font-medium theme-text-muted">In Database</span>
          </div>
        </div>

        <div className="theme-card relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="theme-text-muted text-xs sm:text-sm font-medium">Total Batches</span>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="theme-text-main text-2xl sm:text-3xl font-extrabold tracking-tight">
              {loadingStats ? '—' : stats.totalBatches}
            </p>
            <span className="text-[11px] font-medium theme-text-muted">Series created</span>
          </div>
        </div>

        <div className="theme-card relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="theme-text-muted text-xs sm:text-sm font-medium">Destination URLs</span>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20">
              <Link2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="theme-text-main text-2xl sm:text-3xl font-extrabold tracking-tight">
              {loadingStats ? '—' : stats.withDestination}
            </p>
            <span className="text-[11px] font-medium theme-text-muted">
              {stats.totalQrs > 0 ? `${Math.round((stats.withDestination / stats.totalQrs) * 100)}% mapped` : '0%'}
            </span>
          </div>
        </div>

        <div className="theme-card relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="theme-text-muted text-xs sm:text-sm font-medium">Last Backup</span>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="theme-text-main text-xs sm:text-sm font-bold tracking-tight truncate" title={lastBackup || 'Never'}>
              {formatLastBackup(lastBackup)}
            </p>
            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 block mt-0.5">
              {lastBackup ? 'Protected' : 'Pending initial export'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Standardized Export Formats */}
      <div className="space-y-4">
        <div>
          <h2 className="theme-text-main text-base sm:text-lg font-bold flex items-center gap-2">
            <FileDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Migration & Export Formats
          </h2>
          <p className="theme-text-muted text-xs">
            Download your data in standardized, verified exact file formats for backup, Excel audits, print shops, or migration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: All-In-One Migration Archive (.ZIP) */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-purple-500/50">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300/50 dark:border-purple-500/30">
                  <Archive className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 text-[11px] font-bold px-2.5 py-0.5 border border-purple-300/50 dark:border-purple-500/30">
                  Recommended
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                Complete Migration Package (.ZIP)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Bundles all formats together: full JSON database backup, QR Master spreadsheet (.csv), batches registry, password keys, and the official PDF audit ledger.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .zip archive</span>
                <span>•</span>
                <span>Contains All Files</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                Full System Snapshot
              </span>
              <button
                type="button"
                onClick={handleExportZip}
                disabled={downloading === 'zip' || stats.totalQrs === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {downloading === 'zip' ? (
                  <Spinner size={14} className="text-white" />
                ) : downloadSuccess === 'zip' ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'zip' ? 'Downloaded!' : 'Download ZIP'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: System Audit Report (.PDF) */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-indigo-500/50">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                  <Printer className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 text-[11px] font-bold px-2.5 py-0.5 border border-indigo-200/50 dark:border-indigo-500/20">
                  Print & Ledger
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                System Audit & Migration Report (.PDF)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Formal printable A4 ledger with executive metrics, batch campaigns table, status breakdowns, and QR code inventory audit.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .pdf document</span>
                <span>•</span>
                <span>Audit & Archival</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                Executive Ledger
              </span>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={downloading === 'pdf' || stats.totalQrs === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {downloading === 'pdf' ? (
                  <Spinner size={14} className="text-white" />
                ) : downloadSuccess === 'pdf' ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'pdf' ? 'Exported!' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Complete Database Backup (.JSON) */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-purple-500/40">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                  <FileJson className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 text-[11px] font-bold px-2.5 py-0.5 border border-purple-200/50 dark:border-purple-500/20">
                  Full Snapshot
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                Complete Database Snapshot (.JSON)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Raw JSON backup containing complete relational tables, metadata, batches, codes, passwords, scan counts, and timestamps.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .json</span>
                <span>•</span>
                <span>Restorable: Yes</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                {stats.totalQrs} QRs • {stats.totalBatches} Batches
              </span>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={downloading === 'json' || stats.totalQrs === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {downloading === 'json' ? (
                  <Spinner size={14} className="text-white" />
                ) : downloadSuccess === 'json' ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'json' ? 'Downloaded!' : 'Download JSON'}</span>
              </button>
            </div>
          </div>

          {/* Card 4: QR Master Spreadsheet CSV */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-emerald-500/40">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-200/50 dark:border-emerald-500/20">
                  Excel / Sheets
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                QR Master Spreadsheet (.CSV)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Export all dynamic QR codes with destination URLs, scan counts, batches, and status in standard RFC-4180 CSV with UTF-8 BOM.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .csv</span>
                <span>•</span>
                <span>Excel & Sheets Ready</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                {stats.totalQrs} records
              </span>
              <button
                type="button"
                onClick={handleExportQrCsv}
                disabled={downloading === 'qrcsv' || stats.totalQrs === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {downloading === 'qrcsv' ? (
                  <Spinner size={14} className="text-white" />
                ) : downloadSuccess === 'qrcsv' ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'qrcsv' ? 'Exported!' : 'Export QR CSV'}</span>
              </button>
            </div>
          </div>

          {/* Card 5: Batches Overview CSV */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-amber-500/40">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
                  <Layers className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 border border-amber-200/50 dark:border-amber-500/20">
                  Series Register
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                Batches Registry (.CSV)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Export high-level overview of batch campaigns, series prefixes, start & end numbers, total QR allocations, and creation dates.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .csv</span>
                <span>•</span>
                <span>Audit & Campaign Tracking</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                {stats.totalBatches} batch rows
              </span>
              <button
                type="button"
                onClick={handleExportBatchesCsv}
                disabled={downloading === 'batchescsv' || stats.totalBatches === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {downloading === 'batchescsv' ? (
                  <Spinner size={14} className="text-white" />
                ) : downloadSuccess === 'batchescsv' ? (
                  <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'batchescsv' ? 'Exported!' : 'Export Batches CSV'}</span>
              </button>
            </div>
          </div>

          {/* Card 6: Management Keys / Passwords CSV */}
          <div className="theme-card group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 shadow-sm transition-all hover:border-brand-500/40">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/20">
                  <KeyRound className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 text-[11px] font-bold px-2.5 py-0.5 border border-brand-200/50 dark:border-brand-500/20">
                  Printing Records
                </span>
              </div>
              <h3 className="theme-text-main mt-4 text-base font-bold">
                Standee Keys & Passwords (.CSV)
              </h3>
              <p className="theme-text-muted mt-1.5 text-xs leading-relaxed">
                Ledger containing QR numbers and assigned update passwords. Ideal for handovers to physical acrylic standee print shops.
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted font-mono">
                <span>Format: .csv</span>
                <span>•</span>
                <span>Print & Customer Records</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t theme-border flex items-center justify-between">
              <span className="text-xs theme-text-muted">
                {stats.totalQrs} credentials
              </span>
              <button
                type="button"
                onClick={handleExportPasswordsCsv}
                disabled={downloading === 'pwdcsv' || stats.totalQrs === 0}
                className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold theme-hover transition-colors shadow-sm disabled:opacity-50"
              >
                {downloading === 'pwdcsv' ? (
                  <Spinner size={14} className="text-brand-600" />
                ) : downloadSuccess === 'pwdcsv' ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <DownloadCloud className="h-4 w-4" />
                )}
                <span>{downloadSuccess === 'pwdcsv' ? 'Exported!' : 'Export Keys CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Custom Filtered CSV Export */}
      <div className="theme-card rounded-2xl border p-5 sm:p-6 shadow-sm">
        <h2 className="theme-text-main text-base font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Targeted Filter Export
        </h2>
        <p className="theme-text-muted text-xs mt-0.5">
          Export only a specific batch campaign or specific status without downloading the full database.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="theme-text-muted block text-xs font-semibold mb-1">
              Select Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="theme-input w-full rounded-xl border px-3.5 py-2 text-xs sm:text-sm focus:border-brand-500 transition-colors"
            >
              <option value="">All Batches ({stats.totalQrs} QRs)</option>
              {stats.batchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="theme-text-muted block text-xs font-semibold mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="theme-input w-full rounded-xl border px-3.5 py-2 text-xs sm:text-sm focus:border-brand-500 transition-colors"
            >
              <option value="">All Status</option>
              <option value="active">Active Only ({stats.activeQrs})</option>
              <option value="inactive">Inactive Only ({stats.totalQrs - stats.activeQrs})</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCustomExport}
              disabled={downloading === 'custom' || stats.totalQrs === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {downloading === 'custom' ? (
                <Spinner size={14} className="text-white" />
              ) : downloadSuccess === 'custom' ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <DownloadCloud className="h-4 w-4" />
              )}
              <span>{downloadSuccess === 'custom' ? 'Exported!' : 'Export Filtered CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Restore / Import Backup (.JSON or .CSV) */}
      <div className="theme-card rounded-2xl border p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="theme-text-main text-base font-bold flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Restore & Import Records (.JSON / .CSV)
            </h2>
            <p className="theme-text-muted text-xs mt-0.5">
              Recover previous QR records or migrate data into this system from a .JSON backup or .CSV spreadsheet.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 border border-emerald-200/50 dark:border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Safe Restore
          </span>
        </div>

        {restoreSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{restoreSuccess}</span>
          </div>
        )}

        {restoreError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{restoreError}</span>
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              id="restore-file-input"
            />
            <label
              htmlFor="restore-file-input"
              className="theme-subtle flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed py-3.5 px-4 text-xs sm:text-sm font-semibold cursor-pointer theme-hover transition-colors"
            >
              <FileJson className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>{restoreFile ? restoreFile.name : 'Select or drag backup file (.json or .csv)'}</span>
            </label>

            {restorePreview && (
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-3 text-xs font-bold text-white shadow-sm transition-colors"
              >
                <span>Verify & Restore</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {restorePreview && (
            <div className="theme-subtle rounded-xl border p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold theme-text-main">File Verification Summary</span>
                <span className="theme-text-muted">{restorePreview.date}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border p-2 theme-card">
                  <span className="theme-text-muted text-[10px] block">QR Records</span>
                  <span className="font-bold theme-text-main text-sm">{restorePreview.qrCount}</span>
                </div>
                <div className="rounded-lg border p-2 theme-card">
                  <span className="theme-text-muted text-[10px] block">Batches</span>
                  <span className="font-bold theme-text-main text-sm">{restorePreview.batchCount}</span>
                </div>
                <div className="rounded-lg border p-2 theme-card col-span-2 sm:col-span-1">
                  <span className="theme-text-muted text-[10px] block">Restore Mode</span>
                  <select
                    value={restoreMode}
                    onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'overwrite')}
                    className="theme-input text-xs rounded border px-1.5 py-0.5 mt-0.5 w-full"
                  >
                    <option value="merge">Merge (Keep existing)</option>
                    <option value="overwrite">Overwrite / Replace</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Restore */}
      <ConfirmDialog
        open={restoreConfirmOpen}
        title="Confirm Data Restore"
        description={`Are you sure you want to restore ${restorePreview?.qrCount ?? 0} QR codes and ${restorePreview?.batchCount ?? 0} batches? ${
          restoreMode === 'overwrite'
            ? 'WARNING: Overwrite mode will replace current records.'
            : 'Merge mode will add missing records without deleting current ones.'
        }`}
        confirmLabel={restoring ? 'Restoring...' : 'Proceed with Restore'}
        danger={restoreMode === 'overwrite'}
        loading={restoring}
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreConfirmOpen(false)}
      />
    </div>
  )
}
