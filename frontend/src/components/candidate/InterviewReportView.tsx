'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { CardHoverEffect } from '@/components/ui/card-hover-effect'
import { ProgressBar } from '@/components/ui/progress-bar'

export function InterviewReportView() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [sessionId])

  const loadReport = async () => {
    try {
      const data = await apiClient.getInterviewReport(sessionId)
      setReport(data)
    } catch (error) {
      console.error('Failed to load report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  const overallScore = report?.overall_score || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-white/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Interview Performance Report
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overall Score */}
          <CardHoverEffect>
            <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl shadow-2xl p-8 text-white text-center">
              <div className="text-6xl font-bold mb-2">{(overallScore * 100).toFixed(0)}%</div>
              <p className="text-xl">Overall Performance</p>
            </div>
          </CardHoverEffect>

          {/* Performance Breakdown */}
          <CardHoverEffect>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Breakdown</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Average Relevance</span>
                    <span className="text-sm text-gray-600">{(report?.avg_relevance * 100 || 0).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={report?.avg_relevance * 100 || 0} color="sky" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Average Completeness</span>
                    <span className="text-sm text-gray-600">{(report?.avg_completeness * 100 || 0).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={report?.avg_completeness * 100 || 0} color="green" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Average Clarity</span>
                    <span className="text-sm text-gray-600">{(report?.avg_clarity * 100 || 0).toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={report?.avg_clarity * 100 || 0} color="sky" />
                </div>
              </div>
            </div>
          </CardHoverEffect>

          {/* Strengths */}
          {report?.strengths && report.strengths.length > 0 && (
            <CardHoverEffect>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">✨ Strengths</h3>
                <ul className="space-y-2">
                  {report.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardHoverEffect>
          )}

          {/* Areas for Improvement */}
          {report?.improvements && report.improvements.length > 0 && (
            <CardHoverEffect>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Areas for Improvement</h3>
                <ul className="space-y-2">
                  {report.improvements.map((improvement: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardHoverEffect>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/coaching/interview')}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Practice Again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
