import { useState, useEffect } from 'react'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react'
import { ecommerceDb } from '../../lib/ecommerceDb'
import type { Product } from '../../types/ecommerce'

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'cards' | 'standees' | 'tags' | 'accessories'>('cards')
  const [chipType, setChipType] = useState('NTAG216 • 888 Bytes')
  const [material, setMaterial] = useState('0.76mm Rigid Matte PVC')
  const [basePrice, setBasePrice] = useState(599)
  const [salePrice, setSalePrice] = useState(499)
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock'>('in_stock')
  const [isActive, setIsActive] = useState(true)
  const [featureInputs, setFeatureInputs] = useState<string[]>([
    'High-memory NTAG216 chip',
    'Laser-etched dynamic QR code',
    'Lifetime update guarantee',
  ])
  const [imageUrl, setImageUrl] = useState('/logo.png')
  const [saveLoading, setSaveLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const list = await ecommerceDb.getProducts()
    setProducts(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateModal = () => {
    setEditingProduct(null)
    setTitle('')
    setSubtitle('')
    setDescription('')
    setCategory('cards')
    setChipType('NTAG216 • 888 Bytes')
    setMaterial('0.76mm Rigid Matte PVC')
    setBasePrice(599)
    setSalePrice(499)
    setStockStatus('in_stock')
    setIsActive(true)
    setFeatureInputs(['Universal NFC Tap Compatibility', 'Dynamic QR Redirect', 'Scratch-resistant Coating'])
    setImageUrl('/logo.png')
    setModalOpen(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setTitle(p.title)
    setSubtitle(p.subtitle)
    setDescription(p.description)
    setCategory(p.category)
    setChipType(p.chipType)
    setMaterial(p.material)
    setBasePrice(p.basePrice)
    setSalePrice(p.salePrice)
    setStockStatus(p.stockStatus)
    setIsActive(p.isActive)
    setFeatureInputs(p.features.length > 0 ? p.features : ['Feature item'])
    setImageUrl(p.images[0] || '/logo.png')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)

    const cleanFeatures = featureInputs.map((f) => f.trim()).filter(Boolean)

    if (editingProduct) {
      await ecommerceDb.updateProduct(editingProduct.id, {
        title,
        subtitle,
        description,
        category,
        chipType,
        material,
        basePrice: Number(basePrice),
        salePrice: Number(salePrice),
        stockStatus,
        isActive,
        features: cleanFeatures,
        images: [imageUrl],
      })
    } else {
      await ecommerceDb.createProduct({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        subtitle,
        description,
        category,
        chipType,
        material,
        basePrice: Number(basePrice),
        salePrice: Number(salePrice),
        stockStatus,
        isActive,
        features: cleanFeatures,
        colors: [
          { name: 'Matte Jet Black', hex: '#111827', bgClass: 'bg-zinc-900', textClass: 'text-white' },
          { name: 'Electric Frost', hex: '#3978F6', bgClass: 'bg-blue-600', textClass: 'text-white' },
        ],
        previewGradient: 'from-zinc-900 via-zinc-800 to-black',
        images: [imageUrl],
      })
    }

    setSaveLoading(false)
    setModalOpen(false)
    await loadData()
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete product "${name}"?`)) {
      await ecommerceDb.deleteProduct(id)
      await loadData()
    }
  }

  const handleToggleActive = async (p: Product) => {
    await ecommerceDb.updateProduct(p.id, { isActive: !p.isActive })
    await loadData()
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const filtered = products.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q)
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
            <Package className="h-6 w-6 text-brand-600" />
            <span>Store Products &amp; Cards Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm theme-text-muted mt-0.5">
            Manage public products, pricing, materials, chip specs, and stock availability.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Total Products</span>
          <p className="text-2xl font-bold theme-text-main">{products.length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Live on Store</span>
          <p className="text-2xl font-bold text-emerald-600">{products.filter((p) => p.isActive).length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">In Stock</span>
          <p className="text-2xl font-bold text-brand-600">{products.filter((p) => p.stockStatus === 'in_stock').length}</p>
        </div>
        <div className="theme-card p-4 rounded-2xl border shadow-xs space-y-1">
          <span className="text-xs theme-text-muted font-medium">Categories</span>
          <p className="text-2xl font-bold theme-text-main">
            {new Set(products.map((p) => p.category)).size}
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
            placeholder="Search by title, chip or material..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'cards', label: 'Smart Cards' },
              { id: 'standees', label: 'Standees' },
              { id: 'tags', label: 'Tags' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === c.id
                  ? 'bg-brand-600 text-white'
                  : 'theme-subtle theme-border border theme-text-muted hover:theme-text-main'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List Table / Grid */}
      {loading ? (
        <div className="theme-card p-12 rounded-2xl border text-center theme-text-muted">
          Loading products catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-card p-12 rounded-2xl border text-center space-y-2">
          <Package className="h-10 w-10 mx-auto theme-text-muted opacity-40" />
          <p className="text-sm font-semibold theme-text-main">No products found</p>
          <p className="text-xs theme-text-muted">Try adjusting your search or add a new product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="theme-card rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
            >
              <div>
                {/* Visual Banner Header */}
                <div className={`h-32 bg-gradient-to-br ${product.previewGradient} p-4 flex flex-col justify-between text-white relative`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 backdrop-blur-md">
                      {product.category.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/15">
                      {product.chipType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    <span className="text-sm font-bold truncate">{product.title}</span>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold theme-text-main">{product.title}</h3>
                    <p className="text-xs theme-text-muted line-clamp-2 mt-0.5">{product.subtitle}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t theme-border">
                    <span className="theme-text-muted">Pricing:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-extrabold theme-text-main">₹{product.salePrice}</span>
                      <span className="text-[11px] theme-text-muted line-through">₹{product.basePrice}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="theme-text-muted">Stock Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        product.stockStatus === 'in_stock'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : product.stockStatus === 'low_stock'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      }`}
                    >
                      {product.stockStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="p-3 border-t theme-border theme-subtle flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(product)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    product.isActive
                      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100'
                      : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200'
                  }`}
                  title={product.isActive ? 'Hide from public store' : 'Publish to public store'}
                >
                  {product.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span>{product.isActive ? 'Active' : 'Draft'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="p-1.5 rounded-lg theme-hover theme-text-muted hover:theme-text-main transition-colors"
                    title="Edit Product Details"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id, product.title)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="theme-card relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b theme-border pb-4">
              <h3 className="text-lg font-bold theme-text-main">
                {editingProduct ? 'Edit Product' : 'Add New Smart Card / Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg theme-text-muted theme-hover"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Spread NFC Matte PVC Smart Card"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="cards">Smart Cards</option>
                    <option value="standees">Tabletop Standees</option>
                    <option value="tags">Mini Epoxy Tags</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-main mb-1">Short Subtitle / Tagline *</label>
                <input
                  type="text"
                  required
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Daily Executive Card • Waterproof Polymer"
                  className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-main mb-1">Full Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. High-durability matte black polymer card with embedded high-frequency NTAG216 chip."
                  className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">NFC Chip Type *</label>
                  <input
                    type="text"
                    required
                    value={chipType}
                    onChange={(e) => setChipType(e.target.value)}
                    placeholder="e.g. NTAG216 • 888 Bytes"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Material Specification *</label>
                  <input
                    type="text"
                    required
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. 0.80mm Surgical Stainless Steel"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-main mb-1">Stock Availability *</label>
                  <select
                    value={stockStatus}
                    onChange={(e: any) => setStockStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload / URL */}
              <div>
                <label className="block text-xs font-semibold theme-text-main mb-1">
                  Card Photo Upload / Asset
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl border theme-border theme-subtle flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Card preview" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 theme-text-muted" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="text-xs theme-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>
              </div>

              {/* Features List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold theme-text-main">Key Features &amp; Bullet Points</label>
                  <button
                    type="button"
                    onClick={() => setFeatureInputs([...featureInputs, ''])}
                    className="text-[11px] text-brand-600 hover:underline font-semibold"
                  >
                    + Add Bullet
                  </button>
                </div>
                <div className="space-y-1.5">
                  {featureInputs.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...featureInputs]
                          updated[i] = e.target.value
                          setFeatureInputs(updated)
                        }}
                        placeholder={`Feature ${i + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-xl text-xs border theme-border theme-subtle theme-text-main outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      {featureInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFeatureInputs(featureInputs.filter((_, idx) => idx !== i))}
                          className="text-zinc-400 hover:text-rose-500 text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="product-active-toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded accent-brand-600"
                />
                <label htmlFor="product-active-toggle" className="text-xs font-semibold theme-text-main">
                  Publish immediately to public website (/products)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t theme-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold theme-subtle theme-border border theme-text-muted hover:theme-text-main"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all flex items-center gap-2"
                >
                  {saveLoading && <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
