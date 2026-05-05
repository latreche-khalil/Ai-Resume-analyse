'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { CardHoverEffect } from '@/components/ui/card-hover-effect'

export function RecruiterDashboardView() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    activeJDs: 0,
    totalCandidates: 0,
    recentMatches: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const jdsResponse = await apiClient.getJobDescriptions({ limit: 1 })
      setStats({
        activeJDs: jdsResponse.total || 0,
        totalCandidates: 0,
        recentMatches: 0,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              Welcome back, {user?.first_name || 'Recruiter'}!
            </h1>
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CardHoverEffect>
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-sky-100 rounded-lg p-3">
                        <svg className="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Job Descriptions</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.activeJDs}</p>
                      </div>
                    </div>
                  </div>
                </CardHoverEffect>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CardHoverEffect>
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalCandidates}</p>
                      </div>
                    </div>
                  </div>
                </CardHoverEffect>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <CardHoverEffect>
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                        <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Recent Matches</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.recentMatches}</p>
                      </div>
                    </div>
                  </div>
                </CardHoverEffect>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CardHoverEffect>
                <div className="bg-white rounded-xl shadow-lg mb-8">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Link href="/job-descriptions/new">
                        <motion.div
                          className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex-shrink-0 bg-sky-100 rounded-lg p-3 group-hover:bg-sky-200">
                            <svg className="h-6 w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Create Job Description</p>
                            <p className="text-sm text-gray-600">Post a new position</p>
                          </div>
                        </motion.div>
                      </Link>

                      <Link href="/talent-pool">
                        <motion.div
                          className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex-shrink-0 bg-green-100 rounded-lg p-3 group-hover:bg-green-200">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">Bulk Upload CVs</p>
                            <p className="text-sm text-gray-600">Upload multiple resumes</p>
                          </div>
                        </motion.div>
                      </Link>

                      <Link href="/talent-pool">
                        <motion.div
                          className="flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 transition-all cursor-pointer group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200">
                            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <p className="font-medium text-gray-900">View Talent Pool</p>
                            <p className="text-sm text-gray-600">Browse candidates</p>
                          </div>
                        </motion.div>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardHoverEffect>
            </motion.div>
          </>
        )}
      </main>
    </div>
  )
}
