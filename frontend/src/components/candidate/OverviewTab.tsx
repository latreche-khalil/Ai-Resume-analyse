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
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Semantic Skill Mapping
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
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
        <div className="p-7 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center border border-purple-100 dark:border-purple-500/20">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Experience Alignment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Candidate</div>
              <div className="text-lg font-extrabold text-sky-600 dark:text-sky-400">{data.seniority_alignment.cv_level}</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requirement</div>
              <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400">{data.seniority_alignment.jd_level}</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Result</div>
              <div className={`text-base font-extrabold ${
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
      <div className="space-y-4">
        <div className="px-1 flex items-center gap-2.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            What-If Simulator
          </h3>
          <span className="px-2 py-0.5 rounded bg-sky-500 text-[9px] font-black text-white uppercase tracking-wider">BETA</span>
        </div>
        <WhatIfSimulator
          currentScore={data.match_score || 0}
          matchingSkills={data.matching_skills || []}
          missingSkills={data.missing_skills || []}
          whatIfScenarios={data.xai_report?.what_if_scenarios || []}
        />
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          onClick={() => onTabChange('gaps')}
          className="group p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-rose-300 dark:hover:border-rose-500/30 hover:shadow-lg transition-all shadow-md"
          whileHover={{ y: -2 }}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-500/20">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="space-y-2">
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Critical Gaps
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Identify obstacles holding you back.
            </p>
          </div>
        </motion.button>

        <motion.button
          onClick={() => onTabChange('roadmap')}
          className="group p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left hover:border-sky-300 dark:hover:border-sky-500/30 hover:shadow-lg transition-all shadow-md"
          whileHover={{ y: -2 }}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-4 border border-sky-100 dark:border-sky-500/20">
            <MapIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="space-y-2">
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Learning Roadmap
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Bridging expertise gaps.
            </p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  )
}
