'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, Edit3, Briefcase, Star, Clock,
  CheckCircle2, Loader2, AlertCircle, Zap
} from 'lucide-react'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [jd, setJd]         = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!id) return
    apiClient.getJobDescription(id)
      .then(setJd)
      .catch(() => setError('Job description not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-blue-500" />
    </div>
  )

  if (error || !jd) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle size={32} className="text-slate-400" />
      <p className="text-slate-500 dark:text-slate-400">{error || 'Not found'}</p>
      <Link href="/jobs">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          Back to Jobs
        </button>
      </Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/jobs')}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{jd.title}</h1>
            {jd.company && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{jd.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/analysis/new`}>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              <Zap size={15} /> New Analysis
            </button>
          </Link>
          <Link href={`/jobs/${id}/edit`}>
            <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Edit3 size={15} /> Edit
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">

        {/* Meta */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Briefcase size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{jd.experience_level || 'Any level'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Star size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{jd.work_arrangement || 'Not specified'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <Clock size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatDateTime(jd.created_at)}</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Description</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{jd.description}</p>
        </div>

        {/* Required Skills */}
        {jd.required_skills?.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {jd.required_skills.map((skill: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-sm font-medium">
                  <CheckCircle2 size={12} /> {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Skills */}
        {jd.preferred_skills?.length > 0 && (
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Preferred Skills</h3>
            <div className="flex flex-wrap gap-2">
              {jd.preferred_skills.map((skill: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {jd.education_requirements && (
          <div className="px-6 py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Education</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">{jd.education_requirements}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
