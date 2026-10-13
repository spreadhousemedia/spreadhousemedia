import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  UploadCloud,
  SlidersHorizontal,
  Database,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Shield,
  Package,
  ShoppingBag,
  LifeBuoy,
  Users,
  KeyRound,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, applyThemeToDOM } from '../contexts/ThemeContext'
import { ChangePasswordModal } from './ChangePasswordModal'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', end: false, icon: Package },
  { to: '/admin/orders', label: 'Orders', end: false, icon: ShoppingBag },
  { to: '/admin/support', label: 'Support Desk', end: false, icon: LifeBuoy },
  { to: '/admin/inquiries', label: 'Corporate Leads', end: false, icon: Users },
  { to: '/admin/create', label: 'Create QR', end: false, icon: PlusCircle },
  { to: '/admin/bulk', label: 'Bulk QR', end: false, icon: Layers },
  { to: '/admin/upload', label: 'Upload CSV', end: false, icon: UploadCloud },
  { to: '/admin/manage', label: 'Manage QR', end: false, icon: SlidersHorizontal },
  { to: '/admin/backup', label: 'Data Backup', end: false, icon: Database },
]

const ROUTE_PRELOADERS: Record<string, () => void> = {
  '/admin': () => import('../pages/admin/Dashboard'),
  '/admin/products': () => import('../pages/admin/AdminProducts'),
  '/admin/orders': () => import('../pages/admin/AdminOrders'),
  '/admin/support': () => import('../pages/admin/AdminSupport'),
  '/admin/inquiries': () => import('../pages/admin/AdminInquiries'),
  '/admin/create': () => import('../pages/admin/CreateQR'),
  '/admin/bulk': () => import('../pages/admin/BulkQR'),
  '/admin/upload': () => import('../pages/admin/UploadCSV'),
  '/admin/manage': () => import('../pages/admin/ManageQR'),
  '/admin/backup': () => import('../pages/admin/DataBackup'),
}

