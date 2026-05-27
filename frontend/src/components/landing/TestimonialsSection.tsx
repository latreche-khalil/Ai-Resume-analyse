'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, Quote, ChevronDown, ChevronUp, ShieldCheck, Loader2 } from 'lucide-react'

interface Testimonial {
  id: number
  name: string
  role: string | null
  company: string | null
  avatar_url: string | null
  content: string
  rating: number
  is_verified: boolean
  created_at: string
  isReal?: boolean
}

// ── Permanent mock testimonials (always shown) ─────────────────────────────
const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: -1,
    name: 'Sarah Johnson',
    role: 'Software Engineer',
    company: 'Google',
    avatar_url: null,
    content: 'This platform helped me understand exactly why my CV was not getting responses. The explainable AI feature showed me which skills to highlight and how to restructure my experience. I got 3 interviews within a week!',
    rating: 5,
    is_verified: true,
    created_at: '2026-04-15',
  },
  {
    id: -2,
    name: 'Ahmed Hassan',
    role: 'Data Scientist',
    company: 'Microsoft',
    avatar_url: null,
    content: 'Unlike ChatGPT which gives generic advice, this tool provided specific, data-driven insights about my CV. The privacy-first approach with PII masking gave me confidence to use it for sensitive applications.',
    rating: 5,
    is_verified: true,
    created_at: '2026-04-10',
  },
  {
    id: -3,
    name: 'Maria Garcia',
    role: 'Product Manager',
    company: 'Amazon',
    avatar_url: null,
    content: 'The semantic matching algorithm is incredibly accurate. It understood the context of my experience and matched it perfectly with job requirements. The gap analysis helped me identify exactly what skills to develop.',
    rating: 5,
    is_verified: true,
    created_at: '2026-04-05',
  },
  {
    id: -4,
    name: 'David Chen',
    role: 'UX Designer',
    company: 'Apple',
    avatar_url: null,
    content: 'The interview preparation feature is a game-changer. It analyzed my CV and generated relevant questions I might face. The real-time feedback helped me improve my answers significantly.',
    rating: 5,
    is_verified: true,
    created_at: '2026-03-28',
  },
  {
    id: -5,
    name: 'Emily Brown',
    role: 'Marketing Manager',
    company: 'Meta',
    avatar_url: null,
    content: 'I have tried many CV tools, but this is the only one that explains WHY. The XAI reports showed me exactly which parts of my CV matched the job description and which did not. Incredibly valuable!',
    rating: 5,
    is_verified: true,
    created_at: '2026-03-20',
  },
  {
    id: -6,
    name: 'James Wilson',
    role: 'DevOps Engineer',
    company: 'Netflix',
    avatar_url: null,
    content: 'The platform is not just a CV analyzer, it is a complete career intelligence tool. The coaching features and personalized recommendations helped me land my dream job. Worth every penny!',
    rating: 5,
    is_verified: true,
    created_at: '2026-03-15',
  },
]

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14}
          className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 dark:fill-gray-600 text-gray-300 dark:text-gray-600'}
        />
      ))}
    </div>
  )
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function TestimonialCard({ t, index, isInView }: { t: Testimonial; index: number; isInView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.07 * index }}
      className="relative h-full"
    >
      <div className="h-full p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/50 hover:border-sky-300 dark:hover:border-sky-600/50 hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 shadow-md flex flex-col">
        {/* Real badge */}
        {t.isReal && (
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <ShieldCheck size={10} /> Real User
          </div>
        )}

        {/* Quote */}
        <Quote size={28} className="text-sky-500/20 dark:text-sky-400/20 mb-3 shrink-0" />

        {/* Stars */}
        <Stars rating={t.rating} />

        {/* Content */}
        <p className="text-gray-700 dark:text-gray-200 mt-3 mb-5 leading-relaxed text-sm flex-1">
          "{t.content}"
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-700/50 mt-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
            {t.avatar_url
              ? <img src={t.avatar_url} alt={t.name} className="w-full h-full rounded-full object-cover" />
              : getInitials(t.name)
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{t.name}</span>
              {t.is_verified && (
                <svg className="w-3.5 h-3.5 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {(t.role || t.company) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t.role}{t.role && t.company ? ' · ' : ''}{t.company}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const [realTestimonials, setRealTestimonials] = useState<Testimonial[]>([])
  const [showReal, setShowReal] = useState(false)
  const [loadingReal, setLoadingReal] = useState(false)
  const [realLoaded, setRealLoaded] = useState(false)

  const loadReal = async () => {
    if (realLoaded) { setShowReal(v => !v); return }
    setLoadingReal(true)
    try {
      const res = await fetch('/api/v1/testimonials/public')
      if (res.ok) {
        const data = await res.json()
        setRealTestimonials((data as Testimonial[]).map(t => ({ ...t, isReal: true })))
      }
    } catch (e) {
      console.error('Failed to load real testimonials:', e)
    } finally {
      setLoadingReal(false)
      setRealLoaded(true)
      setShowReal(true)
    }
  }

  return (
    <section ref={ref} id="testimonials" className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-gray-900 dark:text-white">Loved by </span>
            <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">professionals</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mt-4 max-w-2xl mx-auto">
            Join thousands of job seekers who transformed their careers with our AI-powered platform
          </p>
        </motion.div>

        {/* Mock testimonials — always visible */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.id} t={t} index={i} isInView={isInView} />
          ))}
        </div>

        {/* See More button */}
        <motion.div className="flex justify-center mt-10"
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
        >
          <button
            onClick={loadReal}
            disabled={loadingReal}
            className="flex items-center gap-2.5 px-7 py-3.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 hover:shadow-lg hover:shadow-sky-500/10 transition-all text-sm shadow-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {loadingReal
              ? <><Loader2 size={16} className="animate-spin" /> Loading...</>
              : showReal
                ? <><ChevronUp size={16} /> Hide Community Reviews</>
                : <><ChevronDown size={16} /> See Community Reviews {realTestimonials.length > 0 && `(${realTestimonials.length})`}</>
            }
          </button>
        </motion.div>

        {/* Real testimonials — shown on click */}
        <AnimatePresence>
          {showReal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {realTestimonials.length === 0 ? (
                <div className="mt-8 flex flex-col items-center justify-center py-14 bg-white dark:bg-slate-800/40 border border-dashed border-gray-300 dark:border-slate-600 rounded-2xl text-center">
                  <Star size={36} className="text-gray-300 dark:text-slate-600 mb-3" />
                  <p className="text-gray-500 dark:text-neutral-400 font-medium">No community reviews yet</p>
                  <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Be the first to share your experience!</p>
                </div>
              ) : (
                <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {realTestimonials.map((t, i) => (
                    <TestimonialCard key={t.id} t={t} index={i} isInView={true} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <motion.div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {[
            { value: '10,000+', label: 'Happy Users' },
            { value: '4.9/5',   label: 'Average Rating' },
            { value: '95%',     label: 'Success Rate' },
            { value: '50,000+', label: 'CVs Analyzed' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{s.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{s.label}</div>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
