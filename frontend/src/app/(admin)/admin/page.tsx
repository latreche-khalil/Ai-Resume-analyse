import { ProtectedRoute } from '@/components/auth/protected-route'
import { AdminDashboardView } from '@/components/admin/AdminDashboardView'

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardView />
    </ProtectedRoute>
  )
}
