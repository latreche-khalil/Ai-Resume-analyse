import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Skill {
  name: string
  level: number
  category: string
  demand: number
}

interface SkillBubbleChartProps {
  skills: Skill[]
}

const CATEGORY_COLORS: Record<string, string> = {
  Backend:  '#a855f7',
  Frontend: '#3b82f6',
  Database: '#10b981',
  DevOps:   '#f59e0b',
}

const POSITIONS = [
  { cx: 50,  cy: 30  },
  { cx: 75,  cy: 50  },
  { cx: 60,  cy: 70  },
  { cx: 30,  cy: 65  },
  { cx: 15,  cy: 40  },
  { cx: 35,  cy: 15  },
  { cx: 80,  cy: 20  },
  { cx: 20,  cy: 80  },
]

export function SkillBubbleChart({ skills }: SkillBubbleChartProps) {
  const [hovered, setHovered] = useState<Skill | null>(null)

  // Validate skills data
  const validSkills = skills.filter(skill => 
    skill && 
    typeof skill.level === 'number' && 
    !isNaN(skill.level) &&
    typeof skill.demand === 'number' &&
    !isNaN(skill.demand)
  )

  if (validSkills.length === 0) {
    return (
      <div className="relative w-full h-64 flex items-center justify-center">
        <p className="theme-text-tertiary text-sm">No skill data available</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-64">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {validSkills.map((skill, i) => {
          const pos = POSITIONS[i % POSITIONS.length] || { cx: 50, cy: 50 }
          const level = Math.max(0, Math.min(100, skill.level || 0))
          const r = Math.max(2, 4 + (level / 100) * 8)
          const color = CATEGORY_COLORS[skill.category] || '#6366f1'
          return (
            <g key={`${skill.name}-${i}`}>
              <circle
                cx={pos.cx} cy={pos.cy} r={r}
                fill={color} fillOpacity={0.25}
                stroke={color} strokeWidth={0.5}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHovered(skill)}
                onMouseLeave={() => setHovered(null)}
              />
              <text
                x={pos.cx} y={pos.cy + r + 3}
                textAnchor="middle"
                fontSize="3.5"
                fill={color}
                className="pointer-events-none select-none"
              >
                {skill.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key={hovered.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-2 right-2 theme-card rounded-xl p-3 text-xs max-w-[160px] z-10 border border-sky-500/30"
          >
            <p className="font-bold theme-text mb-1">{hovered.name}</p>
            <p className="theme-text-secondary">Level: <span className="text-sky-400 font-semibold">{Math.round(hovered.level || 0)}%</span></p>
            <p className="theme-text-secondary">Demand: <span className="text-green-400 font-semibold">{Math.round(hovered.demand || 0)}%</span> of jobs</p>
            <p className="theme-text-tertiary mt-1">{hovered.category}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
