'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  FileText, Briefcase, CheckCircle2, ArrowLeft, ArrowRight,
  Zap, Loader2, Users, Target, Search, Award, AlertCircle,
  BarChart3, X, Clock, History, Plus, TrendingUp
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CVDoc { id: string; original_filename: string; processing_status: string; created_at: string }
interface JD    { id: string; title: string; company?: string }
interface RankedCandidate {
  rank: number; cv_id: string; filename: string
  composite_score: number; rank_category: string
  scores_breakdown: Record<string, number>
  matching_skills: string[]; missing_skills: string[]
  red_flags?: string[]; recommendation: string
  summary?: string; confidence?: string
  // new recruiter intelligence fields
  evidence_for_hire?: string[]
  evidence_against_hire?: string[]
  interview_questions?: string[]
  hiring_recommendation?: string
  seniority_alignment?: { cv_level: string; jd_level: string; match: string; explanation: string }
  hiring_urgency?: string
}
interface HistoryEntry {
  id: string; jd_title: string; jd_id: string
  cv_count: number; best_candidate: string; best_score: number
  created_at: string; result: any
}
type Step = 'select-cvs' | 'select-jd' | 'ranking' | 'results'
type Tab  = 'new' | 'history'

// ── Helpers ────────────────────────────────────────────────────────────────────
const scorePct = (v = 0) => Math.round(v <= 1 ? v * 100 : v)

function scoreStyle(pct: number) {
  if (pct >= 80) return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
  if (pct >= 60) return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
  return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
}

function rankStyle(rank: number) {
  if (rank === 1) return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
  if (rank === 2) return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
  if (rank === 3) return 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
  return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
}

function recStyle(rec: string) {
  if (rec === 'shortlist') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
  if (rec === 'interview')  return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
  if (rec === 'reject')     return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
  return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
}

const HISTORY_KEY = 'recruiter_analysis_history'
const loadHistory  = (): HistoryEntry[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
const saveHistory  = (e: HistoryEntry[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(e.slice(0, 20))) } catch {} }

