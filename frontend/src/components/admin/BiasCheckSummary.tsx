'use client'

import { motion } from 'framer-motion'

interface BiasCheck {
  category: string
  status: 'passed' | 'warning' | 'failed'
  description: string
  details: string
}

interface BiasCheckSummaryProps {
  checks: BiasCheck[]
  piiMasked: number
  fairnessScore: number // 0-1
  overallStatus: 'passed' | 'warning' | 'failed'
}

export function BiasCheckSummary({
  checks,
  piiMasked,
  fairnessScore,
  overallStatus
}: BiasCheckSummaryProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'passed':
        return { color: 'bg-green-500/20 border-green-500/30 text-green-400', icon: '✅', label: 'Passed' }
      case 'warning':
        return { color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400', icon: '⚠️', label: 'Warning' }
      case 'failed':
        return { color: 'bg-red-500/20 border-red-500/30 text-red-400', icon: '❌', label: 'Failed' }
      default:
        return { color: 'bg-gray-500/20 border-gray-500/30 text-gray-400', icon: '❓', label: 'Unknown' }
    }
  }

  const overallConfig = getStatusConfig(overallStatus)
  const fairnessPercentage = Math.round(fairnessScore * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">⚖️ Bias Check Summary</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Ensuring fair and unbiased evaluation
          </p>
        </div>

        <div className={`px-4 py-2 ${overallConfig.color} border rounded-xl`}>
          <div className="text-xs">Overall Status</div>
          <div className="text-lg font-bold flex items-center gap-2">
            <span>{overallConfig.icon}</span>
            <span>{overallConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Fairness Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold theme-text">🎯 Fairness Score</span>
          <span className="text-2xl font-bold text-green-400">{fairnessPercentage}%</span>
        </div>
        <div className="h-4 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fairnessPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
          />
        </div>
        <p className="text-xs theme-text-tertiary mt-2">
          Based on skill-only evaluation with complete PII masking
        </p>
      </div>

      {/* PII Masking Stats */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔒</span>
            <div>
              <div className="text-sm font-semibold theme-text">PII Protection Active</div>
              <div className="text-xs theme-text-tertiary mt-1">
                All personal identifiable information masked before AI processing
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-400">{piiMasked}</div>
            <div className="text-xs theme-text-tertiary">entities masked</div>
          </div>
        </div>
      </motion.div>

      {/* Bias Checks */}
      <div className="space-y-3 mb-6">
        <div className="text-sm font-semibold theme-text mb-3">📋 Bias Checks</div>
        {checks.map((check, idx) => {
          const statusConfig = getStatusConfig(check.status)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${statusConfig.color} border rounded-xl p-4`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{statusConfig.icon}</span>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold theme-text">{check.category}</span>
                    <span className={`text-xs px-2 py-0.5 ${statusConfig.color} rounded-full`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <p className="text-sm theme-text-secondary mb-2">{check.description}</p>

                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-xs theme-text-tertiary">{check.details}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Protected Attributes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
      >
        <div className="text-sm font-semibold text-green-400 mb-3">🛡️ Protected Attributes</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Name', status: 'Masked' },
            { name: 'Age/DOB', status: 'Masked' },
            { name: 'Gender', status: 'Not Used' },
            { name: 'Ethnicity', status: 'Not Used' },
            { name: 'Religion', status: 'Not Used' },
            { name: 'Nationality', status: 'Masked' },
            { name: 'Address', status: 'Masked' },
            { name: 'Photo', status: 'Not Used' }
          ].map((attr, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="theme-text-secondary">{attr.name}</span>
              <span className="text-green-400 font-semibold">✓ {attr.status}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Evaluation Criteria */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
      >
        <div className="text-sm font-semibold text-blue-400 mb-3">✅ Evaluation Based On</div>
        <div className="grid grid-cols-2 gap-2 text-xs theme-text-secondary">
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Skills & Competencies</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Work Experience</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Education & Certifications</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>Job Requirements Match</span>
          </div>
        </div>
      </motion.div>

      {/* Compliance Statement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">📜</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold text-green-400">GDPR & Equal Opportunity Compliant:</span>{' '}
            This analysis was conducted with complete PII masking and focuses solely on job-relevant 
            qualifications. No protected characteristics were used in the evaluation process.
          </div>
        </div>
      </motion.div>

      {/* Transparency Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
      >
        <div className="flex items-start gap-2 text-xs theme-text-tertiary">
          <span className="text-purple-400">ℹ️</span>
          <span>
            All bias checks are automatically performed before analysis. Any warnings or failures 
            are flagged for human review to ensure fair evaluation.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
