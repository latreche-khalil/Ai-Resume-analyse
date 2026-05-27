'use client'

import { motion } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  Link as LinkIcon, 
  BookOpen, 
  ExternalLink, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  Youtube,
  GraduationCap,
  FileText,
  Circle,
  Trophy,
  Rocket,
  ChevronRight,
  Target,
  TrendingUp,
  Download
} from 'lucide-react'

interface RoadmapResource {
  name: string
  provider: string
  url_hint?: string
  type?: string
}

interface RoadmapItem {
  skill: string
  priority: 'critical' | 'important' | 'nice_to_have'
  estimated_weeks: number
  resources?: RoadmapResource[]
  personalized_note?: string
  roi?: string
  hands_on_project?: string
}

interface LearningTimelineProps {
  roadmap: RoadmapItem[]
  criticalGaps?: any[]
  importantGaps?: any[]
  niceToHaveGaps?: any[]
  fallbackSkills?: string[]
}

const R = { fontFamily: 'Roboto, sans-serif' }

export function LearningTimeline({ 
  roadmap = [],
  criticalGaps = [],
  importantGaps = [],
  niceToHaveGaps = [],
  fallbackSkills = []
}: LearningTimelineProps) {
  const allGaps = [
    ...criticalGaps.map(g => ({ ...g, priority: 'critical' as const })),
    ...importantGaps.map(g => ({ ...g, priority: 'important' as const })),
    ...niceToHaveGaps.map(g => ({ ...g, priority: 'nice_to_have' as const }))
  ]
  
  let items = roadmap.length > 0 ? roadmap : allGaps

  if (items.length === 0 && fallbackSkills.length > 0) {
    items = fallbackSkills.map(skill => ({
      skill,
      priority: 'important',
      estimated_weeks: 1,
      personalized_note: `Master ${skill} to strengthen your profile for this specific role.`
    }))
  }
  
  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] space-y-8 shadow-xl relative overflow-hidden" style={R}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50" />
        <div className="relative z-10">
          <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mx-auto ring-1 ring-emerald-500/20 dark:ring-emerald-500/30 mb-8">
            <Trophy className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-3 px-6">
            <h3 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight">Technical Mastery Achieved</h3>
            <p className="text-slate-600 dark:text-slate-300 text-lg max-w-md mx-auto leading-relaxed font-normal">Your profile is perfectly aligned with this role. No critical learning gaps identified.</p>
          </div>
        </div>
      </div>
    )
  }
  
  let cumulativeWeeks = 0
  const timelineItems = items.slice(0, 5).map(item => {
    const startWeek = cumulativeWeeks
    const weeks = item.estimated_weeks || 1
    cumulativeWeeks += weeks
    return { ...item, startWeek, endWeek: cumulativeWeeks, weeks }
  })
  
  return (
    <div className="space-y-12 max-w-5xl mx-auto py-6" dir="auto" style={R}>
      {/* Premium Hero Header */}
      <div className="relative p-10 md:p-12 rounded-[3rem] bg-white dark:bg-slate-950 overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 group transition-colors duration-500">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-sky-500 rounded-full blur-[120px] opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-1000" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition-opacity duration-1000" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-400/30 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-[0.25em]">
              <Sparkles className="w-4 h-4" />
              AI-Optimized Strategy
            </div>
            <div>
              <h3 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter leading-[1.1] mb-4">
                Accelerated <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 dark:from-sky-400 dark:via-blue-400 dark:to-indigo-400">Roadmap</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-lg font-normal max-w-xl leading-relaxed opacity-90 transition-colors">
                A high-impact, sequential learning path engineered to close your technical gaps and maximize your hireability.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none flex items-center gap-12 bg-slate-50 dark:bg-white/[0.04] backdrop-blur-3xl px-10 py-7 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-inner dark:shadow-2xl transition-all">
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none flex items-baseline gap-1.5">
                  {cumulativeWeeks}<span className="text-sm text-sky-600 dark:text-sky-400 font-black uppercase">w</span>
                </div>
                <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3">Duration</div>
              </div>
              <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />
              <div className="text-center">
                <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
                  {timelineItems.length}
                </div>
                <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3">Milestones</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive Timeline Visualizer */}
      <div className="relative px-2">
        <div className="absolute left-[23px] top-10 bottom-10 w-[3px] bg-slate-200 dark:bg-white/10 z-0 rounded-full" />
        <div className="absolute left-[23px] top-10 bottom-10 w-[3px] bg-gradient-to-b from-sky-500 via-indigo-500 to-transparent z-0 opacity-20 dark:opacity-60 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.4)]" />
        
        <div className="space-y-10 relative z-10">
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

      {/* Landing-Page Style Action Footer */}
      <div className="relative group mt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-10 md:p-12 rounded-[2.5rem] bg-white dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl transition-all">
          
          <div className="flex items-center gap-6 text-slate-900 dark:text-white">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
               <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1 block">Impact Estimate</span>
               <h4 className="text-xl md:text-2xl font-bold tracking-tight">Match Score Boost: <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">+15-20%</span></h4>
            </div>
          </div>

          <motion.button
            className="group relative w-full md:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-lg shadow-2xl shadow-sky-500/30 overflow-hidden"
            whileHover={{ 
              scale: 1.05, 
              boxShadow: '0 20px 40px rgba(14, 165, 233, 0.4)',
              y: -2
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700"
              initial={{ x: '-100%' }}
              whileHover={{ x: '0%' }}
              transition={{ duration: 0.3 }}
            />
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span>Download Detailed Plan</span>
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Download className="w-5 h-5" />
              </motion.div>
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ item, index, isLast }: { item: any; index: number; isLast: boolean }) {
  const priorityConfigs = {
    critical: { 
      label: 'Critical Priority', 
      gradient: 'from-rose-500 to-orange-500', 
      text: 'text-rose-700 dark:text-rose-400', 
      bg: 'bg-rose-100 dark:bg-rose-500/20',
      border: 'border-rose-200 dark:border-rose-500/30',
      icon: 'text-rose-600 dark:text-rose-400'
    },
    important: { 
      label: 'High Priority', 
      gradient: 'from-sky-500 to-indigo-600', 
      text: 'text-sky-700 dark:text-sky-400', 
      bg: 'bg-sky-100 dark:bg-sky-500/20',
      border: 'border-sky-200 dark:border-sky-500/30',
      icon: 'text-sky-600 dark:text-sky-400'
    },
    nice_to_have: { 
      label: 'Growth Path', 
      gradient: 'from-emerald-500 to-teal-600', 
      text: 'text-emerald-700 dark:text-emerald-400', 
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      icon: 'text-emerald-600 dark:text-emerald-400'
    }
  }

  const config = priorityConfigs[item.priority as keyof typeof priorityConfigs] || priorityConfigs.important

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="relative pl-16 md:pl-20 group"
    >
      {/* Node Marker */}
      <div className="absolute left-0 top-7 w-12 h-12 flex items-center justify-center z-20">
         <div className={`w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-white/30 group-hover:border-sky-500 transition-all duration-500 overflow-hidden relative shadow-md`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
         </div>
         {index === 0 && (
           <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
         )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* Main Content Card */}
        <div className="group/card relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-[2rem]" />
          <div className="relative p-7 md:p-10 rounded-[2rem] bg-white dark:bg-slate-900/60 backdrop-blur-xl border-2 border-slate-100 dark:border-white/10 group-hover/card:border-sky-500/30 dark:group-hover/card:border-white/30 transition-all duration-500 shadow-xl overflow-hidden">
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] ${config.bg} ${config.text} border ${config.border}`}>
                      <Target className="w-4 h-4" />
                      {config.label}
                    </div>
                    <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight group-hover/card:text-sky-600 dark:group-hover/card:text-sky-400 transition-colors">{item.skill}</h4>
                 </div>
                 <div className="flex items-center gap-5 text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100/50 dark:bg-white/[0.03] px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <span className="flex items-center gap-2.5"><Calendar className={`w-5 h-5 ${config.icon}`} /> Week {item.startWeek + 1}-{item.endWeek}</span>
                    <div className="w-px h-4 bg-slate-300 dark:bg-white/10" />
                    <span className="flex items-center gap-2.5"><Clock className={`w-5 h-5 ${config.icon}`} /> {item.weeks}w</span>
                 </div>
              </div>

              <p className="text-base md:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-normal transition-colors">
                 {item.personalized_note || item.description || `Specialized training path for ${item.skill} involving core concepts, advanced features, and professional deployment.`}
              </p>

              {item.hands_on_project && (
                <div className="p-6 md:p-8 rounded-3xl bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-200 dark:border-white/5 space-y-3 group-hover/card:bg-slate-100 dark:group-hover/card:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                    <Rocket className="w-4 h-4" />
                    Practical Milestone
                  </div>
                  <p className="text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed italic">
                    "{item.hands_on_project}"
                  </p>
                </div>
              )}

              {item.roi && (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 w-fit">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">{item.roi}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refined Resource Sidebar */}
        <div className="flex flex-col gap-5 p-6 rounded-[2rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 h-fit self-start">
          <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-sky-500/60" />
            Curated Assets
          </div>
          
          {item.resources && item.resources.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {item.resources.slice(0, 3).map((res: RoadmapResource, idx: number) => (
                <a
                  key={idx}
                  href={`https://www.google.com/search?q=${encodeURIComponent(res.name + ' ' + res.provider)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-[1.25rem] border border-slate-200 dark:border-white/[0.05] bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:border-sky-500/30 dark:hover:border-white/20 transition-all group/item shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/10 flex items-center justify-center group-hover/item:scale-105 transition-transform shadow-inner">
                      {res.provider.toLowerCase().includes('youtube') ? (
                        <Youtube className="w-5 h-5 text-red-600" />
                      ) : (
                        <GraduationCap className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[170px]">{res.name}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mt-1">{res.provider}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover/item:text-sky-600 dark:group-hover/item:text-white group-hover/item:translate-x-1 transition-all" />
                </a>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Selecting Best<br/>Resources...</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
