import { motion } from 'framer-motion'
import Link from 'next/link'

interface RecommendedSkill {
  name: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  demandIncrease: number
}

interface RecommendedSkillsProps {
  skills: RecommendedSkill[]
}

export function RecommendedSkills({ skills }: RecommendedSkillsProps) {
  if (skills.length === 0) return null

  const priorityColors = {
    high: 'from-red-500/20 to-orange-500/20 border-red-500/30',
    medium: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
    low: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  }

  const priorityIcons = {
    high: '🔥',
    medium: '⚡',
    low: '💡',
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold theme-text flex items-center gap-2">
          <span>🎯</span>
          <span>Recommended Skills</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs border border-sky-500/30">
            AI Suggested
          </span>
        </h3>
        <Link href="/analysis/new" className="text-xs text-sky-400 hover:text-sky-300">
          View Full Report →
        </Link>
      </div>

      <div className="space-y-2">
        {skills.slice(0, 3).map((skill, i) => (
          <motion.div
            key={skill.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-3 rounded-xl bg-gradient-to-br ${priorityColors[skill.priority as keyof typeof priorityColors]} border backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{priorityIcons[skill.priority as keyof typeof priorityIcons]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold theme-text">{skill.name}</p>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-white/10 theme-text-tertiary">
                    +{skill.demandIncrease}% demand
                  </span>
                </div>
                <p className="text-xs theme-text-tertiary leading-relaxed">{skill.reason}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Link href="/analysis/new">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-semibold"
        >
          Explore Skill Lab →
        </motion.button>
      </Link>
    </div>
  )
}
