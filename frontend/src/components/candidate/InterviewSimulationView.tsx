'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import {
  Bot, Mic, Square, RefreshCcw, Send, Settings2, Target,
  BrainCircuit, Award, Clock, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Activity, CheckCircle2
} from 'lucide-react'

type Phase = 'setup' | 'interview' | 'complete'
interface Question { id: string; text: string; type: string }
interface Evaluation { scores: { relevance: number; completeness: number; clarity: number }; feedback: string }

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
  }, [])

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

            {/* Score banner */}
            <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col items-center justify-center shrink-0">
                  <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round((report.overall_score || 0.75) * 100)}%</span>
                  <span className="text-[10px] text-emerald-500 font-medium mt-0.5">Score</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={18} className="text-emerald-500" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Interview Complete!</h2>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">Here's your performance summary based on your answers.</p>
                </div>
              </div>
            </div>

            {/* Report */}
            <div className="bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl p-7 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Executive Summary
              </h3>
              <p className="text-sm text-gray-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.report}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button onClick={() => { setPhase('setup'); setReport(null); setQuestionNum(1); setAnswer(''); setEvaluation(null) }}
                className="flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all">
                <RefreshCcw size={15} /> New Interview
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2 px-7 py-3 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-700 dark:text-neutral-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm">
                <ChevronLeft size={15} /> Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
