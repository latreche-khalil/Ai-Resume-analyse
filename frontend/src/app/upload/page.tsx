'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import CandidateUploadView from '@/components/candidate/CandidateUploadView'
import { BulkUploadView } from '@/components/recruiter/BulkUploadView'

export default function UploadPage() {
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
  const isRecruiter = user.role === 'recruiter'

  return (
    <DashboardLayout role={role}>
      {isRecruiter ? <BulkUploadView /> : <CandidateUploadView />}
    </DashboardLayout>
  )
}
