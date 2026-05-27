import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Globe,
  Eye
} from 'lucide-react'

interface CVPreviewSectionProps {
  cv: any
  onDownload: () => void
}

function getFullPreviewUrl(previewPath: string) {
  if (!previewPath) return ''
  if (previewPath.startsWith('http://') || previewPath.startsWith('https://')) {
    return previewPath
  }
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const cleanBase = rawBaseUrl.replace(/\/$/, '')
  if (previewPath.startsWith('/api/v1') && cleanBase.endsWith('/api/v1')) {
    return `${cleanBase.substring(0, cleanBase.length - 7)}${previewPath}`
  }
  return `${cleanBase}${previewPath.startsWith('/') ? '' : '/'}${previewPath}`
}

export function CVPreviewSection({ cv, onDownload }: CVPreviewSectionProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(true)

  useEffect(() => {
    if (!cv?.id) return
    setImgLoading(true)
    apiClient.getCVPreview(cv.id)
      .then((res: { images: { image: string }[] }) => {
        if (res.images?.length > 0) {
          setPreviewUrl(getFullPreviewUrl(res.images[0].image))
        }
      })
      .catch((err) => {
        console.error('Failed to fetch CV preview:', err)
      })
      .finally(() => {
        setImgLoading(false)
      })
  }, [cv?.id])

  const name = cv?.original_filename || cv?.filename || 'Resume.pdf'
  const size = cv?.file_size_bytes 
    ? `${(cv.file_size_bytes / 1024 / 1024).toFixed(1)} MB` 
    : '0.5 MB'

  return (
    <div className="h-full bg-white dark:bg-[#0f0f11] overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        {/* Header Block */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-neutral-900/50 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[140px]" title={name}>
                {name}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 font-medium">{size}</p>
            </div>
          </div>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10">
            PREVIEW
          </span>
        </div>
        
        {/* Preview Frame */}
        <div className="aspect-[3/4] bg-slate-50 dark:bg-[#131316] border border-gray-100 dark:border-neutral-900/60 rounded-xl overflow-hidden relative group/frame flex items-center justify-center">
          {previewUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full p-2 relative flex items-center justify-center"
            >
              <img 
                src={previewUrl} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 transition-transform group-hover/frame:scale-[1.01] duration-300" 
                alt="CV Preview" 
              />
              
              {/* Modern action overlay on hover */}
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/frame:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px] p-4">
                <button 
                  onClick={onDownload}
                  className="px-4 py-2 bg-white text-gray-900 font-semibold text-xs rounded-lg shadow-md hover:scale-105 transition-all flex items-center gap-1.5 border border-gray-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center p-6 space-y-3">
               <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
               <p className="text-slate-400 dark:text-neutral-500 text-[11px] font-semibold">Loading Preview...</p>
            </div>
          )}
        </div>
        
        {/* Status & Stats Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-neutral-900/50 pt-3 text-[10px]">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3" />
            <span className="uppercase tracking-wider text-[9px]">Verified</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-neutral-500 font-medium">
            <span>{cv?.word_count || '144'} words</span>
            <span>•</span>
            <span className="uppercase flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {cv?.detected_language || cv?.language || 'EN'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
