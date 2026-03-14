'use client'

/**
 * useInterpretation — AI 해석 상태 관리 커스텀 훅
 *
 * ResultsActionStep에서 분리된 AI 해석 관련 상태를 캡슐화:
 * - interpretation (텍스트), isInterpreting, interpretError
 * - interpretedResultRef 센티널 (상태머신: idle → loading → restored/cached/error)
 * - 히스토리 복원 (같은 세션 전환 + 새로고침)
 * - auto-trigger (results 변경 시 자동 해석)
 * - abort 관리
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useHistoryStore } from '@/lib/stores/history-store'
import { getHistory } from '@/lib/utils/storage'
import { requestInterpretation, type InterpretationContext } from '@/lib/services/result-interpreter'
import type { AnalysisResult } from '@/types/analysis'

// ─── 센티널 상태 (magic string 제거) ─────────────────────

/** interpretedResultRef가 가질 수 있는 값:
 *  - null: 가드 없음 → auto-trigger 허용
 *  - LOADING: 비동기 로드/요청 진행 중 → auto-trigger 차단
 *  - RESTORED: 히스토리 복원 완료 → auto-trigger 차단
 *  - cache key 문자열: 해석 완료 → 같은 결과 재호출 차단
 */
const LOADING = '__loading__' as const
const RESTORED = '__restored__' as const

// ─── 캐시 키 생성 ────────────────────────────────────────

