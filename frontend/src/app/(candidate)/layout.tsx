'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'

// These paths are shared between candidate and recruiter
const SHARED_PATHS = ['/settings', '/feedback', '/testimonials', '/coaching']

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isSharedPath = SHARED_PATHS.some(p => pathname?.startsWith(p))

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (!loading && user && user.role !== 'candidate' && !isSharedPath) {
      if (user.role === 'admin') router.push('/admin')
      else if (user.role === 'recruiter') router.push('/recruiter')
    }
  }, [user, loading, router, isSharedPath])

  const role = user?.role === 'recruiter' ? 'recruiter' : user?.role === 'admin' ? 'admin' : 'candidate'

  return (
    <DashboardLayout role={role}>
      {children}
    </DashboardLayout>
  )
}
