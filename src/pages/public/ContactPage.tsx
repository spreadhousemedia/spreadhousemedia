import { useState } from 'react'
import { Navbar } from '../../components/landing/Navbar'
import { CtaFooter } from '../../components/landing/CtaFooter'
import { ecommerceDb } from '../../lib/ecommerceDb'

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('11-50')
  const [inquiryType, setInquiryType] = useState('corporate_cards')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Interactive Corporate Quote Estimator State
  const [cardVolume, setCardVolume] = useState(25)

  const getEstimatedQuote = (qty: number) => {
    let unitRate = 499
    let discountPct = 0
    if (qty >= 100) {
      discountPct = 40
      unitRate = 299
    } else if (qty >= 50) {
      discountPct = 35
      unitRate = 324
    } else if (qty >= 20) {
      discountPct = 25
      unitRate = 374
    } else if (qty >= 5) {
      discountPct = 15
      unitRate = 424
    }
    const total = qty * unitRate
    return { unitRate, discountPct, total }
  }

  const quote = getEstimatedQuote(cardVolume)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    // Save to Database
    await ecommerceDb.createInquiry({
      name,
      email,
      phone,
      company,
      teamSize,
      inquiryType,
      cardVolume,
      estimatedQuote: quote.total,
      message,
      status: 'new',
    })

    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col selection:bg-electric selection:text-white transition-colors duration-150">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-electric bg-electric/10 border border-electric/20 mb-4">
            <span className="w-2 h-2 rounded-full bg-electric animate-pulse" />
            <span>ENTERPRISE SOLUTIONS &amp; PARTNERSHIPS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight max-w-3xl mx-auto leading-tight">
            Connect With Our Team for Custom Orders &amp; Enterprise Rollouts
          </h1>
          <p className="mt-4 text-sm sm:text-base text-ink-muted max-w-2xl mx-auto">
            Whether you need 25 executive cards for your sales department or 500 custom-branded standees for retail branches, we offer volume pricing, custom laser engraving, and dedicated onboarding.
          </p>
        </div>

        {/* Content Section: 2 Columns */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Contact Form & Estimator (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Interactive Corporate Estimator */}
              <div className="bg-white text-ink rounded-3xl p-6 sm:p-8 shadow-xs border border-surface-border space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-electric font-bold">INSTANT ESTIMATOR</span>
                    <h3 className="text-lg font-extrabold tracking-tight text-ink">Corporate Volume Pricing Calculator</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-electric/10 text-electric border border-electric/20">
                    {quote.discountPct}% Volume Discount
                  </span>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-ink">
                    <label htmlFor="team-cards-slider" className="font-semibold">Quantity of Team Cards:</label>
                    <span className="text-base font-bold text-electric">{cardVolume} Cards</span>
                  </div>
                  <input
                    id="team-cards-slider"
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={cardVolume}
                    onChange={(e) => setCardVolume(parseInt(e.target.value))}
                    className="w-full accent-electric cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                    <span>5 Cards</span>
                    <span>50 Cards (Free Engraving)</span>
                    <span>200+ Cards (VIP Custom Box)</span>
                    <span>500 Cards</span>
                  </div>
                </div>

                {/* Calculation Cards */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-surface-border text-center">
                  <div className="bg-surface-editorial p-3 rounded-2xl border border-surface-border">
                    <span className="text-[10px] font-mono text-ink-muted block">Unit Rate</span>
                    <strong className="text-sm sm:text-base font-extrabold text-ink">₹{quote.unitRate}</strong>
                    <span className="text-[9px] text-ink-muted block">per card</span>
                  </div>
                  <div className="bg-surface-editorial p-3 rounded-2xl border border-surface-border">
                    <span className="text-[10px] font-mono text-ink-muted block">You Save</span>
                    <strong className="text-sm sm:text-base font-extrabold text-emerald-600">
                      ₹{(499 - quote.unitRate) * cardVolume}
                    </strong>
                    <span className="text-[9px] text-emerald-600 block">{quote.discountPct}% off</span>
                  </div>
                  <div className="bg-lavender/10 p-3 rounded-2xl border border-lavender/25">
                    <span className="text-[10px] font-mono text-electric block font-semibold">Est. Total</span>
                    <strong className="text-sm sm:text-base font-extrabold text-electric">₹{quote.total}</strong>
                    <span className="text-[9px] text-ink-muted block">Includes GST</span>
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Includes free CSV batch upload, custom vector logo engraving &amp; admin dashboard setup</span>
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs">
                {submitted ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-ink">Inquiry Submitted Successfully</h3>
                    <p className="text-xs text-ink-muted max-w-md mx-auto">
                      Thank you, <strong className="text-ink">{name}</strong>. Our enterprise sales lead will contact you at <strong className="text-ink">{email}</strong> within 4 business hours with custom proofs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-ink bg-surface-editorial border border-surface-border hover:bg-slate-200 transition-all"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-base font-bold text-ink mb-1">Send Enterprise Inquiry</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Your Full Name *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Vikram Singhania"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Work Email Address *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vikram@company.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Phone / WhatsApp Number *</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Company / Organization *</label>
                        <input
                          type="text"
                          required
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Company Pvt Ltd"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Estimated Team Size</label>
                        <select
                          value={teamSize}
                          onChange={(e) => setTeamSize(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm font-medium text-ink bg-white focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        >
                          <option value="1-10">1 – 10 Team Members</option>
                          <option value="11-50">11 – 50 Team Members</option>
                          <option value="50-200">50 – 200 Team Members</option>
                          <option value="200+">200+ Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ink mb-1">Interest Category</label>
                        <select
                          value={inquiryType}
                          onChange={(e) => setInquiryType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border text-xs sm:text-sm font-medium text-ink bg-white focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                        >
                          <option value="corporate_cards">Corporate Smart Cards</option>
                          <option value="retail_standees">Retail / Event Standees</option>
                          <option value="reseller">White-Label / Reseller Agency</option>
                          <option value="custom_order">Custom Design Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-ink mb-1">Specific Requirements or Questions</label>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us about your brand guidelines, deadline, or desired card finish (e.g. Matte PVC, Laser-engraved Metal, or Bamboo Wood)..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-white text-xs sm:text-sm font-medium text-ink placeholder:text-zinc-400 focus:border-electric focus:ring-1 focus:ring-electric outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-electric hover:bg-electric-hover shadow-md hover:shadow-glow-lavender transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>{submitting ? 'Submitting Inquiry...' : 'Request Enterprise Quote & Digital Proof'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Direct Studio Channels & Information (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* WhatsApp Quick Connect */}
              <div className="bg-emerald-600 text-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">Instant WhatsApp Support</h4>
                    <p className="text-[11px] text-white/80">+91 93510 42276 • Typically replies within 5 mins</p>
                  </div>
                </div>

                <p className="text-xs text-white/90 leading-relaxed">
                  Have a quick question about card compatibility, urgent order dispatch, or bulk discounts? Chat directly with our hardware team.
                </p>

                <a
                  href={`https://wa.me/919351042276?text=${encodeURIComponent(
                    'Hello Spread NFC! I am interested in custom NFC cards and QR standees for my business. Please share catalog and details.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-emerald-700 font-bold text-xs hover:bg-slate-100 transition-all shadow-xs"
                >
                  <span>Chat on WhatsApp (+91 93510 42276)</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>

              {/* Direct Reach-Out Details */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-7 shadow-xs space-y-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Direct Inquiries &amp; Studio Office
                </h4>

                <div className="space-y-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-editorial border border-surface-border shrink-0 text-electric">
                      ✉️
                    </div>
                    <div>
                      <span className="font-bold text-ink block">Corporate Sales</span>
                      <a href="mailto:enterprise@spreadnfc.in" className="text-electric hover:underline font-mono">
                       contact@spreadnfc.in
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-editorial border border-surface-border shrink-0 text-emerald-600">
                      🛠️
                    </div>
                    <div>
                      <span className="font-bold text-ink block">Hardware &amp; Helpdesk</span>
                      <a href="mailto:contact@spreadnfc.in" className="text-electric hover:underline font-mono">
                        contact@spreadnfc.in
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-editorial border border-surface-border shrink-0 text-emerald-600">
                      💬
                    </div>
                    <div>
                      <span className="font-bold text-ink block">WhatsApp Hotline &amp; Calls</span>
                      <a href="https://wa.me/919351042276" target="_blank" rel="noopener noreferrer" className="text-electric hover:underline font-mono">
                        +91 93510 42276
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-editorial border border-surface-border shrink-0 text-amber-600">
                      ⏰
                    </div>
                    <div>
                      <span className="font-bold text-ink block">Operating Hours</span>
                      <p className="text-ink-muted">Monday – Saturday: 9:30 AM – 6:30 PM IST</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-editorial border border-surface-border shrink-0 text-electric">
                      🏢
                    </div>
                    <div>
                      <span className="font-bold text-ink block">spreadnfc.in Design And develop By</span>
                      <p className="text-ink-muted leading-relaxed">
                        ETROMO.in o<br />
                        Tech Center • India
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CtaFooter />
    </div>
  )
}
