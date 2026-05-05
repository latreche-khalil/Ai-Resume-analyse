import { ProtectedRoute } from '@/components/auth/protected-route'
import { RecruiterDashboardView } from '@/components/recruiter/RecruiterDashboardView'

export default function RecruiterDashboard() {
  return (
    <ProtectedRoute allowedRoles={['recruiter']}>
      <RecruiterDashboardView />
    </ProtectedRoute>
  )
}
