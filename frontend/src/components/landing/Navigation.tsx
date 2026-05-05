'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/auth-context'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  const dashboardHref = user?.role === 'recruiter'
    ? '/recruiter-dashboard'
    : user?.role === 'admin'
    ? '/admin-dashboard'
    : '/dashboard'

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'theme-card border-b theme-border' : ''
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
              <span className="btn-text-white font-bold text-lg">R</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
              ResumeAI
            </span>
          </motion.div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium theme-text-muted hover:opacity-100 transition-opacity">Features</a>
            <a href="#how-it-works" className="text-sm font-medium theme-text-muted hover:opacity-100 transition-opacity">How It Works</a>
            <a href="#faq" className="text-sm font-medium theme-text-muted hover:opacity-100 transition-opacity">FAQ</a>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {user ? (
              <>
                <motion.button
                  onClick={handleLogout}
                  className="px-6 py-2 text-sm font-medium theme-text-muted hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout
                </motion.button>
                <Link href={dashboardHref}>
                  <motion.button
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-bold shadow-lg shadow-sky-500/20"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Dashboard
                  </motion.button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <motion.button
                    className="px-6 py-2 text-sm font-medium theme-text-muted hover:theme-text transition-all"
                    whileHover={{ scale: 1.05 }}
                  >
                    Login
                  </motion.button>
                </Link>
                <Link href="/register">
                  <motion.button
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 btn-text-white text-sm font-bold shadow-lg shadow-sky-500/20"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Get Started
                  </motion.button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
