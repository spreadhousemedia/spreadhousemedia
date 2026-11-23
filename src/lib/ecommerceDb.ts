import { supabase } from './supabase'
import type { Product, Order, SupportTicket, ContactInquiry } from '../types/ecommerce'

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p-matte-pvc',
    title: 'Spread NFC Matte PVC Smart Card',
    slug: 'matte-pvc-card',
    subtitle: 'Daily Executive Card • Waterproof Polymer',
    description:
      'High-durability matte black polymer card with embedded high-frequency NTAG216 chip and laser-sharp QR code. Perfect for everyday professional networking.',
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
    description:
      'Precision-milled aerospace grade 304 stainless steel with micro-ceramic antenna window for zero signal loss. Heavy in hand with mirror-polished bevelled edges.',
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
    description:
      'Crafted from hand-selected certified organic bamboo. Every card features unique natural wood grain with precision laser etching and hidden NFC antenna.',
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
    description:
      'Double-sided high-gloss acrylic standee equipped with elevated NFC tap module and oversized dynamic QR. Collect 5-star Google Reviews or share dynamic menus in 1 second.',
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
    description:
      'Ultra-slim 30mm adhesive bubble tag with 3M commercial-grade backing. Stick it to the back of any phone or phone case and turn your phone into a networking terminal.',
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

function mapDbProduct(d: any): Product {
  return {
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
  }
}

