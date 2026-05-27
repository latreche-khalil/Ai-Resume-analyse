'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'
import { 
  User, 
  Lock, 
  Shield, 
  Palette, 
  AlertTriangle, 
  Check, 
  ChevronRight, 
  Mail, 
  Globe, 
  Eye, 
  EyeOff,
  Download,
  Trash2,
  Bell,
  Save,
  Loader2,
  Upload
} from 'lucide-react'

const TABS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'privacy', icon: Shield, label: 'Privacy' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'danger', icon: AlertTriangle, label: 'Danger Zone' },
]

function Field({ label, value, onChange, type = 'text', placeholder = '', disabled = false, hint = '', icon: Icon }: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; disabled?: boolean; hint?: string; icon?: any
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400 ml-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 dark:text-neutral-400 group-focus-within:text-sky-500 transition-colors" />}
        <input 
          type={isPassword && showPassword ? 'text' : type} 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          placeholder={placeholder} 
          disabled={disabled} 
          className={`
            w-full bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl py-3.5 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-12' : 'pl-4'}
            ${isPassword ? 'pr-12' : 'pr-4'}
          `}
          style={{ fontFamily: 'Roboto, sans-serif' }}
        />
        {isPassword && (
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500 dark:text-neutral-400 font-normal ml-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{hint}</p>}
    </div>
  )
}

