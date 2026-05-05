'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

interface AuditLog {
  id: string
  user_id: string
  user_email?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export function AuditLogsView() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    user_email: ''
  })

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getAuditLogs({
        skip: page * limit,
        limit,
        filters: Object.keys(filters).reduce((acc, key) => {
          const val = filters[key as keyof typeof filters]
          if (val) {
            acc[key] = val
          }
          return acc
        }, {} as any)
      })
      setLogs(response.logs || [])
      setTotal(response.total || 0)
    } catch (error: any) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-400 bg-green-500/10 border-green-500/30'
    if (action.includes('delete')) return 'text-red-400 bg-red-500/10 border-red-500/30'
    if (action.includes('update')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    if (action.includes('reveal')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30'
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen theme-bg theme-text">
      {/* Header */}
      <header className="theme-card backdrop-blur-xl border-b theme-border px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🔍 Audit Logs
            </h1>
            <p className="text-sm theme-text-tertiary mt-1">System activity and security monitoring</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 theme-text-secondary hover:theme-text transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="theme-card p-6 border theme-border rounded-2xl flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold theme-text-tertiary uppercase mb-2">User Email</label>
            <input
              type="text"
              value={filters.user_email}
              onChange={(e) => setFilters({ ...filters, user_email: e.target.value })}
              className="theme-input w-full"
              placeholder="Search by email..."
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold theme-text-tertiary uppercase mb-2">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="theme-input w-full"
            >
              <option value="">All Actions</option>
              <option value="create_document">Create Document</option>
              <option value="delete_document">Delete Document</option>
              <option value="create_analysis">Create Analysis</option>
              <option value="reveal_pii">Reveal PII</option>
              <option value="user_login">Login</option>
            </select>
          </div>
          <button
            onClick={() => {
              setFilters({ action: '', resource_type: '', user_email: '' })
              setPage(0)
            }}
            className="px-6 py-2 theme-card border theme-border rounded-lg text-sm font-medium hover:border-sky-500/40 transition-colors"
          >
            Clear
          </button>
        </motion.div>

        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="theme-card border theme-border rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b theme-border">
                  <th className="px-6 py-4 text-xs font-semibold theme-text-tertiary uppercase">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-semibold theme-text-tertiary uppercase">User</th>
                  <th className="px-6 py-4 text-xs font-semibold theme-text-tertiary uppercase">Action</th>
                  <th className="px-6 py-4 text-xs font-semibold theme-text-tertiary uppercase">Resource</th>
                  <th className="px-6 py-4 text-xs font-semibold theme-text-tertiary uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 h-16 bg-white/5 mb-2" />
                    </tr>
                  ))
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium theme-text">{formatDate(log.created_at)}</p>
                        <p className="text-[10px] theme-text-tertiary mt-1 font-mono">{log.ip_address}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm theme-text">{log.user_email || 'System'}</p>
                        <p className="text-[10px] theme-text-tertiary mt-1 font-mono">{log.user_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm theme-text-secondary">
                        {log.resource_type}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs overflow-hidden">
                          <p className="text-xs theme-text-tertiary truncate" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center theme-text-tertiary italic">
                      No logs found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-white/5 border-t theme-border flex items-center justify-between">
            <p className="text-xs theme-text-tertiary">
              Showing <span className="theme-text font-semibold">{logs.length}</span> of <span className="theme-text font-semibold">{total}</span> events
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-4 py-1.5 theme-card border theme-border rounded-lg text-xs disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
                className="px-4 py-1.5 theme-card border theme-border rounded-lg text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
