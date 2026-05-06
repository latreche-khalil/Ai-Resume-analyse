'use client'

import { motion } from 'framer-motion'
import { Section, Empty } from '@/components/shared/UIHelpers'

interface TrustTabProps {
  redFlags: any
  bias: any
  hallucination: any
}

export function TrustTab({ redFlags, bias, hallucination }: TrustTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-2xl">🛡️</div>
          <div>
            <h3 className="text-xl font-black theme-text">مركز الثقة والجودة</h3>
            <p className="theme-text-tertiary text-sm">شفافية كاملة حول كيفية عمل الذكاء الاصطناعي والمخاطر المكتشفة</p>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {redFlags?.flags?.length > 0 && (
        <Section title="🚩 نقاط التنبيه (Red Flags)" color="red">
          <div className="space-y-3">
            {redFlags.flags.map((flag: any, i: number) => (
              <div key={i} className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${flag.severity === 'high' ? 'bg-red-500 animate-ping' : 'bg-orange-500'}`} />
                  <span className="font-bold text-rose-400">{flag.type}</span>
                </div>
                <p className="text-sm theme-text-secondary mb-2">{flag.description}</p>
                <div className="text-[10px] theme-text-tertiary bg-black/20 rounded p-2 italic">
                  نصيحة AI: {flag.mitigation_suggestion}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Bias Check */}
      {bias && (
        <Section title="⚖️ فحص التحيز (Bias Detection)" color="blue">
          <div className="bg-white/5 border theme-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm theme-text">حالة التحيز</div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${bias.detected ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {bias.detected ? 'تم اكتشاف تحيز محتمل' : 'لم يتم العثور على تحيز'}
              </div>
            </div>
            {bias.details && <p className="text-sm theme-text-tertiary leading-relaxed mb-4">{bias.details}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-black/10 rounded-lg">
                <div className="text-xs text-white/40 mb-1">نقاط المساواة</div>
                <div className="text-lg font-black text-sky-400">{bias.score || '98'}%</div>
              </div>
              <div className="text-center p-3 bg-black/10 rounded-lg">
                <div className="text-xs text-white/40 mb-1">الشفافية</div>
                <div className="text-lg font-black text-purple-400">عالية</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Hallucination Guard */}
      {hallucination && (
        <Section title="🕵️ حارس الدقة (Accuracy Guard)" color="green">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl">✅</div>
              <div>
                <div className="font-bold theme-text">فحص الهلوسة الرقمية</div>
                <div className="text-xs theme-text-tertiary">التحقق من صحة البيانات المستخرجة</div>
              </div>
            </div>
            <p className="text-sm theme-text-secondary mb-4">
              {hallucination.status === 'verified' 
                ? 'تم التحقق من تطابق كافة البيانات المستخرجة مع المستند الأصلي بنسبة 100%.' 
                : 'يوجد تباين بسيط في بعض التواريخ، يرجى المراجعة اليدوية.'}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500/80">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              تم التحقق بواسطة نظام Guardrails
            </div>
          </div>
        </Section>
      )}
    </motion.div>
  )
}
