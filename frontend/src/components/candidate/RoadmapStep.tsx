'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Rocket } from 'lucide-react'
import { RoadmapStepData } from '@/types/candidate'

export function RoadmapStep({ step, isLast }: { step: RoadmapStepData; isLast: boolean }) {
  const isActive = step.status === 'active'
  const isDone = step.status === 'done'

  return (
    <motion.div 
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-8 group"
    >
      <div className="flex flex-col items-center">
        <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
          isDone ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 
          isActive ? 'bg-sky-600 text-white shadow-sky-600/20 ring-4 ring-sky-500/10' : 
          'bg-slate-200 dark:bg-white/10 border-2 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'
        }`}>
          {isDone ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : isActive ? (
            <Rocket className="w-6 h-6 animate-pulse" />
          ) : (
            <span className="text-xs font-black tracking-tighter opacity-80">{step.step}</span>
          )}
          
          {isActive && (
            <div className="absolute inset-0 rounded-2xl bg-sky-400/20 animate-ping pointer-events-none" />
          )}
        </div>
        
        {!isLast && (
          <div className={`w-[2px] h-full my-3 transition-all duration-700 ${
            isDone ? 'bg-emerald-600/40' : 'bg-slate-300 dark:bg-white/10'
          }`} />
        )}
      </div>

      <div className="pb-10 pt-1.5">
        <div className="flex items-center gap-4 mb-2">
          <h5 className={`text-lg font-bold tracking-tight transition-colors ${
            isActive ? 'text-slate-900 dark:text-white' : isDone ? 'text-slate-500' : 'text-slate-600 dark:text-slate-500'
          }`}>
            {step.title}
          </h5>
          {isActive && (
            <span className="px-3 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">
              Active Milestone
            </span>
          )}
        </div>
        <p className={`text-base leading-relaxed font-normal transition-colors ${
          isActive ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
        }`}>
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}
