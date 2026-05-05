'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',            href: '/?preview=1',    active: false },
  { icon: '⚡', label: 'Dashboard',       href: '/dashboard',     active: false },
  { icon: '📄', label: 'My Resumes',      href: '/documents',     active: false },
  { icon: '🧪', label: 'Skill Lab',       href: '/analysis/new',  active: false },
  { icon: '🎤', label: 'Mock Interviews', href: '/coaching/chat', active: false },
  { icon: '⚙️', label: 'Settings',        href: '/settings',      active: true  },
]

const TABS = [
  { id: 'profile',    icon: '👤', label: 'Profile'    },
  { id: 'security',   icon: '🔒', label: 'Security'   },
  { id: 'privacy',    icon: '🛡️', label: 'Privacy'    },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'danger',     icon: '⚠️', label: 'Danger Zone'},
]

function Field({ label, value, onChange, type = 'text', placeholder = '', disabled = false, hint = '' }: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; disabled?: boolean; hint?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium theme-text">{label}</label>
      <div className="relative">
        <input type={isPassword && showPassword ? 'text' : type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} className={`theme-input w-full disabled:opacity-50 disabled:cursor-not-allowed ${isPassword ? 'pr-12' : ''}`} />
        {isPassword && (<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl theme-text-tertiary hover:theme-text transition-colors">{showPassword ? '🙈' : '👁️'}</button>)}
      </div>
      {hint && <p className="text-xs theme-text-tertiary">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium theme-text">{label}</p>
        {description && <p className="text-xs theme-text-tertiary mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-gradient-to-r from-sky-500 to-blue-500' : 'bg-white/20'}`}>
        <motion.div animate={{ x: checked ? 20 : 2 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" />
      </button>
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="theme-card border theme-border rounded-2xl p-6 space-y-4">
      <div><h3 className="font-semibold theme-text">{title}</h3>{description && <p className="text-sm theme-text-tertiary mt-0.5">{description}</p>}</div>
      <div className="border-t theme-border" />
      {children}
    </div>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function SaveButton({ onClick, state, label = 'Save Changes' }: { onClick: () => void; state: SaveState; label?: string }) {
  return (
    <motion.button onClick={onClick} disabled={state === 'saving'} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold text-sm disabled:opacity-60">
      {state === 'saving' ? '⏳ Saving…' : state === 'saved' ? '✅ Saved!' : state === 'error' ? '❌ Failed' : label}
    </motion.button>
  )
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`px-4 py-3 rounded-xl text-sm border ${type === 'success' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
      {type === 'success' ? '✅' : '❌'} {message}
    </motion.div>
  )
}

export function SettingsView() {
  const { user, refreshUser, logout } = useAuth() as any
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [language, setLanguage]     = useState('en')
  const [profileState, setProfileState] = useState<SaveState>('idle')
  const [profileMsg, setProfileMsg] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdState, setPwdState]     = useState<SaveState>('idle')
  const [pwdMsg, setPwdMsg]         = useState('')
  const [profilePublic, setProfilePublic]   = useState(false)
  const [shareAnalytics, setShareAnalytics] = useState(true)
  const [emailNotifs, setEmailNotifs]       = useState(true)
  const [weeklyReport, setWeeklyReport]     = useState(true)
  const [jobAlerts, setJobAlerts]           = useState(false)
  const [exportState, setExportState]   = useState<SaveState>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteState, setDeleteState]   = useState<SaveState>('idle')
  const [deleteMsg, setDeleteMsg]       = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name   || '')
      setLanguage(user.preferred_language || 'en')
    }
  }, [user])

  const handleLogout = useCallback(async () => { await logout() }, [logout])

  const saveProfile = async () => {
    setProfileState('saving'); setProfileMsg('')
    try {
      await apiClient.updateProfile({ first_name: firstName, last_name: lastName, preferred_language: language })
      if (refreshUser) await refreshUser()
      setProfileState('saved'); setProfileMsg('Profile updated successfully.')
      setTimeout(() => setProfileState('idle'), 3000)
    } catch (e: any) {
      setProfileState('error'); setProfileMsg(e?.response?.data?.detail || 'Failed to update profile.')
      setTimeout(() => setProfileState('idle'), 4000)
    }
  }

  const changePassword = async () => {
    if (newPwd !== confirmPwd) { setPwdMsg('Passwords do not match.'); setPwdState('error'); return }
    setPwdState('saving'); setPwdMsg('')
    try {
      await apiClient.changePassword(currentPwd, newPwd)
      setPwdState('saved'); setPwdMsg('Password changed successfully.')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setPwdState('idle'), 3000)
    } catch (e: any) {
      setPwdState('error'); setPwdMsg(e?.response?.data?.detail || 'Failed to change password.')
      setTimeout(() => setPwdState('idle'), 4000)
    }
  }

  const exportData = async () => {
    setExportState('saving')
    try {
      const result = await apiClient.exportMyData()
      const blob = new Blob([JSON.stringify(result.export_data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url; a.download = `resumeai-data-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
      setExportState('saved'); setTimeout(() => setExportState('idle'), 3000)
    } catch { setExportState('error'); setTimeout(() => setExportState('idle'), 3000) }
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleteState('saving'); setDeleteMsg('')
    try {
      await apiClient.deleteMyAccount()
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      localStorage.clear(); sessionStorage.clear()
      window.location.href = '/?t=' + Date.now()
    } catch (e: any) {
      setDeleteState('error'); setDeleteMsg(e?.response?.data?.detail || 'Failed to delete account.')
      setTimeout(() => setDeleteState('idle'), 4000)
    }
  }

  const pwdStrength = (() => {
    let s = 0
    if (newPwd.length >= 8) s++
    if (/[A-Z]/.test(newPwd)) s++
    if (/[a-z]/.test(newPwd)) s++
    if (/\d/.test(newPwd)) s++
    if (/[@$!%*?&]/.test(newPwd)) s++
    return s
  })()

  return (
    <div className="min-h-screen theme-bg theme-text flex overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.aside initial={false} animate={{ width: sidebarOpen ? 220 : 64 }} className="relative z-20 flex-shrink-0 flex flex-col theme-card border-r theme-border h-screen sticky top-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-5 border-b theme-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center flex-shrink-0"><span className="btn-text-white font-bold text-sm">R</span></div>
          <AnimatePresence>{sidebarOpen && (<motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-bold text-lg bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">ResumeAI</motion.span>)}</AnimatePresence>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => (
            <Link key={item.label} href={item.href}>
              <motion.div whileHover={{ x: 4 }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${item.active ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-400' : 'theme-text-secondary hover:bg-white/5 hover:theme-text'}`}>
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <AnimatePresence>{sidebarOpen && (<motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium whitespace-nowrap">{item.label}</motion.span>)}</AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>
        <button onClick={() => setSidebarOpen(o => !o)} className="m-3 p-2 rounded-xl theme-card border theme-border hover:border-sky-500/40 transition-all flex items-center justify-center theme-text-secondary"><motion.span animate={{ rotate: sidebarOpen ? 0 : 180 }}>◀</motion.span></button>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="theme-card border-b theme-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div><h1 className="text-xl font-bold theme-text">Settings</h1><p className="text-xs theme-text-tertiary mt-0.5">Manage your account preferences</p></div>
          <div className="flex items-center gap-3"><ThemeToggle /><button onClick={handleLogout} className="px-4 py-2 text-sm theme-text-secondary hover:theme-text transition-colors rounded-lg hover:bg-white/5">Logout</button></div>
        </header>

        <div className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto">
          <div className="flex gap-1 p-1 rounded-2xl theme-card border theme-border mb-6 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-400' : 'theme-text-secondary hover:bg-white/5 hover:theme-text'}`}><span>{tab.icon}</span><span>{tab.label}</span></button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card title="Personal Information" description="Your name and language preference">
                  <div className="flex items-center gap-4 pb-2"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-xl font-bold btn-text-white flex-shrink-0">{(firstName[0] || '?').toUpperCase()}</div><div><p className="font-semibold theme-text">{firstName} {lastName}</p><p className="text-xs theme-text-tertiary">{user?.email}</p></div></div>
                  <div className="grid grid-cols-2 gap-4"><Field label="First Name" value={firstName} onChange={setFirstName} /><Field label="Last Name" value={lastName} onChange={setLastName} /></div>
                  <Field label="Email Address" value={user?.email || ''} disabled hint="Email cannot be changed." />
                  <div><label className="block text-sm font-medium theme-text mb-1.5">Preferred Language</label><select value={language} onChange={e => setLanguage(e.target.value)} className="theme-input w-full"><option value="en">🇬🇧 English</option><option value="ar">🇸🇦 Arabic</option><option value="fr">🇫🇷 French</option></select></div>
                  {profileMsg && <Alert type={profileState === 'error' ? 'error' : 'success'} message={profileMsg} />}
                  <div className="flex justify-end pt-2"><SaveButton onClick={saveProfile} state={profileState} /></div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card title="Change Password" description="Use a strong password">
                  <Field label="Current Password" value={currentPwd} onChange={setCurrentPwd} type="password" /><Field label="New Password" value={newPwd} onChange={setNewPwd} type="password" />
                  {newPwd && (<div><div className="flex gap-1 mb-1">{[1,2,3,4,5].map(i => (<div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwdStrength ? (pwdStrength <= 2 ? 'bg-red-400' : pwdStrength <= 3 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-white/10'}`} />))}</div><p className="text-xs theme-text-tertiary">{pwdStrength <= 2 ? '⚠️ Weak' : pwdStrength <= 3 ? '🟡 Medium' : '✅ Strong'}</p></div>)}
                  <Field label="Confirm New Password" value={confirmPwd} onChange={setConfirmPwd} type="password" />
                  {pwdMsg && <Alert type={pwdState === 'error' ? 'error' : 'success'} message={pwdMsg} />}
                  <div className="flex justify-end pt-2"><SaveButton onClick={changePassword} state={pwdState} label="Change Password" /></div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div key="privacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card title="Profile Visibility"><Toggle checked={profilePublic} onChange={setProfilePublic} label="Public Profile" /><Toggle checked={shareAnalytics} onChange={setShareAnalytics} label="Share Analytics" /></Card>
                <Card title="Notifications"><Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email Notifications" /><Toggle checked={weeklyReport} onChange={setWeeklyReport} label="Weekly Report" /></Card>
                <Card title="Your Data"><button onClick={exportData} disabled={exportState === 'saving'} className="w-full flex items-center justify-between p-4 rounded-xl theme-card border theme-border group"><div><p className="text-sm font-medium theme-text text-left">Export My Data</p><p className="text-xs theme-text-tertiary">Download JSON</p></div><span className="text-blue-400">{exportState === 'saving' ? '⏳' : '→'}</span></button></Card>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <Card title="Theme"><div className="flex items-center justify-between"><div><p className="text-sm font-medium theme-text">Dark / Light Mode</p></div><ThemeToggle /></div></Card>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div key="danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"><span className="text-2xl">⚠️</span><div><p className="font-semibold text-red-400">Danger Zone</p><p className="text-sm theme-text-secondary mt-1">Actions are irreversible.</p></div></div>
                <Card title="Delete Account"><Field label='Type "DELETE" to confirm' value={deleteConfirm} onChange={setDeleteConfirm} /><motion.button onClick={deleteAccount} disabled={deleteConfirm !== 'DELETE' || deleteState === 'saving'} className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-semibold text-sm disabled:opacity-40">{deleteState === 'saving' ? '⏳ Deleting…' : '🗑️ Delete My Account'}</motion.button></Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div></div>
      </div>
    </div>
  )
}
