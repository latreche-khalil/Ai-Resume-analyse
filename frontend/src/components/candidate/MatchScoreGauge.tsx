
'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface MatchScoreGaugeProps {
  score: number // 0-1
  confidence?: number // 0-1
}

export function MatchScoreGauge({ 
  score, 
  confidence = 0.8
}: MatchScoreGaugeProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0)
  
  useEffect(() => {
    let start = 0
    const end = Math.round(score * 100)
    if (start === end) {
      setDisplayPercentage(end)
      return
    }

    const totalDuration = 1000
    const iterationTime = totalDuration / Math.max(end, 1)

    const timer = setInterval(() => {
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
  const strokeWidth = 10
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score * circumference)
  
  const getTheme = () => {
    if (percentage >= 80) return { color: '#059669', label: 'Exceptional' }
    if (percentage >= 60) return { color: '#0284c7', label: 'Strong' }
    if (percentage >= 40) return { color: '#d97706', label: 'Fair' }
    return { color: '#e11d48', label: 'Weak' }
  }

  const theme = getTheme()
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute transform -rotate-90">
          <defs>
            <linearGradient id="minimalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={theme.color} />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-100 dark:text-slate-800"
          />
          
          {/* Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#minimalGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>

        {/* Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-0"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <div className="flex items-start justify-center">
               <span className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  {displayPercentage}
               </span>
               <span className="text-base font-medium text-gray-400 mt-1.5 ml-0.5">%</span>
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mt-1">
               Match
            </div>
          </motion.div>
        </div>
      </div>

      {/* Label Pill */}
      <div className="mt-3 px-3 py-1 rounded-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center gap-1.5" style={{ fontFamily: 'Roboto, sans-serif' }}>
         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.color }} />
         <span className="text-[10px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">{theme.label}</span>
      </div>
    </div>
  )
}
