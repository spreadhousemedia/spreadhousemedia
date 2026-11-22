import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PORTAL_AUTH_PATH } from '../lib/config'
import { Spinner } from './Spinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={PORTAL_AUTH_PATH} state={{ from: location }} replace />
  }

  return <Outlet />
}
