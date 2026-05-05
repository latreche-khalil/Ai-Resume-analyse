'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface SkillRadarChartProps {
  skills: Array<{
    name: string
    current: number // 0-100
    required: number // 0-100
  }>
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || skills.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const size = 400
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const maxRadius = size / 2 - 60

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Draw background circles
    const levels = 5
    for (let i = 1; i <= levels; i++) {
      const radius = (maxRadius / levels) * i
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axes
    const angleStep = (Math.PI * 2) / skills.length
    skills.forEach((_, index) => {
      const angle = angleStep * index - Math.PI / 2
      const x = centerX + Math.cos(angle) * maxRadius
      const y = centerY + Math.sin(angle) * maxRadius

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw required skills (ideal) - dashed line
    ctx.beginPath()
    skills.forEach((skill, index) => {
      const angle = angleStep * index - Math.PI / 2
      const radius = (skill.required / 100) * maxRadius
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)' // Blue
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.fill()
    ctx.setLineDash([])

    // Draw current skills - solid line
    ctx.beginPath()
    skills.forEach((skill, index) => {
      const angle = angleStep * index - Math.PI / 2
      const radius = (skill.current / 100) * maxRadius
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)' // Purple
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)'
    ctx.fill()

    // Draw skill labels
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    skills.forEach((skill, index) => {
      const angle = angleStep * index - Math.PI / 2
      const labelRadius = maxRadius + 30
      const x = centerX + Math.cos(angle) * labelRadius
      const y = centerY + Math.sin(angle) * labelRadius

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillText(skill.name, x, y)
    })
  }, [skills])

  if (skills.length === 0) {
    return (
      <div className="text-center py-12 theme-text-tertiary">
        <span className="text-4xl mb-4 block">📊</span>
        <p>No skill data available</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">📊 Skill Radar Chart</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Compare your skills vs job requirements
          </p>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="theme-text-secondary">Your Skills</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-dashed rounded"></div>
            <span className="theme-text-secondary">Required</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>

      {/* Skill Details */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {skills.map((skill, idx) => {
          const gap = skill.required - skill.current
          const isGap = gap > 0

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium theme-text">{skill.name}</span>
                {isGap && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                    -{gap}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs theme-text-tertiary">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Current</span>
                    <span className="text-purple-400 font-semibold">{skill.current}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.current}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 }}
                      className="h-full bg-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs theme-text-tertiary mt-2">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Required</span>
                    <span className="text-blue-400 font-semibold">{skill.required}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.required}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.05 + 0.1 }}
                      className="h-full bg-blue-500"
                    />
                  </div>
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
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold theme-text">Insight:</span> The radar chart shows your skill 
            profile compared to ideal requirements. Areas where the purple area is smaller than the blue 
            dashed line indicate skill gaps to focus on.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
