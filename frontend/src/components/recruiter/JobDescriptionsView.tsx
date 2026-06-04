'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Briefcase, Plus, Search, Trash2, Edit3, ChevronRight,
  Loader2, Star, Clock, AlertTriangle, X
} from 'lucide-react'

interface JobDescription {
  id: string
  title: string
  company?: string
  description: string
  created_at: string
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────
function ConfirmDeleteModal({
  title,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6"
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mb-1">
          Delete Job Description?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          <span className="font-semibold text-slate-700 dark:text-slate-300">"{title}"</span>
          <br />
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── JD Card ────────────────────────────────────────────────────────────────────
function JDCard({
  jd, onRequestDelete
}: {
  jd: JobDescription
  onRequestDelete: (jd: JobDescription) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white truncate">{jd.title}</h3>
            {jd.company && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{jd.company}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/jobs/${jd.id}/edit`}>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
              <Edit3 size={15} />
            </button>
          </Link>
          <button
            onClick={() => onRequestDelete(jd)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
        {jd.description}
      </p>



      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 mt-auto">
        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Clock size={11} /> {formatDateTime(jd.created_at)}
        </span>
        <Link href={`/jobs/${jd.id}/edit`}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
          Edit <ChevronRight size={12} />
        </Link>
      </div>
    </motion.div>
  )
}

// ── Main View ──────────────────────────────────────────────────────────────────
export function JobDescriptionsView() {
  const [jds, setJds]           = useState<JobDescription[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [pendingDelete, setPendingDelete] = useState<JobDescription | null>(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    apiClient.getJobDescriptions({ limit: 100 })
      .then(res => setJds(res.items || []))
      .catch(() => toast.error('Failed to load job descriptions'))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await apiClient.deleteJobDescription(pendingDelete.id)
      setJds(prev => prev.filter(j => j.id !== pendingDelete.id))
      toast.success('Job description deleted')
      setPendingDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = jds.filter(jd => {
    const matchSearch = !search ||
      jd.title.toLowerCase().includes(search.toLowerCase()) ||
      jd.description.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Confirm Delete Modal — rendered at top level so it's never inside an exiting card */}
      <AnimatePresence>
        {pendingDelete && (
          <ConfirmDeleteModal
            title={pendingDelete.title}
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDelete(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Job Descriptions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {jds.length} job description{jds.length !== 1 ? 's' : ''} — used for CV matching and ranking
          </p>
        </div>
        <Link href="/jobs/new">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all">
            <Plus size={16} /> New Job Description
          </motion.button>
        </Link>
      </motion.div>

      {/* Search + Filter Bar */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, description or skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
            {search ? <Search size={28} className="text-slate-400" /> : <Briefcase size={28} className="text-slate-400" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {search ? 'No results found' : 'No job descriptions yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {search
              ? `No job descriptions match "${search}"`
              : 'Create your first job description to start matching and ranking candidates'}
          </p>
          {!search && (
            <Link href="/jobs/new">
              <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                Create Job Description
              </button>
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((jd, i) => (
              <motion.div key={jd.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.04 }}>
                <JDCard jd={jd} onRequestDelete={setPendingDelete} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}
