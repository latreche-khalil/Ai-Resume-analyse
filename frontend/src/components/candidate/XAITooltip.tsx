'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function XAITooltip({ score, explanation, onRequestExplanation }: any) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="relative inline-block">
      <button 
        onMouseEnter={() => { setShow(true); onRequestExplanation() }}
        onMouseLeave={() => setShow(false)}
        className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px] hover:bg-sky-500/40 transition-colors"
      >🛡️</button>
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute right-0 top-7 w-64 p-4 bg-white dark:bg-gray-900 border theme-border rounded-xl shadow-2xl z-50 pointer-events-none"
          >
            <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1">AI Explanation</p>
            <p className="text-xs theme-text leading-relaxed">{explanation || 'Analyzing score factors...'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
