'use client'

/**
 * PageShell — shared UI primitives used across Documents, Analysis, and other list pages.
 * Eliminates duplication of search bars, filter tabs, status badges, empty states, etc.
 */

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

const FONT = { fontFamily: 'Roboto, sans-serif' }

// ── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={FONT}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Search bar ───────────────────────────────────────────────────────────────
export function SearchBar({
  value, onChange, placeholder = 'Search...',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative flex-1" style={FONT}>
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
      />
    </div>
  )
}

// ── Filter tabs ──────────────────────────────────────────────────────────────
export function FilterTabs<T extends string>({
  filters, active, onChange,
}: {
  filters: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap" style={FONT}>
      {filters.map(f => (
        <button key={f.id} onClick={() => onChange(f.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            active === f.id
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-[#151518] shadow-sm'
          }`}>
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  completed:    { label: 'Completed',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: CheckCircle2 },
  partial_done: { label: 'Partial',    color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',    icon: AlertCircle  },
  failed:       { label: 'Failed',     color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',            icon: AlertCircle  },
  processing:   { label: 'Processing', color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',        icon: Loader2      },
  pending:      { label: 'Pending',    color: 'text-gray-500 dark:text-neutral-400',   bg: 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700',           icon: Clock        },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.bg} ${cfg.color}`} style={FONT}>
      <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

// ── Score ring ────────────────────────────────────────────────────────────────
export function ScoreRing({ score, status = '' }: { score: number; status?: string }) {
  const isGood = score >= 60
  const isMid  = score >= 40
  const color  = status === 'failed' ? '#ef4444' : isGood ? '#10b981' : isMid ? '#f59e0b' : '#6366f1'
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3"
          className="text-gray-200 dark:text-slate-700" />
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="3"
          stroke={color} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-900 dark:text-white" style={FONT}>{score}%</span>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon, title, subtitle, action,
}: {
  icon: any
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-[#0f0f11] border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl shadow-sm"
      style={FONT}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6 max-w-xs">{subtitle}</p>}
      {action}
    </motion.div>
  )
}

// ── Loading skeleton grid ─────────────────────────────────────────────────────
export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const colClass = cols === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    : cols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 md:grid-cols-2'
  return (
    <div className={`grid ${colClass} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-52 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

// ── Utility: convert decimal score to percentage ──────────────────────────────
export function normalizeScore(raw: number | undefined | null): number {
  if (!raw) return 0
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw)
}
