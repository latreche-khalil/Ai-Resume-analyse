'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  BarChart3, Trash2, ChevronRight, Clock, Building2,
  Plus, Zap, Loader2, RefreshCw, Search, Target,
  CheckCircle2, AlertCircle, XCircle, Hourglass,
  TrendingUp, FileText, Sparkles
} from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

type StatusFilter = 'all' | 'completed' | 'partial_done' | 'failed'

function normalizeScore(raw: number | null | undefined): number {
  if (!raw) return 0
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw)
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string; icon: any }> = {
  completed:    { label: 'Completed',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500', icon: CheckCircle2 },
  partial_done: { label: 'Partial',    color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',       dot: 'bg-amber-500',  icon: AlertCircle  },
  failed:       { label: 'Failed',     color: 'text-red-700 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',               dot: 'bg-red-500',    icon: XCircle      },
  processing:   { label: 'Processing', color: 'text-blue-700 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',           dot: 'bg-blue-500',   icon: Loader2      },
  pending:      { label: 'Pending',    color: 'text-gray-500 dark:text-neutral-400',   bg: 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700',              dot: 'bg-gray-400',   icon: Hourglass    },
}

function ScoreArc({ score, status }: { score: number; status: string }) {
  const color =
    status === 'failed'  ? '#ef4444' :
    score >= 70          ? '#10b981' :
    score >= 45          ? '#f59e0b' : '#6366f1'
  const r    = 22
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="3.5"
          stroke="currentColor" className="text-gray-100 dark:text-slate-800" />
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="3.5"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white leading-none">{score}%</span>
      </div>
    </div>
  )
}

export function AnalysisListView() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<StatusFilter>('all')

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
    e.preventDefault()
    e.stopPropagation()
    const prev = [...analyses]
    setAnalyses(p => p.filter(a => a.id !== id))
    setDeleting(id)
    try {
      await apiClient.deleteAnalysis(id)
      toast.success('Analysis deleted')
    } catch {
      setAnalyses(prev)
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const counts = analyses.reduce((acc, a) => {
    const s = a.processing_status || a.analysis_status || 'pending'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgScore = analyses.length
    ? Math.round(analyses.filter(a => a.match_score).reduce((s, a) => s + normalizeScore(a.match_score), 0) / analyses.filter(a => a.match_score).length) || 0
    : 0

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all',          label: 'All'       },
    { id: 'completed',    label: 'Completed' },
    { id: 'partial_done', label: 'Partial'   },
    { id: 'failed',       label: 'Failed'    },
  ]

  const filtered = analyses.filter(a => {
    const title   = (a.job_description?.title   || a.job_title   || '').toLowerCase()
    const company = (a.job_description?.company || a.company     || '').toLowerCase()
    const q       = search.toLowerCase()
    const matchSearch = title.includes(q) || company.includes(q)
    const matchFilter = filter === 'all' || (a.processing_status || a.analysis_status) === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10" style={R}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 font-medium">
            <Target size={13} className="text-blue-500" />
            <span>Job Matching</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            My Analyses
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            See how your resume matches each job description
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link href="/analysis/new">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
              <Plus size={15} /> New Analysis
            </button>
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: analyses.length,           icon: FileText,    color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10'    },
            { label: 'Completed',  value: counts.completed  || 0,    icon: CheckCircle2,color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Avg Score',  value: `${avgScore}%`,            icon: TrendingUp,  color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            { label: 'Pending',    value: (counts.pending || 0) + (counts.processing || 0), icon: Hourglass, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title or company..."
            className="w-full bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-sm"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {FILTERS.map(f => {
            const cnt = f.id === 'all' ? analyses.length : (counts[f.id] || 0)
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-[#151518] shadow-sm'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[10px] font-semibold ${filter === f.id ? 'opacity-80' : 'opacity-50'}`}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-[#0f0f11] border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl"
        >
          {search ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No results for "{search}"</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">Try a different job title or company name</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-blue-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No analyses yet</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5 max-w-xs">
                Upload your resume and paste a job description to see your match score
              </p>
              <Link href="/analysis/new">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
                  <Zap size={14} /> Start First Analysis
                </button>
              </Link>
            </>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((analysis, i) => {
              const score        = normalizeScore(analysis.match_score)
              const status       = analysis.processing_status || analysis.analysis_status || 'pending'
              const cfg          = STATUS_CFG[status] ?? STATUS_CFG.pending
              const StatusIcon   = cfg.icon
              const title        = analysis.job_description?.title   || analysis.job_title   || 'Job Analysis'
              const company      = analysis.job_description?.company || analysis.company     || 'Unknown Company'
              const date         = new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const matchingCount = analysis.matching_skills?.length ?? 0
              const missingCount  = analysis.missing_skills?.length  ?? 0
              const isDone        = status === 'completed' || status === 'partial_done'

              return (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => router.push(`/analysis/${analysis.id}`)}
                  className="group cursor-pointer bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all flex flex-col gap-4"
                >
                  {/* Top row: company icon + title + delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                        <Building2 size={17} className="text-gray-400 dark:text-neutral-500 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 truncate">{company}</p>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDelete(analysis.id, e)}
                      disabled={deleting === analysis.id}
                      className="p-1.5 rounded-lg text-gray-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      {deleting === analysis.id
                        ? <Loader2 size={13} className="animate-spin text-red-400" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>

                  {/* Score arc + status + skill counts */}
                  <div className="flex items-center gap-4">
                    {isDone ? (
                      <ScoreArc score={score} status={status} />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <StatusIcon size={20} className={`${cfg.color} ${status === 'processing' ? 'animate-spin' : ''}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {/* Skill counts */}
                      {isDone && (
                        <div className="flex items-center gap-3 text-xs">
                          {matchingCount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 size={11} /> {matchingCount} match
                            </span>
                          )}
                          {missingCount > 0 && (
                            <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-medium">
                              <XCircle size={11} /> {missingCount} missing
                            </span>
                          )}
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
                      View Report <ChevronRight size={12} />
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
