'use client'

import { motion } from 'framer-motion'

export function FloatingCVPreview() {
  return (
    <motion.div
      className="relative"
      animate={{ y: [0, -20, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-400" />
            <div className="flex-1">
              <div className="h-4 bg-white/20 rounded w-32 mb-2" />
              <div className="h-3 bg-white/10 rounded w-48" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/20 rounded w-full" />
            <div className="h-3 bg-white/20 rounded w-5/6" />
            <div className="h-3 bg-white/20 rounded w-4/6" />
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            {['React', 'TypeScript', 'Node.js', 'Python', 'AI/ML'].map((skill, index) => (
              <motion.div
                key={index}
                className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/30 text-xs text-sky-300"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 1.5 + index * 0.1 }}
              >
                {skill}
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Animated Scanning Effect */}
        <motion.div
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent z-20"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Score Badge */}
        <motion.div
          className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center border-4 border-black/50 shadow-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, type: 'spring' }}
        >
          <span className="text-white font-bold text-lg">95%</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
