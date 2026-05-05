'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { SettingsView } from '@/components/candidate/SettingsView'

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate']}>
      <SettingsView />
    </ProtectedRoute>
  )
}
