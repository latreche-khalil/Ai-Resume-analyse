'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Shield, AlertCircle } from 'lucide-react'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { toast } from 'sonner'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { login } = useAuth()
  const pathname = usePathname()
  
  const isRegisterPage = pathname?.includes('register')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      toast.success('Welcome back!')
    } catch (err: any) {
      // Show the exact error message from the backend
      const msg = err?.message || 'Login failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen bg-white dark:bg-slate-700 flex items-center justify-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12 xl:gap-16 py-4">
            
            <motion.div
              className="w-full lg:w-1/2 flex flex-col pt-12"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              style={{ order: isRegisterPage ? 2 : 1 }}
            >
              <div className="flex flex-col justify-start space-y-4">


                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                  >
                    {/* Logo mark */}
                    <div className="flex items-center gap-3 mb-6">
                      <img src="/logo-new.svg" alt="ResumeAI" className="w-12 h-12" />
                      <span className="text-2xl font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">ResumeAI</span>
                    </div>
                    <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
                      Welcome back!
                    </h1>
                    <p className="text-base lg:text-lg xl:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                      Sign in to access your AI-powered career intelligence platform.
                    </p>
                  </motion.div>

                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    {[
                      { icon: Shield, text: 'Privacy-first PII masking' },
                      { icon: Sparkles, text: '95% semantic matching accuracy' },
                      { icon: Lock, text: 'Enterprise-grade security' }
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-4 text-gray-800 dark:text-gray-200">
                        <div className="w-10 h-10 rounded-lg bg-gray-900/5 dark:bg-white/5 border border-gray-900/10 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-sky-400" />
                        </div>
                        <span className="text-base">{feature.text}</span>
                      </div>
                    ))}
                  </motion.div>
                </div>

                <div className="mt-auto pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    © 2026 ResumeAI. Powered by explainable AI.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="w-full lg:w-1/2 flex items-start justify-center pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ order: isRegisterPage ? 1 : 2 }}
            >
              <motion.div
                className="w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                  {/* Accent line */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-600" />


                  <div className="mb-5 sm:mb-6 md:mb-8">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Sign in</h2>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">Enter your credentials to continue</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    {/* Error Alert */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">Login Failed</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email address
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setError(null) // Clear error when user types
                          }}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-[3.25rem] pr-4 py-3.5 bg-white dark:bg-slate-800/50 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                            error ? 'border-red-300 dark:border-red-900/50' : focusedField === 'email' ? 'border-sky-500/50' : 'border-gray-300 dark:border-slate-600/50'
                          }`}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Password
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value)
                            setError(null) // Clear error when user types
                          }}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-[3.25rem] pr-12 py-3.5 bg-white dark:bg-slate-800/50 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                            error ? 'border-red-300 dark:border-red-900/50' : focusedField === 'password' ? 'border-sky-500/50' : 'border-gray-300 dark:border-slate-600/50'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full py-3 sm:py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none text-sm sm:text-base"
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign in</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    <div className="relative my-5 sm:my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-slate-600/50" />
                      </div>
                      <div className="relative flex justify-center text-xs sm:text-sm">
                        <span className="px-3 sm:px-4 bg-gray-50 dark:bg-slate-700/60 text-gray-600 dark:text-gray-400">
                          Don't have an account?
                        </span>
                      </div>
                    </div>

                    <Link
                      href="/register"
                      className="block w-full py-2.5 sm:py-3 md:py-3.5 bg-white dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-600/50 text-gray-900 dark:text-white font-semibold rounded-lg sm:rounded-xl text-center transition-all duration-200 text-sm sm:text-base"
                    >
                      Create free account
                    </Link>
                  </form>
                </div>

                <div className="mt-3 sm:mt-4 text-center">
                  <Link
                    href="/"
                    className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors inline-flex items-center space-x-1"
                  >
                    <span>←</span>
                    <span>Back to home</span>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}