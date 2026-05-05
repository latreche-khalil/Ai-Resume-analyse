'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'

// Components
import { GlobalPulseCard } from '@/components/candidate/GlobalPulseCard'
import { SkillBubbleChart } from '@/components/candidate/SkillBubbleChart'
import { PulseUploadZone } from '@/components/candidate/PulseUploadZone'
import { GoalTracker } from '@/components/candidate/GoalTracker'
import { ActivityRow } from '@/components/candidate/ActivityRow'
import { RoadmapStep } from '@/components/candidate/RoadmapStep'
import { XAITooltip } from '@/components/candidate/XAITooltip'
import { PrivacyIndicator } from '@/components/candidate/PrivacyIndicator'
import { RecommendedSkills } from '@/components/candidate/RecommendedSkills'
import { ActivityHeatmap } from '@/components/candidate/ActivityHeatmap'

// Hooks
import { useCounter } from '@/hooks/candidate/useCounter'
import { useDashboardData } from '@/hooks/candidate/useDashboardData'

// Types
import { CVDocument, MentorCard, RoadmapStepData } from '@/types/candidate'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', href: '/?preview=1', active: false },
  { icon: '⚡', label: 'Dashboard', href: '/dashboard', active: true },
  { icon: '📄', label: 'My Resumes', href: '/documents', active: false },
  { icon: '🧪', label: 'Skill Lab', href: '/analysis/new', active: false },
  { icon: '🎤', label: 'AI Coach', href: '/coaching/career-chat', active: false },
  { icon: '🎯', label: 'Mock Interview', href: '/coaching/interview', active: false },
  { icon: '⚙️', label: 'Settings', href: '/settings', active: false },
]

export function CandidateDashboardView() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mentorIndex, setMentorIndex] = useState(0)
  
  const { cvDocuments, loading, stats, skills, mentorCards, roadmap } = useDashboardData()

  const employabilityScore = stats?.employability_score || 0
  const profileStrength = stats?.profile_strength || 0
  const totalSkills = stats?.skills_count || (skills ? skills.length : 0)
  const topIndustry = stats?.top_industry || null
  
  const hasCV = (cvDocuments && cvDocuments.length > 0) || (stats !== null && stats.total_cvs > 0)

  const empCounter = useCounter(employabilityScore)
  const skillCounter = useCounter(totalSkills)
  const profCounter = useCounter(profileStrength)

  const recommendedSkills = stats?.recommended_skills || []
  const activityData = stats?.activity_heatmap || []
  const [xaiExplanation, setXaiExplanation] = useState<string>('')

  const handleRequestXAI = async () => {
    if (employabilityScore > 70) {
      setXaiExplanation(`Your score of ${employabilityScore}% is driven by strong alignment in ${skills[0]?.name || 'core skills'}.`)
    } else {
      setXaiExplanation(`Focus on adding ${recommendedSkills[0]?.name || 'technical skills'} to boost your score above 75%.`)
    }
  }

  useEffect(() => {
    if (mentorCards && mentorCards.length > 0) {
      const timer = setInterval(() => setMentorIndex(i => (i + 1) % mentorCards.length), 6000)
      return () => clearInterval(timer)
    }
  }, [mentorCards])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const quickActions = [
    { icon: '📤', label: 'Upload', href: '/upload', show: true },
    { icon: '🎯', label: 'Analyze', href: '/analysis/new', show: hasCV },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 72 }}
        className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 flex flex-col"
      >
        <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-gray-900 dark:text-white"
              >
                ResumeAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="m-3 p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <motion.span animate={{ rotate: sidebarOpen ? 0 : 180 }}>◀</motion.span>
        </button>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.first_name || 'there'}! 👋
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {quickActions.filter(a => a.show).map((action) => (
              <Link key={action.label} href={action.href}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 text-sm rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors shadow-sm"
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.label}
                </motion.button>
              </Link>
            ))}
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                className="w-12 h-12 rounded-full border-4 border-sky-600 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <GlobalPulseCard
                    label="Employability Score"
                    value={hasCV ? `${empCounter}%` : '—'}
                    icon="🚀"
                    color="from-sky-500/10 to-blue-500/10"
                    border="border-sky-200 dark:border-sky-900"
                    sub={hasCV ? 'Based on latest CV' : 'Upload a CV to start'}
                    index={0}
                  />
                  {hasCV && (
                    <div className="absolute top-2 right-2">
                      <XAITooltip
                        score={employabilityScore}
                        explanation={xaiExplanation}
                        onRequestExplanation={handleRequestXAI}
                      />
                    </div>
                  )}
                </div>
                <GlobalPulseCard
                  label="Total Skills"
                  value={hasCV ? skillCounter : '—'}
                  icon="🧠"
                  color="from-blue-500/10 to-cyan-500/10"
                  border="border-blue-200 dark:border-blue-900"
                  sub={hasCV ? 'Detected from CVs' : 'Upload to discover'}
                  index={1}
                />
                <GlobalPulseCard
                  label="Top Industry"
                  value={hasCV ? (topIndustry || '—') : '—'}
                  icon="🏭"
                  color="from-green-500/10 to-emerald-500/10"
                  border="border-green-200 dark:border-green-900"
                  sub={hasCV ? 'Best match' : 'Upload to identify'}
                  small
                  index={2}
                />
                <GlobalPulseCard
                  label="Profile Strength"
                  value={hasCV ? `${profCounter}%` : '—'}
                  icon="💪"
                  color="from-orange-500/10 to-amber-500/10"
                  border="border-orange-200 dark:border-orange-900"
                  sub={hasCV ? `${100 - profileStrength}% to complete` : 'Upload to build'}
                  index={3}
                />
              </div>

              {/* Action Hub */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Upload Zone</h2>
                  <PulseUploadZone />
                  <PrivacyIndicator />
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Goal Tracker</h2>
                  <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <GoalTracker stats={stats} hasCV={hasCV} />
                  </div>
                </div>
              </div>

              {/* Skills & Mentor */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Skills Map</h2>
                  <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    {hasCV && skills && skills.length > 0 ? (
                      <>
                        <SkillBubbleChart skills={skills} />
                        {stats && stats.total_analyses > 0 && (
                          <RecommendedSkills skills={recommendedSkills} />
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-5xl mb-4">🧠</div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">No Skills Yet</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Upload your CV to discover</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">AI Mentor</h2>
                  <div className="space-y-3">
                    {mentorCards && mentorCards.map((card: MentorCard, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 bg-gradient-to-br ${card.color} rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm`}
                      >
                        <div className="flex gap-3">
                          <span className="text-2xl">{card.icon}</span>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{card.title}</p>
                            <p className="text-sm text-gray-900 dark:text-white">{card.body}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity & Roadmap */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Recent Activity</h2>
                  {cvDocuments && cvDocuments.length > 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                        <ActivityHeatmap activities={activityData} />
                      </div>
                      <div className="space-y-2">
                        {cvDocuments.slice(0, 5).map((cv: CVDocument, i: number) => (
                          <ActivityRow key={cv.id} cv={cv} index={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                      <div className="text-5xl mb-4">📭</div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">No CVs yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload your first CV</p>
                      <Link href="/upload">
                        <button className="px-6 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors shadow-sm">
                          Upload CV
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Next Steps</h2>
                  <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    {roadmap && roadmap.map((step: RoadmapStepData, i: number) => (
                      <RoadmapStep key={step.step} step={step} isLast={i === (roadmap ? roadmap.length - 1 : 0)} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
