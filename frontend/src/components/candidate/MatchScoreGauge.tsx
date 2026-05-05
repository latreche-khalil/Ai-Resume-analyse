'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface MatchScoreGaugeProps {
  score: number // 0-1
  confidence?: number // 0-1
  isBinding?: boolean
  requiresReview?: boolean
}

export function MatchScoreGauge({ 
  score, 
  confidence = 0.8,
  isBinding = false,
  requiresReview = false
}: MatchScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => setDisplayScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])
  
  const percentage = Math.round(displayScore * 100)
  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (displayScore * circumference)
  
  // Color based on score
  const getColor = () => {
    if (percentage >= 80) return { from: '#10B981', to: '#059669', text: 'text-green-400' }
    if (percentage >= 60) return { from: '#3B82F6', to: '#2563EB', text: 'text-blue-400' }
    if (percentage >= 40) return { from: '#F59E0B', to: '#D97706', text: 'text-yellow-400' }
    return { from: '#EF4444', to: '#DC2626', text: 'text-red-400' }
  }
  
  const color = getColor()
  
  // Confidence level
  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return { label: 'High Confidence', color: 'text-green-400', icon: '✓' }
    if (confidence >= 0.6) return { label: 'Medium Confidence', color: 'text-yellow-400', icon: '⚠' }
    return { label: 'Low Confidence', color: 'text-red-400', icon: '!' }
  }
  
  const confidenceInfo = getConfidenceLabel()
  
  return (
    <div className="relative">
      {/* Circular Progress */}
      <div className="relative w-64 h-64 mx-auto">
        <svg className="transform -rotate-90 w-64 h-64">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.from} />
              <stop offset="100%" stopColor={color.to} />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r="120"
            stroke="currentColor"
            strokeWidth="16"
            fill="none"
            className="theme-text-quaternary opacity-20"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx="128"
            cy="128"
            r="120"
            stroke="url(#scoreGradient)"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className={`text-6xl font-bold ${color.text}`}
          >
            {percentage}%
          </motion.div>
          <div className="text-sm theme-text-tertiary mt-2">Match Score</div>
          
          {/* Non-binding badge */}
          {!isBinding && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-3 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300"
            >
              🤝 Advisory Only
            </motion.div>
          )}
        </div>
      </div>
      
      {/* Confidence indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-6 flex items-center justify-center gap-2"
      >
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full theme-card border theme-border`}>
          <span className={confidenceInfo.color}>{confidenceInfo.icon}</span>
          <span className="text-sm theme-text">{confidenceInfo.label}</span>
          <span className="text-xs theme-text-tertiary">({Math.round(confidence * 100)}%)</span>
        </div>
      </motion.div>
      
      {/* Review flag */}
      {requiresReview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl text-sm text-orange-300"
        >
          <span>👤</span>
          <span>Requires Human Review</span>
        </motion.div>
      )}
    </div>
  )
}
