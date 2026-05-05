import { motion } from 'framer-motion'

interface ActivityDay {
  date: string
  count: number
  type: 'upload' | 'analysis' | 'interview' | 'coaching'
}

interface ActivityHeatmapProps {
  activities: ActivityDay[]
}

export function ActivityHeatmap({ activities }: ActivityHeatmapProps) {
  // Generate last 12 weeks (84 days)
  const weeks = 12
  const daysPerWeek = 7
  const today = new Date()
  
  const days: ActivityDay[] = []
  for (let i = weeks * daysPerWeek - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const activity = activities.find(a => a.date === dateStr)
    days.push(activity || { date: dateStr, count: 0, type: 'upload' })
  }

  // Group by weeks
  const weekGroups: ActivityDay[][] = []
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

  const getTooltip = (day: ActivityDay) => {
    if (day.count === 0) return 'No activity'
    const types = {
      upload: 'CV Upload',
      analysis: 'Job Analysis',
      interview: 'Mock Interview',
      coaching: 'AI Coaching'
    }
    return `${day.count} ${types[day.type]}${day.count > 1 ? 's' : ''} on ${new Date(day.date).toLocaleDateString()}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold theme-text">Activity Heatmap</h3>
        <div className="flex items-center gap-2 text-xs theme-text-tertiary">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded ${getColor(level)}`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (weekIndex * daysPerWeek + dayIndex) * 0.01 }}
                className={`w-3 h-3 rounded ${getColor(day.count)} cursor-pointer hover:ring-2 hover:ring-sky-500/50 transition-all`}
                title={getTooltip(day)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs theme-text-tertiary">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>CV Uploads</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Analyses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Interviews</span>
        </div>
      </div>
    </div>
  )
}
