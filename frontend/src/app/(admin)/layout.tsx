'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DashboardLayout } from '@/components/shared/DashboardLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role !== 'admin') router.push('/dashboard')
  }, [user, loading, router])

  return (
    <DashboardLayout role="admin">
      {children}
    </DashboardLayout>
  )
}
