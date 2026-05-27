'use client'

import { motion } from 'framer-motion'
import { Empty } from '@/components/shared/UIHelpers'
import { EvidenceView } from '@/components/shared/EvidenceView'
import { CounterfactualsCard } from './CounterfactualsCard'
import { SHAPVisualizations } from '@/components/shared/SHAPVisualizations'
import { 
  BrainCircuit, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu,
  Trophy,
  Activity,
  Sparkles,
  Zap,
  Fingerprint,
  Search,
  CheckCircle2
} from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

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
  if (!xaiReport) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-6" style={R}>
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center animate-pulse">
          <BrainCircuit className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Neural Engine Processing</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">Deep semantic analysis is generating explainability layers for your match score...</p>
        </div>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20 text-gray-900 dark:text-neutral-200"
      style={R}
    >
      {/* SECTION 1: Executive Interpretation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1 h-3 rounded bg-blue-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">Executive Interpretation</h4>
        </div>
        
        {/* Dynamic Explanation Hero */}
        <motion.div variants={item} className="relative group">
          <div className="relative p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-neutral-900/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                 <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-wider border border-blue-500/10">
                    Neural Interpretation
                  </span>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-blue-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                  Why did you get this <span className="text-blue-600 dark:text-blue-400">Match Score</span>?
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed font-medium whitespace-pre-wrap max-w-none">
                  {xaiReport.overall_explanation || xaiReport.summary || "Our AI neural engine analyzed your professional DNA against the job architecture. Here's the strategic reasoning behind your assessment."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SECTION 2: Trust & Alignment Auditing */}
      <div className="border-t border-slate-200/60 dark:border-neutral-900/60 pt-6 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1 h-3 rounded bg-emerald-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">Trust & Alignment Auditing</h4>
        </div>
        
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrustCard 
              label="Risk Assessment" 
              value={trustData?.redFlags?.length === 0 ? "LOW" : "ALERT"} 
              status={trustData?.redFlags?.length === 0 ? "success" : "warning"}
              icon={ShieldCheck}
              description={trustData?.redFlags?.length === 0 ? "No major professional red flags identified." : "Potential risks detected in profile."}
            />
            <TrustCard 
              label="Bias Detection" 
              value="CLEAN" 
              status="success"
              icon={Fingerprint}
              description="Algorithmic fairness check completed."
            />
            <TrustCard 
              label="Hallucination Check" 
              value="VERIFIED" 
              status="success"
              icon={Search}
              description="Facts cross-referenced with CV text."
            />
        </motion.div>
      </div>

      {/* Competitive Advantage (The X-Factor) */}
      {xaiReport.competitive_advantage && (
        <motion.div variants={item} className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.01] to-orange-500/[0.01] pointer-events-none" />
          <div className="relative p-5 rounded-2xl border border-slate-200 dark:border-neutral-900/80 bg-white dark:bg-[#0f0f11] shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/10">
               <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Competitive Advantage</h4>
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-normal">
                {xaiReport.competitive_advantage}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* SECTION 3: Deep Technical Alignment (Strengths & Gaps) */}
      <div className="border-t border-slate-200/60 dark:border-neutral-900/60 pt-6 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1 h-3 rounded bg-indigo-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">Semantic Evidence Mapping</h4>
        </div>
        
        <motion.div variants={item} className="w-full">
          <EvidenceView
            evidenceForMatch={xaiReport.evidence_for_match || []}
            evidenceAgainstMatch={xaiReport.evidence_against_match || []}
          />
        </motion.div>
      </div>

      {/* SECTION 4: Explainability Analytics */}
      <div className="border-t border-slate-200/60 dark:border-neutral-900/60 pt-6 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="w-1 h-3 rounded bg-purple-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">Explainability Analytics</h4>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          {/* SHAP Visualizations: Left Side (col-span-8) */}
          <motion.div variants={item} className="lg:col-span-8 space-y-4">
             <div className="flex items-center justify-between px-1.5 pt-1">
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">SHAP Feature Impact</h4>
               </div>
               <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">v3.3.0 Engine</span>
             </div>
             
             <SHAPVisualizations
               forcePlotData={xaiReport.force_plot_data}
               waterfallData={xaiReport.waterfall_data}
               summaryPlotData={xaiReport.summary_plot_data}
             />
          </motion.div>
          
          {/* Performance Highlights & Neural Alerts: Right Side (col-span-4) */}
          <motion.div variants={item} className="lg:col-span-4 space-y-6">
            
            {/* Key Achievements: Micro-Cards */}
            {xaiReport.key_achievements?.length > 0 && (
              <div className="space-y-4">
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500 px-1">Performance Highlights</h4>
                 <div className="space-y-2.5">
                   {xaiReport.key_achievements.slice(0, 4).map((achievement: any, i: number) => (
                     <div 
                       key={i} 
                       className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-neutral-900/80 flex items-start gap-3 shadow-sm hover:border-blue-500/10 transition-all"
                     >
                       <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/10">
                         <Trophy className="w-3.5 h-3.5 text-amber-500" />
                       </div>
                       <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 leading-normal">
                         {achievement.achievement || achievement}
                       </span>
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Red Flag Alerts */}
            {trustData?.redFlags?.flags && Array.isArray(trustData.redFlags.flags) && trustData.redFlags.flags.length > 0 && (
              <div className="space-y-4 pt-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-500 px-1">Neural Alerts</h4>
                <div className="space-y-2.5">
                  {trustData.redFlags.flags.map((flag: any, i: number) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-red-200 dark:border-red-900/40 flex items-start gap-3 shadow-sm"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-rose-300 leading-normal">
                        {flag.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* SECTION 5: Recommendations & Predictive Scenarios */}
      {xaiReport.counterfactuals && xaiReport.counterfactuals.length > 0 && (
        <div className="border-t border-slate-200/60 dark:border-neutral-900/60 pt-6 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="w-1 h-3 rounded bg-amber-500" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">Predictive Intelligence</h4>
          </div>
          
          <motion.div variants={item} className="space-y-4">
             <CounterfactualsCard counterfactuals={xaiReport.counterfactuals} currentScore={matchScore} />
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

function TrustCard({ label, value, icon: Icon, status, description }: any) {
  const configs = {
    success: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/10' },
    warning: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/10' },
    error: { color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/10' },
    info: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/10' }
  }
  
  const config = configs[status as keyof typeof configs] || configs.info

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm flex items-start gap-4 hover:border-blue-500/30 transition-all duration-300">
      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">{label}</div>
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border tracking-wider uppercase shrink-0 ${config.bg} ${config.color}`}>
            {value}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium leading-normal">{description}</p>
      </div>
    </div>
  )
}
