'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { Eye, EyeOff, Mail, Lock, ArrowRight, User, Briefcase, UserCircle, Shield, Sparkles, AlertCircle } from 'lucide-react'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { toast } from 'sonner'

export function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate' as 'candidate' | 'recruiter'
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (formData.password !== formData.confirmPassword) {
      const msg = 'Passwords do not match'
      setError(msg)
      toast.error(msg)
      return
    }

    setLoading(true)
    try {
      await register({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        first_name: formData.firstName,
        last_name: formData.lastName
      })
      toast.success('Account created successfully!')
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <>
      <AuthHeader />
      <div className="min-h-screen bg-white dark:bg-slate-700 flex items-center justify-center relative overflow-hidden pt-20 pb-12">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 xl:gap-16">
            
            {/* Left Content - Marketing */}
            <motion.div
              className="hidden lg:flex w-full lg:w-1/2 flex-col"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-8">


                <div className="space-y-6">
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
                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                      Join the future of <span className="text-sky-500">hiring.</span>
                    </h1>
                    <p className="text-lg lg:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-xl">
                      Create your account and experience the power of explainable AI in your career journey.
                    </p>
                  </motion.div>

                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    {[
                      { icon: Shield, text: 'Privacy Protected' },
                      { icon: Sparkles, text: 'AI Career Coach' },
                      { icon: Briefcase, text: 'Smart Job Matching' },
                      { icon: UserCircle, text: 'Personal Branding' }
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3 text-gray-800 dark:text-gray-200 bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 p-3 rounded-xl">
                        <feature.icon className="w-5 h-5 text-sky-500" />
                        <span className="text-sm font-medium">{feature.text}</span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Right Content - Form */}
            <motion.div
              className="w-full lg:w-[500px] xl:w-[550px]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-gray-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
                
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h2>
                  <p className="text-gray-600 dark:text-gray-400">Join 10,000+ professionals using ResumeAI</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Alert */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">Registration Failed</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        First Name
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={(e) => {
                            handleChange(e)
                            setError(null)
                          }}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                            error ? 'border-red-300 dark:border-red-900/50' : focusedField === 'firstName' ? 'border-sky-500 shadow-sm' : 'border-gray-200 dark:border-slate-700'
                          }`}
                          placeholder="John"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Last Name
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={(e) => {
                            handleChange(e)
                            setError(null)
                          }}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                            error ? 'border-red-300 dark:border-red-900/50' : focusedField === 'lastName' ? 'border-sky-500 shadow-sm' : 'border-gray-200 dark:border-slate-700'
                          }`}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                          focusedField === 'email' ? 'border-sky-500 shadow-sm' : 'border-gray-200 dark:border-slate-700'
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                      I am a...
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'candidate' }))}
                        className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 ${
                          formData.role === 'candidate'
                            ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                            : 'bg-white dark:bg-slate-900/30 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>Candidate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: 'recruiter' }))}
                        className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 ${
                          formData.role === 'recruiter'
                            ? 'bg-sky-500/10 border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                            : 'bg-white dark:bg-slate-900/30 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>Recruiter</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-11 pr-11 py-3 bg-white dark:bg-slate-900/50 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                            focusedField === 'password' ? 'border-sky-500 shadow-sm' : 'border-gray-200 dark:border-slate-700'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                        Confirm
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onFocus={() => setFocusedField('confirmPassword')}
                          onBlur={() => setFocusedField(null)}
                          className={`w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border rounded-xl text-gray-900 dark:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                            focusedField === 'confirmPassword' ? 'border-sky-500 shadow-sm' : 'border-gray-200 dark:border-slate-700'
                          }`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative group mt-4 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative z-10 flex items-center justify-center space-x-2">
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Get Started</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>

                  <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-sky-500 font-semibold hover:text-sky-600 underline-offset-4 hover:underline transition-all">
                      Sign In
                    </Link>
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}
