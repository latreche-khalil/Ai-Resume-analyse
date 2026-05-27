'use client'

import { motion } from 'framer-motion'

export function SkillBubbleChart({ skills = [] }: any) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-8">
      {skills.slice(0, 15).map((skill: any, i: number) => {
        const size = 60 + (skill.level || 50) / 2
        return (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05, type: 'spring' }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500/10 to-blue-600/20 border theme-border cursor-pointer relative group"
            style={{ width: size, height: size }}
          >
            <span className="text-[10px] md:text-xs font-bold theme-text text-center px-1 truncate w-full group-hover:scale-110 transition-transform">
              {skill.name || skill}
            </span>
            <div className="absolute inset-0 rounded-full bg-sky-400/5 group-hover:bg-sky-400/10 transition-colors" />
          </motion.div>
        )
      })}
    </div>
  )
}
