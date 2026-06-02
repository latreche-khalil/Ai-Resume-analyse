'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import {
  Bot, Send, Sparkles, Lightbulb, Briefcase,
  Target, User, RefreshCw, MessageSquare
} from 'lucide-react'

// Helper function to format AI messages with markdown-like styling
function formatAIMessage(text: string) {
  // Split by double newlines for paragraphs
  const sections = text.split('\n\n')
  
  return sections.map((section, idx) => {
    const lines = section.split('\n')
    
    // Check if it's a numbered list (multiple lines starting with numbers)
    const isNumberedList = lines.length > 1 && lines.every(line => /^\d+\./.test(line.trim()))
    if (isNumberedList) {
      return (
        <div key={idx} className="mb-5 space-y-3">
          {lines.map((line, i) => {
            const match = line.match(/^(\d+)\.\s\*\*(.+?)\*\*:\s(.+)$/)
            if (match) {
              return (
                <div key={i} className="flex gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">{match[1]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[15px] text-slate-900 dark:text-white mb-1">
                      {match[2]}
                    </div>
                    <div className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {match[3]}
                    </div>
                  </div>
                </div>
              )
            }
            // Fallback for numbered items without bold
            const simpleMatch = line.match(/^(\d+)\.\s(.+)$/)
            if (simpleMatch) {
              return (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-bold text-white">{simpleMatch[1]}</span>
                  </div>
                  <div className="flex-1 text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                    {simpleMatch[2]}
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>
      )
    }
    
    // Check if it's a bullet list
    const isBulletList = lines.length > 1 && lines.every(line => /^[-•]/.test(line.trim()))
    if (isBulletList) {
      return (
        <div key={idx} className="mb-4 space-y-2 pl-1">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0 mt-2" />
              <span className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {line.substring(line.indexOf(' ') + 1)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    
    // Single line - process inline formatting
    const processInlineFormatting = (text: string) => {
      const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/)
      return parts.map((part, i) => {
        // Bold + Italic (***text***)
        if (part.startsWith('***') && part.endsWith('***')) {
          return (
            <strong key={i} className="font-semibold italic text-slate-900 dark:text-white">
              {part.slice(3, -3)}
            </strong>
          )
        }
        // Bold (**text**)
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          )
        }
        // Italic (*text*)
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <em key={i} className="italic text-slate-700 dark:text-slate-300">
              {part.slice(1, -1)}
            </em>
          )
        }
        return <span key={i}>{part}</span>
      })
    }
    
    return (
      <p key={idx} className="mb-4 text-[14px] text-slate-600 dark:text-slate-300 leading-[1.7] last:mb-0">
        {processInlineFormatting(section)}
      </p>
    )
  })
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatSessionItem {
  id: string
  title: string
  message_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const SUGGESTIONS = [
  { text: 'Analyze my skill gaps',   icon: Target,    color: '#6366f1' },
  { text: 'Interview tips',          icon: Lightbulb, color: '#f59e0b' },
  { text: 'Career path advice',      icon: Briefcase, color: '#10b981' },
  { text: 'How to improve my CV?',   icon: Sparkles,  color: '#0ea5e9' },
]

export function CareerChatView() {
  const { user, loading: authLoading } = useAuth()
  const [view, setView] = useState<'chat' | 'history' | 'session-detail'>('chat')
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSessionItem | null>(null)
  const [sessionMessages, setSessionMessages] = useState<Message[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
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
      console.log('Creating chat session...')
      const s = await apiClient.createChatSession()
      console.log('Chat session created:', s.session_id)
      setSessionId(s.session_id)
    } catch (err) {
      console.error('Failed to create chat session:', err)
      setInitError(true)
    }
  }

  useEffect(() => {
    // Only initialize session after user is authenticated
    if (!authLoading && user) {
      initSession()
    }
  }, [authLoading, user])

  const loadSessions = async () => {
    try {
      const data = await apiClient.getChatSessions({ limit: 20 })
      setSessions(data.items)
    } catch (err) {
      console.error('Failed to load chat sessions:', err)
    }
  }

  const loadSessionDetail = async (session: ChatSessionItem) => {
    try {
      const data = await apiClient.getChatHistory(session.id)
      // Cast messages to correct type
      const typedMessages: Message[] = data.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
      setSessionMessages(typedMessages)
      setSelectedSession(session)
      setView('session-detail')
    } catch (err) {
      console.error('Failed to load session messages:', err)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiClient.deleteChatSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      setDeleteConfirm(null)
      // Show success toast if you have toast library
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const showHistory = () => {
    loadSessions()
    setView('history')
  }

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

  // ═══════════════════════════════════════════════════════════════════════
  // HISTORY VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'history') {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Chat History</h1>
          <button
            onClick={() => setView('chat')}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Back to Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No chat history yet. Start a conversation!
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
                onClick={() => loadSessionDetail(session)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{session.message_count} messages</span>
                      <span>•</span>
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(session.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Delete Chat?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Are you sure you want to delete this chat session? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSession(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SESSION DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'session-detail' && selectedSession) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSession.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {selectedSession.message_count} messages • {new Date(selectedSession.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setView('history')}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            Back to History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-700">
          {sessionMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                  : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600'
              }`}>
                {msg.role === 'user'
                  ? <User size={16} strokeWidth={2.5} />
                  : <Bot size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                }
              </div>

              <div className={`max-w-[85%] rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-3 rounded-tr-sm shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-tl-sm shadow-sm px-5 py-4'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="space-y-1">
                    {formatAIMessage(msg.content)}
                  </div>
                ) : (
                  <p className="leading-relaxed text-[14px]">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN CHAT VIEW
  // ═══════════════════════════════════════════════════════════════════════
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

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* History button */}
          <button
            onClick={showHistory}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm"
          >
            <MessageSquare size={14} />
            History
          </button>

          {/* New chat button */}
          <button
            onClick={() => {
              setMessages([{
                role: 'assistant',
                content: "Welcome to your AI Career Coach! I can help you analyze skill gaps, suggest learning paths, prepare for interviews, and guide your career growth. What would you like to work on today?"
              }])
              setSessionId(null)
              setView('chat')
              initSession()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-[#151518] transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            New Chat
          </button>
        </div>
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
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 min-h-0 bg-slate-50/30 dark:bg-slate-900/20">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                    : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600'
                }`}>
                  {msg.role === 'user'
                    ? <User size={16} strokeWidth={2.5} />
                    : <Bot size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-3 rounded-tr-sm shadow-sm'
                    : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-tl-sm shadow-sm px-5 py-4'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="space-y-1">
                      {formatAIMessage(msg.content)}
                    </div>
                  ) : (
                    <p className="leading-relaxed text-[14px]">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={16} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
              </div>
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-5 py-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span 
                    key={i} 
                    className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" 
                    style={{ animationDelay: `${d}s` }} 
                  />
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
                  className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <s.icon size={14} style={{ color: s.color }} className="group-hover:scale-110 transition-transform" />
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2.5 items-end">
            <div className="flex-1 flex items-center bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm">
              <MessageSquare size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={sessionId ? 'Ask your AI coach anything...' : 'Connecting...'}
                disabled={!sessionId || loading}
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading || !sessionId}
              className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none shrink-0 active:scale-95"
            >
              <Send size={17} className="ml-0.5" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-3 font-medium">
            AI responses are for guidance only. Always verify career advice with professionals.
          </p>
        </div>
      </div>
    </div>
  )
}
