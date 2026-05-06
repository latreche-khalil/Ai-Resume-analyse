'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CVDocument {
  id: string
  filename: string
  original_filename?: string
  status?: string
  processing_status?: string
  language?: string
  detected_language?: string
  word_count?: number
  file_size?: number
  latest_analysis_id?: string
  match_score?: number
  status_message?: string
  created_at: string
}

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',            href: '/?preview=1',    active: false },
  { icon: '⚡', label: 'Dashboard',       href: '/dashboard',     active: false },
  { icon: '📄', label: 'My Resumes',      href: '/documents',     active: true  },
  { icon: '🧪', label: 'Skill Lab',       href: '/analysis/new',  active: false },
  { icon: '🎤', label: 'Mock Interviews', href: '/coaching/chat', active: false },
  { icon: '⚙️', label: 'Settings',        href: '/settings',      active: false },
]

const FILTERS = [
  { id: 'all',       label: 'All',        icon: '📋' },
  { id: 'completed', label: 'Completed',  icon: '✅' },
  { id: 'pending',   label: 'Processing', icon: '⏳' },
  { id: 'failed',    label: 'Failed',     icon: '❌' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  completed:  { label: 'Optimized',   color: 'text-green-400 bg-green-500/10 border-green-500/30',   icon: '✅' },
  pending:    { label: 'Processing',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      icon: '⏳' },
  processing: { label: 'Processing',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',      icon: '⏳' },
  failed:     { label: 'Failed',      color: 'text-red-400 bg-red-500/10 border-red-500/30',         icon: '❌' },
}

function formatSize(bytes?: number) {
  if (!bytes) return 'N/A'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function DocumentPreview({ docId, status }: { docId: string; status: string }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'completed') {
      setLoading(true)
      apiClient.getCVPreview(docId)
        .then((res: { images: { image: string }[] }) => {
          if (res.images && res.images.length > 0) {
            setPreview(res.images[0].image)
          }
        })
        .catch(() => setPreview(null))
        .finally(() => setLoading(false))
    }
  }, [docId, status])

  return (
    <div className="relative w-full aspect-[3/4.2] bg-slate-900/60 rounded-xl border theme-border overflow-hidden group-hover:border-sky-500/30 transition-all flex items-center justify-center shadow-inner">
      {preview ? (
        <motion.img 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          src={preview} 
          alt="CV Preview" 
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          ) : (
            <>
              <div className="text-4xl opacity-20">📄</div>
              <div className="space-y-1.5 w-full max-w-[80px]">
                <div className="w-full h-1 bg-white/5 rounded-full" />
                <div className="w-2/3 h-1 bg-white/5 rounded-full" />
                <div className="w-full h-1 bg-white/5 rounded-full" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Dynamic Overlay based on status */}
      <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-500 ${status === 'completed' ? 'bg-sky-500/5' : 'bg-slate-900/60'}`}>
         {status !== 'completed' && (
           <div className="flex flex-col items-center gap-2">
             <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
             <span className="text-[8px] uppercase tracking-widest font-bold text-sky-400">Processing...</span>
           </div>
         )}
         {status === 'completed' && !preview && !loading && (
           <span className="text-[8px] uppercase tracking-widest font-bold text-white/40">Real Preview</span>
         )}
      </div>
    </div>
  )
}

function CVCard({ doc, index, onDelete }: { doc: CVDocument; index: number; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const status = doc.processing_status || doc.status || 'pending'
  const hasAnalysis = !!doc.latest_analysis_id
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const statusLabel = hasAnalysis ? { ...s, label: 'Analyzed', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', icon: '🧠' } : s
  const name = doc.original_filename || doc.filename
  const score = doc.match_score !== undefined ? Math.round(doc.match_score * 100) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative group"
    >
      <div className="relative p-4 rounded-[28px] theme-card border theme-border hover:border-sky-500/40 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-500 flex flex-col bg-slate-900/20 backdrop-blur-sm overflow-hidden">
        
        {/* Score Badge - Top Left */}
        {score !== null && (
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-2">
              <span className="text-[10px] font-black text-sky-400">{score}%</span>
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Status Badge - Top Right */}
        <div className="absolute top-4 right-4 z-20">
           <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md ${statusLabel.color}`}>
              {statusLabel.icon} {statusLabel.label}
            </span>
        </div>

        {/* Center: Document Preview */}
        <div className="mt-8 mb-4 px-2">
          <DocumentPreview docId={doc.id} status={status} />
        </div>

        {/* Bottom: Info & Actions */}
        <div className="space-y-3 relative z-10">
          <h3 className="font-bold theme-text text-sm line-clamp-1 group-hover:text-sky-400 transition-colors">{name}</h3>
          
          <div className="flex items-center justify-between text-[10px] theme-text-tertiary">
            <div className="flex items-center gap-2">
              <span>📅 {new Date(doc.created_at).toLocaleDateString()}</span>
              <span>📦 {formatSize(doc.file_size)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            {!hasAnalysis && status === 'completed' && (
              <Link href={`/analysis/new?cv=${doc.id}`} className="flex-1">
                <button className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 btn-text-white text-[10px] font-black transition-all shadow-lg shadow-sky-600/20">
                  🎯 ANALYZE
                </button>
              </Link>
            )}
            {hasAnalysis && (
              <Link href={`/analysis/${doc.latest_analysis_id}`} className="flex-1">
                <button className="w-full py-2.5 rounded-xl bg-white theme-text-inverse text-[10px] font-black hover:opacity-90 transition-all">
                  📊 VIEW REPORT
                </button>
              </Link>
            )}
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="py-2.5 px-3 rounded-xl theme-card border theme-border text-xs hover:bg-red-500/10 hover:border-red-500/20 transition-all">🗑️</button>
            ) : (
              <button onClick={() => onDelete(doc.id)}
                className="py-2.5 px-3 rounded-xl bg-red-600 text-white text-[10px] font-black animate-pulse">DELETE?</button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function DocumentsView() {
  const { logout } = useAuth()
  const [documents, setDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const PER_PAGE = 12

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.getDocuments({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE })
      setDocuments(res.documents || res.items || [])
      setTotal(res.total || 0)
    } catch { setDocuments([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => {
    // Initial load
    if (documents.length === 0 && loading) {
      loadDocuments();
    }

    // Check if any document needs polling
    const needsPolling = documents.some(d => 
      ['pending', 'processing'].includes(d.processing_status || d.status || '')
    );

    if (needsPolling) {
      const timer = setTimeout(() => {
        loadDocuments();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [documents, loadDocuments, loading]);

  const handleDelete = async (id: string) => {
    const deleteToast = toast.loading('Deleting CV...')
    try {
      await apiClient.deleteDocument(id)
      toast.success('CV deleted successfully.', { id: deleteToast })
      loadDocuments()
    } catch {
      toast.error('Failed to delete CV.', { id: deleteToast })
    }
  }

  const handleLogout = useCallback(async () => { await logout() }, [logout])

  const filtered = documents.filter(doc => {
    const status = doc.processing_status || doc.status || 'pending'
    const name = (doc.original_filename || doc.filename || '').toLowerCase()
    const matchFilter = filter === 'all' || status === filter
    const matchSearch = !search || name.includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages = Math.ceil(total / PER_PAGE)
  const completed  = documents.filter(d => (d.processing_status || d.status) === 'completed').length
  const processing = documents.filter(d => ['pending','processing'].includes(d.processing_status || d.status || '')).length
  const failed     = documents.filter(d => (d.processing_status || d.status) === 'failed').length

  return (
    <div className="min-h-screen theme-bg theme-text flex overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.aside
        initial={false} animate={{ width: sidebarOpen ? 220 : 64 }}
        className="relative z-20 flex-shrink-0 flex flex-col theme-card border-r theme-border h-screen sticky top-0 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b theme-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="btn-text-white font-bold text-sm">R</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">ResumeAI</motion.span>
            )}
          </AnimatePresence>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => (
            <Link key={item.label} href={item.href}>
              <motion.div whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${item.active ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-400' : 'theme-text-secondary hover:bg-white/5 hover:theme-text'}`}>
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <AnimatePresence>{sidebarOpen && (<motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium whitespace-nowrap">{item.label}</motion.span>)}</AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>
        <button onClick={() => setSidebarOpen(o => !o)} className="m-3 p-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all flex items-center justify-center theme-text-secondary">
          <motion.span animate={{ rotate: sidebarOpen ? 0 : 180 }}>◀</motion.span>
        </button>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="theme-card border-b theme-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold theme-text">My Resumes</h1>
            <p className="text-xs theme-text-tertiary mt-0.5">{total} CV{total !== 1 ? 's' : ''} in your archive</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/upload"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-semibold flex items-center gap-2"><span>📤</span> Upload CV</motion.button></Link>
            <button onClick={handleLogout} className="px-4 py-2 text-sm theme-text-secondary hover:theme-text transition-colors rounded-lg hover:bg-white/5">Logout</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total',      value: total,      icon: '📄', color: 'from-sky-500/20 to-blue-500/20',   border: 'border-sky-500/30' },
              { label: 'Completed',  value: completed,  icon: '✅', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30'  },
              { label: 'Processing', value: processing, icon: '⏳', color: 'from-blue-500/20 to-cyan-500/20',     border: 'border-blue-500/30'   },
              { label: 'Failed',     value: failed,     icon: '❌', color: 'from-red-500/20 to-orange-500/20',    border: 'border-red-500/30'    },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`p-4 rounded-2xl bg-gradient-to-br ${s.color} border ${s.border} flex items-center gap-3`}>
                <span className="text-2xl">{s.icon}</span><div><p className="text-2xl font-bold theme-text">{s.value}</p><p className="text-xs theme-text-tertiary">{s.label}</p></div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 p-1 rounded-2xl theme-card border theme-border">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => { setFilter(f.id); setPage(1) }} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${filter === f.id ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-400' : 'theme-text-secondary hover:bg-white/5'}`}>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by filename…" className="theme-input w-full pl-9 py-2.5 text-sm" />
            </div>
          </div>


          {loading ? (
            <div className="flex items-center justify-center py-24"><motion.div className="w-14 h-14 rounded-full border-4 border-sky-500 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><div className="text-6xl mb-4">📭</div><h3 className="text-xl font-semibold theme-text mb-2">{search ? 'No results found' : filter !== 'all' ? `No ${filter} CVs` : 'No CVs yet'}</h3><p className="theme-text-tertiary text-sm mb-6 max-w-sm">{search ? `No CVs match "${search}"` : 'Upload your first CV to get started with AI-powered analysis'}</p>{!search && filter === 'all' && (<Link href="/upload"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-8 py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold">📤 Upload Your First CV</motion.button></Link>)}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filtered.map((doc, i) => (<CVCard key={doc.id} doc={doc} index={i} onDelete={handleDelete} />))}</div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-xl theme-card border theme-border text-sm theme-text-secondary hover:border-sky-500/40 disabled:opacity-40 transition-all">← Prev</button>
                  <div className="flex gap-1">{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${p === page ? 'bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white' : 'theme-card border theme-border theme-text-secondary hover:border-sky-500/40'}`}>{p}</button>))}</div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-xl theme-card border theme-border text-sm theme-text-secondary hover:border-sky-500/40 disabled:opacity-40 transition-all">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
