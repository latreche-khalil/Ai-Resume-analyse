import { motion } from 'framer-motion'

interface SectionDividerProps {
  title: string
}

export function SectionDivider({ title }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <h2 className="text-sm font-semibold theme-text-secondary uppercase tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700 dark:to-transparent" />
    </div>
  )
}
