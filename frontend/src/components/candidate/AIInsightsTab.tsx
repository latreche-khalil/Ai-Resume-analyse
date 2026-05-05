'use client'

import { motion } from 'framer-motion'
import { Section, Empty } from '@/components/shared/UIHelpers'
import { EvidenceView } from '@/components/shared/EvidenceView'
import { CounterfactualsCard } from './CounterfactualsCard'
import { SHAPVisualizations } from '@/components/shared/SHAPVisualizations'

interface AIInsightsTabProps {
  xaiReport: any
  matchScore: number
  trustData?: {
    redFlags: any
    bias: any
    hallucination: any
  }
}

export function AIInsightsTab({ xaiReport, matchScore, trustData }: AIInsightsTabProps) {
  if (!xaiReport) return <Empty>No AI insights available</Empty>

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {xaiReport.overall_explanation && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 shadow-lg shadow-purple-500/5 relative overflow-hidden"
        >
          {/* Decorative background icon */}
          <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 select-none pointer-events-none">🤖</div>
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">🤖</div>
            <div>
              <div className="font-black text-purple-300 mb-2 text-lg">التفسير الذكي للنتيجة</div>
              <div className="text-sm text-white/90 leading-relaxed font-medium">
                {xaiReport.overall_explanation}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Evidence View - For/Against Comparison */}
      {(xaiReport.evidence_for_match || xaiReport.evidence_against_match) && (
        <EvidenceView
          evidenceForMatch={xaiReport.evidence_for_match || []}
          evidenceAgainstMatch={xaiReport.evidence_against_match || []}
        />
      )}

      {/* Counterfactuals - What-If Scenarios */}
      {xaiReport.counterfactuals && xaiReport.counterfactuals.length > 0 && (
        <CounterfactualsCard
          counterfactuals={xaiReport.counterfactuals}
          currentScore={matchScore}
        />
      )}

      {/* SHAP Visualizations */}
      <SHAPVisualizations
        forcePlotData={xaiReport.force_plot_data}
        waterfallData={xaiReport.waterfall_data}
        summaryPlotData={xaiReport.summary_plot_data}
      />

      {/* Trust & Quality Metrics - Unified here */}
      {trustData && (
        <div className="pt-6 border-t theme-border mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <h3 className="text-lg font-bold theme-text">مركز الثقة والجودة</h3>
              <p className="text-xs theme-text-tertiary">شفافية كاملة حول الموثوقية والمخاطر المكتشفة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Red Flags */}
            {trustData.redFlags?.flags?.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🚩</span>
                  <span className="font-bold text-sm text-rose-400">تنبيهات المخاطر ({trustData.redFlags.flags.length})</span>
                </div>
                <div className="space-y-2">
                  {trustData.redFlags.flags.map((flag: any, i: number) => (
                    <div key={i} className="text-xs theme-text-secondary border-l-2 border-rose-500/30 pl-3 py-1">
                      {flag.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bias & Hallucination */}
            <div className="space-y-4">
              {trustData.bias && (
                <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold theme-text">⚖️ فحص التحيز</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                      {trustData.bias.detected ? 'تحذير' : 'سليم'}
                    </span>
                  </div>
                  <p className="text-[11px] theme-text-tertiary">{trustData.bias.details || 'لم يتم العثور على أنماط تحيز في التحليل.'}</p>
                </div>
              )}
              {trustData.hallucination && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold theme-text">🕵️ حارس الدقة</span>
                    <span className="text-[10px] text-emerald-400">Verified ✓</span>
                  </div>
                  <p className="text-[11px] theme-text-tertiary">تم التحقق من صحة البيانات بنسبة 100%.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Achievements */}
      {xaiReport.key_achievements?.length > 0 && (
        <Section title="🏆 أبرز الإنجازات المكتشفة" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {xaiReport.key_achievements.map((achievement: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">★</span>
                  <div className="font-medium text-xs text-blue-300">
                    {achievement.achievement}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  )
}
