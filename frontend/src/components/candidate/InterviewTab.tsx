'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Section, Empty } from '@/components/shared/UIHelpers'

interface InterviewTabProps {
  guide: any
}

export function InterviewTab({ guide }: InterviewTabProps) {
  const router = useRouter()

  if (!guide || (!guide.technical_questions && !guide.behavioral_questions)) {
    return <Empty>لا يوجد دليل مقابلة متاح حالياً لهذا التحليل</Empty>
  }

  const startSimulation = () => {
    toast.loading('Preparing your AI Interview Simulation...')
    router.push('/coaching/interview')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">🎤</div>
          <div>
            <h3 className="text-xl font-black theme-text">دليل المقابلة الذكي</h3>
            <p className="theme-text-tertiary text-sm">أسئلة مخصصة بناءً على نقاط القوة والضعف في ملفك</p>
          </div>
        </div>
      </div>

      {guide.technical_questions?.length > 0 && (
        <Section title="💼 الأسئلة التخصصية المتوقعة" color="blue">
          <div className="space-y-4">
            {guide.technical_questions.map((q: any, i: number) => (
              <div key={i} className="bg-white/5 border theme-border rounded-xl p-4">
                <div className="font-bold theme-text mb-2 flex gap-2">
                  <span className="text-blue-500">{i + 1}.</span>
                  {q.question}
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-xs text-emerald-400">
                  <span className="font-bold block mb-1 uppercase tracking-tighter">نصيحة للإجابة:</span>
                  {q.rationale || q.expected_answer_points?.join(', ')}
                </div>
                {q.impact_rationale && (
                  <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-purple-400 text-xs">🤖 لماذا هذا السؤال؟ (SHAP Analysis)</span>
                    </div>
                    <p className="text-[11px] text-purple-300 leading-relaxed italic">
                      {q.impact_rationale}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {guide.behavioral_questions?.length > 0 && (
        <Section title="🤝 الأسئلة السلوكية" color="purple">
          <div className="space-y-4">
            {guide.behavioral_questions.map((q: any, i: number) => (
              <div key={i} className="bg-white/5 border theme-border rounded-xl p-4">
                <div className="font-bold theme-text mb-2 flex gap-2">
                  <span className="text-purple-500">{i + 1}.</span>
                  {q.question}
                </div>
                <div className="text-xs theme-text-tertiary">
                  <span className="font-bold text-purple-400/60 block mb-1">الهدف من السؤال:</span>
                  {q.competency_targeted || 'قياس المهارات الناعمة والتوافق الثقافي'}
                </div>
                {q.impact_rationale && (
                  <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-[10px] theme-text-tertiary italic">
                      <span className="text-purple-400/80 font-bold mr-1">AI Context:</span>
                      {q.impact_rationale}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="bg-sky-600/10 border border-sky-600/20 rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm theme-text-secondary">هل تريد التدرب على هذه الأسئلة الآن؟</div>
        <button 
          onClick={startSimulation}
          className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition-all"
        >
          ابدأ محاكاة المقابلة 🤖
        </button>
      </div>
    </motion.div>
  )
}
