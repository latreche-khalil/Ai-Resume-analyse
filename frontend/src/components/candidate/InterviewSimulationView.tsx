'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

type Phase = 'setup' | 'interview' | 'complete'

interface Question { id: string; text: string; type: string }
interface Evaluation { scores: { relevance: number; completeness: number; clarity: number }; feedback: string }

export function InterviewSimulationView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('setup')
  const [jds, setJds] = useState<any[]>([])
  const [selectedJd, setSelectedJd] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [questionNum, setQuestionNum] = useState(1)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  useEffect(() => {
    apiClient.getJobDescriptions({ limit: 20 }).then(r => setJds(Array.isArray(r) ? r : r.items || []))
    const jdId = searchParams.get('jd_id')
    if (jdId) setSelectedJd(jdId)
  }, [])

  const startInterview = async () => {
    if (!selectedJd) return
    setLoading(true)
    try {
      const res = await apiClient.startInterview(selectedJd)
      setSessionId(res.session_id)
      setQuestion({ id: res.question_id, text: res.question, type: 'behavioral' })
      setPhase('interview')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to start interview')
    } finally { setLoading(false) }
  }

  const submitAnswer = async () => {
    if (!answer.trim() || !question) return
    setLoading(true)
    try {
      const res = await apiClient.submitInterviewAnswer(sessionId, question.id, answer)
      setEvaluation(res.evaluation)
      if (res.next_question) {
        setQuestion({ id: res.next_question.id, text: res.next_question.text, type: 'adaptive' })
        setQuestionNum(q => q + 1)
        setAnswer('')
      } else {
        const rep = await apiClient.getInterviewReport(sessionId)
        setReport(rep)
        setPhase('complete')
      }
    } catch (e) {
      alert('Failed to submit answer')
    } finally { setLoading(false) }
  }

  const nextQuestion = () => { setEvaluation(null) }
  const scoreColor = (s: number) => s >= 0.8 ? 'text-green-400' : s >= 0.6 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 text-white">
      <header className="bg-white/5 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-white/60 hover:text-white">← Back</button>
        <div className="text-xl">🗣️</div>
        <div>
          <div className="font-semibold">Mock Interview Simulator</div>
          <div className="text-xs text-white/50">AI-powered adaptive questions</div>
        </div>
        {phase === 'interview' && (
          <div className="ml-auto text-sm text-white/60">Question {questionNum} / 5</div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {phase === 'setup' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold mb-2">Interview Simulation</h1>
              <p className="text-white/60">AI generates adaptive questions based on your CV and the job description</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-white/70">Select Job Description</label>
              <select value={selectedJd} onChange={e => setSelectedJd(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500">
                <option value="">-- Choose a job description --</option>
                {jds.map(jd => <option key={jd.id} value={jd.id}>{jd.title}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[['5', 'Questions'], ['Adaptive', 'Difficulty'], ['AI', 'Feedback']].map(([v, l]) => (
                  <div key={l} className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                    <div className="text-xl font-bold text-sky-400">{v}</div>
                    <div className="text-white/60 text-xs">{l}</div>
                  </div>
                ))}
              </div>
              <button onClick={startInterview} disabled={!selectedJd || loading}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                {loading ? 'Starting...' : 'Start Interview 🚀'}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'interview' && question && (
          <motion.div key={question.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex-1 h-1.5 rounded-full ${i < questionNum ? 'bg-sky-500' : 'bg-white/20'}`} />
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs">{question.type}</span>
                <span className="text-white/40 text-xs">Question {questionNum}</span>
              </div>
              <p className="text-lg leading-relaxed">{question.text}</p>
            </div>
            <AnimatePresence>
              {evaluation && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-green-500/30 rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-green-400">AI Feedback</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {Object.entries(evaluation.scores).map(([k, v]) => (
                      <div key={k} className="bg-white/5 rounded-xl p-3">
                        <div className={`text-2xl font-bold ${scoreColor(v)}`}>{Math.round(v * 100)}%</div>
                        <div className="text-xs text-white/50 capitalize">{k}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-white/70 text-sm">{evaluation.feedback}</p>
                  <button onClick={nextQuestion} className="w-full py-2.5 bg-sky-600 rounded-xl text-sm font-medium hover:bg-sky-500 transition-colors">
                    Next Question →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {!evaluation && (
              <div className="space-y-3">
                <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                  placeholder="Type your answer here... Be specific and use examples from your experience."
                  rows={6}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-sky-500 resize-none text-sm" />
                <button onClick={submitAnswer} disabled={!answer.trim() || loading}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                  {loading ? 'Evaluating...' : 'Submit Answer'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'complete' && report && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className="text-6xl">🏆</div>
            <h1 className="text-3xl font-bold">Interview Complete!</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-5xl font-bold text-sky-400 mb-2">
                {Math.round((report.overall_score || 0.75) * 100)}%
              </div>
              <div className="text-white/60">Overall Score</div>
              <p className="mt-4 text-white/70 text-sm">{report.report}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPhase('setup')} className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
                Try Again
              </button>
              <button onClick={() => router.push('/coaching/career-chat')} className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl font-semibold hover:opacity-90 transition-opacity">
                Chat with Coach
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
