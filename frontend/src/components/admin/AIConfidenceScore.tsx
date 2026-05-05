'use client'

import { motion } from 'framer-motion'

interface ConfidenceBreakdown {
  factor: string
  score: number // 0-1
  impact: 'positive' | 'negative'
  description: string
}

interface AIConfidenceScoreProps {
  overallConfidence: number // 0-1
  breakdown: ConfidenceBreakdown[]
  ocrQuality: number // 0-1
  dataCompleteness: number // 0-1
  modelCertainty: number // 0-1
}

export function AIConfidenceScore({
  overallConfidence,
  breakdown,
  ocrQuality,
  dataCompleteness,
  modelCertainty
}: AIConfidenceScoreProps) {
  const confidencePercentage = Math.round(overallConfidence * 100)

  const getConfidenceLevel = () => {
    if (confidencePercentage >= 90) return { 
      label: 'Very High', 
      color: 'from-green-500 to-emerald-500', 
      textColor: 'text-green-400',
      icon: '🎯',
      description: 'Excellent data quality and high model certainty'
    }
    if (confidencePercentage >= 75) return { 
      label: 'High', 
      color: 'from-blue-500 to-cyan-500', 
      textColor: 'text-blue-400',
      icon: '✅',
      description: 'Good data quality with reliable predictions'
    }
    if (confidencePercentage >= 60) return { 
      label: 'Medium', 
      color: 'from-yellow-500 to-orange-500', 
      textColor: 'text-yellow-400',
      icon: '⚠️',
      description: 'Acceptable quality but may need human review'
    }
    return { 
      label: 'Low', 
      color: 'from-red-500 to-pink-500', 
      textColor: 'text-red-400',
      icon: '❌',
      description: 'Poor data quality or high uncertainty - human review required'
    }
  }

  const confidenceLevel = getConfidenceLevel()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🤖 AI Confidence Score</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            How confident is the AI in this analysis?
          </p>
        </div>
      </div>

      {/* Main Confidence Display */}
      <div className="mb-6">
        <div className="relative">
          {/* Background Bar */}
          <div className="h-24 bg-white/5 rounded-2xl overflow-hidden">
            {/* Confidence Fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercentage}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${confidenceLevel.color} relative`}
            >
              {/* Animated Shimmer */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          </div>

          {/* Score Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="text-5xl font-bold text-white drop-shadow-lg"
              >
                {confidencePercentage}%
              </motion.div>
              <div className="text-sm text-white/80 font-medium mt-1">
                {confidenceLevel.icon} {confidenceLevel.label} Confidence
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm theme-text-tertiary text-center mt-3">
          {confidenceLevel.description}
        </p>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">📄</div>
          <div className="text-2xl font-bold theme-text mb-1">
            {Math.round(ocrQuality * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary">OCR Quality</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ocrQuality * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full bg-blue-500"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="text-2xl font-bold theme-text mb-1">
            {Math.round(dataCompleteness * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary">Data Completeness</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dataCompleteness * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full bg-green-500"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 rounded-xl p-4 text-center"
        >
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-2xl font-bold theme-text mb-1">
            {Math.round(modelCertainty * 100)}%
          </div>
          <div className="text-xs theme-text-tertiary">Model Certainty</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${modelCertainty * 100}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full bg-purple-500"
            />
          </div>
        </motion.div>
      </div>

      {/* Confidence Breakdown */}
      <div className="space-y-3">
        <div className="text-sm font-semibold theme-text mb-3">📋 Confidence Factors</div>
        {breakdown.map((factor, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-lg ${factor.impact === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                  {factor.impact === 'positive' ? '✓' : '✗'}
                </span>
                <span className="text-sm font-medium theme-text">{factor.factor}</span>
              </div>
              <span className="text-sm font-semibold theme-text">
                {Math.round(factor.score * 100)}%
              </span>
            </div>
            <p className="text-xs theme-text-tertiary ml-7">{factor.description}</p>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden ml-7">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${factor.score * 100}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 + 0.2 }}
                className={`h-full ${factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recommendation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className={`mt-6 p-4 rounded-xl ${
          confidencePercentage >= 75
            ? 'bg-green-500/10 border border-green-500/20'
            : confidencePercentage >= 60
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{confidenceLevel.icon}</span>
          <div className="text-sm theme-text-secondary">
            <span className={`font-semibold ${confidenceLevel.textColor}`}>Recommendation:</span>{' '}
            {confidencePercentage >= 75 ? (
              'This analysis is highly reliable. You can proceed with confidence.'
            ) : confidencePercentage >= 60 ? (
              'This analysis is generally reliable, but consider human review for critical decisions.'
            ) : (
              'This analysis has low confidence. Human review is strongly recommended before making decisions.'
            )}
          </div>
        </div>
      </motion.div>

      {/* Transparency Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
      >
        <div className="flex items-start gap-2 text-xs theme-text-tertiary">
          <span className="text-blue-400">ℹ️</span>
          <span>
            Confidence scores are calculated based on OCR quality, data completeness, and model 
            uncertainty. Lower scores indicate areas where human verification is recommended.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
