'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAnalysisData, Tab } from '@/hooks/useAnalysisData'
import { apiClient } from '@/lib/api-client'

// Components
import { AnalysisHeader } from './AnalysisHeader'
import { CVPreviewSection } from './CVPreviewSection'
import { MatchScoreGauge } from '@/components/candidate/MatchScoreGauge'
import { QuickActionsBar } from '@/components/shared/QuickActionsBar'

// Tabs
import { OverviewTab } from '@/components/candidate/OverviewTab'
import { GapsTab } from '@/components/candidate/GapsTab'
import { LearningTimeline } from '@/components/candidate/LearningTimeline'
import { AIInsightsTab } from '@/components/candidate/AIInsightsTab'
import { SHAPVisualizations } from '@/components/shared/SHAPVisualizations'
import { InterviewTab } from '@/components/candidate/InterviewTab'
import { TrustTab } from '@/components/candidate/TrustTab'

export function EnhancedAnalysisView() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, tab, setTab, advancedData, actions } = useAnalysisData(id)
  
  const [exporting, setExporting] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  const steps = [
    'بدء الاتصال بالذكاء الاصطناعي...',
    'محرك الاستخراج (Extraction Agent) يحلل مهاراتك...',
    'محرك المطابقة (Matching Agent) يقارن سيرتك بالوظيفة...',
    'محرك التفسير (XAI Agent) يولد الرسوم البيانية...',
    'جاري التحقق من الجودة والموثوقية...',
    'تجهيز التقرير النهائي...'
  ]

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % steps.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [loading])

  const exportReport = async (fmt: 'pdf' | 'csv') => {
    if (!data?.cv_document_id || !id) return
    setExporting(true)
    try {
      const res = await apiClient.exportAnalysis(data.cv_document_id, fmt, id as string)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${(id as string).slice(0,8)}.${fmt}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch { 
      alert('Export failed') 
    } finally { 
      setExporting(false) 
    }
  }

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!id) return
    setReviewing(true)
    const success = await actions.submitReview(id as string, decision)
    if (!success) alert('Review failed')
    setReviewing(false)
  }

  if (loading) return (
    <div className="min-h-screen theme-bg flex items-center justify-center">
      <div className="text-center relative z-10">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="theme-text font-bold text-xl mb-2">{steps[loadingStep]}</p>
        <p className="theme-text-tertiary text-sm animate-pulse">يرجى الانتظار، المحللون الأذكياء يعملون...</p>
      </div>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen theme-bg flex items-center justify-center theme-text text-center p-6">
      <div className="max-w-md relative z-10">
        <div className="text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold mb-2">Analysis Not Found</h2>
        <p className="theme-text-tertiary mb-8">{error || 'The requested analysis record could not be retrieved.'}</p>
        <button onClick={() => router.push('/dashboard')} className="px-8 py-3 bg-sky-600 hover:bg-sky-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-sky-600/20">
          Return to Dashboard
        </button>
      </div>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 theme-glow-bg" />
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; icon: string; labelAr: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊', labelAr: 'نظرة عامة' },
    { id: 'gaps', label: 'Skill Gaps', icon: '⚠️', labelAr: 'الفجوات' },
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️', labelAr: 'خارطة الطريق' },
    { id: 'xai', label: 'AI Intelligence', icon: '🤖', labelAr: 'تقرير الذكاء' },
    { id: 'prep', label: 'Interview', icon: '🎤', labelAr: 'المقابلة' },
  ]

  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen relative theme-bg theme-text overflow-hidden selection:bg-sky-500/30">
        
        {/* Animated Background (Landing Page Style) */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 theme-glow-bg" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] theme-glow-1 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] theme-glow-2 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] theme-glow-3 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col h-screen overflow-hidden">
          <AnalysisHeader 
            filename={data.cv?.original_filename}
            jobTitle={data.jd?.title}
            id={id as string}
            exporting={exporting}
            onExport={exportReport}
          />

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            
            {/* Left Panel - CV Preview */}
            <div className="w-full lg:w-[35%] h-[45vh] lg:h-full lg:border-r theme-border bg-white/5 dark:bg-black/20 backdrop-blur-md overflow-y-auto hide-scrollbar">
              <CVPreviewSection cv={data.cv} onDownload={() => exportReport('pdf')} />
            </div>

            {/* Right Panel - Analysis */}
            <div className="w-full lg:w-[65%] flex flex-col h-full overflow-y-auto bg-white/5 dark:bg-gray-950/40 backdrop-blur-sm relative z-10">
              
              {/* Context Banners (Separated from scrollable content for clarity if needed) */}
              <div className="px-8 pt-6 space-y-3 sticky top-0 z-30 pointer-events-none">
                <div className="pointer-events-auto">
                  {data.is_partial && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 backdrop-blur-md mb-2">
                      <span>⚠️</span>
                      <span>Partial results — Some analysis modules are using fallback logic.</span>
                    </div>
                  )}
                  
                  {data.requires_human_review && data.human_review_status === 'pending_review' && (
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 backdrop-blur-md shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sky-600 dark:text-sky-400 font-bold text-sm">👁️ Human Verification Required</p>
                          <p className="theme-text-tertiary text-xs">AI confidence is below threshold. Please verify match score.</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleReview('approved')} disabled={reviewing} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-colors shadow-lg shadow-green-600/20">Approve</button>
                          <button onClick={() => handleReview('rejected')} disabled={reviewing} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-colors shadow-lg shadow-red-600/20">Reject</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Score Header */}
              <div className="p-8">
                <div className="theme-card rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                  {/* Internal Pulse */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-1000" />
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-center relative z-10">
                    <MatchScoreGauge 
                      score={data.match_score || 0} 
                      confidence={data.confidence_score || 0} 
                    />
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-black theme-text mb-1">Match Analysis</h2>
                        <p className="theme-text-tertiary text-sm">Deep AI cross-referencing completed</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <StatCard label="Matching" value={data.matching_skills?.length} color="text-emerald-500" bg="bg-emerald-500/10" />
                        <StatCard label="Missing" value={data.missing_skills?.length} color="text-rose-500" bg="bg-rose-500/10" />
                        <StatCard label="Related" value={data.transferable_skills?.length} color="text-sky-500" bg="bg-sky-500/10" />
                      </div>
                      
                      <QuickActionsBar 
                        onExportPDF={() => exportReport('pdf')} 
                        onExportCSV={() => exportReport('csv')} 
                        onCoaching={() => router.push('/coaching/career-chat')}
                        onInterview={() => router.push('/coaching/interview')}
                        isExporting={exporting}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Sticky Navigation */}
              <div className="px-8 mb-6 sticky top-0 bg-white/40 dark:bg-black/20 backdrop-blur-xl py-4 z-20 border-b theme-border">
                <div className="flex gap-2 bg-black/5 dark:bg-white/5 rounded-2xl p-1.5 border theme-border overflow-x-auto no-scrollbar">
                  {TABS.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setTab(t.id)}
                      className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        tab === t.id 
                          ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                          : 'theme-text-tertiary hover:theme-text hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <span className="hidden lg:inline">{t.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="px-8 pb-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab === 'overview' && <OverviewTab data={data} onTabChange={setTab} />}
                    {tab === 'gaps' && (
                      <GapsTab 
                        gapReport={data.gap_report} 
                        missingSkills={data.missing_skills || []} 
                      />
                    )}
                    {tab === 'roadmap' && (
                      <LearningTimeline 
                        roadmap={data.gap_report?.learning_roadmap || []} 
                        criticalGaps={data.gap_report?.critical_gaps || []}
                        importantGaps={data.gap_report?.important_gaps || []}
                        niceToHaveGaps={data.gap_report?.nice_to_have_gaps || []}
                        fallbackSkills={data.missing_skills || []}
                      />
                    )}
                    {tab === 'xai' && (
                      <AIInsightsTab 
                        xaiReport={data.xai_report} 
                        matchScore={data.match_score} 
                        trustData={{
                          redFlags: advancedData.redFlags,
                          bias: advancedData.bias,
                          hallucination: advancedData.hallucination
                        }}
                      />
                    )}
                    {tab === 'prep' && <InterviewTab guide={advancedData.interviewGuide} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function StatCard({ label, value, color, bg }: { label: string; value: any; color: string; bg: string }) {
  return (
    <div className={`${bg} border theme-border rounded-2xl p-4 text-center group hover:scale-105 transition-transform duration-300`}>
      <div className={`text-2xl font-black ${color}`}>{value || 0}</div>
      <div className="text-[10px] theme-text-tertiary uppercase font-bold tracking-widest mt-1">{label}</div>
    </div>
  )
}
