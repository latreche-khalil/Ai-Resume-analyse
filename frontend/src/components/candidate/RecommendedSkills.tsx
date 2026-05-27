'use client'

import { motion } from 'framer-motion'

export function RecommendedSkills({ skills }: { skills: any[] }) {
  return (
    <div className="mt-8 pt-6 border-t theme-border">
      <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-4">Recommended for you</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="px-3 py-1.5 bg-white/5 border theme-border rounded-lg text-xs font-medium theme-text">
            + {skill.name || skill}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