// ── Add to Pool Modal ──────────────────────────────────────────────────────────
function AddToPoolModal({ candidate, onClose }: {
  candidate: RankedCandidate
  onClose: () => void
}) {
  const [pools, setPools]         = useState<any[]>([])
  const [selectedPool, setPool]   = useState('')
  const [status, setStatus]       = useState<'shortlisted' | 'backup'>('shortlisted')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    apiClient.listTalentPools()
      .then(setPools)
      .catch(() => toast.error('Failed to load pools'))
      .finally(() => setLoading(false))
  }, [])

  const submit = async () => {
    if (!selectedPool) { toast.error('Select a pool first'); return }
    setSaving(true)
    try {
      await apiClient.addCandidateToPool(selectedPool, candidate.cv_id)
      await apiClient.updateCandidateStatus(selectedPool, candidate.cv_id, status)
      toast.success(`Added to pool as ${status}`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to pool')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6">
        <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">Add to Talent Pool</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 truncate">{candidate.filename}</p>

        {/* Pool selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Select Pool</label>
          {loading ? (
            <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
          ) : pools.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No pools yet — create one first</p>
          ) : (
            <select value={selectedPool} onChange={e => setPool(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <option value="">Choose pool...</option>
              {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Status selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
          <div className="flex gap-2">
            {(['shortlisted', 'backup'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                  status === s
                    ? s === 'shortlisted'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}>
                {s === 'shortlisted' ? '✓ Shortlist' : '~ Backup'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !selectedPool || loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add to Pool
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Collapsible Candidate Card ─────────────────────────────────────────────────
function CandidateCard({ c, onAddToPool }: { c: RankedCandidate; onAddToPool: (c: RankedCandidate) => void }) {
  const [expanded, setExpanded] = useState(false)
  const pct = scorePct(c.composite_score)

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      {/* ── Collapsed header (always visible) ── */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors select-none"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Rank */}
        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 font-black text-sm ${rankStyle(c.rank)}`}>
          #{c.rank}
        </div>

        {/* Name + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{c.filename}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${recStyle(c.recommendation)}`}>{c.recommendation}</span>
            {c.confidence && <span className="text-[10px] text-slate-400">{c.confidence} confidence</span>}
          </div>
          {c.summary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{c.summary}</p>
          )}
        </div>

        {/* Score + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-3 py-2 rounded-xl border text-center ${scoreStyle(pct)}`}>
            <div className="text-lg font-black leading-none">{pct}%</div>
            <div className="text-[8px] uppercase font-bold tracking-wide mt-0.5 opacity-60">{c.rank_category}</div>
          </div>
          <div className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Score bars */}
            <div className="px-5 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-dashed border-slate-200 dark:border-slate-700">
              {([
                ['Skills',     c.scores_breakdown?.skills_match,       '#3b82f6', 'bg-blue-50 dark:bg-blue-500/10'],
                ['Semantic',   c.scores_breakdown?.semantic_similarity, '#8b5cf6', 'bg-violet-50 dark:bg-violet-500/10'],
                ['Experience', c.scores_breakdown?.experience_level,    '#10b981', 'bg-emerald-50 dark:bg-emerald-500/10'],
                ['Culture',    c.scores_breakdown?.cultural_fit,        '#f59e0b', 'bg-amber-50 dark:bg-amber-500/10'],
              ] as [string, number, string, string][]).map(([label, val, color, bg]) => (
                <div key={label} className={`${bg} rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/60 mt-3`}>
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                    <span className="font-black text-slate-800 dark:text-white text-sm">{scorePct(val)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/70 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${scorePct(val)}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="px-5 pb-4 grid sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              {c.matching_skills.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl p-3 border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">✓ Matching ({c.matching_skills.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {c.matching_skills.slice(0, 8).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-white dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-semibold border border-emerald-300 dark:border-emerald-500/30">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {c.missing_skills.length > 0 && (
                <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-3 border border-red-200 dark:border-red-500/20">
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">✗ Missing ({c.missing_skills.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {c.missing_skills.slice(0, 8).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-white dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-md text-[10px] font-semibold border border-red-300 dark:border-red-500/30">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Red flags */}
            {c.red_flags && c.red_flags.length > 0 && (
              <div className="px-5 pb-4 flex flex-wrap gap-1.5 border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                {c.red_flags.slice(0, 4).map(f => (
                  <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-lg text-[10px] font-semibold border border-orange-200 dark:border-orange-500/20">⚠ {f}</span>
                ))}
              </div>
            )}

            {/* Hiring Recommendation */}
            {c.hiring_recommendation && (
              <div className="mx-5 mb-4 p-4 bg-blue-600 rounded-xl border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-100 mb-1.5">🎯 Hiring Manager Recommendation</p>
                <p className="text-sm text-white leading-relaxed">{c.hiring_recommendation}</p>
              </div>
            )}

            {/* Evidence grid */}
            {(c.evidence_for_hire?.length || c.evidence_against_hire?.length) && (
              <div className="px-5 pb-4 grid sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                {c.evidence_for_hire && c.evidence_for_hire.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block shrink-0" /> Evidence For Hire
                    </p>
                    <ul className="space-y-1.5">
                      {c.evidence_for_hire.map((e, i) => (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">+</span>{e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.evidence_against_hire && c.evidence_against_hire.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block shrink-0" /> Concerns
                    </p>
                    <ul className="space-y-1.5">
                      {c.evidence_against_hire.map((e, i) => (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-red-500 font-bold shrink-0 mt-0.5">−</span>{e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Seniority */}
            {c.seniority_alignment && c.seniority_alignment.cv_level !== 'unknown' && (
              <div className="px-5 pb-4 border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Seniority:</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.seniority_alignment.cv_level}</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  c.seniority_alignment.match === 'matched'       ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30' :
                  c.seniority_alignment.match === 'overqualified' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30' :
                  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
                }`}>{c.seniority_alignment.match}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">vs {c.seniority_alignment.jd_level}</span>
                {c.seniority_alignment.explanation && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{c.seniority_alignment.explanation}</span>
                )}
              </div>
            )}

            {/* Interview questions */}
            {c.interview_questions && c.interview_questions.length > 0 && (
              <div className="px-5 pb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2.5">💬 Suggested Interview Questions</p>
                <ol className="space-y-2">
                  {c.interview_questions.map((q, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</span>{q}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action bar */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <button onClick={() => onAddToPool(c)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-emerald-500/20">
                <Plus size={13} /> Add to Talent Pool
              </button>
              {c.hiring_urgency && c.hiring_urgency !== 'medium' && (
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${
                  c.hiring_urgency === 'high'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                }`}>
                  {c.hiring_urgency === 'high' ? '🔥 High Priority' : '↓ Low Priority'}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Leaderboard ────────────────────────────────────────────────────────────────
function Leaderboard({ result, jdTitle, onNew }: { result: any; jdTitle?: string; onNew?: () => void }) {
  const lb: RankedCandidate[] = result?.leaderboard || []
  const stats = result?.statistics || {}
  const [addingTo, setAddingTo] = useState<RankedCandidate | null>(null)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Award size={22} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{jdTitle ? `Results — ${jdTitle}` : 'Ranking Complete'}</h3>
            <p className="text-blue-50 text-sm">{result.comparison?.recommendation || `Ranked ${lb.length} candidates.`}</p>
            <div className="flex flex-wrap gap-5 mt-3">
              <div><div className="text-2xl font-bold">{lb.length}</div><div className="text-[10px] uppercase text-blue-200">Ranked</div></div>
              {stats.average_score != null && (
                <div><div className="text-2xl font-bold">{scorePct(stats.average_score)}%</div><div className="text-[10px] uppercase text-blue-200">Avg Score</div></div>
              )}
              {result.comparison?.best_candidate_name && (
                <div><div className="text-sm font-bold truncate max-w-[180px]">{result.comparison.best_candidate_name}</div><div className="text-[10px] uppercase text-blue-200">Best Match</div></div>
              )}
            </div>
          </div>
          {onNew && (
            <button onClick={onNew} className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={14} /> New
            </button>
          )}
        </div>
      </div>

      {/* Shared strengths / gaps */}
      {(result.comparison?.shared_strengths?.length > 0 || result.comparison?.common_gaps?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {result.comparison?.shared_strengths?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Shared Strengths</p>
              <div className="flex flex-wrap gap-1">
                {result.comparison.shared_strengths.slice(0, 8).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md text-[10px] font-medium border border-emerald-200 dark:border-emerald-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
          {result.comparison?.common_gaps?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">Common Gaps</p>
              <div className="flex flex-wrap gap-1">
                {result.comparison.common_gaps.slice(0, 8).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-medium border border-amber-200 dark:border-amber-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 size={18} className="text-blue-500" /> Candidate Leaderboard</h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{lb.length} candidate{lb.length !== 1 ? 's' : ''}</span>
        </div>
        <div>
          {lb.map(c => <CandidateCard key={c.cv_id} c={c} onAddToPool={setAddingTo} />)}
        </div>
      </div>

      {/* Add to Pool Modal */}
      <AnimatePresence>
        {addingTo && (
          <AddToPoolModal candidate={addingTo} onClose={() => setAddingTo(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── History Tab ────────────────────────────────────────────────────────────────
function HistoryTab({ history, onView, onDelete, onClearAll }: {
  history: HistoryEntry[]
  onView: (e: HistoryEntry) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}) {
  if (history.length === 0) return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4"><History size={24} className="text-slate-400" /></div>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No analysis history yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Run your first batch analysis to see results here</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {/* Header with Clear All */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{history.length} saved analysis{history.length !== 1 ? 'es' : ''}</p>
        <button
          onClick={() => { if (confirm('Clear all history? This cannot be undone.')) onClearAll() }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <X size={12} /> Clear All
        </button>
      </div>

      {history.map((entry, i) => {
        const pct = scorePct(entry.best_score)
        return (
          <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ delay: i * 0.04 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
              {/* Clickable area */}
              <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => onView(entry)}>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{entry.jd_title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {entry.cv_count} candidates · Best: <span className="font-medium text-slate-700 dark:text-slate-300">{entry.best_candidate}</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={10} />{new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Score + delete */}
              <div className="flex items-center gap-2 shrink-0">
                <div className={`px-3 py-1.5 rounded-lg border text-center cursor-pointer ${scoreStyle(pct)}`} onClick={() => onView(entry)}>
                  <div className="text-lg font-bold leading-none">{pct}%</div>
                  <div className="text-[9px] uppercase font-semibold tracking-wide opacity-70">Top</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
                  className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete this entry"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function RecruiterAnalysisView() {
  const router = useRouter()
  const [cvDocs, setCvDocs]           = useState<CVDoc[]>([])
  const [jds, setJds]                 = useState<JD[]>([])
  const dataLoaded = useRef(false)   // prevent double-fetch on StrictMode re-mount
  const [selectedCVs, setSelectedCVs] = useState<Set<string>>(new Set())
  const [selectedJD, setSelectedJD]   = useState('')
  const [step, setStep]               = useState<Step>('select-cvs')
  const [ranking, setRanking]         = useState(false)
  const [result, setResult]           = useState<any>(null)
  const [cvSearch, setCvSearch]       = useState('')
  const [jdSearch, setJdSearch]       = useState('')
  const [activeTab, setActiveTab]     = useState<Tab>('new')
  const [history, setHistory]         = useState<HistoryEntry[]>([])
  const [viewing, setViewing]         = useState<HistoryEntry | null>(null)

  useEffect(() => {
    if (dataLoaded.current) return
    dataLoaded.current = true
    setHistory(loadHistory())
    ;(async () => {
      try {
        const [p1, p2, jdsRes] = await Promise.all([
          apiClient.getDocuments({ limit: 100, skip: 0 }),
          apiClient.getDocuments({ limit: 100, skip: 100 }),
          apiClient.getJobDescriptions({ limit: 100 }),
        ])
        setCvDocs([...(p1.documents || []), ...(p2.documents || [])].filter((d: CVDoc) => d.processing_status === 'completed'))
        setJds(jdsRes.items || [])
      } catch { toast.error('Failed to load data') }
    })()
  }, [])

  const toggleCV = (id: string) => setSelectedCVs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleRank = async () => {
    if (!selectedCVs.size || !selectedJD) return
    setStep('ranking'); setRanking(true)
    try {
      const res = await apiClient.batchRankUploadedCandidates(Array.from(selectedCVs), selectedJD)
      setResult(res); setStep('results')
      const jdObj = jds.find(j => j.id === selectedJD)
      const lb = res?.leaderboard || []
      const best = lb[0]
      const entry: HistoryEntry = {
        id: `${Date.now()}`, jd_title: jdObj?.title || 'Unknown JD', jd_id: selectedJD,
        cv_count: lb.length, best_candidate: best?.filename || '—',
        best_score: best?.composite_score || 0, created_at: new Date().toISOString(), result: res,
      }
      const updated = [entry, ...history]
      setHistory(updated); saveHistory(updated)
    } catch (err: any) {
      toast.error(err.message || 'Ranking failed'); setStep('select-jd')
    } finally { setRanking(false) }
  }

  const deleteEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id)
    setHistory(updated)
    saveHistory(updated)
    if (viewing?.id === id) setViewing(null)
    toast.success('Entry deleted')
  }

  const clearAll = () => {
    setHistory([])
    saveHistory([])
    setViewing(null)
    toast.success('History cleared')
  }

  const reset = () => { setStep('select-cvs'); setResult(null); setSelectedCVs(new Set()); setSelectedJD(''); setViewing(null) }
  const filteredCVs = cvDocs.filter(c => !cvSearch || c.original_filename.toLowerCase().includes(cvSearch.toLowerCase()))
  const filteredJDs = jds.filter(j => !jdSearch || j.title.toLowerCase().includes(jdSearch.toLowerCase()) || (j.company || '').toLowerCase().includes(jdSearch.toLowerCase()))
  const selectedJDObj = jds.find(j => j.id === selectedJD)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button onClick={() => router.push('/recruiter')} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Batch Analysis</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Rank multiple CVs against one job description</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 w-fit">
        {([
          { id: 'new'     as Tab, label: 'New Analysis', icon: Zap     },
          { id: 'history' as Tab, label: `History${history.length > 0 ? ` (${history.length})` : ''}`, icon: History },
        ]).map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setViewing(null) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* History list */}
        {activeTab === 'history' && !viewing && (
          <motion.div key="hist-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <HistoryTab history={history} onView={setViewing} onDelete={deleteEntry} onClearAll={clearAll} />
          </motion.div>
        )}

        {/* History detail */}
        {activeTab === 'history' && viewing && (
          <motion.div key="hist-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setViewing(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={15} /> Back to History
            </button>
            <Leaderboard result={viewing.result} jdTitle={viewing.jd_title} onNew={() => { setActiveTab('new'); reset() }} />
          </motion.div>
        )}

        {/* New analysis */}
        {activeTab === 'new' && (
          <motion.div key="new" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Stepper */}
            {step !== 'ranking' && step !== 'results' && (
              <div className="flex items-center gap-2">
                {(['select-cvs', 'select-jd'] as const).map((s, i) => {
                  const labels = ['Select CVs', 'Select JD']
                  const icons  = [Users, Target]
                  const Icon   = icons[i]
                  const active = step === s
                  const done   = s === 'select-cvs' && step === 'select-jd'
                  return (
                    <div key={s} className="flex items-center gap-2">
                      {i > 0 && <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${done ? 'text-emerald-600 dark:text-emerald-400' : active ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-400 dark:text-slate-500'}`}>
                        {done ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                        {labels[i]}
                        {s === 'select-cvs' && selectedCVs.size > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{selectedCVs.size}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Step 1 */}
            {step === 'select-cvs' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Select CVs to Analyze</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedCVs.size > 0 ? `${selectedCVs.size} selected` : 'Choose one or more CVs'}</p>
                    </div>
                    {selectedCVs.size > 0 && (
                      <button onClick={() => setSelectedCVs(new Set())} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"><X size={12} /> Clear</button>
                    )}
                  </div>
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={cvSearch} onChange={e => setCvSearch(e.target.value)} placeholder="Search CVs..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredCVs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400"><FileText size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No completed CVs found</p></div>
                    ) : filteredCVs.map(cv => {
                      const sel = selectedCVs.has(cv.id)
                      return (
                        <div key={cv.id} onClick={() => toggleCV(cv.id)}
                          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${sel ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {sel && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{cv.original_filename}</p>
                            <p className="text-xs text-slate-400">{new Date(cv.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setStep('select-jd')} disabled={selectedCVs.size === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20">
                    Next: Select Job <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 'select-jd' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-900 dark:text-white">Select Job Description</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rank {selectedCVs.size} CV{selectedCVs.size > 1 ? 's' : ''} against this role</p>
                  </div>
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={jdSearch} onChange={e => setJdSearch(e.target.value)} placeholder="Search job descriptions..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredJDs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400"><Briefcase size={24} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No job descriptions found</p></div>
                    ) : filteredJDs.map(jd => {
                      const sel = selectedJD === jd.id
                      return (
                        <div key={jd.id} onClick={() => setSelectedJD(jd.id)}
                          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${sel ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                            {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Briefcase size={14} className="text-slate-500 dark:text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{jd.title}</p>
                            {jd.company && <p className="text-xs text-slate-400">{jd.company}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep('select-cvs')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button onClick={handleRank} disabled={!selectedJD}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20">
                    <Zap size={15} /> Rank {selectedCVs.size} Candidates
                  </button>
                </div>
              </div>
            )}

            {/* Ranking spinner */}
            {step === 'ranking' && (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-500/30 flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Zap size={18} className="text-white" />
                  </motion.div>
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ranking Candidates...</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Analyzing {selectedCVs.size} CVs against <span className="font-semibold">{selectedJDObj?.title}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Results */}
            {step === 'results' && result && (
              <Leaderboard result={result} jdTitle={selectedJDObj?.title} onNew={reset} />
            )}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
