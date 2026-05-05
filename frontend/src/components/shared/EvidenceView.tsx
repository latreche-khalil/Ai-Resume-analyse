'use client'

import { motion } from 'framer-motion'

interface EvidenceFor {
  claim: string
  evidence: string
  credibility: string
  weight: number
}

interface EvidenceAgainst {
  gap: string
  required: string
  current: string
  impact: string
  weight: number
}

interface EvidenceViewProps {
  evidenceForMatch: EvidenceFor[]
  evidenceAgainstMatch: EvidenceAgainst[]
}

export function EvidenceView({ 
  evidenceForMatch = [], 
  evidenceAgainstMatch = [] 
}: EvidenceViewProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Evidence For */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✅</span>
          <h3 className="text-lg font-black text-green-400">نقاط القوة والأدلة</h3>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-bold uppercase">
            {evidenceForMatch.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {evidenceForMatch.length === 0 ? (
            <div className="text-center py-8 theme-text-tertiary text-sm">
              <span className="text-3xl mb-2 block">🤔</span>
              لم يتم العثور على أدلة إيجابية كافية
            </div>
          ) : (
            evidenceForMatch.map((evidence, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/15 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl mt-0.5">💪</span>
                  <div className="flex-1">
                    <div className="font-semibold text-green-300 mb-1">
                      {evidence.claim}
                    </div>
                    <div className="text-sm theme-text-secondary leading-relaxed mb-2">
                      "{evidence.evidence}"
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">الموثوقية: {evidence.credibility}</span>
                      <span className="text-[10px] text-green-400 font-black bg-green-500/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                        التأثير: {Math.round(evidence.weight * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Evidence Against */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">❌</span>
          <h3 className="text-lg font-black text-red-400">نقاط الضعف والفجوات</h3>
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px] font-bold uppercase">
            {evidenceAgainstMatch.length}
          </span>
        </div>
        
        <div className="space-y-3">
          {evidenceAgainstMatch.length === 0 ? (
            <div className="text-center py-8 theme-text-tertiary text-sm">
              <span className="text-3xl mb-2 block">🎉</span>
              لم يتم اكتشاف أي نقاط ضعف جوهرية
            </div>
          ) : (
            evidenceAgainstMatch.map((evidence, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/15 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-xl mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <div className="font-semibold text-red-300 mb-2">
                      {evidence.gap}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-2 font-bold uppercase tracking-tight">
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <div className="text-white/40 mb-1">المطلوب في الوظيفة</div>
                        <div className="text-white/80">{evidence.required}</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <div className="text-white/40 mb-1">الموجود في ملفك</div>
                        <div className="text-white/80">{evidence.current}</div>
                      </div>
                    </div>
                    <div className="text-sm theme-text-secondary leading-relaxed mb-2">
                      <span className="text-white/40 text-xs uppercase tracking-wider block mb-1">Impact Description</span>
                      {evidence.impact}
                    </div>
                    <div className="flex items-center justify-end mt-2">
                      <span className="text-[10px] text-red-400 font-black bg-red-500/20 px-2 py-1 rounded-lg uppercase tracking-wider">
                        خصم من الدرجة: -{Math.round(evidence.weight * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
