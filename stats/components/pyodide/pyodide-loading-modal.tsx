'use client'

/**
 * Pyodide 로딩 모달 컴포넌트
 *
 * 화면 중앙에 큰 모달로 표시
 * - 패키지별 진행 상태
 * - 예상 소요 시간
 * - 다운로드 크기
 */

import { useEffect, useState } from 'react'
import { PyodideLoadingProgress } from '@/lib/services/pyodide/core/pyodide-core.service'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

interface PyodideLoadingModalProps {
  progress: PyodideLoadingProgress | null
  isVisible: boolean
}

export function PyodideLoadingModal({ progress, isVisible }: PyodideLoadingModalProps) {
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  useEffect(() => {
    // 로컬 스토리지에서 첫 방문 여부 확인
    const hasLoaded = localStorage.getItem(STORAGE_KEYS.ui.pyodideLoaded)
    setIsFirstLoad(!hasLoaded)

    if (progress?.stage === 'complete') {
      localStorage.setItem(STORAGE_KEYS.ui.pyodideLoaded, 'true')
    }
  }, [progress])

  if (!isVisible || !progress) {
    return null
  }

  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'runtime':
        return '⚙️'
      case 'numpy':
        return '🔢'
      case 'scipy':
        return '📊'
      case 'helpers':
        return '🔧'
      case 'complete':
        return '✅'
      default:
        return '⏳'
    }
  }

  const getEstimatedTime = (): string => {
    if (isFirstLoad) {
      return '첫 방문: 약 5-10초 소요'
    }
    return '캐시 사용 중: 약 0.5초 소요'
  }

  const stages = [
    { key: 'runtime', label: 'Pyodide 런타임', size: '6MB' },
    { key: 'numpy', label: 'NumPy 패키지', size: '12MB' },
    { key: 'scipy', label: 'SciPy 패키지', size: '25MB' },
    { key: 'helpers', label: '헬퍼 모듈', size: '5KB' }
  ]

  const getCurrentStageIndex = (): number => {
    return stages.findIndex((s) => s.key === progress.stage)
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        {/* 모달 */}
        <div className="bg-background border rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="text-5xl mb-4 animate-pulse">
              {getStageIcon(progress.stage)}
            </div>
            <h2 className="text-2xl font-bold mb-2">통계 엔진 초기화</h2>
            <p className="text-sm text-muted-foreground">{getEstimatedTime()}</p>
          </div>

          {/* 진행률 바 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{progress.message}</span>
              <span className="text-muted-foreground">{progress.progress}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>

          {/* 패키지별 상태 */}
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const currentIndex = getCurrentStageIndex()
              const isCompleted = index < currentIndex || progress.stage === 'complete'
              const isCurrent = index === currentIndex
              const isPending = index > currentIndex && progress.stage !== 'complete'

              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCurrent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="text-2xl">
                    {isCompleted && '✓'}
                    {isCurrent && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    )}
                    {isPending && '○'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{stage.label}</div>
                    <div className="text-xs text-muted-foreground">{stage.size}</div>
                  </div>
                  {isCompleted && <span className="text-success text-sm">완료</span>}
                  {isCurrent && <span className="text-primary text-sm">로딩 중...</span>}
                </div>
              )
            })}
          </div>

          {/* 추가 정보 */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              💡 <strong>안내:</strong> 통계 라이브러리는{' '}
              {isFirstLoad ? '첫 방문 시 한 번만 다운로드됩니다' : '캐시에서 즉시 로드됩니다'}
              . 이후 방문 시에는 즉시 사용 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}