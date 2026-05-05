'use client'

import { motion } from 'framer-motion'
import { Section, Empty, GapCard } from '@/components/shared/UIHelpers'

interface GapsTabProps {
  gapReport: any
  missingSkills?: string[]
}

export function GapsTab({ gapReport, missingSkills = [] }: GapsTabProps) {
  const hasGaps = (gapReport?.critical_gaps?.length > 0) || 
                  (gapReport?.important_gaps?.length > 0) || 
                  (gapReport?.nice_to_have_gaps?.length > 0) || 
                  (gapReport?.quick_wins?.length > 0)

  if (!hasGaps && missingSkills.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Section title="🔍 Detected Gaps" color="yellow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {missingSkills.map((skill, i) => (
              <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-bold text-yellow-300">{skill}</div>
                  <div className="text-[10px] text-white/50 uppercase">Missing Skill</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 flex items-center gap-3">
          <span>ℹ️</span>
          <p>We've identified these gaps based on your profile. A detailed analysis with priority levels is being generated.</p>
        </div>
      </motion.div>
    )
  }

  if (!gapReport) return <Empty>No gap report available</Empty>

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      {gapReport.critical_gaps?.length > 0 && (
        <Section title="🔴 Critical Gaps" color="red" count={gapReport.critical_gaps.length}>
          <div className="space-y-3">
            {gapReport.critical_gaps.map((g: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GapCard gap={g} color="red" />
              </motion.div>
            ))}
          </div>
        </Section>
      )}
      
      {gapReport.important_gaps?.length > 0 && (
        <Section title="🟡 Important Gaps" color="yellow" count={gapReport.important_gaps.length}>
          <div className="space-y-3">
            {gapReport.important_gaps.map((g: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GapCard gap={g} color="yellow" />
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {gapReport.nice_to_have_gaps?.length > 0 && (
        <Section title="🔵 Nice-to-Have Gaps" color="blue" count={gapReport.nice_to_have_gaps.length}>
          <div className="space-y-3">
            {gapReport.nice_to_have_gaps.map((g: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GapCard gap={g} color="blue" />
              </motion.div>
            ))}
          </div>
        </Section>
      )}
      
      {gapReport.quick_wins?.length > 0 && (
        <Section title="⚡ Quick Wins" color="green">
          <div className="space-y-2">
            {gapReport.quick_wins.map((qw: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-green-500/10 border border-green-500/20 rounded-xl p-3"
              >
                <div className="font-medium text-sm text-green-300">{qw.action}</div>
                <div className="text-xs text-white/60 mt-1">
                  <span className="text-green-400">{qw.impact}</span> · 
                  <span className="ml-1">{qw.effort} effort · {qw.timeline}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  )
}
