'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export function ForgotPasswordView() {
  return (
    <div className="min-h-screen theme-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 theme-glow-bg" />
        <div className="absolute top-0 left-1/4 w-96 h-96 theme-glow-1 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 theme-glow-2 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <motion.div 
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <ForgotPasswordForm />

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm theme-text-muted hover:opacity-100 transition-opacity">
            ← Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
