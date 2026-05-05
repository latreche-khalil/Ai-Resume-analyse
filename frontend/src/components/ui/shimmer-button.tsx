'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ShimmerButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function ShimmerButton({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}: ShimmerButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-lg'
      } ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {/* Shimmer effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          animate={{
            translateX: ['100%', '-100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
          }}
        />
      )}
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
