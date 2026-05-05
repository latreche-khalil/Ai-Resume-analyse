'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: 'sky' | 'blue' | 'indigo' | 'green' | 'yellow' | 'red'
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showLabel = false,
  color = 'sky',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const colorClasses = {
    sky: 'bg-sky-600',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 text-right">{percentage.toFixed(0)}%</div>
      )}
    </div>
  )
}
