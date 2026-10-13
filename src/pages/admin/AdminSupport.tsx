import { useState, useEffect } from 'react'
import {
  LifeBuoy,
  Search,
  Phone,
  Mail,
  QrCode,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { SupportTicket } from '../../types/ecommerce'

export function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Selected Ticket for Resolution Note modal
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [resolutionText, setResolutionText] = useState('')
  const [newStatus, setNewStatus] = useState<SupportTicket['status']>('resolved')
  const [saveLoading, setSaveLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await ecommerceDb.getTickets()
    setTickets(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const openResolutionModal = (t: SupportTicket) => {
    setActiveTicket(t)
    setResolutionText(t.resolutionNotes || '')
    setNewStatus(t.status)
  }

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTicket) return
    setSaveLoading(true)
    await ecommerceDb.updateTicket(activeTicket.id, {
      status: newStatus,
      resolutionNotes: resolutionText,
    })
    setSaveLoading(false)
    setActiveTicket(null)
    await loadData()
  }

  const handleQuickStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
    await ecommerceDb.updateTicket(ticketId, { status })
    await loadData()
  }

  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    if (confirm(`Delete ticket #${ticketNumber}? This cannot be undone.`)) {
      await ecommerceDb.deleteTicket(ticketId)
      await loadData()
    }
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.associatedQrNumber && t.associatedQrNumber.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold theme-text-main flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand-600" />
            <span>Customer Hardware &amp; QR Helpdesk</span>
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-0.5">
            Triage customer queries, diagnose NFC &amp; QR issues, and record live resolution timelines.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Total Tickets</span>
          <p className="text-2xl font-bold theme-text-main">{tickets.length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Open Queries</span>
          <p className="text-2xl font-bold text-rose-500">
            {tickets.filter((t) => t.status === 'open').length}
          </p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">In Investigation</span>
          <p className="text-2xl font-bold text-amber-500">
            {tickets.filter((t) => t.status === 'in_progress').length}
          </p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Resolved</span>
          <p className="text-2xl font-bold text-emerald-600">
            {tickets.filter((t) => t.status === 'resolved').length}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="theme-card p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Ticket #, Name, QR..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Tickets' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'resolved', label: 'Resolved' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s.id
                  ? 'bg-brand-600 text-white'
                  : 'theme-subtle theme-border border theme-text-muted hover:theme-text-main'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Cards List */}
      {loading ? (
        <div className="theme-card p-12 rounded-2xl border text-center theme-text-muted">
          Loading support tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-card p-12 rounded-2xl border text-center space-y-2">
          <LifeBuoy className="h-10 w-10 mx-auto theme-text-muted opacity-40" />
          <p className="text-sm font-semibold theme-text-main">No tickets found</p>
          <p className="text-xs theme-text-muted">Support tickets submitted by users will appear here in real-time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="theme-card rounded-2xl border shadow-xs p-5 space-y-4 transition-all hover:shadow-md"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-lg">
                    #{ticket.ticketNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider theme-subtle border theme-border theme-text-sub font-mono">
                    {ticket.category.replace('_', ' ')}
                  </span>
                  {ticket.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                      URGENT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs theme-text-muted">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <select
                    value={ticket.status}
                    onChange={(e: any) => handleQuickStatusChange(ticket.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-colors ${
                      ticket.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60'
                        : ticket.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60'
                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60'
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold theme-text-main">{ticket.subject}</h3>
                <p className="text-xs theme-text-sub leading-relaxed theme-subtle p-3.5 rounded-xl border theme-border">
                  {ticket.description}
                </p>
              </div>

              {/* Customer & Associated Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="flex items-center gap-2 theme-text-muted">
                  <Mail className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                  <span className="truncate">{ticket.customerName} ({ticket.customerEmail})</span>
                </div>
                <div className="flex items-center gap-2 theme-text-muted">
                  <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{ticket.customerPhone}</span>
                </div>
                {ticket.associatedQrNumber && (
                  <div className="flex items-center gap-2 theme-text-muted">
                    <QrCode className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span>Card QR: <strong className="font-mono theme-text-main">{ticket.associatedQrNumber}</strong></span>
                  </div>
                )}
              </div>

              {/* Resolution Note if present */}
              {ticket.resolutionNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                  <strong className="text-emerald-900 dark:text-emerald-300 font-bold block">
                    Diagnostic &amp; Resolution Note (Visible to Customer):
                  </strong>
                  <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed">{ticket.resolutionNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t theme-border flex items-center justify-between">
                <a
                  href={`https://wa.me/${ticket.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hi ${ticket.customerName}! Regarding your Spread NFC support ticket #${ticket.ticketNumber} (${ticket.subject}):`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Reply via WhatsApp</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openResolutionModal(ticket)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Add Resolution Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(ticket.id, ticket.ticketNumber)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200/50 dark:border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Note Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5">
            <h3 className="text-base font-bold theme-text-main flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand-600" />
              <span>Update Resolution for #{activeTicket.ticketNumber}</span>
            </h3>

            <form onSubmit={handleSaveResolution} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold theme-text-main mb-1">Status Update</label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-subtle theme-text-main outline-none"
                >
                  <option value="in_progress">In Progress / Under Investigation</option>
                  <option value="resolved">Resolved &amp; Confirmed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold theme-text-main mb-1">
                  Resolution Diagnostic Note *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="e.g. Diagnostic verified QR destination repoint. Replacement NFC card dispatched via courier AWB #..."
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-subtle theme-text-main outline-none"
                />
                <p className="text-[11px] theme-text-muted mt-1">
                  This note will instantly appear on the customer&apos;s live ticket tracking screen at /support.
                </p>
              </div>

              <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="px-4 py-2 rounded-xl theme-subtle border theme-border theme-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl text-white bg-brand-600 hover:bg-brand-700 font-semibold"
                >
                  Save &amp; Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
