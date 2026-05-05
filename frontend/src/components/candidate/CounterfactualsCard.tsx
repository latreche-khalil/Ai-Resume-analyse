'use client'

import { motion } from 'framer-motion'

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">💡</span>
        <div>
          <h3 className="text-xl font-bold theme-text">كيف ترفع نسبتك؟</h3>
          <p className="text-sm theme-text-tertiary">What-If Scenarios</p>
        </div>
      </div>

      <div className="space-y-4">
        {counterfactuals.map((cf, idx) => {
          const safeExpected = Number(cf.expected_score) || 0
          const safeCurrent = Number(currentScore) || 0
          const scoreDiff = (safeExpected - safeCurrent) * 100
          const isPositive = scoreDiff > 0
          
          const feasibilityConfig = {
            easy: { color: 'bg-green-500/20 text-green-400', icon: '✓', label: 'Easy' },
            medium: { color: 'bg-yellow-500/20 text-yellow-400', icon: '⚡', label: 'Medium' },
            hard: { color: 'bg-red-500/20 text-red-400', icon: '🔥', label: 'Hard' }
          }
          
          const feasibilityKey = (cf.feasibility || 'medium').toLowerCase()
          const feasibility = feasibilityConfig[feasibilityKey as keyof typeof feasibilityConfig] 
            || (feasibilityKey === 'moderate' ? feasibilityConfig.medium : feasibilityConfig.medium)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="theme-card border theme-border rounded-xl p-4 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Left: Change Description */}
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-blue-400 text-lg mt-0.5">🎯</span>
                    <div>
                      <div className="font-semibold theme-text mb-1">
                        {cf.change}
                      </div>
                      <div className="text-sm theme-text-secondary leading-relaxed">
                        {cf.explanation}
                      </div>
                    </div>
                  </div>
                  
                  {/* Feasibility Badge */}
                  {cf.feasibility && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${feasibility.color}`}>
                        <span className="mr-1">{feasibility.icon}</span>
                        {feasibility.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Score Impact */}
                <div className="text-right shrink-0">
                  <div className="mb-2">
                    <div className={`text-2xl font-bold ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {Math.round(safeExpected * 100)}%
                    </div>
                    <div className="text-xs theme-text-tertiary">new score</div>
                  </div>
                  
                  {/* Score Change Indicator */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.1 + 0.3 }}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isPositive 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}{scoreDiff.toFixed(1)}%
                  </motion.div>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="mt-4 pt-4 border-t theme-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs theme-text-tertiary w-16">Current</span>
                  <div className="flex-1 relative h-3 bg-white/10 rounded-full overflow-hidden">
                    {/* Current Score */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${safeCurrent * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                    {/* Expected Score */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${safeExpected * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className={`absolute h-full ${
                        isPositive 
                          ? 'bg-gradient-to-r from-green-400 to-green-600' 
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                      } opacity-50`}
                    />
                  </div>
                  <span className="text-xs theme-text-tertiary w-16 text-right">
                    {Math.round(safeExpected * 100)}%
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: counterfactuals.length * 0.1 + 0.5 }}
        className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold theme-text">Pro Tip:</span> Focus on the "Easy" scenarios first 
            for quick wins. These changes can significantly boost your match score with minimal effort.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
