'use client'

import { motion } from 'framer-motion'

export type AnalysisLanguage = 'en' | 'ar'

interface LanguageSelectorProps {
  value: AnalysisLanguage
  onChange: (language: AnalysisLanguage) => void
  disabled?: boolean
}

export function LanguageSelector({ value, onChange, disabled = false }: LanguageSelectorProps) {
  const languages = [
    { code: 'en' as const, label: 'English', flag: '🇺🇸' },
    { code: 'ar' as const, label: 'العربية', flag: '🇸🇦' }
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/60">Analysis Language:</span>
      <div className="flex bg-white/10 rounded-lg p-1">
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => !disabled && onChange(lang.code)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              value === lang.code
                ? 'bg-purple-600 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
          >
            <span className="mr-1">{lang.flag}</span>
            {lang.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
