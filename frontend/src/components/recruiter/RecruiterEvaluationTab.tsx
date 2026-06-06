'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, HelpCircle, Award, Target, Info } from 'lucide-react'

interface RecruiterEvaluationTabProps {
  data: any
}

export function RecruiterEvaluationTab({ data }: RecruiterEvaluationTabProps) {
  const evidenceFor = data.evidence_for_hire || []
  const evidenceAgainst = data.evidence_against_hire || []
  const questions = data.interview_questions || []
  const recommendation = data.hiring_recommendation || ''
  const seniority = data.seniority_alignment || {}

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 1. Hiring Manager Recommendation Banner */}
      {recommendation && (
        <motion.div
          variants={itemVariants}
          className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-blue-950/20 dark:via-[#0c0c0f] dark:to-indigo-950/10 shadow-sm"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex flex-col md:flex-row gap-5 items-start">
            <div className="p-3.5 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white shadow-md shadow-blue-500/20 shrink-0">
              <Target className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                🎯 Hiring Manager Recommendation
              </span>
              <p className="text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {recommendation}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. Seniority Alignment Section */}
      {seniority && seniority.cv_level && seniority.cv_level !== 'unknown' && (
        <motion.div
          variants={itemVariants}
          className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border border-purple-100 dark:border-purple-900/30">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Seniority Fit Analysis
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-[#0f0f12] border border-slate-100 dark:border-slate-800/60 space-y-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Candidate Level</span>
              <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 truncate">{seniority.cv_level}</div>
            </div>
            <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-[#0f0f12] border border-slate-100 dark:border-slate-800/60 space-y-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">JD Requirement</span>
              <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 truncate">{seniority.jd_level}</div>
            </div>
            <div className="p-4.5 rounded-2xl bg-slate-50 dark:bg-[#0f0f12] border border-slate-100 dark:border-slate-800/60 space-y-1">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Match Decision</span>
              <div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                  seniority.match === 'matched' || seniority.match === 'perfect'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                    : seniority.match === 'overqualified'
                    ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/30'
                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                }`}>
                  {seniority.match}
                </span>
              </div>
            </div>
          </div>

          {seniority.explanation && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              {seniority.explanation}
            </p>
          )}
        </motion.div>
      )}

      {/* 3. Evidence For Hire & Concerns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence For Hire Card */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Evidence For Hire
            </h3>
          </div>

          {evidenceFor.length > 0 ? (
            <ul className="space-y-3.5">
              {evidenceFor.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 mt-0.5">
                    +
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic font-medium">No clear hire evidence detected.</p>
          )}
        </motion.div>

        {/* Concerns Card */}
        <motion.div
          variants={itemVariants}
          className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Concerns & Gaps
            </h3>
          </div>

          {evidenceAgainst.length > 0 ? (
            <ul className="space-y-3.5">
              {evidenceAgainst.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-xs shrink-0 mt-0.5">
                    −
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic font-medium">No significant concerns detected.</p>
          )}
        </motion.div>
      </div>

      {/* 4. Suggested Interview Questions */}
      {questions.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
              <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Suggested Interview Questions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q: string, i: number) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0e0e11] hover:border-indigo-150 dark:hover:border-indigo-950/60 transition-all flex gap-4"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  {q}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
