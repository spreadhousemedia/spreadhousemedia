import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  Phone,
  Mail,
  Building,
  Send,
  Trash2,
} from 'lucide-react'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { ContactInquiry } from '../../types/ecommerce'

export function AdminInquiries() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadData = async () => {
    setLoading(true)
    const list = await ecommerceDb.getInquiries()
    setInquiries(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusChange = async (id: string, status: ContactInquiry['status']) => {
    await ecommerceDb.updateInquiryStatus(id, status)
    await loadData()
  }

  const handleDeleteInquiry = async (id: string, company: string) => {
    if (confirm(`Delete inquiry from "${company}"? This cannot be undone.`)) {
      await ecommerceDb.deleteInquiry(id)
      await loadData()
    }
  }

  const totalPipeline = inquiries.reduce((sum, i) => sum + (i.estimatedQuote || 0), 0)

  const filtered = inquiries.filter((inq) => {
    if (statusFilter !== 'all' && inq.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        inq.name.toLowerCase().includes(q) ||
        inq.company.toLowerCase().includes(q) ||
        inq.email.toLowerCase().includes(q) ||
        inq.phone.includes(q)
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
            <Users className="h-6 w-6 text-brand-600" />
            <span>Corporate Leads &amp; Enterprise Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-0.5">
            Review bulk card requests, calculate volume quotes, and connect with business clients.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Total Inquiries</span>
          <p className="text-2xl font-bold theme-text-main">{inquiries.length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">New Leads</span>
          <p className="text-2xl font-bold text-rose-500">
            {inquiries.filter((i) => i.status === 'new').length}
          </p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Est. Pipeline Value</span>
          <p className="text-2xl font-bold text-emerald-600">₹{totalPipeline.toLocaleString('en-IN')}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Contacted</span>
          <p className="text-2xl font-bold text-brand-600">
            {inquiries.filter((i) => i.status === 'contacted' || i.status === 'proposal_sent').length}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="theme-card p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, client or phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Leads' },
              { id: 'new', label: 'New' },
              { id: 'contacted', label: 'Contacted' },
              { id: 'proposal_sent', label: 'Proposal Sent' },
              { id: 'closed', label: 'Closed' },
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

      {/* Inquiries List */}
      {loading ? (
        <div className="theme-card p-12 rounded-2xl border text-center theme-text-muted">
          Loading inquiries pipeline...
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-card p-12 rounded-2xl border text-center space-y-2">
          <Users className="h-10 w-10 mx-auto theme-text-muted opacity-40" />
          <p className="text-sm font-semibold theme-text-main">No inquiries found</p>
          <p className="text-xs theme-text-muted">Corporate submissions from /contact will appear here in real-time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inq) => (
            <div
              key={inq.id}
              className="theme-card rounded-2xl border shadow-xs p-5 space-y-4 transition-all hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 font-bold text-sm">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold theme-text-main flex items-center gap-2">
                      <span>{inq.company}</span>
                      <span className="text-xs font-normal theme-text-muted">({inq.name})</span>
                    </h3>
                    <p className="text-[11px] theme-text-muted">
                      Team Size: {inq.teamSize} members • Submitted on{' '}
                      {new Date(inq.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] theme-text-muted block">Estimated Quote ({inq.cardVolume} cards)</span>
                    <strong className="text-sm font-bold text-emerald-600">
                      ₹{inq.estimatedQuote.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <select
                    value={inq.status}
                    onChange={(e: any) => handleStatusChange(inq.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-colors ${
                      inq.status === 'closed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60'
                        : inq.status === 'proposal_sent'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/60'
                        : inq.status === 'contacted'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60'
                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60'
                    }`}
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="closed">Closed / Won</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              {inq.message && (
                <div className="p-3.5 rounded-xl theme-subtle border theme-border text-xs theme-text-sub leading-relaxed">
                  <strong className="theme-text-main block mb-1">Client Note:</strong>
                  {inq.message}
                </div>
              )}

              {/* Contacts Row */}
              <div className="pt-2 border-t theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 theme-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-brand-500" />
                    <a href={`mailto:${inq.email}`} className="hover:underline">
                      {inq.email}
                    </a>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <a href={`tel:${inq.phone}`} className="hover:underline font-mono">
                      {inq.phone}
                    </a>
                  </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <a
                    href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${inq.name}! Thank you for contacting Spread NFC regarding corporate NFC cards for ${inq.company}. I would love to share our enterprise portfolio and volume pricing quote for ${inq.cardVolume} cards.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteInquiry(inq.id, inq.company)}
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
    </div>
  )
}
