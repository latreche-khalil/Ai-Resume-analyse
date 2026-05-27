'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAnalysisData, Tab } from '@/hooks/useAnalysisData'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { 
  FileText, 
  Download, 
  Share2, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  Target, 
  Map as MapIcon, 
  MessageSquare, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  Cpu,
  Fingerprint
} from 'lucide-react'

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
import { InterviewTab } from '@/components/candidate/InterviewTab'
import { TrustTab } from '@/components/candidate/TrustTab'

export function EnhancedAnalysisView() {
  const router = useRouter()
  const params = useParams()
  // Support both the new /analysis/[id] route and the legacy [[...slug]] catch-all
  const id = (params?.id as string) ?? (Array.isArray(params?.slug) ? params.slug[1] : null)
  const { data, loading, error, tab, setTab, advancedData, actions } = useAnalysisData(id || '')
  
  const [exporting, setExporting] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  const steps = [
    'Initializing Neural Engine...',
    'Extracting Semantic Tokens...',
    'Matching Professional Expertise...',
    'Generating XAI Visualizations...',
    'Verifying Trust & Safety...',
    'Finalizing AI Report...'
  ]

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % steps.length)
      }, 2000)
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
      toast.success(`Report exported as ${fmt.toUpperCase()}`)
    } catch { 
      toast.error('Export failed. Please try again.') 
    } finally { 
      setExporting(false) 
    }
  }

  if (loading) return (
    <div className="h-[75vh] flex flex-col items-center justify-center text-center space-y-10 relative overflow-hidden bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200/50 dark:border-neutral-900/60 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-indigo-600/[0.03] pointer-events-none" />
      
      <div className="relative">
         <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 mx-auto rounded-full border-2 border-dashed border-blue-500/20 dark:border-neutral-800 flex items-center justify-center"
         >
            <motion.div 
               animate={{ scale: [1, 1.1, 1] }}
               transition={{ duration: 3, repeat: Infinity }}
               className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/10"
            >
               <Cpu className="w-8 h-8 text-white" />
            </motion.div>
         </motion.div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="space-y-5 relative z-10">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>{steps[loadingStep]}</h2>
         <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2.5">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Neural Engine</span>
            </div>
            <div className="flex items-center gap-2.5">
               <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
               <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Semantic Map</span>
            </div>
         </div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="h-[70vh] flex items-center justify-center text-center p-6 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-slate-200/50 dark:border-neutral-900/60">
      <div className="max-w-md space-y-7">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/30 shadow-sm">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>Analysis Expired or Missing</h2>
          <p className="text-slate-600 dark:text-neutral-400 text-sm font-normal leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>{error || 'The requested analysis record could not be retrieved from the intelligence layer.'}</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard')} 
          className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all" style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          Return to Workspace
        </button>
      </div>
    </div>
  )

  const TABS_CONFIG: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'gaps', label: 'Skill Gaps', icon: Target },
    { id: 'roadmap', label: 'Roadmap', icon: MapIcon },
    { id: 'xai', label: 'AI Insights', icon: BrainCircuit },
    { id: 'prep', label: 'Interview', icon: MessageSquare },
  ]

  return (
    <div className="relative space-y-6 animate-in fade-in duration-300 text-gray-900 dark:text-neutral-200">
      
      {/* Header Info: Modern & Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 px-1">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 text-xs font-medium tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
            <Link href="/documents" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Resumes</Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            <span className="text-slate-600 dark:text-neutral-300">Neural Report</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">#{id?.toString().slice(0, 8)}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white flex flex-wrap items-center gap-x-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
            {data.jd?.title || 'System Analysis'}
            <span className="text-slate-300 dark:text-neutral-700 font-light text-2xl">/</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {data.jd?.company || 'Opportunity'}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => exportReport('pdf')}
             disabled={exporting}
             className="px-5 py-2.5 bg-white dark:bg-[#0f0f11] border border-gray-300 dark:border-[#1e1e24] text-slate-700 dark:text-neutral-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#151518] hover:border-slate-400 dark:hover:border-neutral-700 transition-all flex items-center gap-2.5 shadow-sm disabled:opacity-50" style={{ fontFamily: 'Roboto, sans-serif' }}
           >
             {exporting ? <div className="w-4 h-4 border-2 border-slate-900/30 dark:border-white/30 border-t-slate-900 dark:border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4 text-slate-500 dark:text-neutral-400" />}
             <span>Export PDF</span>
           </button>
           <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2.5" style={{ fontFamily: 'Roboto, sans-serif' }}>
             <Share2 className="w-4 h-4" />
             <span>Share</span>
           </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 relative z-10">
        {/* Main Content: Left Column */}
        <div className="flex-1 space-y-6">
           {/* Hero Summary Card: Compact & Premium */}
           <div className="p-8 sm:p-10 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] relative overflow-hidden group shadow-sm">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/[0.03] to-transparent blur-3xl rounded-full pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
                <div className="md:col-span-4 flex justify-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-neutral-900/50 pb-8 md:pb-0 md:pr-10">
                  <MatchScoreGauge 
                    score={data.match_score || 0} 
                    confidence={data.confidence_score || 0} 
                  />
                </div>
                
                <div className="md:col-span-8 space-y-6 md:pl-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
                       <BrainCircuit className="w-3.5 h-3.5" /> NEURAL ENGINE v3.1
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>Intelligence Insights</h2>
                    <p className="text-slate-600 dark:text-neutral-400 text-sm leading-relaxed font-normal" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {data.xai_report?.summary || data.summary || `The candidate, Latreche Khalil, demonstrates a strong foundation in frontend development with a match score of ${Math.round((data.match_score || 0) * 100)}%. This report highlights the evidence for the match, gaps in required skills, and provides recommendations for growth.`}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <StatBox label="MATCHING" value={data.matching_skills?.length} color="text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.05] border-emerald-500/20" />
                    <StatBox label="MISSING" value={data.missing_skills?.length} color="text-rose-600 dark:text-rose-400 bg-rose-500/[0.05] border-rose-500/20" />
                    <StatBox label="TRANSFER" value={data.transferable_skills?.length} color="text-blue-600 dark:text-blue-400 bg-blue-500/[0.05] border-blue-500/20" />
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-neutral-900/50">
                     <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 text-xs font-medium tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Match
                     </div>
                     <div className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 text-xs font-medium tracking-wide" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        <ShieldCheck className="w-4 h-4 text-blue-500" /> Protected Data
                     </div>
                  </div>
                </div>
              </div>
           </div>

            {/* Tabs Navigation: Beautiful Pill Bar */}
            <div className="space-y-5">
              <div className="flex p-1.5 bg-slate-50/80 dark:bg-[#0c0c0e]/80 border border-gray-200/60 dark:border-neutral-900/80 rounded-xl overflow-x-auto no-scrollbar shadow-sm">
                <div className="flex gap-1.5">
                  {TABS_CONFIG.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setTab(t.id)}
                      className={`
                        flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                        ${tab === t.id 
                          ? 'bg-white dark:bg-[#18181b] text-blue-600 dark:text-white shadow-md border border-gray-200/80 dark:border-neutral-800' 
                          : 'text-slate-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.02]'}
                      `}
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      <t.icon className={`w-4 h-4 transition-colors ${tab === t.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-neutral-500'}`} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
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

        {/* Sidebar: Right Column */}
        <div className="w-full xl:w-[380px] space-y-6">
           {/* Document Preview */}
           <div className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400 px-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Expertise Reference</h4>
              <div className="rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] overflow-hidden shadow-sm">
                 <CVPreviewSection cv={data.cv} onDownload={() => exportReport('pdf')} />
              </div>
           </div>

           {/* Quick Actions */}
           <div className="p-7 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-5">
              <h4 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Next Phases</h4>
              <div className="space-y-3">
                 <button 
                   onClick={() => router.push(`/coaching?session=${id}`)}
                   className="w-full p-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-white font-semibold text-sm flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-sm" style={{ fontFamily: 'Roboto, sans-serif' }}
                 >
                    <div className="flex items-center gap-3">
                       <MessageSquare className="w-4.5 h-4.5 text-blue-500" />
                       <span>CONSULT AI COACH</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                 </button>
                 <button 
                   onClick={() => router.push(`/interview?jd_id=${data.job_description_id}`)}
                   className="w-full p-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-white font-semibold text-sm flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-neutral-800/60 hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-sm" style={{ fontFamily: 'Roboto, sans-serif' }}
                 >
                    <div className="flex items-center gap-3">
                       <Zap className="w-4.5 h-4.5 text-amber-500" />
                       <span>SIMULATE INTERVIEW</span>
                    </div>
                    <ChevronRight className="w-4.5 h-4.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className={`p-4 rounded-xl border text-center space-y-1.5 ${color}`}>
      <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Roboto, sans-serif' }}>{value || 0}</div>
      <div className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 tracking-wider uppercase" style={{ fontFamily: 'Roboto, sans-serif' }}>{label}</div>
    </div>
  )
}
