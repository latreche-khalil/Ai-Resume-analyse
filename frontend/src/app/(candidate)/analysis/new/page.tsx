'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { NewAnalysisView } from '@/components/candidate/NewAnalysisView'

export default function NewAnalysisPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <NewAnalysisView />
    </ProtectedRoute>
  )
}
