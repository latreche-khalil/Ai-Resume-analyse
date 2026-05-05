'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔮</span>
        <div>
          <h3 className="text-xl font-bold theme-text">What-If Simulator</h3>
          <p className="text-sm theme-text-tertiary">Test how adding skills affects your score</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium theme-text mb-2">
            Add a skill to simulate:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputSkill}
              onChange={(e) => setInputSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSimulate()}
              placeholder="e.g., Python, AWS, React..."
              disabled={isSimulating}
              className="flex-1 px-4 py-3 bg-white/5 border theme-border rounded-xl theme-text placeholder:theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
            />
            <motion.button
              onClick={handleSimulate}
              disabled={!inputSkill.trim() || isSimulating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSimulating ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⚙️
                  </motion.span>
                  Simulating...
                </span>
              ) : (
                '🚀 Simulate'
              )}
            </motion.button>
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
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm theme-text-tertiary mb-1">Simulated Result</div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {Math.round(simulatedScore * 100)}%
                    </div>
                  </div>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`px-4 py-2 rounded-full font-bold ${
                      scoreDiff > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(1)}%
                  </motion.div>
                </div>

                {/* Visual Comparison */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs theme-text-tertiary w-20">Current</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${currentScore * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-gray-400 to-gray-600"
                      />
                    </div>
                    <span className="text-xs theme-text font-mono w-12 text-right">
                      {Math.round(currentScore * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs theme-text-tertiary w-20">With "{inputSkill}"</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${simulatedScore * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      />
                    </div>
                    <span className="text-xs theme-text font-mono w-12 text-right">
                      {Math.round(simulatedScore * 100)}%
                    </span>
                  </div>
                </div>

                {/* Insight */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 pt-4 border-t theme-border"
                >
                  <div className="flex items-start gap-2 text-sm theme-text-secondary">
                    <span className="text-lg">💡</span>
                    <div>
                      {scoreDiff > 10 ? (
                        <span>
                          <span className="font-semibold text-green-400">High Impact!</span> Adding this skill 
                          could significantly boost your match score. Consider prioritizing it in your learning roadmap.
                        </span>
                      ) : scoreDiff > 5 ? (
                        <span>
                          <span className="font-semibold text-blue-400">Good Impact.</span> This skill would 
                          improve your profile. Worth adding to your development plan.
                        </span>
                      ) : scoreDiff > 0 ? (
                        <span>
                          <span className="font-semibold text-yellow-400">Minor Impact.</span> This skill 
                          provides a small boost. Focus on higher-impact skills first.
                        </span>
                      ) : (
                        <span>
                          <span className="font-semibold theme-text-tertiary">No Impact.</span> This skill 
                          may already be covered or not relevant to this role.
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Reset Button */}
                <motion.button
                  onClick={handleReset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border theme-border rounded-lg text-sm transition-all"
                >
                  🔄 Try Another Skill
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {!simulatedScore && missingSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
          >
            <div className="text-sm theme-text-secondary mb-3">
              <span className="font-semibold theme-text">💡 Try these missing skills:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingSkills.slice(0, 6).map((skill, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => setInputSkill(skill)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-full text-xs text-blue-300 transition-all"
                >
                  {skill}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
      >
        <div className="flex items-start gap-2 text-xs theme-text-tertiary">
          <span className="text-yellow-400">⚠️</span>
          <span>
            This is a simplified simulation. Actual score changes depend on multiple factors including 
            skill relevance, proficiency level, and overall profile context.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
