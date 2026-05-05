'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface TalentPoolModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  jobDescriptions: any[]
}

export function TalentPoolModal({ isOpen, onClose, onCreated, jobDescriptions }: TalentPoolModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedJD, setSelectedJD] = useState('')
  const [isAnonymized, setIsAnonymized] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await apiClient.createTalentPool({
        name,
        description,
        job_description_id: selectedJD || undefined,
        is_anonymized: isAnonymized
      })
      onCreated()
      onClose()
      setName('')
      setDescription('')
      setSelectedJD('')
    } catch (error) {
      console.error('Failed to create talent pool:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <h2 className="text-xl font-bold">New Talent Pool</h2>
              <button onClick={onClose} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pool Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senior Frontend Q2"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description for this recruitment phase..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Job Description</label>
                <select
                  value={selectedJD}
                  onChange={(e) => setSelectedJD(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">No link (generic pool)</option>
                  {jobDescriptions.map((jd) => (
                    <option key={jd.id} value={jd.id}>{jd.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymized"
                  checked={isAnonymized}
                  onChange={(e) => setIsAnonymized(e.target.checked)}
                  className="w-4 h-4 text-indigo-600"
                />
                <label htmlFor="anonymized" className="text-sm text-gray-600">Apply PII Anonymization</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {loading ? 'Creating...' : 'Create Pool'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
