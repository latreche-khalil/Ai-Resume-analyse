import Link from 'next/link'
import { motion } from 'framer-motion'

interface CVDocument {
  id: string
  original_filename: string
  processing_status: string
  created_at: string
}

interface ActivityRowProps {
  cv: CVDocument
  index: number
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  completed:  { label: 'Optimized',    color: 'text-green-400 bg-green-500/10 border-green-500/30',  icon: '✅' },
  processing: { label: 'Processing',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',     icon: '⏳' },
  pending:    { label: 'Needs Skills', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: '⚠️' },
  failed:     { label: 'Failed',       color: 'text-red-400 bg-red-500/10 border-red-500/30',        icon: '❌' },
}

export function ActivityRow({ cv, index }: ActivityRowProps) {
  const status = STATUS_MAP[cv.processing_status] || STATUS_MAP.pending
  const date = new Date(cv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">
        📄
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium theme-text truncate text-sm">{cv.original_filename}</p>
        <p className="text-xs theme-text-tertiary mt-0.5">{date}</p>
      </div>

      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.color} flex-shrink-0`}>
        {status.icon} {status.label}
      </span>

      {/* Quick actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <Link href={`/analysis/new`} title="Analyze">
          <button className="w-7 h-7 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 transition-colors flex items-center justify-center text-sm">🎯</button>
        </Link>
        <Link href={`/documents/${cv.id}`} title="View Report">
          <button className="w-7 h-7 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 transition-colors flex items-center justify-center text-sm">📊</button>
        </Link>
      </div>
    </motion.div>
  )
}
