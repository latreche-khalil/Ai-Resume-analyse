'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, TrendingUp, RefreshCw, User, Calendar, Tag } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface FeedbackItem {
  id: string
  user_email: string
  user_name: string
  rating: number
  feedback_text: string
  feedback_type: string
  created_at: string
}

interface FeedbackStats {
  average_rating: number
  total_feedback: number
}

const TYPE_COLORS: Record<string, string> = {
  general:   'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  accuracy:  'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  extraction:'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
  matching:  'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const TYPE_ICONS: Record<string, string> = {
  general: '💬', accuracy: '🎯', extraction: '📄', matching: '🔍'
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14}
          className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 dark:fill-slate-700 text-gray-200 dark:text-slate-700'}
        />
      ))}
    </div>
  )
}

export function FeedbackManagementView() {
  const [stats, setStats]       = useState<FeedbackStats | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [s, f] = await Promise.all([
        apiClient.getFeedbackStats().catch(() => null),
        apiClient.getAllFeedback({ limit: 100 }).catch(() => []),
      ])
      if (s) setStats(s)
      setFeedbacks(Array.isArray(f) ? f : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all'
    ? feedbacks
    : feedbacks.filter(f => f.feedback_type === filter)

  const satisfaction = stats?.average_rating
    ? Math.round((stats.average_rating / 5) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">User feedback and platform ratings</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Feedback', value: stats?.total_feedback ?? 0, icon: MessageSquare, color: '#6366f1' },
          { label: 'Avg Rating',     value: stats?.average_rating ? stats.average_rating.toFixed(1) + ' / 5' : '—', icon: Star, color: '#f59e0b' },
          { label: 'Satisfaction',   value: `${satisfaction}%`, icon: TrendingUp, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">{s.label}</p>
                {loading
                  ? <div className="h-7 w-20 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
                  : <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                }
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all','general','accuracy','extraction','matching'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === t
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-[#151518]'
            }`}>
            {t === 'all' ? 'All' : `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl">
          <MessageSquare size={40} className="text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-gray-500 dark:text-neutral-400 font-medium">No feedback yet</p>
          <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Feedback submitted by users will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb, i) => (
            <motion.div key={fb.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm hover:border-gray-300 dark:hover:border-[#2a2a2a] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {fb.user_name?.[0]?.toUpperCase() || fb.user_email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{fb.user_name || fb.user_email}</span>
                      <span className="text-xs text-gray-400 dark:text-neutral-500">{fb.user_email}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${TYPE_COLORS[fb.feedback_type] || TYPE_COLORS.general}`}>
                        {TYPE_ICONS[fb.feedback_type]} {fb.feedback_type}
                      </span>
                    </div>
                    {/* Stars */}
                    <Stars rating={fb.rating || 0} />
                    {/* Text */}
                    {fb.feedback_text && (
                      <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2 leading-relaxed">{fb.feedback_text}</p>
                    )}
                  </div>
                </div>
                {/* Date */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500 shrink-0">
                  <Calendar size={12} />
                  {fb.created_at ? new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
