import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleRedirect } from './routes/RoleRedirect'
import { AdminLayout } from './components/layout/AdminLayout'
import { StaffLayout } from './components/layout/StaffLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { PromotionsPage } from './pages/admin/PromotionsPage'
import { LocationsPage } from './pages/admin/LocationsPage'
import { AccountsPage } from './pages/admin/AccountsPage'
import { CheckoutPage } from './pages/staff/CheckoutPage'
import { SummaryPage } from './pages/staff/SummaryPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 根路徑依角色導向 */}
          <Route path="/" element={<RoleRedirect />} />

          {/* 登入 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 後台（admin only） */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="products"   element={<ProductsPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="locations"  element={<LocationsPage />} />
            <Route path="accounts"   element={<AccountsPage />} />
          </Route>

          {/* 前台（admin + staff） */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="checkout" replace />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="summary"  element={<SummaryPage />} />
          </Route>

          {/* 其他路徑導回根路徑 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
