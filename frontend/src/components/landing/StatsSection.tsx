'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Users, FileCheck, TrendingUp, Award } from 'lucide-react'

const stats = [
  {
    icon: Users,
    value: '10,000+',
    label: 'Active Users',
    gradient: 'from-sky-500 to-blue-600'
  },
  {
    icon: FileCheck,
    value: '50,000+',
    label: 'CVs Analyzed',
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    icon: TrendingUp,
    value: '95%',
    label: 'Match Accuracy',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    icon: Award,
    value: '4.9/5',
    label: 'User Rating',
    gradient: 'from-orange-500 to-red-600'
  }
]

export function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            
            return (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-white/[0.02] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-300 text-center">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 mb-4">
                    <Icon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                  </div>

                  {/* Value */}
                  <div className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                    {stat.value}
                  </div>

                  {/* Label */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {stat.label}
                  </div>

                  {/* Hover Glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
