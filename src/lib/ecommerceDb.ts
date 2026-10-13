import { supabase } from './supabase'
import type { Product, Order, SupportTicket, ContactInquiry } from '../types/ecommerce'

const STORAGE_KEYS = {
  PRODUCTS: 'spreadnfc_products_v1',
  ORDERS: 'spreadnfc_orders_v1',
  TICKETS: 'spreadnfc_tickets_v1',
  INQUIRIES: 'spreadnfc_inquiries_v1',
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p-matte-pvc',
    title: 'Spread NFC Matte PVC Smart Card',
    slug: 'matte-pvc-card',
    subtitle: 'Daily Executive Card • Waterproof Polymer',
    description: 'High-durability matte black polymer card with embedded high-frequency NTAG216 chip and laser-sharp QR code. Perfect for everyday professional networking.',
    category: 'cards',
    chipType: 'NTAG216 • 888 Bytes',
    material: '0.76mm Rigid Matte PVC',
    basePrice: 599,
    salePrice: 499,
    badge: 'MOST POPULAR',
    popular: true,
    stockStatus: 'in_stock',
    isActive: true,
    features: [
      'High-memory NTAG216 chip (Universal iOS & Android)',
      'High-contrast permanent dynamic QR on back',
      'Anti-scratch matte protective laminate',
      'Instant destination update anytime',
    ],
    colors: [
      { name: 'Matte Jet Black', hex: '#111827', bgClass: 'bg-zinc-900', textClass: 'text-white' },
      { name: 'Electric Frost', hex: '#3978F6', bgClass: 'bg-blue-600', textClass: 'text-white' },
      { name: 'Pure White', hex: '#FFFFFF', bgClass: 'bg-white', textClass: 'text-zinc-900' },
    ],
    previewGradient: 'from-zinc-900 via-zinc-800 to-black',
    images: ['/logo.png'],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-luxury-metal',
    title: 'Spread NFC Luxury Stainless Steel Card',
    slug: 'luxury-metal-card',
    subtitle: 'Ultra-Premium Laser-Engraved Metal',
    description: 'Precision-milled aerospace grade 304 stainless steel with micro-ceramic antenna window for zero signal loss. Heavy in hand with mirror-polished bevelled edges.',
    category: 'cards',
    chipType: 'NTAG216 Hybrid RF',
    material: '0.80mm Surgical Stainless Steel',
    basePrice: 1699,
    salePrice: 1299,
    badge: 'LUXURY EDITION',
    popular: false,
    stockStatus: 'in_stock',
    isActive: true,
    features: [
      'Heavy 22-gram metallic hand feel',
      'Deep laser-etched name and logo branding',
      'Ceramic backplate for instant NFC tap transmission',
      'Lifetime dynamic QR with update guarantee',
    ],
    colors: [
      { name: 'Matte Stealth Black', hex: '#0f0f10', bgClass: 'bg-neutral-950', textClass: 'text-amber-400' },
      { name: 'Brushed 24K Gold', hex: '#d4af37', bgClass: 'bg-amber-600', textClass: 'text-neutral-950' },
      { name: 'Titanium Slate', hex: '#475569', bgClass: 'bg-slate-700', textClass: 'text-white' },
    ],
    previewGradient: 'from-neutral-950 via-zinc-900 to-amber-950',
    images: ['/logo.png'],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-eco-bamboo',
    title: 'Spread NFC Natural Eco Bamboo Card',
    slug: 'eco-bamboo-card',
    subtitle: '100% Sustainable Organic Wood',
    description: 'Crafted from hand-selected certified organic bamboo. Every card features unique natural wood grain with precision laser etching and hidden NFC antenna.',
    category: 'cards',
    chipType: 'NTAG216 High Sensitivity',
    material: '1.1mm Natural Bamboo & Walnut',
    basePrice: 999,
    salePrice: 799,
    badge: 'SUSTAINABLE',
    popular: false,
    stockStatus: 'in_stock',
    isActive: true,
    features: [
      'Zero plastic, 100% biodegradable bamboo core',
      'Unique organic grain texture on each card',
      'Laser-carved typography and logo',
      'High-speed contactless reader compatibility',
    ],
    colors: [
      { name: 'Natural Blonde Bamboo', hex: '#d8b589', bgClass: 'bg-amber-200', textClass: 'text-amber-950' },
      { name: 'Deep Walnut Wood', hex: '#5c4033', bgClass: 'bg-amber-950', textClass: 'text-amber-100' },
    ],
    previewGradient: 'from-amber-900 via-amber-800 to-yellow-950',
    images: ['/logo.png'],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-acrylic-standee',
    title: 'Spread NFC Contactless Tabletop Standee',
    slug: 'acrylic-standee',
    subtitle: 'Retail Counters • Google Reviews • Restaurants',
    description: 'Double-sided high-gloss acrylic standee equipped with elevated NFC tap module and oversized dynamic QR. Collect 5-star Google Reviews or share dynamic menus in 1 second.',
    category: 'standees',
    chipType: 'Dual NTAG216 Cores',
    material: '3.0mm Crystal Clear Cast Acrylic',
    basePrice: 1299,
    salePrice: 899,
    badge: 'BEST FOR BUSINESS',
    popular: false,
    stockStatus: 'in_stock',
    isActive: true,
    features: [
      'Dual-action: Tap with phone or scan high-res QR',
      'Custom business name & full color logo display',
      'Weighted scratch-resistant acrylic base',
      'Repoint menu or review link in 10 seconds',
    ],
    colors: [
      { name: 'Crystal Gloss Acrylic', hex: '#1e293b', bgClass: 'bg-slate-900', textClass: 'text-white' },
      { name: 'Matte Executive White', hex: '#f8fafc', bgClass: 'bg-slate-100', textClass: 'text-slate-900' },
    ],
    previewGradient: 'from-slate-900 via-indigo-950 to-blue-950',
    images: ['/logo.png'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-epoxy-tag',
    title: 'Spread NFC Epoxy Mini Smart Tag',
    slug: 'epoxy-phone-tag',
    subtitle: 'Universal Smartphone Back Tag',
    description: 'Ultra-slim 30mm adhesive bubble tag with 3M commercial-grade backing. Stick it to the back of any phone or phone case and turn your phone into a networking terminal.',
    category: 'tags',
    chipType: 'NTAG213 Micro-Core',
    material: 'Dome Epoxy + 3M High-Tack Adhesive',
    basePrice: 499,
    salePrice: 349,
    badge: 'UNIVERSAL COMPACT',
    popular: false,
    stockStatus: 'in_stock',
    isActive: true,
    features: [
      'Ultra-thin 1.2mm domed scratchproof epoxy',
      'Industrial 3M adhesive (removable without residue)',
      'Anti-metal shielding layer for phone interference',
      'Instant tap vCard & Instagram sharing',
    ],
    colors: [
      { name: 'Gloss Jet Black', hex: '#000000', bgClass: 'bg-black', textClass: 'text-white' },
      { name: 'Cyber Electric Blue', hex: '#3978F6', bgClass: 'bg-blue-600', textClass: 'text-white' },
    ],
    previewGradient: 'from-blue-900 via-slate-900 to-black',
    images: ['/logo.png'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-2026-8912',
    customerName: 'Kunal Verma',
    customerEmail: 'kunal@growthx.com',
    customerPhone: '+91 98201 12345',
    productId: 'p-matte-pvc',
    productTitle: 'Spread NFC Matte PVC Smart Card',
    quantity: 5,
    unitPrice: 499,
    discountAmount: 374,
    totalAmount: 2121,
    cardholderName: 'Kunal Verma',
    companyName: 'Head of Growth • GrowthX',
    destinationUrl: 'https://linkedin.com/in/kunalverma',
    customFinish: 'Matte Jet Black',
    paymentStatus: 'paid',
    orderStatus: 'in_production',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-2026-8804',
    customerName: 'Pooja Hegde',
    customerEmail: 'pooja@nexuslegal.in',
    customerPhone: '+91 97112 88492',
    productId: 'p-luxury-metal',
    productTitle: 'Spread NFC Luxury Stainless Steel Card',
    quantity: 1,
    unitPrice: 1299,
    discountAmount: 0,
    totalAmount: 1299,
    cardholderName: 'Adv. Pooja Hegde',
    companyName: 'Senior Partner • Nexus Law',
    destinationUrl: 'https://nexuslegal.in/pooja',
    customFinish: 'Brushed 24K Gold',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    courierPartner: 'BlueDart Express',
    courierTrackingNumber: 'BD782910482',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    ticketNumber: 'TKT-82910',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah@apex.com',
    customerPhone: '+91 98920 44812',
    category: 'qr_redirect',
    associatedQrNumber: 'TF-10042',
    subject: 'Need to repoint standee destination to new Google Reviews URL',
    description: 'We updated our Google Business location profile. Need to repoint the acrylic standee at our front desk to the new shortlink.',
    status: 'in_progress',
    priority: 'urgent',
    resolutionNotes: 'Diagnostic team verified QR hash. Security reset PIN dispatched to customer WhatsApp.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tkt-2',
    ticketNumber: 'TKT-10492',
    customerName: 'Rahul Sharma',
    customerEmail: 'rahul@matrix.in',
    customerPhone: '+91 98450 11928',
    category: 'nfc_hardware',
    associatedQrNumber: 'TF-20419',
    subject: 'Card physical replacement dispatched',
    description: 'NFC chip stopped reading after card fell into water. QR still scans perfectly.',
    status: 'resolved',
    priority: 'normal',
    resolutionNotes: 'New stainless steel replacement card encoded with NTAG216 dispatched via BlueDart AWB #382910481.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const DEFAULT_INQUIRIES: ContactInquiry[] = [
  {
    id: 'inq-1',
    name: 'Vikram Singhania',
    email: 'vikram@singhaniagroup.com',
    phone: '+91 98111 22334',
    company: 'Singhania Capital Advisors',
    teamSize: '50-200',
    inquiryType: 'corporate_cards',
    cardVolume: 75,
    estimatedQuote: 24300,
    message: 'We need 75 luxury metal cards for our senior wealth managers with gold laser engraved company logo.',
    status: 'new',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
]

export const ecommerceDb = {
  // ==========================================
  // 1. PRODUCTS
  // ==========================================
  async getProducts(params?: { category?: string; activeOnly?: boolean }): Promise<Product[]> {
    // 1. Attempt Supabase fetch
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false })
      if (params?.category && params.category !== 'all') {
        query = query.eq('category', params.category)
      }
      if (params?.activeOnly) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          subtitle: d.short_description || '',
          description: d.full_description || d.short_description || '',
          category: d.category,
          chipType: d.chip_type,
          material: d.material,
          basePrice: Number(d.base_price),
          salePrice: Number(d.sale_price || d.base_price),
          badge: d.is_featured ? 'FEATURED' : undefined,
          stockStatus: d.stock_status,
          isActive: d.is_active,
          features: d.features || [],
          colors: d.colors || [
            { name: 'Matte Jet Black', hex: '#111827', bgClass: 'bg-zinc-900', textClass: 'text-white' },
          ],
          previewGradient: d.preview_gradient || 'from-zinc-900 via-zinc-800 to-black',
          images: d.images || ['/logo.png'],
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }))
      }
    } catch {
      // Fallback to local store
    }

    // 2. Local fallback
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
    let list: Product[] = DEFAULT_PRODUCTS
    if (raw) {
      try {
        list = JSON.parse(raw)
      } catch {
        list = DEFAULT_PRODUCTS
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS))
    }

    return list.filter((p) => {
      if (params?.activeOnly && !p.isActive) return false
      if (params?.category && params.category !== 'all' && p.category !== params.category) return false
      return true
    })
  },

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: 'p-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Attempt Supabase insert
    try {
      await supabase.from('products').insert([
        {
          title: newProduct.title,
          slug: newProduct.slug || newProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          short_description: newProduct.subtitle,
          full_description: newProduct.description,
          category: newProduct.category,
          chip_type: newProduct.chipType,
          material: newProduct.material,
          base_price: newProduct.basePrice,
          sale_price: newProduct.salePrice,
          stock_status: newProduct.stockStatus,
          is_active: newProduct.isActive,
          features: newProduct.features,
          images: newProduct.images,
        },
      ])
    } catch {
      // Silently continue to local save
    }

    // Local save
    const current = await this.getProducts()
    const updated = [newProduct, ...current]
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated))
    return newProduct
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    // Attempt Supabase update
    try {
      await supabase
        .from('products')
        .update({
          title: updates.title,
          short_description: updates.subtitle,
          full_description: updates.description,
          category: updates.category,
          chip_type: updates.chipType,
          material: updates.material,
          base_price: updates.basePrice,
          sale_price: updates.salePrice,
          stock_status: updates.stockStatus,
          is_active: updates.isActive,
          features: updates.features,
          images: updates.images,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch {
      // Local fallback
    }

    const current = await this.getProducts()
    const idx = current.findIndex((p) => p.id === id)
    if (idx === -1) return null

    current[idx] = {
      ...current[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(current))
    return current[idx]
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await supabase.from('products').delete().eq('id', id)
    } catch {
      // Local fallback
    }

    const current = await this.getProducts()
    const filtered = current.filter((p) => p.id !== id)
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered))
    return true
  },

  // ==========================================
  // 2. ORDERS
  // ==========================================
  async getOrders(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          orderNumber: d.order_number,
          customerName: d.customer_name,
          customerEmail: d.customer_email,
          customerPhone: d.customer_phone,
          productId: d.product_id || '',
          productTitle: d.product_title || 'Smart Card',
          quantity: d.quantity || 1,
          unitPrice: Number(d.unit_price || d.total_amount),
          discountAmount: Number(d.discount_amount || 0),
          totalAmount: Number(d.total_amount),
          cardholderName: d.cardholder_name || d.customer_name,
          companyName: d.company_name || '',
          destinationUrl: d.destination_url || '',
          customFinish: d.custom_finish || 'Default',
          paymentStatus: d.payment_status,
          orderStatus: d.order_status,
          courierPartner: d.courier_partner,
          courierTrackingNumber: d.courier_tracking_number,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }))
      }
    } catch {
      // Fallback to local
    }

    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        return DEFAULT_ORDERS
      }
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS))
    return DEFAULT_ORDERS
  },

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await supabase.from('orders').insert([
        {
          order_number: newOrder.orderNumber,
          customer_name: newOrder.customerName,
          customer_email: newOrder.customerEmail,
          customer_phone: newOrder.customerPhone,
          product_id: newOrder.productId,
          product_title: newOrder.productTitle,
          quantity: newOrder.quantity,
          unit_price: newOrder.unitPrice,
          discount_amount: newOrder.discountAmount,
          total_amount: newOrder.totalAmount,
          cardholder_name: newOrder.cardholderName,
          company_name: newOrder.companyName,
          destination_url: newOrder.destinationUrl,
          custom_finish: newOrder.customFinish,
          payment_status: newOrder.paymentStatus,
          order_status: newOrder.orderStatus,
        },
      ])
    } catch {
      // Local fallback
    }

    const current = await this.getOrders()
    const updated = [newOrder, ...current]
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated))
    return newOrder
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['orderStatus'],
    courier?: { partner: string; trackingNumber: string }
  ): Promise<boolean> {
    try {
      await supabase
        .from('orders')
        .update({
          order_status: status,
          courier_partner: courier?.partner,
          courier_tracking_number: courier?.trackingNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    } catch {
      // Local fallback
    }

    const orders = await this.getOrders()
    const target = orders.find((o) => o.id === orderId)
    if (target) {
      target.orderStatus = status
      if (courier) {
        target.courierPartner = courier.partner
        target.courierTrackingNumber = courier.trackingNumber
      }
      target.updatedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))
      return true
    }
    return false
  },

  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      await supabase.from('orders').delete().eq('id', orderId)
    } catch {
      // Local fallback
    }

    const orders = await this.getOrders()
    const filtered = orders.filter((o) => o.id !== orderId)
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered))
    return true
  },

  // ==========================================
  // 3. SUPPORT TICKETS
  // ==========================================
  async getTickets(): Promise<SupportTicket[]> {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          ticketNumber: d.ticket_number,
          customerName: d.customer_name,
          customerEmail: d.customer_email,
          customerPhone: d.customer_phone,
          category: d.category,
          associatedQrNumber: d.associated_qr_number,
          associatedOrderNumber: d.associated_order_number,
          subject: d.subject,
          description: d.description,
          status: d.status,
          priority: d.priority,
          resolutionNotes: d.resolution_notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }))
      }
    } catch {
      // Fallback
    }

    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        return DEFAULT_TICKETS
      }
    }
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(DEFAULT_TICKETS))
    return DEFAULT_TICKETS
  },

  async getTicketByNumber(ticketNumber: string, email?: string): Promise<SupportTicket | null> {
    const norm = ticketNumber.trim().toUpperCase()

    // 1. Supabase Query
    try {
      let query = supabase.from('support_tickets').select('*').eq('ticket_number', norm)
      if (email) {
        query = query.ilike('customer_email', email.trim())
      }
      const { data, error } = await query
      if (!error && data && data.length > 0) {
        const d = data[0]
        return {
          id: d.id,
          ticketNumber: d.ticket_number,
          customerName: d.customer_name,
          customerEmail: d.customer_email,
          customerPhone: d.customer_phone,
          category: d.category,
          associatedQrNumber: d.associated_qr_number,
          associatedOrderNumber: d.associated_order_number,
          subject: d.subject,
          description: d.description,
          status: d.status,
          priority: d.priority,
          resolutionNotes: d.resolution_notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }
      }
    } catch {
      // Fallback
    }

    // 2. Local fallback
    const tickets = await this.getTickets()
    return tickets.find((t) => {
      const ticketMatch = t.ticketNumber.toUpperCase() === norm
      if (!ticketMatch) return false
      if (email) return t.customerEmail.toLowerCase() === email.trim().toLowerCase()
      return true
    }) || null
  },

  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    const newTicket: SupportTicket = {
      ...ticketData,
      id: 'tkt-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await supabase.from('support_tickets').insert([
        {
          ticket_number: newTicket.ticketNumber,
          customer_name: newTicket.customerName,
          customer_email: newTicket.customerEmail,
          customer_phone: newTicket.customerPhone,
          category: newTicket.category,
          associated_qr_number: newTicket.associatedQrNumber,
          associated_order_number: newTicket.associatedOrderNumber,
          subject: newTicket.subject,
          description: newTicket.description,
          status: newTicket.status,
          priority: newTicket.priority,
          resolution_notes: newTicket.resolutionNotes,
        },
      ])
    } catch {
      // Local fallback
    }

    const tickets = await this.getTickets()
    const updated = [newTicket, ...tickets]
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(updated))
    return newTicket
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Pick<SupportTicket, 'status' | 'priority' | 'resolutionNotes'>>
  ): Promise<boolean> {
    try {
      await supabase
        .from('support_tickets')
        .update({
          status: updates.status,
          priority: updates.priority,
          resolution_notes: updates.resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
    } catch {
      // Fallback
    }

    const tickets = await this.getTickets()
    const target = tickets.find((t) => t.id === ticketId)
    if (target) {
      if (updates.status) target.status = updates.status
      if (updates.priority) target.priority = updates.priority
      if (updates.resolutionNotes) target.resolutionNotes = updates.resolutionNotes
      target.updatedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets))
      return true
    }
    return false
  },

  async deleteTicket(ticketId: string): Promise<boolean> {
    try {
      await supabase.from('support_tickets').delete().eq('id', ticketId)
    } catch {
      // Local fallback
    }

    const tickets = await this.getTickets()
    const filtered = tickets.filter((t) => t.id !== ticketId)
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(filtered))
    return true
  },

  // ==========================================
  // 4. CONTACT INQUIRIES
  // ==========================================
  async getInquiries(): Promise<ContactInquiry[]> {
    try {
      const { data, error } = await supabase
        .from('contact_inquiries')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          email: d.email,
          phone: d.phone,
          company: d.company,
          teamSize: d.team_size,
          inquiryType: d.inquiry_type,
          cardVolume: d.card_volume || 25,
          estimatedQuote: Number(d.estimated_quote || 0),
          message: d.message,
          status: d.status || 'new',
          createdAt: d.created_at,
        }))
      }
    } catch {
      // Fallback
    }

    const raw = localStorage.getItem(STORAGE_KEYS.INQUIRIES)
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch {
        return DEFAULT_INQUIRIES
      }
    }
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(DEFAULT_INQUIRIES))
    return DEFAULT_INQUIRIES
  },

  async createInquiry(inquiryData: Omit<ContactInquiry, 'id' | 'createdAt'>): Promise<ContactInquiry> {
    const newInquiry: ContactInquiry = {
      ...inquiryData,
      id: 'inq-' + Date.now(),
      createdAt: new Date().toISOString(),
    }

    try {
      await supabase.from('contact_inquiries').insert([
        {
          name: newInquiry.name,
          email: newInquiry.email,
          phone: newInquiry.phone,
          company: newInquiry.company,
          team_size: newInquiry.teamSize,
          inquiry_type: newInquiry.inquiryType,
          card_volume: newInquiry.cardVolume,
          estimated_quote: newInquiry.estimatedQuote,
          message: newInquiry.message,
          status: newInquiry.status,
        },
      ])
    } catch {
      // Local fallback
    }

    const current = await this.getInquiries()
    const updated = [newInquiry, ...current]
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(updated))
    return newInquiry
  },

  async updateInquiryStatus(id: string, status: ContactInquiry['status']): Promise<boolean> {
    try {
      await supabase.from('contact_inquiries').update({ status }).eq('id', id)
    } catch {
      // Fallback
    }

    const current = await this.getInquiries()
    const target = current.find((i) => i.id === id)
    if (target) {
      target.status = status
      localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(current))
      return true
    }
    return false
  },

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      await supabase.from('contact_inquiries').delete().eq('id', id)
    } catch {
      // Local fallback
    }

    const current = await this.getInquiries()
    const filtered = current.filter((i) => i.id !== id)
    localStorage.setItem(STORAGE_KEYS.INQUIRIES, JSON.stringify(filtered))
    return true
  },
}
