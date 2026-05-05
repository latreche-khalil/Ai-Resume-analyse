'use client'

import { motion } from 'framer-motion'
import { ReactNode, useState } from 'react'

interface CardHoverEffectProps {
  children: ReactNode
  className?: string
}

export function CardHoverEffect({ children, className = '' }: CardHoverEffectProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Spotlight effect */}
      {isHovering && (
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`,
          }}
          animate={{ opacity: 1 }}
        />
      )}
      
      {/* Border glow */}
      {isHovering && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition duration-300"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.4), transparent 40%)`,
          }}
          animate={{ opacity: 1 }}
        />
      )}
      
      {children}
    </motion.div>
  )
}
