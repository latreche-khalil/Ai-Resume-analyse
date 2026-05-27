'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'How is this different from ChatGPT?',
    answer: 'While ChatGPT is a general-purpose AI, our platform is specifically built for CV analysis with specialized features: (1) Explainable AI that shows exactly why decisions were made, (2) Privacy-first PII masking to protect your sensitive data, (3) Semantic skill matching with 95% accuracy, (4) Structured analysis with gap reports and improvement recommendations, (5) Interview preparation tailored to your CV, and (6) Integration with job descriptions for precise matching. ChatGPT gives generic advice; we provide data-driven, actionable insights backed by specialized NLP models trained on recruitment data.'
  },
  {
    question: 'How does Explainable AI work?',
    answer: 'Our XAI system provides detailed explanations for every decision. When your CV is analyzed, you see exactly which skills matched, why they matched, and what evidence from your CV supported each conclusion. No black boxes.'
  },
  {
    question: 'Is my personal data safe?',
    answer: 'Absolutely. We use PII (Personally Identifiable Information) masking during AI processing. Your sensitive data is tokenized and only you can unmask it. We never share your data with third parties.'
  },
  {
    question: 'How accurate is the matching algorithm?',
    answer: 'Our semantic matching algorithm achieves 95% accuracy by understanding context and meaning, not just keywords. It analyzes your experience holistically and matches it against job requirements using advanced NLP.'
  },
  {
    question: 'Can I use this for multiple job applications?',
    answer: 'Yes! Analyze your CV against unlimited job descriptions. Each analysis provides specific insights for that particular role, helping you tailor your application effectively.'
  },
  {
    question: 'What makes this different from other CV tools?',
    answer: 'Unlike traditional tools that just give you a score, we explain every decision. You understand why you matched or did not match, what skills to develop, and how to improve. Plus, our privacy-first approach ensures your data stays yours.'
  },
  {
    question: 'Do you offer interview preparation?',
    answer: 'Yes! Our AI-powered mock interview feature provides real-time feedback, helps you practice common questions, and gives you personalized coaching to improve your interview performance.'
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} id="faq" className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gray-900 dark:text-white">Frequently asked</span>
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              questions
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to know about ResumeAI
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index

            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.1 * index }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left p-6 rounded-xl bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-slate-500/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8">
                      {faq.question}
                    </h3>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Contact CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-gray-600 dark:text-gray-400">
            Still have questions?{' '}
            <a href="mailto:support@resumeai.com" className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 transition-colors font-medium">
              Contact our team
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
