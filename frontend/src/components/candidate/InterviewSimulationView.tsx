'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

type Phase = 'setup' | 'interview' | 'complete'

interface Question { id: string; text: string; type: string }
interface Evaluation { scores: { relevance: number; completeness: number; clarity: number }; feedback: string }

export function InterviewSimulationView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('setup')
  const [jds, setJds] = useState<any[]>([])
  
  // Setup State
  const [selectedJd, setSelectedJd] = useState('')
  const [difficulty, setDifficulty] = useState<'junior' | 'mid' | 'senior'>('mid')
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'mixed'>('mixed')
  const [mode, setMode] = useState<'training' | 'test'>('training')
  
  // Active Interview State
  const [sessionId, setSessionId] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [questionNum, setQuestionNum] = useState(1)
  const [loading, setLoading] = useState(false)
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [report, setReport] = useState<any>(null)

  // Voice State
  const [isListening, setIsListening] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [voiceMode, setVoiceMode] = useState(true)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'ar-SA'

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('')
        setAnswer(transcript)
      }

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
      }

      rec.onend = () => setIsListening(false)
      setRecognition(rec)
    }
  }, [])

  // Text-to-Speech Helper
  const speak = (text: string) => {
    if (!voiceMode || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'en-US'
    utterance.rate = 0.9
    utterance.onstart = () => setIsAiSpeaking(true)
    utterance.onend = () => setIsAiSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const toggleMic = () => {
    if (isListening) {
      recognition?.stop()
      setIsListening(false)
    } else {
      setAnswer('')
      if (recognition && question) {
        // Dynamic language detection based on question
        const isArabic = /[\u0600-\u06FF]/.test(question.text)
        recognition.lang = isArabic ? 'ar-SA' : 'en-US'
      }
      recognition?.start()
      setIsListening(true)
      const msg = recognition.lang === 'ar-SA' ? 'تحدث الآن (بالعربية)...' : 'Speak now (English)...'
      toast.info(msg)
    }
  }

  // Effect to speak new questions
  useEffect(() => {
    if (phase === 'interview' && question && !evaluation && !loading) {
      speak(question.text)
    }
  }, [question, phase])

  useEffect(() => {
    const jdId = searchParams.get('jd_id')
    if (jdId) {
      setSelectedJd(jdId)
      // If we have a JD, we can even skip fetching the list to stay minimal
    } else {
      apiClient.getJobDescriptions({ limit: 20 }).then(r => setJds(Array.isArray(r) ? r : r.items || []))
    }
  }, [])

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (phase === 'interview' && !evaluation && !loading) {
      interval = setInterval(() => setTimeSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [phase, evaluation, loading])

  const startInterview = async () => {
    if (!selectedJd) {
      toast.error('الرجاء اختيار الوصف الوظيفي للمتابعة')
      return
    }
    setLoading(true)
    try {
      // Logic: Pass new parameters to startInterview
      const res = await apiClient.startInterview(selectedJd, { difficulty, interviewType, mode })
      setSessionId(res.session_id)
      setQuestion({ id: res.question_id, text: res.question, type: interviewType })
      setPhase('interview')
      setTimeSeconds(0)
      toast.success('تم تجهيز الوكيل الذكي بنجاح')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'فشل في بدء المقابلة')
    } finally { setLoading(false) }
  }

  const submitAnswer = async () => {
    if (!answer.trim() || !question) return
    setLoading(true)
    try {
      const res = await apiClient.submitInterviewAnswer(sessionId, question.id, answer)
      setEvaluation(res.evaluation)
      if (!res.next_question) {
        const rep = await apiClient.getInterviewReport(sessionId)
        setReport(rep)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'فشل في تقييم الإجابة')
    } finally { setLoading(false) }
  }

  const nextQuestion = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getInterviewNextQuestion(sessionId)
      if (res.question) {
        setQuestion({ id: res.id, text: res.text, type: res.type || 'adaptive' })
        setQuestionNum(q => q + 1)
        setAnswer('')
        setEvaluation(null)
        setTimeSeconds(0)
      } else {
        setPhase('complete')
      }
    } catch (e) {
      setPhase('complete')
    } finally { setLoading(false) }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen theme-bg theme-text selection:bg-sky-500/30">
      {/* Dynamic Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-xl border-b theme-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-sm opacity-60">← عودة</button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-black tracking-tight text-lg">AI Simulation Hub</span>
          </div>
        </div>
        
        {phase === 'interview' && (
          <div className="flex items-center gap-8">
            <button 
              onClick={() => {
                setVoiceMode(!voiceMode)
                if (voiceMode) window.speechSynthesis.cancel()
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${voiceMode ? 'bg-sky-500/10 border-sky-500/50 text-sky-400' : 'bg-white/5 border-white/10 opacity-40'}`}
            >
              <span className="text-xs">{voiceMode ? '🔊 Voice ON' : '🔇 Voice OFF'}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest opacity-40">Timer</span>
              <span className="font-mono text-sky-400 font-bold">{formatTime(timeSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest opacity-40">Progress</span>
              <span className="font-bold">{questionNum}/5</span>
            </div>
          </div>
        )}
      </header>

      <main className="pt-32 pb-20 px-4 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* Phase 1: Setup Interface */}
          {phase === 'setup' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <div className="text-center max-w-2xl mx-auto">
                <h1 className="text-4xl font-black mb-4 tracking-tight">إعداد بيئة المحاكاة الذكية</h1>
                <p className="theme-text-tertiary leading-relaxed">قم بتخصيص سياق المقابلة لضمان حصولك على تجربة تعليمية مخصصة بناءً على معايير الأرغونوميا العالمية.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Job Selection - Hidden if already provided via URL */}
                {!searchParams.get('jd_id') && (
                  <div className="md:col-span-3 space-y-4">
                    <label className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">1. الوصف الوظيفي المستهدف</label>
                    <select value={selectedJd} onChange={e => setSelectedJd(e.target.value)}
                      className="w-full bg-white/5 border theme-border rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-sky-500/50 transition-all appearance-none cursor-pointer hover:bg-white/10">
                      <option value="" className="bg-slate-900">-- اختر الوظيفة لتحليل الفجوات --</option>
                      {jds.map(jd => <option key={jd.id} value={jd.id} className="bg-slate-900">{jd.title}</option>)}
                    </select>
                  </div>
                )}

                {/* Difficulty */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">2. مستوى الصعوبة</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['junior', 'mid', 'senior'].map(d => (
                      <button key={d} onClick={() => setDifficulty(d as any)}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${difficulty === d ? 'bg-sky-600 border-sky-400 shadow-lg' : 'theme-card theme-border opacity-50'}`}>
                        {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">3. نوع المقابلة</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['technical', 'behavioral', 'mixed'].map(t => (
                      <button key={t} onClick={() => setInterviewType(t as any)}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${interviewType === t ? 'bg-purple-600 border-purple-400 shadow-lg' : 'theme-card theme-border opacity-50'}`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-50">4. وضعية التشغيل</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['training', 'test'].map(m => (
                      <button key={m} onClick={() => setMode(m as any)}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${mode === m ? 'bg-emerald-600 border-emerald-400 shadow-lg' : 'theme-card theme-border opacity-50'}`}>
                        {m.toUpperCase()}
                        <span className="block text-[8px] opacity-60 font-normal mt-1">{m === 'training' ? 'نصائح فورية' : 'تقييم نهائي'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t theme-border">
                <button onClick={startInterview} disabled={!selectedJd || loading}
                  className="w-full py-5 bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl font-black text-lg shadow-2xl shadow-sky-600/20 disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {loading ? 'جاري تجهيز الوكلاء...' : 'بدء المحاكاة الآن 🚀'}
                </button>
                <p className="text-center text-[10px] theme-text-tertiary mt-4 uppercase tracking-widest">Powered by RAG & Multi-Agent Orchestration</p>
              </div>
            </motion.div>
          )}

          {/* Phase 2: Active Simulation */}
          {phase === 'interview' && question && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-12">
              
              {/* Pulsing AI Agent Avatar */}
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <motion.div 
                    animate={{ 
                      scale: isAiSpeaking ? [1, 1.3, 1] : [1, 1.1, 1], 
                      opacity: isAiSpeaking ? [0.2, 0.5, 0.2] : [0.1, 0.2, 0.1] 
                    }}
                    transition={{ duration: isAiSpeaking ? 0.5 : 3, repeat: Infinity }}
                    className={`absolute inset-0 rounded-full blur-3xl ${isAiSpeaking ? 'bg-sky-400' : 'bg-sky-500'}`}
                  />
                  <div className={`relative w-32 h-32 rounded-full theme-card border flex items-center justify-center text-5xl shadow-2xl z-10 transition-all ${isAiSpeaking ? 'border-sky-400 shadow-sky-400/20' : 'theme-border'}`}>
                    <span className={isAiSpeaking || loading ? 'animate-bounce' : ''}>🤖</span>
                  </div>
                  {loading && (
                    <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <div className="mt-6 text-center">
                  <span className="text-[10px] uppercase tracking-[0.4em] theme-text-tertiary">AI Interviewer is speaking...</span>
                </div>
              </div>

              {/* Question Card */}
              <div className="theme-card rounded-[32px] p-10 border theme-border shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-sky-500" />
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase rounded-full">Question {questionNum}</span>
                  <span className="px-3 py-1 bg-white/5 text-white/40 text-[10px] font-black uppercase rounded-full">{question.type}</span>
                </div>
                <p className="text-2xl font-medium leading-relaxed theme-text">{question.text}</p>
              </div>

              {/* Interaction Zone */}
              <AnimatePresence mode="wait">
                {evaluation ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="theme-card border-emerald-500/30 rounded-3xl p-8 bg-emerald-500/5">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2">
                          <span>✨</span> تحليل الإجابة (Mode: {mode.toUpperCase()})
                        </h3>
                        <div className="flex gap-4">
                          {Object.entries(evaluation.scores).map(([k, v]) => (
                            <div key={k} className="text-center">
                              <div className="text-lg font-black text-emerald-500">{Math.round(v * 100)}%</div>
                              <div className="text-[8px] uppercase tracking-tighter opacity-40">{k}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="theme-text leading-relaxed text-sm">{evaluation.feedback}</p>
                    </div>
                    <button onClick={nextQuestion} disabled={loading}
                      className="w-full py-5 bg-sky-600 hover:bg-sky-700 rounded-2xl font-black transition-all shadow-xl shadow-sky-600/20">
                      {loading ? 'جاري التحليل...' : 'السؤال التالي ⮕'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="relative group">
                      <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                        placeholder="اكتب إجابتك هنا أو استخدم الميكروفون للتحدث..."
                        rows={6}
                        className="w-full bg-white/5 border theme-border rounded-2xl px-8 py-6 theme-text placeholder:opacity-20 focus:outline-none focus:border-sky-500/50 resize-none text-lg transition-all"
                      />
                      <div className="absolute bottom-6 right-6 flex items-center gap-4">
                        {isListening && (
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <motion.div key={i}
                                animate={{ height: [8, 20, 8] }}
                                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                className="w-1 bg-sky-500 rounded-full"
                              />
                            ))}
                          </div>
                        )}
                        <button onClick={toggleMic}
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isListening ? 'bg-red-500 shadow-red-500/40 scale-110' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'}`}>
                          <span className="text-xl">{isListening ? '⏹️' : '🎤'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={submitAnswer} disabled={!answer.trim() || loading || isListening}
                        className="flex-1 py-5 bg-white theme-text-inverse rounded-2xl font-black hover:opacity-90 disabled:opacity-20 transition-all">
                        {loading ? 'جاري التقييم...' : 'إرسال الإجابة ✅'}
                      </button>
                      <button onClick={() => setAnswer('')} disabled={loading || isListening}
                        className="px-8 py-5 theme-card border theme-border rounded-2xl font-bold hover:bg-red-500/10 hover:border-red-500/20 transition-all text-sm">
                        🔄 إعادة
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Phase 3: Detailed Report Interface */}
          {phase === 'complete' && report && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
              <div className="text-center">
                <div className="text-6xl mb-6">🎓</div>
                <h1 className="text-4xl font-black mb-2">تم اكتمال المحاكاة بنجاح</h1>
                <p className="theme-text-tertiary">تحليل شامل لأدائك بناءً على متطلبات الوظيفة ومعايير ISIL</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 theme-card rounded-[32px] p-10 border theme-border space-y-8">
                  <div className="flex items-center justify-between border-b theme-border pb-6">
                    <h3 className="text-2xl font-black">تقرير الأداء التفصيلي</h3>
                    <div className="px-4 py-2 bg-sky-500/10 rounded-xl text-sky-400 font-black text-xl">
                      {Math.round((report.overall_score || 0.75) * 100)}%
                    </div>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="theme-text-secondary leading-relaxed whitespace-pre-wrap">{report.report}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="theme-card rounded-3xl p-6 border theme-border">
                    <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 mb-4">AI Recommendations</h4>
                    <ul className="space-y-3">
                      {['تحسين الدقة التقنية', 'اختصار الإجابات السلوكية', 'استخدام مصطلحات الـ JD'].map(tip => (
                        <li key={tip} className="flex items-center gap-3 text-sm">
                          <span className="text-emerald-500">✓</span>
                          <span className="theme-text-secondary">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => setPhase('setup')} className="w-full py-4 bg-sky-600 rounded-2xl font-bold shadow-lg shadow-sky-600/20">جولة أخرى 🔄</button>
                  <button onClick={() => router.push('/dashboard')} className="w-full py-4 theme-card border theme-border rounded-2xl font-bold">العودة للوحة التحكم</button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
