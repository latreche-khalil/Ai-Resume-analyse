'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [counts, setCounts] = useState({
    cvs: 0,
    success: 0,
    time: 0,
    privacy: 0
  })

  useEffect(() => {
    if (isInView) {
      const timer = setInterval(() => {
        setCounts(prev => ({
          cvs: Math.min(prev.cvs + 127, 25482),
          success: Math.min(prev.success + 1, 98),
          time: Math.min(prev.time + 0.1, 1.2),
          privacy: Math.min(prev.privacy + 1, 100)
        }))
      }, 20)
      return () => clearInterval(timer)
    }
  }, [isInView])

  const stats = [
    { value: `${counts.cvs.toLocaleString()}+`, label: 'CVs Analyzed', icon: '📄' },
    { value: `${counts.success}%`, label: 'Success Rate', icon: '📈' },
    { value: `${counts.time}s`, label: 'Avg Analysis Time', icon: '⚡' },
    { value: `${counts.privacy}%`, label: 'Privacy Protected', icon: '🔒' }
  ]

  return (
    <section ref={ref} className="relative py-20 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-sky-500/50 transition-all duration-300 group-hover:scale-105">
                <div className="text-4xl mb-4">{stat.icon}</div>
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-sm theme-text-tertiary">{stat.label}</div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
