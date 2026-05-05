'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function SolutionSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const features = [
    {
      icon: '🧠',
      title: 'Smart Extraction',
      description: 'Advanced OCR + NLP extracts every detail from your CV, even from scanned documents.',
      color: 'from-sky-500 to-blue-500'
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'Automatic PII masking ensures your personal data is protected at all times.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🎯',
      title: 'Vector Analysis',
      description: 'Cosine similarity measures semantic match between your CV and job requirements.',
      color: 'from-green-500 to-emerald-500'
    }
  ]

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
            The Magic <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">Behind the Scenes</span>
          </h2>
          <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
            Cutting-edge technology that understands your career story
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 h-full">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 text-4xl`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="theme-text-secondary leading-relaxed">{feature.description}</p>
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-2xl`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
