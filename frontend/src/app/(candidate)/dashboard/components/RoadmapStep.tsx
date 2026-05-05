import Link from 'next/link'
import { motion } from 'framer-motion'

interface RoadmapStepData {
  step: number
  icon: string
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
}

interface RoadmapStepProps {
  step: RoadmapStepData
  isLast: boolean
}

export function RoadmapStep({ step, isLast }: RoadmapStepProps) {
  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 border-2 transition-all
          ${step.status === 'done'     ? 'bg-green-500/20 border-green-500/50'   :
            step.status === 'active'   ? 'bg-sky-500/20 border-sky-500/60 shadow-lg shadow-sky-500/20' :
                                         'bg-white/5 border-white/10'}`}
        >
          {step.icon}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 my-1 rounded-full ${
            step.status === 'done' ? 'bg-green-500/40' : 'bg-white/10'
          }`} style={{ minHeight: 24 }} />
        )}
      </div>

      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-sm font-semibold ${
            step.status === 'done'   ? 'text-green-400' :
            step.status === 'active' ? 'text-sky-400' :
                                       'theme-text-secondary'
          }`}>
            {step.title}
          </p>
          {step.status === 'active' && (
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-xs border border-sky-500/30">
              Now
            </span>
          )}
        </div>
        <p className="text-xs theme-text-tertiary leading-relaxed">{step.description}</p>
        {step.status === 'active' && (
          <Link href="/analysis/new">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-xs font-semibold"
            >
              Start now →
            </motion.button>
          </Link>
        )}
      </div>
    </div>
  )
}
