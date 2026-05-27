'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, Tooltip,
  PieChart, Pie, Cell,
  BarChart, Bar, YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600/50 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        {payload[0].value}<span className="text-gray-400 font-normal">%</span>
      </p>
    </div>
  )
}

interface Props {
  type: 'radar' | 'area' | 'donut' | 'bar'
  data: any[]
  center?: string
}

export default function RechartsBundle({ type, data, center }: Props) {
  if (type === 'radar') return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="currentColor" className="text-gray-100 dark:text-slate-600/30" strokeOpacity={1} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }} className="text-gray-400 dark:text-slate-500" />
        <Radar dataKey="A" stroke="#0ea5e9" strokeWidth={2} fill="#0ea5e9" fillOpacity={0.1} />
      </RadarChart>
    </ResponsiveContainer>
  )

  if (type === 'area') return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" dot={{ fill: '#0ea5e9', r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  )

  if (type === 'donut') return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
            <Cell fill="#0ea5e9" />
            <Cell fill="currentColor" className="text-gray-100 dark:text-slate-600/30" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{center}</span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">match rate</span>
        </div>
      )}
    </div>
  )

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} axisLine={false} tickLine={false} width={70} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="val" radius={[0, 6, 6, 0]} barSize={12}>
          {data.map((_: any, i: number) => (
            <Cell key={i} fill="#0ea5e9" opacity={1 - i * 0.1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  return null
}
