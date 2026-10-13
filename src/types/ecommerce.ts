export interface ProductColor {
  name: string
  hex: string
  bgClass: string
  textClass: string
}

export interface Product {
  id: string
  title: string
  slug: string
  subtitle: string
  description: string
  category: 'cards' | 'standees' | 'tags' | 'accessories'
  chipType: string
  material: string
  basePrice: number
  salePrice: number
  badge?: string
  popular?: boolean
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock'
  isActive: boolean
  features: string[]
  colors: ProductColor[]
  previewGradient: string
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  productId: string
  productTitle: string
  quantity: number
  unitPrice: number
  discountAmount: number
  totalAmount: number
  cardholderName: string
  companyName: string
  destinationUrl: string
  customFinish: string
  uploadedLogoUrl?: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  orderStatus: 'pending_verification' | 'in_production' | 'quality_checked' | 'shipped' | 'delivered'
  courierPartner?: string
  courierTrackingNumber?: string
  createdAt: string
  updatedAt: string
}

export type IssueCategory =
  | 'nfc_hardware'
  | 'qr_redirect'
  | 'order_status'
  | 'print_defect'
  | 'password_reset'
  | 'general'

export interface SupportTicket {
  id: string
  ticketNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  category: IssueCategory
  associatedQrNumber?: string
  associatedOrderNumber?: string
  subject: string
  description: string
  attachmentUrls?: string[]
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'urgent'
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface ContactInquiry {
  id: string
  name: string
  email: string
  phone: string
  company: string
  teamSize: string
  inquiryType: string
  cardVolume: number
  estimatedQuote: number
  message: string
  status: 'new' | 'contacted' | 'proposal_sent' | 'closed'
  createdAt: string
}
