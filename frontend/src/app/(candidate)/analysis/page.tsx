'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AnalysisListView } from '@/components/candidate/AnalysisListView'

export default function AnalysisListPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <AnalysisListView />
    </ProtectedRoute>
  )
}
