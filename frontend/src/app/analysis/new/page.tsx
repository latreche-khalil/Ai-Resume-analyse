'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { NewAnalysisView } from '@/components/candidate/NewAnalysisView'
import { RecruiterAnalysisView } from '@/components/recruiter/RecruiterAnalysisView'

export const dynamic = 'force-dynamic'

export default function NewAnalysisPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const role = user.role === 'recruiter' ? 'recruiter' : user.role === 'admin' ? 'admin' : 'candidate'

  return (
    <DashboardLayout role={role}>
      {role === 'recruiter' ? <RecruiterAnalysisView /> : <NewAnalysisView />}
    </DashboardLayout>
  )
}
