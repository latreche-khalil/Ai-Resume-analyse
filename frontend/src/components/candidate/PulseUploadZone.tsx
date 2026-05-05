import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export function PulseUploadZone() {
  const [drag, setDrag] = useState(false)
  const router = useRouter()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    router.push('/upload')
  }

  return (
    <div
      onDragEnter={() => setDrag(true)}
      onDragLeave={() => setDrag(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer group
        ${drag ? 'border-sky-400 bg-sky-500/10 scale-[1.02]' : 'theme-border hover:border-sky-500/60'}`}
      onClick={() => router.push('/upload')}
    >
      {/* Pulse rings */}
      <div className="relative inline-flex items-center justify-center mb-4">
        <motion.div
          className="absolute w-20 h-20 rounded-full bg-sky-500/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-20 h-20 rounded-full bg-sky-500/10"
          animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
        />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/30">
          📤
        </div>
      </div>

      <p className="font-semibold theme-text text-lg mb-1">Drop your CV here</p>
      <p className="theme-text-tertiary text-sm">PDF, DOCX, JPG, PNG — max 10 MB</p>

      <motion.div
        className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-semibold"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Browse Files
      </motion.div>
    </div>
  )
}
