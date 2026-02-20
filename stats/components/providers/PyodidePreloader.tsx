'use client'

/**
 * Pyodide 백그라운드 프리로더
 *
 * 루트 레이아웃에 배치되어 브라우저 유휴 시간에 Pyodide를 미리 초기화합니다.
 * - requestIdleCallback으로 메인 스레드 블로킹 없이 로드
 * - 통계 페이지 진입 전에 미리 준비 완료
 * - Service Worker 캐시와 연동하여 F5 시에도 빠른 복원
 * - UI를 표시하지 않는 투명 컴포넌트
 *
 * 동작 흐름:
 * 1. 루트 레이아웃 마운트 시 requestIdleCallback 예약
 * 2. 브라우저 유휴 시간에 PyodideStatisticsService.initialize() 호출
 * 3. Singleton 패턴으로 인해 PyodideProvider와 자연스럽게 공유
 *    - Provider가 마운트 시 isInitialized() 체크 → 이미 완료면 즉시 사용
 *    - Provider가 먼저 시작해도 loadPromise 재사용으로 안전
 * 4. 프리로드 실패는 무시 (통계 페이지 진입 시 Provider가 재시도)
 */

import { useEffect, useRef } from 'react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

/**
 * requestIdleCallback 호출 (SSR 안전 + Safari 폴리필)
 * useEffect 내부에서만 호출됨 (window 존재 보장)
 */
function scheduleIdle(cb: () => void): number {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(cb)
  }
  // Safari 등 미지원 브라우저: 1초 후 실행
  return setTimeout(cb, 1000) as unknown as number
}

function cancelScheduledIdle(handle: number): void {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle)
  } else {
    clearTimeout(handle)
  }
}

export function PyodidePreloader() {
  const startedRef = useRef(false)

  useEffect(() => {
    // SSR 방어
    if (typeof window === 'undefined') return

    // 이미 초기화 시작했으면 스킵
    if (startedRef.current) return
    startedRef.current = true

    // 이미 초기화 완료된 경우 스킵
    const coreService = PyodideCoreService.getInstance()
    if (coreService.isInitialized()) {
      console.log('[PyodidePreloader] 이미 초기화됨 - 프리로드 스킵')
      return
    }

    // 브라우저 유휴 시간에 프리로드 시작
    const idleHandle = scheduleIdle(() => {
      console.log('[PyodidePreloader] 백그라운드 프리로드 시작')
      const startTime = performance.now()

      const service = PyodideStatisticsService.getInstance()
      service.initialize().then(() => {
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2)
        console.log(`[PyodidePreloader] 백그라운드 프리로드 완료 (${elapsed}초)`)
      }).catch((err: unknown) => {
        // 프리로드 실패는 치명적이지 않음
        // 사용자가 통계 페이지 진입 시 PyodideProvider가 다시 시도함
        const message = err instanceof Error ? err.message : String(err)
        console.warn('[PyodidePreloader] 백그라운드 프리로드 실패 (통계 페이지 진입 시 재시도):', message)
      })
    })

    return () => {
      cancelScheduledIdle(idleHandle)
    }
  }, [])

  // UI를 표시하지 않는 투명 컴포넌트
  return null
}
