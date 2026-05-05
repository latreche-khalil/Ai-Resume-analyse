'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface InterviewQuestion {
  category: 'technical' | 'behavioral' | 'gap_focused' | 'red_flag' | 'strength'
  question: string
  purpose: string
  ideal_answer_hints: string[]
  follow_up_questions: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

interface InterviewGuideProps {
  questions: InterviewQuestion[]
  candidateName: string
  onExport?: () => void
}

export function InterviewGuide({ questions, candidateName, onExport }: InterviewGuideProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([])

  const categories = [
    { id: 'all', label: 'All Questions', icon: '📋', count: questions.length },
    { id: 'technical', label: 'Domain-Specific', icon: '💼', count: questions.filter(q => q.category === 'technical').length },
    { id: 'behavioral', label: 'Behavioral', icon: '🧠', count: questions.filter(q => q.category === 'behavioral').length },
    { id: 'gap_focused', label: 'Gap-Focused', icon: '⚠️', count: questions.filter(q => q.category === 'gap_focused').length },
    { id: 'red_flag', label: 'Red Flags', icon: '🚩', count: questions.filter(q => q.category === 'red_flag').length },
    { id: 'strength', label: 'Strengths', icon: '💪', count: questions.filter(q => q.category === 'strength').length }
  ]

  const filteredQuestions = selectedCategory === 'all' 
    ? questions 
    : questions.filter(q => q.category === selectedCategory)

  const toggleQuestion = (index: number) => {
    if (expandedQuestions.includes(index)) {
      setExpandedQuestions(expandedQuestions.filter(i => i !== index))
    } else {
      setExpandedQuestions([...expandedQuestions, index])
    }
  }

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'hard':
        return { color: 'bg-red-500/20 text-red-400', label: 'Hard' }
      case 'medium':
        return { color: 'bg-yellow-500/20 text-yellow-400', label: 'Medium' }
      case 'easy':
        return { color: 'bg-green-500/20 text-green-400', label: 'Easy' }
      default:
        return { color: 'bg-gray-500/20 text-gray-400', label: 'Unknown' }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🎤 Auto-Generated Interview Guide</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Personalized questions for {candidateName}
          </p>
        </div>

        <button
          onClick={onExport}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>📄</span>
          <span>Export Guide</span>
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <motion.button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 theme-text-secondary hover:bg-white/10'
            }`}
          >
            <span className="mr-2">{cat.icon}</span>
            <span>{cat.label}</span>
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {cat.count}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 theme-text-tertiary">
            <span className="text-4xl mb-4 block">📭</span>
            <p>No questions in this category</p>
          </div>
        ) : (
          filteredQuestions.map((question, idx) => {
            const isExpanded = expandedQuestions.includes(idx)
            const difficultyConfig = getDifficultyConfig(question.difficulty)

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="theme-card border theme-border rounded-xl overflow-hidden"
              >
                {/* Question Header */}
                <button
                  onClick={() => toggleQuestion(idx)}
                  className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">
                      {question.category === 'technical' && '💼'}
                      {question.category === 'behavioral' && '🧠'}
                      {question.category === 'gap_focused' && '⚠️'}
                      {question.category === 'red_flag' && '🚩'}
                      {question.category === 'strength' && '💪'}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold theme-text">Q{idx + 1}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyConfig.color}`}>
                          {difficultyConfig.label}
                        </span>
                      </div>

                      <p className="text-sm theme-text font-medium mb-2">{question.question}</p>

                      <div className="text-xs theme-text-tertiary">
                        <span className="font-semibold">Purpose:</span> {question.purpose}
                      </div>
                    </div>

                    <span className="text-xl theme-text-tertiary">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t theme-border p-4 bg-white/5"
                  >
                    {/* Ideal Answer Hints */}
                    <div className="mb-4">
                      <div className="text-sm font-semibold theme-text mb-2">💡 What to Listen For:</div>
                      <ul className="space-y-1">
                        {question.ideal_answer_hints.map((hint, hintIdx) => (
                          <li key={hintIdx} className="text-sm theme-text-secondary flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span>
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Follow-up Questions */}
                    {question.follow_up_questions.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold theme-text mb-2">🔄 Follow-up Questions:</div>
                        <ul className="space-y-2">
                          {question.follow_up_questions.map((followUp, followUpIdx) => (
                            <li key={followUpIdx} className="text-sm theme-text-secondary flex items-start gap-2">
                              <span className="text-blue-400 mt-0.5">→</span>
                              <span>{followUp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold theme-text">Interview Tips:</span> These questions are 
            automatically generated based on the candidate's profile, skill gaps, and red flags. 
            Use them as a starting point and adapt based on the conversation flow.
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
