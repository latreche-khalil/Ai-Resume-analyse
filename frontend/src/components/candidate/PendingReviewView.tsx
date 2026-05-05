'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

export function PendingReviewView() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await apiClient.getPendingReviews()
      setItems(res.pending || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const review = async (id: string, decision: 'approved' | 'rejected' | 'overridden') => {
    setReviewing(id)
    try {
      await apiClient.submitHumanReview(id, decision)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to submit review')
    } finally { setReviewing(null) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <header className="bg-white/5 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-white/60 hover:text-white">← Back</button>
        <div className="text-xl">👁️</div>
        <div>
          <div className="font-semibold">Pending Human Review</div>
          <div className="text-xs text-white/50">AI confidence &lt; 70% — your review required</div>
        </div>
        <div className="ml-auto px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-sm">
          {items.length} pending
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 text-sm text-blue-300">
          <strong>ℹ️ Human-in-the-Loop:</strong> These analyses have AI confidence below 70%. 
          The AI decision is <strong>never binding</strong> — your review ensures accuracy.
        </div>

        {loading && (
          <div className="text-center py-16 text-white/40">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-3" />
            <p>Loading pending reviews...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2">All caught up!</h2>
            <p className="text-white/50">No analyses pending human review.</p>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-white/40 mb-1">Analysis ID</div>
                  <div className="font-mono text-sm text-white/70">{item.id.slice(0, 8)}...</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-400">
                    {Math.round((item.match_score || 0) * 100)}%
                  </div>
                  <div className="text-xs text-white/50">Match Score</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-orange-400">
                    {Math.round((item.confidence_score || 0) * 100)}%
                  </div>
                  <div className="text-xs text-white/50">AI Confidence</div>
                </div>
                <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                  <div className="text-sm font-medium text-yellow-400">⚠️ Low Confidence</div>
                  <div className="text-xs text-white/50">Needs your review</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => router.push(`/analysis/${item.id}`)}
                  className="flex-1 py-2 bg-white/10 border border-white/20 rounded-xl text-sm hover:bg-white/20 transition-colors">
                  View Details
                </button>
                <button onClick={() => review(item.id, 'approved')} disabled={reviewing === item.id}
                  className="flex-1 py-2 bg-green-600/80 rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-40">
                  ✓ Approve
                </button>
                <button onClick={() => review(item.id, 'rejected')} disabled={reviewing === item.id}
                  className="flex-1 py-2 bg-red-600/80 rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-40">
                  ✗ Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
