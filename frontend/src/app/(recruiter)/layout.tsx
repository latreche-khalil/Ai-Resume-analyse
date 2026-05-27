'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role !== 'recruiter') router.push('/dashboard')
  }, [user, loading, router])

  return (
    <DashboardLayout role="recruiter">
      {children}
    </DashboardLayout>
  )
}
