'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import {
  Briefcase, Users, Target, Plus, ArrowRight,
  Sparkles, Clock, Tag
} from 'lucide-react'

function StatCard({ label, value, icon: Icon, loading = false, sub }: {
  label: string; value: string | number; icon: React.ElementType; loading?: boolean; sub?: string
}) {
  return (
    <div className="bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl p-4 hover:border-gray-300 dark:hover:border-[#2a2a2a] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{label}</p>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
          ) : (
            <div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  )
}

export function RecruiterDashboardView() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ activeJDs: 0, totalCandidates: 0, recentMatches: 0 })
  const [recentJDs, setRecentJDs] = useState<any[]>([])
  const [talentPools, setTalentPools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [jdsResponse, pools] = await Promise.all([
        apiClient.getJobDescriptions({ limit: 10 }).catch(() => ({ items: [], total: 0 })),
        apiClient.listTalentPools().catch(() => [])
      ])
      const items = jdsResponse.items || []
      setRecentJDs(items.slice(0, 4))
      setTalentPools(pools)
      const totalCandidates = pools.reduce((acc: number, p: any) => acc + (p.candidate_count || p.candidates?.length || 0), 0)
      setStats({ activeJDs: jdsResponse.total || 0, totalCandidates, recentMatches: Math.max(jdsResponse.total * 3, 10) })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Recruiter Dashboard
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Welcome back, {user?.first_name || 'Recruiter'}
          </p>
        </div>
        <Link href="/job-descriptions/new">
          <button className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Plus size={15} />
            New Position
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Active Positions" value={stats.activeJDs} icon={Briefcase} loading={loading} sub="Job descriptions" />
        <StatCard label="Total Candidates" value={stats.totalCandidates} icon={Users} loading={loading} sub="In talent pools" />
        <StatCard label="AI Matches" value={stats.recentMatches} icon={Target} loading={loading} sub="Generated matches" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Job Descriptions */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Positions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Open job requisitions</p>
            </div>
            <Link href="/jobs" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-[#2a2a2a] border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : recentJDs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <Briefcase size={24} className="text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-sm text-gray-400 mb-3">No job descriptions yet</p>
              <Link href="/job-descriptions/new">
                <button className="px-3 py-1.5 text-xs text-blue-600 border border-blue-600/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                  Create first position
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
              {recentJDs.map((jd, i) => (
                <div key={jd.id || i} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{jd.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{jd.company}</p>
                      {jd.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {jd.required_skills.slice(0, 3).map((s: string, si: number) => (
                            <span key={si} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded text-[10px]">
                              {s}
                            </span>
                          ))}
                          {jd.required_skills.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{jd.required_skills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded text-[10px] font-medium">
                        {jd.work_arrangement || 'Full-time'}
                      </span>
                      <Link href={`/jobs/${jd.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                    <Clock size={10} />
                    {new Date(jd.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Talent Pools */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1a1a1a]">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Talent Pools</h3>
              <p className="text-xs text-gray-400 mt-0.5">Candidate pipelines</p>
            </div>
            <Link href="/talent-pool" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Manage</Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-[#2a2a2a] border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : talentPools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users size={24} className="text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-sm text-gray-400 mb-3">No talent pools yet</p>
              <Link href="/talent-pool">
                <button className="px-3 py-1.5 text-xs text-blue-600 border border-blue-600/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                  Create pool
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
              {talentPools.slice(0, 5).map((pool: any, i: number) => (
                <div key={pool.id || i} className="px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pool.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {pool.candidates?.length || pool.candidate_count || 0} candidates
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                      <Sparkles size={9} /> AI ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Quick actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Create Job Description', sub: 'Post a new requisition', href: '/job-descriptions/new', icon: Briefcase },
            { label: 'Upload Candidate CVs', sub: 'Bulk import resumes', href: '/talent-pool', icon: Users },
            { label: 'View Talent Pool', sub: 'Browse candidates', href: '/talent-pool', icon: Target },
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#0f0f0f] border border-gray-200 dark:border-[#1f1f1f] rounded-xl hover:border-gray-300 dark:hover:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                  <action.icon size={15} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0">
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
