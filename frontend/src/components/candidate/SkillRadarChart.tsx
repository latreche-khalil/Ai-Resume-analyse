'use client'

import { motion } from 'framer-motion'

export function SkillRadarChart({ skills = [] }: any) {
  // Simplified radar visual using SVG or DIVs for architecture demonstration
  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <div className="absolute inset-0 border-[10px] border-sky-500/5 rounded-full scale-[0.3]" />
      <div className="absolute inset-0 border-[10px] border-sky-500/5 rounded-full scale-[0.6]" />
      <div className="absolute inset-0 border-[10px] border-sky-500/5 rounded-full scale-[0.9]" />
      
      {skills.slice(0, 8).map((skill: any, i: number) => {
        const angle = (i * 360) / 8
        const dist = 40 + (skill.level || 50) / 2
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: 1, 
              x: Math.cos((angle * Math.PI) / 180) * dist,
              y: Math.sin((angle * Math.PI) / 180) * dist
            }}
            className="absolute p-2 theme-card border theme-border rounded-lg text-[10px] font-bold"
          >
            {skill.name || skill}
          </motion.div>
        )
      })}
      <div className="w-16 h-16 bg-sky-500/10 border-2 border-sky-500/40 rounded-full flex items-center justify-center text-xl font-black theme-text">
        AI
      </div>
    </div>
  )
}
