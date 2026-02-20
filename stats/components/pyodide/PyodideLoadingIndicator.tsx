'use client'

/**
 * Pyodide 로딩 상태 표시기
 *
 * 화면을 차단하지 않는 작은 표시기로 변경
 * - 우측 하단에 작게 표시
 * - 사용자는 다른 작업 계속 가능
 * - 로딩 완료/실패 시 토스트 메시지
 */

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { PyodideLoadingProgress } from '@/lib/services/pyodide/core/pyodide-core.service'

interface PyodideLoadingIndicatorProps {
  progress: PyodideLoadingProgress | null
  isLoading: boolean
  isLoaded: boolean
  error: string | null
  onRetry?: () => void
}

export function PyodideLoadingIndicator({
  progress,
  isLoading,
  isLoaded,
  error,
  onRetry
}: PyodideLoadingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // 로딩 완료 시 성공 메시지 표시 후 자동 숨김
  useEffect(() => {
    if (isLoaded && !isLoading && progress?.stage === 'complete') {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, isLoading, progress])

  // 로딩 중이 아니고, 에러도 없고, 성공 메시지도 숨겼으면 표시 안함
  if (!isLoading && !error && !showSuccess) {
    return null
  }

  const isFromCache = progress?.fromCache ?? false

  const getStageLabel = (stage: string): string => {
    switch (stage) {
      case 'runtime': return 'Pyodide'
      case 'numpy': return 'NumPy'
      case 'scipy': return 'SciPy'
      case 'helpers': return '헬퍼'
      case 'complete': return '완료'
      default: return '초기화'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 에러 상태 */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 shadow-lg max-w-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium">통계 엔진 로드 실패</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-destructive hover:underline"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* 로딩 중 */}
      {isLoading && progress && (
        <div className="bg-background border rounded-lg shadow-lg overflow-hidden">
          {/* 헤더 - 항상 표시 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
          >
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium flex-1 text-left">
              {isFromCache ? '통계 엔진 복원 중...' : '통계 엔진 로딩 중...'}
            </span>
            <span className="text-xs text-muted-foreground mr-1">
              {progress.progress}%
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* 진행률 바 - 최소 표시 */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          {/* 확장된 상세 정보 */}
          {isExpanded && (
            <div className="px-3 py-2 border-t bg-muted/30">
              <div className="text-xs text-muted-foreground">
                {getStageLabel(progress.stage)} {isFromCache ? '복원 중...' : '로딩 중...'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {progress.message}
              </div>
              {isFromCache && (
                <div className="text-xs text-blue-500 mt-1">
                  캐시에서 빠르게 복원 중
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 성공 메시지 */}
      {showSuccess && !isLoading && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              {isFromCache ? '통계 엔진 복원 완료' : '통계 엔진 준비 완료'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
