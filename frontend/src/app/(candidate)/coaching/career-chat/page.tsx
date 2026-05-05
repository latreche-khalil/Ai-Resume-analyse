'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { CareerChatView } from '@/components/candidate/CareerChatView'

export default function CoachingChatPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <CareerChatView />
    </ProtectedRoute>
  )
}
