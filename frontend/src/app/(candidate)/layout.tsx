'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role !== 'candidate') {
      if (user.role === 'admin') router.push('/admin')
      else if (user.role === 'recruiter') router.push('/recruiter')
    }
  }, [user, loading, router])

  // عرض الـ layout دائماً — الـ sidebar لا يختفي أبداً
  return (
    <DashboardLayout role="candidate">
      {children}
    </DashboardLayout>
  )
}
