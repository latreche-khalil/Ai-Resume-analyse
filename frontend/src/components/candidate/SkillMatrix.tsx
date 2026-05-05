'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface Skill {
  name: string
  level?: string
  evidence?: string
}

interface SkillMatrixProps {
  matchingSkills: string[]
  transferableSkills: string[]
  missingSkills: string[]
}

export function SkillMatrix({ 
  matchingSkills = [], 
  transferableSkills = [], 
  missingSkills = [] 
}: SkillMatrixProps) {
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; type: string; evidence?: string } | null>(null)
  
  return (
    <div className="space-y-6">
      {/* Matching Skills */}
      {matchingSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <h3 className="text-lg font-bold theme-text">Matching Skills</h3>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
              {matchingSkills.length}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {matchingSkills.map((skill, idx) => (
              <SkillBadge
                key={idx}
                skill={skill}
                type="matching"
                delay={idx * 0.05}
                onClick={() => setSelectedSkill({ name: skill, type: 'matching' })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Transferable Skills */}
      {transferableSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔄</span>
            <h3 className="text-lg font-bold theme-text">Transferable Skills</h3>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
              {transferableSkills.length}
            </span>
            <span className="text-xs theme-text-tertiary">(AI-detected relevance)</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {transferableSkills.map((skill, idx) => (
              <SkillBadge
                key={idx}
                skill={skill}
                type="transferable"
                delay={idx * 0.05}
                onClick={() => setSelectedSkill({ name: skill, type: 'transferable' })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-lg font-bold theme-text">Missing Skills</h3>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
              {missingSkills.length}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill, idx) => (
              <SkillBadge
                key={idx}
                skill={skill}
                type="missing"
                delay={idx * 0.05}
                onClick={() => setSelectedSkill({ name: skill, type: 'missing' })}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Skill Detail Modal */}
      {selectedSkill && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSkill(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="theme-card border theme-border rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold theme-text">{selectedSkill.name}</h3>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedSkill.type === 'matching' 
                    ? 'bg-green-500/20 text-green-400'
                    : selectedSkill.type === 'transferable'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {selectedSkill.type === 'matching' ? '✅ Matching' : 
                   selectedSkill.type === 'transferable' ? '🔄 Transferable' : 
                   '⚠️ Missing'}
                </span>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="theme-text-tertiary hover:theme-text"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm theme-text-secondary">
              {selectedSkill.type === 'matching' && (
                <p>✅ This skill was found in your CV and matches the job requirements.</p>
              )}
              {selectedSkill.type === 'transferable' && (
                <p>🔄 AI detected this skill as relevant based on your experience, even if not explicitly mentioned.</p>
              )}
              {selectedSkill.type === 'missing' && (
                <p>⚠️ This skill is required for the job but was not found in your CV. Consider adding it to your learning roadmap.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

interface SkillBadgeProps {
  skill: string
  type: 'matching' | 'transferable' | 'missing'
  delay: number
  onClick: () => void
}

function SkillBadge({ skill, type, delay, onClick }: SkillBadgeProps) {
  const styles = {
    matching: 'bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20',
    transferable: 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20',
    missing: 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
  }
  
  const icons = {
    matching: '✓',
    transferable: '↔',
    missing: '○'
  }
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer ${styles[type]}`}
    >
      <span className="mr-1">{icons[type]}</span>
      {skill}
    </motion.button>
  )
}
