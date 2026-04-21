'use client'

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import type {
  AppLanguageCode,
  AppPreferencesContextValue,
  AppTerminologyDomain,
} from './app-preferences-types'

const DEFAULT_LANGUAGE = (process.env.NEXT_PUBLIC_UI_LANGUAGE || 'ko') as AppLanguageCode
const DEFAULT_DOMAIN = (process.env.NEXT_PUBLIC_TERMINOLOGY_DOMAIN || 'aquaculture') as AppTerminologyDomain

const LANGUAGE_LOCALES: Record<AppLanguageCode, string> = {
  ko: 'ko-KR',
  en: 'en-US',
}

const AVAILABLE_LANGUAGES: readonly AppLanguageCode[] = ['ko', 'en'] as const
const AVAILABLE_DOMAINS: readonly AppTerminologyDomain[] = ['aquaculture', 'generic'] as const

export const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null)

interface AppPreferencesProviderProps {
  children: React.ReactNode
  initialLanguage?: AppLanguageCode
  initialDomain?: AppTerminologyDomain
}

function isLanguageCode(value: string): value is AppLanguageCode {
  return AVAILABLE_LANGUAGES.includes(value as AppLanguageCode)
}

function isDomainId(value: string): value is AppTerminologyDomain {
  return AVAILABLE_DOMAINS.includes(value as AppTerminologyDomain)
}

export function AppPreferencesProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
  initialDomain = DEFAULT_DOMAIN,
}: AppPreferencesProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguageCode>(initialLanguage)
  const [currentDomain, setCurrentDomain] = useState<AppTerminologyDomain>(initialDomain)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedLanguage = localStorage.getItem(STORAGE_KEYS.ui.language)
    if (savedLanguage && isLanguageCode(savedLanguage)) {
      setCurrentLanguage(savedLanguage)
    }

    const savedDomain = localStorage.getItem(STORAGE_KEYS.ui.terminologyDomain)
    if (savedDomain && isDomainId(savedDomain)) {
      setCurrentDomain(savedDomain)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguage
    }
  }, [currentLanguage])

  const setLanguage = useCallback((language: AppLanguageCode) => {
    setCurrentLanguage(language)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ui.language, language)
    }
  }, [])

  const setDomain = useCallback((domain: AppTerminologyDomain) => {
    setCurrentDomain(domain)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ui.terminologyDomain, domain)
    }
  }, [])

  const value = useMemo<AppPreferencesContextValue>(() => ({
    currentLanguage,
    currentDomain,
    locale: LANGUAGE_LOCALES[currentLanguage],
    setLanguage,
    setDomain,
  }), [currentLanguage, currentDomain, setLanguage, setDomain])

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

export function getAvailableLanguages(): readonly AppLanguageCode[] {
  return AVAILABLE_LANGUAGES
}

export function getAvailableDomains(): readonly AppTerminologyDomain[] {
  return AVAILABLE_DOMAINS
}
