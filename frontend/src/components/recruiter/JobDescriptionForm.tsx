'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { ShimmerButton } from '@/components/ui/shimmer-button'

export function JobDescriptionForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    preferred_skills: '',
    experience_level: 'Mid',
    education_requirements: '',
    work_arrangement: 'Hybrid',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = {
        ...formData,
        required_skills: formData.required_skills.split(',').map((s) => s.trim()).filter(Boolean),
        preferred_skills: formData.preferred_skills.split(',').map((s) => s.trim()).filter(Boolean),
      }
      await apiClient.createJobDescription(data)
      router.push('/job-descriptions')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create job description')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Senior Software Engineer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={6}
            placeholder="Describe the role, responsibilities, and requirements..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills *</label>
            <input
              type="text"
              required
              value={formData.required_skills}
              onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Python, React, AWS (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Skills</label>
            <input
              type="text"
              value={formData.preferred_skills}
              onChange={(e) => setFormData({ ...formData, preferred_skills: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Docker, Kubernetes (comma-separated)"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
            <select
              value={formData.experience_level}
              onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Entry">Entry (0-2 years)</option>
              <option value="Mid">Mid (3-5 years)</option>
              <option value="Senior">Senior (6-10 years)</option>
              <option value="Expert">Expert (10+ years)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Arrangement</label>
            <select
              value={formData.work_arrangement}
              onChange={(e) => setFormData({ ...formData, work_arrangement: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Education Requirements</label>
          <input
            type="text"
            value={formData.education_requirements}
            onChange={(e) => setFormData({ ...formData, education_requirements: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Bachelor's in Computer Science"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <ShimmerButton
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 py-4 text-lg"
          >
            {loading ? 'Creating...' : 'Create Job Description'}
          </ShimmerButton>
        </div>
      </form>
    </div>
  )
}
