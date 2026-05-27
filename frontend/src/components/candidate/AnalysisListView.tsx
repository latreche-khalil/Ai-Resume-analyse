'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  BarChart3, Search, Trash2, ChevronRight, Clock,
  Building2, Plus, ArrowUpRight, BrainCircuit,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
  Target, Zap
} from 'lucide-react'

const FONT = { fontFamily: 'Roboto, sans-serif' }

type StatusFilter = 'all' | 'completed' | 'partial_done' | 'failed' | 'processing'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  completed:    { label: 'Completed',   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle2 },
  partial_done: { label: 'Partial',     color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',    icon: AlertCircle  },
  failed:       { label: 'Failed',      color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',            icon: AlertCircle  },
  processing:   { label: 'Processing',  color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',        icon: Loader2      },
  pending:      { label: 'Pending',     color: 'text-gray-500 dark:text-neutral-400',   bg: 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700',           icon: Clock        },
}

function getStatus(a: any) {
  const s = a.processing_status || a.analysis_status || 'pending'
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending
}

function getScore(a: any): number {
  const raw = a.match_score ?? 0
  // Convert decimal (0-1) to percentage if needed
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw)
}

function ScoreRing({ score, status }: { score: number; status: string }) {
  const isGood = score >= 60
  const isMid  = score >= 40
  const color  = status === 'failed' ? '#ef4444' : isGood ? '#10b981' : isMid ? '#f59e0b' : '#6366f1'
  const circumference = 2 * Math.PI * 20
  const dash = (score / 100) * circumference

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
          className="text-gray-200 dark:text-slate-700" />
        <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-900 dark:text-white">{score}%</span>
      </div>
    </div>
  )
}

export function AnalysisListView() {
  const router = useRouter()
  const [analyses, setAnalyses]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<StatusFilter>('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.listAnalyses({ limit: 100 })
      setAnalyses(res.analyses || [])
    } catch {
      toast.error('Failed to load analyses')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const prev = [...analyses]
    setAnalyses(p => p.filter(a => a.id !== id))
    setDeleting(id)
    try {
      await apiClient.deleteAnalysis(id)
      toast.success('Analysis deleted')
    } catch {
      setAnalyses(prev)
      toast.error('Failed to delete analysis')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = analyses.filter(a => {
    const matchSearch =
      (a.job_description?.title || a.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.job_description?.company || a.company || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (a.processing_status || a.analysis_status) === filter
    return matchSearch && matchFilter
  })

  // Count by status for filter badges
  const counts = analyses.reduce((acc, a) => {
    const s = a.processing_status || a.analysis_status || 'pending'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all',          label: `All (${analyses.length})` },
    { id: 'completed',    label: `Completed (${counts.completed || 0})` },
    { id: 'partial_done', label: `Partial (${counts.partial_done || 0})` },
    { id: 'failed',       label: `Failed (${counts.failed || 0})` },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10" style={FONT}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Job Analyses</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            {analyses.length} total · {counts.completed || 0} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2.5 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-gray-500 dark:text-neutral-400 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/analysis/new">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
              <Plus size={16} /> New Analysis
            </button>
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by role or company..."
            className="w-full bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-[#151518] shadow-sm'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-gray-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {search ? `No results for "${search}"` : 'No analyses yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6 max-w-xs">
            {search ? 'Try a different search term.' : 'Run your first AI analysis to see how well your resume matches a job.'}
          </p>
          {!search && (
            <Link href="/analysis/new">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
                <Zap size={15} /> Start First Analysis
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((analysis, i) => {
              const status = getStatus(analysis)
              const score  = getScore(analysis)
              const StatusIcon = status.icon
              const title   = analysis.job_description?.title   || analysis.job_title   || 'Job Analysis'
              const company = analysis.job_description?.company || analysis.company     || 'Company'
              const date    = new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const matchingCount = analysis.matching_skills?.length ?? 0
              const missingCount  = analysis.missing_skills?.length  ?? 0

              return (
                <motion.div key={analysis.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/analysis/${analysis.id}`)}
                  className="group cursor-pointer bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5 transition-all flex flex-col gap-4"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                        <Building2 size={18} className="text-gray-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 truncate">{company}</p>
                      </div>
                    </div>
                    <button onClick={e => handleDelete(analysis.id, e)} disabled={deleting === analysis.id}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                      {deleting === analysis.id
                        ? <Loader2 size={14} className="animate-spin text-red-500" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>

                  {/* Score + Status */}
                  <div className="flex items-center gap-3">
                    <ScoreRing score={score} status={analysis.processing_status || ''} />
                    <div className="flex-1 min-w-0">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${status.bg} ${status.color}`}>
                        <StatusIcon size={11} className={status.icon === Loader2 ? 'animate-spin' : ''} />
                        {status.label}
                      </div>
                      {(analysis.processing_status === 'completed' || analysis.processing_status === 'partial_done') && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-neutral-400">
                          {matchingCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">✓ {matchingCount} matching</span>}
                          {missingCount > 0  && <span className="text-red-500 dark:text-red-400">✗ {missingCount} missing</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e1e24]">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500">
                      <Clock size={11} /> {date}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      View Report <ChevronRight size={13} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
