'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  FileText, Plus, Briefcase, Sparkles, Zap,
  ChevronRight, ArrowLeft, Search, BrainCircuit,
  Target, Globe, Database, Cpu, ShieldCheck, CheckCircle2,
} from 'lucide-react'
import { LanguageSelector, AnalysisLanguage } from '@/components/shared/LanguageSelector'
import { CVDocument } from '@/types/candidate'
import { useAuth } from '@/contexts/auth-context'

interface JobDescription {
  id: string
  title: string
  company: string
  created_at: string
}

type Step = 'select-cv' | 'select-jd' | 'analyzing'

export function NewAnalysisView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const initialCV = searchParams.get('cv')
  const homePath = user?.role === 'recruiter' ? '/recruiter' : '/dashboard'

  const [step, setStep] = useState<Step>(initialCV ? 'select-jd' : 'select-cv')
  const [cvDocuments, setCvDocuments] = useState<CVDocument[]>([])
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([])
  const [selectedCV, setSelectedCV] = useState<string | null>(initialCV)
  const [selectedJD, setSelectedJD] = useState<string | null>(null)
  const [newJDText, setNewJDText] = useState('')
  const [newJDTitle, setNewJDTitle] = useState('')
  const [newJDCompany, setNewJDCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'existing' | 'new'>('existing')
  const [responseLanguage, setResponseLanguage] = useState<AnalysisLanguage>('en')
  const [statusMessage, setStatusMessage] = useState('Initializing AI Agents...')

  useEffect(() => {
    loadCVDocuments()
    loadJobDescriptions()
  }, [])

  const loadCVDocuments = async () => {
    try {
      const response = await apiClient.getDocuments({ limit: 50 })
      const normalizedDocs = (response.documents || []).map((doc: any) => ({
        ...doc,
        file_size: doc.file_size_bytes || doc.file_size || 0,
      }))
      setCvDocuments(normalizedDocs)
    } catch (error) {
      console.error('Failed to load CVs:', error)
    }
  }

  const loadJobDescriptions = async () => {
    try {
      const response = await apiClient.getJobDescriptions({ limit: 50 })
      setJobDescriptions(response.items || [])
    } catch (error) {
      console.error('Failed to load JDs:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedCV || (!selectedJD && uploadMode === 'existing')) {
      toast.error('Please select both CV and Job Description')
      return
    }
    setStep('analyzing')
    setLoading(true)
    try {
      let finalJDId = selectedJD
      if (uploadMode === 'new') {
        setStatusMessage('Structuring Job Data...')
        const jd = await apiClient.createJobDescription({
          title: newJDTitle,
          company: newJDCompany || 'Direct Opportunity',
          description: newJDText,
          required_skills: [],
          preferred_skills: [],
        })
        finalJDId = jd.id
      }
      if (!finalJDId) throw new Error('Failed to identify target job')
      setStatusMessage('Extracting Semantic Tokens...')
      const analysis = await apiClient.createAnalysis(selectedCV, finalJDId, responseLanguage)
      const maxAttempts = 30
      let attempts = 0
      const statuses = [
        'Running Neural Matcher...', 'Cross-referencing Skills...',
        'Identifying ATS Gaps...', 'Generating Recommendations...', 'Finalizing AI Report...',
      ]
      while (attempts < maxAttempts) {
        setStatusMessage(statuses[Math.min(Math.floor(attempts / 2), statuses.length - 1)])
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          const result = await apiClient.getAnalysis(analysis.id)
          if (result.analysis_status === 'completed' || result.processing_status === 'completed') {
            setStatusMessage('Analysis Complete!')
            await new Promise(resolve => setTimeout(resolve, 800))
            router.push(`/analysis/${analysis.id}`)
            return
          } else if (result.analysis_status === 'failed' || result.processing_status === 'failed') {
            throw new Error('Analysis failed')
          }
        } catch (pollError) {
          console.error('Polling error:', pollError)
        }
        attempts++
      }
      router.push(`/analysis/${analysis.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to start analysis')
      setStep('select-jd')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input classes ──────────────────────────────────────────────────
  const inputCls = 'w-full bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">New Analysis</h1>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">Match your resume to a job description</p>
          </div>
        </div>
        {step !== 'analyzing' && (
          <button onClick={() => router.push(homePath)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {/* Stepper */}
      {step !== 'analyzing' && (
        <div className="relative flex items-center justify-center py-3">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
          <div className="relative z-10 flex items-center gap-20 sm:gap-32">
            {([
              { id: 'select-cv' as Step, label: 'Resume',     icon: FileText },
              { id: 'select-jd' as Step, label: 'Job Target', icon: Target   },
              { id: 'analyzing' as Step, label: 'Analysis',   icon: Cpu      },
            ]).map((s) => {
              const isPast = step === 'select-jd' && s.id === 'select-cv'
              const isCurrent = step === s.id
              return (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${
                    isPast    ? 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20' :
                    isCurrent ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' :
                    'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4.5 h-4.5" />}
                  </div>
                  <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">

        {/* ── Step 1: Select CV ── */}
        {step === 'select-cv' && (
          <motion.div key="select-cv" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Upload new */}
              <motion.div whileHover={{ y: -2 }} onClick={() => router.push('/upload')}
                className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 group shadow-sm">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Upload New CV</h4>
                  <p className="text-gray-500 dark:text-neutral-400 text-xs mt-0.5">Add a new version</p>
                </div>
              </motion.div>

              {/* CV cards */}
              {cvDocuments.map((cv, i) => (
                <motion.div key={cv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }} onClick={() => setSelectedCV(cv.id)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-sm ${
                    selectedCV === cv.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/5'
                      : 'bg-white dark:bg-[#0f0f11] border-gray-200 dark:border-[#1e1e24] hover:border-blue-300 dark:hover:border-blue-600'
                  }`}>
                  {selectedCV === cv.id && (
                    <div className="absolute top-3 right-3 text-blue-500"><CheckCircle2 className="w-5 h-5" /></div>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{cv.original_filename}</h4>
                    <p className="text-gray-500 dark:text-neutral-400 text-xs mt-0.5">{new Date(cv.created_at).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button onClick={() => setStep('select-jd')} disabled={!selectedCV}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed group">
                Next: Select Job <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Select JD ── */}
        {step === 'select-jd' && (
          <motion.div key="select-jd" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-5">
            <div className="flex flex-col lg:flex-row gap-5">

              {/* Left: JD selector */}
              <div className="lg:w-1/2 space-y-4">
                {/* Toggle */}
                <div className="flex p-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl">
                  {(['existing','new'] as const).map(m => (
                    <button key={m} onClick={() => setUploadMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${uploadMode === m ? 'bg-white dark:bg-[#0f0f11] text-blue-600 dark:text-white shadow-sm border border-gray-200 dark:border-slate-700' : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'}`}>
                      {m === 'existing' ? 'From Library' : 'Create New'}
                    </button>
                  ))}
                </div>

                {uploadMode === 'existing' ? (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {jobDescriptions.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-500 dark:text-neutral-400 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl">
                        No job descriptions yet. Create one.
                      </div>
                    ) : jobDescriptions.map((jd) => (
                      <div key={jd.id} onClick={() => setSelectedJD(jd.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 group ${
                          selectedJD === jd.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/5'
                            : 'bg-white dark:bg-[#0f0f11] border-gray-200 dark:border-[#1e1e24] hover:border-blue-300 dark:hover:border-blue-600'
                        }`}>
                        <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 ${selectedJD === jd.id ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-neutral-400'}`}>
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 dark:text-white font-semibold text-sm truncate">{jd.title}</h4>
                          <p className="text-gray-500 dark:text-neutral-400 text-xs">{jd.company}</p>
                        </div>
                        {selectedJD === jd.id && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={newJDTitle} onChange={e => setNewJDTitle(e.target.value)} placeholder="Job Title" className={inputCls} />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={newJDCompany} onChange={e => setNewJDCompany(e.target.value)} placeholder="Company Name" className={inputCls} />
                    </div>
                    <textarea value={newJDText} onChange={e => setNewJDText(e.target.value)} rows={8}
                      placeholder="Paste the full job description here..."
                      className="w-full bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl p-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none" />
                  </div>
                )}
              </div>

              {/* Right: Settings */}
              <div className="lg:w-1/2">
                <div className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  
                  {/* Analysis Mode */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 tracking-wider uppercase">Analysis Mode</h4>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-200 dark:border-blue-500/20 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">Advanced RAG Mode</p>
                        <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                          Deep semantic cross-referencing between your expertise and job requirements.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Response Language */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-neutral-400 tracking-wider uppercase">Response Language</h4>
                    <LanguageSelector value={responseLanguage} onChange={setResponseLanguage} />
                  </div>

                  {/* Start Button */}
                  <button onClick={handleAnalyze} disabled={loading || (!selectedJD && !newJDTitle)}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Start Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Analyzing ── */}
        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-8">
            <div className="relative max-w-xl mx-auto p-10 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm text-center space-y-8 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 60%)' }} />

              {/* Spinner */}
              <div className="relative">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="w-28 h-28 mx-auto rounded-full border-2 border-dashed border-blue-300 dark:border-blue-500/30 flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-14 h-14 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/30 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white" />
                  </motion.div>
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              </div>

              <div className="space-y-3 relative z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>{statusMessage}</h2>
                <div className="flex items-center justify-center gap-5">
                  {[['Neural Engine','blue'],['Semantic Map','indigo']].map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full bg-${color}-500 animate-pulse`} />
                      <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1.5">
                  <Database className="w-5 h-5 text-gray-400 dark:text-neutral-500 mx-auto" />
                  <div className="text-xs font-medium text-gray-500 dark:text-neutral-400">Tokens Parsed</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">4.2k+</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1.5">
                  <ShieldCheck className="w-5 h-5 text-gray-400 dark:text-neutral-500 mx-auto" />
                  <div className="text-xs font-medium text-gray-500 dark:text-neutral-400">Privacy Mask</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Active</div>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-neutral-500 relative z-10">
                AI is processing your request. This may take up to 60 seconds.
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
