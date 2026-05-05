'use client'

/**
 * Simplified Analysis Results Page
 * Clean, modern UI with Sky Blue theme
 * Shows match score, skills, gaps, and roadmap
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { apiClient } from '@/lib/api-client'

export default function SimpleAnalysisPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'roadmap'>('overview')

  useEffect(() => {
    if (id) loadAnalysis()
  }, [id])

  const loadAnalysis = async () => {
    try {
      const [analysis, enhanced] = await Promise.allSettled([
        apiClient.getAnalysis(id),
        apiClient.getEnhancedAnalysis(id),
      ])
      
      const base = analysis.status === 'fulfilled' ? analysis.value : null
      const ext = enhanced.status === 'fulfilled' ? enhanced.value : {}
      
      if (!base) throw new Error('Analysis not found')
      
      const [cv, jd] = await Promise.allSettled([
        apiClient.getDocument(base.cv_document_id),
        apiClient.getJobDescription(base.job_description_id),
      ])
      
      setData({
        ...base,
        ...ext,
        cv: cv.status === 'fulfilled' ? cv.value : null,
        jd: jd.status === 'fulfilled' ? jd.value : null,
      })
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message || 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <motion.div 
          className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </ProtectedRoute>
  )

  if (error || !data) return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="theme-text font-semibold mb-4">{error || 'Analysis not found'}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </ProtectedRoute>
  )

  const score = Math.round((data.match_score || 0) * 100)
  const isPartial = data.is_partial || data.processing_status === 'partial_done'
  const gap = data.gap_report

  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg theme-text">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 theme-glow-bg" />
          <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="relative z-10 theme-card border-b theme-border px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-bold theme-text">نتائج التحليل</h1>
                <p className="text-sm theme-text-tertiary">
                  {data.cv?.original_filename} ↔ {data.jd?.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all text-sm">
                📄 PDF
              </button>
              <button className="px-4 py-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all text-sm">
                📊 CSV
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          
          {/* Partial Results Warning */}
          {isPartial && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-yellow-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold">نتائج جزئية</p>
                  <p className="text-sm text-yellow-200/80">
                    بعض التحليلات واجهت مشاكل. التطابق الأساسي مكتمل.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Match Score Hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 theme-card border theme-border rounded-3xl p-8 text-center"
          >
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 border-4 border-sky-500/30 mb-4">
                <div className="text-5xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                  {score}%
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold theme-text mb-2">درجة التطابق</h2>
            <p className="theme-text-secondary text-sm mb-6">
              {score >= 80 ? '🎯 تطابق ممتاز' : 
               score >= 60 ? '👍 تطابق جيد' : 
               score >= 40 ? '⚠️ تطابق متوسط' : '❌ تطابق ضعيف'}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="theme-card border theme-border rounded-xl p-4">
                <div className="text-3xl font-bold text-green-400">
                  {data.matching_skills?.length || 0}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">مهارات متطابقة</div>
              </div>
              
              <div className="theme-card border theme-border rounded-xl p-4">
                <div className="text-3xl font-bold text-red-400">
                  {data.missing_skills?.length || 0}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">مهارات مفقودة</div>
              </div>
              
              <div className="theme-card border theme-border rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-400">
                  {data.transferable_skills?.length || 0}
                </div>
                <div className="text-xs theme-text-tertiary mt-1">مهارات قابلة للنقل</div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 bg-white/5 rounded-2xl p-2">
              {[
                { id: 'overview', label: 'نظرة عامة', icon: '📊' },
                { id: 'gaps', label: 'الفجوات', icon: '⚠️' },
                { id: 'roadmap', label: 'خارطة الطريق', icon: '🗺️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white'
                      : 'theme-text-secondary hover:theme-text'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Matching Skills */}
                {data.matching_skills?.length > 0 && (
                  <div className="theme-card border theme-border rounded-2xl p-6">
                    <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      المهارات المتطابقة
                      <span className="ml-auto text-sm theme-text-tertiary">
                        {data.matching_skills.length} مهارة
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.matching_skills.map((skill: string, i: number) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {data.missing_skills?.length > 0 && (
                  <div className="theme-card border theme-border rounded-2xl p-6">
                    <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                      <span className="text-2xl">❌</span>
                      المهارات المفقودة
                      <span className="ml-auto text-sm theme-text-tertiary">
                        {data.missing_skills.length} مهارة
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.missing_skills.map((skill: string, i: number) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transferable Skills */}
                {data.transferable_skills?.length > 0 && (
                  <div className="theme-card border theme-border rounded-2xl p-6">
                    <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                      <span className="text-2xl">🔄</span>
                      المهارات القابلة للنقل
                      <span className="ml-auto text-sm theme-text-tertiary">
                        {data.transferable_skills.length} مهارة
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.transferable_skills.map((skill: string, i: number) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'gaps' && (
              <motion.div
                key="gaps"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!gap || (!gap.critical_gaps?.length && !gap.nice_to_have_gaps?.length) ? (
                  <div className="theme-card border theme-border rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold theme-text mb-2">
                      لا توجد فجوات تعليمية!
                    </h3>
                    <p className="theme-text-secondary">
                      أنت متطابق بشكل جيد مع هذا الدور.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Critical Gaps */}
                    {gap.critical_gaps?.length > 0 && (
                      <div className="theme-card border border-red-500/30 rounded-2xl p-6">
                        <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                          <span className="text-2xl">🔴</span>
                          فجوات حرجة
                          <span className="ml-auto text-sm text-red-300/60">
                            {gap.critical_gaps.length} فجوة
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {gap.critical_gaps.map((g: any, i: number) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-red-500/5 border border-red-500/20 rounded-xl p-4"
                            >
                              <div className="font-semibold text-red-300 mb-2">{g.skill}</div>
                              <p className="text-sm theme-text-secondary mb-2">{g.reason}</p>
                              {g.impact_if_fixed && (
                                <p className="text-xs text-red-400">
                                  💡 التأثير: {g.impact_if_fixed}
                                </p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nice to Have Gaps */}
                    {gap.nice_to_have_gaps?.length > 0 && (
                      <div className="theme-card border border-yellow-500/30 rounded-2xl p-6">
                        <h3 className="font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                          <span className="text-2xl">🟡</span>
                          فجوات مرغوبة
                          <span className="ml-auto text-sm text-yellow-300/60">
                            {gap.nice_to_have_gaps.length} فجوة
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {gap.nice_to_have_gaps.map((g: any, i: number) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4"
                            >
                              <div className="font-semibold text-yellow-300 mb-2">{g.skill}</div>
                              <p className="text-sm theme-text-secondary">{g.reason}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'roadmap' && (
              <motion.div
                key="roadmap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!gap?.learning_roadmap?.length ? (
                  <div className="theme-card border theme-border rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold theme-text mb-2">
                      لا توجد خارطة طريق متاحة
                    </h3>
                    <p className="theme-text-secondary">
                      لم يتم إنشاء خارطة تعليمية بعد.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gap.learning_roadmap.map((item: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="theme-card border theme-border rounded-2xl p-6"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center text-xl font-bold text-sky-400 flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold theme-text text-lg mb-2">{item.skill}</h4>
                            {item.personalized_note && (
                              <p className="text-sm theme-text-secondary mb-4">{item.personalized_note}</p>
                            )}
                            
                            {/* Resources */}
                            {item.resources?.length > 0 && (
                              <div className="space-y-2 mb-4">
                                <p className="text-xs theme-text-tertiary font-semibold">الموارد المقترحة:</p>
                                {item.resources.map((resource: any, j: number) => (
                                  <div key={j} className="bg-white/5 rounded-lg p-3 text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sky-400">{resource.type === 'course' ? '📚' : resource.type === 'project' ? '💻' : '📖'}</span>
                                      <span className="font-medium theme-text">{resource.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs theme-text-tertiary">
                                      {resource.provider && <span>📍 {resource.provider}</span>}
                                      {resource.duration && <span>⏱️ {resource.duration}</span>}
                                      {resource.cost && <span className={resource.cost === 'free' ? 'text-green-400' : 'text-yellow-400'}>
                                        {resource.cost === 'free' ? '🆓 مجاني' : '💰 مدفوع'}
                                      </span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Timeline */}
                            <div className="flex items-center gap-4 text-sm theme-text-tertiary">
                              {item.estimated_weeks && (
                                <span>⏱️ {item.estimated_weeks} أسابيع</span>
                              )}
                              {item.roi && (
                                <span className="text-green-400">💰 {item.roi}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Advisory Notice */}
          <div className="mt-8 text-center text-sm theme-text-tertiary">
            <span className="inline-block w-2 h-2 bg-sky-400 rounded-full mr-2"></span>
            جميع التحليلات استشارية فقط · is_binding = false
            <span className="inline-block w-2 h-2 bg-sky-400 rounded-full ml-2"></span>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
