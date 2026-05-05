'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { PendingReviewView } from '@/components/candidate/PendingReviewView'

export default function PendingReviewPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'recruiter']}>
      <PendingReviewView />
    </ProtectedRoute>
  )
}
