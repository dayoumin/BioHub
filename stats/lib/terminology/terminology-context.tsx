'use client'

/**
 * Terminology Context
 *
 * 도메인별 용어 사전을 전역으로 제공하는 React Context
 * - 앱 최상위에서 TerminologyProvider로 감싸면 모든 하위 컴포넌트에서 useTerminology() 사용 가능
 * - 런타임에 도메인 전환 가능 (수산과학 ↔ 범용 통계)
 */

import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { TerminologyContextValue, TerminologyDictionary } from './terminology-types'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import { AppPreferencesContext } from '@/lib/preferences/app-preferences-context'
import type { AppLanguageCode, AppTerminologyDomain } from '@/lib/preferences'
import { resolveTerminologyDictionary } from './resolve-terminology-dictionary'

/**
 * 런타임 exact dictionary override registry
 */
const CUSTOM_TERMINOLOGY_REGISTRY: Partial<Record<AppTerminologyDomain, Partial<Record<AppLanguageCode, TerminologyDictionary<string>>>>> = {}

/**
 * 기본 도메인 (환경 변수로 설정 가능)
 */
const DEFAULT_DOMAIN = (process.env.NEXT_PUBLIC_TERMINOLOGY_DOMAIN || 'aquaculture') as AppTerminologyDomain
const DEFAULT_LANGUAGE = (process.env.NEXT_PUBLIC_UI_LANGUAGE || 'ko') as AppLanguageCode
const DEFAULT_LOCALE = DEFAULT_LANGUAGE === 'en' ? 'en-US' : 'ko-KR'

/**
 * Terminology Context
 */
export const TerminologyContext = createContext<TerminologyContextValue | null>(null)

/**
 * Terminology Provider Props
 */
export interface TerminologyProviderProps {
  children: React.ReactNode
  /** 초기 도메인 (기본값: 'aquaculture') */
  initialDomain?: AppTerminologyDomain
}

/**
 * Terminology Provider
 *
 * @example
 * ```tsx
 * <TerminologyProvider initialDomain="aquaculture">
 *   <App />
 * </TerminologyProvider>
 * ```
 */
export function TerminologyProvider({
  children,
  initialDomain = DEFAULT_DOMAIN
}: TerminologyProviderProps) {
  const preferences = React.useContext(AppPreferencesContext)
  const [legacyDomain, setLegacyDomain] = useState<AppTerminologyDomain>(initialDomain)
  const [legacyLanguage, setLegacyLanguage] = useState<AppLanguageCode>(DEFAULT_LANGUAGE)

  // 컴포넌트 마운트 시 localStorage에서 저장된 도메인 불러오기
  useEffect(() => {
    if (preferences || typeof window === 'undefined') {
      return
    }

    const savedLanguage = localStorage.getItem(STORAGE_KEYS.ui.language)
    if (savedLanguage === 'ko' || savedLanguage === 'en') {
      setLegacyLanguage(savedLanguage)
    }

    const savedDomain = localStorage.getItem(STORAGE_KEYS.ui.terminologyDomain)
    if (savedDomain === 'aquaculture' || savedDomain === 'generic') {
      setLegacyDomain(savedDomain as AppTerminologyDomain)
    }
  }, [preferences])

  const currentDomain = preferences?.currentDomain ?? legacyDomain
  const currentLanguage = preferences?.currentLanguage ?? legacyLanguage
  const locale = preferences?.locale ?? DEFAULT_LOCALE

  // 레거시 standalone 사용처와의 호환을 위한 fallback persistence
  const setDomain = useCallback((domain: AppTerminologyDomain) => {
    if (preferences) {
      preferences.setDomain(domain)
      return
    }

    setLegacyDomain(domain)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ui.terminologyDomain, domain)
    }
  }, [preferences])

  const setLanguage = useCallback((language: AppLanguageCode) => {
    if (preferences) {
      preferences.setLanguage(language)
      return
    }

    setLegacyLanguage(language)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ui.language, language)
      document.documentElement.lang = language
    }
  }, [preferences])

  // 현재 도메인의 용어 사전
  const dictionary = useMemo(() => {
    const custom = CUSTOM_TERMINOLOGY_REGISTRY[currentDomain]?.[currentLanguage]
    if (custom) {
      return custom
    }

    return resolveTerminologyDictionary(currentLanguage, currentDomain)
  }, [currentDomain, currentLanguage])

  const value: TerminologyContextValue = useMemo(
    () => ({
      dictionary,
      setDomain,
      currentDomain,
      currentLanguage,
      locale,
      setLanguage,
    }),
    [dictionary, setDomain, currentDomain, currentLanguage, locale, setLanguage]
  )

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  )
}

/**
 * 새 도메인 용어 사전 등록
 *
 * @example
 * ```ts
 * registerTerminology('medical', medicalDictionary)
 * ```
 */
export function registerTerminology(domain: AppTerminologyDomain, dictionary: TerminologyDictionary) {
  const language = dictionary.language
  const currentEntry = CUSTOM_TERMINOLOGY_REGISTRY[domain] ?? {}
  CUSTOM_TERMINOLOGY_REGISTRY[domain] = {
    ...currentEntry,
    [language]: {
      ...dictionary,
      domain,
    },
  }
}

/**
 * 등록된 도메인 목록 조회
 */
export function getAvailableDomains(): AppTerminologyDomain[] {
  const defaults: AppTerminologyDomain[] = ['aquaculture', 'generic']
  const custom = Object.keys(CUSTOM_TERMINOLOGY_REGISTRY)
    .filter((domain): domain is AppTerminologyDomain => (
      domain === 'aquaculture' || domain === 'generic'
    ))

  return [...new Set([...defaults, ...custom])]
}
