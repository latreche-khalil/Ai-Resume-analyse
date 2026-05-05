'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'

type Step = 'email' | 'otp' | 'password' | 'done'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiClient.forgotPassword(email)
      setInfo(res.message || 'Reset code sent! Check your inbox.')
      setStep('otp')
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail || ''
      if (status === 404) {
        setError(`No account found with "${email}". Please register first.`)
      } else if (status === 429) {
        setError('Too many attempts. Please wait a minute and try again.')
      } else if (status === 500) {
        setError('Failed to send email. Please check your email address and try again.')
      } else if (!err?.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 8000.')
      } else {
        setError(detail || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Enter the 6-digit code.')
      return
    }
    setError('')
    setStep('password')
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await apiClient.resetPassword(email, otp, newPwd)
      setStep('done')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Reset failed. The code may have expired.')
    } finally {
      setLoading(false)
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

  const stepLabels = ['Email', 'Verify Code', 'New Password']
  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : step === 'password' ? 2 : 3

  return (
    <div className="theme-card p-8 rounded-3xl shadow-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-2xl mx-auto mb-4">
          🔐
        </div>
        <h2 className="text-3xl font-bold theme-text mb-1">Reset Password</h2>
        <p className="theme-text-muted text-sm">We'll send a 6-digit code to your email</p>
      </div>

      {/* Progress steps */}
      {step !== 'done' && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${i < stepIndex ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  i === stepIndex ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' :
                  'bg-white/5 theme-text-quaternary border theme-border'}`}
              >
                <span>{i < stepIndex ? '✓' : i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-6 h-0.5 rounded-full ${i < stepIndex ? 'bg-green-500/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-sm text-red-400"
          >
            ❌ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 'email' && (
          <motion.form key="email" onSubmit={sendOtp}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium theme-text mb-1.5">Email Address</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="theme-input w-full" placeholder="you@example.com" autoFocus />
              <p className="text-xs theme-text-tertiary mt-1.5">
                Enter the email address linked to your account.
              </p>
            </div>
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold disabled:opacity-60"
            >
              {loading ? '⏳ Sending…' : '📧 Send Reset Code'}
            </motion.button>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form key="otp" onSubmit={verifyOtp}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            {info && (
              <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm text-green-400">
                ✅ {info}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium theme-text mb-1.5">6-Digit Code</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="theme-input w-full text-center text-3xl font-bold tracking-[0.5em]"
                placeholder="000000" autoFocus
              />
              <p className="text-xs theme-text-tertiary mt-1.5">
                Sent to <span className="text-sky-400">{email}</span> · expires in 10 min
              </p>
            </div>
            <motion.button type="submit"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold"
            >
              ✓ Verify Code
            </motion.button>
            <button type="button" onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="w-full text-sm theme-text-tertiary hover:theme-text transition-colors text-center"
            >
              ← Didn't receive it? Resend
            </button>
          </motion.form>
        )}

        {step === 'password' && (
          <motion.form key="password" onSubmit={resetPassword}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium theme-text mb-1.5">New Password</label>
              <input type="password" required value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="theme-input w-full" placeholder="••••••••" autoFocus />
              {newPwd && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                        ${i <= pwdStrength ? (pwdStrength <= 2 ? 'bg-red-400' : pwdStrength <= 3 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="text-xs theme-text-tertiary">
                    {pwdStrength <= 2 ? '⚠️ Weak' : pwdStrength <= 3 ? '🟡 Medium' : '✅ Strong'}
                    {' '}— uppercase, lowercase, number, special char (@$!%*?&)
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium theme-text mb-1.5">Confirm Password</label>
              <input type="password" required value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                className="theme-input w-full" placeholder="••••••••" />
              {confirmPwd && newPwd !== confirmPwd && (
                <p className="text-xs text-red-400 mt-1">⚠️ Passwords do not match</p>
              )}
            </div>
            <motion.button type="submit" disabled={loading || pwdStrength < 3}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold disabled:opacity-60"
            >
              {loading ? '⏳ Resetting…' : '🔐 Reset Password'}
            </motion.button>
          </motion.form>
        )}

        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-4"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-4xl mx-auto"
            >
              ✅
            </motion.div>
            <div>
              <h3 className="text-xl font-bold theme-text mb-2">Password Reset!</h3>
              <p className="theme-text-secondary text-sm">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
            </div>
            <motion.button onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold"
            >
              → Sign In Now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
