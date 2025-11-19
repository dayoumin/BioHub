'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { retryPyodideOperation } from '@/lib/services/pyodide-helper'
import { PyodideCoreService, PyodideLoadingProgress } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideLoadingModal } from '@/components/pyodide/pyodide-loading-modal'

interface PyodideContextType {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  service: PyodideStatisticsService | null
}

const PyodideContext = createContext<PyodideContextType>({
  isLoaded: false,
  isLoading: false,
  error: null,
  service: null
})

export function usePyodide() {
  return useContext(PyodideContext)
}

const SUCCESS_DISPLAY_DURATION = 3000 // 3초 후 자동 숨김

export function PyodideProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [service, setService] = useState<PyodideStatisticsService | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState<PyodideLoadingProgress | null>(null)
  const initializeStartedRef = useRef(false)

  // 성공 메시지 자동 숨김
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, SUCCESS_DISPLAY_DURATION)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  // initPyodide 함수를 useCallback으로 감싸서 재사용 가능하게 함
  const initPyodide = useCallback(async () => {
    const pyodideService = PyodideStatisticsService.getInstance()
    const coreService = PyodideCoreService.getInstance()

    console.log('[PyodideProvider] Pyodide 초기화 시작...')
    setIsLoading(true)
    setError(null)

    // 진행률 리스너 등록
    const removeListener = coreService.onProgress((progress) => {
      setLoadingProgress(progress)

      // 완료 시 성공 메시지 표시
      if (progress.stage === 'complete') {
        setShowSuccess(true)
      }
    })

    try {
      const startTime = performance.now()

      // 재시도 로직을 포함한 초기화
      await retryPyodideOperation(
        () => pyodideService.initialize(),
        3, // 최대 3회 재시도
        1000 // 1초 기본 대기 (지수 백오프)
      )

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)

      setService(pyodideService)
      setIsLoaded(true)
      console.log(`[PyodideProvider] Pyodide 초기화 완료! (소요시간: ${loadTime}초)`)
    } catch (err) {
      console.error('[PyodideProvider] Pyodide 초기화 실패 (모든 재시도 실패):', err)
      setError(err instanceof Error ? err.message : 'Pyodide 초기화 실패')
    } finally {
      setIsLoading(false)
      removeListener() // 리스너 제거
    }
  }, [])

  useEffect(() => {
    const pyodideService = PyodideStatisticsService.getInstance()

    // 이미 초기화된 경우 빠르게 상태만 업데이트
    if (pyodideService.isInitialized()) {
      console.log('[PyodideProvider] Pyodide 이미 초기화됨 - 빠른 상태 복구')
      setService(pyodideService)
      setIsLoaded(true)
      setIsLoading(false)
      return
    }

    // useRef를 사용하여 한 번만 초기화하도록 보장
    if (initializeStartedRef.current) {
      return
    }
    initializeStartedRef.current = true

    // 컴포넌트 마운트 후 즉시 초기화 시작
    initPyodide()
  }, [initPyodide]) // initPyodide만 의존성으로 추가 (안정적)

  // 로딩 모달 표시
  return (
    <PyodideContext.Provider value={{ isLoaded, isLoading, error, service }}>
      {children}

      {/* 화면 중앙 로딩 모달 */}
      <PyodideLoadingModal progress={loadingProgress} isVisible={isLoading} />

      {/* 에러 메시지 (우측 하단) */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-sm z-50">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <span>⚠️ 통계 엔진 로드 실패</span>
            </div>
            <button
              onClick={() => {
                setError(null)
                initializeStartedRef.current = false // 리셋하여 다시 시도 가능하게 함
                initPyodide()
              }}
              className="text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 성공 메시지 (우측 하단) */}
      {showSuccess && !isLoading && (
        <div className="fixed bottom-4 right-4 bg-success-bg dark:bg-success-bg border border-success-border dark:border-success-border rounded-lg p-3 shadow-sm z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-sm text-success dark:text-success">
            <span>✅ 통계 엔진 준비 완료</span>
          </div>
        </div>
      )}
    </PyodideContext.Provider>
  )
}