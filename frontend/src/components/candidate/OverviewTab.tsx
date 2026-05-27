'use client'

import { motion } from 'framer-motion'
import { SkillMatrix } from './SkillMatrix'
import { WhatIfSimulator } from './WhatIfSimulator'
import { 
  AlertCircle, 
  Map as MapIcon, 
  ChevronRight,
  Award
} from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

interface OverviewTabProps {
  data: any
  onTabChange: (tab: any) => void
}

export function OverviewTab({ data, onTabChange }: OverviewTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-8"
      style={R}
    >
      {/* Skill Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-neutral-400">
            Semantic Skill Mapping
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE EXTRACTION
          </div>
        </div>
        <SkillMatrix
          matchingSkills={data.matching_skills || []}
          transferableSkills={data.transferable_skills || []}
          missingSkills={data.missing_skills || []}
        />
      </div>

      {/* Experience Alignment */}
      {data.seniority_alignment && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Experience Alignment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 space-y-1">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">Candidate</div>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400">{data.seniority_alignment.cv_level}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 space-y-1">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">Requirement</div>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400">{data.seniority_alignment.jd_level}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-900/60 border border-gray-100 dark:border-neutral-800 space-y-1">
              <div className="text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Result</div>
              <div className={`text-sm font-bold ${
                data.seniority_alignment.match === 'perfect' ? 'text-emerald-600 dark:text-emerald-400' :
                data.seniority_alignment.match === 'close'   ? 'text-amber-600 dark:text-amber-400'   :
                                                               'text-rose-600 dark:text-rose-400'
              }`}>
                {data.seniority_alignment.match === 'perfect' ? 'Perfect Match' :
                 data.seniority_alignment.match === 'close'   ? 'Strong Match'  : 'Gap Detected'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What-If Simulator */}
      <div className="space-y-3">
        <div className="px-1 flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-neutral-400">
            What-If Simulator
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-sky-500 text-[9px] font-bold text-white">BETA</span>
        </div>
        <WhatIfSimulator
          currentScore={data.match_score || 0}
          matchingSkills={data.matching_skills || []}
          missingSkills={data.missing_skills || []}
        />
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          onClick={() => onTabChange('gaps')}
          className="group p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-left hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-md transition-all shadow-sm"
          whileHover={{ y: -2 }}
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              Critical Gaps
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-snug">
              Identify obstacles holding you back.
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onTabChange('roadmap')}
          className="group p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-left hover:border-sky-300 dark:hover:border-sky-500/30 hover:shadow-md transition-all shadow-sm"
          whileHover={{ y: -2 }}
        >
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-3">
            <MapIcon className="w-4.5 h-4.5 text-sky-500" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              Learning Roadmap
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400 leading-snug">
              Bridging expertise gaps.
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}
