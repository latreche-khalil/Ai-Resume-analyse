'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('candidate' | 'recruiter' | 'admin')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!user) {
        router.push('/login')
        return
      }

      // Check role-based permissions
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'recruiter') {
          router.push('/recruiter-dashboard')
        } else if (user.role === 'admin') {
          router.push('/admin-dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    }
  }, [user, loading, allowedRoles, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated or wrong role
  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null
  }

  // Authenticated and authorized
  return <>{children}</>
}
