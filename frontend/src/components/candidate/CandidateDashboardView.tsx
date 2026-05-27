'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  FileText, Target, Zap, BrainCircuit, Cpu, Plus,
  Activity, TrendingUp, ArrowRight, Sparkles, ChevronRight,
  MessageSquare, Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useDashboardData } from '@/hooks/candidate/useDashboardData'

interface RechartsBundleProps {
  type: 'radar' | 'area' | 'donut' | 'bar'
  data: any[]
  center?: string
}

const RechartsBundle = dynamic<RechartsBundleProps>(
  () => import('@/components/shared/RechartsBundle'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="w-5 h-5 border-2 border-gray-200 dark:border-slate-600 border-t-sky-500 rounded-full animate-spin" /></div> }
)

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function StatCard({ label, value, icon: Icon, loading = false, trend, up, color }: {
  label: string; value: string | number; icon: React.ElementType; loading?: boolean; trend?: string; up?: boolean; color: string
}) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.15 } }}
      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">{label}</p>
          {loading ? <div className="h-7 w-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" /> : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
              {trend && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${up ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-gray-400 bg-gray-100 dark:bg-slate-700'}`}>{trend}</span>}
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}

function SectionCard({ title, subtitle, children, className = '', action }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string; action?: { label: string; href: string }
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <Link href={action.href}><button className="text-[11px] font-semibold text-sky-500 hover:text-sky-400 flex items-center gap-1 transition-colors">{action.label} <ChevronRight size={12} /></button></Link>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label, desc, color }: { href: string; icon: React.ElementType; label: string; desc: string; color: string }) {
  return (
    <Link href={href}>
      <motion.div whileHover={{ x: 3 }} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}><Icon size={15} style={{ color }} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-[10px] text-gray-500 dark:text-slate-400">{desc}</p>
        </div>
        <ChevronRight size={14} className="text-gray-300 dark:text-slate-600 group-hover:text-sky-500 transition-colors" />
      </motion.div>
    </Link>
  )
}

