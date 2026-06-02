'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { JobDescriptionForm } from '@/components/recruiter/JobDescriptionForm'
import { Loader2 } from 'lucide-react'

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !jd) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-slate-500 dark:text-slate-400">{error || 'Not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <JobDescriptionForm
      mode="edit"
      initialData={{
        id:          jd.id,
        title:       jd.title,
        company:     jd.company,
        description: jd.description,
      }}
    />
  )
}
