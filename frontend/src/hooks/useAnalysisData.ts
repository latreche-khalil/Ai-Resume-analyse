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

      // 3. Extract advanced metrics from enhanced data to avoid redundant 404s
      if (enhanced.status === 'fulfilled') {
        const ed = enhanced.value
        setAdvancedData({
          radar: ed.radar_data || null,
          heatmap: ed.heatmap_data || null,
          proximity: ed.semantic_search || null,
          redFlags: ed.red_flags || [],
          interviewGuide: ed.xai_report?.hard_talk_questions || [],
          confidence: ed.confidence_score || 0.8,
          bias: ed.xai_report?.bias_check || null,
          hallucination: ed.xai_report?.credibility_analysis || null,
        })
      }

      // 4. Poll if still processing
      const status = baseData.processing_status || baseData.analysis_status
      if (status === 'processing' || status === 'pending') {
        setTimeout(() => loadAllData(false), 3000) 
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load analysis results')
    } finally {
      if (isInitial) setLoading(false)
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
