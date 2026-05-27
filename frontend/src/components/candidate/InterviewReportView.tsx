'use client'

import { motion } from 'framer-motion'

export function InterviewReportView({ report }: any) {
  if (!report) return null
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Overall Confidence', value: report.confidence_score, color: 'text-sky-400' },
          { label: 'Technical Depth', value: report.technical_score, color: 'text-emerald-400' },
          { label: 'Communication', value: report.communication_score, color: 'text-purple-400' }
        ].map((s, i) => (
          <div key={i} className="theme-card border theme-border p-6 rounded-2xl text-center">
            <p className="text-xs font-bold theme-text-tertiary uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}%</p>
          </div>
        ))}
      </div>
      <div className="theme-card border theme-border p-8 rounded-3xl">
        <h3 className="text-xl font-bold theme-text mb-6">Detailed Feedback</h3>
        <div className="space-y-6">
           {report.feedback?.map((f: any, i: number) => (
             <div key={i} className="flex gap-4 border-l-2 border-sky-500/30 pl-4 py-2">
                <div>
                  <p className="font-bold theme-text">{f.topic}</p>
                  <p className="text-sm theme-text-secondary mt-1">{f.content}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}
