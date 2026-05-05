'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface VerifiedClaim {
  claim: string
  source: string
  confidence: number // 0-1
  verified: boolean
  evidence_location: string
}

interface HallucinationGuardProps {
  verifiedClaims: VerifiedClaim[]
  verificationRate: number // 0-1
  unverifiedCount: number
  overallTrust: 'high' | 'medium' | 'low'
}

export function HallucinationGuard({
  verifiedClaims,
  verificationRate,
  unverifiedCount,
  overallTrust
}: HallucinationGuardProps) {
  const [expandedClaims, setExpandedClaims] = useState<number[]>([])

  const toggleClaim = (index: number) => {
    if (expandedClaims.includes(index)) {
      setExpandedClaims(expandedClaims.filter(i => i !== index))
    } else {
      setExpandedClaims([...expandedClaims, index])
    }
  }

  const getTrustConfig = () => {
    switch (overallTrust) {
      case 'high':
        return { 
          color: 'from-green-500 to-emerald-500', 
          textColor: 'text-green-400', 
          icon: '🛡️', 
          label: 'High Trust',
          description: 'All claims verified with strong evidence'
        }
      case 'medium':
        return { 
          color: 'from-yellow-500 to-orange-500', 
          textColor: 'text-yellow-400', 
          icon: '⚠️', 
          label: 'Medium Trust',
          description: 'Most claims verified, some need review'
        }
      case 'low':
        return { 
          color: 'from-red-500 to-pink-500', 
          textColor: 'text-red-400', 
          icon: '❌', 
          label: 'Low Trust',
          description: 'Multiple unverified claims detected'
        }
    }
  }

  const trustConfig = getTrustConfig()
  const verificationPercentage = Math.round(verificationRate * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card border theme-border rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold theme-text">🛡️ Hallucination Guard</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Every claim linked to source evidence
          </p>
        </div>

        <div className={`px-4 py-2 bg-gradient-to-r ${trustConfig.color} rounded-xl`}>
          <div className="text-xs text-white/80">Trust Level</div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <span>{trustConfig.icon}</span>
            <span>{trustConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Verification Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-green-400">
            {verifiedClaims.filter(c => c.verified).length}
          </div>
          <div className="text-xs theme-text-tertiary mt-1">Verified Claims</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl mb-2">❌</div>
          <div className="text-2xl font-bold text-red-400">{unverifiedCount}</div>
          <div className="text-xs theme-text-tertiary mt-1">Unverified</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center"
        >
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-blue-400">{verificationPercentage}%</div>
          <div className="text-xs theme-text-tertiary mt-1">Verification Rate</div>
        </motion.div>
      </div>

      {/* Verification Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold theme-text">🎯 Verification Progress</span>
          <span className="text-sm theme-text-tertiary">{verificationPercentage}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${verificationPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${trustConfig.color}`}
          />
        </div>
      </div>

      {/* Verified Claims List */}
      <div className="space-y-3">
        <div className="text-sm font-semibold theme-text mb-3">📋 Verified Claims</div>
        {verifiedClaims.length === 0 ? (
          <div className="text-center py-8 theme-text-tertiary">
            <span className="text-4xl mb-4 block">📭</span>
            <p>No claims to verify</p>
          </div>
        ) : (
          verifiedClaims.map((claim, idx) => {
            const isExpanded = expandedClaims.includes(idx)

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`border rounded-xl overflow-hidden ${
                  claim.verified
                    ? 'bg-green-500/5 border-green-500/30'
                    : 'bg-red-500/5 border-red-500/30'
                }`}
              >
                {/* Claim Header */}
                <button
                  onClick={() => toggleClaim(idx)}
                  className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-1">
                      {claim.verified ? '✅' : '❌'}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          claim.verified
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {claim.verified ? 'Verified' : 'Unverified'}
                        </span>
                        <span className="text-xs theme-text-tertiary">
                          {Math.round(claim.confidence * 100)}% confidence
                        </span>
                      </div>

                      <p className="text-sm theme-text">{claim.claim}</p>
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
                    {/* Source */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold theme-text-tertiary mb-1">
                        📄 Source Document:
                      </div>
                      <div className="text-sm theme-text-secondary">{claim.source}</div>
                    </div>

                    {/* Evidence Location */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold theme-text-tertiary mb-1">
                        📍 Evidence Location:
                      </div>
                      <div className="text-sm theme-text-secondary bg-black/20 rounded p-2 font-mono">
                        {claim.evidence_location}
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div>
                      <div className="text-xs font-semibold theme-text-tertiary mb-1">
                        🎯 Confidence Level:
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${claim.confidence * 100}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full ${
                              claim.verified ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-sm font-semibold theme-text">
                          {Math.round(claim.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="text-sm theme-text-secondary">
            <span className="font-semibold theme-text">How Hallucination Guard Works:</span> Every 
            statement in the analysis is automatically linked to its source in the CV. This prevents 
            the AI from making up information and ensures all claims are evidence-based.
          </div>
        </div>
      </motion.div>

      {/* Warning for Unverified */}
      {unverifiedCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-4 bg-red-500/10 border-red-500/30 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="text-sm theme-text-secondary">
              <span className="font-semibold text-red-400">Unverified Claims Detected:</span> {unverifiedCount} 
              {' '}claim{unverifiedCount > 1 ? 's' : ''} could not be verified against the source document. 
              These should be manually reviewed before making decisions.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
