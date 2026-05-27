'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export function PulseUploadZone() {
  const router = useRouter()
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => router.push('/upload')}
      className="p-8 border-2 border-dashed theme-border rounded-3xl hover:border-sky-500/50 hover:bg-sky-500/5 transition-all cursor-pointer group text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center text-3xl mx-auto mb-4 group-hover:scale-110 transition-transform">
        📤
      </div>
      <h3 className="text-xl font-bold theme-text mb-2">Drop your CV here</h3>
      <p className="text-sm theme-text-tertiary">Our AI will instantly map your skills to global markets</p>
    </motion.div>
  )
}
