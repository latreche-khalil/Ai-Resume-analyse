'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import dynamic from 'next/dynamic'

const EnhancedAnalysisView = dynamic(
  () => import('@/components/shared/enhanced-analysis-view').then(m => ({ default: m.EnhancedAnalysisView })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-700">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
)

export default function AnalysisDetailPage() {
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
      <EnhancedAnalysisView />
    </DashboardLayout>
  )
}
