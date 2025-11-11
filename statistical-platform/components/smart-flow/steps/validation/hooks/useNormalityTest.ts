/**
 * Normality Test Hook
 *
 * @description
 * 정규성 검정을 실행하는 커스텀 훅
 * - Shapiro-Wilk Test (3 <= n <= 5000)
 * - Anderson-Darling Test (n >= 8)
 * - D'Agostino-Pearson Test (n >= 20)
 * - 종합 판정 (any/majority/strict 규칙)
 */

import { useState, useCallback } from 'react'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { DataRow } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'

export interface NormalityTestResult {
  shapiroWilk?: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  andersonDarling?: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  dagostinoPearson?: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  summary?: {
    totalTests: number
    passedTests: number
    isNormal: boolean
  }
}

export type NormalityRule = 'any' | 'majority' | 'strict'

export interface UseNormalityTestOptions {
  /** Pyodide 서비스 인스턴스 */
  pyodideService: PyodideStatisticsService | null
  /** Pyodide 로딩 상태 */
  pyodideLoading: boolean
  /** Pyodide 로드 완료 여부 */
  pyodideLoaded: boolean
  /** 정규성 판정 규칙 */
  normalityRule?: NormalityRule
  /** 유의수준 (기본: 0.05) */
  alpha?: number
}

export interface UseNormalityTestReturn {
  /** 정규성 검정 결과 (컬럼명 -> 결과) */
  normalityTests: Record<string, NormalityTestResult>
  /** 검정 실행 중 여부 */
  isCalculating: boolean
  /** 정규성 검정 실행 */
  runNormalityTests: (data: DataRow[], numericColumns: Array<{ name: string }>) => Promise<void>
  /** 결과 초기화 */
  clearResults: () => void
}

export function useNormalityTest({
  pyodideService,
  pyodideLoading,
  pyodideLoaded,
  normalityRule = 'any',
  alpha = 0.05
}: UseNormalityTestOptions): UseNormalityTestReturn {
  const [normalityTests, setNormalityTests] = useState<Record<string, NormalityTestResult>>({})
  const [isCalculating, setIsCalculating] = useState(false)

  const runNormalityTests = useCallback(async (
    data: DataRow[],
    numericColumns: Array<{ name: string }>
  ) => {
    console.log('runNormalityTests called', {
      hasData: !!data,
      numericColumnsCount: numericColumns.length,
      numericColumns: numericColumns.map(c => c.name)
    })

    // 가드: 데이터/수치형 변수 없으면 실행하지 않음
    if (!data || !numericColumns.length) {
      console.log('No data or numeric columns, returning')
      return
    }

    // 다른 작업 진행 중이면 스킵
    if (isCalculating || pyodideLoading) {
      console.log('Skip normality: busy state')
      return
    }

    // Pyodide가 로드되지 않았으면 스킵
    if (!pyodideLoaded || !pyodideService) {
      console.log('Pyodide not loaded yet')
      return
    }

    setIsCalculating(true)
    const normalityResults: Record<string, NormalityTestResult> = {}

    try {
      console.log('Running multiple normality tests with preloaded Pyodide')

      for (const col of numericColumns) {
        // 열 데이터 추출
        const columnData = data
          .map((row: Record<string, unknown>) => row[col.name])
          .filter((val: unknown): val is number | string =>
            val !== null && val !== undefined && !isNaN(Number(val))
          )
          .map((val: number | string) => Number(val))

        if (columnData.length < 3) {
          console.log(`Column ${col.name} has less than 3 values, skipping`)
          continue
        }

        console.log(`Testing column ${col.name} with ${columnData.length} values`)

        // 다중 정규성 검정
        try {
          const results: NormalityTestResult = {}

          // Shapiro-Wilk Test (3 <= n <= 5000)
          if (columnData.length <= 5000) {
            results.shapiroWilk = await pyodideService.shapiroWilkTest(columnData)
          }

          // Anderson-Darling Test (n >= 8)
          if (columnData.length >= 8) {
            results.andersonDarling = await pyodideService.andersonDarlingTest(columnData)
          }

          // D'Agostino-Pearson Test (n >= 20)
          if (columnData.length >= 20) {
            results.dagostinoPearson = await pyodideService.dagostinoPearsonTest(columnData)
          }

          // 종합 판정 (설정된 규칙에 따라)
          const testResults = [
            results.shapiroWilk,
            results.andersonDarling,
            results.dagostinoPearson
          ].filter((r): r is NonNullable<typeof r> => r !== undefined)

          const passedTests = testResults.filter(r => r.isNormal).length
          const totalTests = testResults.length

          results.summary = {
            totalTests,
            passedTests,
            isNormal:
              normalityRule === 'any' ? passedTests > 0 :
              normalityRule === 'majority' ? passedTests > totalTests / 2 :
              passedTests === totalTests
          }

          console.log(`Normality tests for ${col.name}:`, results)
          normalityResults[col.name] = results
        } catch (err) {
          console.error(`Normality test failed for ${col.name}:`, err)
          logger.error(`Normality test failed for ${col.name}`, err)
        }
      }

      console.log('Final normality results:', normalityResults)
      setNormalityTests(normalityResults)
    } catch (error) {
      console.error('Statistical tests error:', error)
      logger.error('통계 검정 오류', error)
    } finally {
      setIsCalculating(false)
    }
  }, [pyodideService, pyodideLoading, pyodideLoaded, normalityRule, alpha, isCalculating])

  const clearResults = useCallback(() => {
    setNormalityTests({})
  }, [])

  return {
    normalityTests,
    isCalculating,
    runNormalityTests,
    clearResults
  }
}
