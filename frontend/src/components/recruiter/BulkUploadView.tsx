'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, X, ArrowRight, Zap, AlertCircle,
  Trash2, Clock, XCircle, Loader2, FolderUp, BarChart3, Award, SlidersHorizontal, PlusCircle
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const FONT = { fontFamily: 'Roboto, sans-serif' }
const MAX_MB = 10
const MAX_FILES = 20
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
const ACCEPTED_FORMAT_LABEL = 'PDF, DOCX, JPG, JPEG or PNG'
const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',')

interface FileWithStatus {
  file: File
  id: string
  cvId?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

interface RankedCandidate {
  rank: number
  cv_id: string
  filename: string
  composite_score: number
  rank_category: string
  scores_breakdown: Record<string, number>
  matching_skills: string[]
  missing_skills: string[]
  transferable_skills?: string[]
  red_flags?: string[]
  recommendation: string
  evidence_for_match?: string[]
  evidence_against_match?: string[]
  summary?: string
  confidence?: string
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const scorePct = (score = 0) => Math.round((score <= 1 ? score * 100 : score))

export function BulkUploadView() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [uploading, setUploading] = useState(false)
  const [processingDocuments, setProcessingDocuments] = useState(false)
  const [analyzingBatch, setAnalyzingBatch] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [jobDescriptions, setJobDescriptions] = useState<any[]>([])
  const [selectedJd, setSelectedJd] = useState('')
  const [batchResult, setBatchResult] = useState<any>(null)
  const [sortBy, setSortBy] = useState('rank')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    apiClient.getJobDescriptions({ limit: 100 })
      .then(res => {
        const items = res.items || []
        setJobDescriptions(items)
        if (items.length === 1) setSelectedJd(items[0].id)
      })
      .catch(() => toast.error('Failed to load job descriptions'))
  }, [])

  const validate = (f: File): string | null => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext))
      return `Invalid file type. Supported: ${ACCEPTED_FORMAT_LABEL}`
    if (f.size > MAX_MB * 1024 * 1024)
      return `File too large (max ${MAX_MB}MB)`
    return null
  }

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithStatus[] = []
    const errors: string[] = []

    for (const file of newFiles) {
      if (files.length + validFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`)
        break
      }

      const error = validate(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
        continue
      }

      // Check for duplicates
      const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size)
      if (isDuplicate) {
        errors.push(`${file.name}: Already added`)
        continue
      }

      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: 'pending',
        progress: 0
      })
    }

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      toast.success(`${validFiles.length} file(s) added`)
    }
  }, [files])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const [processingProgress, setProcessingProgress] = useState({ done: 0, total: 0 })

  const waitForDocumentsReady = async (cvIds: string[]) => {
    setProcessingDocuments(true)
    setProcessingProgress({ done: 0, total: cvIds.length })

    for (let attempt = 0; attempt < 40; attempt++) {
      const docs = await Promise.all(cvIds.map(id => apiClient.getDocument(id).catch(() => null)))

      // Mark explicitly failed docs as errors in the UI (but don't throw — continue with the rest)
      docs.forEach((doc: any) => {
        if (doc?.processing_status === 'failed') {
          setFiles(prev => prev.map(f =>
            f.cvId === doc.id
              ? { ...f, status: 'error', error: doc.status_message || 'Processing failed' }
              : f
          ))
        }
      })

      // "Done" = completed OR failed (both are terminal states)
      const doneDocs = docs.filter((doc: any) =>
        doc?.processing_status === 'completed' || doc?.processing_status === 'failed'
      )
      const completedDocs = docs.filter((doc: any) => doc?.processing_status === 'completed')

      setProcessingProgress({ done: doneDocs.length, total: cvIds.length })

      if (doneDocs.length === cvIds.length) {
        setProcessingDocuments(false)
        // Return only the IDs that completed successfully (skip failed ones)
        return completedDocs.map((doc: any) => doc.id)
      }

      await delay(2500)
    }

    // Timeout — return whatever completed so far instead of throwing
    setProcessingDocuments(false)
    toast.warning('Some CVs took too long to process and were skipped.')
    const finalDocs = await Promise.all(cvIds.map(id => apiClient.getDocument(id).catch(() => null)))
    return finalDocs
      .filter((doc: any) => doc?.processing_status === 'completed')
      .map((doc: any) => doc.id)
  }

  const uploadAll = async () => {
    if (files.length === 0) return
    if (!selectedJd) {
      toast.error('Select a job description before ranking candidates')
      return
    }

    setUploading(true)
    setBatchResult(null)
    let successCount = 0
    let errorCount = 0
    const uploadedCvIds: string[] = []

    // Upload files sequentially to avoid overwhelming the server
    for (const fileItem of files) {
      if (fileItem.status === 'success' && fileItem.cvId) {
        uploadedCvIds.push(fileItem.cvId)
        continue
      }

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f
      ))

      try {
        const uploaded = await apiClient.uploadCV(fileItem.file)
        uploadedCvIds.push(uploaded.id)
        
        // Update to success
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, cvId: uploaded.id, status: 'success', progress: 100 } : f
        ))
        successCount++
      } catch (err: any) {
        // Update to error
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'error', 
            progress: 0,
            error: err.message || 'Upload failed'
          } : f
        ))
        errorCount++
      }
    }

    setUploading(false)

    if (uploadedCvIds.length > 0) {
      toast.success(`${uploadedCvIds.length} CV(s) uploaded. Preparing batch ranking...`)

      try {
        // waitForDocumentsReady now returns only the successfully completed CV IDs
        const readyCvIds = await waitForDocumentsReady(uploadedCvIds)

        if (!readyCvIds || readyCvIds.length === 0) {
          toast.error('No CVs were processed successfully. Please check the files and try again.')
          return
        }

        if (readyCvIds.length < uploadedCvIds.length) {
          toast.warning(`${readyCvIds.length} of ${uploadedCvIds.length} CVs ready — ranking with available CVs.`)
        }

        setAnalyzingBatch(true)
        const result = await apiClient.batchRankUploadedCandidates(readyCvIds, selectedJd)
        setBatchResult(result)
        toast.success('Batch ranking completed')
      } catch (err: any) {
        toast.error(err.message || 'Batch ranking failed')
      } finally {
        setProcessingDocuments(false)
        setAnalyzingBatch(false)
      }
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} CV(s) failed to upload`)
    }
  }

  const clearAll = () => {
    setFiles([])
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const busy = uploading || processingDocuments || analyzingBatch
  const rankedCandidates: RankedCandidate[] = [...(batchResult?.leaderboard || [])].sort((a, b) => {
    if (sortBy === 'rank') return a.rank - b.rank
    if (sortBy === 'composite_score') return (b.composite_score || 0) - (a.composite_score || 0)
    return (b.scores_breakdown?.[sortBy] || 0) - (a.scores_breakdown?.[sortBy] || 0)
  })

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6" style={FONT}>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
          <FolderUp size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Bulk Upload CVs</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
            Upload up to {MAX_FILES} CVs at once - {ACCEPTED_FORMAT_LABEL} - Max {MAX_MB}MB each
          </p>
        </div>
      </div>

      {/* Job target */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-2">
          <BarChart3 size={14} className="text-blue-500" />
          Target Job Description
        </label>
        <select
          value={selectedJd}
          onChange={(e) => {
            if (e.target.value === '__create_jd__') {
              router.push('/jobs/new')
              return
            }
            setSelectedJd(e.target.value)
          }}
          disabled={busy}
          className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
        >
          <option value="">Select a job description for batch ranking</option>
          {jobDescriptions.map((jd) => (
            <option key={jd.id} value={jd.id}>
              {jd.title}
            </option>
          ))}
          <option value="__create_jd__">+ Create new job description</option>
        </select>
        {jobDescriptions.length === 0 && (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              No job descriptions yet. Create one first so the uploaded CVs can be ranked together.
            </p>
            <button
              type="button"
              onClick={() => router.push('/jobs/new')}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
            >
              <PlusCircle size={14} />
              Create JD
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{files.length}</div>
            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Total Files</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Pending</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successCount}</div>
            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Uploaded</div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errorCount}</div>
            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Failed</div>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <motion.div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.01]'
            : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT_ATTRIBUTE}
          multiple
          onChange={handleFileInput}
        />

        <div className="p-12 flex flex-col items-center gap-6 text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
            dragActive ? 'bg-blue-100 dark:bg-blue-500/20 scale-110' : 'bg-gray-100 dark:bg-slate-700'
          }`}>
            <FolderUp size={32} className={dragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {dragActive ? 'Drop your files here' : 'Drag & drop multiple CVs'}
            </p>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1.5">
              or <span className="text-blue-600 dark:text-blue-400 font-semibold">click to browse</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2">
              Select up to {MAX_FILES} files - {ACCEPTED_FORMAT_LABEL} - Max {MAX_MB}MB each
            </p>
          </div>
        </div>
      </motion.div>

      {/* Files list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Files Queue</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
                  {files.length} file{files.length > 1 ? 's' : ''} ready to upload
                </p>
              </div>
              <button
                onClick={clearAll}
                disabled={uploading}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>

            {/* Files */}
            <div className="max-h-96 overflow-y-auto">
              {files.map((fileItem, index) => {
                const ext = fileItem.file.name.split('.').pop()?.toUpperCase() || 'PDF'
                const sizeMB = (fileItem.file.size / 1024 / 1024).toFixed(2)
                const StatusIcon = 
                  fileItem.status === 'success' ? CheckCircle2 :
                  fileItem.status === 'error' ? XCircle :
                  fileItem.status === 'uploading' ? Loader2 : Clock

                return (
                  <motion.div
                    key={fileItem.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.03 }}
                    className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {fileItem.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-neutral-400">
                            {ext} - {sizeMB} MB
                          </span>
                          {fileItem.error && (
                            <>
                              <span className="text-xs text-gray-300 dark:text-slate-600">-</span>
                              <span className="text-xs text-red-600 dark:text-red-400">{fileItem.error}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusIcon
                          size={18}
                          className={`${
                            fileItem.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                            fileItem.status === 'error' ? 'text-red-600 dark:text-red-400' :
                            fileItem.status === 'uploading' ? 'text-blue-600 dark:text-blue-400 animate-spin' :
                            'text-gray-400 dark:text-neutral-500'
                          }`}
                        />
                        {fileItem.status === 'pending' && !uploading && (
                          <button
                            onClick={() => removeFile(fileItem.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={uploadAll}
            disabled={busy || files.length === 0 || !selectedJd}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading {successCount + 1} of {files.length}...
              </>
            ) : processingDocuments ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing CVs ({processingProgress.done}/{processingProgress.total})...
              </>
            ) : analyzingBatch ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Ranking candidates together...
              </>
            ) : (
              <>
                <Zap size={16} />
                {pendingCount > 0 ? `Upload & Rank ${files.length} CV${files.length > 1 ? 's' : ''}` : `Analyze & Rank ${successCount} CV${successCount > 1 ? 's' : ''}`}
                <ArrowRight size={16} />
              </>
            )}
          </button>
          {successCount > 0 && !uploading && (
            <button
              onClick={() => router.push('/documents')}
              className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-sm"
            >
              <BarChart3 size={16} />
              View Documents
            </button>
          )}
        </div>
      )}

      {/* Batch ranking results */}
      {batchResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                <Award size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Batch Ranking Results</h2>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                  Best candidate: <span className="font-semibold text-gray-800 dark:text-white">{batchResult.comparison?.best_candidate_name || 'N/A'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{batchResult.total_candidates}</div>
                <div className="text-xs text-gray-500 dark:text-neutral-400">Candidates ranked</div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-slate-700" />
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300">
                <SlidersHorizontal size={14} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="rank">Sort by rank</option>
                  <option value="composite_score">Overall score</option>
                  <option value="skills_match">Skills match</option>
                  <option value="semantic_similarity">Semantic similarity</option>
                  <option value="experience_level">Experience alignment</option>
                </select>
              </label>
            </div>
          </div>

          {batchResult.comparison && (
            <div className="px-6 py-4 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-100 dark:border-blue-500/20">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {batchResult.comparison.recommendation}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Shared strengths</p>
                  <div className="flex flex-wrap gap-1">
                    {(batchResult.comparison.shared_strengths || []).slice(0, 8).map((skill: string) => (
                      <span key={skill} className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 text-[11px] text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">Common gaps</p>
                  <div className="flex flex-wrap gap-1">
                    {(batchResult.comparison.common_gaps || []).slice(0, 8).map((gap: string) => (
                      <span key={gap} className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 text-[11px] text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-500/20">
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {rankedCandidates.map((candidate) => {
              const pct = scorePct(candidate.composite_score)
              const scoreClass = pct >= 85
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                : pct >= 70
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'

              return (
                <div key={candidate.cv_id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">#{candidate.rank}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{candidate.filename}</h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1 line-clamp-2">
                          {candidate.summary || 'Ranked by semantic relevance, skills match, experience alignment, and fit indicators.'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-xs font-semibold text-gray-700 dark:text-neutral-300">
                            {candidate.rank_category}
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-violet-50 dark:bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">
                            {candidate.recommendation}
                          </span>
                          {candidate.confidence && (
                            <span className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300">
                              Confidence: {candidate.confidence}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={`px-4 py-3 rounded-xl border text-center shrink-0 ${scoreClass}`}>
                      <div className="text-3xl font-bold">{pct}%</div>
                      <div className="text-[10px] uppercase font-semibold tracking-wide">Overall</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mt-5">
                    {[
                      ['Skills', candidate.scores_breakdown?.skills_match],
                      ['Semantic', candidate.scores_breakdown?.semantic_similarity],
                      ['Experience', candidate.scores_breakdown?.experience_level],
                      ['Culture', candidate.scores_breakdown?.cultural_fit],
                    ].map(([label, value]) => (
                      <div key={label as string} className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-gray-600 dark:text-neutral-300">{label as string}</span>
                          <span className="text-gray-500 dark:text-neutral-400">{scorePct(value as number)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${scorePct(value as number)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Evidence for match
                      </p>
                      <div className="space-y-1.5">
                        {(candidate.evidence_for_match?.length ? candidate.evidence_for_match : candidate.matching_skills).slice(0, 5).map((item) => (
                          <div key={item} className="text-xs text-gray-700 dark:text-neutral-300 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg px-3 py-2">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                        <AlertCircle size={13} /> Gaps and concerns
                      </p>
                      <div className="space-y-1.5">
                        {(candidate.evidence_against_match?.length ? candidate.evidence_against_match : candidate.missing_skills).slice(0, 5).map((item) => (
                          <div key={item} className="text-xs text-gray-700 dark:text-neutral-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Info */}
      <div className="flex items-center justify-center gap-6 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <CheckCircle2 size={13} className="text-emerald-500" /> PII auto-masked
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <Zap size={13} className="text-blue-500" /> Batch processing
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <CheckCircle2 size={13} className="text-violet-500" /> GDPR compliant
        </div>
      </div>
    </div>
  )
}
