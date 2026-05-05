'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { InterviewReportView } from '@/components/candidate/InterviewReportView'

export default function InterviewReportPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <InterviewReportView />
    </ProtectedRoute>
  )
}
