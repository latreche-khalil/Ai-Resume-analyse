import { motion } from 'framer-motion'

interface Skill {
  name: string
  level: number
  category: string
  demand: number
}

interface SkillRadarChartProps {
  skills: Skill[]
}

export function SkillRadarChart({ skills }: SkillRadarChartProps) {
  // Group skills by category and calculate average
  const categories = ['Backend', 'Frontend', 'Database', 'DevOps', 'Cloud', 'Mobile']
  
  const categoryScores = categories.map(cat => {
    const categorySkills = skills.filter(s => s.category === cat)
    const avgLevel = categorySkills.length > 0
      ? categorySkills.reduce((sum, s) => sum + s.level, 0) / categorySkills.length
      : 0
    const industryStandard = 75 // Industry standard benchmark
    
    return {
      category: cat,
      userLevel: avgLevel,
      industryStandard,
      gap: industryStandard - avgLevel
    }
  })

  const maxValue = 100
  const centerX = 150
  const centerY = 150
  const radius = 100

  // Calculate points for polygon
  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const r = (value / maxValue) * radius
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    }
  }

  const userPoints = categoryScores.map((cat, i) => 
    getPoint(cat.userLevel, i, categoryScores.length)
  )
  
  const industryPoints = categoryScores.map((cat, i) => 
    getPoint(cat.industryStandard, i, categoryScores.length)
  )

  const userPath = userPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z'

  const industryPath = industryPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ') + ' Z'

  return (
    <div className="relative w-full h-80">
      <svg viewBox="0 0 300 300" className="w-full h-full">
        {/* Grid circles */}
        {[25, 50, 75, 100].map(percent => (
          <circle
            key={percent}
            cx={centerX}
            cy={centerY}
            r={(percent / 100) * radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-white/10"
          />
        ))}

        {/* Grid lines */}
        {categoryScores.map((_, i) => {
          const point = getPoint(100, i, categoryScores.length)
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-white/10"
            />
          )
        })}

        {/* Industry standard (dashed) */}
        <motion.path
          d={industryPath}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="5,5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />

        {/* User level (solid) */}
        <motion.path
          d={userPath}
          fill="rgba(168, 85, 247, 0.2)"
          stroke="#a855f7"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />

        {/* Category labels */}
        {categoryScores.map((cat, i) => {
          const labelPoint = getPoint(115, i, categoryScores.length)
          return (
            <text
              key={cat.category}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              className="theme-text font-semibold"
            >
              {cat.category}
            </text>
          )
        })}

        {/* User points */}
        {userPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#a855f7"
            className="cursor-pointer"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="theme-text-secondary">Your Level</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" style={{ borderTop: '2px dashed' }} />
          <span className="theme-text-secondary">Industry Standard</span>
        </div>
      </div>
    </div>
  )
}
