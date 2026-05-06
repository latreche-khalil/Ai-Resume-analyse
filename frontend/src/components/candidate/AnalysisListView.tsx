'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
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
    
    const deleteToast = toast.loading('Deleting analysis...')
    setDeleting(id)
    try {
      await apiClient.deleteAnalysis(id)
      setAnalyses(prev => prev.filter(a => a.id !== id))
      toast.success('Analysis deleted successfully.', { id: deleteToast })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete analysis', { id: deleteToast })
    } finally {
      setDeleting(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'from-emerald-400 to-teal-600 shadow-emerald-500/20'
    if (score >= 0.6) return 'from-blue-400 to-indigo-600 shadow-blue-500/20'
    if (score >= 0.4) return 'from-amber-400 to-orange-600 shadow-amber-500/20'
    return 'from-rose-400 to-red-600 shadow-rose-500/20'
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
                        <div className="relative group/score overflow-hidden rounded-2xl p-6 mb-4 bg-white/[0.03] border border-white/10 backdrop-blur-sm transition-all duration-500 hover:border-white/20">
                          <div className="relative text-center">
                            <div className="text-5xl font-extralight tracking-tighter theme-text opacity-90">
                              {Math.round(analysis.match_score * 100)}<span className="text-lg opacity-40 ml-1">/100</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${analysis.match_score >= 0.7 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <div className="text-[9px] font-medium uppercase tracking-[0.3em] theme-text-tertiary">Match Index</div>
                            </div>
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