function prefetchRoute(to: string) {
  try {
    ROUTE_PRELOADERS[to]?.()
  } catch {
    // Ignore prefetch network hiccups
  }
}

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // Manage admin theme lifecycle: enforce saved admin theme on mount, reset to light when leaving admin panel
  useEffect(() => {
    const saved = localStorage.getItem('spreadnfc_admin_theme') as 'light' | 'dark' | null
    const adminTheme = saved === 'dark' ? 'dark' : 'light'
    applyThemeToDOM(adminTheme)

    return () => {
      // Revert public pages to clean light mode when leaving admin panel
      applyThemeToDOM('light')
    }
  }, [])

  // Pre-warm the most heavily accessed admin routes during browser idle time
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchRoute('/admin/manage')
      prefetchRoute('/admin/upload')
      prefetchRoute('/admin/bulk')
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Admin'
  const initial = displayName.charAt(0).toUpperCase()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Get current section title for topbar breadcrumb
  const currentNav = NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )
  const currentTitle = currentNav?.label ?? 'Admin Panel'

  return (
    <div className="theme-page flex h-screen overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="theme-sidebar hidden w-64 shrink-0 flex-col border-r md:flex transition-colors duration-150">
        {/* Brand header */}
        <div className="theme-border flex h-16 shrink-0 items-center justify-between px-5 border-b">
          <NavLink to="/admin" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="Spread NFC" className="h-7 w-auto object-contain transition-transform group-hover:scale-105" />
          </NavLink>
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/50">
            <Shield className="w-3 h-3" /> Admin
          </span>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onMouseEnter={() => prefetchRoute(item.to)}
                onTouchStart={() => prefetchRoute(item.to)}
                onFocus={() => prefetchRoute(item.to)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                      : 'theme-text-muted theme-hover hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'theme-text-muted group-hover:text-brand-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer controls: user info */}
        <div className="theme-border border-t p-3 space-y-2">
          {/* User profile card */}
          <div className="theme-subtle flex items-center gap-3 rounded-xl px-3 py-2 border">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold ring-1 ring-brand-500/20">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold theme-text-main">{displayName}</p>
              <p className="truncate text-[11px] theme-text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Slide-over navigation) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />

          <aside className="theme-sidebar relative z-50 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-transform border-r">
            {/* Drawer Header */}
            <div className="theme-border flex h-16 shrink-0 items-center justify-between px-5 border-b">
              <NavLink to="/admin" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
                <img src="/logo.png" alt="Spread NFC" className="h-7 w-auto object-contain" />
              </NavLink>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="theme-hover rounded-lg p-2 theme-text-muted"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onMouseEnter={() => prefetchRoute(item.to)}
                    onTouchStart={() => prefetchRoute(item.to)}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                          : 'theme-text-muted theme-hover hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}

              <div className="pt-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="theme-subtle flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium theme-hover border"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Public Landing Page</span>
                </a>
              </div>
            </nav>

            {/* Mobile Drawer Footer */}
            <div className="theme-border border-t p-4 space-y-3">
              {/* Mobile User Profile */}
              <div className="theme-subtle flex items-center gap-3 rounded-xl p-3 border">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 text-sm font-bold">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold theme-text-main">{displayName}</p>
                  <p className="truncate text-xs theme-text-muted">{user?.email}</p>
                </div>
              </div>

              {/* Mobile Actions */}
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-subtle flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-text-main theme-hover transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-600" />}
                <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false)
                  setChangePasswordOpen(true)
                }}
                className="theme-subtle flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold theme-text-main theme-hover transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                <span>Change Password</span>
              </button>

              {/* Mobile Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar — relative z-40 ensures dropdowns stack above cards and charts */}
        <header className="theme-header relative z-40 flex h-16 shrink-0 items-center justify-between border-b backdrop-blur px-4 sm:px-6 lg:px-8 transition-colors duration-150">
          {/* Left: Mobile menu toggle + Brand or Desktop breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="theme-subtle flex h-10 w-10 items-center justify-center rounded-xl border theme-text-main theme-hover md:hidden transition-colors"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile logo on header */}
            <div className="flex items-center gap-2 md:hidden">
              <img src="/logo.png" alt="Spread NFC" className="h-6 w-auto object-contain" />
            </div>

            {/* Desktop breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="theme-text-muted font-medium">Spread NFC</span>
              <span className="theme-text-muted opacity-40">/</span>
              <span className="theme-text-main font-semibold">{currentTitle}</span>
            </div>
          </div>

          {/* Right Controls: Dark Mode Toggle, Public Site, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle Button (Admin Panel Only) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-subtle flex h-9 w-9 items-center justify-center rounded-xl border theme-hover transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600" />
              )}
            </button>

            {/* Public Link (Desktop) */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="theme-subtle hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium theme-hover transition-colors"
              title="Open Public Landing Page"
            >
              <span className="theme-text-main">Live Site</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((o) => !o)}
                className="theme-hover flex items-center gap-2 rounded-xl p-1 sm:px-2 sm:py-1.5 transition-colors"
                aria-haspopup="true"
                aria-expanded={userDropdownOpen}
              >
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-xs sm:text-sm text-white shadow-sm ring-2 ring-brand-500/20">
                  {initial}
                </span>
                <span className="hidden sm:flex flex-col text-left">
                  <span className="theme-text-main text-xs font-semibold leading-tight">{displayName}</span>
                  <span className="theme-text-muted text-[10px]">Admin</span>
                </span>
                <ChevronDown className="theme-text-muted hidden sm:block h-3.5 w-3.5" />
              </button>

              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div className="theme-card absolute right-0 z-50 mt-2 w-60 rounded-2xl border py-1.5 shadow-2xl transition-all">
                    <div className="theme-border border-b px-4 py-3">
                      <p className="theme-text-main truncate text-sm font-semibold">{displayName}</p>
                      <p className="theme-text-muted truncate text-xs">{user?.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setUserDropdownOpen(false)}
                        className="theme-hover flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-zinc-400" />
                        <span className="theme-text-main">View Public Site</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setChangePasswordOpen(true)
                        }}
                        className="theme-hover flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
                      >
                        <KeyRound className="h-4 w-4 text-zinc-400" />
                        <span className="theme-text-main">Change Password</span>
                      </button>
                    </div>

                    <div className="theme-border border-t p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          handleLogout()
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page View with responsive padding */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Change Password Modal */}
      {changePasswordOpen && (
        <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
      )}
    </div>
  )
}
