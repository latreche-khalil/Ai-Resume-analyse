'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedGradientBgProps {
  children: ReactNode
  className?: string
}

export function AnimatedGradientBg({ children, className = '' }: AnimatedGradientBgProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
