'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function ComparisonSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const comparisons = [
    { feature: 'Semantic Understanding', traditional: false, ours: true },
    { feature: 'Explainable Results', traditional: false, ours: true },
    { feature: 'Privacy Protection', traditional: false, ours: true },
    { feature: 'Skill Gap Analysis', traditional: false, ours: true },
    { feature: 'Learning Recommendations', traditional: false, ours: true },
    { feature: 'Interview Preparation', traditional: false, ours: true }
  ]

  return (
    <section ref={ref} className="relative py-32 px-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Why Choose <span className="text-sky-400">ResumeAI</span>?
          </h2>
        </motion.div>

        <motion.div
          className="relative rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-6 text-left theme-text-tertiary font-medium">Feature</th>
                <th className="p-6 text-center theme-text-tertiary font-medium">Traditional ATS</th>
                <th className="p-6 text-center text-sky-400 font-semibold">ResumeAI</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((item, index) => (
                <motion.tr
                  key={index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <td className="p-6 font-medium">{item.feature}</td>
                  <td className="p-6 text-center">
                    {item.traditional ? (
                      <span className="text-green-400 text-xl">✓</span>
                    ) : (
                      <span className="text-red-400 text-xl">✗</span>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    {item.ours ? (
                      <span className="text-sky-400 text-xl">✓</span>
                    ) : (
                      <span className="text-red-400 text-xl">✗</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