function buildCacheKey(
  results: AnalysisResult,
  variableMapping: Record<string, unknown> | null
): string {
  const variableKey = variableMapping
    ? Object.entries(variableMapping)
        .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(',') : String(v)}`)
        .sort()
        .join('|')
    : ''
  return `${results.method}:${results.pValue}:${results.statistic}:${variableKey}`
}

// ─── Hook interface ──────────────────────────────────────

interface UseInterpretationParams {
  results: AnalysisResult | null
  uploadedData: unknown[] | null
  mappedVariables: string[]
  uploadedFileName: string | null | undefined
  variableMapping: Record<string, unknown> | null
  errorMessage: string
}

interface UseInterpretationReturn {
  interpretation: string | null
  interpretationModel: string | null
  isInterpreting: boolean
  interpretError: string | null
  /** AI 해석 요청 (스트리밍). 외부에서 직접 호출 가능 */
  handleInterpretation: () => void
  /** 해석 + Q&A 초기화 후 재요청 */
  resetAndReinterpret: () => void
  /** 재분석 시 ref 초기화 (auto-trigger 재활성화) */
  clearInterpretationGuard: () => void
  /** abort ref (외부 cleanup용) */
  interpretAbortRef: React.RefObject<AbortController | null>
  /** AI 해석 영역 scroll ref */
  aiInterpretationRef: React.RefObject<HTMLDivElement | null>
  /** phase 진행 콜백 (해석 완료 시 호출) */
  onInterpretationComplete: React.RefObject<(() => void) | null>
}

export function useInterpretation({
  results,
  uploadedData,
  mappedVariables,
  uploadedFileName,
  variableMapping,
  errorMessage,
}: UseInterpretationParams): UseInterpretationReturn {
  // ─── State ───
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [interpretationModel, setInterpretationModel] = useState<string | null>(null)
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [interpretError, setInterpretError] = useState<string | null>(null)

  // ─── Refs ───
  const interpretAbortRef = useRef<AbortController | null>(null)
  const aiInterpretationRef = useRef<HTMLDivElement | null>(null)
  /** 센티널: null | LOADING | RESTORED | cache-key */
  const sentinelRef = useRef<string | null>(null)
  /** 최신 handleInterpretation을 비동기 context에서 안전하게 호출하기 위한 ref */
  const handleRef = useRef<(() => void) | null>(null)
  /** phase 진행 콜백 (ResultsActionStep에서 설정) */
  const onInterpretationComplete = useRef<(() => void) | null>(null)

  // ─── Store (히스토리 복원용) ───
  const {
    loadedAiInterpretation,
    currentHistoryId,
  } = useHistoryStore()

  // ─── handleInterpretation ───
  const handleInterpretation = useCallback(async () => {
    if (!results) return

    const cacheKey = buildCacheKey(results, variableMapping)
    if (sentinelRef.current === cacheKey) return
    sentinelRef.current = LOADING

    setIsInterpreting(true)
    setInterpretError(null)
    setInterpretation('')

    const controller = new AbortController()
    interpretAbortRef.current = controller

    try {
      const ctx: InterpretationContext = {
        results,
        sampleSize: uploadedData?.length,
        variables: mappedVariables.length > 0 ? mappedVariables : undefined,
        uploadedFileName: uploadedFileName ?? undefined,
      }

      let accumulated = ''
      const { model } = await requestInterpretation(
        ctx,
        (chunk) => {
          accumulated += chunk
          setInterpretation(accumulated)
        },
        controller.signal
      )

      sentinelRef.current = cacheKey
      setInterpretationModel(model)
    } catch (error) {
      if (controller.signal.aborted) return
      const msg = error instanceof Error ? error.message : errorMessage
      setInterpretError(msg)
    } finally {
      setIsInterpreting(false)
      interpretAbortRef.current = null
      onInterpretationComplete.current?.()
      requestAnimationFrame(() => {
        aiInterpretationRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [results, uploadedData, mappedVariables, uploadedFileName, variableMapping, errorMessage])

  // ref sync (매 렌더 후 최신 함수 보관)
  handleRef.current = handleInterpretation

  // ─── 히스토리 전환 감지 ───
  const prevHistoryIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // 첫 마운트: 새로고침 복원 경로
    if (prevHistoryIdRef.current === undefined) {
      prevHistoryIdRef.current = currentHistoryId
      if (currentHistoryId && interpretation === null && !isInterpreting) {
        sentinelRef.current = LOADING
        const requestedId = currentHistoryId
        getHistory(currentHistoryId)
          .then(record => {
            if (prevHistoryIdRef.current !== requestedId) return
            if (record?.aiInterpretation) {
              setInterpretation(record.aiInterpretation)
              sentinelRef.current = RESTORED
            } else {
              sentinelRef.current = LOADING
              handleRef.current?.()
            }
          })
          .catch(() => {
            if (prevHistoryIdRef.current !== requestedId) return
            sentinelRef.current = LOADING
            handleRef.current?.()
          })
      }
      return
    }
    if (prevHistoryIdRef.current === currentHistoryId) return
    prevHistoryIdRef.current = currentHistoryId

    // 진행 중인 스트림 abort
    interpretAbortRef.current?.abort()

    // 히스토리에 저장된 해석이 있으면 복원, 없으면 직접 해석 요청
    const cached = useHistoryStore.getState().loadedAiInterpretation
    setInterpretation(cached ?? null)
    setInterpretationModel(null)
    setIsInterpreting(false)
    setInterpretError(null)
    if (cached) {
      sentinelRef.current = RESTORED
    } else {
      sentinelRef.current = LOADING
      handleRef.current?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHistoryId])

  // ─── loadedAiInterpretation store → local state 복원 ───
  useEffect(() => {
    if (loadedAiInterpretation) {
      setInterpretation(loadedAiInterpretation)
      if (results) {
        sentinelRef.current = buildCacheKey(results, variableMapping)
      }
      useHistoryStore.getState().setLoadedAiInterpretation(null)
    }
  }, [loadedAiInterpretation, results, variableMapping])

  // ─── auto-trigger: results 변경 시 자동 해석 ───
  useEffect(() => {
    if (results && sentinelRef.current === null && interpretation === null && !isInterpreting) {
      handleInterpretation()
    }
    return () => {
      interpretAbortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results?.method, results?.pValue, results?.statistic])

  // ─── 재해석 (Q&A 포함 초기화) ───
  const resetAndReinterpret = useCallback(() => {
    sentinelRef.current = null
    setInterpretation(null)
    setInterpretationModel(null)
    handleInterpretation()
  }, [handleInterpretation])

  // ─── 재분석 시 가드 해제 ───
  const clearInterpretationGuard = useCallback(() => {
    sentinelRef.current = null
  }, [])

  return {
    interpretation,
    interpretationModel,
    isInterpreting,
    interpretError,
    handleInterpretation,
    resetAndReinterpret,
    clearInterpretationGuard,
    interpretAbortRef,
    aiInterpretationRef,
    onInterpretationComplete,
  }
}
