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
  const [displayPercentage, setDisplayPercentage] = useState(0)
  
  useEffect(() => {
    let start = 0
    const end = Math.round(score * 100)
    if (start === end) {
      setDisplayPercentage(end)
      return
    }

    let totalDuration = 1500
    let iterationTime = totalDuration / Math.max(end, 1)

    let timer = setInterval(() => {
      start += 1
      if (start <= end) {
        setDisplayPercentage(start)
      } else {
        clearInterval(timer)
      }
    }, iterationTime)

    return () => clearInterval(timer)
  }, [score])
  
  const percentage = Math.round(score * 100)
  const size = 180
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score * circumference)
  
  // Rotation for the needle (starts from top)
  const rotation = score * 360
  
  // Optimized color thresholds: Green starts at 60% for a better user experience
  const theme = {
    color: percentage >= 60 ? '#10B981' : percentage >= 40 ? '#3B82F6' : percentage >= 25 ? '#F59E0B' : '#EF4444',
    label: percentage >= 85 ? 'Exceptional' : percentage >= 60 ? 'Strong' : percentage >= 40 ? 'Good' : percentage >= 25 ? 'Fair' : 'Low'
  }
  
  return (
    <div className="flex flex-col items-center">
      {/* Corporate Gauge with Dynamic Color Needle */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="theme-text-quaternary opacity-5"
          />
          
          {/* Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Needle / Pointer - Color synced to theme.color */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none transition-transform duration-[1500ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-4.5"
            style={{ 
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              backgroundColor: theme.color,
              boxShadow: `0 0 10px ${theme.color}80`
            }}
          />
        </div>

        {/* Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-5xl font-black theme-text leading-none tracking-tighter"
          >
            {displayPercentage}
          </motion.span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] theme-text-tertiary mt-1">
            Match Index
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-6 px-4 py-1.5 rounded-full border theme-border bg-white/5 backdrop-blur-sm flex items-center gap-2"
      >
        <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: theme.color, color: theme.color }} />
        <span className="text-xs font-bold theme-text-secondary uppercase tracking-widest">
          {theme.label} Alignment
        </span>
      </motion.div>
    </div>
  )
}
