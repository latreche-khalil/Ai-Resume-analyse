'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface QuickActionsBarProps {
  onExportPDF: () => void
  onExportCSV: () => void
  onShare?: () => void
  onCoaching?: () => void
  onInterview?: () => void
  isExporting?: boolean
}

export function QuickActionsBar({
  onExportPDF,
  onExportCSV,
  onShare,
  onCoaching,
  onInterview,
  isExporting = false
}: QuickActionsBarProps) {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Export PDF */}
      <motion.button
        onClick={onExportPDF}
        disabled={isExporting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
      >
        <span className="text-lg">📄</span>
        <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
      </motion.button>

      {/* Export CSV */}
      <motion.button
        onClick={onExportCSV}
        disabled={isExporting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
      >
        <span className="text-lg">📊</span>
        <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
      </motion.button>

      {/* Share Button */}
      {onShare && (
        <div className="relative">
          <motion.button
            onClick={() => setShowShareMenu(!showShareMenu)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 theme-card border theme-border hover:border-purple-500/50 rounded-xl font-medium text-sm transition-all shadow-lg"
          >
            <span className="text-lg">🔗</span>
            <span>Share</span>
          </motion.button>

          {/* Share Menu */}
          {showShareMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 right-0 theme-card border theme-border rounded-xl shadow-2xl overflow-hidden z-10 min-w-[200px]"
            >
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm"
              >
                <span className="text-lg">{copied ? '✓' : '📋'}</span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={() => {
                  window.open(`mailto:?subject=Analysis Results&body=Check out my analysis: ${window.location.href}`, '_blank')
                  setShowShareMenu(false)
                }}
                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 text-sm border-t theme-border"
              >
                <span className="text-lg">📧</span>
                <span>Email</span>
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Coaching Button */}
      {onCoaching && (
        <motion.button
          onClick={onCoaching}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-medium text-sm transition-all shadow-lg shadow-purple-500/20"
        >
          <span className="text-lg">🤖</span>
          <span>AI Coach</span>
        </motion.button>
      )}

      {/* Interview Button */}
      {onInterview && (
        <motion.button
          onClick={onInterview}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 theme-card border theme-border hover:border-blue-500/50 rounded-xl font-medium text-sm transition-all shadow-lg"
        >
          <span className="text-lg">🎤</span>
          <span>Mock Interview</span>
        </motion.button>
      )}
    </div>
  )
}
