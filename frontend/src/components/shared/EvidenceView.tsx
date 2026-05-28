
'use client'

import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Fingerprint, 
  Zap,
  Globe,
  Plus
} from 'lucide-react'

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Evidence For - Strengths */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-1.5">
          <div className="flex items-center gap-2.5">
             <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-neutral-400 mb-0.5">Asset Inventory</h3>
               <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Strengths & Proofs</h2>
             </div>
          </div>
          <span className="text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
            {evidenceForMatch.length}
          </span>
        </div>
        
        <div className="space-y-3.5">
          {evidenceForMatch.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50/[0.02] text-center space-y-3">
               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400 dark:text-neutral-500">
                  <Fingerprint className="w-5 h-5" />
               </div>
               <p className="text-sm text-slate-600 dark:text-neutral-400 font-bold">Insufficient positive evidence detected for this domain.</p>
            </div>
          ) : (
            evidenceForMatch.map((evidence, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all shadow-sm group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <div className="flex-1 space-y-2.5">
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-sm leading-tight tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {evidence.claim}
                    </h4>
                    <div className="relative pl-3 border-l-2 border-emerald-500/20 dark:border-emerald-500/30 py-0.5">
                      <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-semibold italic">
                        "{evidence.evidence}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-neutral-900/50">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        evidence.credibility === 'high' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}>
                        {evidence.credibility} confidence
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Weight: {Math.round((evidence.weight || 0.1) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Evidence Against - Gaps */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-1.5">
          <div className="flex items-center gap-2.5">
             <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-neutral-400 mb-0.5">Deficit Analysis</h3>
               <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Weaknesses & Gaps</h2>
             </div>
          </div>
          <span className="text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
            {evidenceAgainstMatch.length}
          </span>
        </div>
        
        <div className="space-y-3.5">
          {evidenceAgainstMatch.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800 bg-slate-50/[0.02] text-center space-y-3">
               <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
               </div>
               <p className="text-sm text-slate-600 dark:text-neutral-400 font-bold">No critical weaknesses detected in the analyzed domains.</p>
            </div>
          ) : (
            evidenceAgainstMatch.map((evidence, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] hover:border-rose-500/30 dark:hover:border-rose-500/30 transition-all shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(244,67,54,0.4)]" />
                  <div className="flex-1 space-y-3.5">
                    <h4 className="font-extrabold text-gray-900 dark:text-white text-sm leading-tight tracking-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {evidence.gap}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50 dark:bg-[#131316] border border-gray-100 dark:border-neutral-900/60 rounded-xl">
                        <div className="text-[10px] font-extrabold text-slate-700 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Required Standard</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-normal">{evidence.required}</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-[#131316] border border-gray-100 dark:border-neutral-900/60 rounded-xl">
                        <div className="text-[10px] font-extrabold text-slate-700 dark:text-neutral-400 uppercase tracking-wider mb-1.5">Candidate State</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-normal">{evidence.current || 'Not Mentioned'}</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-semibold">
                       {evidence.impact}
                    </p>

                    <div className="flex items-center justify-end pt-2.5 border-t border-gray-100 dark:border-neutral-900/50">
                      <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20 flex items-center gap-1.5">
                         <Zap className="w-3.5 h-3.5" /> Impact: -{Math.round((evidence.weight || 0.1) * 100)}%
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
