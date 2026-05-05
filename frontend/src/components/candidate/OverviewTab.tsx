'use client'

import { motion } from 'framer-motion'
import { SkillMatrix } from './SkillMatrix'
import { WhatIfSimulator } from './WhatIfSimulator'
import { Section } from '@/components/shared/UIHelpers'

interface OverviewTabProps {
  data: any
  onTabChange: (tab: any) => void
}

export function OverviewTab({ data, onTabChange }: OverviewTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Skill Matrix */}
      <SkillMatrix
        matchingSkills={data.matching_skills || []}
        transferableSkills={data.transferable_skills || []}
        missingSkills={data.missing_skills || []}
      />

      {/* Professional Analysis */}
      {data.seniority_alignment && (
        <Section title="🎯 تحليل مستوى الخبرة" color="purple">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white/60 mb-1 text-xs">مستواك الحالي</div>
              <div className="font-semibold text-blue-400">{data.seniority_alignment.cv_level}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-white/60 mb-1 text-xs">المستوى المطلوب</div>
              <div className="font-semibold text-purple-400">{data.seniority_alignment.jd_level}</div>
            </div>
            <div className="col-span-2 bg-white/5 rounded-lg p-3">
              <div className="text-white/60 mb-1 text-xs">تقييم التطابق</div>
              <div className={`font-semibold flex items-center gap-2 ${
                data.seniority_alignment.match === 'perfect' ? 'text-green-400' : 
                data.seniority_alignment.match === 'close' ? 'text-yellow-400' : 'text-orange-400'
              }`}>
                {data.seniority_alignment.match === 'perfect' ? '🎯 تطابق مثالي' :
                 data.seniority_alignment.match === 'close' ? '👍 تطابق قريب' : '⚠️ يحتاج تطوير'}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* What-If Simulator */}
      <WhatIfSimulator
        currentScore={data.match_score || 0}
        matchingSkills={data.matching_skills || []}
        missingSkills={data.missing_skills || []}
      />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => onTabChange('gaps')}
          className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4 text-left hover:from-red-500/20 hover:to-orange-500/20 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="text-red-400 text-2xl mb-2">⚠️</div>
          <div className="font-semibold text-sm text-white/90">الفجوات الحرجة</div>
          <div className="text-xs text-white/60">اكتشف ما تحتاج لتعلمه</div>
        </motion.button>

        <motion.button
          onClick={() => onTabChange('roadmap')}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 text-left hover:from-blue-500/20 hover:to-purple-500/20 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="text-blue-400 text-2xl mb-2">🗺️</div>
          <div className="font-semibold text-sm text-white/90">خارطة التعلم</div>
          <div className="text-xs text-white/60">خطة مخصصة للتطوير</div>
        </motion.button>
      </div>
    </motion.div>
  )
}
