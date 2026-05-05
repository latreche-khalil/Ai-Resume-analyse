'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface Candidate {
  id: string
  name: string
  match_score: number
  matching_skills: string[]
  missing_skills: string[]
  years_experience: number
  seniority_level: string
  confidence_score: number
  red_flags: number
}

interface CandidateComparisonMatrixProps {
  candidates: Candidate[]
  onSelectCandidate?: (candidateId: string) => void
}

export function CandidateComparisonMatrix({ 
  candidates, 
  onSelectCandidate 
}: CandidateComparisonMatrixProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  const toggleCandidate = (id: string) => {
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(selectedCandidates.filter(c => c !== id))
    } else if (selectedCandidates.length < 3) {
      setSelectedCandidates([...selectedCandidates, id])
    }
  }

  const comparedCandidates = candidates.filter(c => selectedCandidates.includes(c.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">👥 Candidate Comparison Matrix</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Select up to 3 candidates to compare side-by-side
          </p>
        </div>

        <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
          <span className="text-sm theme-text-secondary">
            {selectedCandidates.length}/3 selected
          </span>
        </div>
      </div>

      {/* Candidate Selection */}
      {selectedCandidates.length < 3 && (
        <div className="mb-6">
          <div className="text-sm font-semibold theme-text mb-3">📋 Available Candidates</div>
          <div className="grid grid-cols-2 gap-3">
            {candidates
              .filter(c => !selectedCandidates.includes(c.id))
              .slice(0, 6)
              .map((candidate, idx) => (
                <motion.button
                  key={candidate.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleCandidate(candidate.id)}
                  className="p-3 bg-white/5 hover:bg-white/10 border theme-border hover:border-purple-500/50 rounded-xl text-left transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold theme-text text-sm">{candidate.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      candidate.match_score >= 0.8 
                        ? 'bg-green-500/20 text-green-400'
                        : candidate.match_score >= 0.6
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {Math.round(candidate.match_score * 100)}%
                    </span>
                  </div>
                  <div className="text-xs theme-text-tertiary">
                    {candidate.seniority_level} · {candidate.years_experience}y exp
                  </div>
                </motion.button>
              ))}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {comparedCandidates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b theme-border">
                <th className="text-left py-3 px-4 text-sm font-semibold theme-text">Metric</th>
                {comparedCandidates.map((candidate) => (
                  <th key={candidate.id} className="text-center py-3 px-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-semibold theme-text">{candidate.name}</span>
                      <button
                        onClick={() => toggleCandidate(candidate.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Match Score */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">🎯 Match Score</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <div className={`text-2xl font-bold ${
                      candidate.match_score >= 0.8 ? 'text-green-400' :
                      candidate.match_score >= 0.6 ? 'text-blue-400' : 'text-yellow-400'
                    }`}>
                      {Math.round(candidate.match_score * 100)}%
                    </div>
                  </td>
                ))}
              </tr>

              {/* Confidence */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">🤖 AI Confidence</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <span className="text-sm font-semibold theme-text">
                      {Math.round(candidate.confidence_score * 100)}%
                    </span>
                  </td>
                ))}
              </tr>

              {/* Experience */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">💼 Experience</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <div className="text-sm theme-text">{candidate.years_experience} years</div>
                    <div className="text-xs theme-text-tertiary mt-1">{candidate.seniority_level}</div>
                  </td>
                ))}
              </tr>

              {/* Matching Skills */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">✅ Matching Skills</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <div className="text-lg font-bold text-green-400">
                      {candidate.matching_skills.length}
                    </div>
                    <div className="text-xs theme-text-tertiary mt-1">
                      {candidate.matching_skills.slice(0, 2).join(', ')}
                      {candidate.matching_skills.length > 2 && '...'}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Missing Skills */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">⚠️ Missing Skills</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <div className="text-lg font-bold text-red-400">
                      {candidate.missing_skills.length}
                    </div>
                    <div className="text-xs theme-text-tertiary mt-1">
                      {candidate.missing_skills.slice(0, 2).join(', ')}
                      {candidate.missing_skills.length > 2 && '...'}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Red Flags */}
              <tr className="border-b theme-border">
                <td className="py-3 px-4 text-sm theme-text-secondary">🚩 Red Flags</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <div className={`text-lg font-bold ${
                      candidate.red_flags === 0 ? 'text-green-400' :
                      candidate.red_flags <= 2 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {candidate.red_flags}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr>
                <td className="py-3 px-4 text-sm theme-text-secondary">Actions</td>
                {comparedCandidates.map((candidate) => (
                  <td key={candidate.id} className="text-center py-3 px-4">
                    <button
                      onClick={() => onSelectCandidate?.(candidate.id)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Winner Highlight */}
      {comparedCandidates.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div className="text-sm theme-text-secondary">
              <span className="font-semibold text-green-400">Top Candidate:</span>{' '}
              {comparedCandidates.reduce((prev, current) => 
                prev.match_score > current.match_score ? prev : current
              ).name} with {Math.round(Math.max(...comparedCandidates.map(c => c.match_score)) * 100)}% match score
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
