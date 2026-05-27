'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Eye, Target, TrendingUp, MessageSquare, Shield, Zap } from 'lucide-react'

const features = [
  {
    icon: Eye,
    title: 'Explainable AI',
    description: 'Every decision is transparent. See exactly why your CV scored the way it did.',
    gradient: 'from-sky-500 to-blue-600',
    highlight: true
  },
  {
    icon: Target,
    title: 'Smart Matching',
    description: 'AI-powered job matching with 95% accuracy using semantic analysis.',
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    icon: TrendingUp,
    title: 'Skill Gap Analysis',
    description: 'Identify missing skills and get personalized learning recommendations.',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    icon: MessageSquare,
    title: 'Interview Prep',
    description: 'AI-powered mock interviews with real-time feedback and coaching.',
    gradient: 'from-orange-500 to-red-600'
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data is masked during AI processing. Only you can see your PII.',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    icon: Zap,
    title: 'Instant Analysis',
    description: 'Get comprehensive CV analysis in under 60 seconds.',
    gradient: 'from-yellow-500 to-orange-600'
  }
]

export function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} id="features" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-sky-50 dark:bg-white/5 backdrop-blur-sm border border-sky-200 dark:border-white/10 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Zap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Features</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-gray-900 dark:text-white">Everything you need</span>
            <br />
            <span className="bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
              to succeed
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Powerful AI-driven tools designed to give you an unfair advantage in your career.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isHighlight = feature.highlight

            return (
              <motion.div
                key={index}
                className={`group relative ${isHighlight ? 'md:col-span-2 md:row-span-2' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className={`relative h-full p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-white/[0.02] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 overflow-hidden ${isHighlight ? 'md:p-12' : ''}`}>
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} p-3 mb-6 shadow-lg`}>
                    <Icon className={`text-white ${isHighlight ? 'w-8 h-8' : 'w-6 h-6'}`} />
                  </div>

                  {/* Content */}
                  <h3 className={`font-bold text-gray-900 dark:text-white mb-3 ${isHighlight ? 'text-3xl' : 'text-xl'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-gray-600 dark:text-gray-400 ${isHighlight ? 'text-lg max-w-xl' : 'text-base'}`}>
                    {feature.description}
                  </p>

                  {/* Highlight Example */}
                  {isHighlight && (
                    <motion.div
                      className="mt-8 p-6 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                      initial={{ opacity: 0, y: 10 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.6, delay: 0.8 }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 mt-2" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white mb-2">
                            <span className="font-semibold text-sky-600 dark:text-sky-400">"Project Management"</span> skill rated{' '}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">95%</span>
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-500 leading-relaxed">
                            You mentioned leading a team of 10+ people and delivering 5 projects on time, 
                            which semantically matches the job requirement for "team leadership" and "project delivery."
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                  
                  {/* Border Glow */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10`} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
