'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, X, ArrowRight,
  Zap, Target, BrainCircuit, ShieldCheck, Cpu, AlertCircle, FileType
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const FONT = { fontFamily: 'Roboto, sans-serif' }
const MAX_MB = 10

const FEATURES = [
  { icon: BrainCircuit, color: '#6366f1', bg: 'bg-violet-50 dark:bg-violet-500/10', label: 'Semantic Parsing',  desc: 'Goes beyond keywords to understand context and experience.' },
  { icon: Target,       color: '#0ea5e9', bg: 'bg-sky-50 dark:bg-sky-500/10',       label: 'ATS Optimization', desc: 'Formatted for top enterprise applicant tracking systems.' },
  { icon: Cpu,          color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'AI Extraction',   desc: 'Automated skill and experience profiling in seconds.' },
]

export default function CandidateUploadView() {
  const [file, setFile]         = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  const validate = (f: File): string | null => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png'].includes(ext))
      return 'Invalid file type. Please upload a PDF, Word document, or image (JPG/PNG).'
    if (f.size > MAX_MB * 1024 * 1024)
      return `File too large. Maximum size is ${MAX_MB}MB.`
    return null
  }

  const pick = useCallback((f: File) => {
    const err = validate(f)
    if (err) { setError(err); setFile(null); return }
    setError(null); setFile(f)
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    if (e.dataTransfer.files?.[0]) pick(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      await apiClient.uploadCV(file)
      toast.success('Resume uploaded successfully!')
      router.push('/documents')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const ext    = file?.name.split('.').pop()?.toUpperCase() ?? ''
  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : ''

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6" style={FONT}>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
          <Upload size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Upload Resume</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">PDF, DOCX, DOC, JPG, JPEG, PNG · Max {MAX_MB}MB</p>
        </div>
      </div>

      {/* Drop zone */}
      <motion.div
        onDragEnter={handleDrag} onDragLeave={handleDrag}
        onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
          !file ? 'cursor-pointer' : ''
        } ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.01]'
            : file
              ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5'
              : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0f0f11] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          onChange={e => { if (e.target.files?.[0]) pick(e.target.files[0]) }} />

        <div className="p-12 flex flex-col items-center gap-6 text-center">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
                  dragActive ? 'bg-blue-100 dark:bg-blue-500/20 scale-110' : 'bg-gray-100 dark:bg-slate-800'
                }`}>
                  <Upload size={32} className={dragActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {dragActive ? 'Drop your file here' : 'Drag & drop your resume'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1.5">
                    or <span className="text-blue-600 dark:text-blue-400 font-semibold">click to browse</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-500 bg-gray-50 dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700">
                  <span className="flex items-center gap-1"><FileType size={12} /> PDF / DOCX</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><FileType size={12} /> JPG / PNG (OCR)</span>
                  <span>·</span>
                  <span>Max {MAX_MB}MB</span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-5 w-full max-w-sm">
                {/* CV thumbnail */}
                <div className="relative w-32 aspect-[3/4] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <div className="absolute inset-0 flex flex-col p-3 gap-2">
                    <div className="w-1/2 h-2 bg-blue-200 dark:bg-blue-500/30 rounded-full" />
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className={`h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full ${i % 3 === 0 ? 'w-3/4' : 'w-full'}`} />
                    ))}
                    <div className="mt-1 w-1/3 h-2 bg-emerald-200 dark:bg-emerald-500/30 rounded-full" />
                    {[1,2,3].map(i => (
                      <div key={i} className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full w-full" />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText size={36} className="text-blue-400/30" strokeWidth={1} />
                  </div>
                </div>

                {/* File info */}
                <div className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                    <FileText size={22} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{file.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                      <CheckCircle2 size={11} /> {ext} · {sizeMB} MB · Ready
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setError(null) }}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-500 flex items-center justify-center transition-all">
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OCR/Scanned PDF Notice */}
      <div className="p-4 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-2xl flex items-start gap-3 text-left">
        <Cpu className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" size={16} />
        <div>
          <p className="text-xs font-bold text-violet-900 dark:text-violet-200 uppercase tracking-wider">Scanned CV & Image OCR Support</p>
          <p className="text-xs text-violet-700 dark:text-violet-300 mt-1 leading-relaxed">
            Our ingestion system uses state-of-the-art <strong>Optical Character Recognition (OCR)</strong> and structural parsing (via IBM Docling & EasyOCR) to extract text from scanned documents, PDFs, and image formats (JPG/PNG) exactly as they are.
          </p>
        </div>
      </div>

      {/* Upload button */}
      <button onClick={handleUpload} disabled={!file || uploading}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm">
        {uploading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
        ) : (
          <><Zap size={16} /> Upload Resume <ArrowRight size={16} /></>
        )}
      </button>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, color, bg, label, desc }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="p-5 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
              <Icon size={18} style={{ color }} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{label}</h4>
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="flex items-center justify-center gap-6 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <ShieldCheck size={13} className="text-emerald-500" /> PII auto-masked
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <Zap size={13} className="text-blue-500" /> Processed in seconds
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700" />
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
          <CheckCircle2 size={13} className="text-violet-500" /> GDPR compliant
        </div>
      </div>

    </div>
  )
}
