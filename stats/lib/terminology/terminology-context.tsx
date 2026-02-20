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
import { aquaculture } from './domains/aquaculture'
import { generic } from './domains/generic'

/**
 * 도메인별 용어 사전 레지스트리
 */
const TERMINOLOGY_REGISTRY: Record<string, TerminologyDictionary> = {
  aquaculture,
  generic
}

/**
 * 기본 도메인 (환경 변수로 설정 가능)
 */
const DEFAULT_DOMAIN = process.env.NEXT_PUBLIC_TERMINOLOGY_DOMAIN || 'aquaculture'

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
  initialDomain?: string
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
  const [currentDomain, setCurrentDomain] = useState(initialDomain)

  // 컴포넌트 마운트 시 localStorage에서 저장된 도메인 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDomain = localStorage.getItem('terminology-domain')
      if (savedDomain && TERMINOLOGY_REGISTRY[savedDomain]) {
        setCurrentDomain(savedDomain)
      }
    }
  }, [])

  // 도메인 변경 핸들러
  const setDomain = useCallback((domain: string) => {
    if (TERMINOLOGY_REGISTRY[domain]) {
      setCurrentDomain(domain)
    } else {
      console.warn(`[TerminologyProvider] Unknown domain: ${domain}. Available: ${Object.keys(TERMINOLOGY_REGISTRY).join(', ')}`)
    }
  }, [])

  // 현재 도메인의 용어 사전
  const dictionary = useMemo(() => {
    return TERMINOLOGY_REGISTRY[currentDomain] || TERMINOLOGY_REGISTRY[DEFAULT_DOMAIN]
  }, [currentDomain])

  const value: TerminologyContextValue = useMemo(
    () => ({
      dictionary,
      setDomain,
      currentDomain
    }),
    [dictionary, setDomain, currentDomain]
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
export function registerTerminology(domain: string, dictionary: TerminologyDictionary) {
  TERMINOLOGY_REGISTRY[domain] = dictionary
}

/**
 * 등록된 도메인 목록 조회
 */
export function getAvailableDomains(): string[] {
  return Object.keys(TERMINOLOGY_REGISTRY)
}
