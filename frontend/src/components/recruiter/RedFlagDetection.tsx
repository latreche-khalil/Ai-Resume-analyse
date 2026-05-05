'use client'

import { motion } from 'framer-motion'

interface RedFlag {
  type: 'date_overlap' | 'skill_mismatch' | 'title_inconsistency' | 'gap_unexplained' | 'overqualified' | 'underqualified'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  evidence: string
  recommendation: string
}

interface RedFlagDetectionProps {
  redFlags: RedFlag[]
  overallRisk: 'low' | 'medium' | 'high'
}

export function RedFlagDetection({ redFlags, overallRisk }: RedFlagDetectionProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: 'bg-red-500/20 border-red-500/30 text-red-400', icon: '🚨', label: 'Critical' }
      case 'high':
        return { color: 'bg-orange-500/20 border-orange-500/30 text-orange-400', icon: '⚠️', label: 'High' }
      case 'medium':
        return { color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400', icon: '⚡', label: 'Medium' }
      case 'low':
        return { color: 'bg-blue-500/20 border-blue-500/30 text-blue-400', icon: 'ℹ️', label: 'Low' }
      default:
        return { color: 'bg-gray-500/20 border-gray-500/30 text-gray-400', icon: '❓', label: 'Unknown' }
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'date_overlap':
        return '📅 Date Overlap'
      case 'skill_mismatch':
        return '🔧 Skill Mismatch'
      case 'title_inconsistency':
        return '💼 Title Inconsistency'
      case 'gap_unexplained':
        return '⏳ Unexplained Gap'
      case 'overqualified':
        return '📈 Overqualified'
      case 'underqualified':
        return '📉 Underqualified'
      default:
        return '❓ Unknown'
    }
  }

  const getRiskConfig = () => {
    switch (overallRisk) {
      case 'high':
        return { color: 'from-red-500 to-orange-500', textColor: 'text-red-400', icon: '🚨', label: 'High Risk' }
      case 'medium':
        return { color: 'from-yellow-500 to-orange-500', textColor: 'text-yellow-400', icon: '⚠️', label: 'Medium Risk' }
      case 'low':
        return { color: 'from-green-500 to-emerald-500', textColor: 'text-green-400', icon: '✅', label: 'Low Risk' }
    }
  }

  const riskConfig = getRiskConfig()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🚩 Red Flag Detection</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            AI-powered inconsistency and risk analysis
          </p>
        </div>

        <div className={`px-4 py-2 bg-gradient-to-r ${riskConfig.color} rounded-xl`}>
          <div className="text-xs text-white/80">Overall Risk</div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <span>{riskConfig.icon}</span>
            <span>{riskConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {['critical', 'high', 'medium', 'low'].map((severity) => {
          const count = redFlags.filter(f => f.severity === severity).length
          const config = getSeverityConfig(severity)

          return (
            <motion.div
              key={severity}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`${config.color} border rounded-xl p-3 text-center`}
            >
              <div className="text-2xl mb-1">{config.icon}</div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs mt-1">{config.label}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Red Flags List */}
      {redFlags.length === 0 ? (
        <div className="text-center py-12 bg-green-500/10 border border-green-500/20 rounded-xl">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-lg font-semibold text-green-400 mb-2">No Red Flags Detected!</p>
          <p className="text-sm theme-text-tertiary">
            This candidate's profile appears consistent and reliable.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {redFlags.map((flag, idx) => {
            const severityConfig = getSeverityConfig(flag.severity)

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`${severityConfig.color} border rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{severityConfig.icon}</span>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold theme-text">{getTypeLabel(flag.type)}</span>
                        <span className={`text-xs px-2 py-0.5 ${severityConfig.color} rounded-full`}>
                          {severityConfig.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm theme-text-secondary mb-3">{flag.description}</p>

                    {/* Evidence */}
                    <div className="bg-black/20 rounded-lg p-3 mb-3">
                      <div className="text-xs font-semibold theme-text-tertiary mb-1">📋 Evidence:</div>
                      <div className="text-sm theme-text-secondary">{flag.evidence}</div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs font-semibold theme-text-tertiary mb-1">💡 Recommendation:</div>
                      <div className="text-sm theme-text-secondary">{flag.recommendation}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Action Required */}
      {redFlags.some(f => f.severity === 'critical' || f.severity === 'high') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="text-sm theme-text-secondary">
              <span className="font-semibold text-red-400">Action Required:</span> This candidate has 
              critical or high-severity red flags. We recommend conducting additional verification 
              during the interview process to clarify these inconsistencies.
            </div>
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
      >
        <div className="flex items-start gap-2 text-xs theme-text-tertiary">
          <span className="text-blue-400">ℹ️</span>
          <span>
            Red flags are automatically detected by AI and may require human verification. 
            Always conduct thorough interviews to confirm findings.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
