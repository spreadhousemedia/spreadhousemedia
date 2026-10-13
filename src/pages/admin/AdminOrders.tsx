import { useState, useEffect } from 'react'
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle,
  ExternalLink,
  User,
  Phone,
  Mail,
  CreditCard,
} from 'lucide-react'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { Order } from '../../types/ecommerce'

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Shipping Modal State
  const [shippingModalOpen, setShippingModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [courierPartner, setCourierPartner] = useState('BlueDart Express')
  const [trackingNumber, setTrackingNumber] = useState('')

  const loadData = async () => {
    setLoading(true)
    const list = await ecommerceDb.getOrders()
    setOrders(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (orderId: string, newStatus: Order['orderStatus']) => {
    if (newStatus === 'shipped') {
      const ord = orders.find((o) => o.id === orderId)
      if (ord) {
        setSelectedOrder(ord)
        setShippingModalOpen(true)
        return
      }
    }
    await ecommerceDb.updateOrderStatus(orderId, newStatus)
    await loadData()
  }

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    await ecommerceDb.updateOrderStatus(selectedOrder.id, 'shipped', {
      partner: courierPartner,
      trackingNumber,
    })
    setShippingModalOpen(false)
    await loadData()
  }

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.cardholderName.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold theme-text-main flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-brand-600" />
            <span>Card Orders &amp; Production Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-0.5">
            Manage incoming card orders, customization specs, and courier shipping status.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Total Orders</span>
          <p className="text-2xl font-bold theme-text-main">{orders.length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">In Production</span>
          <p className="text-2xl font-bold text-amber-500">
            {orders.filter((o) => o.orderStatus === 'in_production').length}
          </p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Shipped &amp; En Route</span>
          <p className="text-2xl font-bold text-brand-600">
            {orders.filter((o) => o.orderStatus === 'shipped').length}
          </p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Delivered</span>
          <p className="text-2xl font-bold text-emerald-600">
            {orders.filter((o) => o.orderStatus === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="theme-card p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order #, Customer, or Name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Orders' },
              { id: 'pending_verification', label: 'Pending' },
              { id: 'in_production', label: 'Production' },
              { id: 'shipped', label: 'Shipped' },
              { id: 'delivered', label: 'Delivered' },
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

      {/* Orders List */}
      {loading ? (
        <div className="theme-card p-12 rounded-2xl border text-center theme-text-muted">
          Loading orders feed...
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-card p-12 rounded-2xl border text-center space-y-2">
          <ShoppingBag className="h-10 w-10 mx-auto theme-text-muted opacity-40" />
          <p className="text-sm font-semibold theme-text-main">No orders found</p>
          <p className="text-xs theme-text-muted">Orders placed on the website will appear here in real-time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="theme-card rounded-2xl border shadow-xs p-5 space-y-4 transition-all hover:shadow-md"
            >
              {/* Order Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b theme-border pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 rounded-lg">
                    {order.orderNumber}
                  </span>
                  <span className="text-xs theme-text-muted">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold theme-text-main">
                    ₹{order.totalAmount}{' '}
                    <span className="text-[11px] font-normal theme-text-muted">
                      ({order.quantity} {order.quantity === 1 ? 'card' : 'cards'})
                    </span>
                  </span>

                  {/* Status Dropdown */}
                  <select
                    value={order.orderStatus}
                    onChange={(e: any) => handleUpdateStatus(order.id, e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-colors ${
                      order.orderStatus === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60'
                        : order.orderStatus === 'shipped'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/60'
                        : order.orderStatus === 'in_production'
                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <option value="pending_verification">Pending Verification</option>
                    <option value="in_production">In Production</option>
                    <option value="quality_checked">Quality Checked</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              {/* Order Specifics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Customer Info */}
                <div className="theme-subtle p-3 rounded-xl border theme-border space-y-1.5">
                  <span className="font-bold theme-text-main flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-600">
                    <User className="h-3 w-3" /> Customer Contact
                  </span>
                  <p className="font-semibold theme-text-main">{order.customerName}</p>
                  <p className="theme-text-muted flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {order.customerEmail}
                  </p>
                  <p className="theme-text-muted flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {order.customerPhone}
                  </p>
                </div>

                {/* 2. Custom Engraving Specs */}
                <div className="theme-subtle p-3 rounded-xl border theme-border space-y-1.5">
                  <span className="font-bold theme-text-main flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-600">
                    <CreditCard className="h-3 w-3" /> Card Artwork Specification
                  </span>
                  <div className="flex justify-between">
                    <span className="theme-text-muted">Engraved Name:</span>
                    <strong className="theme-text-main">{order.cardholderName}</strong>
                  </div>
                  {order.companyName && (
                    <div className="flex justify-between">
                      <span className="theme-text-muted">Company/Title:</span>
                      <strong className="theme-text-main truncate max-w-[140px]">{order.companyName}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="theme-text-muted">Finish:</span>
                    <span className="theme-text-main">{order.customFinish}</span>
                  </div>
                </div>

                {/* 3. Product & Destination Link */}
                <div className="theme-subtle p-3 rounded-xl border theme-border space-y-1.5">
                  <span className="font-bold theme-text-main flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-brand-600">
                    <ExternalLink className="h-3 w-3" /> Destination &amp; Item
                  </span>
                  <p className="font-semibold theme-text-main">{order.productTitle}</p>
                  <div className="pt-0.5">
                    <span className="text-[10px] theme-text-muted block">Encoded Destination URL:</span>
                    <a
                      href={order.destinationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline font-mono truncate block max-w-xs"
                    >
                      {order.destinationUrl}
                    </a>
                  </div>
                </div>
              </div>

              {/* Shipping Tracking Banner if Shipped */}
              {order.courierTrackingNumber && (
                <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <span className="theme-text-main">
                      Dispatched via <strong>{order.courierPartner || 'Courier'}</strong> — AWB Tracking #:{' '}
                      <strong className="font-mono">{order.courierTrackingNumber}</strong>
                    </span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> En Route
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shipping Details Modal */}
      {shippingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card relative w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-5">
            <h3 className="text-base font-bold theme-text-main flex items-center gap-2">
              <Truck className="h-5 w-5 text-brand-600" />
              <span>Enter Courier Dispatch Details</span>
            </h3>

            <form onSubmit={handleSaveShipping} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold theme-text-main mb-1">Courier Partner *</label>
                <select
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-subtle theme-text-main outline-none"
                >
                  <option value="BlueDart Express">BlueDart Express</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="DTDC Express">DTDC Express</option>
                  <option value="FedEx India">FedEx India</option>
                  <option value="India Post Speed Post">India Post Speed Post</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold theme-text-main mb-1">AWB Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BD982104821"
                  className="w-full px-3.5 py-2 rounded-xl border theme-border theme-subtle theme-text-main font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShippingModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-subtle border theme-border theme-text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-brand-600 hover:bg-brand-700 font-semibold"
                >
                  Mark as Shipped
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
