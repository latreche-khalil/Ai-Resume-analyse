'use client'

import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  Sparkles, 
  Target, 
  Zap, 
  Plus,
  HelpCircle,
  AlertTriangle
} from 'lucide-react'

interface Counterfactual {
  change: string
  expected_score: number
  explanation: string
  feasibility?: 'easy' | 'medium' | 'hard'
}

interface CounterfactualsCardProps {
  counterfactuals: Counterfactual[]
  currentScore: number
}

export function CounterfactualsCard({ 
  counterfactuals = [], 
  currentScore 
}: CounterfactualsCardProps) {
  if (counterfactuals.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-6 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/[0.01] to-transparent blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">كيف ترفع نسبتك؟</h3>
          <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">What-If Scenarios & Recommendation Engine</p>
        </div>
      </div>

      <div className="space-y-4">
        {counterfactuals.map((cf, idx) => {
          const safeExpected = Number(cf.expected_score) || 0
          const safeCurrent = Number(currentScore) || 0
          const scoreDiff = (safeExpected - safeCurrent) * 100
          const isPositive = scoreDiff > 0
          
          const feasibilityConfig = {
            easy: { color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10', icon: '✓', label: 'Easy' },
            medium: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10', icon: '⚡', label: 'Medium' },
            hard: { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10', icon: '🔥', label: 'Hard' }
          }
          
          const feasibilityKey = (cf.feasibility || 'medium').toLowerCase()
          const feasibility = feasibilityConfig[feasibilityKey as keyof typeof feasibilityConfig] 
            || (feasibilityKey === 'moderate' ? feasibilityConfig.medium : feasibilityConfig.medium)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 bg-slate-50 dark:bg-[#131316] border border-gray-100 dark:border-neutral-900/60 rounded-xl hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left: Change Description */}
                <div className="flex-1 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 border border-blue-500/10">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cf.change}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed font-medium">
                        {cf.explanation}
                      </p>
                    </div>
                  </div>
                  
                  {/* Feasibility Badge */}
                  {cf.feasibility && (
                    <div className="flex items-center gap-2 pl-9">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${feasibility.color}`}>
                        <span>{feasibility.icon}</span>
                        <span>{feasibility.label}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Score Impact */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 sm:gap-2 border-t sm:border-t-0 border-gray-200/50 dark:border-neutral-800/30 pt-3 sm:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                      {Math.round(safeExpected * 100)}%
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">new score</div>
                  </div>
                  
                  {/* Score Change Indicator */}
                  <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-0.5 ${
                    isPositive 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10'
                  }`}>
                    <span>{isPositive ? '+' : ''}{scoreDiff.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-4 pt-3.5 border-t border-gray-200/50 dark:border-neutral-800/30">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-neutral-400 w-24 shrink-0">
                    Current: {Math.round(safeCurrent * 100)}%
                  </span>
                  <div className="flex-1 relative h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    {/* Current Score */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${safeCurrent * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="absolute h-full bg-slate-400 dark:bg-neutral-600 rounded-full z-10"
                    />
                    {/* Expected Score */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${safeExpected * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono w-24 text-right shrink-0">
                    Target: {Math.round(safeExpected * 100)}%
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: counterfactuals.length * 0.05 + 0.2 }}
        className="mt-6 p-4 bg-blue-500/[0.02] dark:bg-blue-500/[0.03] border border-blue-500/10 dark:border-blue-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed font-medium">
            <span className="font-bold text-blue-600 dark:text-blue-400">Pro Tip:</span> Focus on the "Easy" scenarios first 
            for quick wins. These changes can significantly boost your match score with minimal effort.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
