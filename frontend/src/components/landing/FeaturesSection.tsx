'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} id="features" className="relative py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Everything You Need to <span className="text-sky-400">Succeed</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="md:col-span-2 md:row-span-2 relative p-8 rounded-3xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 overflow-hidden group"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="text-5xl mb-6">👁️</div>
            <h3 className="text-3xl font-bold mb-4">Explainable AI (XAI)</h3>
            <p className="theme-text-secondary text-lg mb-6 max-w-xl">
              Every decision is transparent. See exactly why your CV scored the way it did, with detailed explanations for each section.
            </p>
            
            <div className="relative mt-8 p-6 rounded-2xl theme-card border border-sky-500/30">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-sky-400 mt-2" />
                <div>
                  <p className="text-sm theme-text-primary mb-2">
                    <span className="font-semibold text-sky-400">"Project Management"</span> skill rated <span className="text-green-400 font-bold">95%</span>
                  </p>
                  <p className="text-xs theme-text-tertiary">
                    You mentioned leading a team of 10+ people and delivering 5 projects on time, which semantically matches the job requirement for "team leadership" and "project delivery."
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </motion.div>

          {[
            { icon: '🎯', title: 'Smart Matching', desc: 'AI-powered job matching with 95% accuracy' },
            { icon: '📊', title: 'Skill Gap Analysis', desc: 'Identify missing skills and get learning recommendations' },
            { icon: '👥', title: 'Interview Prep', desc: 'AI-powered mock interviews with real-time feedback' },
            { icon: '📈', title: 'Career Insights', desc: 'Track your progress and optimize your career path' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-sky-500/50 transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-sm theme-text-tertiary">{feature.desc}</p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
