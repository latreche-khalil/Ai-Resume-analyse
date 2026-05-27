'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { generateMentorCards, generateRoadmap } from '@/lib/candidate-generators'
import { CVDocument, Skill, MentorCard, RoadmapStepData, UserStats } from '@/types/candidate'

export function useDashboardData() {
  const [cvDocuments, setCvDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [mentorCards, setMentorCards] = useState<MentorCard[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapStepData[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Single call to /users/me/stats — contains all dashboard data
      const statsData = await apiClient.getUserStats()

      const combinedStats: UserStats = {
        matches_count: 0,
        explanation: '',
        ...statsData,
      }
      setStats(combinedStats)

      // Fetch documents in parallel
      const cvData = await apiClient.getDocuments({ limit: 50 })
      const normalizedDocs = (cvData.documents || []).map((doc: any) => ({
        ...doc,
        file_size: doc.file_size_bytes || doc.file_size || 0,
      }))
      setCvDocuments(normalizedDocs)

      if (statsData.top_skills && Array.isArray(statsData.top_skills)) {
        setSkills(statsData.top_skills)
      }

      setMentorCards(generateMentorCards(statsData.top_skills || [], combinedStats))
      setRoadmap(generateRoadmap(statsData.total_cvs, statsData.total_analyses))

    } catch (err: any) {
      console.error('[useDashboardData] Failed to load dashboard data:', err?.message || err)
      setError(err?.message || 'Failed to load data')

      // Provide zero-state so charts render cleanly rather than crashing
      const emptyStats: UserStats = {
        total_cvs: 0,
        completed_cvs: 0,
        total_analyses: 0,
        avg_match_score: 0,
        best_match_score: 0,
        top_skills: [],
        skills_count: 0,
        experience_months: 0,
        employability_score: 0,
        profile_strength: 0,
        top_industry: '',
        matches_count: 0,
        explanation: '',
        recommended_skills: [],
        activity_heatmap: [],
        recent_analyses: [],
        total_documents: 0
      }
      setStats(emptyStats)
      setMentorCards(generateMentorCards([], null))
      setRoadmap(generateRoadmap(0, 0))
    } finally {
      setLoading(false)
    }
  }

  return {
    cvDocuments,
    loading,
    stats,
    skills,
    mentorCards,
    roadmap,
    error,
    hasCV: cvDocuments.length > 0,
    refresh: loadData,
  }
}
