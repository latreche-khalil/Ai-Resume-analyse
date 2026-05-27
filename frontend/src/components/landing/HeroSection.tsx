'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Sparkles, Zap, Shield, CheckCircle2, TrendingUp, Brain } from 'lucide-react'

export function HeroSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  // Typing animation
  const [typedText, setTypedText] = useState('')
  const phrases = ['Reimagined by AI', 'Explained by AI', 'Powered by AI', 'Understood by AI']
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < currentPhrase.length) {
          setTypedText(currentPhrase.slice(0, typedText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (typedText.length > 0) {
          setTypedText(currentPhrase.slice(0, typedText.length - 1))
        } else {
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % phrases.length)
        }
      }
    }, isDeleting ? 50 : 100)
    return () => clearTimeout(timeout)
  }, [typedText, isDeleting, phraseIndex, phrases])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <section ref={ref} className="relative min-h-[calc(100vh-3.5rem)] sm:min-h-screen flex items-center justify-center overflow-hidden pt-14 sm:pt-16 pb-8 sm:pb-0">
      {/* Static background — no heavy animations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
        {/* Static ambient blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/8 dark:bg-sky-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/8 dark:bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {/* Split Layout: Text Left, Visual Right */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16 items-center">
          
          {/* Left Column - Content */}
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Main Headline with Typing Animation */}
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                <motion.span
                  className="block text-gray-900 dark:text-white mb-1 sm:mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  Your Resume,
                </motion.span>
                <span className="block relative whitespace-nowrap">
                  <motion.span
                    className="bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 dark:from-sky-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      backgroundSize: '200% 200%'
                    }}
                  >
                    {typedText}
                    <motion.span
                      className="inline-block w-1 h-[0.8em] bg-sky-500 dark:bg-sky-400 ml-1"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  </motion.span>
                </span>
              </h1>
            </motion.div>

            {/* Subtitle with Highlight */}
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed"
            >
              Don't just get a score.{' '}
              <motion.span
                className="text-gray-900 dark:text-white font-semibold relative inline-block"
                whileHover={{ scale: 1.05 }}
              >
                Understand why.
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-sky-500 to-blue-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                />
              </motion.span>
              <br className="hidden sm:block" />
              <span className="block sm:inline"> Experience the world's most transparent career intelligence platform.</span>
            </motion.p>

            {/* CTAs with Enhanced Animations */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <motion.button
                  className="group relative w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-base lg:text-lg shadow-2xl shadow-sky-500/25 overflow-hidden"
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: '0 20px 40px rgba(14, 165, 233, 0.4)',
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '0%' }}
                    transition={{ duration: 0.3 }}
                  />
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Start analyzing now</span>
                    <motion.div
                      className="inline-block"
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </span>
                </motion.button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <motion.button
                  className="w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 rounded-xl bg-white/80 dark:bg-slate-700/60 backdrop-blur-xl border border-gray-200 dark:border-slate-600/50 text-gray-900 dark:text-white font-semibold text-base lg:text-lg hover:bg-white dark:hover:bg-slate-600/60 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all shadow-lg"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  See how it works
                </motion.button>
              </a>
            </motion.div>

            {/* Trust Indicators with Icons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6"
            >
              {[
                { icon: Zap, text: '95% Match Accuracy', color: 'text-yellow-500 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10', borderColor: 'border-yellow-200 dark:border-yellow-500/20' },
                { icon: Shield, text: 'Privacy-First', color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10', borderColor: 'border-green-200 dark:border-green-500/20' },
                { icon: Brain, text: 'Explainable AI', color: 'text-purple-500 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-500/10', borderColor: 'border-purple-200 dark:border-purple-500/20' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg ${item.bgColor} backdrop-blur-sm border ${item.borderColor}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.2 }}
                >
                  <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column - Enhanced Hero Visual with 3D Effect */}
          <motion.div
            variants={itemVariants}
            className="relative perspective-1000 hidden lg:block"
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-600/50 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/60 dark:to-slate-700/40 backdrop-blur-xl shadow-2xl"
              whileHover={{ rotateX: 2, rotateY: 2, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Mock Dashboard Preview with Animations */}
              <div className="aspect-[4/3] p-6">
                <div className="h-full rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-slate-700 dark:to-slate-750 border border-gray-200 dark:border-slate-600/30 p-4 flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600" />
                      <div>
                        <motion.div
                          className="h-2 w-24 bg-gray-200 dark:bg-white/10 rounded"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                          className="h-1.5 w-16 bg-gray-100 dark:bg-white/5 rounded mt-1"
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-1.5">
                      <motion.div
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      />
                      <motion.div
                        className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5"
                        whileHover={{ scale: 1.1, rotate: -5 }}
                      />
                    </div>
                  </div>

                  {/* Content Grid with Stagger Animation */}
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <motion.div
                      className="col-span-2 rounded-lg bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20 p-3 relative overflow-hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="h-2 w-28 bg-sky-200 dark:bg-white/20 rounded mb-2" />
                      <div className="h-1.5 w-full bg-sky-100 dark:bg-white/10 rounded mb-1.5" />
                      <div className="h-1.5 w-3/4 bg-sky-100 dark:bg-white/10 rounded" />
                    </motion.div>
                    
                    <motion.div
                      className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 p-3"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="h-2 w-14 bg-gray-200 dark:bg-white/10 rounded mb-2" />
                      <motion.div
                        className="h-6 w-full bg-gradient-to-r from-green-400 to-emerald-500 rounded flex items-center justify-center text-white font-bold text-base"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        95%
                      </motion.div>
                    </motion.div>
                    
                    <motion.div
                      className="rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 p-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <div className="h-2 w-16 bg-gray-200 dark:bg-white/10 rounded mb-2" />
                      <div className="space-y-1.5">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 bg-gray-200 dark:bg-white/5 rounded"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                            style={{ width: `${100 - i * 20}%` }}
                          />
                        ))}
                      </div>
                    </motion.div>
                    
                    <motion.div
                      className="col-span-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 p-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <div className="h-2 w-24 bg-gray-200 dark:bg-white/10 rounded mb-2" />
                      <div className="flex flex-wrap gap-1.5">
                        {['React', 'Node.js', 'Python', 'AWS', 'Docker', 'AI'].map((skill, i) => (
                          <div
                            key={i}
                            className="px-2 py-0.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] rounded-full font-medium"
                          >
                            {skill}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Static Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
            </motion.div>

            {/* Static Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-xl shadow-sky-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            
            <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 shadow-xl shadow-purple-500/30 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>

            <div className="absolute top-1/2 -right-6 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 hidden sm:block">
        <div className="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-white/20 flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600 dark:bg-white/60 mt-1" />
        </div>
      </div>
    </section>
  )
}
