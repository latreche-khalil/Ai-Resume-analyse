'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { JobDescriptionsView } from '@/components/recruiter/JobDescriptionsView'

export default function JobDescriptionsPage() {
  return (
    <ProtectedRoute allowedRoles={['recruiter']}>
      <JobDescriptionsView />
    </ProtectedRoute>
  )
}
