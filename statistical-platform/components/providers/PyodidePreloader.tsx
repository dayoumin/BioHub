'use client'

/**
 * Pyodide 백그라운드 프리로딩 컴포넌트
 *
 * 메인 화면 접속 시 조용히 Pyodide를 다운로드
 * - 모달 표시 없음 (백그라운드 다운로드)
 * - 우측 하단에 작은 인디케이터만 표시
 * - 통계 페이지 이동 시 즉시 사용 가능
 */

import { useEffect, useState } from 'react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

export function PyodidePreloader() {
  const [isPreloading, setIsPreloading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const coreService = PyodideCoreService.getInstance()

    // 이미 초기화된 경우 무시
    if (coreService.isInitialized()) {
      return
    }

    // 백그라운드 프리로딩 시작
    const startPreloading = async () => {
      setIsPreloading(true)

      // 진행률 리스너 등록
      const removeListener = coreService.onProgress((progressInfo) => {
        setProgress(progressInfo.progress)
      })

      try {
        console.log('[PyodidePreloader] 백그라운드 프리로딩 시작...')
        await coreService.initialize()
        console.log('[PyodidePreloader] 백그라운드 프리로딩 완료')
      } catch (error) {
        console.warn('[PyodidePreloader] 백그라운드 프리로딩 실패:', error)
        // 실패해도 조용히 무시 (통계 페이지에서 재시도)
      } finally {
        setIsPreloading(false)
        removeListener()
      }
    }

    // 1초 후 시작 (메인 페이지 렌더링 우선)
    const timer = setTimeout(() => {
      startPreloading()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // 프리로딩 중이 아니면 렌더링 안 함
  if (!isPreloading) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm border rounded-lg p-3 shadow-sm z-40">
      <div className="flex items-center gap-2 text-xs">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
        <span className="text-muted-foreground">
          통계 엔진 준비 중... {progress}%
        </span>
      </div>
    </div>
  )
}
