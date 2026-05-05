import { ProtectedRoute } from '@/components/auth/protected-route'
import { AdminDashboardView } from '@/components/admin/AdminDashboardView'

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardView />
    </ProtectedRoute>
  )
}
