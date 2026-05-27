'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, X, CheckCircle2, ArrowRight,
  ShieldCheck, Zap, FileType, AlertCircle
} from 'lucide-react'

const FONT = { fontFamily: 'Roboto, sans-serif' }
const MAX_MB = 10
const ACCEPTED = ['.pdf', '.docx']

export default function UploadView() {
  const [file, setFile]         = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  const validate = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED.includes(ext)) return `Unsupported format. Please upload a PDF or DOCX file.`
    if (f.size > MAX_MB * 1024 * 1024) return `File too large. Maximum size is ${MAX_MB}MB.`
    return null
  }

  const pick = useCallback((f: File) => {
    const err = validate(f)
    if (err) { setError(err); setFile(null); return }
    setError(null); setFile(f)
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) pick(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await apiClient.uploadCV(file)
      toast.success('CV uploaded successfully!')
      router.push(`/analysis/new?cv=${res.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  const ext = file?.name.split('.').pop()?.toUpperCase() ?? ''
  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : ''

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6" style={FONT}>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
          <Upload size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Upload Resume</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">PDF or DOCX · Max {MAX_MB}MB</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : file
              ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5'
              : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-[#0f0f11] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5'
        }`}
      >
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx"
          onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }} />

        <div className="p-12 flex flex-col items-center gap-5 text-center">
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div key="file" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                  <FileText size={28} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-base">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{ext} · {sizeMB} MB</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={15} /> Ready to upload
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  dragOver ? 'bg-blue-100 dark:bg-blue-500/20 scale-110' : 'bg-gray-100 dark:bg-slate-800'
                }`}>
                  <Upload size={28} className={dragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-base">
                    {dragOver ? 'Drop your file here' : 'Drag & drop your resume'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                    or <span className="text-blue-600 dark:text-blue-400 font-medium">click to browse</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-500">
                  <span className="flex items-center gap-1"><FileType size={12} /> PDF</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><FileType size={12} /> DOCX</span>
                  <span>·</span>
                  <span>Max {MAX_MB}MB</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Remove button */}
        {file && (
          <button onClick={e => { e.stopPropagation(); setFile(null); setError(null) }}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-500 dark:text-neutral-400 hover:text-red-500 flex items-center justify-center transition-all">
            <X size={14} />
          </button>
        )}
      </div>

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

      {/* Upload button */}
      <button onClick={handleUpload} disabled={!file || uploading}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm">
        {uploading ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
        ) : (
          <><Zap size={16} /> Upload & Continue to Analysis <ArrowRight size={16} /></>
        )}
      </button>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Privacy First', desc: 'PII auto-masked' },
          { icon: Zap,         color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-500/10',    label: 'AI Powered',   desc: 'Semantic analysis' },
          { icon: FileText,    color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-500/10', label: 'Any Format',   desc: 'PDF & DOCX' },
        ].map(({ icon: Icon, color, bg, label, desc }) => (
          <div key={label} className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm text-center space-y-2">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mx-auto`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
            <p className="text-[11px] text-gray-500 dark:text-neutral-400">{desc}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
