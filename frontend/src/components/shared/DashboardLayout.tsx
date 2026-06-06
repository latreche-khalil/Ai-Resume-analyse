'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  LayoutDashboard, FileText, Target, Settings, LogOut,
  ChevronLeft, Search, Bell, Users, Briefcase, Mic, Zap,
  MessageSquare, HeartHandshake, ShieldCheck, Upload,
  Menu, X, ChevronRight, Plus, Bot, Home, History,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
  role: 'candidate' | 'admin' | 'recruiter'
}

const NAV_GROUPS = {
  candidate: [
    {
      label: 'Main',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard',        href: '/dashboard',    id: 'dashboard',    color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-500/10'  },
        { icon: FileText,        label: 'Resumes',          href: '/documents',    id: 'documents',    color: '#0ea5e9', bg: 'bg-sky-50 dark:bg-sky-500/10'         },
      ],
    },
    {
      label: 'AI Tools',
      items: [
        { icon: Zap,           label: 'New Analysis',      href: '/analysis/new', id: 'analysis-new', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10'     },
        { icon: History,       label: 'Analysis History',  href: '/analysis',     id: 'analysis',     color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-500/10'   },
        { icon: Mic,           label: 'Interview',         href: '/interview',    id: 'interview',    color: '#ef4444', bg: 'bg-red-50 dark:bg-red-500/10'         },
        { icon: MessageSquare, label: 'AI Coach',          href: '/coaching',     id: 'coaching',     color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      ],
    },
    {
      label: 'Community',
      items: [
        { icon: MessageSquare,  label: 'Testimonials', href: '/testimonials', id: 'testimonials', color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-500/10'        },
        { icon: HeartHandshake, label: 'Feedback',     href: '/feedback',     id: 'feedback',     color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-500/10'        },
      ],
    },
  ],
  admin: [
    {
      label: 'System',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard',    href: '/admin',              id: 'admin',         color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        { icon: ShieldCheck,     label: 'Audit Logs',   href: '/admin/audit-logs',   id: 'audit-logs',    color: '#ef4444', bg: 'bg-red-50 dark:bg-red-500/10'       },
        { icon: HeartHandshake,  label: 'Feedback',     href: '/admin/feedback',     id: 'feedback',      color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-500/10'     },
        { icon: MessageSquare,   label: 'Testimonials', href: '/admin/testimonials', id: 'testimonials',  color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-500/10'     },
      ],
    },
  ],
  recruiter: [
    {
      label: 'Recruiting',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard',    href: '/recruiter',          id: 'recruiter',          color: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        { icon: Users,           label: 'Talent Pool',  href: '/talent-pool',        id: 'talent-pool',        color: '#0ea5e9', bg: 'bg-sky-50 dark:bg-sky-500/10'       },
        { icon: Target,          label: 'Compare',      href: '/compare-candidates', id: 'compare-candidates', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10'   },
        { icon: Bot,             label: 'AI Assistant', href: '/coaching',           id: 'coaching',           color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10'},
      ],
    },
    {
      label: 'Analysis',
      items: [
        { icon: Briefcase, label: 'Job Descriptions', href: '/jobs',         id: 'jobs',         color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-500/10'  },
        { icon: Upload,    label: 'Upload CVs',       href: '/upload',       id: 'upload',       color: '#ef4444', bg: 'bg-red-50 dark:bg-red-500/10'         },
        { icon: Zap,       label: 'New Analysis',     href: '/analysis/new', id: 'analysis-new', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10'    },
        { icon: History,   label: 'Analysis History', href: '/analysis/new?tab=history', id: 'analysis-history', color: '#8b5cf6', bg: 'bg-violet-50 dark:bg-violet-500/10' },
        { icon: FileText,  label: 'Documents',        href: '/documents',    id: 'documents',    color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-500/10'       },
      ],
    },
    {
      label: 'Community',
      items: [
        { icon: MessageSquare,  label: 'Testimonials', href: '/testimonials', id: 'testimonials', color: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
        { icon: HeartHandshake, label: 'Feedback',     href: '/feedback',     id: 'feedback',     color: '#ec4899', bg: 'bg-pink-50 dark:bg-pink-500/10' },
      ],
    },
  ],
}

interface SidebarProps {
  role: 'candidate' | 'admin' | 'recruiter'
  collapsed: boolean
  pathname: string | null
  userInitial: string
  userName: string
  userId: string | undefined
  logout: () => void
}

function Sidebar({ role, collapsed, pathname, userInitial, userName, userId, logout }: SidebarProps) {
  const groups = NAV_GROUPS[role] || []
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      const savedImage = localStorage.getItem(`profile_image_${userId}`)
      if (savedImage) setProfileImage(savedImage)
    }
  }, [userId])

  const isActive = (id: string, href: string) => {
    if (id === 'dashboard'    && pathname === '/dashboard')    return true
    if (id === 'admin'        && pathname === '/admin')        return true
    if (id === 'recruiter'    && pathname === '/recruiter')    return true
    if (id === 'analysis-new' && pathname === '/analysis/new') return true
    if (id === 'analysis-history' && pathname === '/analysis/new') return false // never auto-active
    if (id === 'analysis' && pathname?.startsWith('/analysis') && !pathname?.includes('/new')) return true
    if (id === 'jobs' && pathname?.startsWith('/jobs')) return true
    return (
      pathname?.startsWith(href) &&
      href !== '/' &&
      !['dashboard', 'admin', 'recruiter', 'analysis', 'analysis-new', 'analysis-history', 'jobs'].includes(id)
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-600/50">
      {/* Brand */}
      <div className={`h-16 flex items-center shrink-0 border-b border-gray-200 dark:border-slate-600/50 ${collapsed ? 'px-4 justify-center' : 'px-5 gap-3'}`}>
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/logo-new.svg"
            alt="ResumeAI"
            className="w-10 h-10 shrink-0 group-hover:scale-105 transition-transform"
          />
          {!collapsed && <span className="font-bold text-base bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">ResumeAI</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((navItem) => {
                const active = isActive(navItem.id, navItem.href)
                const iconColor = (navItem as any).color || '#6366f1'
                const iconBg   = (navItem as any).bg   || 'bg-slate-100 dark:bg-slate-700'
                return (
                  <Link key={navItem.id} href={navItem.href} prefetch={true}>
                    <div
                      title={collapsed ? navItem.label : undefined}
                      className={`
                        relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                        ${collapsed ? 'justify-center py-2 px-2' : 'gap-2.5 px-2.5 py-2'}
                        ${active
                          ? 'bg-slate-100 dark:bg-slate-700/70 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ backgroundColor: iconColor }}
                        />
                      )}
                      {/* Coloured icon box */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? iconBg : 'bg-transparent'} transition-all`}>
                        <navItem.icon
                          size={15}
                          style={{ color: active ? iconColor : undefined }}
                          className={`shrink-0 ${!active ? 'text-gray-400 dark:text-slate-500' : ''}`}
                        />
                      </div>
                      {!collapsed && <span className="truncate">{navItem.label}</span>}
                      {active && !collapsed && (
                        <motion.span
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: iconColor }}
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`shrink-0 border-t border-gray-200 dark:border-slate-600/50 pt-3 pb-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
        <Link href="/settings">
          <div
            title={collapsed ? 'Settings' : undefined}
            className={`flex items-center rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
              ${collapsed ? 'justify-center py-2 px-2' : 'gap-2.5 px-2.5 py-2'}
              ${pathname === '/settings'
                ? 'bg-slate-100 dark:bg-slate-700/70 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${pathname === '/settings' ? 'bg-slate-200 dark:bg-slate-600' : ''}`}>
              <Settings size={15} style={{ color: pathname === '/settings' ? '#6366f1' : undefined }} className={`shrink-0 ${pathname !== '/settings' ? 'text-gray-400 dark:text-slate-500' : ''}`} />
            </div>
            {!collapsed && <span>Settings</span>}
          </div>
        </Link>
        <button
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
            ${collapsed ? 'justify-center py-2 px-2' : 'gap-2.5 px-2.5 py-2'}
            text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400`}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
            <LogOut size={15} className="shrink-0" />
          </div>
          {!collapsed && <span>Sign out</span>}
        </button>
        {!collapsed && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/50 flex items-center gap-2.5 px-1">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-none">{userName}</p>
              <p className="text-[10px] text-sky-500 font-medium capitalize mt-0.5">{role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile_image_${user.id}`)
      if (savedImage) setProfileImage(savedImage)
    }
  }, [user?.id])
  const sidebarW = sidebarOpen ? 350 : 60
  const userInitial = mounted ? (user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U') : 'U'
  const userName    = mounted ? (user?.first_name || user?.email?.split('@')[0] || 'User') : 'User'

  const pathSegments = pathname?.split('/').filter(Boolean) || []
  const breadcrumbs  = pathSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
  if (breadcrumbs.length === 0) breadcrumbs.push('Dashboard')

  const sidebarProps: SidebarProps = { role, collapsed: !sidebarOpen, pathname, userInitial, userName, userId: user?.id, logout }

  return (
    <div className="bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white font-sans" style={{ minHeight: '100vh' }}>

      {/* ── Fixed Sidebar — مثل الـ navbar تماماً ── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: `${sidebarW}px`,
          zIndex: 40,
          transition: 'width 0.2s ease',
        }}
      >
        <Sidebar {...sidebarProps} />
      </aside>

      {/* ── Main content — يأخذ المساحة المتبقية ── */}
      <div
        style={{
          marginLeft: `${sidebarW}px`,
          transition: 'margin-left 0.2s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Topbar */}
        <header
          style={{ position: 'sticky', top: 0, zIndex: 30 }}
          className="h-16 shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-600/50 flex items-center px-5 gap-4"
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={13} className="text-gray-300 dark:text-slate-600" />}
                <span className={i === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-400 dark:text-slate-500 font-medium'}>
                  {crumb}
                </span>
              </div>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="relative hidden xl:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-slate-600/50 rounded-lg w-52 focus:w-64 transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
            <Link href="/analysis/new" className="hidden sm:block">
              <motion.span
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 transition-shadow cursor-pointer"
              >
                <Plus size={13} />New Analysis
              </motion.span>
            </Link>
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-600/50" />
            <ThemeToggle />
            <Link href="/">
              <div className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1" title="Go to Home">
                <Home size={17} />
                <span className="hidden md:inline text-xs font-semibold">Home</span>
              </div>
            </Link>
            <button className="relative p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-sky-500 rounded-full ring-2 ring-white dark:ring-slate-800" />
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-slate-600/50" />
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">{userName}</p>
                <p className="text-[10px] text-sky-500 font-medium capitalize mt-0.5">{role}</p>
              </div>
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-sky-500/20">
                  {userInitial}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-4 lg:px-5 py-4 lg:py-5">
          {children}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute top-0 left-0 bottom-0 w-[240px]"
            >
              <Sidebar {...sidebarProps} />
              <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={18} />
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
