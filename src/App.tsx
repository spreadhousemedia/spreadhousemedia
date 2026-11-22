import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Spinner } from './components/Spinner'
import { WhatsAppWidget } from './components/WhatsAppWidget'
import { PORTAL_AUTH_PATH, PORTAL_BASE_PATH } from './lib/config'

const LandingPage = lazy(() => import('./pages/public/LandingPage').then((m) => ({ default: m.LandingPage })))
const ProductsPage = lazy(() => import('./pages/public/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const SupportPage = lazy(() => import('./pages/public/SupportPage').then((m) => ({ default: m.SupportPage })))
const ContactPage = lazy(() => import('./pages/public/ContactPage').then((m) => ({ default: m.ContactPage })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const UpdatePage = lazy(() => import('./pages/public/UpdatePage').then((m) => ({ default: m.UpdatePage })))
const QRRedirect = lazy(() => import('./pages/public/QRRedirect').then((m) => ({ default: m.QRRedirect })))
const PublicProfile = lazy(() => import('./pages/public/PublicProfile').then((m) => ({ default: m.PublicProfile })))
const NotFound = lazy(() => import('./pages/public/NotFound').then((m) => ({ default: m.NotFound })))

const AdminLayout = lazy(() => import('./components/AdminLayout').then((m) => ({ default: m.AdminLayout })))
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
const Batches = lazy(() => import('./pages/admin/Batches').then((m) => ({ default: m.Batches })))

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3]">
      <Spinner size={26} className="text-[#5E4AE3]" />
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
              <Route path="/update" element={<UpdatePage />} />
              <Route path="/q/:qrNumber" element={<QRRedirect />} />
              <Route path="/p/:identifier" element={<PublicProfile />} />

              <Route path={PORTAL_AUTH_PATH} element={<Login />} />
              <Route path={PORTAL_BASE_PATH} element={<ProtectedRoute />}>
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
                  <Route path="batches" element={<Batches />} />
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
