'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import {
  Bot, Send, Sparkles, Lightbulb, Briefcase,
  Target, User, RefreshCw, MessageSquare
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  { text: 'Analyze my skill gaps',   icon: Target,    color: '#6366f1' },
  { text: 'Interview tips',          icon: Lightbulb, color: '#f59e0b' },
  { text: 'Career path advice',      icon: Briefcase, color: '#10b981' },
  { text: 'How to improve my CV?',   icon: Sparkles,  color: '#0ea5e9' },
]

export function CareerChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to your AI Career Coach! I can help you analyze skill gaps, suggest learning paths, prepare for interviews, and guide your career growth. What would you like to work on today?"
    }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initError, setInitError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  const initSession = async () => {
    setInitError(false)
    try {
      const s = await apiClient.createChatSession()
      setSessionId(s.session_id)
    } catch {
      setInitError(true)
    }
  }

  useEffect(() => { initSession() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading || !sessionId) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    try {
      const res = await apiClient.sendChatMessage(sessionId, msg)
      setMessages(prev => [...prev, { role: 'assistant', content: res.message }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shadow-sm">
            <Bot size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">AI Career Coach</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-neutral-400 font-medium">
                {sessionId ? 'Session active' : initError ? 'Connection failed' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* New chat button */}
        <button
          onClick={() => {
            setMessages([{
              role: 'assistant',
              content: "Welcome to your AI Career Coach! I can help you analyze skill gaps, suggest learning paths, prepare for interviews, and guide your career growth. What would you like to work on today?"
            }])
            setSessionId(null)
            initSession()
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm"
        >
          <RefreshCw size={14} />
          New Chat
        </button>
      </div>

      {/* ── Chat container ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-2xl overflow-hidden shadow-sm min-h-0">

        {/* Init error banner */}
        {initError && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/30 flex items-center justify-between">
            <span className="text-sm text-red-600 dark:text-red-400">Failed to connect to AI service.</span>
            <button onClick={initSession} className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline">Retry</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                }`}>
                  {msg.role === 'user'
                    ? <User size={14} />
                    : <Bot size={14} className="text-blue-600 dark:text-blue-400" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 text-gray-800 dark:text-neutral-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 px-5 py-3.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-gray-100 dark:border-[#1e1e24] bg-white dark:bg-[#0f0f11] px-4 py-4">

          {/* Suggestion chips — only on first message */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-xs font-medium text-gray-600 dark:text-neutral-300 transition-all hover:shadow-sm"
                >
                  <s.icon size={12} style={{ color: s.color }} />
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 flex items-center bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <MessageSquare size={15} className="text-gray-400 dark:text-neutral-500 shrink-0 mr-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={sessionId ? 'Ask your AI coach anything...' : 'Connecting...'}
                disabled={!sessionId || loading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || !sessionId}
              className="w-11 h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-neutral-500 text-center mt-2">
            AI responses are for guidance only. Always verify career advice with professionals.
          </p>
        </div>
      </div>
    </div>
  )
}
