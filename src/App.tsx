import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { Spinner } from './components/Spinner'
import { Login } from './pages/Login'
import { QRRedirect } from './pages/public/QRRedirect'
import { UpdatePage } from './pages/public/UpdatePage'
import { NotFound } from './pages/public/NotFound'

import { LandingPage } from './pages/public/LandingPage'
import { WhatsAppWidget } from './components/WhatsAppWidget'

const ProductsPage = lazy(() => import('./pages/public/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const SupportPage = lazy(() => import('./pages/public/SupportPage').then((m) => ({ default: m.SupportPage })))
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((m) => ({ default: m.ContactPage })))

const Dashboard = lazy(() => import('./pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })))
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport').then((m) => ({ default: m.AdminSupport })))
const AdminInquiries = lazy(() => import('./pages/admin/AdminInquiries').then((m) => ({ default: m.AdminInquiries })))
const CreateQR = lazy(() => import('./pages/admin/CreateQR').then((m) => ({ default: m.CreateQR })))
const BulkQR = lazy(() => import('./pages/admin/BulkQR').then((m) => ({ default: m.BulkQR })))
const UploadCSV = lazy(() => import('./pages/admin/UploadCSV').then((m) => ({ default: m.UploadCSV })))
const ManageQR = lazy(() => import('./pages/admin/ManageQR').then((m) => ({ default: m.ManageQR })))
const DataBackup = lazy(() => import('./pages/admin/DataBackup').then((m) => ({ default: m.DataBackup })))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size={28} className="text-brand-600" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/update" element={<UpdatePage />} />
              <Route path="/q/:qrNumber" element={<QRRedirect />} />

              <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="inquiries" element={<AdminInquiries />} />
                  <Route path="create" element={<CreateQR />} />
                  <Route path="bulk" element={<BulkQR />} />
                  <Route path="upload" element={<UploadCSV />} />
                  <Route path="manage" element={<ManageQR />} />
                  <Route path="backup" element={<DataBackup />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <WhatsAppWidget />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
