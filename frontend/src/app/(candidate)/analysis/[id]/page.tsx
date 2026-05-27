'use client'

import dynamic from 'next/dynamic'

const EnhancedAnalysisView = dynamic(
  () => import('@/components/shared/enhanced-analysis-view').then(m => ({ default: m.EnhancedAnalysisView })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-700">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
)

export default function AnalysisDetailPage() {
  return <EnhancedAnalysisView />
}
