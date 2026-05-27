// Candidate and User Types
export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  is_active: boolean
  email_verified: boolean
  preferred_language: string
  created_at: string
  last_login_at?: string | null
}

export interface CVDocument {
  id: string
  original_filename: string
  filename: string
  file_size_bytes?: number
  file_format?: string
  virus_scan_status?: string
  processing_status: string
  created_at: string
  updated_at: string
  word_count?: number
  language?: string
  status_message?: string
}

export interface JobDescription {
  id: string
  title: string
  company: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  experience_level?: string
  education_requirements?: string
  work_arrangement?: string
  salary_range_min?: number
  salary_range_max?: number
  created_at: string
}

export interface Analysis {
  id: string
  cv_document_id: string
  job_description_id: string
  analysis_status: string
  processing_status: string
  match_score?: number
  created_at: string
}

export interface EnhancedAnalysis extends Analysis {
  cv_document?: CVDocument
  job_description?: JobDescription
  match_details?: MatchDetails
  skill_analysis?: SkillAnalysis
  experience_analysis?: ExperienceAnalysis
  recommendations?: string[]
  red_flags?: RedFlag[]
}

export interface MatchDetails {
  overall_score: number
  skill_match: number
  experience_match: number
  education_match: number
  cultural_fit?: number
  strengths: string[]
  weaknesses: string[]
  gaps: string[]
}

export interface SkillAnalysis {
  matched_skills: Skill[]
  missing_skills: Skill[]
  transferable_skills: Skill[]
  skill_categories: SkillCategory[]
}

export interface Skill {
  name: string
  level?: string
  years_experience?: number
  category?: string
  is_required?: boolean
  match_confidence?: number
}

export interface SkillCategory {
  category: string
  skills: Skill[]
  coverage_percentage: number
}

export interface ExperienceAnalysis {
  total_years: number
  relevant_years: number
  career_progression: CareerProgression[]
  employment_gaps?: Gap[]
  industry_experience: IndustryExperience[]
}

export interface CareerProgression {
  position: string
  company: string
  start_date: string
  end_date?: string
  duration_months: number
  is_relevant: boolean
  key_achievements?: string[]
}

export interface Gap {
  start_date: string
  end_date: string
  duration_months: number
  explanation?: string
}

export interface IndustryExperience {
  industry: string
  years: number
  relevance_score: number
}

export interface RedFlag {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation?: string
}

export interface InterviewSession {
  session_id: string
  job_description_id: string
  status: string
  difficulty?: string
  interview_type?: string
  mode?: string
  created_at: string
  completed_at?: string
}

export interface InterviewQuestion {
  id: string
  question: string
  text: string
  type?: string
  category?: string
}

export interface InterviewAnswer {
  question_id: string
  answer_text: string
  evaluation?: AnswerEvaluation
  submitted_at: string
}

export interface AnswerEvaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  follow_up_questions?: string[]
}

export interface InterviewReport {
  session_id: string
  overall_score: number
  category_scores: CategoryScore[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  questions_answered: number
  total_questions: number
}

export interface CategoryScore {
  category: string
  score: number
  feedback: string
}

export interface TalentPool {
  id: string
  name: string
  description?: string
  job_description_id?: string
  is_anonymized: boolean
  created_at: string
  updated_at: string
  candidate_count?: number
}

export interface PoolCandidate {
  cv_document_id: string
  pool_id: string
  status: string
  rank_score?: number
  added_at: string
  cv_document?: CVDocument
  anonymized_profile?: AnonymizedProfile
}

export interface AnonymizedProfile {
  skills: string[]
  experience_years: number
  education_level: string
  certifications: string[]
  languages: string[]
}

export interface UserStats {
  total_analyses: number
  total_documents: number
  total_cvs?: number
  completed_cvs?: number
  total_job_descriptions?: number
  recent_analyses: Analysis[]
  storage_used_bytes?: number
  last_activity?: string
  avg_match_score?: number
  best_match_score?: number
  top_skills?: Skill[]
  skills_count?: number
  experience_months?: number
  employability_score?: number
  profile_strength?: number
  top_industry?: string
  matches_count?: number
  explanation?: string
  recommended_skills?: string[]
  activity_heatmap?: ActivityHeatmapData[]
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface Testimonial {
  id: string
  user_id: string
  content: string
  rating: number
  is_approved: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  user?: {
    first_name?: string
    last_name?: string
    role: string
  }
}

export interface ChatSession {
  session_id: string
  created_at: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export interface DocumentsResponse {
  documents: CVDocument[]
  total: number
  skip: number
  limit: number
}

export interface AnalysesResponse {
  analyses: Analysis[]
  total: number
  skip: number
  limit: number
}

export interface JobDescriptionsResponse {
  items: JobDescription[]
  total: number
  skip: number
  limit: number
}

// Form Data Types
export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role?: string
  preferred_language?: string
}

export interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  preferred_language?: string
}

export interface PasswordChangeData {
  current_password: string
  new_password: string
}

export interface JobDescriptionFormData {
  title: string
  company: string
  description: string
  required_skills: string[]
  preferred_skills: string[]
  experience_level?: string
  education_requirements?: string
  work_arrangement?: string
  salary_range_min?: number
  salary_range_max?: number
}

export interface AnalysisFormData {
  cv_document_id: string
  job_description_id: string
  response_language?: string
}

export interface TalentPoolFormData {
  name: string
  description?: string
  job_description_id?: string
  is_anonymized?: boolean
}

// Advanced Analysis Types
export interface SkillRadarData {
  categories: string[]
  candidate_scores: number[]
  required_scores: number[]
}

export interface ExperienceHeatmap {
  roles: string[]
  skills: string[]
  intensity: number[][]
}

export interface SemanticProximity {
  cv_embedding: number[]
  jd_embedding: number[]
  similarity_score: number
  key_matches: string[]
}

export interface AIConfidence {
  overall_confidence: number
  skill_extraction_confidence: number
  matching_confidence: number
  experience_analysis_confidence: number
  uncertainty_areas: string[]
}

export interface BiasCheck {
  bias_score: number
  potential_biases: BiasIndicator[]
  mitigation_suggestions: string[]
}

export interface BiasIndicator {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  affected_sections: string[]
}

export interface HallucinationGuard {
  hallucination_risk: number
  verified_facts: VerifiedFact[]
  unverified_claims: UnverifiedClaim[]
  confidence_intervals: ConfidenceInterval[]
}

export interface VerifiedFact {
  claim: string
  source: string
  confidence: number
}

export interface UnverifiedClaim {
  claim: string
  reason: string
  suggestion: string
}

export interface ConfidenceInterval {
  metric: string
  lower_bound: number
  upper_bound: number
  point_estimate: number
}

// Dashboard specific types
export interface MentorCard {
  type: 'tip' | 'achievement' | 'gap' | 'warning'
  icon: string
  title: string
  body: string
  color: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface RoadmapStepData {
  step: number
  title: string
  description: string
  status: 'done' | 'active' | 'upcoming'
  icon: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ActivityHeatmapData {
  date: string
  count: number
  level: number
}

export interface DashboardStats extends UserStats {
  recent_uploads?: CVDocument[]
  recent_matches?: Analysis[]
  skill_trends?: SkillTrend[]
  career_insights?: CareerInsight[]
}

export interface SkillTrend {
  skill: string
  trend: 'up' | 'down' | 'stable'
  change_percentage: number
  demand_score: number
}

export interface CareerInsight {
  type: 'opportunity' | 'warning' | 'achievement' | 'recommendation'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  action_items?: string[]
}
