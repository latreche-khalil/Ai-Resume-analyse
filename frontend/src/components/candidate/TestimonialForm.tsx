'use client'

import { useState } from 'react'
import { Star, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface TestimonialFormProps {
  onSuccess?: () => void
  editData?: {
    id: number
    name: string
    role: string | null
    company: string | null
    content: string
    rating: number
  } | null
}

export function TestimonialForm({ onSuccess, editData }: TestimonialFormProps) {
  const [formData, setFormData] = useState({
    name: editData?.name || '',
    role: editData?.role || '',
    company: editData?.company || '',
    content: editData?.content || '',
    rating: editData?.rating || 5
  })
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (editData) {
        await apiClient.updateTestimonial(editData.id, {
          name: formData.name,
          role: formData.role || null,
          company: formData.company || null,
          content: formData.content,
          rating: formData.rating,
        })
        toast.success('Testimonial updated successfully! It will be reviewed before publishing.')
      } else {
        await apiClient.createTestimonial({
          name: formData.name,
          role: formData.role || null,
          company: formData.company || null,
          content: formData.content,
          rating: formData.rating,
        })
        toast.success('Testimonial submitted! It will be reviewed before publishing.')
        setFormData({ name: '', role: '', company: '', content: '', rating: 5 })
      }

      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 3000)
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit testimonial. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredRating || formData.rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
          {formData.rating} {formData.rating === 1 ? 'star' : 'stars'}
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {editData ? 'Edit Your Testimonial' : 'Share Your Experience'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {editData 
              ? 'Update your feedback and rating below. Your changes will be reviewed.'
              : 'Help others by sharing your experience with our platform. Your testimonial will be reviewed before being published.'}
          </p>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-3"
            >
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200">
                Thank you! Your testimonial has been submitted and is pending approval.
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              placeholder="John Doe"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Role (Optional)
            </label>
            <input
              type="text"
              maxLength={100}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              placeholder="Software Engineer"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company (Optional)
            </label>
            <input
              type="text"
              maxLength={100}
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              placeholder="Google"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Your Rating *
            </label>
            {renderStars()}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Testimonial *
            </label>
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
              placeholder="Share your experience with our platform. What did you like? How did it help you?"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {formData.content.length}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full px-6 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-lg hover:from-sky-600 hover:to-blue-700 focus:ring-4 focus:ring-sky-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{editData ? 'Updating...' : 'Submitting...'}</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{editData ? 'Update Testimonial' : 'Submit Testimonial'}</span>
              </>
            )}
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Your testimonial will be reviewed by our team before being published on the website.
          </p>
        </form>
      </div>
    </div>
  )
}
