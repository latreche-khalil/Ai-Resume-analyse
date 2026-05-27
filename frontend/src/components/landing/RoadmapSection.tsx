'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Upload, Scan, Target, TrendingUp } from 'lucide-react'

const steps = [
  {
    icon: Upload,
    title: 'Upload Your CV',
    description: 'Simply upload your resume in PDF or DOCX format. We support multiple languages.',
    color: 'from-sky-500 to-blue-600'
  },
  {
    icon: Scan,
    title: 'AI Analysis',
    description: 'Our AI extracts skills, experience, and qualifications with 95% accuracy.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: Target,
    title: 'Match with Jobs',
    description: 'Compare your CV against job descriptions to see how well you match.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    icon: TrendingUp,
    title: 'Get Insights',
    description: 'Receive detailed explanations and actionable recommendations to improve.',
    color: 'from-orange-500 to-red-600'
  }
]

export function RoadmapSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">How it</span>{' '}
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              works
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get started in minutes with our simple 4-step process
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 dark:from-white/20 to-transparent -translate-x-1/2 z-0" />
                )}

                <div className="relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-500/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-200">{index + 1}</span>
                  </div>

                  {/* Card */}
                  <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
