/**
 * Normality Enrichment Service
 *
 * Step 1 업로드 완료 후 비동기로 수치형 컬럼의 정규성 검정을 실행한다.
 * Pyodide Worker 1의 normality_test (Shapiro-Wilk)를 사용.
 *
 * - fire-and-forget: 실패해도 분석 흐름을 차단하지 않는다
 * - Pyodide 미초기화 시 초기화 대기 후 실행
 * - immutable: 원본 columnStats를 변이하지 않고 새 배열 반환
 */

import type { ColumnStatistics, DataRow } from '@/types/analysis'
import type { NormalityWorkerResult } from '@/lib/services/pyodide/worker-result-types'
import { ensurePyodideReady } from '@/lib/services/pyodide/ensure-pyodide-ready'
import { logger } from '@/lib/utils/logger'

export interface NormalityEnrichmentResult {
  /** normality가 추가된 새 columnStats 배열 (원본 미변이) */
  enrichedColumns: ColumnStatistics[]
  /** 성공한 컬럼 수 */
  testedCount: number
  /** 실패한 컬럼명 (Pyodide 에러 등) */
  failedColumns: string[]
}

// ===== Constants =====

/** 정규성 검정 대상 최소 관측치 수 */
const MIN_OBSERVATIONS = 3

/** 최대 샘플 크기 (Shapiro-Wilk 권장 상한) */
const MAX_SAMPLE_SIZE = 5000

// ===== Main Function =====

/**
 * 수치형 컬럼들의 정규성 검정을 비동기로 실행하고 새 columnStats 배열을 반환한다.
 * 원본 columnStats는 변이하지 않는다 (immutable).
 *
 * @param columnStats - Step 1에서 계산된 컬럼 통계 (읽기 전용)
 * @param data - 업로드된 원본 데이터
 * @returns normality가 추가된 새 columnStats + 메타 정보
 */
export async function enrichWithNormality(
  columnStats: readonly ColumnStatistics[],
  data: readonly DataRow[]
): Promise<NormalityEnrichmentResult> {
  const numericIndices = columnStats
    .map((col, i) => col.type === 'numeric' ? i : -1)
    .filter(i => i >= 0)

  if (numericIndices.length === 0 || data.length < MIN_OBSERVATIONS) {
    return { enrichedColumns: [...columnStats], testedCount: 0, failedColumns: [] }
  }

  const pyodide = await ensurePyodideReady('Normality enrichment')
  if (!pyodide) {
    return { enrichedColumns: [...columnStats], testedCount: 0, failedColumns: [] }
  }

  const failedColumns: string[] = []
  let testedCount = 0

  // 결과를 index → normality로 저장 (immutable 패턴)
  const normalityMap = new Map<number, ColumnStatistics['normality']>()

  // 각 수치형 컬럼에 대해 정규성 검정 실행
  const normalityPromises = numericIndices.map(async (colIndex) => {
    const col = columnStats[colIndex]
    try {
      // 데이터 추출: 숫자만 필터 (NaN/null/undefined 제거)
      const values = extractNumericValues(data, col.name)

      if (values.length < MIN_OBSERVATIONS) {
        return
      }

      // 샘플링: Shapiro-Wilk는 n ≤ 5000 권장
      const sampleData = values.length > MAX_SAMPLE_SIZE
        ? randomSample(values, MAX_SAMPLE_SIZE)
        : values

      const result = await pyodide.callWorkerMethod<NormalityWorkerResult>(
        1,
        'normality_test',
        { data: sampleData, alpha: 0.05 }
      )

      normalityMap.set(colIndex, {
        statistic: result.statistic,
        pValue: result.pValue,
        isNormal: result.isNormal,
        testName: 'shapiro-wilk',
      })
      testedCount++
    } catch (err) {
      failedColumns.push(col.name)
      logger.warn(`Normality test failed for column "${col.name}"`, { error: err })
    }
  })

  await Promise.allSettled(normalityPromises)

  // 새 배열 생성: normality 결과가 있는 컬럼만 새 객체로 교체
  const enrichedColumns = columnStats.map((col, i) => {
    const normality = normalityMap.get(i)
    return normality ? { ...col, normality } : col
  })

  return {
    enrichedColumns,
    testedCount,
    failedColumns,
  }
}

// ===== Helpers =====

/** 컬럼에서 유효한 숫자값만 추출 */
function extractNumericValues(data: readonly DataRow[], columnName: string): number[] {
  const values: number[] = []
  for (const row of data) {
    const val = row[columnName]
    if (val === null || val === undefined || val === '') continue
    const num = typeof val === 'number' ? val : Number(val)
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      values.push(num)
    }
  }
  return values
}

/** Fisher-Yates shuffle 기반 랜덤 샘플링 (비파괴) */
function randomSample(arr: number[], size: number): number[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0 && i >= copy.length - size; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(-size)
}
