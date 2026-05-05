'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

export function FAQSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const faqs = [
    {
      question: 'How is this different from ChatGPT?',
      answer: 'Unlike general-purpose AI, ResumeAI is specifically trained on recruitment data and uses Explainable AI (XAI) to provide transparent, actionable insights. We focus on semantic understanding, not just keyword matching.'
    },
    {
      question: 'Is my data safe and private?',
      answer: 'Absolutely. We use enterprise-grade encryption and automatic PII (Personally Identifiable Information) masking. Your data is processed securely and never shared with third parties. We are GDPR compliant.'
    },
    {
      question: 'Can it handle scanned PDFs?',
      answer: 'Yes! Our advanced OCR technology can extract text from scanned documents and images with high accuracy, supporting multiple languages (Arabic, English, French).'
    },
    {
      question: 'How accurate is the matching algorithm?',
      answer: 'Our hybrid AI system achieves 95% accuracy by combining local NLP processing with AI enhancement. We use semantic analysis and cosine similarity to understand context, not just keywords.'
    }
  ]

  return (
    <section ref={ref} id="faq" className="relative py-32 px-6 theme-glow-bg">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Frequently Asked <span className="text-blue-400">Questions</span>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQItem({ faq, index, isInView }: any) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      className="relative rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-lg">{faq.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl"
        >
          ↓
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6 pt-0 theme-text-tertiary border-t border-white/5 mt-2">
              <p className="leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
