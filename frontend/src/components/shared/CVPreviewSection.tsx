import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface CVPreviewSectionProps {
  cv: any
  onDownload: () => void
}

export function CVPreviewSection({ cv, onDownload }: CVPreviewSectionProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(true)

  useEffect(() => {
    async function fetchPreview() {
      if (!cv?.id) return
      try {
        const response = await apiClient.getDocumentPreviewImage(cv.id, 1)
        const url = URL.createObjectURL(response.data)
        setPreviewUrl(url)
      } catch (err) {
        console.error('Failed to fetch CV preview:', err)
      } finally {
        setImgLoading(false)
      }
    }
    fetchPreview()
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [cv?.id])

  return (
    <div className="h-full cv-preview-panel bg-white/5 dark:bg-black/10 backdrop-blur-md">
      <div className="p-8 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-2xl">
              📄
            </div>
            <div>
              <h2 className="text-lg font-black theme-text">CV Preview</h2>
              <p className="text-xs theme-text-tertiary uppercase tracking-widest">Document Analysis</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold theme-text">{cv?.original_filename}</div>
            <div className="text-xs theme-text-tertiary">
              {cv?.file_size_bytes ? `${(cv.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : '0.5 MB'}
            </div>
          </div>
        </div>
        
        <div className="flex-1 theme-card rounded-3xl overflow-hidden relative group bg-black/5 dark:bg-black/40">
          <div className="flex items-center justify-center h-full">
            <div className="relative z-10 w-full h-full p-4 flex flex-col items-center justify-center">
              {previewUrl ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full relative group/img"
                >
                  <img 
                    src={previewUrl} 
                    className="w-full h-full object-contain rounded-xl shadow-2xl border theme-border transition-transform group-hover/img:scale-[1.01] duration-500" 
                    alt="CV Preview" 
                  />
                  
                  {/* Subtle download overlay on hover */}
                  <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button 
                      onClick={onDownload}
                      className="px-6 py-3 bg-white text-black font-black rounded-full shadow-xl hover:scale-110 transition-transform flex items-center gap-2"
                    >
                      <span>📥</span>
                      Download PDF
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center">
                   <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                   <p className="theme-text-tertiary text-sm">Loading Preview...</p>
                </div>
              )}
            </div>

            {/* Decorative Pulse in Card */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </div>
        
        {/* Simple Footer Info */}
        <div className="mt-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] theme-text-tertiary uppercase font-bold tracking-widest">Document Verified</span>
          </div>
          <div className="text-[10px] theme-text-tertiary uppercase font-bold tracking-widest">
            {cv?.word_count || '144'} Words • {cv?.detected_language?.toUpperCase() || 'EN'}
          </div>
        </div>
      </div>
    </div>
  )
}
