'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { CandidateDashboardView } from '@/components/candidate/CandidateDashboardView'

export default function CandidateDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <CandidateDashboardView />
    </ProtectedRoute>
  )
}
