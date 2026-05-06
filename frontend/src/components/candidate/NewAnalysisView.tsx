'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import { LanguageSelector, AnalysisLanguage } from '@/components/shared/LanguageSelector'
import { CVDocument } from '@/types/candidate'

interface JobDescription {
  id: string
  title: string
  company: string
  created_at: string
}

type Step = 'select-cv' | 'select-jd' | 'analyzing' | 'results'

export function NewAnalysisView() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select-cv')
  const [cvDocuments, setCvDocuments] = useState<CVDocument[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [selectedCV, setSelectedCV] = useState<string | null>(null)
  const [selectedJD, setSelectedJD] = useState<string | null>(null)
  const [newJDText, setNewJDText] = useState('')
  const [newJDTitle, setNewJDTitle] = useState('')
  const [newJDCompany, setNewJDCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'existing' | 'new'>('existing')
  const [responseLanguage, setResponseLanguage] = useState<AnalysisLanguage>('en')
  const [statusMessage, setStatusMessage] = useState<string>('Initializing analysis...')

  useEffect(() => {
    loadCVDocuments()
    loadJobDescriptions()
  }, [])

  const loadCVDocuments = async () => {
    try {
      const response = await apiClient.getDocuments({ limit: 50 })
      setCvDocuments(response.documents || [])
    } catch (error) {
      console.error('Failed to load CVs:', error)
    }
  }

  const loadJobDescriptions = async () => {
    try {
      const response = await apiClient.getJobDescriptions({ limit: 50 })
      setJobDescriptions(Array.isArray(response) ? response : response.items || [])
    } catch (error) {
      console.error('Failed to load JDs:', error)
    }
  }

  const handleCVSelect = (cvId: string) => {
    setSelectedCV(cvId)
  }

  const handleJDSelect = (jdId: string) => {
    setSelectedJD(jdId)
  }

  const handleNextFromCV = () => {
    if (!selectedCV) {
      toast.error('Please select a CV first')
      return
    }
    setStep('select-jd')
  }

  const handleCreateJD = async () => {
    if (!newJDTitle || !newJDText) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const jd = await apiClient.createJobDescription({
        title: newJDTitle,
        company: newJDCompany || 'Unknown Company',
        description: newJDText,
        required_skills: [],
        preferred_skills: [],
        experience_level: null,
        education_requirements: null,
        work_arrangement: null,
        salary_range_min: null,
        salary_range_max: null,
      })
      
      setSelectedJD(jd.id)
      
      if (selectedCV && jd.id) {
        setStep('analyzing')
        try {
          const analysis = await apiClient.createAnalysis(selectedCV, jd.id)
          await new Promise(resolve => setTimeout(resolve, 2000))
          router.push(`/analysis/${analysis.id}`)
        } catch (error: any) {
          console.error('Failed to create analysis:', error)
          toast.error(error.response?.data?.detail || 'Failed to create analysis')
          setStep('select-jd')
        }
      }
    } catch (error: any) {
      console.error('Failed to create job description:', error)
      toast.error(error.response?.data?.detail || 'Failed to create job description')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedCV || !selectedJD) {
      toast.error('Please select both CV and Job Description')
      return
    }

    setStep('analyzing')
    setLoading(true)
    setStatusMessage('Connecting to AI agents...')

    try {
      const analysis = await apiClient.createAnalysis(selectedCV, selectedJD, responseLanguage)
      
      const maxAttempts = 30
      let attempts = 0
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          const result = await apiClient.getAnalysis(analysis.id)
          
          try {
            const cvDoc = await apiClient.getDocument(selectedCV)
            if (cvDoc.status_message) {
              setStatusMessage(cvDoc.status_message)
            }
          } catch (docErr) {
            if (result.analysis_status === 'processing') {
              setStatusMessage('Extracting deep insights...')
            }
          }

          if (result.analysis_status === 'completed' || result.processing_status === 'completed') {
            setStatusMessage('Analysis complete! Preparing results...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            router.push(`/analysis/${analysis.id}`)
            return
          } else if (result.analysis_status === 'failed' || result.processing_status === 'failed') {
            throw new Error('Analysis failed. Please try again.')
          }
          attempts++
        } catch (pollError) {
          console.error('Polling error:', pollError)
          attempts++
        }
      }
      router.push(`/analysis/${analysis.id}`)
    } catch (error: any) {
      console.error('Failed to create analysis:', error)
      toast.error(error.response?.data?.detail || error.message || 'Failed to create analysis')
      setStep('select-jd')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen theme-bg theme-text relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <header className="relative z-10 theme-card backdrop-blur-xl border-b theme-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                New CV Analysis
              </h1>
              <p className="text-sm theme-text-tertiary mt-1">Match your CV with a job description</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 theme-text-secondary hover:theme-text transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === 'select-cv'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white'
                    : 'bg-green-500 text-white'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {step === 'select-cv' ? '1' : '✓'}
              </motion.div>
              <span className="ml-2 font-medium">Select CV</span>
            </div>
            <div className="w-16 h-1 theme-border"></div>
            <div className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === 'select-jd' || step === 'analyzing'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white'
                    : step === 'results'
                    ? 'bg-green-500 text-white'
                    : 'theme-card theme-text-tertiary'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {step === 'results' ? '✓' : '2'}
              </motion.div>
              <span className="ml-2 font-medium">Select Job</span>
            </div>
            <div className="w-16 h-1 theme-border"></div>
            <div className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === 'analyzing' || step === 'results'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white'
                    : 'theme-card theme-text-tertiary'
                }`}
                whileHover={{ scale: 1.1 }}
              >
                3
              </motion.div>
              <span className="ml-2 font-medium">Analyze</span>
            </div>
          </div>
        </div>


        <AnimatePresence mode="wait">
          {step === 'select-cv' && (
            <motion.div
              key="select-cv"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="theme-card backdrop-blur-xl rounded-3xl border theme-border p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Select Your CV</h2>
              {cvDocuments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">📄</div>
                  <h3 className="text-xl font-semibold mb-2">No CVs uploaded yet</h3>
                  <p className="theme-text-tertiary mb-8">Upload a CV first to start analysis</p>
                  <motion.button
                    onClick={() => router.push('/upload')}
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Upload CV
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {cvDocuments.map((cv) => (
                      <motion.div
                        key={cv.id}
                        onClick={() => handleCVSelect(cv.id)}
                        className={`p-4 border-2 rounded-2xl cursor-pointer transition-all theme-card ${
                          selectedCV === cv.id
                            ? 'border-sky-500 bg-sky-500/10'
                            : 'theme-border hover:border-sky-500/40'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-16 bg-gradient-to-br from-sky-500/20 to-blue-500/20 rounded flex items-center justify-center border border-sky-500/30">
                              <span className="text-2xl">📄</span>
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="font-semibold mb-1 theme-text">{cv.original_filename}</h3>
                            <p className="text-sm theme-text-tertiary">{formatFileSize(cv.file_size_bytes || 0)}</p>
                            <p className="text-xs theme-text-quaternary">{formatDate(cv.created_at)}</p>
                          </div>
                          {selectedCV === cv.id && (
                            <div className="flex-shrink-0">
                              <span className="text-2xl">✓</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <motion.button
                      onClick={handleNextFromCV}
                      disabled={!selectedCV}
                      className="px-8 py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                      whileHover={!selectedCV ? {} : { scale: 1.05 }}
                      whileTap={!selectedCV ? {} : { scale: 0.95 }}
                    >
                      <span className="relative z-10">Next: Select Job →</span>
                      {selectedCV && (
                        <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 'select-jd' && (
            <motion.div
              key="select-jd"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="theme-card backdrop-blur-xl rounded-3xl border theme-border p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Select Job Description</h2>
              <div className="flex space-x-4 mb-6">
                <button onClick={() => setUploadMode('existing')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                    uploadMode === 'existing' ? 'bg-sky-600 text-white' : 'theme-card theme-text-secondary hover:bg-opacity-80'
                  }`}>Select Existing</button>
                <button onClick={() => setUploadMode('new')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                    uploadMode === 'new' ? 'bg-sky-600 text-white' : 'theme-card theme-text-secondary hover:bg-opacity-80'
                  }`}>Create New</button>
              </div>

              {uploadMode === 'existing' ? (
                <>
                  {jobDescriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💼</div>
                      <h3 className="text-xl font-semibold mb-2 theme-text">No job descriptions yet</h3>
                      <p className="theme-text-tertiary mb-6">Create a new job description to continue</p>
                      <button onClick={() => setUploadMode('new')}
                        className="px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors">
                        Create Job Description
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 mb-6 max-h-72 overflow-y-auto">
                      {jobDescriptions.map((jd) => (
                        <motion.div key={jd.id} onClick={() => handleJDSelect(jd.id)}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedJD === jd.id ? 'border-sky-500 bg-sky-500/10' : 'theme-border hover:border-sky-500/40'
                          }`}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{jd.title}</h3>
                              <p className="text-sm theme-text-quaternary">{formatDate(jd.created_at)}</p>
                            </div>
                            {selectedJD === jd.id && <span className="text-sky-400 text-xl">✓</span>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 mb-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
                    After creating the job description, the analysis will start automatically!
                  </div>
                  <input type="text" value={newJDTitle} onChange={(e) => setNewJDTitle(e.target.value)}
                    placeholder="Job Title *"
                    className="w-full px-4 py-3 theme-card border theme-border rounded-xl theme-text placeholder-opacity-40 focus:outline-none focus:border-sky-500" />
                  <input type="text" value={newJDCompany} onChange={(e) => setNewJDCompany(e.target.value)}
                    placeholder="Company Name"
                    className="w-full px-4 py-3 theme-card border theme-border rounded-xl theme-text placeholder-opacity-40 focus:outline-none focus:border-sky-500" />
                  <textarea value={newJDText} onChange={(e) => setNewJDText(e.target.value)}
                    placeholder="Paste the job description here... (min 50 words)" rows={8}
                    className="w-full px-4 py-3 theme-card border theme-border rounded-xl theme-text placeholder-opacity-40 focus:outline-none focus:border-sky-500 resize-none" />
                  <button onClick={handleCreateJD} disabled={loading || !newJDTitle || !newJDText}
                    className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity font-medium">
                    {loading ? 'Creating & Analyzing...' : 'Create & Start Analysis →'}
                  </button>
                </div>
              )}

              <div className="flex justify-between items-end mt-4">
                <button onClick={() => setStep('select-cv')}
                  className="px-6 py-3 theme-card border theme-border theme-text-secondary rounded-xl hover:border-sky-500/40 transition-colors">
                  ← Back
                </button>
                {uploadMode === 'existing' && jobDescriptions.length > 0 && (
                  <div className="flex flex-col gap-3 items-end">
                    <LanguageSelector value={responseLanguage} onChange={setResponseLanguage} disabled={loading} />
                    <button onClick={handleAnalyze} disabled={!selectedJD || loading}
                      className="px-8 py-3 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity font-medium">
                      Start Analysis →
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="theme-card backdrop-blur-xl rounded-3xl border theme-border p-12 text-center"
            >
              <div className="mb-8 relative">
                <motion.div
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 flex items-center justify-center">
                    <span className="text-4xl">🔍</span>
                  </div>
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-sky-500/30"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                Analyzing Your CV...
              </h2>
              
              <motion.div 
                key={statusMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20"
              >
                <p className="text-xl font-medium text-sky-400 flex items-center justify-center">
                  <span className="mr-2 animate-pulse">●</span>
                  {statusMessage}
                </p>
              </motion.div>

              <div className="space-y-4 mb-8 max-w-md mx-auto">
                <div className="flex items-center space-x-3 text-left">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusMessage.includes('completed') || statusMessage.includes('ready') ? 'bg-green-500' : 'bg-sky-500 animate-pulse'}`}>
                    <span className="text-white text-sm">{statusMessage.includes('completed') || statusMessage.includes('ready') ? '✓' : '⚡'}</span>
                  </div>
                  <span className="theme-text">Intelligence Engine: Processing</span>
                </div>
                <div className="flex items-center space-x-3 text-left">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full theme-card flex items-center justify-center">
                    <span className="theme-text-tertiary text-sm">○</span>
                  </div>
                  <span className="theme-text-tertiary">Generating RAG Insights</span>
                </div>
              </div>
              <p className="theme-text-tertiary text-sm italic">Privacy Shield: PII Masking is active</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
