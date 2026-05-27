'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp, 
  Plus,
  Brain,
  HelpCircle
} from 'lucide-react'

interface WhatIfSimulatorProps {
  currentScore: number
  matchingSkills: string[]
  missingSkills: string[]
}

export function WhatIfSimulator({ 
  currentScore, 
  matchingSkills = [], 
  missingSkills = [] 
}: WhatIfSimulatorProps) {
  const [inputSkill, setInputSkill] = useState('')
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const handleSimulate = () => {
    if (!inputSkill.trim()) return

    setIsSimulating(true)
    
    // Simulate AI processing delay
    setTimeout(() => {
      // Simple simulation logic
      const skillLower = inputSkill.toLowerCase().trim()
      const isMissing = missingSkills.some(s => s.toLowerCase().includes(skillLower))
      const isExisting = matchingSkills.some(s => s.toLowerCase().includes(skillLower))
      
      let boost = 0
      if (isMissing) {
        boost = 0.05 + Math.random() * 0.10 // 5-15%
      } else if (isExisting) {
        boost = 0.01 + Math.random() * 0.02 // 1-3%
      } else {
        boost = 0.03 + Math.random() * 0.05 // 3-8%
      }
      
      const newScore = Math.min(1, currentScore + boost)
      setSimulatedScore(newScore)
      setIsSimulating(false)
    }, 1500)
  }

  const handleReset = () => {
    setInputSkill('')
    setSimulatedScore(null)
  }

  const scoreDiff = simulatedScore ? (simulatedScore - currentScore) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-6 shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/[0.01] to-transparent blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">What-If Simulator</h3>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-black tracking-wider uppercase">BETA</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">Test how adding skills affects your match score</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            Add a skill to simulate:
          </label>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={inputSkill}
              onChange={(e) => setInputSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSimulate()}
              placeholder="e.g., Python, AWS, React..."
              disabled={isSimulating}
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-[#131316] border border-gray-200 dark:border-neutral-800/80 rounded-xl text-gray-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSimulate}
              disabled={!inputSkill.trim() || isSimulating}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
            >
              {isSimulating ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Simulating...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulate</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {simulatedScore !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-blue-500/[0.02] dark:bg-blue-500/[0.03] border border-blue-500/10 dark:border-blue-500/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-0.5">Simulated Result</div>
                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                      {Math.round(simulatedScore * 100)}%
                    </div>
                  </div>
                  
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${
                    scoreDiff > 0 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' 
                      : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-100 dark:border-neutral-700'
                  }`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Visual Comparison */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 w-24 truncate">Current</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${currentScore * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-slate-400 dark:bg-neutral-600 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-neutral-400 font-mono w-10 text-right">
                      {Math.round(currentScore * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-neutral-300 w-24 truncate">With "{inputSkill}"</span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${simulatedScore * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono w-10 text-right font-bold">
                      {Math.round(simulatedScore * 100)}%
                    </span>
                  </div>
                </div>

                {/* Insight */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-3.5 border-t border-gray-100 dark:border-neutral-900/50"
                >
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-neutral-400 leading-relaxed font-medium">
                    <Brain className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      {scoreDiff > 10 ? (
                        <span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">High Impact!</span> Adding this skill 
                          could significantly boost your match score. Consider prioritizing it in your learning roadmap.
                        </span>
                      ) : scoreDiff > 5 ? (
                        <span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">Good Impact.</span> This skill would 
                          improve your profile. Worth adding to your development plan.
                        </span>
                      ) : scoreDiff > 0 ? (
                        <span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">Minor Impact.</span> This skill 
                          provides a small boost. Focus on higher-impact skills first.
                        </span>
                      ) : (
                        <span>
                          <span className="font-bold text-slate-400">No Impact.</span> This skill 
                          may already be covered or not relevant to this role.
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="mt-2 w-full py-2 bg-white dark:bg-[#0c0c0f] hover:bg-slate-50 dark:hover:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-neutral-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another Skill</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {!simulatedScore && missingSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/[0.02] dark:bg-blue-500/[0.03] border border-blue-500/10 dark:border-blue-500/20 rounded-xl p-4 space-y-3"
          >
            <div className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Try these missing skills:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingSkills.slice(0, 6).map((skill, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputSkill(skill)}
                  className="px-2.5 py-1 bg-white dark:bg-[#0c0c0f] hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-gray-200 dark:border-neutral-800 text-[10.5px] font-semibold text-slate-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 dark:hover:border-blue-500/30 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3 h-3 opacity-60" />
                  <span>{skill}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-5 p-3.5 bg-slate-50 dark:bg-neutral-950/40 border border-gray-200/50 dark:border-neutral-900/50 rounded-xl"
      >
        <div className="flex items-start gap-2.5 text-[10.5px] text-slate-400 dark:text-neutral-500 leading-normal">
          <HelpCircle className="w-4 h-4 text-slate-400 dark:text-neutral-500 shrink-0 mt-0.5" />
          <span>
            This is a simplified simulation. Actual score changes depend on multiple factors including 
            skill relevance, proficiency level, and overall profile context.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

