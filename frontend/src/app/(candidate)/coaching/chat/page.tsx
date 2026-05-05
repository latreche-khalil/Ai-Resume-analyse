'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { apiClient } from '@/lib/api-client'

interface Message { role: 'user' | 'assistant'; content: string; ts: string }

export default function CoachingChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { startSession() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const startSession = async () => {
    try {
      const res = await apiClient.createChatSession()
      setSessionId(res.session_id)
      setMessages([{
        role: 'assistant',
        content: "?? Hi! I'm your AI Career Coach. I've loaded your CV context and I'm ready to help you with career advice, interview prep, skill gaps, and more. What would you like to work on today?",
        ts: new Date().toISOString()
      }])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start session. Please upload a CV first.')
    } finally {
      setStarting(false)
    }
  }

  const send = async () => {
    if (!input.trim() || !sessionId || loading) return
    const userMsg: Message = { role: 'user', content: input, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await apiClient.sendChatMessage(sessionId, input)
      setMessages(prev => [...prev, { role: 'assistant', content: res.message, ts: new Date().toISOString() }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '?? Sorry, I encountered an error. Please try again.', ts: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = [
    'What are my strongest skills?',
    'How can I improve my match score?',
    'Prepare me for a technical interview',
    'What skills should I learn next?',
  ]

  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-900/20 to-slate-900 flex flex-col">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-white/60 hover:text-white">? Back</button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-xl">??</div>
          <div>
            <div className="font-semibold text-white">AI Career Coach</div>
            <div className="text-xs text-green-400">? Online · RAG-powered · Privacy-safe</div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
          {starting && (
            <div className="text-center text-white/40 py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-2" />
              <p>Loading your CV context...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 text-red-300 text-center">
              {error}
              <br /><button onClick={() => router.push('/upload')} className="mt-2 underline text-sm">Upload a CV first ?</button>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-sky-600 to-blue-600 text-white'
                    : 'bg-white/10 text-white/90 border border-white/10'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && !starting && !error && (
          <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setInput(s); }} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white/70 hover:text-white transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white/5 backdrop-blur border-t border-white/10 px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask your career coach..."
              disabled={loading || starting || !!error}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-sky-500 text-sm"
            />
            <button onClick={send} disabled={loading || !input.trim() || !!error}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl text-white font-medium disabled:opacity-40 hover:opacity-90 transition-opacity text-sm">
              Send
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

