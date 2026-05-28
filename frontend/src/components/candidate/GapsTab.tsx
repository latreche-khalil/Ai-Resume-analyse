'use client'

import { motion } from 'framer-motion'
import { Empty } from '@/components/shared/UIHelpers'
import { 
  AlertCircle, 
  Zap, 
  ShieldAlert, 
  Sparkles, 
  BrainCircuit, 
  Target,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowUpRight
} from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

interface GapsTabProps {
  gapReport: any
  missingSkills?: string[]
}

export function GapsTab({ gapReport, missingSkills = [] }: GapsTabProps) {
  const hasGaps =
    (gapReport?.critical_gaps?.length   > 0) ||
    (gapReport?.important_gaps?.length  > 0) ||
    (gapReport?.nice_to_have_gaps?.length > 0) ||
    (gapReport?.quick_wins?.length      > 0)

  const container = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.08 } }
  }
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

  /* ── Fallback: only missing skills list ── */
  if (!hasGaps && missingSkills.length > 0) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6" style={R}>
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Identified Discrepancies</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {missingSkills.map((skill, i) => (
            <motion.div
              key={i}
              variants={item}
              className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-5 flex items-center gap-4 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-500/20">
                <Lock className="w-5 h-5 opacity-60" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-gray-900 dark:text-white text-sm">{skill}</div>
                <div className="text-[10px] text-gray-400 dark:text-neutral-500 font-medium uppercase tracking-widest">Skill Requirement Missing</div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          variants={item}
          className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Neural Engine Insight</h4>
            <p className="text-sm text-gray-500 dark:text-neutral-400 leading-relaxed">
              Our intelligence layer has flagged these missing skills. A deep architectural analysis is underway to determine the impact on your candidacy and suggest the most efficient learning path.
            </p>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  if (!gapReport) return (
    <Empty title="Requirement Match Perfected" subtitle="Your profile is fully aligned with the job specification." icon={Sparkles} />
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-10" style={R}>

      {/* Critical Gaps */}
      {gapReport.critical_gaps?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Critical Deficiencies</h4>
            </div>
            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-500/20 uppercase tracking-wide">
              High Impact
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gapReport.critical_gaps.map((g: any, i: number) => (
              <GapCard key={i} gap={g} type="critical" index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Important Gaps */}
      {gapReport.important_gaps?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Strategic Priorities</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gapReport.important_gaps.map((g: any, i: number) => (
              <GapCard key={i} gap={g} type="important" index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Nice to Have */}
      {gapReport.nice_to_have_gaps?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Competitive Enhancements</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gapReport.nice_to_have_gaps.map((g: any, i: number) => (
              <GapCard key={i} gap={g} type="nice" index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {gapReport.quick_wins?.length > 0 && (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-[#0a0a0a] overflow-hidden relative border border-emerald-100 dark:border-emerald-900/20 shadow-sm">
          <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                  <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Accelerated Wins</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Immediate actions to boost your match score</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-emerald-200 dark:border-white/10 shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Estimated Boost: +12%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gapReport.quick_wins.map((qw: any, i: number) => (
                <div
                  key={i}
                  className="p-5 rounded-xl bg-white dark:bg-white/5 border border-emerald-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-white/15 transition-all group/win shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-semibold uppercase tracking-wide">
                      {qw.timeline || 'Fast Track'}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/win:text-emerald-600 dark:group-hover/win:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed mb-3">{qw.action}</p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 dark:text-gray-500 group-hover/win:text-gray-800 dark:group-hover/win:text-gray-300 transition-colors">
                      Immediate ROI
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ── Gap Card ── */
const gapStyles: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  critical: { bg: 'bg-rose-50 dark:bg-rose-500/[0.06]', border: 'border-rose-200 dark:border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', icon: ShieldAlert },
  important:{ bg: 'bg-amber-50 dark:bg-amber-500/[0.06]',border: 'border-amber-200 dark:border-amber-500/20',text: 'text-amber-600 dark:text-amber-400', icon: AlertCircle },
  nice:     { bg: 'bg-sky-50 dark:bg-sky-500/[0.06]',   border: 'border-sky-200 dark:border-sky-500/20',   text: 'text-sky-600 dark:text-sky-400',   icon: Sparkles   },
}

function GapCard({ gap, type, index }: { gap: any; type: string; index: number }) {
  const s = gapStyles[type]
  const Icon = s.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
      style={{ fontFamily: 'Roboto, sans-serif' }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.text} flex items-center justify-center border ${s.border}`}>
            <Icon className="w-5 h-5" />
          </div>
          {gap.priority && (
            <span className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
              Priority #{gap.priority}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {gap.skill || gap.name}
          </h5>
          <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
            {gap.reason || gap.description || 'Required competence identified by neural pattern matching.'}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${s.text.split(' ')[0].replace('text', 'bg')}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${s.text}`}>
              {type === 'critical' ? 'Structural Gap' : type === 'important' ? 'Strategic Gap' : 'Additive Skill'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-neutral-200 transition-colors">
            <span className="text-[10px] font-medium">Details</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
