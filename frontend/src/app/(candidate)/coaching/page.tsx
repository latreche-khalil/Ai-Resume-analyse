'use client'

import dynamic from 'next/dynamic'

const CareerChatView = dynamic(
  () => import('@/components/candidate/CareerChatView').then(m => ({ default: m.CareerChatView })),
  {
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
)

export default function CoachingPage() {
  return <CareerChatView />
}
