'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import {
  ShieldCheck, Users, Cpu, CheckCircle,
  BarChart3, Database, Activity, ArrowRight,
  ExternalLink, AlertCircle, FileText, Target,
  MessageSquare
} from 'lucide-react'

function StatCard({ label, value, icon: Icon, loading = false, accent = 'gray' }: {
  label: string; value: string | number; icon: React.ElementType; loading?: boolean; accent?: string
}) {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    gray: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400',
  }

  return (
    <div className="bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-4 hover:border-gray-300 dark:hover:border-[#2a2a2a] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{label}</p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
          ) : (
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
          )}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent] || accentMap.gray}`}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardView() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [healthScore] = useState(99)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const [userStats, analysisStats] = await Promise.all([
        apiClient.getUserStats().catch(() => null),
        apiClient.getAnalysisStats().catch(() => null)
      ])
      setStats({ users: userStats, analysis: analysisStats })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const ADMIN_TOOLS = [
    { title: 'Audit Logs',   desc: 'System activity and security events', icon: ShieldCheck, href: '/admin/audit-logs', available: true },
    { title: 'Feedback',     desc: 'User feedback and ratings',           icon: MessageSquare, href: '/admin/feedback', available: true },
    { title: 'Testimonials', desc: 'Manage user testimonials',            icon: Users,       href: '/admin/testimonials', available: true },
    { title: 'Analytics',    desc: 'Usage statistics and reports',        icon: BarChart3,   href: '/admin/analytics', available: false },
  ]

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Administration</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          System control panel · Logged in as {user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total CVs" value={stats?.users?.total_cvs || 0} icon={FileText} loading={loading} accent="blue" />
        <StatCard label="AI Analyses" value={stats?.analysis?.total_analyses || 0} icon={Cpu} loading={loading} accent="violet" />
        <StatCard label="Completed" value={stats?.users?.completed_cvs || 0} icon={CheckCircle} loading={loading} accent="emerald" />
        <StatCard
          label="Avg Match Score"
          value={stats?.analysis?.avg_match_score ? `${Math.round(stats.analysis.avg_match_score * 100)}%` : '—'}
          icon={Target}
          loading={loading}
          accent="amber"
        />
      </div>

      {/* System Health Banner */}
      <div className="bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Status</h3>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-[#1a1a1a]">
          {[
            { label: 'API Backend', value: 'Online', ok: true },
            { label: 'Database', value: 'SQLite (Dev)', ok: true },
            { label: 'Node Health', value: `${healthScore}%`, ok: true },
            { label: 'Environment', value: 'Development', ok: null },
          ].map((item) => (
            <div key={item.label} className="px-5 py-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{item.label}</p>
              <div className="flex items-center gap-1.5">
                {item.ok === true && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                {item.ok === false && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Tools Grid */}
      <div>
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Admin Tools</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ADMIN_TOOLS.map((tool) => (
            <div key={tool.title}>
              {tool.available ? (
                <Link href={tool.href}>
                  <div className="h-full p-4 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl hover:border-gray-300 dark:hover:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                      <tool.icon size={15} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{tool.title}</p>
                    <p className="text-xs text-gray-400">{tool.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open <ArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="h-full p-4 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#1a1a1a] rounded-xl opacity-60 cursor-not-allowed">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                      <tool.icon size={15} className="text-gray-400 dark:text-gray-600" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-500 mb-1">{tool.title}</p>
                  <p className="text-xs text-gray-400">{tool.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick shortcuts */}
      <div>
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'View Audit Logs', sub: 'Monitor system activity', href: '/admin/audit-logs', icon: ShieldCheck },
            { label: 'User Dashboard', sub: 'Switch to user view', href: '/dashboard', icon: Database },
            { label: 'API Documentation', sub: 'Swagger UI', href: 'http://localhost:8000/api/docs', icon: ExternalLink, external: true },
          ].map((action) => (
            <Link key={action.label} href={action.href} target={action.external ? '_blank' : undefined}>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl hover:border-gray-300 dark:hover:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <action.icon size={15} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
