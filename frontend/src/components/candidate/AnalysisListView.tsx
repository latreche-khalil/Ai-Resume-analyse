'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { CardHoverEffect } from '@/components/ui/card-hover-effect'
import { formatDateTime } from '@/lib/utils'

export function AnalysisListView() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const response = await apiClient.listAnalyses({ limit: 100 })
      setAnalyses(response.analyses || [])
    } catch (error) {
      console.error('Failed to load analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this analysis?')) return
    
    setDeleting(id)
    try {
      await apiClient.deleteAnalysis(id)
      setAnalyses(prev => prev.filter(a => a.id !== id))
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete analysis')
    } finally {
      setDeleting(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'from-green-500 to-emerald-600'
    if (score >= 0.6) return 'from-yellow-500 to-orange-600'
    return 'from-red-500 to-pink-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              My Analyses
            </h1>
            <Link href="/analysis/new">
              <motion.button
                className="px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                New Analysis
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            <p className="mt-4 text-gray-600">Loading analyses...</p>
          </div>
        ) : analyses.length === 0 ? (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No analyses yet</h3>
            <p className="text-gray-600 mb-6">Start by analyzing your CV against a job description</p>
            <Link href="/analysis/new">
              <motion.button
                className="px-8 py-4 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create First Analysis
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((analysis, index) => (
              <motion.div
                key={analysis.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardHoverEffect>
                  <div className="relative">
                    <Link href={`/analysis/${analysis.id}`}>
                      <div className="bg-white rounded-xl shadow-lg p-6 cursor-pointer h-full">
                        <div className={`bg-gradient-to-r ${getScoreColor(analysis.match_score)} rounded-lg p-4 mb-4`}>
                          <div className="text-center text-white">
                            <div className="text-4xl font-bold">{Math.round(analysis.match_score * 100)}%</div>
                            <div className="text-sm opacity-90">Match Score</div>
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {analysis.job_description?.title || 'Job Analysis'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          {formatDateTime(analysis.created_at)}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-sky-600 font-medium">
                            View Details
                            <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(analysis.id, e)}
                      disabled={deleting === analysis.id}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 flex items-center justify-center transition-colors disabled:opacity-50 z-10"
                      title="Delete analysis"
                    >
                      {deleting === analysis.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </CardHoverEffect>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
