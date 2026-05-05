import { ProtectedRoute } from '@/components/auth/protected-route'
import { TalentPoolView } from '@/components/recruiter/TalentPoolView'

export default function TalentPoolPage() {
  return (
    <ProtectedRoute allowedRoles={['recruiter']}>
      <TalentPoolView />
    </ProtectedRoute>
  )
}
