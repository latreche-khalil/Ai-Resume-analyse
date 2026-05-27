'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export function GoalTracker({ stats, hasCV }: any) {
  const [selected, setSelected] = useState(0)
  const GOALS = hasCV ? [
    { label: 'Backend Developer', score: stats ? Math.min(100, Math.round(stats.employability_score * 0.9)) : 65, color: 'from-sky-500 to-blue-500' },
    { label: 'Full-Stack Engineer', score: stats ? Math.round(stats.employability_score) : 72, color: 'from-blue-500 to-cyan-500' },
    { label: 'Data Engineer', score: stats ? Math.min(100, Math.round(stats.employability_score * 0.7)) : 48, color: 'from-green-500 to-emerald-500' },
  ] : [
    { label: 'Upload CV', score: 0, color: 'from-gray-500 to-gray-600' },
    { label: 'Discover Skills', score: 0, color: 'from-gray-500 to-gray-600' },
    { label: 'Get Matched', score: 0, color: 'from-gray-500 to-gray-600' },
  ]
  const goal = GOALS[selected]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {GOALS.map((g, i) => (
          <button key={g.label} onClick={() => setSelected(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              selected === i ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white border-transparent' : 'theme-border theme-text-secondary hover:border-sky-500/50'
            }`}>{g.label}</button>
        ))}
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm theme-text-secondary">{hasCV ? (<>Readiness for <span className="theme-text font-semibold">{goal.label}</span></>) : (<span className="theme-text">Upload your CV to start tracking goals</span>)}</span>
          {hasCV && <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">{goal.score}%</span>}
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <motion.div className={`h-full rounded-full bg-gradient-to-r ${goal.color}`} initial={{ width: 0 }} animate={{ width: hasCV ? `${goal.score}%` : '0%' }} transition={{ duration: 1.2 }} />
        </div>
      </div>
    </div>
  )
}
