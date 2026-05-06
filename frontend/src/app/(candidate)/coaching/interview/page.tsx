'use client'

import { Suspense } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { InterviewSimulationView } from '@/components/candidate/InterviewSimulationView'

export default function InterviewPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <Suspense fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-sky-500 border-t-transparent animate-spin" />
        </div>
      }>
        <InterviewSimulationView />
      </Suspense>
    </ProtectedRoute>
  )
}
