'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  Users, Plus, Zap, Eye, EyeOff, CheckCircle2, XCircle,
  Bookmark, Trash2, UserPlus, ChevronRight, Loader2,
  Briefcase, Search, ArrowLeft, MoreHorizontal, Shield,
  TrendingUp, Clock, AlertCircle
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TalentPool {
  id: string
  name: string
  description?: string
  job_description_id?: string
  candidates_count?: number
  candidates?: PoolCandidate[]
}

interface PoolCandidate {
  cv_document_id: string
  status: 'pending' | 'shortlisted' | 'rejected' | 'backup'
  pool_specific_score?: number
}

interface JobDescription {
  id: string
  title: string
}

interface CVDocument {
  id: string
  original_filename: string
  processing_status: string
}

interface RevealedIdentity {
  PERSON?: string[]
  EMAIL?: string[]
  PHONE?: string[]
  [key: string]: string[] | undefined
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    shortlisted: { label: 'Shortlisted', className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' },
    rejected:    { label: 'Rejected',    className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' },
    backup:      { label: 'Backup',      className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
    pending:     { label: 'Pending',     className: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600' },
  }
  const cfg = map[status] || map.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ── Create Pool Modal ──────────────────────────────────────────────────────────
function CreatePoolModal({
  jds, onClose, onCreate
}: {
  jds: JobDescription[]
  onClose: () => void
  onCreate: (pool: TalentPool) => void
}) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [jdId, setJdId]   = useState('')
  const [busy, setBusy]   = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const pool = await apiClient.createTalentPool({
        name: name.trim(),
        description: desc.trim() || undefined,
        job_description_id: jdId || undefined,
      })
      onCreate(pool)
      toast.success(`Pool "${pool.name}" created`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create pool')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700"
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Talent Pool</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Organise candidates into a pipeline</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Pool Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Senior Engineers Q3"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Optional description..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Link Job Description</label>
            <select value={jdId} onChange={e => setJdId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
              <option value="">None (rank manually later)</option>
              {jds.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Pool
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Add Candidate Modal ────────────────────────────────────────────────────────
function AddCandidateModal({
  pool, availableCVs, onClose, onAdded
}: {
  pool: TalentPool
  availableCVs: CVDocument[]
  onClose: () => void
  onAdded: (updated: TalentPool) => void
}) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  const alreadyIn = new Set(pool.candidates?.map(c => c.cv_document_id) || [])
  const filtered = availableCVs
    .filter(cv => !alreadyIn.has(cv.id) && cv.processing_status === 'completed')
    .filter(cv => !search || cv.original_filename.toLowerCase().includes(search.toLowerCase()))

  const add = async (cvId: string) => {
    setAdding(cvId)
    try {
      await apiClient.addCandidateToPool(pool.id, cvId)
      const updated = await apiClient.getTalentPool(pool.id)
      onAdded(updated)
      toast.success('Candidate added to pool')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add candidate')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]"
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Candidate</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">to <span className="font-semibold text-slate-700 dark:text-slate-300">{pool.name}</span></p>
        </div>
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search CVs..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <Users size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No available CVs</p>
            </div>
          ) : filtered.map(cv => (
            <div key={cv.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                  <Briefcase size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{cv.original_filename}</span>
              </div>
              <button onClick={() => add(cv.id)} disabled={adding === cv.id}
                className="ml-3 shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {adding === cv.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Candidate Row ──────────────────────────────────────────────────────────────
function CandidateRow({
  candidate, poolId, revealed, revealing,
  onStatusChange, onReveal, onRemove
}: {
  candidate: PoolCandidate
  poolId: string
  revealed: RevealedIdentity | null
  revealing: boolean
  onStatusChange: (cvId: string, status: string) => void
  onReveal: (cvId: string) => void
  onRemove: (cvId: string) => void
}) {
  const cvId = candidate.cv_document_id
  const score = candidate.pool_specific_score
    ? Math.round(candidate.pool_specific_score * 100)
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Identity / ID */}
        <div className="flex-1 min-w-0">
          {revealed ? (
            <div className="space-y-0.5">
              {revealed.PERSON?.[0] && (
                <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-500 shrink-0" />
                  {revealed.PERSON[0]}
                </p>
              )}
              {revealed.EMAIL?.[0] && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{revealed.EMAIL[0]}</p>
              )}
              {revealed.PHONE?.[0] && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{revealed.PHONE[0]}</p>
              )}
            </div>
          ) : (
            <div>
              <p className="font-mono text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <EyeOff size={12} className="shrink-0" />
                {cvId.slice(0, 16)}…
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Identity masked</p>
            </div>
          )}
        </div>

        {/* Score */}
        {score !== null && (
          <div className={`shrink-0 px-2.5 py-1.5 rounded-lg text-center border ${
            score >= 80
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : score >= 60
              ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
              : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
          }`}>
            <div className="text-lg font-bold leading-none">{score}%</div>
            <div className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-70">Score</div>
          </div>
        )}

        {/* Status */}
        <StatusBadge status={candidate.status || 'pending'} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <button onClick={() => onStatusChange(cvId, 'shortlisted')}
          title="Shortlist"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            candidate.status === 'shortlisted'
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400'
          }`}>
          <CheckCircle2 size={12} /> Shortlist
        </button>
        <button onClick={() => onStatusChange(cvId, 'backup')}
          title="Backup"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            candidate.status === 'backup'
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400'
          }`}>
          <Bookmark size={12} /> Backup
        </button>
        <button onClick={() => onStatusChange(cvId, 'rejected')}
          title="Reject"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            candidate.status === 'rejected'
              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400'
          }`}>
          <XCircle size={12} /> Reject
        </button>

        <div className="flex-1" />

        {/* Reveal — only for shortlisted */}
        {candidate.status === 'shortlisted' && !revealed && (
          <button onClick={() => onReveal(cvId)} disabled={revealing}
            title="Reveal identity (logged)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-500/20 disabled:opacity-50 transition-colors">
            {revealing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            Reveal
          </button>
        )}

        <button onClick={() => onRemove(cvId)}
          title="Remove from pool"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────────
export function TalentPoolView() {
  const [pools, setPools]               = useState<TalentPool[]>([])
  const [selectedPool, setSelectedPool] = useState<TalentPool | null>(null)
  const [jds, setJds]                   = useState<JobDescription[]>([])
  const [availableCVs, setAvailableCVs] = useState<CVDocument[]>([])
  const [loading, setLoading]           = useState(true)
  const [ranking, setRanking]           = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddModal, setShowAddModal]       = useState(false)
  const [revealedMap, setRevealedMap]   = useState<Record<string, RevealedIdentity>>({})
  const [revealingId, setRevealingId]   = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    Promise.all([
      apiClient.listTalentPools(),
      apiClient.getJobDescriptions({ limit: 100 }),
      apiClient.getDocuments({ limit: 100 }),
    ]).then(([poolsData, jdsData, docsData]) => {
      setPools(poolsData)
      setJds(jdsData.items || [])
      setAvailableCVs(docsData.documents || [])
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const selectPool = async (pool: TalentPool) => {
    try {
      const detail = await apiClient.getTalentPool(pool.id)
      setSelectedPool(detail)
    } catch {
      toast.error('Failed to load pool details')
    }
  }

  const handleStatusChange = async (cvId: string, status: string) => {
    if (!selectedPool) return
    setStatusUpdating(cvId)
    try {
      await apiClient.updateCandidateStatus(selectedPool.id, cvId, status)
      const updated = await apiClient.getTalentPool(selectedPool.id)
      setSelectedPool(updated)
      toast.success(`Candidate ${status}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    } finally {
      setStatusUpdating(null)
    }
  }

  const refreshPoolInList = (updated: TalentPool) => {
    setSelectedPool(updated)
    setPools(prev => prev.map(p =>
      p.id === updated.id
        ? { ...p, candidates_count: updated.candidates?.length ?? p.candidates_count }
        : p
    ))
  }

  const handleReveal = async (cvId: string) => {
    setRevealingId(cvId)
    try {
      const res = await apiClient.revealCandidateIdentity(cvId)
      setRevealedMap(prev => ({ ...prev, [cvId]: res.identity }))
      toast.success('Identity revealed — logged in audit trail')
    } catch (err: any) {
      toast.error(err.message || 'Cannot reveal — shortlist this candidate first')
    } finally {
      setRevealingId(null)
    }
  }

  const handleRemove = async (cvId: string) => {
    if (!selectedPool) return
    if (!confirm('Remove this candidate from the pool?')) return
    try {
      await apiClient.removeCandidateFromPool(selectedPool.id, cvId)
      const updated = await apiClient.getTalentPool(selectedPool.id)
      refreshPoolInList(updated)
      toast.success('Candidate removed')
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove candidate')
    }
  }

  const handleRankAll = async () => {
    if (!selectedPool?.job_description_id) {
      toast.error('Link a Job Description to this pool first')
      return
    }
    setRanking(true)
    try {
      await apiClient.batchRankCandidates(selectedPool.id, selectedPool.job_description_id)
      const updated = await apiClient.getTalentPool(selectedPool.id)
      setSelectedPool(updated)
      toast.success('Candidates ranked successfully')
    } catch (err: any) {
      toast.error(err.message || 'Ranking failed')
    } finally {
      setRanking(false)
    }
  }

  const candidates = selectedPool?.candidates || []
  const shortlisted = candidates.filter(c => c.status === 'shortlisted').length
  const pending     = candidates.filter(c => c.status === 'pending' || !c.status).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Talent Pools</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organise and manage your candidate pipelines
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all">
          <Plus size={16} /> New Pool
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pool List — left column */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-3">
          {pools.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No pools yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first talent pool to start organising candidates</p>
              <button onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                Create Pool
              </button>
            </div>
          ) : pools.map((pool, i) => (
            <motion.button key={pool.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => selectPool(pool)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedPool?.id === pool.id
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedPool?.id === pool.id
                      ? 'bg-blue-100 dark:bg-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <Users size={16} className={selectedPool?.id === pool.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{pool.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {pool.candidates_count ?? 0} candidates
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className={`shrink-0 transition-colors ${
                  selectedPool?.id === pool.id ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'
                }`} />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Pool Detail — right columns */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2">
          {!selectedPool ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Briefcase size={28} className="text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Select a pool</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose a talent pool from the left to view and manage candidates</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              {/* Pool Header */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPool.name}</h2>
                    {selectedPool.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedPool.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users size={12} /> {candidates.length} total
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {shortlisted} shortlisted
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {pending} pending
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                      <UserPlus size={15} /> Add
                    </button>
                    <button onClick={handleRankAll} disabled={ranking || !selectedPool.job_description_id}
                      title={!selectedPool.job_description_id ? 'Link a JD to this pool first' : 'Rank all candidates'}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {ranking ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                      Rank All
                    </button>
                  </div>
                </div>
                {!selectedPool.job_description_id && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No Job Description linked. Ranking requires a JD. Create a new pool with a JD to enable ranking.
                    </p>
                  </div>
                )}
              </div>

              {/* Candidates */}
              <div className="p-5">
                {candidates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                      <UserPlus size={20} className="text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">No candidates yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add CVs to this pool to start screening</p>
                    <button onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                      Add Candidates
                    </button>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {candidates.map(c => (
                        <CandidateRow
                          key={c.cv_document_id}
                          candidate={c}
                          poolId={selectedPool.id}
                          revealed={revealedMap[c.cv_document_id] || null}
                          revealing={revealingId === c.cv_document_id}
                          onStatusChange={handleStatusChange}
                          onReveal={handleReveal}
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePoolModal
            jds={jds}
            onClose={() => setShowCreateModal(false)}
            onCreate={pool => setPools(prev => [pool, ...prev])}
          />
        )}
        {showAddModal && selectedPool && (
          <AddCandidateModal
            pool={selectedPool}
            availableCVs={availableCVs}
            onClose={() => setShowAddModal(false)}
            onAdded={updated => refreshPoolInList(updated)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
