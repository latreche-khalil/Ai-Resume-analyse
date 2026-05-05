'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { InterviewSimulationView } from '@/components/candidate/InterviewSimulationView'

export default function InterviewPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <InterviewSimulationView />
    </ProtectedRoute>
  )
}
