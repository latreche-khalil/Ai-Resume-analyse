'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api-client'
import { generateMentorCards, generateRoadmap } from '../../lib/candidate-generators'
import { CVDocument, Skill, MentorCard, RoadmapStepData, UserStats } from '../../types/candidate'

export function useDashboardData() {
  const [cvDocuments, setCvDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [mentorCards, setMentorCards] = useState<MentorCard[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapStepData[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, analysisStats] = await Promise.all([
        apiClient.getUserStats(),
        apiClient.getAnalysisStats()
      ])
      
      const combinedStats = {
        ...statsData,
        ...analysisStats
      }
      setStats(combinedStats)
      
      const cvData = await apiClient.getDocuments({ limit: 50 })
      setCvDocuments(cvData.documents || [])
      
      if (statsData.top_skills && Array.isArray(statsData.top_skills)) {
        setSkills(statsData.top_skills)
      }
      
      setMentorCards(generateMentorCards(statsData.top_skills || [], combinedStats))
      setRoadmap(generateRoadmap(statsData.total_cvs, statsData.total_analyses))
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setStats({
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
        recommended_skills: [],
        activity_heatmap: [],
        recent_analyses: [],
      })
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
  }
}
