'use client'

import { motion } from 'framer-motion'

export type AnalysisLanguage = 'en' | 'ar' | 'fr'

interface LanguageSelectorProps {
  value: AnalysisLanguage
  onChange: (language: AnalysisLanguage) => void
  disabled?: boolean
}

export function LanguageSelector({ value, onChange, disabled = false }: LanguageSelectorProps) {
  const languages = [
    { code: 'en' as const, label: 'English', flag: '🇺🇸' },
    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' },
    { code: 'fr' as const, label: 'Français', flag: '🇫🇷' }
  ]

  return (
    <div className="space-y-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
      <div className="grid grid-cols-3 gap-2">
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => !disabled && onChange(lang.code)}
            disabled={disabled}
            className={`relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              value === lang.code
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-[#0f0f11] text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-[#1e1e24] hover:border-blue-300 dark:hover:border-blue-600/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-xs font-semibold">{lang.label}</span>
            </div>
            {value === lang.code && (
              <motion.div
                layoutId="language-indicator"
                className="absolute inset-0 rounded-xl border-2 border-blue-400"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
