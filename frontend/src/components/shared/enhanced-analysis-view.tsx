'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnalysisData, Tab } from '@/hooks/useAnalysisData'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { 
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
  Cpu
} from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { AnalysisHeader } from './AnalysisHeader'
import { CVPreviewSection } from './CVPreviewSection'
import { MatchScoreGauge } from '@/components/candidate/MatchScoreGauge'

import { OverviewTab } from '@/components/candidate/OverviewTab'
import { GapsTab } from '@/components/candidate/GapsTab'
import { LearningTimeline } from '@/components/candidate/LearningTimeline'
import { AIInsightsTab } from '@/components/candidate/AIInsightsTab'
import { InterviewTab } from '@/components/candidate/InterviewTab'

const R = { fontFamily: 'Roboto, sans-serif' }

export function EnhancedAnalysisView() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const id = (params?.id as string) ?? (Array.isArray(params?.slug) ? params.slug[1] : null)
  const { data, loading, error, tab, setTab, advancedData } = useAnalysisData(id || '')
  
  const homePath = user?.role === 'recruiter' ? '/recruiter' : '/dashboard'
  
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

  /* ── Loading ── */
  if (loading) return (
    <div className="h-[75vh] flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-neutral-900 shadow-sm" style={R}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-indigo-600/[0.03] pointer-events-none" />
      <div className="relative">
        <img
          src="/resume-scan.gif"
          alt="Analyzing..."
          className="w-48 h-48 object-contain mx-auto rounded-2xl"
        />
      </div>
      <div className="space-y-4 relative z-10">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">{steps[loadingStep]}</h2>
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 tracking-wide">Neural Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 tracking-wide">Semantic Map</span>
          </div>
        </div>
      </div>
    </div>
  )

  /* ── Error ── */
  if (error || !data) return (
    <div className="h-[70vh] flex items-center justify-center text-center p-6 bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-neutral-900" style={R}>
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/30">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Analysis Not Found</h2>
          <p className="text-gray-500 dark:text-neutral-400 text-sm leading-relaxed">{error || 'The requested analysis could not be retrieved.'}</p>
        </div>
        <button 
          onClick={() => router.push(homePath)} 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 transition-all"
        >
          {user?.role === 'recruiter' ? 'Return to Hub' : 'Return to Dashboard'}
        </button>
      </div>
    </div>
  )

  const TABS_CONFIG: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview',   icon: BarChart3     },
    { id: 'gaps',     label: 'Skill Gaps', icon: Target        },
    { id: 'roadmap',  label: 'Roadmap',    icon: MapIcon       },
    { id: 'xai',      label: 'AI Insights',icon: BrainCircuit  },
    { id: 'prep',     label: 'Interview',  icon: MessageSquare },
  ]

  return (
    <div className="relative space-y-6 animate-in fade-in duration-300" style={R}>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-1">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href={homePath} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {user?.role === 'recruiter' ? 'Hub' : 'Resumes'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            <span className="text-slate-700 dark:text-slate-300">Neural Report</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">#{id?.toString().slice(0, 8)}</span>
          </div>
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-x-3">
            {data.jd?.title || 'System Analysis'}
            <span className="text-slate-300 dark:text-slate-700 font-light text-2xl">/</span>
            <span className="text-blue-600 dark:text-blue-400">
              {data.jd?.company || 'Opportunity'}
            </span>
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => exportReport('pdf')}
            disabled={exporting}
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {exporting 
              ? <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin" /> 
              : <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            Export PDF
          </button>
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left Column */}
        <div className="flex-1 space-y-5">

          {/* Hero Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
              {/* Score */}
              <div className="md:col-span-4 flex justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-6 md:pb-0 md:pr-8">
                <MatchScoreGauge 
                  score={data.match_score || 0} 
                  confidence={data.confidence_score || 0} 
                />
              </div>

              {/* Info */}
              <div className="md:col-span-8 space-y-6 md:pl-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide">
                    <BrainCircuit className="w-4 h-4" /> NEURAL ENGINE v3.1
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Intelligence Insights</h2>
                  <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed font-medium">
                    {data.xai_report?.summary || data.summary || `Match score of ${Math.round((data.match_score || 0) * 100)}%. This report highlights evidence for the match, skill gaps, and growth recommendations.`}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="MATCHING" value={data.matching_skills?.length} color="emerald" />
                  <StatBox label="MISSING"  value={data.missing_skills?.length}  color="rose"    />
                  <StatBox label="TRANSFER" value={data.transferable_skills?.length} color="blue" />
                </div>

                {/* Trust badges */}
                <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Match
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-semibold">
                    <ShieldCheck className="w-4 h-4 text-blue-500" /> Protected Data
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="space-y-4">
            {/* Tab Bar */}
            <div className="flex p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto no-scrollbar shadow-sm">
              <div className="flex gap-1.5">
                {TABS_CONFIG.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setTab(t.id)}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                      ${tab === t.id 
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-md border border-slate-200 dark:border-slate-700' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'}
                    `}
                  >
                    <t.icon className={`w-4 h-4 ${tab === t.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
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

        {/* Right Sidebar */}
        <div className="w-full xl:w-[360px] space-y-5">

          {/* CV Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-neutral-500 px-1 uppercase">Expertise Reference</h4>
            <div className="rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] overflow-hidden shadow-sm">
              <CVPreviewSection cv={data.cv} onDownload={() => exportReport('pdf')} />
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-4">
            <h4 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-neutral-500 uppercase">Next Steps</h4>
            <div className="space-y-2.5">
              {user?.role !== 'recruiter' && (
                <button 
                  onClick={() => router.push(`/coaching?session=${id}`)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-800 dark:text-white font-medium text-sm flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-neutral-800/60 hover:border-gray-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>Consult AI Coach</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
              {user?.role !== 'recruiter' && (
                <button 
                  onClick={() => router.push(`/interview?jd_id=${data.job_description_id}`)}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-800 dark:text-white font-medium text-sm flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-neutral-800/60 hover:border-gray-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Simulate Interview</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
              {user?.role === 'recruiter' && (
                <button
                  onClick={() => router.push('/talent-pool')}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-800 dark:text-white font-medium text-sm flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-neutral-800/60 hover:border-gray-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span>Add to Talent Pool</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
              {user?.role === 'recruiter' && (
                <button
                  onClick={() => router.push('/compare-candidates')}
                  className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-800 dark:text-white font-medium text-sm flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-neutral-800/60 hover:border-gray-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <span>Compare Candidates</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Stat Box ── */
const colorMap: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200 dark:border-emerald-500/20',
  rose:    'text-rose-600    dark:text-rose-400    bg-rose-50    dark:bg-rose-500/[0.06]    border-rose-200    dark:border-rose-500/20',
  blue:    'text-blue-600    dark:text-blue-400    bg-blue-50    dark:bg-blue-500/[0.06]    border-blue-200    dark:border-blue-500/20',
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className={`p-4 rounded-xl border text-center space-y-1.5 ${colorMap[color]}`} style={{ fontFamily: 'Roboto, sans-serif' }}>
      <div className="text-3xl font-black tracking-tight">{value ?? 0}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">{label}</div>
    </div>
  )
}
