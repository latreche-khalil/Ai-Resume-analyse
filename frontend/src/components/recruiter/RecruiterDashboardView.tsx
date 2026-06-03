'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import {
  Users, Target, Filter, Search,
  Sparkles, Clock, Award, AlertCircle, CheckCircle2,
  ArrowRight, Brain, Zap, BarChart3, Upload, RefreshCw,
  Briefcase, TrendingUp, X
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AnalysisItem {
  id: string
  cv_document_id: string
  job_description_id: string | null
  match_score: number | null
  analysis_status: string
  created_at: string
  job_title?: string
  // enriched
  cv_filename?: string
  matching_skills?: string[]
  missing_skills?: string[]
  requires_human_review?: boolean
  // from batch ranking
  rank_category?: string
  recommendation?: string
  confidence?: string
  summary?: string
  red_flags?: string[]
  scores_breakdown?: Record<string, number>
  isBatchResult?: boolean
}

interface Stats {
  totalCandidates: number
  avgMatchScore: number
  topMatches: number
  pendingReviews: number
  totalCvs: number
  totalJds: number
  poolCount: number
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, loading = false, trend, color }: {
  label: string
  value: string | number
  icon: React.ElementType
  loading?: boolean
  trend?: { value: string; up: boolean }
  color: string
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}</span>
              {trend && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  trend.up
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                    : 'text-slate-500 bg-slate-100 dark:bg-slate-700'
                }`}>
                  {trend.value}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={20} style={{ color }} strokeWidth={2.5} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Candidate Detail Modal ─────────────────────────────────────────────────────
function CandidateDetailModal({ candidate, onClose }: { candidate: AnalysisItem; onClose: () => void }) {
  const score = candidate.match_score || 0
  const displayScore = score <= 1 ? Math.round(score * 100) : Math.round(score)
  const scoreColor = displayScore >= 80 ? 'emerald' : displayScore >= 60 ? 'blue' : 'amber'

  const scorePct = (v = 0) => Math.round(v <= 1 ? v * 100 : v)

  const recStyle = (rec: string) => {
    if (rec === 'shortlist') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
    if (rec === 'interview') return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
    if (rec === 'reject')    return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-slate-900 dark:text-white truncate">
              {candidate.cv_filename || `CV-${candidate.cv_document_id.slice(0, 8)}`}
            </h2>
            {candidate.job_title && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{candidate.job_title}</p>
            )}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Score + recommendation */}
          <div className="flex items-center gap-4">
            <div className={`px-5 py-4 rounded-2xl border text-center ${
              displayScore >= 80
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : displayScore >= 60
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}>
              <div className="text-4xl font-black leading-none">{displayScore}%</div>
              <div className="text-[10px] uppercase font-bold tracking-wide mt-1 opacity-70">
                {candidate.rank_category || 'Match'}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {candidate.recommendation && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border capitalize ${recStyle(candidate.recommendation)}`}>
                  {candidate.recommendation}
                </span>
              )}
              {candidate.confidence && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.confidence} confidence</p>
              )}
              {candidate.summary && (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{candidate.summary}</p>
              )}
            </div>
          </div>

          {/* Score breakdown */}
          {candidate.scores_breakdown && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Score Breakdown</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ['Skills',     candidate.scores_breakdown.skills_match,       '#3b82f6'],
                  ['Semantic',   candidate.scores_breakdown.semantic_similarity, '#8b5cf6'],
                  ['Experience', candidate.scores_breakdown.experience_level,    '#10b981'],
                  ['Culture',    candidate.scores_breakdown.cultural_fit,        '#f59e0b'],
                ] as [string, number, string][]).map(([label, val, color]) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">{label}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{scorePct(val)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${scorePct(val)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          <div className="grid sm:grid-cols-2 gap-4">
            {(candidate.matching_skills || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                  ✓ Matching Skills ({candidate.matching_skills!.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.matching_skills!.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(candidate.missing_skills || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                  ✗ Missing Skills ({candidate.missing_skills!.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.missing_skills!.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium border border-amber-200 dark:border-amber-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Red flags */}
          {(candidate.red_flags || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">⚠ Red Flags</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.red_flags!.map(f => (
                  <span key={f} className="px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium border border-red-200 dark:border-red-500/20">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!candidate.isBatchResult && candidate.id !== candidate.cv_document_id && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <Link href={`/analysis/${candidate.id}`}>
                <button className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <BarChart3 size={15} /> View Full Analysis Report
                </button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Candidate Card ─────────────────────────────────────────────────────────────
function CandidateCard({ candidate, onClick }: { candidate: AnalysisItem; onClick: () => void }) {
  const score = candidate.match_score || 0
  // Normalize: backend may return 0-1 or 0-100
  const displayScore = score <= 1 ? Math.round(score * 100) : Math.round(score)

  // Use static classes instead of dynamic to ensure Tailwind includes them in build
  const scoreBadgeClass =
    displayScore >= 80
      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
      : displayScore >= 60
      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
      : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'

  const scoreTextClass =
    displayScore >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : displayScore >= 60
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-amber-600 dark:text-amber-400'

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-900 dark:text-white truncate text-sm">
            {candidate.cv_filename || `CV ${candidate.cv_document_id.slice(0, 8)}…`}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {candidate.job_title || 'No job title'}
          </p>
        </div>

        {/* Score Badge */}
        <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg shrink-0 border ${scoreBadgeClass}`}>
          <span className={`text-xl font-bold ${scoreTextClass}`}>
            {displayScore}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Match
          </span>
        </div>
      </div>

      {/* Matching Skills */}
      {candidate.matching_skills && candidate.matching_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.matching_skills.slice(0, 3).map((skill, i) => (
            <span key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-medium">
              <CheckCircle2 size={9} />{skill}
            </span>
          ))}
          {candidate.matching_skills.length > 3 && (
            <span className="text-[10px] text-slate-400">+{candidate.matching_skills.length - 3}</span>
          )}
        </div>
      )}

      {/* Missing Skills */}
      {candidate.missing_skills && candidate.missing_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.missing_skills.slice(0, 2).map((skill, i) => (
            <span key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-medium">
              <AlertCircle size={9} />{skill}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700 mt-1">
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock size={10} />
          {new Date(candidate.created_at).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          View Details <ArrowRight size={11} />
        </div>
      </div>
    </motion.div>
  )
}

export function RecruiterDashboardView() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalCandidates: 0, avgMatchScore: 0, topMatches: 0, pendingReviews: 0,
    totalCvs: 0, totalJds: 0, poolCount: 0,
  })
  const [topCandidates, setTopCandidates] = useState<AnalysisItem[]>([])
  const [allAnalyses, setAllAnalyses]     = useState<AnalysisItem[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<AnalysisItem | null>(null)
  const [talentPools, setTalentPools]     = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [pools, statsRes, batchHistory] = await Promise.all([
        apiClient.listTalentPools().catch(() => [] as any[]),
        apiClient.getRecruiterDashboardStats().catch(() => null),
        apiClient.listBatchRankingHistory().catch(() => [] as any[]),
      ])
      setTalentPools(pools)

      // Build candidate list from batch history leaderboard
      const batchCandidates: AnalysisItem[] = batchHistory.flatMap((entry: any) => {
        const resultObj = entry.result_data || entry.result
        return (resultObj?.leaderboard || []).map((c: any) => ({
          id: c.cv_id,
          cv_document_id: c.cv_id,
          job_description_id: entry.jd_id || null,
          match_score: c.composite_score,
          analysis_status: 'completed',
          created_at: entry.created_at,
          job_title: entry.jd_title,
          cv_filename: c.filename,
          matching_skills: c.matching_skills || [],
          missing_skills: c.missing_skills || [],
          requires_human_review: false,
          // batch-specific fields
          rank_category: c.rank_category,
          recommendation: c.recommendation,
          confidence: c.confidence,
          summary: c.summary,
          red_flags: c.red_flags || [],
          scores_breakdown: c.scores_breakdown,
          isBatchResult: true,
        }))
      })

      // Merge DB analyses + batch candidates, sort by score
      const dbAnalysesData: AnalysisItem[] = statsRes?.analyses || []
      const allData = [...batchCandidates, ...dbAnalysesData]

      const withScores = allData
        .filter(a => a.match_score != null && (a.analysis_status === 'completed' || a.analysis_status === 'partial_done'))
        .sort((a, b) => {
          const sa = (a.match_score! <= 1 ? a.match_score! * 100 : a.match_score!)
          const sb = (b.match_score! <= 1 ? b.match_score! * 100 : b.match_score!)
          return sb - sa
        })

      // Deduplicate by cv_id
      const seen = new Set<string>()
      const unique = withScores.filter(a => {
        if (seen.has(a.cv_document_id)) return false
        seen.add(a.cv_document_id)
        return true
      })

      const top6 = unique.slice(0, 6)

      // Enrich with filenames where missing
      const needsDoc = top6.filter(a => !a.cv_filename)
      const uniqueCvIds = [...new Set(needsDoc.map(a => a.cv_document_id))]
      const cvDocsMap: Record<string, any> = {}
      await Promise.all(
        uniqueCvIds.map(id =>
          apiClient.getDocument(id)
            .then(doc => { cvDocsMap[id] = doc })
            .catch(() => {})
        )
      )

      const enriched = top6.map(a => ({
        ...a,
        cv_filename: a.cv_filename || cvDocsMap[a.cv_document_id]?.original_filename || `CV-${a.cv_document_id.slice(0, 8)}`,
      }))

      setTopCandidates(enriched)
      setAllAnalyses(allData)

      // Stats: prefer batch data if DB has nothing
      const completed = unique
      const scores = completed.map(a => a.match_score! <= 1 ? a.match_score! * 100 : a.match_score!)
      const avg = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
      const topMatches = scores.filter(s => s >= 80).length

      // Count unique CVs across all sources
      const allCvIds = new Set(allData.map(a => a.cv_document_id))

      setStats({
        totalCandidates: completed.length > 0 ? completed.length : (statsRes?.total_analyses ?? 0),
        avgMatchScore:   avg > 0 ? avg : (statsRes?.avg_match_score ?? 0),
        topMatches:      topMatches > 0 ? topMatches : (statsRes?.top_matches ?? 0),
        pendingReviews:  statsRes?.pending_reviews ?? 0,
        totalCvs:        statsRes?.total_cvs ?? allCvIds.size,
        totalJds:        statsRes?.total_jds ?? 0,
        poolCount:       statsRes?.pool_count ?? pools.length,
      })

    } catch (e) {
      console.error('Failed to load recruiter data:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = topCandidates.filter(c =>
    !searchQuery ||
    (c.cv_filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.job_title   || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.matching_skills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const analyzedToday = allAnalyses.filter(c =>
    new Date(c.created_at).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Candidate Detail Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDetailModal
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Smart Recruiting Hub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Brain size={14} className="text-blue-500" /> AI-powered candidate screening and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="p-2.5 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link href="/compare-candidates">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <Target size={16} /> Compare
            </motion.button>
          </Link>
          <Link href="/talent-pool">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <Users size={16} /> Talent Pools
            </motion.button>
          </Link>
          <Link href="/upload">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all">
              <Upload size={16} /> Upload CVs
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Analyses"   value={stats.totalCandidates} icon={Users}      loading={loading} color="#3b82f6"
          trend={{ value: `${stats.totalCandidates} total`, up: stats.totalCandidates > 0 }} />
        <StatCard label="Avg Match Score"  value={`${stats.avgMatchScore}%`} icon={Target} loading={loading} color="#10b981"
          trend={{ value: stats.avgMatchScore >= 70 ? 'Good' : 'Fair', up: stats.avgMatchScore >= 70 }} />
        <StatCard label="Top Matches ≥80%" value={stats.topMatches}    icon={Award}        loading={loading} color="#f59e0b"
          trend={{ value: `${stats.topMatches} candidates`, up: stats.topMatches > 0 }} />
        <StatCard label="Pending Reviews"  value={stats.pendingReviews} icon={AlertCircle} loading={loading} color="#8b5cf6"
          trend={{ value: stats.pendingReviews > 0 ? 'Action needed' : 'All clear', up: false }} />
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Candidates - 2/3 width */}
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-500" />
                  Top Candidates
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI-ranked by match score and relevance
                </p>
              </div>
              <Link href="/talent-pool">
                <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
                  View All
                  <ArrowRight size={12} />
                </button>
              </Link>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by name or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Candidates List */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                  <Users size={28} className="text-slate-400" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {searchQuery ? 'No results found' : 'No candidates yet'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  {searchQuery
                    ? `No candidates match "${searchQuery}"`
                    : 'Upload CVs and run analysis to see candidates here'}
                </p>
                {!searchQuery && (
                  <Link href="/upload">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Upload CVs
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence>
                  {filtered.map((candidate, i) => (
                    <motion.div
                      key={candidate.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <CandidateCard
                        candidate={candidate}
                        onClick={() => setSelectedCandidate(candidate)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar - 1/3 width */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Brain size={20} />
              </div>
              <h3 className="font-bold text-lg">AI Insights</h3>
            </div>
            <p className="text-sm text-blue-50 mb-4 leading-relaxed">
              {stats.topMatches > 0
                ? `You have ${stats.topMatches} highly qualified candidate${stats.topMatches > 1 ? 's' : ''} with 80%+ match scores. Review them for priority interviews.`
                : stats.totalCandidates > 0
                  ? `${stats.totalCandidates} analysis${stats.totalCandidates > 1 ? 'es' : ''} completed with avg score of ${stats.avgMatchScore}%. Run more analyses to find top candidates.`
                  : 'Upload CVs and run batch analysis to get AI-powered candidate rankings.'}
            </p>
            <Link href="/talent-pool">
              <button className="w-full px-4 py-2.5 bg-white text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                <Zap size={16} />
                View Analysis
              </button>
            </Link>
          </div>

          {/* Talent Pools */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Filter size={16} className="text-slate-500" />
                Talent Pools
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Organized candidate pipelines
              </p>
            </div>
            <div className="p-4">
              {talentPools.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={24} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No pools yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {talentPools.slice(0, 4).map((pool: any) => (
                    <Link key={pool.id} href="/talent-pool">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {pool.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pool.candidates_count ?? pool.candidate_count ?? 0} candidates
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-slate-500" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Analyzed Today</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {analyzedToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Success Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalCandidates > 0 ? Math.round((stats.topMatches / stats.totalCandidates) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total CVs</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.totalCvs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Job Descriptions</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.totalJds}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Talent Pools</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.poolCount}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
