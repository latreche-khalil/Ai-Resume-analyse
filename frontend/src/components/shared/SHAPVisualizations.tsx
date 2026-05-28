'use client'

import { motion } from 'framer-motion'
import { Activity, BarChart, ArrowUpRight, ArrowDownRight, Minus, Zap, Cpu, TrendingUp } from 'lucide-react'

interface ForcePlotData {
  type: 'force_plot' | 'shap_force_plot'
  base_value: number
  features: string[]
  values: number[]
  colors: string[]
  final_score: number
}

interface WaterfallData {
  type: 'waterfall' | 'shap_waterfall'
  steps: Array<{
    name: string
    value: number
    cumulative: number
    type?: 'positive' | 'negative'
  }>
  base_score: number
  final_score: number
}

interface SummaryPlotData {
  type: 'summary'
  features: string[]
  importance: number[]
  impact_direction: ('positive' | 'negative' | 'neutral')[]
  colors: string[]
}

interface SHAPVisualizationsProps {
  forcePlotData?: ForcePlotData
  waterfallData?: WaterfallData
  summaryPlotData?: SummaryPlotData
}

export function SHAPVisualizations({
  forcePlotData,
  waterfallData,
  summaryPlotData
}: SHAPVisualizationsProps) {
  if (!forcePlotData && !waterfallData && !summaryPlotData) return null;

  return (
    <div className="space-y-6">
      {/* Force Plot / Neural Impact Flow */}
      {forcePlotData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.01] blur-3xl rounded-full" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-6">
             <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                   <Cpu className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">Neural Impact Flow</h3>
                   <p className="text-xs text-slate-600 dark:text-neutral-400 font-semibold">SHAP value decomposition of your matching probability</p>
                </div>
             </div>
             
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#131316] p-1.5 rounded-xl border border-gray-100 dark:border-neutral-900/60">
                <div className="px-3 py-1.5 text-center">
                   <div className="text-[9px] font-extrabold text-slate-600 dark:text-neutral-400 uppercase tracking-wider mb-0.5">Base</div>
                   <div className="text-sm font-black text-slate-700 dark:text-neutral-300">{((forcePlotData.base_value || 0) * 100).toFixed(0)}%</div>
                </div>
                <div className="w-px h-6 bg-gray-200 dark:bg-neutral-800" />
                <div className="px-3 py-1.5 text-center">
                   <div className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Final</div>
                   <div className="text-sm font-black text-blue-600 dark:text-blue-400">{((forcePlotData.final_score || 0) * 100).toFixed(0)}%</div>
                </div>
             </div>
          </div>
          
          <ForcePlot data={forcePlotData} />
        </motion.div>
      )}

      {/* Waterfall Chart */}
      {waterfallData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">Cumulative Attribution</h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-semibold">Expert contribution sequence analysis</p>
             </div>
          </div>
          
          <WaterfallChart data={waterfallData} />
        </motion.div>
      )}

      {/* Summary Plot */}
      {summaryPlotData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <BarChart className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white tracking-tight">Feature Importance Matrix</h3>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-semibold">Ranked influence of technical domains on current result</p>
             </div>
          </div>
          
          <SummaryPlot data={summaryPlotData} />
        </motion.div>
      )}
    </div>
  )
}

