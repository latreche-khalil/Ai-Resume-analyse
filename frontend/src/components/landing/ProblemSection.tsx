'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function ProblemSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            The <span className="text-red-400">Semantic Gap</span> Problem
          </h2>
          <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
            Traditional ATS systems miss 75% of qualified candidates. Here's why.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            className="relative p-8 rounded-3xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20"
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-xl bg-red-500/20">
                <span className="text-2xl">❌</span>
              </div>
              <h3 className="text-2xl font-bold">Traditional ATS</h3>
            </div>
            <ul className="space-y-4">
              {[
                'Rigid keyword matching only',
                'No semantic understanding',
                'Black box decisions',
                'High false rejection rate',
                'No explanation provided'
              ].map((item, index) => (
                <motion.li
                  key={index}
                  className="flex items-start space-x-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-red-400 mt-1">✗</span>
                  <span className="theme-text-secondary">{item}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 p-4 rounded-xl theme-card border border-red-500/20">
              <p className="text-sm text-red-300 font-mono">
                Result: 75% of qualified candidates rejected
              </p>
            </div>
          </motion.div>

          <motion.div
            className="relative p-8 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-xl bg-green-500/20">
                <span className="text-2xl">✓</span>
              </div>
              <h3 className="text-2xl font-bold">Our AI Engine</h3>
            </div>
            <ul className="space-y-4">
              {[
                'Semantic understanding (NLP)',
                'Context-aware analysis',
                'Explainable AI (XAI)',
                '95% accuracy rate',
                'Detailed explanations'
              ].map((item, index) => (
                <motion.li
                  key={index}
                  className="flex items-start space-x-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-green-400 mt-1">✓</span>
                  <span className="theme-text-secondary">{item}</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8 p-4 rounded-xl theme-card border border-green-500/20">
              <p className="text-sm text-green-300 font-mono">
                Result: Find the perfect match every time
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
