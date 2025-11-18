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
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md border border-primary/30 rounded-xl p-4 shadow-2xl min-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-3">
          {/* 헤더 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground">통계 엔진 준비 중</div>
              <div className="text-xs text-muted-foreground">잠시만 기다려주세요...</div>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-mono font-semibold text-primary">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 스테이지 설명 */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            {progress < 25 && '📦 Pyodide 런타임 로딩 중... (6MB)'}
            {progress >= 25 && progress < 50 && '🔢 NumPy 패키지 로딩 중... (12MB)'}
            {progress >= 50 && progress < 85 && '📊 SciPy 패키지 로딩 중... (25MB)'}
            {progress >= 85 && progress < 100 && '⚙️ 헬퍼 모듈 로딩 중...'}
            {progress >= 100 && '✅ 준비 완료!'}
          </div>
        </div>
      </div>
    </div>
  )
}
