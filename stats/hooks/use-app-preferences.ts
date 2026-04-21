'use client'

import { useContext } from 'react'
import { AppPreferencesContext } from '@/lib/preferences/app-preferences-context'

export function useOptionalAppPreferences() {
  return useContext(AppPreferencesContext)
}

export function useAppPreferences() {
  const context = useOptionalAppPreferences()

  if (!context) {
    throw new Error(
      'useAppPreferences must be used within an AppPreferencesProvider'
    )
  }

  return context
}
