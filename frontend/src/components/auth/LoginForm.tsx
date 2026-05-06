'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'
import { toast } from 'sonner'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Welcome back! Logging you in...')
      router.push('/dashboard')
    } catch (err: any) {
      setAttempts(prev => prev + 1)
      const msg = err.response?.data?.message || err.message || ''
      
      let errorMsg = 'Something went wrong. Please try again later.'
      if (msg.includes('credentials') || msg.includes('Password')) {
        errorMsg = 'Incorrect email or password. Please try again.'
      } else if (msg.includes('not found') || msg.includes('404')) {
        errorMsg = 'No account found with this email.'
      } else if (msg.includes('inactive')) {
        errorMsg = 'Your account is inactive. Please contact support.'
      } else if (msg.includes('network')) {
        errorMsg = 'Connection error. Please check your internet.'
      }
      
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen theme-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="theme-card p-8 rounded-3xl shadow-2xl">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-4xl font-bold theme-text mb-2">Welcome Back</h2>
            <p className="theme-text-muted">Analyze your career with AI-powered insights</p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* First-time hint */}
            {attempts === 0 && (
              <motion.div
                className="bg-blue-500/10 border border-blue-500/20 px-4 py-3 rounded-xl text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-blue-400 text-xs">
                  💡 New here?{' '}
                  <Link href="/register" className="font-semibold underline hover:text-blue-300">
                    Create a free account
                  </Link>{' '}
                  to get started.
                </p>
              </motion.div>
            )}

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <label className="block text-sm font-medium theme-text mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="theme-input"
                placeholder="you@example.com"
              />
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium theme-text">Password</label>
                <div className="flex items-center gap-3">
                  {attempts >= 2 && (
                    <span className="text-xs text-orange-400 animate-pulse">
                      {attempts} failed attempt{attempts > 1 ? 's' : ''}
                    </span>
                  )}
                  <Link href="/forgot-password"
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl theme-text-tertiary hover:theme-text transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full px-8 py-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white font-semibold text-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </motion.div>

            {/* Sign Up Link */}
            <motion.div
              className="text-center text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="theme-text-secondary">Don't have an account? </span>
              <Link href="/register" className="font-medium theme-text hover:opacity-80">
                Sign up free
              </Link>
            </motion.div>
          </form>
        </div>

        {/* Back to Home */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Link href="/" className="text-sm theme-text-tertiary hover:theme-text transition-colors">
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
