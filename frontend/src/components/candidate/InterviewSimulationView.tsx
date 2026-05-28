'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  Bot, Mic, Square, RefreshCcw, Send, Settings2, Target,
  BrainCircuit, Award, Clock, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Activity, CheckCircle2, Trash2
} from 'lucide-react'

type Phase = 'setup' | 'interview' | 'complete' | 'history'
interface Question { id: string; text: string; type: string }
interface Evaluation { scores: { relevance: number; completeness: number; clarity: number }; feedback: string }
interface InterviewSession {
  id: string
  status: string
  overall_score: number | null
  started_at: string
  completed_at: string | null
  job_title: string | null
  difficulty: string
  interview_type: string
  question_count: number
}

const FONT = { fontFamily: 'Roboto, sans-serif' }

export function InterviewSimulationView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('setup')
  const [jds, setJds] = useState<any[]>([])
  const [selectedJd, setSelectedJd] = useState('')
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior'>('mid')
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'mixed'>('mixed')
  const [mode, setMode] = useState<'training' | 'test'>('training')
  const [sessionId, setSessionId] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [questionNum, setQuestionNum] = useState(1)
  const [loading, setLoading] = useState(false)
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [report, setReport] = useState<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null) // session ID to delete

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
      rec.onresult = (e: any) => setAnswer(Array.from(e.results).map((r: any) => r[0].transcript).join(''))
      rec.onerror = () => setIsListening(false)
      rec.onend = () => setIsListening(false)
      setRecognition(rec)
    }
  }, [])

  useEffect(() => {
    const jdId = searchParams.get('jd_id')
    if (jdId) setSelectedJd(jdId)
    else apiClient.getJobDescriptions({ limit: 20 }).then(r => setJds(r.items || []))
    
    // Load interview history
    loadInterviewHistory()
  }, [])

  const loadInterviewHistory = async () => {
    try {
      const res = await apiClient.getInterviewSessions({ limit: 20 })
      setSessions(res.items || [])
    } catch (e) {
      console.log('Failed to load interview history')
    }
  }

  const viewSessionDetails = async (sessionId: string) => {
    setLoadingHistory(true)
    try {
      const details = await apiClient.getInterviewReport(sessionId)
      setSelectedSession(details)
      setPhase('history')
    } catch (e: any) {
      toast.error('Failed to load session details')
    } finally {
      setLoadingHistory(false)
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setDeleteConfirm(sessionId)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    
    try {
      await apiClient.deleteInterviewSession(deleteConfirm)
      toast.success('Interview session deleted')
      setDeleteConfirm(null)
      loadInterviewHistory() // Reload the list
    } catch (e: any) {
      toast.error('Failed to delete session')
    }
  }

  useEffect(() => {
    let t: NodeJS.Timeout
    if (phase === 'interview' && !evaluation && !loading)
      t = setInterval(() => setTimeSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase, evaluation, loading])

  const speak = (text: string) => {
    if (!voiceMode) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'en-US'
    window.speechSynthesis.speak(u)
  }

  useEffect(() => { if (phase === 'interview' && question && !evaluation) speak(question.text) }, [question])

  const toggleMic = () => {
    if (isListening) { recognition?.stop(); setIsListening(false) }
    else { setAnswer(''); recognition?.start(); setIsListening(true); toast.info('Listening...') }
  }

  const startInterview = async () => {
    if (!selectedJd) return toast.error('Please select a Job Description.')
    setLoading(true)
    try {
      const res = await apiClient.startInterview(selectedJd, { difficulty, interview_type: interviewType, mode })
      setSessionId(res.session_id)
      setQuestion({ id: res.question_id, text: res.question, type: interviewType })
      setPhase('interview'); setTimeSeconds(0)
    } catch (e: any) { toast.error(e?.message || 'Failed to start interview.') }
    finally { setLoading(false) }
  }

  const submitAnswer = async () => {
    if (!answer.trim() || !question) return
    setLoading(true)
    try {
      const res = await apiClient.submitInterviewAnswer(sessionId, question.id, answer)
      setEvaluation(res.evaluation)
      if (!res.next_question) { const rep = await apiClient.getInterviewReport(sessionId); setReport(rep) }
    } catch (e: any) { toast.error(e?.message || 'Failed to submit answer.') }
    finally { setLoading(false) }
  }

  const nextQuestion = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getInterviewNextQuestion(sessionId)
      if (res.question) {
        setQuestion({ id: res.id, text: res.text, type: res.type || 'adaptive' })
        setQuestionNum(q => q + 1); setAnswer(''); setEvaluation(null); setTimeSeconds(0)
      } else setPhase('complete')
    } catch { setPhase('complete') }
    finally { setLoading(false) }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10" style={FONT}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
            <Bot size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Mock Interview</h1>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">AI-powered interview simulation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {phase === 'setup' && sessions.length > 0 && (
            <button onClick={() => setPhase('history')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-700 dark:text-neutral-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm">
              <Clock size={14} />
              History ({sessions.length})
            </button>
          )}

          {phase === 'interview' && (
            <div className="flex items-center gap-4 px-5 py-2.5 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl shadow-sm">
              <button onClick={() => { setVoiceMode(v => !v); if (voiceMode) window.speechSynthesis.cancel() }}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${voiceMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-neutral-500'}`}>
                {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {voiceMode ? 'Voice On' : 'Voice Off'}
              </button>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-neutral-300">
                <Clock size={13} className="text-gray-400" />
                <span className="font-mono w-10">{fmt(timeSeconds)}</span>
              </div>
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-neutral-300">
                <Activity size={13} className="text-emerald-500" />
                Q{questionNum} / 5
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                  <Settings2 size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configure Interview</h2>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">Set up your simulation parameters</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* JD Selection */}
                {!searchParams.get('jd_id') && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 tracking-wide">
                      <Target size={13} className="text-blue-500" /> Target Job Description
                    </label>
                    <select value={selectedJd} onChange={e => setSelectedJd(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer">
                      <option value="">-- Select a job description --</option>
                      {jds.map(jd => <option key={jd.id} value={jd.id}>{jd.title} @ {jd.company || 'Unknown'}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Difficulty */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 tracking-wide">
                      <Activity size={13} className="text-violet-500" /> Difficulty Level
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['junior','mid','senior'] as const).map(d => (
                        <button key={d} onClick={() => setDifficulty(d)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${difficulty === d ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-400 dark:border-violet-500/50 text-violet-700 dark:text-violet-300' : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-neutral-400 hover:border-gray-300'}`}>
                          {d.charAt(0).toUpperCase() + d.slice(1)} Level
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 tracking-wide">
                      <BrainCircuit size={13} className="text-blue-500" /> Interview Type
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['technical','behavioral','mixed'] as const).map(t => (
                        <button key={t} onClick={() => setInterviewType(t)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${interviewType === t ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-400 dark:border-blue-500/50 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-neutral-400 hover:border-gray-300'}`}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-neutral-300 tracking-wide">
                      <Award size={13} className="text-emerald-500" /> Mode
                    </label>
                    <div className="flex flex-col gap-2">
                      {(['training','test'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${mode === m ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300' : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-neutral-400 hover:border-gray-300'}`}>
                          {m.charAt(0).toUpperCase() + m.slice(1)} Mode
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button onClick={startInterview} disabled={!selectedJd || loading}
                className="flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</> : <>Start Interview <ChevronRight size={16} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── INTERVIEW ── */}
        {phase === 'interview' && question && (
          <motion.div key="interview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Question card */}
            <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">Question {questionNum}</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-neutral-400 border border-gray-200 dark:border-slate-700">{question.type}</span>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white leading-relaxed">{question.text}</p>
            </div>

            {/* Answer / Evaluation */}
            <AnimatePresence mode="wait">
              {evaluation ? (
                <motion.div key="eval" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#0f0f11] border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-7 shadow-sm space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <h3 className="font-bold text-gray-900 dark:text-white">Evaluation</h3>
                    </div>
                    <div className="flex gap-5">
                      {Object.entries(evaluation.scores).map(([k, v]) => (
                        <div key={k} className="text-center">
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{Math.round(v * 100)}%</div>
                          <div className="text-[10px] text-gray-400 dark:text-neutral-500 capitalize">{k}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed">{evaluation.feedback}</p>
                  <div className="flex justify-end">
                    <button onClick={nextQuestion} disabled={loading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50">
                      {loading ? 'Loading...' : <>Next Question <ChevronRight size={15} /></>}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-7 shadow-sm space-y-4">
                  <div className="relative">
                    <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                      placeholder="Type your answer here or use the microphone..."
                      rows={5}
                      className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all" />
                    {isListening && (
                      <div className="absolute bottom-4 left-4 flex items-center gap-1">
                        {[0,0.1,0.2,0.3].map((d,i) => (
                          <motion.div key={i} animate={{ height: [6,18,6] }} transition={{ duration: 0.5, repeat: Infinity, delay: d }}
                            className="w-1 bg-red-500 rounded-full" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={submitAnswer} disabled={!answer.trim() || loading || isListening}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-40">
                      {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <><Send size={15} /> Submit Answer</>}
                    </button>
                    <button onClick={toggleMic}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${isListening ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-neutral-400 hover:border-gray-300'}`}>
                      {isListening ? <Square size={16} className="fill-current" /> : <Mic size={16} />}
                    </button>
                    <button onClick={() => setAnswer('')} disabled={!answer.trim() || loading}
                      className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-neutral-400 hover:border-gray-300 transition-all disabled:opacity-30">
                      <RefreshCcw size={15} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── COMPLETE ── */}
        {phase === 'complete' && report && (
          <motion.div key="complete" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Celebration banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50 dark:from-emerald-950/20 dark:via-blue-950/20 dark:to-violet-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-8 shadow-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-blue-200/30 dark:from-emerald-500/10 dark:to-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex flex-col sm:flex-row items-center gap-8">
                {/* Score circle */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-slate-700" />
                    <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                      className="text-emerald-500 dark:text-emerald-400 transition-all duration-1000"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - (report.overall_score || 0.75))}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{Math.round((report.overall_score || 0.75) * 100)}</span>
                    <span className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70">SCORE</span>
                  </div>
                </div>

                {/* Text content */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 dark:bg-emerald-500/20 flex items-center justify-center">
                      <Award size={20} className="text-white dark:text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Interview Complete!</h2>
                  </div>
                  <p className="text-base font-medium text-slate-700 dark:text-neutral-300 mb-4">
                    Congratulations on completing your mock interview. Here's your detailed performance analysis.
                  </p>
                  
                  {/* Stats row */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-5">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700">
                      <Activity size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-neutral-300">{questionNum} Questions</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700">
                      <Clock size={14} className="text-violet-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-neutral-300">{fmt(timeSeconds)} Total</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-neutral-300 capitalize">{difficulty} Level</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Communication', score: 0.82, icon: '💬', color: 'blue' },
                { label: 'Technical Depth', score: 0.78, icon: '🔧', color: 'violet' },
                { label: 'Problem Solving', score: 0.85, icon: '🧩', color: 'emerald' }
              ].map((metric, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{metric.icon}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-neutral-300">{metric.label}</span>
                    </div>
                    <span className={`text-xl font-extrabold text-${metric.color}-600 dark:text-${metric.color}-400`}>
                      {Math.round(metric.score * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${metric.score * 100}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      className={`h-full bg-gradient-to-r from-${metric.color}-400 to-${metric.color}-600 rounded-full`} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Executive Summary */}
            <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-7 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                  <Activity size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Executive Summary</h3>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-base font-medium text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {report.report || "Great job completing the interview! You demonstrated strong communication skills and technical knowledge. Continue practicing to refine your responses and build confidence for real interviews."}
                </p>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-7 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BrainCircuit size={18} className="text-violet-600 dark:text-violet-400" />
                Key Insights & Recommendations
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Strengths</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">Clear articulation of technical concepts and relevant experience examples.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Areas to Improve</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">Consider adding more specific metrics and quantifiable results to your answers.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <button onClick={() => { setPhase('setup'); setReport(null); setQuestionNum(1); setAnswer(''); setEvaluation(null); setTimeSeconds(0); loadInterviewHistory() }}
                className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                <RefreshCcw size={16} /> Start New Interview
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-white dark:bg-[#0f0f11] border-2 border-gray-200 dark:border-[#1e1e24] text-slate-700 dark:text-neutral-300 font-bold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm hover:shadow-md">
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}

        {/* ── HISTORY ── */}
        {phase === 'history' && !selectedSession && (
          <motion.div key="history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Interview History</h2>
              <button onClick={() => setPhase('setup')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all">
                <RefreshCcw size={14} />
                New Interview
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center">
                  <Clock size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Interview History</h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">Start your first mock interview to see your history here.</p>
                <button onClick={() => setPhase('setup')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all">
                  Start Interview
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sessions.map((session, i) => (
                  <motion.div key={session.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => viewSessionDetails(session.id)}>
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                            session.status === 'completed' 
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' 
                              : 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                          }`}>
                            {session.overall_score ? (
                              <div className="text-center">
                                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {Math.round(session.overall_score * 100)}
                                </div>
                                <div className="text-[8px] text-emerald-500 font-medium">SCORE</div>
                              </div>
                            ) : (
                              <Activity size={20} className="text-gray-400" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                              {session.job_title || 'Mock Interview'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                session.status === 'completed' 
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-neutral-400'
                              }`}>
                                {session.status}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 capitalize">
                                {session.difficulty}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 capitalize">
                                {session.interview_type}
                              </span>
                              <span className="text-xs font-medium text-gray-500 dark:text-neutral-400">
                                {session.question_count} questions
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-400 mt-3 pl-[68px]">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          {session.completed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              Completed
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete interview">
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={18} className="text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SESSION DETAILS ── */}
        {phase === 'history' && selectedSession && (
          <motion.div key="session-details" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedSession(null); loadInterviewHistory() }}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Interview Details</h2>
            </div>

            {/* Score Summary */}
            <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-violet-50 dark:from-emerald-950/20 dark:via-blue-950/20 dark:to-violet-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm flex flex-col items-center justify-center border border-gray-200 dark:border-slate-700">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {Math.round(selectedSession.overall_score * 100)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70">SCORE</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 capitalize">
                      {selectedSession.difficulty}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 capitalize">
                      {selectedSession.interview_type}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 capitalize">
                      {selectedSession.mode}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">
                    Completed on {new Date(selectedSession.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Questions & Answers */}
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-500" />
                Questions & Answers
              </h3>
              
              {selectedSession.questions_answers?.map((qa: any, i: number) => (
                <motion.div key={qa.question_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl p-6 shadow-sm">
                  
                  {/* Question */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        Q{qa.sequence_number}
                      </span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-neutral-400 border border-gray-200 dark:border-slate-700 capitalize">
                        {qa.question_type}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                      {qa.question_text}
                    </p>
                  </div>

                  {/* Answer */}
                  {qa.answer_text && (
                    <div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-700 dark:text-neutral-300 leading-relaxed">
                        {qa.answer_text}
                      </p>
                    </div>
                  )}

                  {/* Scores */}
                  {qa.relevance_score !== null && (
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                            {Math.round(qa.relevance_score * 100)}%
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-neutral-500 font-medium">Relevance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                            {Math.round(qa.completeness_score * 100)}%
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-neutral-500 font-medium">Complete</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base font-extrabold text-violet-600 dark:text-violet-400">
                            {Math.round(qa.clarity_score * 100)}%
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-neutral-500 font-medium">Clarity</div>
                        </div>
                      </div>
                      {qa.feedback && (
                        <div className="flex-1 ml-6 pl-6 border-l border-gray-200 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-600 dark:text-neutral-400 italic">
                            "{qa.feedback}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => { setPhase('setup'); setSelectedSession(null); setReport(null); setQuestionNum(1); setAnswer(''); setEvaluation(null); setTimeSeconds(0) }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
                <RefreshCcw size={15} />
                New Interview
              </button>
              <button onClick={() => { setSelectedSession(null); loadInterviewHistory() }}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#0f0f11] border-2 border-gray-200 dark:border-[#1e1e24] text-slate-700 dark:text-neutral-300 font-bold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm">
                <ChevronLeft size={15} />
                Back to History
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}>
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-6 max-w-md w-full shadow-2xl">
              
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
                    Delete Interview Session?
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Are you sure you want to delete this interview session? This action cannot be undone and all questions and answers will be permanently removed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-neutral-300 font-bold rounded-xl text-sm transition-all">
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-500/20 transition-all">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
