'use client'

/**
 * /analysis → / 리다이렉트
 *
 * 통계 분석 페이지는 홈(/)에 통합됨.
 * 기존 북마크/링크 호환을 위해 리다이렉트 유지.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AnalysisRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
