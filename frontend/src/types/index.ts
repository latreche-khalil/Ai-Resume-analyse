// Re-export all types from candidate module
export * from './candidate'

// Additional shared types can be added here
export type Role = 'candidate' | 'recruiter' | 'admin'

export type Language = 'en' | 'ar' | 'fr'

export type ProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AnalysisStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'requires_review'

export type CandidateStatus =
  | 'new'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export type VirusScanStatus =
  | 'pending'
  | 'clean'
  | 'infected'
  | 'failed'

export type WorkArrangement =
  | 'remote'
  | 'hybrid'
  | 'onsite'

export type ExperienceLevel =
  | 'entry'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'executive'

export type InterviewDifficulty =
  | 'easy'
  | 'medium'
  | 'hard'

export type InterviewType =
  | 'technical'
  | 'behavioral'
  | 'mixed'

export type InterviewMode =
  | 'practice'
  | 'real'

export type Severity = 'low' | 'medium' | 'high'

export type MessageRole = 'user' | 'assistant' | 'system'

// Utility types
export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type ID = string

export type Timestamp = string

export type DateString = string

// Filter and Sort types
export interface PaginationParams {
  skip?: number
  offset?: number
  limit?: number
}

export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface FilterParams {
  search?: string
  status?: string
  date_from?: string
  date_to?: string
  [key: string]: any
}

export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

// Error types
export interface ApiError {
  message: string
  code?: string
  details?: any
  status?: number
}

export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}
