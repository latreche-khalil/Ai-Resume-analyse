'use client'

import React from 'react'

export function PrivacyIndicator() {
  return (
    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
      <span className="text-sm">🛡️</span>
      <p className="text-[10px] theme-text font-medium uppercase tracking-wider">Neural Privacy Active: Data is encrypted and anonymized</p>
    </div>
  )
}
