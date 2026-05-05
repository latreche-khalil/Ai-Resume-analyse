'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function XAISection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-32 px-6 theme-glow-bg">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Explainable AI</span> in Action
          </h2>
          <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
            Transparency is at the heart of our platform. See exactly how AI evaluates your CV.
          </p>
        </motion.div>

        <motion.div
          className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="text-sm text-blue-400 font-semibold mb-2">CV EXCERPT</div>
              <div className="p-6 rounded-2xl theme-card border border-blue-500/30">
                <p className="theme-text-primary leading-relaxed">
                  "Led a cross-functional team of <span className="bg-blue-500/20 px-1 rounded">10 engineers</span> to deliver 
                  <span className="bg-blue-500/20 px-1 rounded"> 5 major projects</span> on time and under budget. 
                  Implemented <span className="bg-blue-500/20 px-1 rounded">Agile methodologies</span> resulting in 
                  <span className="bg-blue-500/20 px-1 rounded"> 40% productivity increase</span>."
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-cyan-400 font-semibold mb-2">AI EXPLANATION</div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-cyan-500/30 theme-card">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-xl">
                    🧠
                  </div>
                  <div>
                    <div className="font-semibold text-cyan-400 mb-2">High Match Score: 95%</div>
                    <p className="text-sm theme-text-primary leading-relaxed">
                      Your "Project Management" skill is rated highly because:
                    </p>
                  </div>
                </div>
                
                <ul className="space-y-2 ml-11">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span className="text-sm theme-text-secondary">Team leadership (10+ people) matches job requirement</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span className="text-sm theme-text-secondary">Quantifiable results (5 projects, 40% increase)</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span className="text-sm theme-text-secondary">Agile methodology aligns with company culture</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
