'use client'

/**
 * useTerminology Hook
 *
 * Terminology Context에서 현재 도메인의 용어 사전을 가져오는 Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useTerminology()
 *
 *   return (
 *     <div>
 *       <h2>{t.variables.group.title}</h2>
 *       <p>{t.variables.group.description}</p>
 *     </div>
 *   )
 * }
 * ```
 */

import { useContext } from 'react'
import { TerminologyContext } from '@/lib/terminology/terminology-context'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

/**
 * useTerminology Hook
 *
 * @returns 현재 도메인의 용어 사전
 * @throws Error if used outside TerminologyProvider
 */
export function useTerminology(): TerminologyDictionary {
  const context = useContext(TerminologyContext)

  if (!context) {
    throw new Error(
      'useTerminology must be used within a TerminologyProvider. ' +
      'Wrap your app with <TerminologyProvider> in the root layout.'
    )
  }

  return context.dictionary
}

/**
 * useTerminologyContext Hook
 *
 * Context 전체 (dictionary + setDomain + currentDomain)를 가져옴
 *
 * @example
 * ```tsx
 * function DomainSwitcher() {
 *   const { currentDomain, setDomain } = useTerminologyContext()
 *
 *   return (
 *     <select value={currentDomain} onChange={(e) => setDomain(e.target.value)}>
 *       <option value="aquaculture">수산과학</option>
 *       <option value="generic">범용 통계</option>
 *     </select>
 *   )
 * }
 * ```
 */
export function useTerminologyContext() {
  const context = useContext(TerminologyContext)

  if (!context) {
    throw new Error(
      'useTerminologyContext must be used within a TerminologyProvider'
    )
  }

  return context
}
