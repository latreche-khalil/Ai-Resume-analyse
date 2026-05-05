import { motion } from 'framer-motion'

interface GlobalPulseCardProps {
  label: string
  value: string | number
  icon: string
  color: string
  border: string
  sub: string
  small?: boolean
  index: number
}

export function GlobalPulseCard({ 
  label, 
  value, 
  icon, 
  color, 
  border, 
  sub, 
  small = false,
  index 
}: GlobalPulseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-6 bg-gradient-to-br ${color} rounded-xl border ${border} shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
      <p className={`font-bold text-gray-900 dark:text-white mb-1 ${small ? 'text-lg' : 'text-3xl'}`}>
        {value}
      </p>
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
    </motion.div>
  )
}
