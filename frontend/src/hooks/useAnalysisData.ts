'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

export type Tab = 'overview' | 'gaps' | 'roadmap' | 'xai' | 'visualizations' | 'prep' | 'trust'

export function useAnalysisData(id: string | undefined) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [advancedData, setAdvancedData] = useState<any>({})

  // Track mounted state to prevent setState after unmount
  const mountedRef = useRef(true)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  const loadAllData = useCallback(async (isInitial = true) => {
    if (!id) return
    if (isInitial && mountedRef.current) setLoading(true)
    if (mountedRef.current) setError(null)

    try {
      const [analysis, enhanced] = await Promise.allSettled([
        apiClient.getAnalysis(id),
        apiClient.getEnhancedAnalysis(id)
      ])

      if (!mountedRef.current) return

      if (analysis.status === 'rejected') {
        throw new Error('Analysis not found')
      }

      const baseData = analysis.value
      const enhancedData = enhanced.status === 'fulfilled' ? enhanced.value : {}

      const [cv, jd] = await Promise.allSettled([
        apiClient.getDocument(baseData.cv_document_id),
        apiClient.getJobDescription(baseData.job_description_id)
      ])

      if (!mountedRef.current) return

      const finalData = {
        ...baseData,
        ...enhancedData,
        cv: cv.status === 'fulfilled' ? cv.value : null,
        jd: jd.status === 'fulfilled' ? jd.value : null,
      }

      setData(finalData)

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

      // Poll if still processing — clear any existing timer first
      const status = baseData.processing_status || baseData.analysis_status
      if (status === 'processing' || status === 'pending') {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        pollTimerRef.current = setTimeout(() => {
          if (mountedRef.current) loadAllData(false)
        }, 3000)
      }

    } catch (err: any) {
      if (mountedRef.current) setError(err.message || 'Failed to load analysis results')
    } finally {
      if (isInitial && mountedRef.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadAllData()
  }, [id, loadAllData])

  const submitReview = async (analysisId: string, decision: 'approved' | 'rejected') => {
    try {
      await apiClient.submitHumanReview(analysisId, decision)
      await loadAllData(false)
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
