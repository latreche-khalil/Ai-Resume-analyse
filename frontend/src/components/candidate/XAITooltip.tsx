import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface XAITooltipProps {
  score: number
  explanation?: string
  onRequestExplanation?: () => void
}

export function XAITooltip({ score, explanation, onRequestExplanation }: XAITooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!explanation && onRequestExplanation) {
      setLoading(true)
      await onRequestExplanation()
      setLoading(false)
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className="ml-2 w-5 h-5 rounded-full bg-sky-500/20 hover:bg-sky-500/40 transition-colors flex items-center justify-center text-xs text-sky-400 border border-sky-500/30"
        title="View AI Explanation"
      >
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⟳
          </motion.div>
        ) : (
          'ℹ️'
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute z-50 top-8 left-0 w-80 p-4 rounded-xl theme-card border border-sky-500/30 shadow-xl"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xl">🤖</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-sky-400 mb-1">AI Explanation</p>
                {explanation ? (
                  <p className="text-sm theme-text leading-relaxed">{explanation}</p>
                ) : (
                  <p className="text-sm theme-text-tertiary italic">
                    Run an analysis to get AI-powered insights about your score.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs theme-text-tertiary hover:theme-text"
              >
                ✕
              </button>
            </div>
            
            {/* Score breakdown */}
            {explanation && (
              <div className="mt-3 pt-3 border-t theme-border space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="theme-text-secondary">Match Quality</span>
                  <span className="text-sky-400 font-semibold">60%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="theme-text-secondary">Skills Coverage</span>
                  <span className="text-blue-400 font-semibold">20%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="theme-text-secondary">Experience</span>
                  <span className="text-green-400 font-semibold">20%</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
