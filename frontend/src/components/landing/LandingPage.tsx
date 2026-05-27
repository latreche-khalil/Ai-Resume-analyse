'use client'

import { Navigation } from '@/components/landing/Navigation'
import { HeroSection } from '@/components/landing/HeroSection'
import { StatsSection } from '@/components/landing/StatsSection'
import { ProblemSolutionSection } from '@/components/landing/ProblemSolutionSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { XAISection } from '@/components/landing/XAISection'
import { RoadmapSection } from '@/components/landing/RoadmapSection'
import { ComparisonSection } from '@/components/landing/ComparisonSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-700 text-gray-900 dark:text-white overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <ProblemSolutionSection />
      <XAISection />
      <RoadmapSection />
      <ComparisonSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}
