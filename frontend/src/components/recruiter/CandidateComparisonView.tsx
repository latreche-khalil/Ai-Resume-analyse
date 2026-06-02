'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, TrendingUp,
  Award, Brain, Target, Users, Loader2, Search
} from 'lucide-react'
import Link from 'next/link'

interface ComparisonCandidate {
  id: string
  cv_document_id: string
  name: string
  match_score: number          // always 0-100 after normalization
  matching_skills: string[]
  missing_skills: string[]
  transferable_skills: string[]
  experience_level: string
  red_flags: string[]
  confidence_score: number     // 0-1
}

// ── Score helpers ──────────────────────────────────────────────────────────────
/** Normalize any score to 0-100 */
const norm = (v: number) => v <= 1 ? Math.round(v * 100) : Math.round(v)

function scoreStyle(score: number): string {
  if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
  if (score >= 60) return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
  return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
}

function scoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-blue-600 dark:text-blue-400'
  return 'text-amber-600 dark:text-amber-400'
}

// ── Selection View ─────────────────────────────────────────────────────────────
export function CandidateComparisonView() {
  const [candidates, setCandidates]   = useState<ComparisonCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparing, setComparing]     = useState<ComparisonCandidate[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')

  useEffect(() => { loadCandidates() }, [])

  const loadCandidates = async () => {
    try {
      const { analyses } = await apiClient.listAnalyses({ limit: 100 })
      const withScore = analyses.filter((a: any) => a.match_score != null && a.analysis_status === 'completed')

      // Enrich top 30 with full details (cv filename + skills)
      const top30 = withScore
        .sort((a: any, b: any) => norm(b.match_score) - norm(a.match_score))
        .slice(0, 30)

      const enriched = await Promise.all(
        top30.map(async (a: any) => {
          try {
            const [full, doc] = await Promise.all([
              apiClient.getAnalysis(a.id),
              apiClient.getDocument(a.cv_document_id).catch(() => null),
            ])
            return {
              id: a.id,
              cv_document_id: a.cv_document_id,
              name: doc?.original_filename || `CV-${a.cv_document_id.slice(0, 8)}`,
              match_score: norm(full.match_score ?? a.match_score ?? 0),
              matching_skills: full.matching_skills || [],
              missing_skills: full.missing_skills || [],
              transferable_skills: full.transferable_skills || [],
              experience_level: (full as any).experience_level || 'N/A',
              red_flags: full.red_flags || [],
              confidence_score: full.confidence_score ?? 0.8,
            } as ComparisonCandidate
          } catch {
            return {
              id: a.id,
              cv_document_id: a.cv_document_id,
              name: `CV-${a.cv_document_id.slice(0, 8)}`,
              match_score: norm(a.match_score ?? 0),
              matching_skills: [],
              missing_skills: [],
              transferable_skills: [],
              experience_level: 'N/A',
              red_flags: [],
              confidence_score: 0,
            } as ComparisonCandidate
          }
        })
      )
      setCandidates(enriched)
    } catch (err) {
      console.error('Failed to load candidates:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(p => p.filter(i => i !== id))
    } else if (selectedIds.length < 3) {
      setSelectedIds(p => [...p, id])
    }
  }

  const filtered = candidates.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.matching_skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  if (comparing.length > 0) {
    return <ComparisonTable candidates={comparing} onBack={() => { setComparing([]); setSelectedIds([]) }} />
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Compare Candidates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select 2–3 candidates to compare side-by-side</p>
        </div>
        <Link href="/recruiter">
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </Link>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename or skill..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
      </div>

      {/* Selection bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                {selectedIds.length} of 3 selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Clear
              </button>
              <button onClick={() => setComparing(candidates.filter(c => selectedIds.includes(c.id)))}
                disabled={selectedIds.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Compare Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Users size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-900 dark:text-white mb-1">
            {search ? 'No results found' : 'No completed analyses yet'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {search ? `No candidates match "${search}"` : 'Run analyses first to compare candidates'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const isSelected = selectedIds.includes(c.id)
            const disabled   = !isSelected && selectedIds.length >= 3
            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                whileHover={disabled ? {} : { scale: 1.02 }}
                onClick={() => !disabled && toggle(c.id)}
                className={`relative bg-white dark:bg-slate-800 border-2 rounded-xl p-5 transition-all ${
                  disabled ? 'opacity-40 cursor-not-allowed' :
                  isSelected ? 'border-blue-500 shadow-lg shadow-blue-500/20 cursor-pointer' :
                  'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
                }`}>

                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                )}

                {/* Score badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-3 ${scoreStyle(c.match_score)}`}>
                  <span className="text-xl font-bold">{c.match_score}%</span>
                  <span className="text-xs font-semibold text-slate-500">Match</span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate text-sm">{c.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{c.experience_level}</p>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> {c.matching_skills.length} matching skills
                  </div>
                  {c.missing_skills.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle size={11} /> {c.missing_skills.length} skill gaps
                    </div>
                  )}
                  {c.red_flags.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <XCircle size={11} /> {c.red_flags.length} red flags
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Comparison Table ───────────────────────────────────────────────────────────
function ComparisonTable({ candidates, onBack }: { candidates: ComparisonCandidate[]; onBack: () => void }) {
  const best = candidates.reduce((p, c) => c.match_score > p.match_score ? c : p)

  const rows: { label: string; icon: React.ElementType; values: (c: ComparisonCandidate) => { value: string; sub?: string; good: boolean | null } }[] = [
    {
      label: 'Overall Match', icon: Target,
      values: c => ({ value: `${c.match_score}%`, good: c.match_score >= 70 })
    },
    {
      label: 'Matching Skills', icon: CheckCircle2,
      values: c => ({ value: String(c.matching_skills.length), sub: c.matching_skills.slice(0, 3).join(', ') || '—', good: c.matching_skills.length > 0 })
    },
    {
      label: 'Skill Gaps', icon: AlertCircle,
      values: c => ({ value: String(c.missing_skills.length), sub: c.missing_skills.slice(0, 3).join(', ') || 'None', good: c.missing_skills.length === 0 })
    },
    {
      label: 'Experience', icon: TrendingUp,
      values: c => ({ value: c.experience_level, good: null })
    },
    {
      label: 'Red Flags', icon: XCircle,
      values: c => ({ value: String(c.red_flags.length), sub: c.red_flags.slice(0, 2).join(', ') || 'None', good: c.red_flags.length === 0 })
    },
    {
      label: 'AI Confidence', icon: Brain,
      values: c => ({ value: `${Math.round(c.confidence_score * 100)}%`, good: c.confidence_score >= 0.7 })
    },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Candidate Comparison</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Side-by-side analysis of {candidates.length} candidates</p>
        </div>
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
          <ArrowLeft size={16} /> Back to Selection
        </button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                  Criteria
                </th>
                {candidates.map((c, i) => (
                  <th key={i} className="px-6 py-4 text-center border-l border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 truncate max-w-[160px] mx-auto" title={c.name}>
                      {c.name}
                    </div>
                    <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${scoreStyle(c.match_score)}`}>
                      {c.match_score}%
                    </div>
                    {c.id === best.id && (
                      <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <Award size={11} /> Best Match
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {rows.map(row => (
                <tr key={row.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <row.icon size={15} className="text-slate-400 shrink-0" />
                      {row.label}
                    </div>
                  </td>
                  {candidates.map((c, i) => {
                    const { value, sub, good } = row.values(c)
                    const textColor = good === null
                      ? 'text-slate-900 dark:text-white'
                      : good
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500 dark:text-red-400'
                    return (
                      <td key={i} className="px-6 py-4 text-center border-l border-slate-100 dark:border-slate-700/50">
                        <div className={`font-bold text-base ${textColor}`}>{value}</div>
                        {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[140px] mx-auto">{sub}</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* AI Recommendation */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Brain size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">AI Recommendation</h3>
            <p className="text-blue-50 leading-relaxed text-sm">
              Based on the analysis,{' '}
              <span className="font-bold text-white">{best.name}</span>{' '}
              is the strongest candidate with a {best.match_score}% match score and{' '}
              {best.matching_skills.length} matching skills.{' '}
              {best.red_flags.length === 0
                ? 'No red flags detected — recommended for interview.'
                : `Note ${best.red_flags.length} potential concern(s) to review before proceeding.`}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
