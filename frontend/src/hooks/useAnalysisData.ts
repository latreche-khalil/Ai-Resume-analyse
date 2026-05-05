'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export type Tab = 'overview' | 'gaps' | 'roadmap' | 'xai' | 'visualizations' | 'prep' | 'trust'

export function useAnalysisData(id: string | undefined) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [advancedData, setAdvancedData] = useState<any>({})

  useEffect(() => {
    if (id) {
      loadAllData()
    }
  }, [id])

  const loadAllData = async (isInitial = true) => {
    if (isInitial) setLoading(true)
    setError(null)
    try {
      // 1. Fetch base analysis and enhanced reports
      const [analysis, enhanced] = await Promise.allSettled([
        apiClient.getAnalysis(id!),
        apiClient.getEnhancedAnalysis(id!)
      ])

      if (analysis.status === 'rejected') {
        throw new Error('Analysis not found')
      }

      const baseData = analysis.value
      const enhancedData = enhanced.status === 'fulfilled' ? enhanced.value : {}

      // 2. Fetch associated documents (CV and JD)
      const [cv, jd] = await Promise.allSettled([
        apiClient.getDocument(baseData.cv_document_id),
        apiClient.getJobDescription(baseData.job_description_id)
      ])

      const finalData = {
        ...baseData,
        ...enhancedData,
        cv: cv.status === 'fulfilled' ? cv.value : null,
        jd: jd.status === 'fulfilled' ? jd.value : null,
      }

      setData(finalData)

      // 3. Poll if still processing
      const status = baseData.processing_status
      if (status === 'processing' || status === 'pending') {
        setTimeout(() => loadAllData(false), 3000) // Poll every 3s, not initial
      } else {
        // 4. (Optional) Fetch advanced data in background
        loadAdvancedMetrics(id!)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load analysis results')
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  const loadAdvancedMetrics = async (analysisId: string) => {
    try {
      const metrics = await Promise.allSettled([
        apiClient.getSkillRadarData(analysisId),
        apiClient.getExperienceHeatmap(analysisId),
        apiClient.getSemanticProximity(analysisId),
        apiClient.getRedFlags(analysisId),
        apiClient.getInterviewGuide(analysisId),
        apiClient.getAIConfidence(analysisId),
        apiClient.getBiasCheck(analysisId),
        apiClient.getHallucinationGuard(analysisId)
      ])
      
      setAdvancedData({
        radar: metrics[0].status === 'fulfilled' ? metrics[0].value : null,
        heatmap: metrics[1].status === 'fulfilled' ? metrics[1].value : null,
        proximity: metrics[2].status === 'fulfilled' ? metrics[2].value : null,
        redFlags: metrics[3].status === 'fulfilled' ? metrics[3].value : null,
        interviewGuide: metrics[4].status === 'fulfilled' ? metrics[4].value : null,
        confidence: metrics[5].status === 'fulfilled' ? metrics[5].value : null,
        bias: metrics[6].status === 'fulfilled' ? metrics[6].value : null,
        hallucination: metrics[7].status === 'fulfilled' ? metrics[7].value : null,
      })
    } catch (err) {
      console.warn('Failed to load advanced metrics', err)
    }
  }

  const submitReview = async (analysisId: string, decision: 'approved' | 'rejected') => {
    try {
      await apiClient.submitHumanReview(analysisId, decision)
      await loadAllData() // Refresh
      return true
    } catch (err) {
      console.error('Failed to submit review', err)
      return false
    }
  }

  return {
    data,
    loading,
    error,
    tab,
    setTab,
    advancedData,
    actions: {
      refresh: loadAllData,
      submitReview
    }
  }
}
