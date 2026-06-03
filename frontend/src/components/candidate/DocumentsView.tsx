'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import {
  FileText, Search, Trash2, BarChart3,
  Calendar, HardDrive, CheckCircle2, Clock,
  Plus, ChevronLeft, ChevronRight, Zap, Sparkles,
  LayoutGrid, List, Globe, FileUp, XCircle,
  X, TrendingUp, Building2, ChevronRight as ChevRight,
  History, Target
} from 'lucide-react'
import { toast } from 'sonner'

const R = { fontFamily: 'Roboto, sans-serif' }

interface CVDocument {
  id: string
  filename: string
  original_filename?: string
  status?: string
  processing_status?: string
  language?: string
  word_count?: number
  file_size_bytes?: number
  latest_analysis_id?: string
  match_score?: number
  created_at: string
}

function formatSize(bytes?: number) {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getExt(filename: string) {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toUpperCase() : 'PDF'
}

function getPreviewUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any; spin?: boolean }> = {
  analyzed:   { label: 'Analyzed',   color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',           icon: Sparkles     },
  completed:  { label: 'Ready',      color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',               icon: XCircle      },
  processing: { label: 'Processing', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',       icon: Clock, spin: true },
  pending:    { label: 'Pending',    color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',           icon: Clock, spin: true },
  analyzing:  { label: 'Analyzing',  color: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',   icon: Clock, spin: true },
}

// ── Analysis History Drawer ────────────────────────────────────────────────
function AnalysisDrawer({ doc, onClose }: { doc: CVDocument; onClose: () => void }) {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await apiClient.listAnalyses({ limit: 100 })
      const cvAnalyses = (res.analyses || []).filter(
        (a: any) => a.cv_document_id === doc.id
      )
      setAnalyses(cvAnalyses)
    } catch (error) {
      console.log('Failed to load analyses:', error)
    } finally {
      setLoading(false)
    }
  }, [doc.id])

  useEffect(() => {
    load()
  }, [load])

  // Poll only when there are processing analyses — no analyses in deps to avoid infinite loop
  useEffect(() => {
    const hasPending = analyses.some((a: any) => {
      const status = a.processing_status || a.analysis_status
      return status === 'processing' || status === 'pending'
    })
    if (!hasPending) return
    const t = setTimeout(load, 5000)
    return () => clearTimeout(t)
  }, [analyses, load])

  const name = doc.original_filename || doc.filename

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
      />
      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0f0f11] border-l border-gray-200 dark:border-[#1e1e24] z-50 flex flex-col shadow-2xl"
        style={R}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-[#1e1e24]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</h2>
              <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
                <History size={11} /> Analysis History
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* New Analysis CTA */}
        <div className="p-4 border-b border-gray-100 dark:border-[#1e1e24]">
          <Link href={`/analysis/new?cv=${doc.id}`}>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
              <Zap size={14} /> Run New Analysis
            </button>
          </Link>
        </div>

        {/* Analyses list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))
          ) : analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Target size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No analyses yet</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Run your first analysis to see how this CV matches a job</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest px-1">
                {analyses.length} {analyses.length === 1 ? 'Analysis' : 'Analyses'}
              </p>
              {analyses.map((a, i) => {
                const score  = a.match_score != null ? Math.round(a.match_score <= 1 ? a.match_score * 100 : a.match_score) : null
                const status = a.processing_status || a.analysis_status || 'pending'
                const title  = a.job_title || a.job_description?.title || 'Job Analysis'
                const company = a.company || a.job_description?.company || ''
                const date   = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                const color  = score == null ? '#6366f1' : score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(`/analysis/${a.id}`)}
                    className="group cursor-pointer bg-gray-50 dark:bg-[#151518] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600/50 hover:bg-white dark:hover:bg-[#0f0f11] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Score circle */}
                      <div className="relative w-12 h-12 shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3"
                            stroke="currentColor" className="text-gray-200 dark:text-slate-700" />
                          {score != null && (
                            <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3"
                              stroke={color} strokeLinecap="round"
                              strokeDasharray={`${(score / 100) * (2 * Math.PI * 16)} ${2 * Math.PI * 16}`} />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-bold text-gray-900 dark:text-white">
                            {score != null ? `${score}%` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Building2 size={11} className="text-gray-400 shrink-0" />
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{title}</span>
                        </div>
                        {company && <p className="text-[11px] text-gray-500 dark:text-neutral-400 truncate">{company}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${
                            status === 'completed'    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                            status === 'failed'       ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                            'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                          }`}>
                            {status === 'completed' ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                            {status}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-neutral-500 flex items-center gap-1">
                            <Calendar size={9} /> {date}
                          </span>
                        </div>
                      </div>

                      <ChevRight size={14} className="text-gray-300 dark:text-neutral-600 group-hover:text-blue-500 transition-colors shrink-0" />
                    </div>
                  </motion.div>
                )
              })}
            </>
          )}
        </div>
      </motion.div>
    </>
  )
}

function Thumbnail({ docId, status, filename }: { docId: string; status: string; filename: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const ext = getExt(filename)

  useEffect(() => {
    if (status === 'completed') {
      setLoading(true)
      apiClient.getCVPreview(docId)
        .then((res: any) => { if (res.images?.[0]?.image) setPreview(res.images[0].image) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [docId, status])

  if (preview) return (
    <div className="w-full h-[200px] overflow-hidden border-b border-gray-100 dark:border-neutral-900/60">
      <img src={getPreviewUrl(preview)} alt="CV" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
    </div>
  )

  return (
    <div className="w-full h-[200px] bg-gray-50 dark:bg-[#131316] border-b border-gray-100 dark:border-neutral-900/60 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-x-8 top-5 space-y-2 opacity-10">
        {[1/3, 3/4, 5/6, 2/3, 4/5].map((w, i) => (
          <div key={i} className="h-1.5 bg-gray-400 dark:bg-gray-600 rounded" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-2">
        {loading
          ? <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          : <>
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{ext}</span>
            </>
        }
      </div>
      <div className="absolute inset-x-8 bottom-5 space-y-1.5 opacity-10">
        {[1, 4/5].map((w, i) => (
          <div key={i} className="h-1.5 bg-gray-400 dark:bg-gray-600 rounded" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  )
}

// ── CV Card (Grid) ─────────────────────────────────────────────────────────
function CVCard({ doc, index, onDelete, isDeleting, onClick, isAnalyzing }: {
  doc: CVDocument; index: number
  onDelete: (id: string, e: React.MouseEvent) => void
  isDeleting: boolean
  onClick: () => void
  isAnalyzing?: boolean
}) {
  const baseStatus = doc.processing_status || doc.status || 'pending'
  const hasAnalysis = !!doc.latest_analysis_id
  const status     = isAnalyzing ? 'analyzing' : (hasAnalysis && baseStatus === 'completed' ? 'analyzed' : baseStatus)
  const cfg        = STATUS_CFG[status] ?? STATUS_CFG.pending
  const Icon       = cfg.icon
  const name       = doc.original_filename || doc.filename
  const score      = doc.match_score != null ? Math.round(doc.match_score <= 1 ? doc.match_score * 100 : doc.match_score) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className="group bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl hover:border-blue-400/50 dark:hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all flex flex-col overflow-hidden relative cursor-pointer"
      style={R}
    >
      {/* Status pill */}
      <div className="absolute top-3 left-3 z-10">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border backdrop-blur-md ${cfg.bg} ${cfg.color}`}>
          <Icon className={`w-2.5 h-2.5 ${cfg.spin ? 'animate-spin' : ''}`} />
          {cfg.label}
        </span>
      </div>

      {/* Thumbnail */}
      <Thumbnail docId={doc.id} status={status} filename={name} />

      {/* Body */}
      <div className="p-4 space-y-3 flex-1">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 dark:text-neutral-500">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{formatSize(doc.file_size_bytes)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-neutral-900/60 text-[10px] font-medium text-gray-600 dark:text-neutral-400">
            <FileText className="w-3 h-3" />{doc.word_count?.toLocaleString() || '—'} words
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-neutral-900/60 text-[10px] font-medium text-gray-600 dark:text-neutral-400 uppercase">
            <Globe className="w-3 h-3" />{doc.language || 'EN'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-neutral-900/50 p-3 bg-gray-50/50 dark:bg-[#0c0c0e]/30 flex items-center justify-between gap-2">
        <div>
          {score !== null
            ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-200 dark:border-blue-500/20">
                <Sparkles className="w-3 h-3" />{score}% Match
              </span>
            : <span className="text-[10px] text-gray-400 dark:text-neutral-500 italic">No match yet</span>
          }
        </div>
        <div className="flex items-center gap-1.5">
          {!hasAnalysis && status === 'completed' && (
            <Link href={`/analysis/new?cv=${doc.id}`}>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                <Zap className="w-3 h-3" /> Match
              </button>
            </Link>
          )}
          {hasAnalysis && (
            <Link href={`/analysis/${doc.latest_analysis_id}`}>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-white text-xs font-semibold transition-all">
                <BarChart3 className="w-3 h-3" /> Report
              </button>
            </Link>
          )}
          <button onClick={e => onDelete(doc.id, e)} disabled={isDeleting}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-900/30 transition-all disabled:opacity-50">
            {isDeleting
              ? <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-500 rounded-full animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────
export function DocumentsView() {
  const [documents, setDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading]     = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid')
  const [selectedDoc, setSelectedDoc] = useState<CVDocument | null>(null)
  const [analyzingCVs, setAnalyzingCVs] = useState<Set<string>>(new Set())
  const PER_PAGE = 8

  useEffect(() => {
    const saved = localStorage.getItem('resumeai_view_mode')
    if (saved === 'list' || saved === 'grid') setViewMode(saved)
  }, [])

  const toggleView = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('resumeai_view_mode', mode)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getDocuments({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE })
      setDocuments(res.documents || [])
      setTotal(res.total || 0)
    } catch { setDocuments([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const needsPoll = documents.some(d => ['pending', 'processing'].includes(d.processing_status || d.status || ''))
    if (needsPoll) { const t = setTimeout(load, 4000); return () => clearTimeout(t) }
  }, [documents, load])

  // Check for analyzing CVs
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const checkAnalyzing = async () => {
      try {
        const res = await apiClient.listAnalyses({ limit: 100 })
        const analyzing = new Set<string>()
        res.analyses?.forEach((a: any) => {
          const status = a.processing_status || a.analysis_status
          if (status === 'processing' || status === 'pending') {
            analyzing.add(a.cv_document_id)
          }
        })
        setAnalyzingCVs(analyzing)

        // Stop polling if nothing is processing
        if (analyzing.size === 0 && intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      } catch {
        // Silently fail
      }
    }

    const initialTimeout = setTimeout(checkAnalyzing, 500)
    // Poll every 8 seconds (reduced from 5)
    intervalId = setInterval(checkAnalyzing, 8000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (deletingIds.has(id)) return
    setDeletingIds(p => new Set(p).add(id))
    try {
      await apiClient.deleteDocument(id)
      setDocuments(p => p.filter(d => d.id !== id))
      setTotal(p => Math.max(0, p - 1))
      toast.success('Resume deleted')
    } catch (err: any) {
      if (err.status === 404) { setDocuments(p => p.filter(d => d.id !== id)); toast.success('Resume deleted') }
      else toast.error(err.message || 'Failed to delete')
    } finally {
      setDeletingIds(p => { const n = new Set(p); n.delete(id); return n })
    }
  }

  const FILTERS = [
    { id: 'all',        label: 'All'        },
    { id: 'completed',  label: 'Analyzed'   },
    { id: 'processing', label: 'Processing' },
    { id: 'failed',     label: 'Failed'     },
  ]

  const filtered = documents.filter(doc => {
    const s    = doc.processing_status || doc.status || 'pending'
    const name = (doc.original_filename || doc.filename || '').toLowerCase()
    return (filter === 'all' || s === filter) && (!search || name.includes(search.toLowerCase()))
  })

  const totalPages = Math.ceil(total / PER_PAGE)
  const counts = documents.reduce((acc, d) => {
    const s = d.processing_status || d.status || 'pending'
    acc[s] = (acc[s] || 0) + 1; return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6 max-w-[1250px] mx-auto pb-16" style={R}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500 font-medium">
            <FileText size={13} className="text-blue-500" />
            <span>Resumes</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">My Resumes</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Upload and manage your CV files, then run AI match analyses</p>
        </div>
        <Link href="/upload">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
            <Plus size={15} /> Upload Resume
          </button>
        </Link>
      </div>

      {/* Stats */}
      {documents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: total,                                                    icon: FileText,    color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-500/10'    },
            { label: 'Analyzed',   value: counts.completed  || 0,                                   icon: CheckCircle2,color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Processing', value: (counts.processing || 0) + (counts.pending || 0),         icon: Clock,       color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10'  },
            { label: 'Failed',     value: counts.failed     || 0,                                   icon: XCircle,     color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-500/10'      },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white leading-none">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters + View toggle */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => {
            const cnt = f.id === 'all' ? documents.length : (counts[f.id] || 0)
            return (
              <button key={f.id} onClick={() => { setFilter(f.id); setPage(1) }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-[#151518] shadow-sm'
                }`}>
                {f.label}
                <span className={`ml-1.5 text-[10px] font-semibold ${filter === f.id ? 'opacity-80' : 'opacity-50'}`}>{cnt}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resumes..."
              className="w-full bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-sm" />
          </div>
          <div className="flex items-center p-1 bg-gray-100 dark:bg-[#0f0f12] border border-gray-200 dark:border-[#1e1e24] rounded-xl shrink-0">
            <button onClick={() => toggleView('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#1c1c24] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => toggleView('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#1c1c24] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && documents.length === 0 ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-2'}>
          {viewMode === 'grid'
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[290px] bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl animate-pulse overflow-hidden flex flex-col">
                  <div className="h-[150px] bg-gray-100 dark:bg-neutral-900/40" />
                  <div className="p-4 space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded" />
                    <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-800/60 rounded" />
                  </div>
                  <div className="h-12 bg-gray-50 dark:bg-[#0c0c0e]/30 border-t border-gray-100 dark:border-neutral-900/50" />
                </div>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl animate-pulse" />
              ))
          }
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div key="empty" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="py-20 flex flex-col items-center justify-center text-center gap-4 bg-white dark:bg-[#0f0f11] rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center border border-blue-100 dark:border-blue-900/20">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {search ? `No results for "${search}"` : 'No resumes uploaded yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {search ? 'Try a different filename or clear the search.' : 'Upload your first resume to start getting AI match scores.'}
            </p>
          </div>
          {!search && (
            <Link href="/upload">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
                <FileUp size={14} /> Upload Resume
              </button>
            </Link>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((doc, i) => (
            <CVCard key={doc.id} doc={doc} index={i} onDelete={handleDelete} isDeleting={deletingIds.has(doc.id)} onClick={() => setSelectedDoc(doc)} isAnalyzing={analyzingCVs.has(doc.id)} />
          ))}
        </div>
      ) : (
          <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#151518]/60 text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest border-b border-gray-100 dark:border-neutral-900/50">
                    <th className="py-3 px-5">Document</th>
                    <th className="py-3 px-5">Uploaded</th>
                    <th className="py-3 px-5">Size</th>
                    <th className="py-3 px-5">Lang</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Match</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-900/50 text-xs">
                  {filtered.map(doc => {
                    const baseStatus = doc.processing_status || doc.status || 'pending'
                    const isAnalyzing = analyzingCVs.has(doc.id)
                    const hasA = !!doc.latest_analysis_id
                    const s   = isAnalyzing ? 'analyzing' : (hasA && baseStatus === 'completed' ? 'analyzed' : baseStatus)
                    const cfg = STATUS_CFG[s] ?? STATUS_CFG.pending
                    const Icon = cfg.icon
                    const name = doc.original_filename || doc.filename
                    const score = doc.match_score != null ? Math.round(doc.match_score <= 1 ? doc.match_score * 100 : doc.match_score) : null
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-900/20 transition-colors cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3 max-w-[260px]">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white truncate">{name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-gray-500 dark:text-neutral-400">
                          {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-5 text-gray-500 dark:text-neutral-400">{formatSize(doc.file_size_bytes)}</td>
                        <td className="py-3.5 px-5 text-gray-700 dark:text-neutral-300 font-semibold uppercase">{doc.language || 'EN'}</td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${cfg.bg} ${cfg.color}`}>
                            <Icon className={`w-2.5 h-2.5 ${cfg.spin ? 'animate-spin' : ''}`} />{cfg.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          {score !== null
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20">
                                <Sparkles className="w-3 h-3" />{score}%
                              </span>
                            : <span className="text-gray-400 dark:text-neutral-500 italic">—</span>
                          }
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!hasA && s === 'completed' && (
                              <Link href={`/analysis/new?cv=${doc.id}`}>
                                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                                  <Zap className="w-3 h-3" /> Match
                                </button>
                              </Link>
                            )}
                            {hasA && (
                              <Link href={`/analysis/${doc.latest_analysis_id}`}>
                                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-white text-xs font-semibold transition-all">
                                  <BarChart3 className="w-3 h-3" /> Report
                                </button>
                              </Link>
                            )}
                            <button onClick={e => handleDelete(doc.id, e)} disabled={deletingIds.has(doc.id)}
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:text-red-400 transition-all disabled:opacity-50">
                              {deletingIds.has(doc.id)
                                ? <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-500 rounded-full animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-neutral-900/50">
          <span className="text-xs text-gray-400 dark:text-neutral-500">Page {page} of {totalPages} · {total} resumes</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-neutral-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-30 transition-all shadow-sm">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-neutral-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-30 transition-all shadow-sm">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Analysis History Drawer */}
      <AnimatePresence>
        {selectedDoc && (
          <AnalysisDrawer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
