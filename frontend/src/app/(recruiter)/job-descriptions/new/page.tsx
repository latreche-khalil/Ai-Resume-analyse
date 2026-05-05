'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { JobDescriptionView } from '@/components/recruiter/JobDescriptionView'

export default function NewJobDescriptionPage() {
  return (
    <ProtectedRoute allowedRoles={['recruiter']}>
      <JobDescriptionView />
    </ProtectedRoute>
  )
}