function Card({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-[#0f0f11] border border-gray-200 dark:border-[#1e1e24] space-y-6 shadow-sm">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-slate-700">
            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
        )}
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg" style={{ fontFamily: 'Roboto, sans-serif' }}>{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-neutral-400 font-normal mt-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

export function SettingsView() {
  const { user, refreshUser } = useAuth() as any
  const [activeTab, setActiveTab] = useState('profile')
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [language, setLanguage]     = useState('en')
  const [saving, setSaving] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name   || '')
      setLanguage(user.preferred_language || 'en')
      // Load profile image from localStorage
      const savedImage = localStorage.getItem(`profile_image_${user.id}`)
      if (savedImage) setProfileImage(savedImage)
    }
  }, [user])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploadingImage(true)
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Create canvas to resize and crop image to circle
        const canvas = document.createElement('canvas')
        const size = 400 // Output size
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Calculate crop dimensions to make it square
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2
          
          // Draw circular clipped image
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
          
          // Convert to base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          setProfileImage(dataUrl)
          
          // Save to localStorage
          if (user?.id) {
            localStorage.setItem(`profile_image_${user.id}`, dataUrl)
          }
          
          toast.success('Profile image updated!')
        }
        setUploadingImage(false)
      }
      
      img.onerror = () => {
        toast.error('Failed to load image')
        setUploadingImage(false)
      }
      
      img.src = event.target?.result as string
    }
    
    reader.onerror = () => {
      toast.error('Failed to read file')
      setUploadingImage(false)
    }
    
    reader.readAsDataURL(file)
  }

  const removeProfileImage = () => {
    setProfileImage(null)
    if (user?.id) {
      localStorage.removeItem(`profile_image_${user.id}`)
    }
    toast.success('Profile image removed')
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await apiClient.updateProfile({ first_name: firstName, last_name: lastName, preferred_language: language })
      if (refreshUser) await refreshUser()
      toast.success('Settings updated successfully')
    } catch (e: any) {
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match')
    setSaving(true)
    try {
      await apiClient.changePassword(currentPwd, newPwd)
      toast.success('Password updated successfully')
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>Settings</h1>
          <p className="text-slate-600 dark:text-neutral-400 text-sm font-normal" style={{ fontFamily: 'Roboto, sans-serif' }}>Manage your profile and platform preferences</p>
        </div>
        <button 
          onClick={activeTab === 'security' ? changePassword : saveProfile} 
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Roboto, sans-serif' }}
        >
          {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-50 dark:bg-[#0c0c0e] border border-gray-200 dark:border-neutral-900 rounded-xl overflow-x-auto hide-scrollbar shadow-sm">
        {TABS.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-white dark:bg-[#18181b] text-blue-600 dark:text-white shadow-md border border-gray-200 dark:border-neutral-800' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.02]'}
            `}
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card title="Identity" subtitle="Personal details and preferences" icon={User}>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800">
                  <div className="relative group">
                    {profileImage ? (
                      <div className="relative">
                        <img 
                          src={profileImage} 
                          alt="Profile" 
                          className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-white dark:ring-slate-800"
                        />
                        {uploadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <button
                          onClick={removeProfileImage}
                          className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {firstName[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <label 
                      htmlFor="profile-image-upload"
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all"
                      title="Upload image"
                    >
                      <Upload className="w-4 h-4" />
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-slate-900 dark:text-white font-bold text-xl" style={{ fontFamily: 'Roboto, sans-serif' }}>{firstName} {lastName}</h4>
                    <p className="text-slate-500 dark:text-neutral-400 text-sm mt-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{user?.email}</p>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Click the upload button to add your profile picture. Square images work best.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="John" icon={User} />
                  <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Doe" icon={User} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Email Address" value={user?.email || ''} disabled hint="Email verification is linked to your primary account." icon={Mail} />
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold tracking-wide text-slate-500 dark:text-neutral-400 ml-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Preferred Language</label>
                    <div className="relative group">
                       <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 dark:text-neutral-400" />
                       <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all appearance-none cursor-pointer" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          <option value="en">English (Global)</option>
                          <option value="ar">Arabic (العربية)</option>
                          <option value="fr">French (Français)</option>
                       </select>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <Card title="Authentication" subtitle="Secure your account with a strong password" icon={Lock}>
              <div className="space-y-6">
                <Field label="Current Password" type="password" value={currentPwd} onChange={setCurrentPwd} icon={Lock} />
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <Field label="New Password" type="password" value={newPwd} onChange={setNewPwd} icon={Lock} />
                <Field label="Confirm New Password" type="password" value={confirmPwd} onChange={setConfirmPwd} icon={Lock} />
              </div>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card title="Data & Privacy" icon={Shield}>
                <div className="space-y-6">
                  <ToggleItem label="Public Profile" desc="Allow recruiters to find your profile in talent search." />
                  <ToggleItem label="AI Training" desc="Anonymous data contribution to improve matching models." active />
                  <ToggleItem label="Marketing" desc="Receive career growth insights and system updates." />
                </div>
              </Card>
              <Card title="Data Portability" icon={Download}>
                 <button className="w-full p-6 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800 flex items-center justify-between group hover:border-sky-500/50 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-all">
                    <div className="text-left space-y-1.5">
                       <h4 className="text-slate-900 dark:text-white font-semibold text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>Download Archive</h4>
                       <p className="text-sm text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Request a complete JSON export of your neural data.</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 dark:text-neutral-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                 </button>
              </Card>
            </div>
          )}

          {activeTab === 'appearance' && (
            <Card title="Visual Theme" icon={Palette}>
               <div className="flex items-center justify-between p-6 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-gray-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                     <h4 className="text-slate-900 dark:text-white font-semibold text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>Adaptive Interface</h4>
                     <p className="text-sm text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>Toggle between dark and light cinematic modes.</p>
                  </div>
                  <ThemeToggle />
               </div>
            </Card>
          )}

          {activeTab === 'danger' && (
            <Card title="Termination" subtitle="Irreversible account actions" icon={AlertTriangle}>
               <div className="p-6 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 space-y-6">
                  <div className="space-y-2">
                     <h4 className="text-rose-600 dark:text-rose-400 font-bold text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>Delete Account</h4>
                     <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        This will permanently erase your resumes, analyses, and interview history. This action cannot be undone.
                     </p>
                  </div>
                  <div className="space-y-4">
                     <input 
                        type="text" 
                        value={deleteConfirm} 
                        onChange={e => setDeleteConfirm(e.target.value)} 
                        placeholder="Type DELETE to confirm" 
                        className="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-900/50 rounded-xl py-3.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all" 
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                     />
                     <button disabled={deleteConfirm !== 'DELETE'} className="w-full py-4 bg-rose-500 hover:bg-rose-600 border border-rose-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-500/20" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Permanently Delete Account
                     </button>
                  </div>
               </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ToggleItem({ label, desc, active = false }: { label: string; desc: string; active?: boolean }) {
  const [isOn, setIsOn] = useState(active)
  return (
    <div className="flex items-center justify-between group">
      <div className="space-y-1.5">
        <h4 className="text-slate-900 dark:text-white font-semibold text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>{label}</h4>
        <p className="text-sm text-slate-500 dark:text-neutral-400" style={{ fontFamily: 'Roboto, sans-serif' }}>{desc}</p>
      </div>
      <button 
        onClick={() => setIsOn(!isOn)}
        className={`w-14 h-7 rounded-full transition-all relative ${isOn ? 'bg-sky-500 shadow-lg shadow-sky-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isOn ? 'left-8' : 'left-1'}`} />
      </button>
    </div>
  )
}
