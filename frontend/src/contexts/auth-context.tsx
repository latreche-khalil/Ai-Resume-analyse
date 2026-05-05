'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  role: 'candidate' | 'recruiter' | 'admin'
  first_name?: string
  last_name?: string
  preferred_language: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
}

interface RegisterData {
  email: string
  password: string
  role: 'candidate' | 'recruiter'
  first_name?: string
  last_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /**
   * Fetch current user from the API and update state.
   * Returns the fetched User so callers can act on the fresh value
   * without depending on the async setState update.
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const userData: User = await apiClient.getCurrentUser()
      setUser(userData)
      return userData
    } catch {
      // Token invalid / expired → clear local state
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // On mount: try to restore session via cookie (no localStorage needed)
  // Only check auth on protected routes, not on public pages
  useEffect(() => {
    // Check if we're on a public page (home, login, register)
    if (typeof window !== 'undefined') {
      const publicPaths = ['/', '/login', '/register']
      const currentPath = window.location.pathname
      
      // If on public page, don't auto-fetch user (avoid 401 errors)
      if (publicPaths.includes(currentPath)) {
        setLoading(false)
        return
      }
    }
    
    // On protected routes, check authentication
    refreshUser()
  }, [refreshUser])

  /** Redirect user to the correct dashboard based on role. */
  const redirectByRole = (role: User['role']) => {
    if (role === 'recruiter') {
      router.push('/recruiter-dashboard')
    } else if (role === 'admin') {
      router.push('/admin-dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  const login = async (email: string, password: string) => {
    // Backend call sets HttpOnly cookies; no token handling needed on client
    await apiClient.login(email, password)

    // ── FIX: use the return value of refreshUser (fresh user object)
    //    instead of reading `user` state which is still null before re-render
    const freshUser = await refreshUser()

    if (freshUser) {
      redirectByRole(freshUser.role)
    }
  }

  const register = async (data: RegisterData) => {
    await apiClient.register(data)
    // Auto-login after registration
    await login(data.email, data.password)
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch {
      // ignore backend errors - always clear local state
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
