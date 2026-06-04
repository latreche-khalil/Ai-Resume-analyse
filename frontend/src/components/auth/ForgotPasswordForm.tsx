'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowRight, CheckCircle2, Key, Lock, Eye, EyeOff, ShieldCheck, Sparkles, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { AuthHeader } from '@/components/auth/AuthHeader'
import Link from 'next/link'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Email, 2: Code, 3: New Password

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.forgotPassword(email)
      setStep(2)
      toast.success('Verification code sent!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 4) {
      toast.error('Please enter a valid code')
      return
    }
    setStep(3)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await apiClient.resetPassword(email, code, newPassword)
      toast.success('Password updated successfully!')
      setTimeout(() => window.location.href = '/login', 1500)
    } catch (err: any) {
      toast.error(err.message || 'Reset failed. Check your code.')
    } finally {
      setLoading(false)
    }
  }

  const getStepInfo = () => {
    switch(step) {
      case 1:
        return {
          title: "Identify Account",
          desc: "Enter the email associated with your account so we can verify your identity.",
          features: [
            { icon: Mail, text: "Secure email verification" },
            { icon: Shield, text: "Protected authentication channel" }
          ]
        }
      case 2:
        return {
          title: "Verify Identity",
          desc: "We've sent a 6-digit security code to your inbox. This ensures only you can access your account.",
          features: [
            { icon: Key, text: "One-time security code" },
            { icon: ShieldCheck, text: "Multi-factor protection" }
          ]
        }
      case 3:
        return {
          title: "Secure Account",
          desc: "Create a strong, new password to regain access to your career platform.",
          features: [
            { icon: Lock, text: "End-to-end encrypted storage" },
            { icon: Sparkles, text: "Instant account recovery" }
          ]
        }
      default: return { title: "", desc: "", features: [] }
    }
  }

  const info = getStepInfo()

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen bg-white dark:bg-slate-700 flex items-center justify-center relative overflow-hidden pt-16">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12 xl:gap-16 py-4">
            
            {/* Left Column: Info */}
            <motion.div
              className="w-full lg:w-1/2 flex flex-col pt-12"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <span className="text-sky-500 font-bold text-sm tracking-widest uppercase">Step 0{step}</span>
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                      {info.title}
                    </h1>                    <p className="text-base lg:text-lg text-gray-700 dark:text-gray-300 leading-relaxed max-w-md">
                      {info.desc}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {info.features.map((f, i) => (
                      <div key={i} className="flex items-center space-x-4 text-gray-800 dark:text-gray-200">
                        <div className="w-10 h-10 rounded-lg bg-gray-900/5 dark:bg-white/5 border border-gray-900/10 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                          <f.icon className="w-5 h-5 text-sky-400" />
                        </div>
                        <span className="text-base font-medium">{f.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Need help? <a href="mailto:support@resumeai.com" className="text-sky-400 hover:underline">Contact Support</a>
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Right Column: Form */}
            <motion.div
              className="w-full lg:w-1/2 flex items-start justify-center pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-full max-w-md">
                <div className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-600" />

                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                        <div className="mb-8">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Enter your email to receive a reset code</p>
                        </div>
                        <form onSubmit={handleSendCode} className="space-y-4">
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sky-500" />
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:outline-none" placeholder="you@example.com" />
                          </div>
                          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50">
                            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span>Send Reset Code</span><ArrowRight className="w-4 h-4" /></>}
                          </button>
                        </form>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                        <div className="mb-8">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Code</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Check your inbox for the 6-digit code</p>
                        </div>
                        <form onSubmit={handleVerifyCode} className="space-y-4">
                          <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-amber-500" />
                            <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white tracking-[0.5em] font-mono focus:ring-2 focus:ring-amber-500/50 focus:outline-none" placeholder="000000" maxLength={6} />
                          </div>
                          <button type="submit" className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center space-x-2">
                            <span>Continue</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-gray-500 hover:text-sky-500 transition-colors text-center">Back to email</button>
                        </form>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                        <div className="mb-8">
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">New Password</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Set a strong password to secure your account</p>
                        </div>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sky-500" />
                              <input type={showPassword ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:outline-none" placeholder="••••••••" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500 z-10 transition-colors">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                            <div className="relative group">
                              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sky-500" />
                              <input type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 focus:outline-none" placeholder="••••••••" />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500 z-10 transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-sky-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-4">
                            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span>Update Password</span><CheckCircle2 className="w-4 h-4" /></>}
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-gray-500 hover:text-sky-400 transition-colors inline-flex items-center space-x-2">
                    <span>←</span>
                    <span>Back to sign in</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
