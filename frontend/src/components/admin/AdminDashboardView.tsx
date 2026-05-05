'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'

export function AdminDashboardView() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [userStats, analysisStats] = await Promise.all([
        apiClient.getUserStats().catch(() => null),
        apiClient.getAnalysisStats().catch(() => null)
      ])

      setStats({
        users: userStats,
        analysis: analysisStats
      })
    } catch (error) {
      console.error('Failed to load admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const ADMIN_CARDS = [
    {
      title: 'Audit Logs',
      description: 'View system activity and security logs',
      icon: '🔍',
      href: '/admin/audit-logs',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-sky-500/30'
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: '👥',
      href: '/admin/users',
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      comingSoon: true
    },
    {
      title: 'System Health',
      description: 'Monitor system performance',
      icon: '💚',
      href: '/admin/health',
      color: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
      comingSoon: true
    },
    {
      title: 'Analytics',
      description: 'View usage statistics and reports',
      icon: '📊',
      href: '/admin/analytics',
      color: 'from-orange-500/20 to-yellow-500/20',
      border: 'border-orange-500/30',
      comingSoon: true
    }
  ]

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 theme-card border-b theme-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🛡️ Admin Dashboard
            </h1>
            <p className="text-sm theme-text-tertiary mt-1">System administration and monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-sm font-medium theme-text">{user?.email}</p>
              <p className="text-xs theme-text-tertiary">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm theme-text-secondary hover:theme-text transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
            >
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-sky-500/30 rounded-2xl p-6 theme-card">
                <div className="text-4xl mb-2">👥</div>
                <div className="text-3xl font-bold text-sky-400">
                  {stats?.users?.total_cvs || 0}
                </div>
                <div className="text-sm theme-text-tertiary mt-1">Total CVs</div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6 theme-card">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-3xl font-bold text-blue-400">
                  {stats?.analysis?.total_analyses || 0}
                </div>
                <div className="text-sm theme-text-tertiary mt-1">Total Analyses</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 theme-card">
                <div className="text-4xl mb-2">✅</div>
                <div className="text-3xl font-bold text-green-400">
                  {stats?.users?.completed_cvs || 0}
                </div>
                <div className="text-sm theme-text-tertiary mt-1">Completed</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-6 theme-card">
                <div className="text-4xl mb-2">📈</div>
                <div className="text-3xl font-bold text-orange-400">
                  {stats?.analysis?.avg_match_score 
                    ? `${Math.round(stats.analysis.avg_match_score * 100)}%`
                    : 'N/A'}
                </div>
                <div className="text-sm theme-text-tertiary mt-1">Avg Match Score</div>
              </div>
            </motion.div>

            {/* Admin Tools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-xl font-bold mb-6 theme-text">Admin Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ADMIN_CARDS.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                  >
                    {card.comingSoon ? (
                      <div className="relative theme-card border theme-border rounded-2xl p-6 h-full opacity-60 cursor-not-allowed">
                        <div className="absolute top-4 right-4 px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-xs text-yellow-400">
                          Coming Soon
                        </div>
                        <div className="text-4xl mb-4">{card.icon}</div>
                        <h3 className="text-lg font-bold theme-text mb-2">{card.title}</h3>
                        <p className="text-sm theme-text-tertiary">{card.description}</p>
                      </div>
                    ) : (
                      <Link href={card.href}>
                        <motion.div
                          whileHover={{ scale: 1.02, y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-2xl p-6 h-full cursor-pointer transition-all hover:shadow-xl hover:shadow-purple-500/20 theme-card`}
                        >
                          <div className="text-4xl mb-4">{card.icon}</div>
                          <h3 className="text-lg font-bold theme-text mb-2">{card.title}</h3>
                          <p className="text-sm theme-text-tertiary">{card.description}</p>
                          <div className="mt-4 flex items-center text-sm text-sky-400 font-medium">
                            Open
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </motion.div>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <h2 className="text-xl font-bold mb-6 theme-text">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/audit-logs">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-4 theme-card border theme-border rounded-xl text-left hover:border-sky-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <div className="font-semibold theme-text">View Audit Logs</div>
                        <div className="text-xs theme-text-tertiary">Monitor system activity</div>
                      </div>
                    </div>
                  </motion.button>
                </Link>

                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-4 theme-card border theme-border rounded-xl text-left hover:border-sky-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏠</span>
                      <div>
                        <div className="font-semibold theme-text">User Dashboard</div>
                        <div className="text-xs theme-text-tertiary">Switch to user view</div>
                      </div>
                    </div>
                  </motion.button>
                </Link>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.open('http://localhost:8000/api/docs', '_blank')}
                  className="w-full px-6 py-4 theme-card border theme-border rounded-xl text-left hover:border-sky-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div>
                      <div className="font-semibold theme-text">API Documentation</div>
                      <div className="text-xs theme-text-tertiary">View API endpoints</div>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            {/* System Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 theme-card border theme-border rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold mb-4 theme-text">System Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm theme-text-tertiary mb-1">Backend Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="theme-text font-medium">Online</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm theme-text-tertiary mb-1">Database</div>
                  <div className="theme-text font-medium">SQLite (Development)</div>
                </div>
                <div>
                  <div className="text-sm theme-text-tertiary mb-1">Environment</div>
                  <div className="theme-text font-medium">Development</div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
