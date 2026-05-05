'use client'

import { motion } from 'framer-motion'

interface ForcePlotData {
  type: 'force_plot'
  base_value: number
  features: string[]
  values: number[]
  colors: string[]
  final_score: number
}

interface WaterfallData {
  type: 'waterfall'
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
  return (
    <div className="space-y-6">
      {/* Force Plot */}
      {forcePlotData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="theme-card p-6 rounded-2xl border theme-border"
        >
          <h3 className="text-xl font-bold mb-4 theme-text">
            🎯 SHAP Force Plot
          </h3>
          <p className="text-sm theme-text-tertiary mb-6">
            Shows how each feature pushes the prediction from the base value
          </p>
          
          <ForcePlot data={forcePlotData} />
        </motion.div>
      )}

      {/* Waterfall Chart */}
      {waterfallData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="theme-card p-6 rounded-2xl border theme-border"
        >
          <h3 className="text-xl font-bold mb-4 theme-text">
            🌊 SHAP Waterfall Chart
          </h3>
          <p className="text-sm theme-text-tertiary mb-6">
            Shows cumulative effect of features on final score
          </p>
          
          <WaterfallChart data={waterfallData} />
        </motion.div>
      )}

      {/* Summary Plot */}
      {summaryPlotData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="theme-card p-6 rounded-2xl border theme-border"
        >
          <h3 className="text-xl font-bold mb-4 theme-text">
            📊 SHAP Summary Plot
          </h3>
          <p className="text-sm theme-text-tertiary mb-6">
            Feature importance with impact direction
          </p>
          
          <SummaryPlot data={summaryPlotData} />
        </motion.div>
      )}
    </div>
  )
}

// Force Plot Component
function ForcePlot({ data }: { data: ForcePlotData }) {
  const maxAbsValue = Math.max(...data.values.map(Math.abs))
  
  return (
    <div className="space-y-4">
      {/* Score Flow */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-center">
          <div className="theme-text-tertiary">Base Score</div>
          <div className="text-2xl font-bold theme-text">
            {(Number(data.base_value || 0) * 100).toFixed(0)}%
          </div>
        </div>
        
        <div className="flex-1 mx-4">
          <svg className="w-full h-2">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9333EA" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#scoreGradient)" rx="4" />
          </svg>
        </div>
        
        <div className="text-center">
          <div className="theme-text-tertiary">Final Score</div>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {(Number(data.final_score || 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Feature Contributions */}
      <div className="space-y-2">
        {data.features.map((feature, idx) => {
          const value = data.values[idx]
          const isPositive = value > 0
          const width = (Math.abs(value) / maxAbsValue) * 100
          
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-32 text-sm theme-text truncate" title={feature}>
                {feature}
              </div>
              
              <div className="flex-1 flex items-center gap-2">
                {isPositive ? (
                  <>
                    <div className="w-1/2"></div>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width / 2}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="h-6 bg-green-500 rounded-r"
                    />
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width / 2}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="h-6 bg-red-500 rounded-l ml-auto"
                    />
                    <div className="w-1/2"></div>
                  </>
                )}
              </div>
              
              <div className={`w-16 text-sm font-semibold text-right ${
                isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {isPositive ? '+' : ''}{(Number(value || 0) * 100).toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Waterfall Chart Component
function WaterfallChart({ data }: { data: WaterfallData }) {
  const maxValue = Math.max(...data.steps.map(s => s.cumulative))
  
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2 h-64">
        {data.steps.map((step, idx) => {
          const height = (step.cumulative / maxValue) * 100
          const isBase = step.name === 'Base Score'
          const isFinal = step.name === 'Final Score'
          const isPositive = step.type === 'positive'
          const isNegative = step.type === 'negative'
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs theme-text-tertiary text-center h-8 flex items-end">
                {(Number(step.cumulative || 0) * 100).toFixed(0)}%
              </div>
              
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`w-full rounded-t-lg ${
                  isBase || isFinal
                    ? 'bg-gradient-to-t from-purple-500 to-pink-500'
                    : isPositive
                    ? 'bg-green-500'
                    : isNegative
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
                style={{ minHeight: '20px' }}
              />
              
              <div className="text-xs theme-text text-center h-12 overflow-hidden">
                <div className="line-clamp-2" title={step.name}>
                  {step.name}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="theme-text-tertiary">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="theme-text-tertiary">Negative</span>
        </div>
      </div>
    </div>
  )
}

// Summary Plot Component
function SummaryPlot({ data }: { data: SummaryPlotData }) {
  const maxImportance = Math.max(...data.importance)
  
  return (
    <div className="space-y-3">
      {data.features.map((feature, idx) => {
        const importance = data.importance[idx]
        const direction = data.impact_direction[idx]
        const width = (importance / maxImportance) * 100
        
        const color = direction === 'positive'
          ? 'bg-green-500'
          : direction === 'negative'
          ? 'bg-red-500'
          : 'bg-yellow-500'
        
        const icon = direction === 'positive'
          ? '↑'
          : direction === 'negative'
          ? '↓'
          : '→'
        
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-lg ${
                  direction === 'positive'
                    ? 'text-green-500'
                    : direction === 'negative'
                    ? 'text-red-500'
                    : 'text-yellow-500'
                }`}>
                  {icon}
                </span>
                <span className="theme-text">{feature}</span>
              </div>
              <span className="theme-text-tertiary font-mono">
                {importance.toFixed(2)}
              </span>
            </div>
            
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className={`h-2 ${color} rounded-full`}
            />
          </div>
        )
      })}
    </div>
  )
}
