'use client'

import { motion } from 'framer-motion'

interface ExperienceArea {
  name: string
  years: number
  intensity: number // 0-100 (based on depth/frequency)
}

interface ExperienceHeatmapProps {
  areas: ExperienceArea[]
  seniorityLevel?: string
}

export function ExperienceHeatmap({ areas, seniorityLevel }: ExperienceHeatmapProps) {
  if (areas.length === 0) {
    return (
      <div className="text-center py-12 theme-text-tertiary">
        <span className="text-4xl mb-4 block">🔥</span>
        <p>No experience data available</p>
      </div>
    )
  }

  const maxYears = Math.max(...areas.map(a => a.years))

  const getHeatColor = (intensity: number) => {
    if (intensity >= 80) return 'from-red-500 to-orange-500'
    if (intensity >= 60) return 'from-orange-500 to-yellow-500'
    if (intensity >= 40) return 'from-yellow-500 to-green-500'
    if (intensity >= 20) return 'from-green-500 to-blue-500'
    return 'from-blue-500 to-purple-500'
  }

  const getHeatLabel = (intensity: number) => {
    if (intensity >= 80) return { label: 'Expert', icon: '🔥', color: 'text-red-400' }
    if (intensity >= 60) return { label: 'Advanced', icon: '⚡', color: 'text-orange-400' }
    if (intensity >= 40) return { label: 'Intermediate', icon: '💪', color: 'text-yellow-400' }
    if (intensity >= 20) return { label: 'Beginner', icon: '🌱', color: 'text-green-400' }
    return { label: 'Novice', icon: '👶', color: 'text-blue-400' }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🔥 Experience Heatmap</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Depth and breadth of experience across domains
          </p>
        </div>

        {seniorityLevel && (
          <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl">
            <div className="text-xs theme-text-tertiary">Seniority Level</div>
            <div className="text-lg font-bold text-purple-400">{seniorityLevel}</div>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-3">
        {areas.map((area, idx) => {
          const heatInfo = getHeatLabel(area.intensity)
          const widthPercentage = (area.years / maxYears) * 100

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-2"
            >
              {/* Area Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{heatInfo.icon}</span>
                  <span className="font-semibold theme-text">{area.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${heatInfo.color}`}>
                    {heatInfo.label}
                  </span>
                  <span className="text-sm theme-text-tertiary">
                    {area.years} {area.years === 1 ? 'year' : 'years'}
                  </span>
                </div>
              </div>

              {/* Heatmap Bar */}
              <div className="relative h-12 bg-white/5 rounded-xl overflow-hidden">
                {/* Years Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getHeatColor(area.intensity)} opacity-60`}
                />

                {/* Intensity Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: area.intensity / 100 }}
                  transition={{ duration: 0.8, delay: idx * 0.1 + 0.2 }}
                  className={`absolute inset-0 bg-gradient-to-r ${getHeatColor(area.intensity)}`}
                  style={{ width: `${widthPercentage}%` }}
                />

                {/* Grid Lines */}
                <div className="absolute inset-0 flex">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-white/5"
                      style={{ width: '10%' }}
                    />
                  ))}
                </div>

                {/* Intensity Label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {area.intensity}% Intensity
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: areas.length * 0.1 + 0.3 }}
        className="mt-6 p-4 bg-white/5 rounded-xl"
      >
        <div className="text-sm font-semibold theme-text mb-3">🎨 Heat Legend</div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Novice', color: 'from-blue-500 to-purple-500', range: '0-20%' },
            { label: 'Beginner', color: 'from-green-500 to-blue-500', range: '20-40%' },
            { label: 'Intermediate', color: 'from-yellow-500 to-green-500', range: '40-60%' },
            { label: 'Advanced', color: 'from-orange-500 to-yellow-500', range: '60-80%' },
            { label: 'Expert', color: 'from-red-500 to-orange-500', range: '80-100%' }
          ].map((level, idx) => (
            <div key={idx} className="text-center">
              <div className={`h-3 rounded-full bg-gradient-to-r ${level.color} mb-1`} />
              <div className="text-xs theme-text-secondary">{level.label}</div>
              <div className="text-xs theme-text-tertiary">{level.range}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: areas.length * 0.1 + 0.5 }}
        className="mt-4 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold theme-text">How to read:</span> Bar length shows years of 
            experience, while color intensity indicates depth of expertise. Hotter colors (red/orange) 
            mean deeper, more intensive experience in that domain.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
