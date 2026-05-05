'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { CardHoverEffect } from '@/components/ui/card-hover-effect'
import { formatDateTime } from '@/lib/utils'

export function JobDescriptionsView() {
  const router = useRouter()
  const [jobDescriptions, setJobDescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    loadJobDescriptions()
  }, [filter])

  const loadJobDescriptions = async () => {
    try {
      const response = await apiClient.getJobDescriptions({ limit: 100 })
      setJobDescriptions(response.items || [])
    } catch (error) {
      console.error('Failed to load job descriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job description?')) return
    try {
      await apiClient.request('DELETE', `/job-descriptions/${id}`)
      loadJobDescriptions()
    } catch (error) {
      console.error('Failed to delete job description:', error)
    }
  }

  const filteredJDs = jobDescriptions.filter((jd) => {
    if (filter === 'active') return jd.status === 'active'
    if (filter === 'archived') return jd.status === 'archived'
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              Job Descriptions
            </h1>
            <Link href="/job-descriptions/new">
              <motion.button
                className="px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create New JD
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex gap-2 bg-white/80 backdrop-blur-lg rounded-xl p-2 shadow-lg">
            {['all', 'active', 'archived'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            <p className="mt-4 text-gray-600">Loading job descriptions...</p>
          </div>
        ) : filteredJDs.length === 0 ? (
          <motion.div className="bg-white rounded-2xl shadow-lg p-12 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-6xl mb-4">💼</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No job descriptions found</h3>
            <p className="text-gray-600 mb-6">Create your first job description to start finding candidates</p>
            <Link href="/job-descriptions/new">
              <motion.button className="px-8 py-4 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-lg" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                Create Job Description
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJDs.map((jd, index) => (
              <motion.div key={jd.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <CardHoverEffect>
                  <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{jd.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{jd.description}</p>
                      {jd.required_skills && jd.required_skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-600 mb-2">Required Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {jd.required_skills.slice(0, 3).map((skill: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">{skill}</span>
                            ))}
                            {jd.required_skills.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">+{jd.required_skills.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">{formatDateTime(jd.created_at)}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                      <Link href={`/job-descriptions/${jd.id}/edit`} className="flex-1">
                        <button className="w-full px-4 py-2 text-sm text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 transition-all">Edit</button>
                      </Link>
                      <button onClick={() => handleDelete(jd.id)} className="flex-1 px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-all">Delete</button>
                    </div>
                  </div>
                </CardHoverEffect>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
