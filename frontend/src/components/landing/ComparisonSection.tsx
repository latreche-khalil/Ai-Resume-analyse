'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, X } from 'lucide-react'

export function ComparisonSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const features = [
    { name: 'Explainable AI decisions', us: true, them: false },
    { name: 'Semantic skill matching', us: true, them: false },
    { name: 'Privacy-first PII masking', us: true, them: false },
    { name: 'Detailed improvement insights', us: true, them: true },
    { name: 'Interview preparation', us: true, them: false },
    { name: 'Career coaching', us: true, them: false },
    { name: 'Unlimited analyses', us: true, them: false },
    { name: 'Real-time feedback', us: true, them: true }
  ]

  return (
    <section ref={ref} className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-gray-900 dark:text-white">Why choose </span>
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              ResumeAI
            </span>
            <span className="text-gray-900 dark:text-white">?</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-4">
            Compare our features with traditional CV analysis tools
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/50 overflow-hidden shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Header */}
          <div className="grid grid-cols-[2fr,1fr,1fr] gap-6 p-6 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600/50">
            <div className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Feature
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25">
                <span className="text-sm font-bold text-white">ResumeAI</span>
              </div>
            </div>
            <div className="text-center text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Others
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100 dark:divide-slate-600/30">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="grid grid-cols-[2fr,1fr,1fr] gap-6 p-6 hover:bg-gray-50 dark:hover:bg-slate-600/30 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
              >
                <div className="flex items-center">
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {feature.name}
                  </span>
                </div>
                <div className="flex justify-center items-center">
                  {feature.us ? (
                    <motion.div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <div className="flex justify-center items-center">
                  {feature.them ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                      <Check className="w-5 h-5 text-gray-500 dark:text-gray-300" strokeWidth={2} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ready to experience the difference?
          </p>
          <a href="/register">
            <motion.button
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-lg shadow-2xl shadow-sky-500/25"
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(14, 165, 233, 0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              Get started for free
            </motion.button>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
