'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'

/**
 * ConditionalHeader
 *
 * /smart-flow 경로에서는 전역 헤더를 숨기고,
 * SmartFlowLayout의 통합 헤더를 사용합니다.
 *
 * 다른 모든 페이지에서는 기존 Header를 렌더링합니다.
 */
export function ConditionalHeader() {
  const pathname = usePathname()

  // /smart-flow 경로에서는 헤더 숨김 (SmartFlowLayout이 자체 헤더 사용)
  if (pathname?.startsWith('/smart-flow')) {
    return null
  }

  return <Header />
}
