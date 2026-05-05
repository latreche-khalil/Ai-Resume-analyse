export interface CVDocument {
  id: string
  original_filename: string
  filename: string
  file_size: number
  file_size_bytes?: number
  processing_status: string
  created_at: string
  updated_at: string
  word_count?: number
  language?: string
}

export interface Skill {
  name: string
  level: number
  category: string
  demand: number
}

export interface MentorCard {
  type: 'tip' | 'gap' | 'achievement'
  icon: string
  title: string
  body: string
  action?: string
  color: string
}

export interface RoadmapStepData {
  step: number
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
  icon: string
}

export interface UserStats {
  total_cvs: number
  completed_cvs: number
  total_analyses: number
  avg_match_score: number
  best_match_score: number
  top_skills: Skill[]
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
    type?: 'upload' | 'analysis' | 'interview' | 'coaching'
  }>
  recent_analyses: Array<{
    id: string
    match_score: number
    status: string
    created_at: string | null
  }>
}
