'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

import { ThemeToggle } from '@/components/theme-toggle'

interface AnalysisHeaderProps {
  filename: string
  jobTitle: string
  id: string
  exporting: boolean
  onExport: (fmt: 'pdf' | 'csv') => void
}

export function AnalysisHeader({ filename, jobTitle, id, exporting, onExport }: AnalysisHeaderProps) {
  const router = useRouter()
  const [currentTime] = useState(new Date().toLocaleString('ar-EG'))
  
  return (
    <header className="theme-card backdrop-blur-2xl border-b theme-border px-8 py-4 sticky top-0 z-30 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border theme-border"
            title="Back to Dashboard"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-black bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                تحليل الذكاء الاصطناعي
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-tighter">
                ID: {id?.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-white/40">
              <span className="truncate max-w-[150px]">{filename}</span>
              <span className="opacity-20">•</span>
              <span className="truncate max-w-[200px]">{jobTitle}</span>
              <span className="opacity-20">•</span>
              <span className="text-sky-500/60">{currentTime}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <button 
            onClick={() => onExport('pdf')} 
            disabled={exporting}
            className="px-4 py-2 bg-sky-600/10 hover:bg-sky-600/20 border border-sky-600/30 rounded-xl text-xs font-bold text-sky-400 transition-all disabled:opacity-40"
          >
            {exporting ? 'جاري التصدير...' : '📄 تقرير PDF'}
          </button>
          <button 
            onClick={() => onExport('csv')} 
            disabled={exporting}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          >
            {exporting ? '...' : '📊 بيانات CSV'}
          </button>
        </div>
      </div>
    </header>
  )
}
