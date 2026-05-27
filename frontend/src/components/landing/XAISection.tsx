'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Eye, Brain, Shield, Lightbulb } from 'lucide-react'

export function XAISection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const features = [
    {
      icon: Eye,
      title: 'Complete Transparency',
      description: 'See exactly how every decision was made, with detailed explanations for each score.'
    },
    {
      icon: Brain,
      title: 'Semantic Understanding',
      description: 'Our AI understands context and meaning, not just keywords, for accurate matching.'
    },
    {
      icon: Shield,
      title: 'Bias Detection',
      description: 'Built-in fairness checks ensure unbiased analysis across all demographics.'
    },
    {
      icon: Lightbulb,
      title: 'Actionable Insights',
      description: 'Get specific recommendations on how to improve your CV for better results.'
    }
  ]

  return (
    <section ref={ref} id="xai" className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">Powered by</span>
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              Explainable AI
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Unlike black-box AI systems, we show you exactly how and why decisions are made.
            Every score, every match, every recommendation is fully transparent.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            
            return (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className="h-full p-6 rounded-2xl bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/25">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
