
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Search } from 'lucide-react'

interface SectionProps {
  title: string
  children: ReactNode
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple'
  count?: number
  icon?: any
}

export function Section({ title, children, color = 'blue', count, icon: Icon }: SectionProps) {
  const colorMap = {
    red: 'bg-rose-500/[0.03] dark:bg-rose-500/[0.06] border-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-400',
    yellow: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.06] border-amber-500/10 dark:border-amber-500/20 text-amber-600 dark:text-amber-400',
    green: 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] border-emerald-500/10 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-sky-500/[0.03] dark:bg-sky-500/[0.06] border-sky-500/10 dark:border-sky-500/20 text-sky-600 dark:text-sky-400',
    purple: 'bg-purple-500/[0.03] dark:bg-purple-500/[0.06] border-purple-500/10 dark:border-purple-500/20 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3" />}
          {title}
          {count !== undefined && (
            <span className="text-slate-300 dark:text-slate-100 bg-slate-800 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold ml-1">
              {count}
            </span>
          )}
        </h3>
      </div>
      <div className={`p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${colorMap[color]}`}>
        {children}
      </div>
    </div>
  )
}

export function Empty({ title, subtitle, icon: Icon = Search }: { title?: string; subtitle?: string; icon?: any }) {
  return (
    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h4 className="text-slate-900 dark:text-white font-bold text-sm">{title || 'No data available'}</h4>
        <p className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px] mx-auto leading-tight">{subtitle || 'Our AI engine is still gathering insights.'}</p>
      </div>
    </div>
  )
}

export function GapCard({ gap, color }: { gap: any; color: 'red' | 'yellow' | 'blue' }) {
  const isRed = color === 'red'
  const isYellow = color === 'yellow'
  
  const icon = isRed ? AlertCircle : isYellow ? AlertTriangle : Info
  const colorClass = isRed ? 'text-rose-600 dark:text-rose-400' : isYellow ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'
  const bgClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'

  return (
    <motion.div 
      whileHover={{ y: -1 }}
      className={`p-5 rounded-xl border shadow-sm transition-all ${bgClass}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${colorClass}`}>
          {/* @ts-ignore */}
          <icon className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="space-y-0.5">
             <div className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{gap.skill || gap.gap}</div>
             <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug font-medium">{gap.reason || gap.required}</p>
          </div>
          
          <div className="flex items-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Impact</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>{gap.impact?.toUpperCase() || 'HIGH'}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confidence</span>
              <span className="text-[9px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">{gap.weight || '85%'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
