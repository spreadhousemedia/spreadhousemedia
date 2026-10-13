import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '../../components/landing/Navbar'
import { CtaFooter } from '../../components/landing/CtaFooter'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { Product } from '../../types/ecommerce'

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<'all' | 'cards' | 'standees' | 'tags'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>('')
  
  // Customization Form State
  const [cardholderName, setCardholderName] = useState('Alex Morgan')
  const [companyTitle, setCompanyTitle] = useState('Founder & CEO • Apex Studio')
  const [customerEmail, setCustomerEmail] = useState('alex@example.com')
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210')
  const [destinationUrl, setDestinationUrl] = useState('https://linkedin.com/in/alexmorgan')
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const list = await ecommerceDb.getProducts({ activeOnly: true })
      setProducts(list)
      setLoading(false)
    }
    load()
  }, [])

  // Tier Discount Calculation
  const getTierDiscountPct = (qty: number) => {
    if (qty >= 50) return 35
    if (qty >= 20) return 25
    if (qty >= 5) return 15
    return 0
  }

  const discountPct = getTierDiscountPct(orderQuantity)

  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'all') return true
    return p.category === activeCategory
  })

  const openCustomizer = (product: Product) => {
    setSelectedProduct(product)
    setSelectedColor(product.colors[0]?.name || '')
    setOrderSubmitted(false)
  }

  const rawPrice = (selectedProduct?.salePrice || 499) * orderQuantity
  const discountAmount = Math.round((rawPrice * discountPct) / 100)
  const finalPrice = rawPrice - discountAmount

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    const generatedOrderNum = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    // Save to Database / Backend
    await ecommerceDb.createOrder({
      orderNumber: generatedOrderNum,
      customerName: cardholderName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      quantity: orderQuantity,
      unitPrice: selectedProduct.salePrice,
      discountAmount: discountAmount,
      totalAmount: finalPrice,
      cardholderName: cardholderName,
      companyName: companyTitle,
      destinationUrl: destinationUrl,
      customFinish: selectedColor || selectedProduct.colors[0]?.name || 'Standard Finish',
      paymentStatus: 'paid',
      orderStatus: 'pending_verification',
    })

    setOrderRef(generatedOrderNum)
    setOrderSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-ghost text-[#111827] flex flex-col selection:bg-lavender selection:text-white">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-20">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-lavender bg-lavender/10 border border-lavender/20 mb-5">
            <span className="w-2 h-2 rounded-full bg-lavender animate-pulse" />
            <span>SMART HARDWARE • ZERO SUBSCRIPTION FEES</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#111827] tracking-tight max-w-4xl mx-auto leading-tight">
            Smart Contactless Cards &amp; Stands{' '}
            <span className="text-lavender font-editorial italic font-normal">With Infinite Possibilities.</span>
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#626B78] max-w-2xl mx-auto leading-relaxed">
            One tap connects your website, social portfolio, or Google Reviews directly to any smartphone. Permanent physical durability with instant self-service link updates.
          </p>

          {/* Category Filter Chips */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {(
              [
                { id: 'all', label: 'All Products' },
                { id: 'cards', label: 'Smart NFC Cards' },
                { id: 'standees', label: 'Counter Standees' },
                { id: 'tags', label: 'Mini Epoxy Tags' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  activeCategory === tab.id
                    ? 'bg-lavender text-white shadow-md shadow-lavender/25'
                    : 'bg-white text-[#626B78] hover:text-[#111827] border border-[#DCE2EA] hover:border-lavender/40 hover:bg-[#F5F7FC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Tier Discount Banner */}
          <div className="mt-8 max-w-3xl mx-auto bg-gradient-to-r from-lavender/10 via-purple-50/50 to-lavender/10 border border-lavender/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lavender text-white font-bold text-lg shadow-sm shadow-lavender/25">
                %
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#111827]">Volume &amp; Team Discounts Automatically Applied</h4>
                <p className="text-xs text-[#626B78]">5–19 Cards: 15% OFF • 20–49: 25% OFF • 50+ Cards: 35% OFF + Free Logo Engraving</p>
              </div>
            </div>
            <Link
              to="/contact"
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-lavender bg-white border border-lavender/30 hover:bg-lavender hover:text-white transition-all shadow-sm"
            >
              Custom Team Quote
            </Link>
          </div>
        </div>

        {/* Product Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-24">
              <div className="inline-block w-8 h-8 border-4 border-lavender border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#626B78]">Loading hardware catalogue...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#F8F9FB] border border-[#DCE2EA] flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#626B78]"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
              </div>
              <p className="text-base font-bold text-[#111827]">No products in this category</p>
              <p className="text-sm text-[#626B78]">Check back soon or view all products.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group relative flex flex-col bg-white rounded-3xl border border-[#DCE2EA] hover:border-lavender/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Visual Card Mockup Render Box */}
                <div className={`relative h-60 w-full bg-gradient-to-br ${product.previewGradient} p-6 flex flex-col justify-between overflow-hidden`}>
                  {/* Atmospheric Glow */}
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Row: Brand & Chip specs */}
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-xs font-mono font-bold tracking-widest text-white/80">Spread NFC</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-white/15 text-white backdrop-blur-md border border-white/20">
                      {product.chipType}
                    </span>
                  </div>

                  {/* Simulated Card Surface Details */}
                  <div className="relative z-10 text-white space-y-1">
                    <div className="flex items-center gap-2">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-300 animate-pulse">
                        <path d="M6 9a6 6 0 0 1 12 0" />
                        <path d="M3 13a10 10 0 0 1 18 0" />
                        <circle cx="12" cy="17" r="1" fill="currentColor" />
                      </svg>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-200">NFC Contactless</span>
                    </div>
                    <div className="text-lg font-bold tracking-tight text-white/95">Your Name Here</div>
                    <div className="text-[11px] text-white/70">Company &amp; Custom Title</div>
                  </div>

                  {/* Bottom Row: Material info */}
                  <div className="flex items-center justify-between text-[11px] text-white/60 relative z-10 font-mono">
                    <span>{product.material}</span>
                    <span className="text-white/80 font-bold">LIFETIME QR</span>
                  </div>
                </div>

                {/* Card Content & Specs */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5 bg-white">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {product.badge && (
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-lavender/10 text-lavender mb-1.5 font-mono border border-lavender/20">
                            {product.badge}
                          </span>
                        )}
                        <h3 className="text-lg font-extrabold text-[#111827] group-hover:text-lavender transition-colors">
                          {product.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-[#626B78] leading-relaxed">
                      {product.description}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-1.5 pt-2 border-t border-[#DCE2EA]">
                      {product.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-[#111827] font-medium">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Price & CTA Row */}
                  <div className="pt-4 border-t border-[#DCE2EA] flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-[#111827]">₹{product.salePrice}</span>
                        <span className="text-xs text-[#626B78] line-through">₹{product.basePrice}</span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600">Includes Free Custom Engraving</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCustomizer(product)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-lavender hover:bg-lavender-hover shadow-md shadow-lavender/25 group-hover:shadow-glow-lavender transition-all duration-200"
                    >
                      <span>Customize &amp; Order</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </main>

      {/* Interactive Customization & Order Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#DCE2EA] overflow-hidden my-8">
            {/* Header */}
            <div className="px-6 py-4 bg-[#F8F9FB] border-b border-[#DCE2EA] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric text-white text-xs font-bold">
                  ✨
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Customize: {selectedProduct.title}</h3>
                  <p className="text-[11px] text-[#626B78]">Preview your card design in real-time before ordering</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg text-[#626B78] hover:text-[#111827] hover:bg-slate-200 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {orderSubmitted ? (
              /* Order Confirmation State */
              <div className="p-8 sm:p-12 text-center space-y-5 bg-white">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600">ORDER RECEIVED</span>
                  <h3 className="text-2xl font-extrabold text-[#111827]">Thank You For Your Order!</h3>
                  <p className="text-sm text-[#626B78] max-w-md mx-auto">
                    Your custom order <strong className="font-mono text-[#111827]">{orderRef}</strong> has been logged into the manufacturing queue.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-[#F8F9FB] border border-[#DCE2EA] rounded-2xl p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#626B78]">Cardholder Name:</span>
                    <strong className="text-[#111827]">{cardholderName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#626B78]">Quantity:</span>
                    <strong className="text-[#111827]">{orderQuantity} units</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#626B78]">Initial Redirect URL:</span>
                    <strong className="text-[#111827] truncate max-w-[200px]">{destinationUrl}</strong>
                  </div>
                  <div className="flex justify-between border-t border-[#DCE2EA] pt-2 text-sm">
                    <span className="font-bold text-[#111827]">Total Payable:</span>
                    <strong className="text-lavender font-extrabold">₹{finalPrice}</strong>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/919351042276?text=${encodeURIComponent(
                      `Hi Spread NFC! I placed order ${orderRef} for ${orderQuantity}x ${selectedProduct.title}. Name: ${cardholderName}. Link: ${destinationUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
                  >
                    <span>Confirm via WhatsApp Hotline</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-[#111827] bg-[#F8F9FB] hover:bg-slate-200 border border-[#DCE2EA] transition-all"
                  >
                    Done &amp; Close
                  </button>
                </div>
              </div>
            ) : (
              /* Customization Form */
              <form onSubmit={handlePlaceOrder} className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                {/* Left: Interactive Live Card Preview */}
                <div className="flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#626B78] mb-2 block">
                       Live Physical Preview
                    </span>

                    {/* Digital Card Preview Box */}
                    <div className={`relative h-56 rounded-2xl bg-gradient-to-br ${selectedProduct.previewGradient} p-6 flex flex-col justify-between text-white shadow-xl overflow-hidden border border-white/20`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src="/logo.png" alt="Spread NFC" className="h-5 w-auto invert brightness-200" />
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono tracking-wider backdrop-blur-md">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-300">
                            <path d="M6 9a6 6 0 0 1 12 0" />
                            <path d="M3 13a10 10 0 0 1 18 0" />
                          </svg>
                          <span>NFC ACTIVE</span>
                        </div>
                      </div>

                      {/* Engraved Name & Title */}
                      <div className="space-y-1">
                        <div className="text-xl font-extrabold tracking-tight drop-shadow-sm truncate">
                          {cardholderName || 'Your Name'}
                        </div>
                        <div className="text-xs text-white/80 font-medium truncate">
                          {companyTitle || 'Company & Title'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-white/60 pt-2 border-t border-white/15">
                        <span className="truncate max-w-[140px] text-cyan-200">{destinationUrl || 'spreadnfc.in/q/TF-XXXX'}</span>
                        <span>{selectedProduct.chipType.split('•')[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Discount Calculator */}
                  <div className="bg-[#F8F9FB] border border-[#DCE2EA] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="order-quantity-input" className="text-xs font-bold text-[#111827]">Quantity</label>
                      <span className="text-xs font-mono font-bold text-lavender">
                        {discountPct > 0 ? `${discountPct}% Bulk Tier Discount Applied` : 'Standard Pricing'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-[#DCE2EA] text-[#111827] font-bold hover:bg-slate-100"
                      >
                        -
                      </button>
                      <input
                        id="order-quantity-input"
                        type="number"
                        min="1"
                        max="5000"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center font-mono font-bold text-[#111827] bg-white border border-[#DCE2EA] rounded-xl py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setOrderQuantity((q) => q + 1)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-[#DCE2EA] text-[#111827] font-bold hover:bg-slate-100"
                      >
                        +
                      </button>

                      {/* Quick preset chips */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {[1, 5, 20, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setOrderQuantity(num)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              orderQuantity === num
                                ? 'bg-lavender text-white shadow-sm'
                                : 'bg-white border border-[#DCE2EA] text-[#626B78] hover:text-[#111827]'
                            }`}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="pt-2 border-t border-[#DCE2EA]/70 space-y-1 text-xs">
                      <div className="flex justify-between text-[#626B78]">
                        <span>Unit Base Price:</span>
                        <span>₹{selectedProduct.salePrice} / card</span>
                      </div>
                      {discountPct > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>Volume Discount ({discountPct}%):</span>
                          <span>- ₹{discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#626B78]">
                        <span>Express Courier Shipping:</span>
                        <span className="text-emerald-600 font-bold">FREE</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-[#111827] pt-1.5 border-t border-[#DCE2EA]">
                        <span>Total Amount:</span>
                        <span className="text-lavender text-base">₹{finalPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Personalization Inputs */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cardholder-name-input" className="block text-xs font-bold text-[#111827] mb-1.5">
                      Name on Card / Front Engraving *
                    </label>
                    <input
                      id="cardholder-name-input"
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCE2EA] bg-white text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-lavender focus:ring-1 focus:ring-lavender outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="company-title-input" className="block text-xs font-bold text-[#111827] mb-1.5">
                      Company &amp; Subtitle (Optional)
                    </label>
                    <input
                      id="company-title-input"
                      type="text"
                      value={companyTitle}
                      onChange={(e) => setCompanyTitle(e.target.value)}
                      placeholder="e.g. Chief Technology Officer • Acme Corp"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCE2EA] bg-white text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-lavender focus:ring-1 focus:ring-lavender outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="customer-email-input" className="block text-xs font-bold text-[#111827] mb-1.5">
                        Your Email Address *
                      </label>
                      <input
                        id="customer-email-input"
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#DCE2EA] bg-white text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-lavender focus:ring-1 focus:ring-lavender outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="customer-phone-input" className="block text-xs font-bold text-[#111827] mb-1.5">
                        WhatsApp / Phone *
                      </label>
                      <input
                        id="customer-phone-input"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#DCE2EA] bg-white text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-lavender focus:ring-1 focus:ring-lavender outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="destination-url-input" className="block text-xs font-bold text-[#111827] mb-1.5">
                      Initial Destination Link *
                    </label>
                    <input
                      id="destination-url-input"
                      type="url"
                      required
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourname"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#DCE2EA] bg-white text-xs sm:text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-lavender focus:ring-1 focus:ring-lavender outline-none transition-colors"
                    />
                    <p className="mt-1 text-[11px] text-[#626B78]">
                      Don&apos;t worry — you can update this destination link anytime later using your card&apos;s password.
                    </p>
                  </div>

                  {/* Finish / Color Selection */}
                  <div>
                    <span className="block text-xs font-bold text-[#111827] mb-1.5">
                      Finish / Color Palette
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setSelectedColor(color.name)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedColor === color.name
                              ? 'border-lavender bg-lavender/10 text-lavender font-bold'
                              : 'border-[#DCE2EA] bg-white text-[#626B78] hover:text-[#111827] hover:border-slate-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Guarantee Note */}
                  <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#DCE2EA] flex items-center gap-2.5 text-[11px] text-[#626B78]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>100% NTAG216 chip tested before dispatch • Lifetime dynamic QR updates guaranteed</span>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-lavender hover:bg-lavender-hover shadow-md hover:shadow-glow-lavender transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Order (₹{finalPrice})</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <CtaFooter />
    </div>
  )
}
