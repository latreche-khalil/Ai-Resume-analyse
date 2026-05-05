import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { generateMentorCards, generateRoadmap } from '../utils/generators'

interface CVDocument {
  id: string
  original_filename: string
  filename: string
  file_size: number
  processing_status: string
  created_at: string
  updated_at: string
  word_count?: number
  language?: string
}

interface Skill {
  name: string
  level: number
  category: string
  demand: number
}

interface MentorCard {
  type: 'tip' | 'gap' | 'achievement'
  icon: string
  title: string
  body: string
  action?: string
  color: string
}

interface RoadmapStep {
  step: number
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
  icon: string
}

interface UserStats {
  total_cvs: number
  completed_cvs: number
  total_analyses: number
  avg_match_score: number
  best_match_score: number
  top_skills: any[]
  skills_count: number
  experience_months: number
  employability_score: number
  profile_strength: number
  top_industry: string
  recommended_skills: Array<{
    name: string
    priority: 'high' | 'medium'
    reason: string
    demandIncrease: number
  }>
  activity_heatmap: Array<{
    date: string
    count: number
    type?: 'upload' | 'analysis'
  }>
  recent_analyses: Array<{
    id: string
    match_score: number
    status: string
    created_at: string | null
  }>
}

export function useDashboardData() {
  const [cvDocuments, setCvDocuments] = useState<CVDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [mentorCards, setMentorCards] = useState<MentorCard[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Fetch user stats and analysis stats
      const [statsData, analysisStats] = await Promise.all([
        apiClient.getUserStats(),
        apiClient.getAnalysisStats()
      ])
      
      setStats({
        ...statsData,
        ...analysisStats
      })
      
      // Fetch CVs
      const cvData = await apiClient.getDocuments({ limit: 50 })
      setCvDocuments(cvData.documents || [])
      
      // Parse skills from stats
      if (statsData.top_skills && Array.isArray(statsData.top_skills)) {
        setSkills(statsData.top_skills)
      }
      
      // Generate mentor cards from real data
      const cards = generateMentorCards(statsData.top_skills || [], statsData)
      setMentorCards(cards)
      
      // Generate roadmap from real data
      const steps = generateRoadmap(statsData.total_cvs, statsData.total_analyses)
      setRoadmap(steps)
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Set empty defaults on error - no fake data
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
