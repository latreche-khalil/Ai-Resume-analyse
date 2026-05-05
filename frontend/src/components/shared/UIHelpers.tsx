'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple'
  count?: number
}

export function Section({ title, children, color = 'blue', count }: SectionProps) {
  const colorMap = {
    red: 'from-red-500/20 to-transparent border-red-500/30 text-red-300',
    yellow: 'from-yellow-500/20 to-transparent border-yellow-500/30 text-yellow-300',
    green: 'from-green-500/20 to-transparent border-green-500/30 text-green-300',
    blue: 'from-blue-500/20 to-transparent border-blue-500/30 text-blue-300',
    purple: 'from-purple-500/20 to-transparent border-purple-500/30 text-purple-300',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px]">{count}</span>
          )}
        </h3>
      </div>
      <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-2xl p-4 shadow-xl backdrop-blur-sm`}>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-white/40 text-sm font-medium">{children}</p>
    </div>
  )
}

interface GapCardProps {
  gap: any
  color: 'red' | 'yellow' | 'blue'
}

export function GapCard({ gap, color }: GapCardProps) {
  const isRed = color === 'red'
  const isYellow = color === 'yellow'
  const isBlue = color === 'blue'
  
  const colorClasses = isRed 
    ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' 
    : isYellow 
      ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15'
      : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'

  const textClasses = isRed ? 'text-red-300' : isYellow ? 'text-yellow-300' : 'text-blue-300'
  const badgeClasses = isRed ? 'text-red-400' : isYellow ? 'text-yellow-400' : 'text-blue-400'
  const iconClasses = isRed ? 'bg-red-500/20 text-red-400' : isYellow ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'

  return (
    <div className={`p-4 rounded-xl border transition-all ${colorClasses}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className={`font-bold mb-1 ${textClasses}`}>
            {gap.skill || gap.gap}
          </div>
          <p className="text-xs text-white/70 leading-relaxed mb-3">
            {gap.reason || gap.required}
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/50 uppercase">
              Impact: <span className={badgeClasses}>{gap.impact}</span>
            </span>
            <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/50 uppercase">
              Weight: {gap.weight}
            </span>
          </div>
        </div>
        
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${iconClasses}`}>
          {isRed ? '❌' : isYellow ? '⚠️' : 'ℹ️'}
        </div>
      </div>
    </div>
  )
}
