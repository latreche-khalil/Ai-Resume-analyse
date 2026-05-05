import { motion } from 'framer-motion'

export function PrivacyIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-green-400"
      >
        🔒
      </motion.div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-green-400">Privacy Protected</p>
        <p className="text-xs theme-text-tertiary">
          Your personal data is masked before AI processing
        </p>
      </div>
    </motion.div>
  )
}
