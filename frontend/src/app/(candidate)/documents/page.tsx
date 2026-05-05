'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DocumentsView } from '@/components/candidate/DocumentsView'

export default function DocumentsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <DocumentsView />
    </ProtectedRoute>
  )
}
