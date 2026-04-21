'use client'

import { useContext } from 'react'
import { AppPreferencesContext } from '@/lib/preferences/app-preferences-context'

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext)

  if (!context) {
    throw new Error(
      'useAppPreferences must be used within an AppPreferencesProvider'
    )
  }

  return context
}
