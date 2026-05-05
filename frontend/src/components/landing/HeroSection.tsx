'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useTransform, useInView } from 'framer-motion'
import { FloatingCVPreview } from './FloatingCVPreview'

interface HeroSectionProps {
  scrollYProgress: any
}

export function HeroSection({ scrollYProgress }: HeroSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8])
  const y = useTransform(scrollYProgress, [0, 0.2], [0, -100])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-20 px-6">
      <motion.div
        className="max-w-6xl mx-auto text-center relative z-10"
        style={{ opacity, scale, y }}
      >
        {/* Badge */}
        <motion.div
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-yellow-400">✨</span>
          <span className="text-sm font-medium">Powered by Explainable AI</span>
        </motion.div>

        {/* Main Headline */}
        <div className="mb-8">
          {['Your', 'Resume,', 'Reimagined', 'by'].map((word, index) => (
            <motion.span
              key={index}
              className="inline-block text-5xl md:text-7xl lg:text-8xl font-bold mr-4 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              {word}
            </motion.span>
          ))}
          <motion.div
            className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Explainable AI
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          className="text-xl md:text-2xl theme-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Don't just get a score. <span className="theme-text font-semibold">Understand why.</span>
          <br />
          Experience the world's most transparent career intelligence platform.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <Link href="/register">
            <motion.button
              className="px-10 py-5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-black text-xl shadow-2xl shadow-sky-500/20 group relative overflow-hidden"
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(14, 165, 233, 0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">Start Analyzing Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </Link>
          <a href="#how-it-works">
            <motion.button
              className="px-10 py-5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 font-bold text-xl hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              See How It Works
            </motion.button>
          </a>
        </motion.div>

        {/* Floating CV Preview */}
        <motion.div
          className="relative max-w-4xl mx-auto mt-20"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <FloatingCVPreview />
        </motion.div>
      </motion.div>
      
      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-white"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-0 w-full h-full -translate-y-1/2 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -left-20 top-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -right-20 bottom-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
        />
      </div>
    </section>
  )
}
