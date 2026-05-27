'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, Clock, CheckCircle, Plus } from 'lucide-react'
import { TestimonialForm } from './TestimonialForm'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface Testimonial {
  id: number
  name: string
  role: string | null
  company: string | null
  content: string
  rating: number
  is_featured: boolean
  is_approved: boolean
  is_verified: boolean
  created_at: string
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

export function MyTestimonialsView() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getMyTestimonials()
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const getStatus = (t: Testimonial) => {
    if (t.is_approved && t.is_featured)
      return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle size={11} /> Published</span>
    if (t.is_approved)
      return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><CheckCircle size={11} /> Approved</span>
    return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"><Clock size={11} /> Pending Review</span>
  }

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <button onClick={() => setShowForm(false)}
          className="mb-6 text-sm text-sky-500 hover:text-sky-600 font-medium flex items-center gap-1">
          ← Back to My Testimonials
        </button>
        <TestimonialForm onSuccess={() => { setShowForm(false); load() }} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Testimonials</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Share your experience and help others discover the platform</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
          <Plus size={16} /> Add Testimonial
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && testimonials.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f0f11] border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MessageSquare size={28} className="text-gray-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No testimonials yet</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">Share your experience and help others discover the platform</p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
            <Plus size={16} /> Write Your First Testimonial
          </button>
        </motion.div>
      )}

      {/* List */}
      {!loading && testimonials.length > 0 && (
        <div className="space-y-4">
          {testimonials.map((t, i) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 dark:text-white">{t.name}</span>
                  {t.role && <span className="text-sm text-gray-500 dark:text-neutral-400">{t.role}{t.company ? ` · ${t.company}` : ''}</span>}
                  {getStatus(t)}
                </div>
                <span className="text-xs text-gray-400 dark:text-neutral-500 shrink-0">
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <Stars rating={t.rating} />
              <p className="text-sm text-gray-700 dark:text-neutral-300 mt-3 leading-relaxed">{t.content}</p>

              {!t.is_approved && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  <strong>Pending Review:</strong> Your testimonial is being reviewed. It will appear on the landing page once approved and featured.
                </div>
              )}
              {t.is_approved && t.is_featured && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
                  <strong>Published!</strong> Your testimonial is now live on the landing page. Thank you for sharing your experience!
                </div>
              )}
              {t.is_approved && !t.is_featured && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  <strong>Approved!</strong> Your testimonial has been approved. It will be featured on the landing page soon.
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
