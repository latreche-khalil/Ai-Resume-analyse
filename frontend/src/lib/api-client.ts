const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api/v1`

interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role?: string
  preferred_language?: string
}

interface User {
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

interface CVDocument {
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

interface JobDescription {
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

interface Analysis {
  id: string
  cv_document_id: string
  job_description_id: string
  analysis_status: string
  processing_status: string
  match_score?: number
  created_at: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = this.baseURL.endsWith('/api/v1') 
      ? this.baseURL 
      : `${this.baseURL.replace(/\/$/, '')}/api/v1`
    
    const url = `${baseUrl}${endpoint}`
    
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data)
    }

    const response = await fetch(url, config)
    
    if (response.status === 204) {
      return null as any
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      let errorMsg = errorData.message || errorData.detail
      
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
      }
      
      throw new Error(errorMsg || `HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      // Check if text content is not empty before parsing
      const text = await response.text()
      if (!text) return null as any
      return JSON.parse(text)
    }
    
    return response as any
  }

  // Auth methods
  async login(email: string, password: string): Promise<void> {
    await this.request('POST', '/auth/login', { email, password })
  }

  async register(data: RegisterData): Promise<void> {
    await this.request('POST', '/auth/register', data)
  }

  async logout(): Promise<void> {
    await this.request('POST', '/auth/logout')
  }

  async getCurrentUser(): Promise<User> {
    return this.request('GET', '/users/me')
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request('POST', '/auth/forgot-password', { email })
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    return this.request('POST', '/auth/reset-password', { email, code, new_password: newPassword })
  }

  // User methods
  async getUserStats(): Promise<any> {
    return this.request('GET', '/users/me/stats')
  }

  async getAnalysisStats(): Promise<any> {
    // Current backend merges these into me/stats
    return this.request('GET', '/users/me/stats')
  }

  async updateProfile(data: { first_name?: string; last_name?: string; preferred_language?: string }): Promise<void> {
    await this.request('PATCH', '/users/me', data)
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('POST', '/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    })
  }

  async exportMyData(): Promise<{ export_data: any }> {
    return this.request('GET', '/users/me/export')
  }

  async deleteMyAccount(): Promise<void> {
    await this.request('DELETE', '/users/me')
  }

  // Document methods
  async getDocuments(params: { limit?: number; offset?: number; skip?: number } = {}): Promise<{ documents: CVDocument[]; total: number; skip: number; limit: number }> {
    const query = new URLSearchParams()
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.offset) query.append('offset', params.offset.toString())
    if (params.skip) query.append('skip', params.skip.toString())
    
    return this.request('GET', `/documents?${query.toString()}`)
  }

  async getDocument(id: string): Promise<CVDocument> {
    return this.request('GET', `/documents/${id}`)
  }

  async getCVPreview(documentId: string): Promise<{ images: { image: string }[] }> {
    return this.request('GET', `/documents/${documentId}/preview`)
  }

  async getDocumentPreviewImage(documentId: string, page: number): Promise<{ data: Blob }> {
    const response = await this.request('GET', `/documents/${documentId}/preview/image/${page}`, undefined, {
      headers: { 'Accept': 'image/png' }
    })
    return { data: response }
  }

  // Job Description methods
  async getJobDescriptions(params: { limit?: number; offset?: number } = {}): Promise<{ items: JobDescription[]; total: number; skip: number; limit: number }> {
    const query = new URLSearchParams()
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.offset) query.append('offset', params.offset.toString())
    
    return this.request('GET', `/job-descriptions?${query.toString()}`)
  }

  async getJobDescription(id: string): Promise<JobDescription> {
    return this.request('GET', `/job-descriptions/${id}`)
  }

  async createJobDescription(data: Partial<JobDescription>): Promise<JobDescription> {
    return this.request('POST', '/job-descriptions', data)
  }

  async deleteJobDescription(id: string): Promise<void> {
    await this.request('DELETE', `/job-descriptions/${id}`)
  }

  // Analysis methods
  async createAnalysis(cvId: string, jdId: string, language?: string): Promise<Analysis> {
    return this.request('POST', '/analysis/match', {
      cv_document_id: cvId,
      job_description_id: jdId,
      response_language: language
    })
  }

  async getAnalysis(id: string): Promise<Analysis> {
    return this.request('GET', `/analysis/${id}`)
  }

  async getEnhancedAnalysis(id: string): Promise<any> {
    return this.request('GET', `/analysis/${id}/enhanced`)
  }

  async listAnalyses(params: { limit?: number; offset?: number } = {}): Promise<{ analyses: Analysis[]; total: number; skip: number; limit: number }> {
    const query = new URLSearchParams()
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.offset) query.append('offset', params.offset.toString())
    
    return this.request('GET', `/analysis?${query.toString()}`)
  }

  async deleteAnalysis(id: string): Promise<void> {
    await this.request('DELETE', `/analysis/${id}`)
  }

  async exportAnalysis(cvId: string, format: string, analysisId: string): Promise<{ data: Blob }> {
    const response = await this.request('GET', `/documents/${cvId}/export?format=${format}&analysis_id=${analysisId}`, undefined, {
      headers: { 'Accept': 'application/pdf' }
    })
    return { data: response }
  }

  // Interview methods
  async startInterview(jdId: string, options: { difficulty?: string; interview_type?: string; mode?: string }): Promise<{
    session_id: string
    question_id: string
    question: string
  }> {
    return this.request('POST', '/coaching/interview/start', {
      job_description_id: jdId,
      ...options
    })
  }

  async submitInterviewAnswer(sessionId: string, questionId: string, answer: string): Promise<{
    evaluation: any
    next_question?: string
  }> {
    return this.request('POST', `/coaching/interview/sessions/${sessionId}/answer`, {
      question_id: questionId,
      answer_text: answer
    })
  }

  async getInterviewNextQuestion(sessionId: string): Promise<{
    id: string
    question: string
    text: string
    type?: string
  }> {
    return this.request('GET', `/coaching/interview/sessions/${sessionId}/next-question`)
  }

  async getInterviewReport(sessionId: string): Promise<any> {
    return this.request('GET', `/coaching/interview/sessions/${sessionId}/report`)
  }

  // Talent Pool methods
  async listTalentPools(): Promise<any[]> {
    return this.request('GET', '/talent-pools')
  }

  async createTalentPool(data: { name: string; description?: string; job_description_id?: string; is_anonymized?: boolean }): Promise<any> {
    return this.request('POST', '/talent-pools', data)
  }

  async getTalentPool(id: string): Promise<any> {
    return this.request('GET', `/talent-pools/${id}`)
  }

  async batchRankCandidates(poolId: string, jdId: string): Promise<void> {
    await this.request('POST', `/talent-pools/${poolId}/rank`, { job_description_id: jdId })
  }

  async updateCandidateStatus(poolId: string, cvId: string, status: string): Promise<void> {
    await this.request('PATCH', `/talent-pools/${poolId}/candidates/${cvId}`, { status })
  }

  async revealCandidateIdentity(cvId: string): Promise<{ identity: any }> {
    return this.request('POST', `/candidates/${cvId}/reveal`)
  }

  async addCandidateToPool(poolId: string, cvId: string): Promise<void> {
    await this.request('POST', `/talent-pools/${poolId}/candidates`, { cv_document_id: cvId })
  }

  async removeCandidateFromPool(poolId: string, cvId: string): Promise<void> {
    await this.request('DELETE', `/talent-pools/${poolId}/candidates/${cvId}`)
  }

  // Review methods
  async getPendingReviews(): Promise<{ pending: any[] }> {
    return this.request('GET', '/reviews/pending')
  }

  async submitHumanReview(id: string, decision: 'approved' | 'rejected' | 'overridden'): Promise<void> {
    await this.request('POST', `/analysis/${id}/review?decision=${decision}`)
  }

  // Chat methods
  async createChatSession(): Promise<{ session_id: string }> {
    return this.request('POST', '/coaching/chat/session')
  }

  async sendChatMessage(sessionId: string, message: string): Promise<{ message: string }> {
    return this.request('POST', `/coaching/chat/${sessionId}/message`, { message })
  }

  // Additional document methods
  async getSkillReport(documentId: string): Promise<any> {
    return this.request('GET', `/documents/${documentId}/skills`)
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.request('DELETE', `/documents/${documentId}`)
  }

  async unmaskDocument(documentId: string): Promise<any> {
    return this.request('POST', `/documents/${documentId}/unmask`)
  }

  // Upload methods
  async uploadCV(file: File): Promise<{ id: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const uploadUrl = this.baseURL.endsWith('/api/v1') 
      ? `${this.baseURL}/documents/upload` 
      : `${this.baseURL}/api/v1/documents/upload`

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`)
    }
    
    return response.json()
  }

  // Admin methods
  async getAuditLogs(params: { skip?: number; limit?: number; filters?: any }): Promise<any> {
    const query = new URLSearchParams()
    if (params.skip) query.append('skip', params.skip.toString())
    if (params.limit) query.append('limit', params.limit.toString())
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value) query.append(key, value as string)
      })
    }
    
    return this.request('GET', `/admin/audit-logs?${query.toString()}`)
  }

  // Advanced Analysis Metrics
  async getSkillRadarData(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/radar`) }
  async getExperienceHeatmap(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/heatmap`) }
  async getSemanticProximity(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/proximity`) }
  async getRedFlags(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/red-flags`) }
  async getInterviewGuide(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/interview-guide`) }
  async getAIConfidence(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/confidence`) }
  async getBiasCheck(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/bias-check`) }
  async getHallucinationGuard(id: string): Promise<any> { return this.request('GET', `/analysis/${id}/hallucination-guard`) }

  // Feedback methods
  async submitFeedback(data: { 
    analysis_id?: string
    accuracy_rating: number
    feedback_text: string
    is_dispute?: boolean
  }): Promise<{ id: string; message: string }> {
    return this.request('POST', '/feedback', data)
  }

  async getMyFeedback(): Promise<any[]> {
    return this.request('GET', '/feedback/my')
  }

  async getAllFeedback(params: { skip?: number; limit?: number } = {}): Promise<any[]> {
    const query = new URLSearchParams()
    if (params.skip) query.append('skip', params.skip.toString())
    if (params.limit) query.append('limit', params.limit.toString())
    return this.request('GET', `/feedback/all?${query.toString()}`)
  }

  async getFeedbackStats(): Promise<{ average_rating: number; total_feedback: number }> {
    return this.request('GET', '/feedback/stats')
  }

  // Testimonials methods
  async getPublicTestimonials(limit = 10): Promise<any[]> {
    return this.request('GET', `/testimonials/public?limit=${limit}`)
  }

  async getAllTestimonials(): Promise<any[]> {
    return this.request('GET', '/testimonials/')
  }

  async updateTestimonial(id: number, data: Partial<any>): Promise<any> {
    return this.request('PATCH', `/testimonials/${id}`, data)
  }

  async deleteTestimonial(id: number): Promise<void> {
    await this.request('DELETE', `/testimonials/${id}`)
  }

  async createTestimonial(data: any): Promise<any> {
    return this.request('POST', '/testimonials/', data)
  }

  async getMyTestimonials(): Promise<any[]> {
    return this.request('GET', '/testimonials/my')
  }

  // Interview Coaching methods
  async startInterview(jobDescriptionId: string, options: { difficulty: string; interview_type: string; mode: string }): Promise<{ session_id: string; question_id: string; question: string }> {
    return this.request('POST', '/coaching/interview/start', {
      job_description_id: jobDescriptionId,
      difficulty: options.difficulty,
      interview_type: options.interview_type,
      mode: options.mode
    })
  }

  async submitInterviewAnswer(sessionId: string, questionId: string, answerText: string): Promise<{ evaluation: any; next_question?: any; status: string }> {
    return this.request('POST', `/coaching/interview/sessions/${sessionId}/answer`, {
      question_id: questionId,
      answer_text: answerText
    })
  }

  async getInterviewReport(sessionId: string): Promise<any> {
    return this.request('GET', `/coaching/interview/sessions/${sessionId}/report`)
  }

  async getNextInterviewQuestion(sessionId: string): Promise<{ id: string; text: string; type: string; question: string } | null> {
    return this.request('GET', `/coaching/interview/sessions/${sessionId}/next-question`)
  }

  async getInterviewSessions(params?: { limit?: number; offset?: number }): Promise<{ items: any[]; total: number }> {
    return this.request('GET', '/coaching/interview/sessions', undefined, params)
  }
}

export const apiClient = new ApiClient()
