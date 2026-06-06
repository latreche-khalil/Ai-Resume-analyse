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
  preferred_language?: string
}

const SESSION_KEY = 'resumeai_user'

function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function setCachedUser(user: User | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  } catch {}
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const setUserAndCache = (u: User | null) => {
    setUser(prev => {
      // لا تغير الـ state إذا البيانات نفسها — يمنع re-render غير ضروري
      if (prev && u && prev.id === u.id && prev.role === u.role && prev.email === u.email) return prev
      return u
    })
    setCachedUser(u)
  }

  const refreshUser = useCallback(async (background = false): Promise<User | null> => {
    try {
      const userData = await apiClient.getCurrentUser() as any
      const freshUser: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        preferred_language: userData.preferred_language || 'en',
      }
      setUserAndCache(freshUser)
      return freshUser
    } catch {
      // Background refresh فشل — لا نمسح الـ user المحفوظ
      // فقط نمسحه إذا كان الطلب أساسياً (مش background)
      if (!background) setUserAndCache(null)
      return null
    } finally {
      if (!background) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password']
    const currentPath = window.location.pathname
    const isPublic = publicPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'))

    const cached = getCachedUser()
    if (cached) {
      // Always restore from cache immediately — on any page
      setUser(cached)
      setLoading(false)
      // On protected pages: verify in background silently
      // On public pages: skip API call to avoid unnecessary network requests
      if (!isPublic) {
        refreshUser(true).catch(() => {})
      }
    } else if (!isPublic) {
      // No cache on protected page — fetch from API
      refreshUser(false)
    } else {
      // No cache on public page — just mark loading done
      setLoading(false)
    }
  }, [refreshUser])

  const redirectByRole = (role: User['role']) => {
    if (role === 'recruiter') router.push('/recruiter')
    else if (role === 'admin') router.push('/admin')
    else router.push('/dashboard')
  }

  const login = async (email: string, password: string) => {
    await apiClient.login(email, password)
    const freshUser = await refreshUser()
    if (freshUser) redirectByRole(freshUser.role)
  }

  const register = async (data: RegisterData) => {
    await apiClient.register(data as any)
    await login(data.email, data.password)
  }

  const logout = async () => {
    try { await apiClient.logout() } catch {}
    setUserAndCache(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