function ForcePlot({ data }: { data: ForcePlotData }) {
  const values = data.values || []
  const maxAbsValue = Math.max(...values.map(Math.abs), 0.01)
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {data.features.map((feature, idx) => {
          const value = data.values[idx] || 0
          const isPositive = value > 0
          const width = (Math.abs(value) / maxAbsValue) * 100
          
          return (
            <div key={idx} className="group/item">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{feature}</span>
                <span className={`text-xs font-black ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isPositive ? '+' : ''}{(value * 100).toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2.5 bg-slate-100 dark:bg-white/[0.03] rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 flex justify-end border-r border-slate-300/30 dark:border-white/10">
                    {!isPositive && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        className="h-full bg-gradient-to-l from-rose-500 to-rose-400/40 rounded-l-full shadow-[0_0_10px_rgba(244,67,54,0.2)]"
                      />
                    )}
                  </div>
                  <div className="w-1/2">
                    {isPositive && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400/40 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WaterfallChart({ data }: { data: WaterfallData }) {
  const steps = data.steps || []
  
  // Grid lines for 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 25, 50, 75, 100]
  
  return (
    <div className="pt-4 pb-4">
      <div className="relative">
        {/* Grid lines and labels */}
        <div className="absolute left-0 right-0 top-0 bottom-16 pointer-events-none">
          {gridLines.map((percent) => (
            <div
              key={percent}
              className="absolute left-0 right-0 flex items-center"
              style={{ bottom: `${percent}%` }}
            >
              <span className="text-[9px] font-bold text-slate-400 dark:text-neutral-500 w-8 text-right pr-2">
                {percent}%
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-neutral-800/60 ml-2" />
            </div>
          ))}
        </div>

        {/* Chart bars */}
        <div className="relative pl-10 pr-2">
          <div className="flex items-end justify-between gap-3 h-64">
            {steps.map((step, idx) => {
              // Calculate height based on cumulative percentage (0-100%)
              const cumulativePercent = step.cumulative * 100
              const height = Math.max(cumulativePercent, 2) // Minimum 2% for visibility
              
              const isBase = step.name.toLowerCase().includes('base') || idx === 0
              const isFinal = step.name.toLowerCase().includes('final') || idx === steps.length - 1
              const isPositive = step.value > 0
              
              return (
                <div key={idx} className="flex-1 min-w-[70px] flex flex-col items-center gap-3 group/bar">
                  <div className="relative w-full h-64 flex flex-col justify-end">
                    {/* Value label on top */}
                    <div className={`absolute left-1/2 -translate-x-1/2 text-xs font-black transition-all whitespace-nowrap z-10 ${
                       isFinal 
                         ? 'text-blue-600 dark:text-blue-400 -top-8 scale-110' 
                         : isBase
                           ? 'text-slate-700 dark:text-slate-300 -top-8'
                           : 'text-slate-600 dark:text-slate-400 -top-6 opacity-0 group-hover/bar:opacity-100'
                    }`}>
                      {cumulativePercent.toFixed(0)}%
                    </div>
                    
                    {/* Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08, ease: "easeOut" }}
                      className={`w-full rounded-t-xl transition-all duration-300 relative overflow-hidden ${
                        isBase
                          ? 'bg-gradient-to-t from-slate-600 to-slate-500 dark:from-slate-300 dark:to-slate-200 shadow-lg shadow-slate-500/20' 
                          : isFinal 
                            ? 'bg-gradient-to-t from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 shadow-lg shadow-blue-500/30' 
                            : isPositive 
                              ? 'bg-gradient-to-t from-emerald-500 via-emerald-400 to-emerald-300 shadow-md shadow-emerald-500/20' 
                              : 'bg-gradient-to-t from-rose-500 via-rose-400 to-rose-300 shadow-md shadow-rose-500/20'
                      }`}
                      style={{ minHeight: '8px' }}
                    >
                       {/* Shine effect */}
                       <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
                       
                       {/* Glow for base and final */}
                       {(isBase || isFinal) && (
                         <div className="absolute -inset-1 bg-inherit blur-lg opacity-40" />
                       )}
                    </motion.div>
                  </div>
                  
                  {/* Label */}
                  <div className={`text-[9px] font-black uppercase tracking-tighter text-center leading-tight w-full break-words px-1 transition-colors ${
                    isFinal 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : isBase
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-600 dark:text-slate-400'
                  }`} title={step.name}>
                    {step.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryPlot({ data }: { data: SummaryPlotData }) {
  const importance = data.importance || []
  const maxImportance = Math.max(...importance, 0.01)
  
  return (
    <div className="space-y-5">
      {data.features.map((feature, idx) => {
        const val = data.importance[idx] || 0
        const direction = data.impact_direction[idx]
        const width = (val / maxImportance) * 100
        
        return (
          <div key={idx} className="space-y-2 group/row">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 group-hover/row:text-slate-900 dark:group-hover/row:text-white transition-colors">
                <div className={`p-1.5 rounded-lg ${
                  direction === 'positive' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 
                  direction === 'negative' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 
                  'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                   {direction === 'positive' ? <ArrowUpRight className="w-3.5 h-3.5" /> : 
                    direction === 'negative' ? <ArrowDownRight className="w-3.5 h-3.5" /> : 
                    <Minus className="w-3.5 h-3.5" />}
                </div>
                {feature}
              </div>
              <span className="text-slate-700 dark:text-slate-300 font-mono text-xs bg-slate-50 dark:bg-white/[0.03] px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 font-black">{val.toFixed(2)}</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-white/[0.03] rounded-full overflow-hidden border border-slate-200/30 dark:border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className={`h-full rounded-full shadow-sm ${
                  direction === 'positive' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 
                  direction === 'negative' ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 
                  'bg-gradient-to-r from-slate-400 to-slate-300'
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
