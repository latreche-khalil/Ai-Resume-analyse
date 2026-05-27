'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, CheckCircle, AlertCircle, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface FeedbackItem {
  id: string
  rating: number | null
  feedback_text: string | null
  feedback_type: string
  created_at: string
}

export function FeedbackView() {
  const [formData, setFormData] = useState({
    feedback_type: 'general',
    rating: 5,
    feedback_text: ''
  })
  const [hoveredRating, setHoveredRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([])

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback', icon: '💬', description: 'Share your thoughts about the platform' },
    { value: 'accuracy', label: 'Accuracy Issue', icon: '🎯', description: 'Report accuracy concerns' },
    { value: 'extraction', label: 'Extraction Issue', icon: '📄', description: 'Report CV extraction problems' },
    { value: 'matching', label: 'Matching Issue', icon: '🔍', description: 'Report job matching issues' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await apiClient.submitFeedback({
        accuracy_rating: formData.rating,
        feedback_text: formData.feedback_text,
        is_dispute: false
      })

      setSuccess(true)
      toast.success('Thank you! Your feedback has been submitted successfully.')
      
      setFormData({
        feedback_type: 'general',
        rating: 5,
        feedback_text: ''
      })

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to submit feedback. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
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
    <div className="min-h-screen theme-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold theme-text mb-2">Send Feedback</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Help us improve by sharing your feedback, suggestions, or reporting issues
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Feedback Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
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
                      Thank you! Your feedback has been submitted successfully.
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
                {/* Feedback Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Feedback Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, feedback_type: type.value })}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          formData.feedback_type === type.value
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-2xl">{type.icon}</span>
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">
                            {type.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {type.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Overall Rating *
                  </label>
                  {renderStars()}
                </div>

                {/* Feedback Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Feedback *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={8}
                    value={formData.feedback_text}
                    onChange={(e) => setFormData({ ...formData, feedback_text: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
                    placeholder="Please share your detailed feedback, suggestions, or describe any issues you've encountered..."
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {formData.feedback_text.length}/2000 characters
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
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>

                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Your feedback is private and will only be visible to our team.
                </p>
              </form>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* Why Feedback Matters */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-sky-200 dark:border-sky-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Why Your Feedback Matters
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-sky-500 mt-0.5">✓</span>
                  <span>Helps us improve accuracy and performance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-sky-500 mt-0.5">✓</span>
                  <span>Identifies bugs and technical issues</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-sky-500 mt-0.5">✓</span>
                  <span>Guides new feature development</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-sky-500 mt-0.5">✓</span>
                  <span>Enhances user experience for everyone</span>
                </li>
              </ul>
            </div>

            {/* Response Time */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Response Time
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                We review all feedback within 24-48 hours. For urgent issues, please contact support directly.
              </p>
              <div className="flex items-center space-x-2 text-sm">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Average response: <strong>24 hours</strong>
                </span>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                🔒 Privacy
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your feedback is confidential and only visible to our team. We never share feedback publicly without your explicit permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