export const ecommerceDb = {
  // ==========================================
  // 1. PRODUCTS (Server-side RPC / Admin DB)
  // ==========================================
  async getProducts(params?: { category?: string; activeOnly?: boolean }): Promise<Product[]> {
    try {
      if (params?.activeOnly) {
        const { data, error } = await supabase.rpc('get_public_products', {
          p_category: params.category && params.category !== 'all' ? params.category : null,
        })
        if (!error && data?.ok && Array.isArray(data.products) && data.products.length > 0) {
          return data.products.map(mapDbProduct)
        }
      }

      let query = supabase.from('products').select('*').order('created_at', { ascending: false })
      if (params?.category && params.category !== 'all') {
        query = query.eq('category', params.category)
      }
      if (params?.activeOnly) {
        query = query.eq('is_active', true)
      }
      const { data, error } = await query
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapDbProduct)
      }
    } catch {
      // Fallback to static catalog items (no PII)
    }

    return DEFAULT_PRODUCTS.filter((p) => {
      if (params?.activeOnly && !p.isActive) return false
      if (params?.category && params.category !== 'all' && p.category !== params.category) return false
      return true
    })
  },

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const slug = productData.slug || productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const { data, error } = await supabase.from('products').insert([
      {
        title: productData.title,
        slug,
        short_description: productData.subtitle,
        full_description: productData.description,
        category: productData.category,
        chip_type: productData.chipType,
        material: productData.material,
        base_price: productData.basePrice,
        sale_price: productData.salePrice,
        stock_status: productData.stockStatus,
        is_active: productData.isActive,
        features: productData.features,
        images: productData.images,
      },
    ])

    if (error || !Array.isArray(data) || data.length === 0) {
      throw new Error(error?.message || 'Failed to create product on server.')
    }
    return mapDbProduct(data[0])
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const { data, error } = await supabase
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

    if (error || !Array.isArray(data) || data.length === 0) return null
    return mapDbProduct(data[0])
  },

  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    return !error
  },

  // ==========================================
  // 2. ORDERS (Server-side Pricing & Validation)
  // ==========================================
  async getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !Array.isArray(data)) return []
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
  },

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const { data, error } = await supabase.rpc('create_public_order', {
      p_product_id: orderData.productId,
      p_quantity: orderData.quantity,
      p_customer_name: orderData.customerName,
      p_customer_email: orderData.customerEmail,
      p_customer_phone: orderData.customerPhone,
      p_cardholder_name: orderData.cardholderName || null,
      p_company_name: orderData.companyName || null,
      p_destination_url: orderData.destinationUrl || null,
      p_custom_finish: orderData.customFinish || null,
    })

    if (error || !data?.ok) {
      throw new Error(data?.error || error?.message || 'Could not place order.')
    }

    return {
      ...orderData,
      id: data.order_number,
      orderNumber: data.order_number,
      productTitle: data.product_title || orderData.productTitle,
      unitPrice: Number(data.unit_price ?? orderData.unitPrice),
      discountAmount: Number(data.discount_amount ?? orderData.discountAmount),
      totalAmount: Number(data.total_amount ?? orderData.totalAmount),
      paymentStatus: 'pending',
      orderStatus: 'pending_verification',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: Order['orderStatus'],
    courier?: { partner: string; trackingNumber: string },
  ): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .update({
        order_status: status,
        courier_partner: courier?.partner,
        courier_tracking_number: courier?.trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
    return !error
  },

  async deleteOrder(orderId: string): Promise<boolean> {
    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    return !error
  },

  // ==========================================
  // 3. SUPPORT TICKETS (Server-side RPC)
  // ==========================================
  async getTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !Array.isArray(data)) return []
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
  },

  async getTicketByNumber(ticketNumber: string, email?: string): Promise<SupportTicket | null> {
    const norm = ticketNumber.trim().toUpperCase()
    if (!email || !email.trim()) return null

    const { data, error } = await supabase.rpc('track_support_ticket', {
      p_ticket_number: norm,
      p_email: email.trim(),
    })

    if (error || !data?.ok || !data.ticket) return null
    const d = data.ticket
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
  },

  async createTicket(ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket> {
    const { data, error } = await supabase.rpc('create_public_support_ticket', {
      p_customer_name: ticketData.customerName,
      p_customer_email: ticketData.customerEmail,
      p_customer_phone: ticketData.customerPhone || null,
      p_category: ticketData.category,
      p_associated_qr_number: ticketData.associatedQrNumber || null,
      p_associated_order_number: ticketData.associatedOrderNumber || null,
      p_subject: ticketData.subject,
      p_description: ticketData.description,
      p_priority: ticketData.priority,
    })

    if (error || !data?.ok) {
      throw new Error(data?.error || error?.message || 'Could not create support ticket.')
    }

    return {
      ...ticketData,
      id: data.ticket_number,
      ticketNumber: data.ticket_number,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Pick<SupportTicket, 'status' | 'priority' | 'resolutionNotes'>>,
  ): Promise<boolean> {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: updates.status,
        priority: updates.priority,
        resolution_notes: updates.resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
    return !error
  },

  async deleteTicket(ticketId: string): Promise<boolean> {
    const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId)
    return !error
  },

  // ==========================================
  // 4. CONTACT INQUIRIES (Server-side RPC)
  // ==========================================
  async getInquiries(): Promise<ContactInquiry[]> {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !Array.isArray(data)) return []
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
  },

  async createInquiry(inquiryData: Omit<ContactInquiry, 'id' | 'createdAt'>): Promise<ContactInquiry> {
    const { data, error } = await supabase.rpc('create_public_inquiry', {
      p_name: inquiryData.name,
      p_email: inquiryData.email,
      p_phone: inquiryData.phone,
      p_company: inquiryData.company || null,
      p_team_size: inquiryData.teamSize || null,
      p_inquiry_type: inquiryData.inquiryType || 'corporate_cards',
      p_card_volume: inquiryData.cardVolume || 25,
      p_message: inquiryData.message || null,
    })

    if (error || !data?.ok) {
      throw new Error(data?.error || error?.message || 'Could not submit inquiry.')
    }

    return {
      ...inquiryData,
      id: 'inq-' + Date.now(),
      estimatedQuote: Number(data.estimated_quote ?? inquiryData.estimatedQuote),
      status: 'new',
      createdAt: new Date().toISOString(),
    }
  },

  async updateInquiryStatus(id: string, status: ContactInquiry['status']): Promise<boolean> {
    const { error } = await supabase.from('contact_inquiries').update({ status }).eq('id', id)
    return !error
  },

  async deleteInquiry(id: string): Promise<boolean> {
    const { error } = await supabase.from('contact_inquiries').delete().eq('id', id)
    return !error
  },
}