export function CandidateDashboardView() {
  const { user } = useAuth()
  const { stats, loading } = useDashboardData()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '👋' : '🌙'

  const radarData = useMemo(() => {
    const hasData = stats && ((stats.total_analyses || 0) > 0 || (stats.total_cvs || 0) > 0)
    if (!hasData) return []
    return [
      { subject: 'Tech', A: Math.min(100, (stats?.employability_score || 0)) },
      { subject: 'Exp', A: Math.min(100, Math.floor((stats?.experience_months || 0) / 12 * 20)) },
      { subject: 'Soft', A: (stats?.total_analyses || 0) > 0 ? Math.min(100, 60 + (stats.total_analyses || 0) * 5) : 0 },
      { subject: 'Skills', A: Math.min(100, (stats?.skills_count || 0) * 10) },
      { subject: 'Potential', A: Math.min(100, (stats?.profile_strength || 0)) },
    ]
  }, [stats])

  const areaData = useMemo(() => {
    if (!stats || (stats.total_analyses || 0) === 0) return []
    const avgScore = stats?.avg_match_score || 0
    const bestScore = stats?.best_match_score || 0
    const startScore = Math.max(0, avgScore - 15)
    return [
      { name: 'Start', score: startScore },
      { name: 'Avg', score: avgScore },
      { name: 'Best', score: bestScore },
      { name: 'Now', score: bestScore },
    ]
  }, [stats])

  const donutData = useMemo(() => {
    const matchScore = Math.round(stats?.avg_match_score || 0)
    return [{ name: 'Match', value: matchScore }, { name: 'Gap', value: Math.max(0, 100 - matchScore) }]
  }, [stats])

  const barData = useMemo(() => {
    if (stats?.top_skills && Array.isArray(stats.top_skills) && stats.top_skills.length > 0) {
      return stats.top_skills.slice(0, 6).map((s: any, idx: number) => ({
        name: typeof s === 'string' ? s : s.name,
        val: typeof s === 'string' ? (90 - idx * 5) : (s.level || (90 - idx * 5)),
      }))
    }
    return []
  }, [stats])

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-white dark:bg-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>
      <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 space-y-4">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{greeting}, {user?.first_name || 'there'} {greetingEmoji}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Here's your career intelligence overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/upload"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"><Upload size={13} /> Upload CV</motion.button></Link>
            <Link href="/analysis/new"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 transition-all"><Plus size={13} /> New Analysis</motion.button></Link>
          </div>
        </motion.div>
        <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Resumes" value={formatNumber(stats?.total_documents || stats?.total_cvs || 0)} icon={FileText} loading={loading} trend={(stats?.total_documents || stats?.total_cvs) ? `${stats?.total_documents || stats?.total_cvs} total` : undefined} up={(stats?.total_documents || stats?.total_cvs || 0) > 0} color="#0ea5e9" />
          <StatCard label="Analyses" value={formatNumber(stats?.total_analyses || 0)} icon={Cpu} loading={loading} trend={stats?.total_analyses ? `${stats?.total_analyses} runs` : undefined} up={(stats?.total_analyses || 0) > 0} color="#6366f1" />
          <StatCard label="Avg Match" value={stats?.avg_match_score ? `${Math.round(stats.avg_match_score)}%` : '0%'} icon={Target} loading={loading} trend={stats?.avg_match_score ? `${Math.round(stats.avg_match_score)}% avg` : undefined} up={(stats?.avg_match_score || 0) > 0} color="#10b981" />
          <StatCard label="Skills Found" value={formatNumber(stats?.skills_count || 0)} icon={BrainCircuit} loading={loading} trend={stats?.skills_count ? `${stats?.skills_count} skills` : undefined} up={(stats?.skills_count || 0) > 0} color="#f59e0b" />
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <motion.div variants={fadeUp} className="lg:col-span-5">
            <SectionCard title="Skill Profile" subtitle="360° competency radar">
              <div className="h-[200px]">{radarData.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2 text-center"><div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center"><Activity size={18} className="text-sky-500" /></div><p className="text-xs text-gray-500 dark:text-slate-400">Upload a CV to see your profile</p></div> : <RechartsBundle type="radar" data={radarData} />}</div>
            </SectionCard>
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-7">
            <SectionCard title="Score Progression" subtitle="Match score trajectory">
              <div className="h-[200px]">{areaData.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2 text-center"><div className="w-10 h-10 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center"><TrendingUp size={18} className="text-sky-500" /></div><p className="text-xs text-gray-500 dark:text-slate-400">Run an analysis to see your progression</p></div> : <RechartsBundle type="area" data={areaData} />}</div>
            </SectionCard>
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-4">
            <SectionCard title="Market Fit" subtitle="Average match rate">
              <div className="relative h-[180px]"><RechartsBundle type="donut" data={donutData} center={`${Math.round(stats?.avg_match_score || 0)}%`} /><div className="absolute bottom-0 left-0 right-0 text-center"><p className="text-[10px] text-gray-500 dark:text-slate-400">{(stats?.avg_match_score || 0) > 0 ? 'match rate' : 'No data yet'}</p></div></div>
            </SectionCard>
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-8">
            <SectionCard title="Top Skills" subtitle="Identified competencies">
              <div className="h-[180px]">{barData.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2 text-center"><div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center"><Activity size={18} className="text-violet-500" /></div><p className="text-xs text-gray-500 dark:text-slate-400">Run an analysis to see your top skills</p></div> : <RechartsBundle type="bar" data={barData} />}</div>
            </SectionCard>
          </motion.div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <motion.div variants={fadeUp}>
            <SectionCard title="Quick Actions" subtitle="Jump to key features">
              <div className="space-y-0.5">
                <QuickAction href="/analysis/new" icon={Zap} label="New Analysis" desc="Match resume to a job" color="#0ea5e9" />
                <QuickAction href="/upload" icon={Upload} label="Upload Resume" desc="Add a new document" color="#6366f1" />
                <QuickAction href="/coaching" icon={MessageSquare} label="AI Coach" desc="Get career guidance" color="#8b5cf6" />
                <QuickAction href="/interview" icon={Target} label="Mock Interview" desc="Practice with AI" color="#10b981" />
              </div>
            </SectionCard>
          </motion.div>
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <div className="relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl p-5 h-full flex flex-col justify-between">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute right-8 -bottom-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2"><Sparkles size={13} className="text-sky-200" /><span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">AI-Powered</span></div>
                <h3 className="font-bold text-white text-lg">Ready for your next opportunity?</h3>
                <p className="text-sm text-sky-100">Upload your resume and get an instant AI-powered job match analysis with skill gap insights.</p>
              </div>
              <Link href="/analysis/new" className="relative z-10 mt-4 self-start"><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 bg-white hover:bg-sky-50 rounded-lg transition-colors shadow-sm">Start Analysis <ArrowRight size={14} /></motion.button></Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
