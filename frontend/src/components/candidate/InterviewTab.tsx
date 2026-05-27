'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { MessageSquare, ChevronRight, Mic, BookOpen, Target, Zap } from 'lucide-react'

const R = { fontFamily: 'Roboto, sans-serif' }

export function InterviewTab({ guide, interviewReport, cvId }: any) {
  const router = useRouter()
  const report = guide || interviewReport

  if (!report) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-5" style={R}>
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
          <Mic className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Interview Guide Yet</h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            Complete the analysis to generate a personalized interview preparation guide.
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      style={R}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Interview Preparation</h3>
      </div>

      {/* Strategy */}
      {(report.strategy || report.overview) && (
        <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
          <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Preparation Strategy</h4>
          <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed">
            {report.strategy || report.overview}
          </p>
        </div>
      )}

      {/* Questions */}
      {report.questions?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide px-1">
            Likely Questions
          </h4>
          <div className="space-y-2.5">
            {report.questions.slice(0, 6).map((q: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                      {q.question || q}
                    </p>
                    {q.tip && (
                      <p className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
                        💡 {q.tip}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Key Topics */}
      {report.key_topics?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide px-1">
            Key Topics to Review
          </h4>
          <div className="flex flex-wrap gap-2">
            {report.key_topics.map((topic: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-xs font-medium text-gray-700 dark:text-neutral-300 shadow-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => router.push(cvId ? `/interview/${cvId}` : '/interview')}
        className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/20 transition-all"
      >
        <Zap className="w-4 h-4" />
        Start AI Interview Simulation
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  )
}
