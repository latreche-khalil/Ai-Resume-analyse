
'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

function SkillBadge({ skill, type, delay }: any) {
  const styles = {
    matching:     'bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10',
    transferable: 'bg-sky-50 dark:bg-sky-500/[0.06] border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/10',
    missing:      'bg-rose-50 dark:bg-rose-500/[0.06] border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10'
  }
  
  const Icons = { 
    matching: CheckCircle2, 
    transferable: RefreshCcw, 
    missing: AlertCircle 
  }
  
  const Icon = Icons[type as keyof typeof Icons]

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ y: -1 }}
      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-all cursor-default ${styles[type as keyof typeof styles]}`}
      style={R}
    >
      <Icon className="w-3 h-3 opacity-70" />
      {skill}
    </motion.button>
  )
}

export function SkillMatrix({ matchingSkills = [], transferableSkills = [], missingSkills = [] }: any) {
  const sections = [
    { title: 'Expertise Match',    data: matchingSkills,     type: 'matching',     icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { title: 'Adaptive Potential', data: transferableSkills, type: 'transferable', icon: RefreshCcw,   color: 'text-sky-600 dark:text-sky-400',           bgColor: 'bg-sky-50 dark:bg-sky-500/10'           },
    { title: 'Skill Gaps',         data: missingSkills,      type: 'missing',      icon: AlertCircle,  color: 'text-rose-600 dark:text-rose-400',         bgColor: 'bg-rose-50 dark:bg-rose-500/10'         }
  ]

  return (
    <div className="grid grid-cols-1 gap-5" style={R}>
      {sections.map((section, sIdx) => section.data.length > 0 && (
        <div key={sIdx} className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className={`p-1 rounded-md ${section.bgColor}`}>
              <section.icon className={`w-3 h-3 ${section.color}`} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 tracking-wide">{section.title}</h3>
            <span className="text-[10px] font-medium text-gray-400 dark:text-neutral-500">{section.data.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {section.data.map((skill: any, idx: number) => (
              <SkillBadge key={idx} skill={skill} type={section.type} delay={idx * 0.03} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
