'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface SemanticProximityPlotProps {
  candidateScore: number // 0-1
  averageScore: number // 0-1
  topPercentile: number // 0-1
  semanticDistance: number // 0-1 (0 = perfect match, 1 = completely different)
}

export function SemanticProximityPlot({
  candidateScore,
  averageScore,
  topPercentile,
  semanticDistance
}: SemanticProximityPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 600
    const height = 400
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)') // Red (far)
    gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.1)') // Yellow (medium)
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)') // Green (close)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      // Vertical lines
      ctx.beginPath()
      ctx.moveTo((width / 10) * i, 0)
      ctx.lineTo((width / 10) * i, height)
      ctx.stroke()

      // Horizontal lines
      ctx.beginPath()
      ctx.moveTo(0, (height / 10) * i)
      ctx.lineTo(width, (height / 10) * i)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    // X-axis
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()

    // Draw labels
    ctx.font = '12px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.textAlign = 'center'
    ctx.fillText('Semantic Distance →', width / 2, height - 10)
    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Match Score →', 0, 0)
    ctx.restore()

    // Plot points
    const plotPoint = (x: number, y: number, color: string, label: string, size: number = 8) => {
      const px = x * width
      const py = height - y * height

      // Draw point
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, px, py - size - 8)
    }

    // Plot average candidates (scattered)
    ctx.fillStyle = 'rgba(156, 163, 175, 0.3)'
    for (let i = 0; i < 20; i++) {
      const x = Math.random()
      const y = Math.random() * 0.6 + 0.2 // Cluster around average
      ctx.beginPath()
      ctx.arc(x * width, height - y * height, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Plot key points
    plotPoint(1 - semanticDistance, candidateScore, 'rgba(168, 85, 247, 1)', 'You', 12)
    plotPoint(0.5, averageScore, 'rgba(59, 130, 246, 1)', 'Average', 10)
    plotPoint(0.9, topPercentile, 'rgba(34, 197, 94, 1)', 'Top 10%', 10)

    // Draw connection line from you to ideal
    ctx.beginPath()
    ctx.moveTo((1 - semanticDistance) * width, height - candidateScore * height)
    ctx.lineTo(0.9 * width, height - topPercentile * height)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])
  }, [candidateScore, averageScore, topPercentile, semanticDistance])

  const proximityPercentage = Math.round((1 - semanticDistance) * 100)
  const getProximityLabel = () => {
    if (proximityPercentage >= 80) return { label: 'Excellent Match', color: 'text-green-400', icon: '🎯' }
    if (proximityPercentage >= 60) return { label: 'Good Match', color: 'text-blue-400', icon: '👍' }
    if (proximityPercentage >= 40) return { label: 'Moderate Match', color: 'text-yellow-400', icon: '⚠️' }
    return { label: 'Weak Match', color: 'text-red-400', icon: '❌' }
  }

  const proximityInfo = getProximityLabel()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🎯 Semantic Proximity Plot</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            How close is your CV to the job description semantically?
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs theme-text-tertiary">Semantic Similarity</div>
          <div className={`text-2xl font-bold ${proximityInfo.color}`}>
            {proximityInfo.icon} {proximityPercentage}%
          </div>
          <div className={`text-xs ${proximityInfo.color}`}>{proximityInfo.label}</div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center mb-6">
        <canvas ref={canvasRef} className="max-w-full rounded-xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">👤</div>
          <div className="text-2xl font-bold text-purple-400">
            {Math.round(candidateScore * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary mt-1">Your Score</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="text-2xl font-bold text-blue-400">
            {Math.round(averageScore * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary mt-1">Average Candidate</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-green-400">
            {Math.round(topPercentile * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary mt-1">Top 10%</div>
        </motion.div>
      </div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm theme-text-secondary">
              <span className="font-semibold theme-text">Semantic Analysis:</span> Your CV has a{' '}
              <span className={`font-bold ${proximityInfo.color}`}>{proximityPercentage}%</span> semantic 
              similarity to the job description. This measures how closely your experience and skills 
              align with the role's requirements using AI language understanding.
            </div>
          </div>
        </div>

        {candidateScore > averageScore && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="text-sm theme-text-secondary">
                <span className="font-semibold text-green-400">Above Average!</span> You're scoring{' '}
                <span className="font-bold text-green-400">
                  {Math.round((candidateScore - averageScore) * 100)}%
                </span>{' '}
                higher than the average candidate for this role.
              </div>
            </div>
          </div>
        )}

        {candidateScore < topPercentile && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div className="text-sm theme-text-secondary">
                <span className="font-semibold text-yellow-400">Room for Growth:</span> To reach the 
                top 10%, you need to improve by{' '}
                <span className="font-bold text-yellow-400">
                  {Math.round((topPercentile - candidateScore) * 100)}%
                </span>. 
                Focus on the skill gaps identified in your analysis.
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
