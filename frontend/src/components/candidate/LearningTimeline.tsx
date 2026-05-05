'use client'

import { motion } from 'framer-motion'

interface RoadmapItem {
  skill: string
  priority: 'critical' | 'important' | 'nice_to_have'
  estimated_weeks: number
  resources?: string[]
  description?: string
}

interface LearningTimelineProps {
  roadmap: RoadmapItem[]
  criticalGaps?: any[]
  importantGaps?: any[]
  niceToHaveGaps?: any[]
  fallbackSkills?: string[]
}

export function LearningTimeline({ 
  roadmap = [],
  criticalGaps = [],
  importantGaps = [],
  niceToHaveGaps = [],
  fallbackSkills = []
}: LearningTimelineProps) {
  // Combine all gaps into roadmap format
  const allGaps = [
    ...criticalGaps.map(g => ({ ...g, priority: 'critical' as const })),
    ...importantGaps.map(g => ({ ...g, priority: 'important' as const })),
    ...niceToHaveGaps.map(g => ({ ...g, priority: 'nice_to_have' as const }))
  ]
  
  let items = roadmap.length > 0 ? roadmap : allGaps

  // Final fallback: use raw missing skills if no categorized gaps found
  if (items.length === 0 && fallbackSkills.length > 0) {
    items = fallbackSkills.map(skill => ({
      skill,
      priority: 'important',
      estimated_weeks: 2,
      description: `Focus on mastering ${skill} to improve your match for this role.`
    }))
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center py-12 theme-text-tertiary">
        <span className="text-4xl mb-4 block">🎉</span>
        <p>No learning gaps detected! You're well-matched for this role.</p>
      </div>
    )
  }
  
  // Calculate cumulative weeks
  let cumulativeWeeks = 0
  const timelineItems = items.map(item => {
    const startWeek = cumulativeWeeks
    const weeks = item.estimated_weeks || 2
    cumulativeWeeks += weeks
    return { ...item, startWeek, endWeek: cumulativeWeeks, weeks }
  })
  
  const totalWeeks = cumulativeWeeks
  
  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold theme-text">📚 Learning Roadmap</h3>
          <p className="text-sm theme-text-tertiary mt-1">
            Estimated completion: {totalWeeks} weeks ({Math.ceil(totalWeeks / 4)} months)
          </p>
        </div>
        
        {/* Priority Legend */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="theme-text-tertiary">Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="theme-text-tertiary">Important</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="theme-text-tertiary">Nice-to-have</span>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-green-500"></div>
        
        {/* Timeline items */}
        <div className="space-y-6">
          {timelineItems.map((item, idx) => (
            <TimelineItem
              key={idx}
              item={item}
              index={idx}
              isLast={idx === timelineItems.length - 1}
            />
          ))}
        </div>
      </div>
      
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: timelineItems.length * 0.1 }}
        className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h4 className="font-semibold theme-text mb-1">Quick Summary</h4>
            <p className="text-sm theme-text-secondary">
              {items.length === fallbackSkills.length && roadmap.length === 0 && allGaps.length === 0 ? (
                <>We've mapped out a preliminary path for your <span className="text-blue-400 font-semibold">{items.length} missing skills</span>.</>
              ) : (
                <>Focus on <span className="text-red-400 font-semibold">{criticalGaps.length || items.filter(i => i.priority === 'critical').length} critical gaps</span> first.</>
              )}
              {" "}Complete the roadmap in approximately <span className="text-green-400 font-semibold">{totalWeeks} weeks</span> to 
              significantly improve your match score.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

interface TimelineItemProps {
  item: any
  index: number
  isLast: boolean
}

function TimelineItem({ item, index, isLast }: TimelineItemProps) {
  const priorityConfig = {
    critical: {
      color: 'bg-red-500',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      icon: '🔥'
    },
    important: {
      color: 'bg-orange-500',
      borderColor: 'border-orange-500/30',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-400',
      icon: '⚡'
    },
    nice_to_have: {
      color: 'bg-yellow-500',
      borderColor: 'border-yellow-500/30',
      bgColor: 'bg-yellow-500/10',
      textColor: 'text-yellow-400',
      icon: '💡'
    }
  }
  
  const config = priorityConfig[(item.priority || 'important') as keyof typeof priorityConfig] 
    || (item.priority === 'high' ? priorityConfig.critical : item.priority === 'low' ? priorityConfig.nice_to_have : priorityConfig.important)
  
  const displayPriority = (item.priority || 'important').toString().replace('_', ' ')
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-20"
    >
      {/* Timeline dot */}
      <div className={`absolute left-6 top-3 w-5 h-5 rounded-full ${config.color} border-4 border-black z-10`}></div>
      
      {/* Content card */}
      <div className={`theme-card border ${config.borderColor} rounded-xl p-4 ${config.bgColor}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <h4 className="font-semibold theme-text">{item.skill || item.gap}</h4>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor} capitalize`}>
              {displayPriority}
            </span>
            <span className="text-xs theme-text-tertiary">
              {item.weeks || item.estimated_weeks || 2} weeks
            </span>
          </div>
        </div>
        
        {item.description && (
          <p className="text-sm theme-text-secondary mb-3">{item.description}</p>
        )}
        
        {item.recommendation && (
          <p className="text-sm theme-text-secondary mb-3">{item.recommendation}</p>
        )}
        
        {/* Week range */}
        <div className="flex items-center gap-2 text-xs theme-text-tertiary">
          <span>📅</span>
          <span>Week {item.startWeek + 1} - {item.endWeek}</span>
        </div>
        
        {/* Resources */}
        {item.resources && item.resources.length > 0 && (
          <div className="mt-3 pt-3 border-t theme-border">
            <div className="text-xs theme-text-tertiary mb-2">📚 Recommended Resources:</div>
            <div className="flex flex-wrap gap-2">
              {item.resources.slice(0, 3).map((resource: any, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-white/5 rounded text-xs theme-text-secondary flex items-center gap-1"
                >
                  <span className="text-blue-400">🔗</span>
                  {typeof resource === 'string' ? resource : (resource.name || resource.title || 'Course')}
                  {resource.provider && <span className="text-[10px] opacity-50 ml-1">({resource.provider})</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
