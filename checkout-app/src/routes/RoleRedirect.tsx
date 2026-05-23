import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RoleRedirect() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />

  return <Navigate to={profile.role === 'admin' ? '/admin' : '/pos'} replace />
}
