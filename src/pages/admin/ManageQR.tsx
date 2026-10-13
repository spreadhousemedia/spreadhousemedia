import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  Filter,
  Link2,
  Layers,
  Download,
  Trash2,
  X,
  Eye,
  Pencil,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckSquare,
  Square,
  Radio,
  QrCode as QrCodeIcon,
  Plus,
  UploadCloud,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { qrPublicUrl } from '../../lib/config'
import { downloadBulkQrPdf, downloadBulkQrZip } from '../../lib/qr'
import { downloadNfcEncodingCsv } from '../../lib/csv'
import { getCached, setCached, invalidateAdminQrCache } from '../../lib/cache'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Spinner } from '../../components/Spinner'
import { ViewQrModal } from '../../components/ViewQrModal'
import { EditQrModal } from '../../components/EditQrModal'
import type { QrCode, QrStatus, Batch } from '../../types'

const PAGE_SIZE = 20

interface Row extends QrCode {
  batches: { batch_name: string } | null
}

export function ManageQR() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [statusFilter, setStatusFilter] = useState<'' | QrStatus>((searchParams.get('status') as '' | QrStatus) || '')
  const [linkFilter, setLinkFilter] = useState<'' | 'set' | 'unset'>((searchParams.get('link') as '' | 'set' | 'unset') || '')
  const [batchFilter, setBatchFilter] = useState(searchParams.get('batch') ?? '')
  const [batches, setBatches] = useState<Batch[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Row | null>(null)
  const [viewTarget, setViewTarget] = useState<Row | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const queryIdRef = useRef(0)

  // Synchronize state when URL query params change (e.g. from Dashboard card clicks)
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const status = (searchParams.get('status') as '' | QrStatus) || ''
    const link = (searchParams.get('link') as '' | 'set' | 'unset') || ''
    const batch = searchParams.get('batch') ?? ''
    if (q !== search) setSearch(q)
    if (status !== statusFilter) setStatusFilter(status)
    if (link !== linkFilter) setLinkFilter(link)
    if (batch !== batchFilter) setBatchFilter(batch)
  }, [searchParams])

  // Debounce search input by 250ms to prevent query spamming on every keypress
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const applyFilters = useCallback(
    <T,>(query: T): T => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = query
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.trim().replace(/[%,]/g, '')
        q = q.or(`qr_number.ilike.%${term}%,qr_name.ilike.%${term}%,destination_url.ilike.%${term}%`)
      }
      if (statusFilter) q = q.eq('status', statusFilter)
      if (batchFilter) q = q.eq('batch_id', batchFilter)
      if (linkFilter === 'set') {
        q = q.not('destination_url', 'is', null).neq('destination_url', '')
      } else if (linkFilter === 'unset') {
        q = q.is('destination_url', null)
      }
      return q
    },
    [debouncedSearch, statusFilter, batchFilter, linkFilter],
  )

  const load = useCallback(async () => {
    const cacheKey = `qr_${page}_${debouncedSearch.trim()}_${statusFilter}_${batchFilter}_${linkFilter}`
    const cached = getCached<{ rows: Row[]; total: number }>(cacheKey)

    // SWR Pattern: If cached, show immediately with 0ms delay
    if (cached) {
      setRows(cached.rows)
      setTotal(cached.total)
      setLoading(false)
    } else {
      setLoading(true)
    }

    setSelectedIds(new Set())
    setSelectAllMatching(false)

    const currentQueryId = ++queryIdRef.current

    try {
      let query = supabase
        .from('qr_codes')
        .select('id, qr_number, qr_name, destination_url, status, batch_id, created_at, updated_at, batches(batch_name)', {
          count: 'exact',
        })
      query = applyFilters(query)

      const from = page * PAGE_SIZE
      const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)

      // Guard against race conditions from previous in-flight requests
      if (currentQueryId !== queryIdRef.current) return

      const freshRows = ((data as unknown) as Row[]) ?? []
      const freshTotal = count ?? 0

      setRows(freshRows)
      setTotal(freshTotal)
      setCached(cacheKey, { rows: freshRows, total: freshTotal }, 30_000)
    } catch {
      // Keep existing rows if network glitches
    } finally {
      if (currentQueryId === queryIdRef.current) {
        setLoading(false)
      }
    }
  }, [applyFilters, debouncedSearch, statusFilter, batchFilter, page])

  useEffect(() => {
    const cachedBatches = getCached<Batch[]>('batches_list')
    if (cachedBatches) {
      setBatches(cachedBatches)
    }

    supabase
      .from('batches')
      .select('id, batch_name, series_prefix, start_number, end_number, total_qr_codes, created_at, updated_at')
      .order('batch_name')
      .then((res: any) => {
        const data = res?.data
        if (data) {
          const list = data as Batch[]
          setBatches(list)
          setCached('batches_list', list, 5 * 60 * 1000)
        }
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter, batchFilter])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (search) next.set('q', search)
    else next.delete('q')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleCopy(qrNumber: string, id: string) {
    await navigator.clipboard.writeText(qrPublicUrl(qrNumber))
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', deleteTarget.id)
      if (error) throw error
      invalidateAdminQrCache()
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete this QR code. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const allOnPageSelected = selectAllMatching || (rows.length > 0 && rows.every((r) => selectedIds.has(r.id)))
  const selectionCount = selectAllMatching ? total : selectedIds.size

  function toggleSelectAllOnPage() {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
      setSelectAllMatching(false)
    } else if (total > rows.length) {
      setSelectAllMatching(true)
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)))
    }
  }

  function toggleRow(id: string) {
    setSelectAllMatching(false)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  async function getSelectedQrNumbers(): Promise<string[]> {
    if (selectAllMatching) {
      let query = supabase.from('qr_codes').select('qr_number')
      query = applyFilters(query)
      const { data } = await query.order('qr_number')
      return ((data as any[]) ?? []).map((r) => r.qr_number as string)
    }
    return rows.filter((r) => selectedIds.has(r.id)).map((r) => r.qr_number)
  }

  async function handleBulkDownload(format: 'png' | 'svg' | 'pdf') {
    try {
      const numbers = await getSelectedQrNumbers()
      if (numbers.length === 0) return
      setBulkProgress({ done: 0, total: numbers.length })
      if (format === 'pdf') {
        await downloadBulkQrPdf(numbers, 'qr_codes.pdf', (done, t) => setBulkProgress({ done, total: t }))
      } else {
        await downloadBulkQrZip(numbers, format, `qr_codes_${format}.zip`, (done, t) => setBulkProgress({ done, total: t }))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk download failed. Please try again.')
    } finally {
      setBulkProgress(null)
    }
  }

  async function handleNfcEncodingDownload() {
    try {
      const numbers = await getSelectedQrNumbers()
      if (numbers.length === 0) return
      setBulkProgress({ done: 0, total: numbers.length })
      const rows = numbers.map((num) => ({
        serial_number: num,
        label: `Spread NFC Smart Card #${num}`,
      }))
      await downloadNfcEncodingCsv(rows, `spreadnfc_nfc_manufacturing_${numbers.length}.csv`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'NFC export failed. Please try again.')
    } finally {
      setBulkProgress(null)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    setBulkDeleteError(null)
    try {
      if (selectAllMatching) {
        // Safe approach: first fetch IDs of matching records, then delete by ID list.
        // This prevents accidental deletion of unfiltered rows.
        let selectQuery = supabase.from('qr_codes').select('id')
        selectQuery = applyFilters(selectQuery)
        const { data: matchingRows, error: fetchError } = await selectQuery
        if (fetchError) throw fetchError
        const idsToDelete = ((matchingRows as any[]) ?? []).map((r: any) => r.id as string)
        if (idsToDelete.length === 0) {
          setBulkDeleteConfirm(false)
          clearSelection()
          return
        }
        const { error } = await supabase.from('qr_codes').delete().in('id', idsToDelete)
        if (error) throw error
      } else {
        const { error } = await supabase.from('qr_codes').delete().in('id', Array.from(selectedIds))
        if (error) throw error
      }
      invalidateAdminQrCache()
      setBulkDeleteConfirm(false)
      clearSelection()
      load()
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : 'Could not delete the selected QR codes. Please try again.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="theme-text-main text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Manage QR Codes
          </h1>
          <p className="theme-text-muted mt-1 text-xs sm:text-sm">
            Search, filter, update, bulk download and manage all your dynamic QR codes.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              invalidateAdminQrCache()
              load()
              // Re-fetch batches list too
              supabase
                .from('batches')
                .select('id, batch_name, series_prefix, start_number, end_number, total_qr_codes, created_at, updated_at')
                .order('batch_name')
                .then((res: any) => {
                  const data = res?.data
                  if (data) setBatches(data as Batch[])
                })
            }}
            title="Refresh list"
            className="theme-subtle flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            to="/admin/upload"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Import & Sync CSV
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input with icon */}
        <div className="relative flex-1">
          <Search className="theme-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by QR number, name or URL..."
            className="theme-input w-full rounded-xl border pl-10 pr-9 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Destination Link Filter */}
        <div className="relative sm:w-48">
          <select
            value={linkFilter}
            onChange={(e) => {
              const val = e.target.value as '' | 'set' | 'unset'
              setLinkFilter(val)
              setPage(0)
              const next = new URLSearchParams(searchParams)
              if (val) next.set('link', val)
              else next.delete('link')
              setSearchParams(next, { replace: true })
            }}
            className="theme-input w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
          >
            <option value="">All Destinations</option>
            <option value="set">Connected (Both Channels)</option>
            <option value="unset">Pending Link (Not Connected)</option>
          </select>
          <Link2 className="theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as '' | QrStatus
              setStatusFilter(val)
              setPage(0)
              const next = new URLSearchParams(searchParams)
              if (val) next.set('status', val)
              else next.delete('status')
              setSearchParams(next, { replace: true })
            }}
            className="theme-input w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
          >
            <option value="">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Disabled Only</option>
          </select>
          <Filter className="theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
        </div>

        {/* Batch Filter */}
        <div className="relative sm:w-48">
          <select
            value={batchFilter}
            onChange={(e) => {
              const val = e.target.value
              setBatchFilter(val)
              setPage(0)
              const next = new URLSearchParams(searchParams)
              if (val) next.set('batch', val)
              else next.delete('batch')
              setSearchParams(next, { replace: true })
            }}
            className="theme-input w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:border-brand-500 transition-colors"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_name}
              </option>
            ))}
          </select>
          <Layers className="theme-text-muted absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectionCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/70 dark:bg-brand-500/10 p-3.5 sm:px-5 text-sm transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
              {selectionCount}
            </span>
            <span className="font-semibold text-brand-900 dark:text-brand-200">
              QR codes selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkDownload('png')}
              disabled={!!bulkProgress}
              className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 theme-hover transition-colors disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              PNG ZIP
            </button>
            <button
              type="button"
              onClick={() => handleBulkDownload('svg')}
              disabled={!!bulkProgress}
              className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 theme-hover transition-colors disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              SVG ZIP
            </button>
            <button
              type="button"
              onClick={() => handleBulkDownload('pdf')}
              disabled={!!bulkProgress}
              className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 theme-hover transition-colors disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleNfcEncodingDownload}
              disabled={!!bulkProgress}
              className="theme-subtle inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 theme-hover transition-colors disabled:opacity-60"
            >
              <Radio className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              NFC CSV
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={!!bulkProgress}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="theme-text-muted rounded-xl px-2.5 py-1.5 text-xs font-medium hover:text-white"
            >
              Clear
            </button>
          </div>

          {bulkProgress && (
            <div className="flex w-full items-center gap-2 text-xs text-brand-700 dark:text-brand-300">
              <Spinner size={12} />
              <span>Generating archive {bulkProgress.done} of {bulkProgress.total}...</span>
            </div>
          )}
        </div>
      )}

      {/* Main Records Container */}
      <div className="theme-card rounded-2xl border shadow-sm transition-colors overflow-hidden">
        {/* Desktop Table View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="theme-table-header text-[11px] uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="w-12 px-5 py-3.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all on this page"
                    className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="px-4 py-3.5">QR Serial</th>
                <th className="px-4 py-3.5">Device &amp; Batch</th>
                <th className="px-4 py-3.5">Hardware Channels</th>
                <th className="px-4 py-3.5">Destination Link</th>
                <th className="px-4 py-3.5">Overall Status</th>
                <th className="px-4 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center theme-text-muted">
                    <Spinner size={24} className="mx-auto text-brand-600" />
                    <p className="mt-2 text-xs">Loading QR codes...</p>
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center theme-text-muted">
                    No QR codes match your active filters.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`theme-table-row group transition-colors ${
                    selectedIds.has(row.id) ? 'bg-brand-50/50' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectAllMatching || selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Select ${row.qr_number}`}
                      className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="theme-text-main font-bold font-mono text-sm tracking-tight">
                        {row.qr_number}
                      </span>
                      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Dual NFC+QR
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 min-w-[150px]">
                    <p className="theme-text-main font-semibold text-sm leading-snug">
                      {row.qr_name}
                    </p>
                    <p className="theme-text-muted text-xs flex items-center gap-1 mt-0.5">
                      <Layers className="h-3 w-3 opacity-60 shrink-0" />
                      <span className="truncate">{row.batches?.batch_name ?? 'Individual Standee'}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5">
                      {/* NFC Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          row.destination_url
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                        title={row.destination_url ? 'NFC Chip points to active destination' : 'NFC Chip awaits destination URL'}
                      >
                        <Radio className={`h-3 w-3 shrink-0 ${row.destination_url ? 'text-emerald-600' : 'text-amber-500'}`} />
                        <span>NFC:</span>
                        <span className="font-bold">{row.destination_url ? 'Connected' : 'Not Linked'}</span>
                      </span>

                      {/* QR Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          row.destination_url
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                        title={row.destination_url ? 'QR Code points to active destination' : 'QR Code awaits destination URL'}
                      >
                        <QrCodeIcon className={`h-3 w-3 shrink-0 ${row.destination_url ? 'text-blue-600' : 'text-amber-500'}`} />
                        <span>QR:</span>
                        <span className="font-bold">{row.destination_url ? 'Connected' : 'Not Linked'}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    {row.destination_url ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={row.destination_url}
                          target="_blank"
                          rel="noreferrer"
                          title={row.destination_url}
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline max-w-[170px] truncate text-xs font-mono font-medium"
                        >
                          <span className="truncate">{row.destination_url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditTarget(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors shadow-2xs"
                        title="Click to set destination URL"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Connect Link</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={row.status} hasDestination={Boolean(row.destination_url)} />
                  </td>
                  <td className="theme-text-muted px-4 py-3.5 text-xs whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View QR"
                        onClick={() => setViewTarget(row)}
                        className="theme-subtle rounded-lg p-1.5 theme-hover transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setEditTarget(row)}
                        className="theme-subtle rounded-lg p-1.5 theme-hover transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Copy QR URL"
                        onClick={() => handleCopy(row.qr_number, row.id)}
                        className="theme-subtle rounded-lg p-1.5 theme-hover transition-colors"
                      >
                        {copiedId === row.id ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View (< 768px) */}
        <div className="block md:hidden p-3 divide-y theme-border space-y-3">
          {/* Select all header for mobile */}
          <div className="flex items-center justify-between pb-2 px-1">
            <button
              type="button"
              onClick={toggleSelectAllOnPage}
              className="theme-text-main flex items-center gap-2 text-xs font-semibold"
            >
              {allOnPageSelected ? (
                <CheckSquare className="h-4 w-4 text-brand-600" />
              ) : (
                <Square className="theme-text-muted h-4 w-4" />
              )}
              <span>Select all on page</span>
            </button>
            <span className="theme-text-muted text-xs">Total {total}</span>
          </div>

          {loading && (
            <div className="py-12 text-center theme-text-muted">
              <Spinner size={24} className="mx-auto text-brand-600" />
              <p className="mt-2 text-xs">Loading QR codes...</p>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="py-12 text-center theme-text-muted">
              No QR codes match your active filters.
            </div>
          )}

          {rows.map((row) => (
            <div
              key={row.id}
              className={`pt-3 first:pt-0 rounded-xl p-3 transition-colors ${
                selectedIds.has(row.id) ? 'bg-brand-50/50 dark:bg-brand-500/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectAllMatching || selectedIds.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Select ${row.qr_number}`}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-brand-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="theme-text-main font-mono font-bold text-base">
                        {row.qr_number}
                      </span>
                      <StatusBadge status={row.status} hasDestination={Boolean(row.destination_url)} />
                    </div>
                    <p className="theme-text-sub text-sm font-medium mt-0.5">
                      {row.qr_name}
                    </p>
                  </div>
                </div>

                <span className="theme-text-muted text-[11px] shrink-0">
                  {new Date(row.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Dual Hardware Channels */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    row.destination_url
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <Radio className={`h-3 w-3 shrink-0 ${row.destination_url ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>NFC:</span>
                  <span className="font-bold">{row.destination_url ? 'Connected' : 'Not Linked'}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    row.destination_url
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <QrCodeIcon className={`h-3 w-3 shrink-0 ${row.destination_url ? 'text-blue-600' : 'text-amber-500'}`} />
                  <span>QR:</span>
                  <span className="font-bold">{row.destination_url ? 'Connected' : 'Not Linked'}</span>
                </span>
              </div>

              {/* Destination URL */}
              <div className="theme-subtle mt-2.5 rounded-xl p-2.5 text-xs border">
                <div className="flex items-center justify-between mb-1">
                  <span className="theme-text-muted text-[10px] uppercase font-semibold">
                    Destination Link
                  </span>
                  {!row.destination_url && (
                    <button
                      type="button"
                      onClick={() => setEditTarget(row)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Plus className="h-3 w-3" /> Connect Link
                    </button>
                  )}
                </div>
                {row.destination_url ? (
                  <a
                    href={row.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:underline break-all"
                  >
                    <span className="break-all font-mono">{row.destination_url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-amber-700 font-medium text-[11px]">
                    No URL linked. Standee will route to setup/update page.
                  </p>
                )}
              </div>

              {/* Card Footer: Batch info & action buttons */}
              <div className="theme-border mt-3 flex items-center justify-between border-t pt-2.5">
                <span className="theme-text-muted text-xs">
                  Batch: <strong className="theme-text-main font-medium">{row.batches?.batch_name ?? '—'}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="View QR"
                    onClick={() => setViewTarget(row)}
                    className="theme-subtle rounded-lg p-2 theme-hover transition-colors border"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => setEditTarget(row)}
                    className="theme-subtle rounded-lg p-2 theme-hover transition-colors border"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Copy QR URL"
                    onClick={() => handleCopy(row.qr_number, row.id)}
                    className="theme-subtle rounded-lg p-2 theme-hover transition-colors border"
                  >
                    {copiedId === row.id ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => setDeleteTarget(row)}
                    className="rounded-lg p-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-200/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        <div className="theme-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t px-5 py-3.5 text-xs sm:text-sm">
          <span className="theme-text-muted">
            Showing {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total} results
          </span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="theme-card inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 font-medium theme-hover disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <span className="theme-text-main px-2 text-xs font-semibold">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="theme-card inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 font-medium theme-hover disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete QR ${deleteTarget?.qr_number}?`}
        description={deleteError ?? 'This will permanently remove this QR record. This cannot be undone.'}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        open={bulkDeleteConfirm}
        title={`Delete ${selectionCount} QR codes?`}
        description={
          bulkDeleteError ??
          'This will permanently remove all selected QR records and their destination links. This cannot be undone.'
        }
        confirmLabel={`Delete ${selectionCount}`}
        danger
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setBulkDeleteConfirm(false)
          setBulkDeleteError(null)
        }}
      />

      {/* Edit QR Modal */}
      {editTarget && (
        <EditQrModal
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            invalidateAdminQrCache()
            setEditTarget(null)
            load()
          }}
        />
      )}

      {/* View QR Modal */}
      {viewTarget && <ViewQrModal qrNumber={viewTarget.qr_number} onClose={() => setViewTarget(null)} />}
    </div>
  )
}

