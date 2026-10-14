import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  QrCode,
  Link2,
  CheckCircle2,
  PauseCircle,
  Layers,
  Plus,
  UploadCloud,
  Database,
  Eye,
  Pencil,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Radio,
  QrCode as QrCodeIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Spinner } from '../../components/Spinner'
import { ViewQrModal } from '../../components/ViewQrModal'
import { EditQrModal } from '../../components/EditQrModal'
import { qrPublicUrl } from '../../lib/config'
import type { QrStatus } from '../../types'

interface RecentRow {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
  created_at: string
  batches: { batch_name: string } | null
}

interface Counts {
  total: number
  destinationLinks: number
  unlinked: number
  active: number
  inactive: number
  batches: number
}

export function Dashboard() {
  const { user } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [recent, setRecent] = useState<RecentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecentRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewTarget, setViewTarget] = useState<RecentRow | null>(null)
  const [editTarget, setEditTarget] = useState<RecentRow | null>(null)

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Admin'

  const load = useCallback(async () => {
    setLoading(true)
    const [totalRes, destinationRes, activeRes, inactiveRes, batchesRes, recentRes] = await Promise.all([
      supabase.from('qr_codes').select('*', { count: 'exact', head: true }),
      supabase.from('qr_codes').select('*', { count: 'exact', head: true }).not('destination_url', 'is', null).neq('destination_url', ''),
      supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
      supabase.from('batches').select('*', { count: 'exact', head: true }),
      supabase
        .from('qr_codes')
        .select('id, qr_number, qr_name, destination_url, status, created_at, batches(batch_name)')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const total = totalRes.count ?? 0
    const destinationLinks = destinationRes.count ?? 0
    const unlinked = Math.max(0, total - destinationLinks)

    setCounts({
      total,
      destinationLinks,
      unlinked,
      active: activeRes.count ?? 0,
      inactive: inactiveRes.count ?? 0,
      batches: batchesRes.count ?? 0,
    })
    setRecent(((recentRes.data as unknown) as RecentRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCopy(qrNumber: string, id: string) {
    await navigator.clipboard.writeText(qrPublicUrl(qrNumber))
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('qr_codes').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Header / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="theme-text-main text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Welcome Back, {displayName}
            </h1>
            <span className="hidden sm:inline-flex items-center justify-center p-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <p className="theme-text-muted mt-1 text-xs sm:text-sm">
            Create, manage and update all your dynamic QR codes and physical standees.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="theme-subtle inline-flex self-start sm:self-auto items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold theme-hover transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-600' : 'theme-text-muted'}`} />
          <span className="theme-text-main">Refresh</span>
        </button>
      </div>

            {/* Summary Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
        <SummaryCard
          label="Total QR Codes"
          value={counts?.total}
          type="total"
          loading={loading}
          to="/admin/manage"
          subtext="All dynamic QRs"
        />
        <SummaryCard
          label="Active Links"
          value={counts?.destinationLinks}
          type="links"
          loading={loading}
          to="/admin/manage?link=set"
          subtext={counts ? `${counts.unlinked} pending` : undefined}
        />
        <SummaryCard
          label="Pending Links"
          value={counts?.unlinked}
          type="links"
          loading={loading}
          to="/admin/manage?link=unset"
          subtext="Needs connection"
        />
        <SummaryCard
          label="Inactive QR Codes"
          value={counts?.inactive}
          type="inactive"
          loading={loading}
          to="/admin/manage?status=inactive"
          subtext="Paused QR codes"
        />
        <SummaryCard
          label="Total Batches"
          value={counts?.batches}
          type="batches"
          loading={loading}
          to="/admin/batches"
          subtext="View all batches"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Quick Actions Panel */}
      <div className="theme-card rounded-2xl border p-4 sm:p-6 shadow-sm transition-colors">
        <h2 className="theme-text-muted text-xs font-bold uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Link
            to="/admin/create"
            className="group flex items-center justify-between rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Plus className="h-4 w-4 text-white" />
              </span>
              <span>Create Single QR</span>
            </span>
            <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/batches"
            className="theme-subtle group flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-semibold theme-hover transition-all hover:scale-[1.01]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                <Layers className="h-4 w-4" />
              </span>
              <span className="theme-text-main">Create Bulk QR</span>
            </span>
            <ArrowRight className="h-4 w-4 theme-text-muted group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/upload"
            className="theme-subtle group flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-semibold theme-hover transition-all hover:scale-[1.01]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <UploadCloud className="h-4 w-4" />
              </span>
              <span className="theme-text-main">Upload CSV</span>
            </span>
            <ArrowRight className="h-4 w-4 theme-text-muted group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to="/admin/backup"
            className="theme-subtle group flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-semibold theme-hover transition-all hover:scale-[1.01]"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Database className="h-4 w-4" />
              </span>
              <span className="theme-text-main">Data Backup</span>
            </span>
            <ArrowRight className="h-4 w-4 theme-text-muted group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Recent QR Codes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="theme-text-main text-base sm:text-lg font-bold">Recent QR Codes</h2>
            {recent.length > 0 && (
              <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
                Latest {recent.length}
              </span>
            )}
          </div>
          <Link
            to="/admin/manage"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="theme-card hidden md:block overflow-hidden rounded-2xl border shadow-sm transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="theme-table-header text-[11px] uppercase tracking-wider font-semibold border-b">
                <tr>
                  <th className="px-5 py-3.5">QR Serial</th>
                  <th className="px-5 py-3.5">Device & Batch</th>
                  <th className="px-5 py-3.5">Hardware Channels</th>
                  <th className="px-5 py-3.5">Destination Link</th>
                  <th className="px-5 py-3.5">Overall Status</th>
                  <th className="px-5 py-3.5">Created At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center theme-text-muted">
                      <Spinner size={24} className="mx-auto text-brand-600" />
                      <p className="mt-2 text-xs">Loading QR codes...</p>
                    </td>
                  </tr>
                )}
                {!loading && recent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="theme-subtle mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border">
                        <QrCode className="h-6 w-6 text-brand-500" />
                      </div>
                      <p className="theme-text-main mt-3 text-sm font-medium">No QR codes yet</p>
                      <p className="theme-text-muted mt-1 text-xs">
                        Create your first dynamic QR code to get started.
                      </p>
                      <Link
                        to="/admin/create"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Create Single QR</span>
                      </Link>
                    </td>
                  </tr>
                )}
                {recent.map((row) => (
                  <tr
                    key={row.id}
                    className="theme-table-row group transition-colors hover:bg-zinc-50/70"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="theme-text-main font-mono font-bold text-sm tracking-tight">
                          {row.qr_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/80 tracking-wide">
                          Dual NFC+QR
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 min-w-[150px]">
                      <p className="theme-text-main font-semibold text-sm leading-snug">
                        {row.qr_name}
                      </p>
                      <p className="theme-text-muted text-xs flex items-center gap-1 mt-0.5">
                        <Layers className="h-3 w-3 opacity-60 shrink-0" />
                        <span className="truncate">{row.batches?.batch_name ?? 'Individual Standee'}</span>
                      </p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
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
                    <td className="px-5 py-4 max-w-[200px]">
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
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={row.status} hasDestination={Boolean(row.destination_url)} />
                    </td>
                    <td className="theme-text-muted px-5 py-4 text-xs whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
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
        </div>

        {/* Mobile Responsive Cards View (< 768px) */}
        <div className="block md:hidden space-y-3">
          {loading && (
            <div className="theme-card rounded-2xl border p-8 text-center theme-text-muted">
              <Spinner size={24} className="mx-auto text-brand-600" />
              <p className="mt-2 text-xs">Loading QR codes...</p>
            </div>
          )}

          {!loading && recent.length === 0 && (
            <div className="theme-card rounded-2xl border p-8 text-center">
              <div className="theme-subtle mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border">
                <QrCode className="h-6 w-6 text-brand-500" />
              </div>
              <p className="theme-text-main mt-3 text-sm font-medium">No QR codes yet</p>
              <p className="theme-text-muted mt-1 text-xs">
                Create your first dynamic QR code to get started.
              </p>
              <Link
                to="/admin/create"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create Single QR</span>
              </Link>
            </div>
          )}

          {recent.map((row) => (
            <div
              key={row.id}
              className="theme-card rounded-2xl border p-4 shadow-sm transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="theme-text-main font-mono font-bold text-base">
                      {row.qr_number}
                    </span>
                    <StatusBadge status={row.status} hasDestination={Boolean(row.destination_url)} />
                  </div>
                  <p className="theme-text-sub mt-0.5 text-sm font-medium">
                    {row.qr_name}
                  </p>
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

              {/* Card Footer: Batch & Action Toolbar */}
              <div className="theme-border mt-3.5 flex items-center justify-between border-t pt-3">
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
                    className="rounded-lg p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete QR ${deleteTarget?.qr_number}?`}
        description="This will permanently remove this QR record. This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Edit QR Modal */}
      {editTarget && (
        <EditQrModal
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            load()
          }}
        />
      )}

      {/* View QR Code Modal */}
      {viewTarget && <ViewQrModal qrNumber={viewTarget.qr_number} onClose={() => setViewTarget(null)} />}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  type,
  loading,
  to,
  subtext,
  className = '',
}: {
  label: string
  value?: number
  type: 'total' | 'links' | 'active' | 'inactive' | 'batches'
  loading: boolean
  to?: string
  subtext?: string
  className?: string
}) {
  const configs = {
    total: {
      icon: QrCode,
      iconClass: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-200/50 dark:border-brand-500/20',
      glow: 'hover:border-brand-500/40 hover:shadow-brand-500/5',
    },
    links: {
      icon: Link2,
      iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20',
      glow: 'hover:border-sky-500/40 hover:shadow-sky-500/5',
    },
    active: {
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
      glow: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5',
    },
    inactive: {
      icon: PauseCircle,
      iconClass: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
      glow: 'hover:border-rose-500/40 hover:shadow-rose-500/5',
    },
    batches: {
      icon: Layers,
      iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
      glow: 'hover:border-amber-500/40 hover:shadow-amber-500/5',
    },
  }

  const { icon: Icon, iconClass, glow } = configs[type]

  const cardContent = (
    <div
      className={`theme-card group relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${glow} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="theme-text-muted text-xs sm:text-sm font-medium">
          {label}
        </span>
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconClass}`}>
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="mt-3 sm:mt-4 flex items-baseline justify-between gap-1">
        <p className="theme-text-main text-2xl sm:text-3xl font-extrabold tracking-tight">
          {loading ? '—' : value ?? 0}
        </p>
        {subtext && !loading && (
          <span className="text-[11px] font-medium theme-text-muted truncate">
            {subtext}
          </span>
        )}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-2xl">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}





