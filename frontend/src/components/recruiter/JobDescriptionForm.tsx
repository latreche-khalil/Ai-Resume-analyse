'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Plus, Briefcase, ArrowLeft } from 'lucide-react'

interface JDFormData {
  title: string
  company: string
  description: string
}

interface JobDescriptionFormProps {
  initialData?: Partial<JDFormData> & { id?: string }
  mode: 'create' | 'edit'
}

export function JobDescriptionForm({ initialData, mode }: JobDescriptionFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<JDFormData>({
    title:       initialData?.title       || '',
    company:     initialData?.company     || '',
    description: initialData?.description || '',
  })
  const [loading, setLoading] = useState(false)

  const set = (key: keyof JDFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Client-side validation
    const wordCount = form.description.trim().split(/\s+/).filter(Boolean).length
    if (wordCount < 10) {
      toast.error(`Description is too brief (${wordCount} words). Please provide at least 10 words.`)
      return
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        await apiClient.createJobDescription(form)
        toast.success('Job description created')
      } else if (initialData?.id) {
        await apiClient.updateJobDescription(initialData.id, form)
        toast.success('Job description updated')
      }
      router.push('/jobs')
    } catch (err: any) {
      const msg = err.message || `Failed to ${mode} job description`
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4">
        <button type="button" onClick={() => router.push('/jobs')}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'create' ? 'New Job Description' : 'Edit Job Description'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {mode === 'create'
              ? 'Paste the full job description — the AI will extract skills automatically'
              : 'Update the job details'}
          </p>
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">

        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
            <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">Job Details</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Title + Company */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input required value={form.title} onChange={set('title')}
                placeholder="e.g. Senior Software Engineer"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Company
              </label>
              <input value={form.company} onChange={set('company')}
                placeholder="e.g. Acme Corp"
                className={inputCls} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea required value={form.description} onChange={set('description')} rows={12}
              placeholder="Paste the full job description here — responsibilities, requirements, qualifications..."
              className={`${inputCls} resize-none`} />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              The AI will automatically extract required skills, experience level, and other details.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.push('/jobs')}
              className="flex-1 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                : mode === 'create'
                  ? <><Plus size={15} /> Create Job Description</>
                  : 'Save Changes'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  )
}
