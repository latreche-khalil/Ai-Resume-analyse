'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { apiClient } from '@/lib/api-client'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/contexts/auth-context'

interface CVDocument {
  id: string
  original_filename: string
  file_format: string
  file_size_bytes: number
  detected_language?: string
  word_count?: number
  processing_status: string
  virus_scan_status: string
  created_at: string
}

interface SkillReport {
  id: string
  skills: Array<{ name: string; category?: string; confidence?: number }>
  job_titles: Array<{ title: string; company?: string; duration?: string }>
  education: Array<{ degree?: string; institution?: string; year?: string }>
  certifications: Array<{ name: string; issuer?: string }>
  total_experience_months?: number
  extraction_confidence?: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  completed:  { label: 'Optimized',  color: 'text-green-400', icon: '✅', bg: 'bg-green-500/10 border-green-500/30'  },
  pending:    { label: 'Processing', color: 'text-blue-400',  icon: '⏳', bg: 'bg-blue-500/10 border-blue-500/30'    },
  processing: { label: 'Processing', color: 'text-blue-400',  icon: '⏳', bg: 'bg-blue-500/10 border-blue-500/30'    },
  failed:     { label: 'Failed',     color: 'text-red-400',   icon: '❌', bg: 'bg-red-500/10 border-red-500/30'      },
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { logout } = useAuth()
  const [doc, setDoc] = useState<CVDocument | null>(null)
  const [skills, setSkills] = useState<SkillReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showUnmasked, setShowUnmasked] = useState(false)
  const [unmaskedData, setUnmaskedData] = useState<any>(null)
  const [unmasking, setUnmasking] = useState(false)

  useEffect(() => {
    loadDocument()
  }, [id])

  const loadDocument = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getDocument(id)
      setDoc(data)
      // Try to load skill report if completed
      if (data.processing_status === 'completed') {
        try {
          const report = await apiClient.getSkillReport(id)
          setSkills(report)
        } catch { /* no report yet */ }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load document.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiClient.deleteDocument(id)
      router.push('/documents')
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleUnmask = async () => {
    setUnmasking(true)
    try {
      const data = await apiClient.unmaskDocument(id)
      setUnmaskedData(data)
      setShowUnmasked(true)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to unmask document')
    } finally {
      setUnmasking(false)
    }
  }

  if (loading) return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <motion.div className="w-14 h-14 rounded-full border-4 border-sky-500 border-t-transparent"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
      </div>
    </ProtectedRoute>
  )

  if (error || !doc) return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="theme-text font-semibold mb-4">{error || 'Document not found'}</p>
          <Link href="/documents">
            <button className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold text-sm">
              ← Back to My Resumes
            </button>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  )

  const s = STATUS_CONFIG[doc.processing_status] || STATUS_CONFIG.pending

  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen theme-bg theme-text relative overflow-hidden">
        {/* BG */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 theme-glow-bg" />
          <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="relative z-10 theme-card border-b theme-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/documents">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all theme-text-secondary hover:theme-text">
                ←
              </motion.button>
            </Link>
            <div>
              <h1 className="text-lg font-bold theme-text truncate max-w-xs">{doc.original_filename}</h1>
              <p className="text-xs theme-text-tertiary">CV Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href={`/analysis/new?cv=${doc.id}`}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-semibold flex items-center gap-2">
                🎯 Analyze CV
              </motion.button>
            </Link>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* Meta card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="theme-card border theme-border rounded-2xl p-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center text-3xl flex-shrink-0">
                📄
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold theme-text mb-1 truncate">{doc.original_filename}</h2>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { icon: '📦', label: formatSize(doc.file_size_bytes) },
                    { icon: '🗂️', label: doc.file_format.toUpperCase() },
                    { icon: '🌐', label: (doc.detected_language || 'N/A').toUpperCase() },
                    { icon: '📝', label: doc.word_count ? `${doc.word_count} words` : 'N/A' },
                    { icon: '📅', label: new Date(doc.created_at).toLocaleDateString() },
                    { icon: '🔬', label: doc.virus_scan_status === 'clean' ? 'Clean ✓' : doc.virus_scan_status },
                  ].map((m, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-sm theme-text-secondary px-3 py-1.5 rounded-xl theme-card border theme-border">
                      <span>{m.icon}</span><span>{m.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${s.bg} ${s.color} flex-shrink-0`}>
                {s.icon} {s.label}
              </span>
            </div>
          </motion.div>

          {/* Processing status */}
          {doc.processing_status !== 'completed' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className={`p-5 rounded-2xl border ${s.bg} flex items-center gap-4`}>
              {doc.processing_status === 'pending' || doc.processing_status === 'processing' ? (
                <motion.div className="w-8 h-8 rounded-full border-3 border-blue-400 border-t-transparent flex-shrink-0"
                  animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              ) : (
                <span className="text-2xl">{s.icon}</span>
              )}
              <div>
                <p className={`font-semibold ${s.color}`}>
                  {doc.processing_status === 'failed' ? 'Processing Failed' : 'Processing in Progress'}
                </p>
                <p className="text-sm theme-text-secondary mt-0.5">
                  {doc.processing_status === 'failed'
                    ? 'There was an error processing your CV. Please try uploading again.'
                    : 'Your CV is being analyzed. This usually takes 30-60 seconds.'}
                </p>
                {doc.processing_status !== 'failed' && (
                  <button onClick={loadDocument} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    🔄 Refresh status
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Skills section */}
          {skills && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="space-y-4">

              {/* Skills */}
              {skills.skills?.length > 0 && (
                <div className="theme-card border theme-border rounded-2xl p-6">
                  <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                    <span>🧠</span> Detected Skills
                    <span className="ml-auto text-xs theme-text-tertiary">{skills.skills.length} skills</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.skills.map((skill, i) => (
                      <motion.span key={i}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="px-3 py-1.5 rounded-full text-sm bg-sky-500/10 border border-sky-500/30 text-sky-400"
                      >
                        {typeof skill === 'string' ? skill : skill.name}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {skills.job_titles?.length > 0 && (
                <div className="theme-card border theme-border rounded-2xl p-6">
                  <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                    <span>💼</span> Work Experience
                    {skills.total_experience_months && (
                      <span className="ml-auto text-xs theme-text-tertiary">
                        ~{Math.round(skills.total_experience_months / 12)} years
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {skills.job_titles.map((job, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border theme-border">
                        <span className="text-xl flex-shrink-0">🏢</span>
                        <div>
                          <p className="font-medium theme-text text-sm">{typeof job === 'string' ? job : job.title}</p>
                          {typeof job !== 'string' && job.company && (
                            <p className="text-xs theme-text-tertiary mt-0.5">{job.company} {job.duration ? `· ${job.duration}` : ''}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {skills.education?.length > 0 && (
                <div className="theme-card border theme-border rounded-2xl p-6">
                  <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                    <span>🎓</span> Education
                  </h3>
                  <div className="space-y-3">
                    {skills.education.map((edu, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border theme-border">
                        <span className="text-xl flex-shrink-0">🎓</span>
                        <div>
                          <p className="font-medium theme-text text-sm">
                            {typeof edu === 'string' ? edu : (edu.degree || 'Degree')}
                          </p>
                          {typeof edu !== 'string' && edu.institution && (
                            <p className="text-xs theme-text-tertiary mt-0.5">{edu.institution} {edu.year ? `· ${edu.year}` : ''}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {skills.certifications?.length > 0 && (
                <div className="theme-card border theme-border rounded-2xl p-6">
                  <h3 className="font-semibold theme-text mb-4 flex items-center gap-2">
                    <span>🏆</span> Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.certifications.map((cert, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-sm bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                        🏆 {typeof cert === 'string' ? cert : cert.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {skills.extraction_confidence && (
                <div className="theme-card border theme-border rounded-2xl p-4 flex items-center gap-4">
                  <span className="text-2xl">🎯</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium theme-text">Extraction Confidence</p>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${skills.extraction_confidence * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-purple-400">
                    {Math.round(skills.extraction_confidence * 100)}%
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* No skills yet */}
          {doc.processing_status === 'completed' && !skills && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="theme-card border theme-border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="theme-text font-semibold mb-1">No skill report yet</p>
              <p className="theme-text-tertiary text-sm">The skill extraction may still be processing.</p>
              <button onClick={loadDocument} className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                🔄 Refresh
              </button>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3">
            <Link href={`/analysis/new?cv=${doc.id}`} className="flex-1 min-w-[160px]">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold text-sm flex items-center justify-center gap-2">
                🎯 Analyze Against Job Description
              </motion.button>
            </Link>
            <Link href="/upload" className="flex-1 min-w-[140px]">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl theme-card border theme-border theme-text-secondary hover:border-sky-500/40 font-semibold text-sm flex items-center justify-center gap-2 transition-all">
                📤 Upload New Version
              </motion.button>
            </Link>
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              onClick={handleUnmask}
              disabled={unmasking || doc.processing_status !== 'completed'}
              className="py-3 px-5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-semibold text-sm hover:bg-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {unmasking ? '⏳ Loading...' : '👁️ View Original PII'}
            </motion.button>
            {!confirmDelete ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setConfirmDelete(true)}
                className="py-3 px-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-all flex items-center gap-2">
                🗑️ Delete
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleDelete} disabled={deleting}
                  className="py-3 px-5 rounded-xl bg-red-500/30 border border-red-500/50 text-red-300 font-semibold text-sm disabled:opacity-60">
                  {deleting ? '⏳ Deleting…' : '✓ Confirm Delete'}
                </motion.button>
                <button onClick={() => setConfirmDelete(false)}
                  className="py-3 px-4 rounded-xl theme-card border theme-border theme-text-secondary text-sm">
                  Cancel
                </button>
              </div>
            )}
          </motion.div>

        </main>

        {/* Unmask Modal */}
        <AnimatePresence>
          {showUnmasked && unmaskedData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowUnmasked(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="theme-card border theme-border rounded-2xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold theme-text flex items-center gap-2">
                    <span>👁️</span> Original Personal Information
                  </h3>
                  <button
                    onClick={() => setShowUnmasked(false)}
                    className="text-2xl theme-text-secondary hover:theme-text transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-yellow-300 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>This information was masked during AI processing for privacy protection. Only you can see this.</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="theme-card border theme-border rounded-xl p-4">
                    <h4 className="font-semibold theme-text mb-2 text-sm">PII Count</h4>
                    <p className="text-2xl font-bold text-purple-400">{unmaskedData.pii_count || 0}</p>
                    <p className="text-xs theme-text-tertiary mt-1">Personal identifiers detected and masked</p>
                  </div>

                  <div className="theme-card border theme-border rounded-xl p-4">
                    <h4 className="font-semibold theme-text mb-3 text-sm">Original Text Preview</h4>
                    <div className="bg-white/5 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs theme-text-secondary whitespace-pre-wrap font-mono">
                        {unmaskedData.original_text?.substring(0, 2000)}
                        {unmaskedData.original_text?.length > 2000 && '\n\n... (truncated)'}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(unmaskedData.original_text || '')
                        alert('Copied to clipboard!')
                      }}
                      className="flex-1 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-sm font-medium hover:bg-sky-500/20 transition-colors"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      onClick={() => setShowUnmasked(false)}
                      className="flex-1 py-2 rounded-lg theme-card border theme-border theme-text-secondary text-sm font-medium hover:border-sky-500/40 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  )
}
