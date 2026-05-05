'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { AuditLogsView } from '@/components/admin/AuditLogsView'

export default function AuditLogsPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AuditLogsView />
    </ProtectedRoute>
  )
}
