'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function RoadmapSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const missingSkills = [
    { name: 'Docker', priority: 'High', course: 'Docker Mastery', platform: 'Udemy' },
    { name: 'Kubernetes', priority: 'High', course: 'K8s Fundamentals', platform: 'Coursera' },
    { name: 'AWS', priority: 'Medium', course: 'AWS Solutions Architect', platform: 'A Cloud Guru' }
  ]

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
            Your <span className="text-green-400">Upskilling</span> Roadmap
          </h2>
          <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
            Get personalized learning recommendations to reach 100% job match
          </p>
        </motion.div>

        <motion.div
          className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold theme-text-secondary">Current Match</span>
              <span className="text-2xl font-bold text-yellow-400">75%</span>
            </div>
            <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                initial={{ width: 0 }}
                animate={isInView ? { width: '75%' } : {}}
                transition={{ duration: 1, delay: 0.4 }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">Missing Skills to Reach 100%</h3>
            {missingSkills.map((skill, index) => (
              <motion.div
                key={index}
                className="p-4 rounded-xl theme-card border border-green-500/20 hover:border-green-500/40 transition-all duration-300"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      skill.priority === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {skill.priority}
                    </div>
                    <span className="font-semibold">{skill.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm theme-text-tertiary">
                      <span className="theme-text-quaternary">Learn on:</span> {skill.platform}
                    </div>
                    <motion.button
                      className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Start Learning →
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold theme-text-secondary">Potential Match (After Learning)</span>
              <span className="text-2xl font-bold text-green-400">100%</span>
            </div>
            <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                initial={{ width: '75%' }}
                animate={isInView ? { width: '100%' } : {}}
                transition={{ duration: 1, delay: 1 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
