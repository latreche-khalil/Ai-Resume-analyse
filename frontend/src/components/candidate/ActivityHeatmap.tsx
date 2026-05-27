'use client'

import { motion } from 'framer-motion'

export function ActivityHeatmap({ activities }: { activities: any[] }) {
  const weeks = 12
  const daysPerWeek = 7
  const today = new Date()
  const days: any[] = []
  
  for (let i = weeks * daysPerWeek - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const activity = activities.find(a => a.date === dateStr)
    days.push(activity || { date: dateStr, count: 0, type: 'upload' })
  }

  const weekGroups: any[][] = []
  for (let i = 0; i < days.length; i += daysPerWeek) {
    weekGroups.push(days.slice(i, i + daysPerWeek))
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-white/5'
    if (count === 1) return 'bg-green-500/20'
    if (count === 2) return 'bg-green-500/40'
    if (count === 3) return 'bg-green-500/60'
    return 'bg-green-500/80'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold theme-text">Activity Heatmap</h3>
        <div className="flex items-center gap-2 text-xs theme-text-tertiary">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(l => <div key={l} className={`w-3 h-3 rounded ${getColor(l)}`} />)}
          </div>
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weekGroups.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((day, dIdx) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wIdx * daysPerWeek + dIdx) * 0.01 }}
                className={`w-3 h-3 rounded ${getColor(day.count)} cursor-pointer hover:ring-2 hover:ring-sky-500/50 transition-all`}
                title={`${day.count} activities on ${day.date}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
