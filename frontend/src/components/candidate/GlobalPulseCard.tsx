'use client'

import { motion } from 'framer-motion'

export function GlobalPulseCard({ label, value, icon, color, border, sub, small, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-5 rounded-2xl bg-gradient-to-br ${color} border ${border} relative overflow-hidden group`}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-bold theme-text-tertiary uppercase tracking-widest">{label}</p>
          <p className={`${small ? 'text-xl' : 'text-3xl'} font-black theme-text tracking-tighter`}>{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <p className="text-[10px] theme-text-tertiary mt-4 font-medium uppercase tracking-wider relative z-10">{sub}</p>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
    </motion.div>
  )
}
