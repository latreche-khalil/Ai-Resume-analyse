'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'

export function FinalCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-sky-500/20 via-transparent to-transparent" />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent"
          animate={{
            scaleX: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            Ready to Transform Your <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">Career</span>?
          </h2>
          <p className="text-xl theme-text-secondary mb-12 max-w-2xl mx-auto">
            Join thousands of professionals who have already discovered their true potential with AI-powered insights.
          </p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link href="/register">
              <button className="group relative px-8 py-4 rounded-full bg-white text-black font-semibold text-lg overflow-hidden">
                <span className="relative z-10 flex items-center space-x-2">
                  <span>Start Free Analysis</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </button>
            </Link>
            <div className="text-sm theme-text-tertiary">
              No credit card required • Free forever
            </div>
          </motion.div>

          <motion.div
            className="mt-16 flex flex-wrap items-center justify-center gap-8 theme-text-quaternary"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center space-x-2">
              <span>🔒</span>
              <span className="text-sm theme-text-quaternary">GDPR Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🔐</span>
              <span className="text-sm theme-text-quaternary">256-bit Encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>✓</span>
              <span className="text-sm theme-text-quaternary">ISO 27001 Certified</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
