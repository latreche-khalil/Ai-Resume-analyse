'use client'

import { useRef } from 'react'
import { motion, useScroll } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'

// Shared UI
import { ThemeToggle } from '@/components/theme-toggle'

// Landing Components
import { Navigation } from '@/components/landing/Navigation'
import { HeroSection } from '@/components/landing/HeroSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { SolutionSection } from '@/components/landing/SolutionSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { XAISection } from '@/components/landing/XAISection'
import { RoadmapSection } from '@/components/landing/RoadmapSection'
import { ComparisonSection } from '@/components/landing/ComparisonSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export default function Home() {
  const { loading } = useAuth()
  
  if (loading) {
    return <LoadingScreen />
  }

  return <LandingPage />
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center theme-bg">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="inline-block rounded-full h-16 w-16 border-4 border-sky-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="mt-4 theme-text text-lg font-medium">Loading...</p>
      </motion.div>
    </div>
  )
}

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  })

  return (
    <div ref={containerRef} className="relative theme-bg theme-text overflow-hidden">
      {/* Global Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 theme-glow-3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        <Navigation />
        <HeroSection scrollYProgress={scrollYProgress} />
        <StatsSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <XAISection />
        <RoadmapSection />
        <ComparisonSection />
        <FAQSection />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  )
}
