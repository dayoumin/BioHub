'use client'

/**
 * Step 1 등분산성 검정 훅
 *
 * 범주형 변수(unique 2~10)를 자동 감지하여 첫 번째 적합 변수를 그룹으로 선택.
 * 선택된 그룹 변수 × 첫 번째 수치형 변수에 대해 Worker 3 test_assumptions 실행.
 * fire-and-forget: 실패해도 분석 흐름을 차단하지 않는다.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ValidationResults, DataRow, ColumnStatistics } from '@/types/analysis'
import { logger } from '@/lib/utils/logger'
import { extractGroupedNumericData } from '@/lib/utils/grouped-data'
import { raceWithTimeout } from '@/lib/utils/promise-utils'

// ── Types ──

interface LeveneResult {
  statistic: number
  pValue: number
  equalVariance: boolean
}

interface WorkerLeveneResult {
  homogeneity: {
    levene: { statistic: number; pValue: number }
    passed: boolean
  }
  normality: unknown
}

export interface UseLeveneTestReturn {
  /** Levene 검정 결과 (null = 미실행 또는 불가) */
  result: LeveneResult | null
  /** 로딩 중 */
  isLoading: boolean
  /** 현재 선택된 그룹 변수 */
  groupVariable: string | null
  /** 선택 가능한 그룹 변수 후보 목록 */
  groupCandidates: string[]
  /** 그룹 변수 변경 */
  setGroupVariable: (varName: string) => void
}

// ── Constants ──

/** 그룹 변수 후보: unique 값 2~10 */
const MIN_GROUPS = 2
const MAX_GROUPS = 10

/** 그룹당 최소 관측치 */
const MIN_GROUP_SIZE = 3

const TIMEOUT_MS = 15_000

// ── Hook ──

/**
 * @param primaryNumericVar - 등분산 검정 대상 수치형 변수 (보통 numericVariables[0])
 */
export function useLeveneTest(
  validationResults: ValidationResults | null,
  data: DataRow[],
  primaryNumericVar: string | undefined,
): UseLeveneTestReturn {
  const [result, setResult] = useState<LeveneResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  // 그룹 변수 후보: 범주형 + unique 2~10
  const groupCandidates = useMemo(() => {
    if (!validationResults?.columnStats) return []
    return validationResults.columnStats
      .filter((col: ColumnStatistics) =>
        col.type === 'categorical'
        && !col.idDetection?.isId
        && col.uniqueValues >= MIN_GROUPS
        && col.uniqueValues <= MAX_GROUPS
      )
      .map((col: ColumnStatistics) => col.name)
  }, [validationResults])

  // 첫 번째 후보 자동 선택 + stale group 리셋
  useEffect(() => {
    if (groupCandidates.length === 0) {
      setSelectedGroup(null)
      setResult(null)
    } else if (selectedGroup === null || !groupCandidates.includes(selectedGroup)) {
      setSelectedGroup(groupCandidates[0])
      setResult(null)
    }
  }, [groupCandidates, selectedGroup])

  const setGroupVariable = useCallback((varName: string) => {
    setSelectedGroup(varName)
    setResult(null)
  }, [])

  // Levene 검정 실행
  useEffect(() => {
    if (!selectedGroup || !primaryNumericVar || data.length < MIN_GROUP_SIZE * 2) {
      setResult(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const groupVar = selectedGroup
    const depVar = primaryNumericVar

    async function run(): Promise<void> {
      try {
        const groupMap = extractGroupedNumericData(data, depVar, groupVar)
        const validGroups = [...groupMap.values()].filter(g => g.length >= MIN_GROUP_SIZE)

        if (validGroups.length < 2) {
          if (!cancelled) setResult(null)
          return
        }

        // Pyodide Worker 3 호출
        const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
        const pyodide = PyodideCoreService.getInstance()

        if (!pyodide.isInitialized()) {
          await pyodide.initialize()
        }

        const workerResult = await raceWithTimeout(
          pyodide.callWorkerMethod<WorkerLeveneResult>(3, 'test_assumptions', { groups: validGroups }),
          TIMEOUT_MS,
          'Levene test timeout',
        )

        if (!cancelled) {
          setResult({
            statistic: workerResult.homogeneity.levene.statistic,
            pValue: workerResult.homogeneity.levene.pValue,
            equalVariance: workerResult.homogeneity.passed,
          })
        }
      } catch (err) {
        logger.warn('Levene test failed in Step 1', { error: err })
        if (!cancelled) setResult(null)
      } finally {
        // cancelled 여부와 무관하게 isLoading 리셋 — cleanup 대신 여기서 처리
        setIsLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [selectedGroup, primaryNumericVar, data])

  return {
    result,
    isLoading,
    groupVariable: selectedGroup,
    groupCandidates,
    setGroupVariable,
  }
}
