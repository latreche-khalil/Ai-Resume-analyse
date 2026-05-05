'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export function CareerChatView() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'مرحباً بك! أنا مستشارك المهني الذكي. كيف يمكنني مساعدتك اليوم في رحلتك المهنية؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initChat = async () => {
      try {
        const session = await apiClient.createChatSession()
        setSessionId(session.session_id)
      } catch (err) {
        console.error('Failed to init chat', err)
      }
    }
    initChat()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading || !sessionId) return

    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await apiClient.sendChatMessage(sessionId, userMsg.content)
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen theme-bg theme-text flex flex-col items-center p-4 lg:p-8">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/20 flex items-center justify-center border border-sky-600/30">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-black theme-text tracking-tight">المستشار المهني الذكي</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-white/40 font-bold uppercase tracking-widest">متصل الآن</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-4xl flex-1 theme-card rounded-3xl border theme-border overflow-hidden flex flex-col shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] lg:max-w-[70%] px-5 py-3 rounded-2xl text-sm font-medium shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-sky-600 text-white rounded-tr-none' 
                    : 'bg-white/10 theme-text border theme-border rounded-tl-none backdrop-blur-md'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border theme-border px-5 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-white/5 border-t theme-border backdrop-blur-xl">
          <div className="flex gap-3 bg-black/20 rounded-2xl border theme-border p-2 focus-within:border-sky-500/50 transition-all shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اسأل مستشارك المهني عن أي شيء..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-2 theme-text placeholder:text-white/20 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-all disabled:opacity-40 shadow-lg shadow-sky-600/20"
            >
              <span className="text-xl">↵</span>
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-4xl mt-6 flex flex-wrap gap-3">
        {['كيف أحسن مهاراتي؟', 'نصائح للمقابلة', 'تحليل نقاط القوة', 'أفضل المسارات المهنية'].map((tip) => (
          <button
            key={tip}
            onClick={() => setInput(tip)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border theme-border text-xs font-bold theme-text-tertiary transition-all"
          >
            {tip}
          </button>
        ))}
      </div>
    </div>
  )
}
