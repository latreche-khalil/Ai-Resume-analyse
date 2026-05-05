'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface CVPreviewProps {
  documentId: string
  className?: string
}

interface CVPage {
  page: number
  image: string
  width: number
  height: number
}

export function CVPreview({ documentId, className = '' }: CVPreviewProps) {
  const [pages, setPages] = useState<CVPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    loadCVPreview()
  }, [documentId])

  const loadCVPreview = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getCVPreview(documentId)
      setPages(response.images || [])
      
      if (response.images?.length === 0) {
        setError('No preview available for this CV')
      }
    } catch (err: any) {
      console.error('CV Preview error:', err)
      setError(err.response?.data?.detail || 'Failed to load CV preview')
    } finally {
      setLoading(false)
    }
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const zoomIn = () => setZoom(Math.min(zoom + 0.2, 2))
  const zoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5))

  if (loading) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-2xl p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-white/60 text-sm">Loading CV preview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-2xl p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-6xl">📄</div>
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button 
            onClick={loadCVPreview}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-2xl p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-6xl">📄</div>
          <p className="text-white/60 text-sm">No pages to display</p>
        </div>
      </div>
    )
  }

  const currentPageData = pages[currentPage]

  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-lg">📄</div>
          <div>
            <div className="font-semibold text-sm text-white">CV Preview</div>
            <div className="text-xs text-white/50">
              Page {currentPage + 1} of {pages.length}
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <button
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <span className="text-xs text-white/60 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            disabled={zoom >= 2}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          {/* Page Navigation */}
          {pages.length > 1 && (
            <>
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={nextPage}
                disabled={currentPage === pages.length - 1}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* CV Image Display */}
      <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 min-h-[500px] max-h-[800px] overflow-auto">
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-lg shadow-2xl overflow-hidden"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center'
              }}
            >
              <img
                src={currentPageData.image}
                alt={`CV Page ${currentPage + 1}`}
                className="max-w-full h-auto block"
                style={{
                  maxWidth: '100%',
                  height: 'auto'
                }}
                onError={(e) => {
                  console.error('Image load error:', e)
                  setError('Failed to load CV image')
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Page Indicators */}
      {pages.length > 1 && (
        <div className="bg-white/5 border-t border-white/10 px-4 py-2">
          <div className="flex justify-center space-x-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPage 
                    ? 'bg-purple-500' 
                    : 'bg-white/20 hover:bg-white/40'
                }`}
                title={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
