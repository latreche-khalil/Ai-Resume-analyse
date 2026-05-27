'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle, Eye, Trash2, Award, Shield, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface Testimonial {
  id: number
  user_id: number | null
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
        <Star key={i} size={13}
          className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 dark:fill-slate-700 text-gray-200 dark:text-slate-700'}
        />
      ))}
    </div>
  )
}

export function TestimonialsManagementView() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getAllTestimonials()
      setTestimonials(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const update = async (id: number, updates: Partial<Testimonial>) => {
    try {
      await apiClient.updateTestimonial(id, updates)
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
      toast.success('Updated successfully')
    } catch (e: any) {
      toast.error(e?.message || 'Update failed')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this testimonial?')) return
    try {
      await apiClient.deleteTestimonial(id)
      setTestimonials(prev => prev.filter(t => t.id !== id))
      toast.success('Deleted')
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  const filtered = testimonials.filter(t => {
    if (filter === 'pending')  return !t.is_approved
    if (filter === 'approved') return t.is_approved && !t.is_featured
    if (filter === 'featured') return t.is_featured
    return true
  })

  const stats = {
    total:    testimonials.length,
    pending:  testimonials.filter(t => !t.is_approved).length,
    approved: testimonials.filter(t => t.is_approved).length,
    featured: testimonials.filter(t => t.is_featured).length,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Testimonials</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Review, approve and feature user testimonials</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: stats.total,    icon: Star,         color: '#6366f1' },
          { label: 'Pending',  value: stats.pending,  icon: Eye,          color: '#f59e0b' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle,  color: '#10b981' },
          { label: 'Featured', value: stats.featured, icon: Award,        color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-neutral-400 mb-2">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all','pending','approved','featured'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="ml-1.5 text-xs opacity-70">({stats[f]})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl">
          <Star size={40} className="text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-gray-500 dark:text-neutral-400 font-medium">No testimonials found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{t.name}</span>
                    {t.role && <span className="text-sm text-gray-500 dark:text-neutral-400">{t.role}{t.company ? ` @ ${t.company}` : ''}</span>}
                    {t.is_verified && <span className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 rounded-md"><Shield size={10} /> Verified</span>}
                    {t.is_featured && <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-md"><Award size={10} /> Featured</span>}
                    {!t.is_approved && <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">Pending</span>}
                  </div>
                  <Stars rating={t.rating} />
                  <p className="text-sm text-gray-600 dark:text-neutral-300 mt-2 leading-relaxed">{t.content}</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => update(t.id, { is_approved: !t.is_approved })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.is_approved ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-neutral-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                    {t.is_approved ? 'Unapprove' : '✓ Approve'}
                  </button>
                  <button onClick={() => update(t.id, { is_featured: !t.is_featured })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.is_featured ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-neutral-400'}`}>
                    {t.is_featured ? '★ Unfeature' : '☆ Feature'}
                  </button>
                  <button onClick={() => update(t.id, { is_verified: !t.is_verified })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${t.is_verified ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-neutral-400'}`}>
                    {t.is_verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button onClick={() => remove(t.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 transition-all hover:bg-red-100">
                    <Trash2 size={12} className="inline mr-1" />Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Testimonial {
  id: number
  user_id: number | null
  name: string
  role: string | null
  company: string | null
  content: string
  rating: number
  is_featured: boolean
  is_approved: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export function TestimonialsManagementView() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all')

  const fetchTestimonials = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/v1/testimonials/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTestimonials(data)
      }
    } catch (err) {
      console.error('Failed to fetch testimonials:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const updateTestimonial = async (id: number, updates: Partial<Testimonial>) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/testimonials/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        fetchTestimonials()
      }
    } catch (err) {
      console.error('Failed to update testimonial:', err)
    }
  }

  const deleteTestimonial = async (id: number) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/testimonials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchTestimonials()
      }
    } catch (err) {
      console.error('Failed to delete testimonial:', err)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    )
  }

  const filteredTestimonials = testimonials.filter(t => {
    if (filter === 'pending') return !t.is_approved
    if (filter === 'approved') return t.is_approved && !t.is_featured
    if (filter === 'featured') return t.is_featured
    return true
  })

  const stats = {
    total: testimonials.length,
    pending: testimonials.filter(t => !t.is_approved).length,
    approved: testimonials.filter(t => t.is_approved).length,
    featured: testimonials.filter(t => t.is_featured).length
  }

  return (
    <div className="min-h-screen theme-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold theme-text mb-2">Testimonials Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review, approve, and manage customer testimonials
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
                <p className="text-3xl font-bold theme-text">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                <p className="text-3xl font-bold theme-text">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
                <p className="text-3xl font-bold theme-text">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Featured</p>
                <p className="text-3xl font-bold theme-text">{stats.featured}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 mb-6">
          {(['all', 'pending', 'approved', 'featured'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-sky-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-sky-500'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Testimonials List */}
        {!loading && (
          <div className="space-y-4">
            {filteredTestimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold theme-text">
                        {testimonial.name}
                      </h3>
                      {testimonial.is_verified && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300">
                          <Shield className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    {(testimonial.role || testimonial.company) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}
                        {testimonial.role && testimonial.company && ' at '}
                        {testimonial.company}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {testimonial.content}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(testimonial.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Approve/Unapprove */}
                    <button
                      onClick={() => updateTestimonial(testimonial.id, { is_approved: !testimonial.is_approved })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        testimonial.is_approved
                          ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {testimonial.is_approved ? 'Unapprove' : 'Approve'}
                    </button>

                    {/* Feature/Unfeature */}
                    <button
                      onClick={() => updateTestimonial(testimonial.id, { is_featured: !testimonial.is_featured })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        testimonial.is_featured
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {testimonial.is_featured ? 'Unfeature' : 'Feature'}
                    </button>

                    {/* Verify/Unverify */}
                    <button
                      onClick={() => updateTestimonial(testimonial.id, { is_verified: !testimonial.is_verified })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        testimonial.is_verified
                          ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/50'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {testimonial.is_verified ? 'Unverify' : 'Verify'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTestimonial(testimonial.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredTestimonials.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400">
                  No testimonials found for this filter
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
