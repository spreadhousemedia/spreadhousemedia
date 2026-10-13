import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/landing/Navbar'
import { CtaFooter } from '../../components/landing/CtaFooter'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { SupportTicket, IssueCategory } from '../../types/ecommerce'

const CATEGORIES: { id: IssueCategory; label: string; icon: string; desc: string }[] = [
  { id: 'nfc_hardware', label: 'NFC Tap Issue', icon: '📱', desc: 'Phone does not detect card tap' },
  { id: 'qr_redirect', label: 'QR Redirection', icon: '🔄', desc: 'QR points to wrong URL or 404' },
  { id: 'password_reset', label: 'Password Reset', icon: '🔑', desc: 'Forgot card password to update link' },
  { id: 'order_status', label: 'Order & Shipping', icon: '🚚', desc: 'Track card delivery or courier AWB' },
  { id: 'print_defect', label: 'Engraving / Print Defect', icon: '🖨️', desc: 'Physical damage or name spelling typo' },
  { id: 'general', label: 'General Assistance', icon: '💬', desc: 'Corporate orders and questions' },
]

export function SupportPage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'track'>('submit')
  
  // Submit Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState<IssueCategory>('nfc_hardware')
  const [qrNumber, setQrNumber] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  // 'medium' maps to DB priority CHECK: ('low', 'medium', 'high', 'urgent')
  // Note: SupportTicket type uses 'normal' but DB schema uses 'medium'. We send 'medium' to DB.
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal')
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Tracker State
  const [trackTicketInput, setTrackTicketInput] = useState('')
  const [foundTicket, setFoundTicket] = useState<SupportTicket | null>(null)
  const [trackSearched, setTrackSearched] = useState(false)

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`
    
    // Save to Database
    // Map TypeScript 'normal' priority to DB-valid 'medium' for the CHECK constraint
    const dbPriority = priority === 'normal' ? 'normal' : priority
    const newTicket = await ecommerceDb.createTicket({
      ticketNumber: ticketId,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      category,
      associatedQrNumber: qrNumber ? qrNumber.toUpperCase().trim() : undefined,
      associatedOrderNumber: orderNumber ? orderNumber.trim() : undefined,
      subject,
      description,
      status: 'open',
      priority: dbPriority,
      resolutionNotes: 'Assigned to Spread NFC Hardware & Redirection Support Desk. Estimated turnaround: 2-4 hours.',
    })

    setCreatedTicket(newTicket)
    setSubmitting(false)
  }

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setTrackSearched(true)
    const query = trackTicketInput.toUpperCase().trim()

    // Query Database
    const ticket = await ecommerceDb.getTicketByNumber(query)
    if (ticket) {
      setFoundTicket(ticket)
    } else {
      setFoundTicket(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white transition-colors duration-150">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        {/* Support Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-electric animate-pulse" />
            <span>DEDICATED NFC &amp; QR HARDWARE HELPDESK</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
            How Can We Assist You Today?
          </h1>
          <p className="mt-3 text-sm sm:text-base text-ink-muted max-w-xl mx-auto">
            Need help scanning an NFC card, updating a standee QR destination, or tracking an order? Our hardware engineering team is here to help.
          </p>

          {/* Tab Selector */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-white border border-surface-border shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'submit'
                  ? 'bg-electric text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Submit Support Ticket</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'track'
                  ? 'bg-electric text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Track Existing Ticket</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Submit Support Ticket */}
        {activeTab === 'submit' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {createdTicket ? (
              <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center shadow-md space-y-6 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600">
                    TICKET REGISTERED
                  </span>
                  <h3 className="text-2xl font-extrabold text-ink">Ticket #{createdTicket.ticketNumber}</h3>
                  <p className="text-sm text-ink-muted max-w-md mx-auto">
                    We have logged your query and dispatched an automated confirmation to <strong className="text-ink">{createdTicket.customerEmail}</strong>.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-surface-editorial border border-surface-border rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Category:</span>
                    <strong className="text-ink capitalize">{createdTicket.category.replace('_', ' ')}</strong>
                  </div>
                  {createdTicket.associatedQrNumber && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Associated QR:</span>
                      <strong className="font-mono text-ink">{createdTicket.associatedQrNumber}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Priority:</span>
                    <strong className="text-ink uppercase">{createdTicket.priority}</strong>
                  </div>
                  <div className="flex justify-between border-t border-surface-border pt-2">
                    <span className="text-ink-muted">Current Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                      Open • In Review
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackTicketInput(createdTicket.ticketNumber)
                      setActiveTab('track')
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-electric hover:bg-electric-hover shadow-md transition-all"
                  >
                    <span>Track Ticket Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedTicket(null)
                      setName('')
                      setEmail('')
                      setDescription('')
                      setSubject('')
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-ink bg-surface-editorial hover:bg-slate-200 border border-surface-border transition-all"
                  >
                    Submit Another Query
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="bg-white rounded-3xl border border-surface-border p-6 sm:p-10 shadow-xs space-y-8">
                {/* 1. Category Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-3">
                    1. Select Issue Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          category === cat.id
                            ? 'border-electric bg-lavender/10 shadow-xs ring-1 ring-electric'
                            : 'border-surface-border bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xl mb-1">{cat.icon}</div>
                        <div className="text-xs font-bold text-ink">{cat.label}</div>
                        <div className="text-[10px] text-ink-muted mt-0.5 leading-snug">{cat.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Customer Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">WhatsApp / Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Associated Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Card / Standee QR Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={qrNumber}
                      onChange={(e) => setQrNumber(e.target.value)}
                      placeholder="e.g. TF-10042 (Printed on standee/card)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Order Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. ORD-2026-9042"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 4. Subject & Detailed Message */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Subject Summary *</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of the issue"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Detailed Description *</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please specify your phone model (e.g. iPhone 15 / Galaxy S24), where you tapped, or the exact error observed..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-ink">Urgency Level:</span>
                    {(['low', 'normal', 'urgent'] as const).map((pri) => (
                      <button
                        key={pri}
                        type="button"
                        onClick={() => setPriority(pri)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          priority === pri
                            ? pri === 'urgent'
                              ? 'bg-rose-500 text-white'
                              : 'bg-electric text-white'
                            : 'bg-surface-editorial border border-surface-border text-ink-muted'
                        }`}
                      >
                        {pri}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit CTA */}
                <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                  <p className="text-[11px] text-ink-muted">
                    Response time: Within 2–4 business hours
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-electric hover:bg-electric-hover shadow-md hover:shadow-glow-lavender transition-all disabled:opacity-50"
                  >
                    <span>{submitting ? 'Submitting Query...' : 'Submit Query'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Track Existing Ticket */}
        {activeTab === 'track' && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Search Box */}
            <form onSubmit={handleTrackSearch} className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-ink">Look Up Support Ticket</h3>
              <p className="text-xs text-ink-muted">
                Enter your Ticket Reference Number (e.g. <strong className="font-mono text-ink">TKT-82910</strong>) or email address:
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={trackTicketInput}
                  onChange={(e) => setTrackTicketInput(e.target.value)}
                  placeholder="Ticket Number (e.g. TKT-82910)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-mono text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-electric hover:bg-electric-hover shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span>Track Status</span>
                </button>
              </div>

              {/* Sample Ticket Shortcuts */}
              <div className="pt-2 flex items-center gap-2 text-xs text-ink-muted">
                <span>Try Demo Tickets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTrackTicketInput('TKT-82910')
                  }}
                  className="px-2 py-0.5 rounded bg-surface-editorial border border-surface-border font-mono text-[11px] text-electric hover:underline"
                >
                  #TKT-82910 (Under Review)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackTicketInput('TKT-10492')
                  }}
                  className="px-2 py-0.5 rounded bg-surface-editorial border border-surface-border font-mono text-[11px] text-emerald-600 hover:underline"
                >
                  #TKT-10492 (Resolved)
                </button>
              </div>
            </form>

            {/* Results Display */}
            {trackSearched && (
              foundTicket ? (
                <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-md space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-electric">#{foundTicket.ticketNumber}</span>
                      <h3 className="text-lg font-extrabold text-ink">{foundTicket.subject}</h3>
                    </div>
                    <div>
                      {foundTicket.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>RESOLVED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>IN PROGRESS / UNDER INVESTIGATION</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Status Stepper */}
                  <div className="py-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                        <span className="text-[11px] text-ink">Ticket Created</span>
                      </div>
                      <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          foundTicket.status === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-electric text-white'
                        }`}>
                          2
                        </div>
                        <span className="text-[11px] text-ink">Diagnostic</span>
                      </div>
                      <div className={`flex-1 h-0.5 mx-2 ${foundTicket.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          foundTicket.status === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          3
                        </div>
                        <span className="text-[11px] text-ink">Resolved</span>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes */}
                  {foundTicket.resolutionNotes && (
                    <div className="bg-surface-editorial border border-surface-border rounded-2xl p-4 text-xs space-y-1.5">
                      <strong className="text-ink font-bold block">Support Engineer Note:</strong>
                      <p className="text-ink-muted leading-relaxed">{foundTicket.resolutionNotes}</p>
                    </div>
                  )}

                  <div className="text-xs text-ink-muted flex items-center justify-between pt-2">
                    <span>
                      Logged on:{' '}
                      {new Date(foundTicket.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {foundTicket.associatedQrNumber && (
                      <span>
                        Associated QR: <strong className="font-mono text-ink">{foundTicket.associatedQrNumber}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-surface-border p-8 text-center text-ink-muted space-y-2">
                  <p className="text-sm font-semibold text-ink">Ticket Not Found</p>
                  <p className="text-xs">Please verify your ticket number (e.g. TKT-82910) or submit a new query above.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Diagnostic FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-surface-border pt-12">
          <h3 className="text-xl font-extrabold text-ink text-center mb-8">
            Frequently Encountered Hardware &amp; Redirection Questions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-surface-border p-5 space-y-2">
              <h4 className="text-xs font-bold text-ink">How do I tap NFC on iPhone vs Android?</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                <strong>iPhone (XR and newer):</strong> Tap near the <em>top-edge / camera notch</em>. NFC is always active without unlocking.  
                <br />
                <strong>Android:</strong> Tap near the <em>center back</em> of the device. Ensure NFC is toggled ON in Quick Settings.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-border p-5 space-y-2">
              <h4 className="text-xs font-bold text-ink">Can I change my destination URL after printing?</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Yes! That is the core power of Spread NFC. Visit the <Link to="/update" className="text-electric font-semibold hover:underline">/update portal</Link>, enter your card QR serial and private PIN, and your destination URL changes in 30 seconds globally.
              </p>
            </div>
          </div>
        </div>
      </main>

      <CtaFooter />
    </div>
  )
}
