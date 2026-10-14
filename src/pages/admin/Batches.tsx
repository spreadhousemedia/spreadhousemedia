import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, ChevronLeft, RefreshCw, Calendar, Hash, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'
import type { Batch } from '../../types'
import { getCached, setCached } from '../../lib/cache'

export function Batches() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const cached = getCached<Batch[]>('batches_full_list')
    if (cached) {
      setBatches(cached)
      setLoading(false)
    }
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_name, series_prefix, start_number, end_number, total_qr_codes, created_at, updated_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      const list = (data as Batch[]) ?? []
      setBatches(list)
      setCached('batches_full_list', list, 5 * 60 * 1000)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="theme-subtle flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold theme-hover transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <h1 className="theme-text-main text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-600" />
            Batches
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={load} disabled={loading} className="theme-subtle flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold theme-hover transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-600" : "theme-text-muted"}`} />
            <span className="theme-text-main">Refresh</span>
          </button>
          <Link to="/admin/bulk" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all">
            <Layers className="h-3.5 w-3.5" />
            Create Bulk Batch
          </Link>
        </div>
      </div>

      <div className="theme-card rounded-2xl border shadow-sm transition-colors overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="theme-table-header text-[11px] uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="px-5 py-3.5">Batch Name</th>
                <th className="px-5 py-3.5">Prefix</th>
                <th className="px-5 py-3.5">Range</th>
                <th className="px-5 py-3.5">Total QRs</th>
                <th className="px-5 py-3.5">Created At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center theme-text-muted">
                    <Spinner size={24} className="mx-auto text-brand-600" />
                    <p className="mt-2 text-xs">Loading batches...</p>
                  </td>
                </tr>
              )}
              {!loading && batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center theme-text-muted">
                    No batches found.
                  </td>
                </tr>
              )}
              {batches.map((batch) => (
                <tr key={batch.id} className="theme-table-row group transition-colors hover:bg-zinc-50/70">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="theme-text-main font-semibold text-sm">{batch.batch_name}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200/80 font-mono">{batch.series_prefix}</span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap theme-text-main font-mono text-sm">{batch.start_number} - {batch.end_number}</td>
                  <td className="px-5 py-4 whitespace-nowrap theme-text-main font-semibold text-sm"><div className="flex items-center gap-1"><Hash className="h-3 w-3 theme-text-muted" /><span>{batch.total_qr_codes}</span></div></td>
                  <td className="px-5 py-4 whitespace-nowrap theme-text-muted text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{new Date(batch.created_at).toLocaleString()}</span></td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Link to={`/admin/manage?batch=${batch.id}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors shadow-2xs">
                      <FileText className="h-3 w-3" /><span>View QRs</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


