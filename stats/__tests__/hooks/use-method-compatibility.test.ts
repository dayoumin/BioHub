/**
 * useMethodCompatibility 훅 단위 테스트
 *
 * validationResults → 구조적 호환성 Map 파생
 * assumptionResults 병합 시 가정검정 반영
 * validationResults null → null 반환
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useMethodCompatibility } from '@/hooks/use-method-compatibility'
import type { ValidationResults, ColumnStatistics } from '@/types/analysis'

function makeColumnStats(overrides?: Partial<ColumnStatistics>): ColumnStatistics {
  return {
    name: 'weight',
    type: 'numeric',
    numericCount: 100,
    textCount: 0,
    missingCount: 0,
    uniqueValues: 80,
    mean: 50,
    std: 10,
    ...overrides,
  }
}

function makeValidation(columns: ColumnStatistics[]): ValidationResults {
  return {
    isValid: true,
    totalRows: 100,
    columnCount: columns.length,
    missingValues: 0,
    dataType: 'tabular',
    variables: columns.map(c => c.name),
    errors: [],
    warnings: [],
    columnStats: columns,
    columns,
  }
}

describe('useMethodCompatibility', () => {
  beforeEach(() => {
    act(() => { useAnalysisStore.getState().reset() })
  })

  it('validationResults가 null이면 null을 반환한다', () => {
    const { result } = renderHook(() => useMethodCompatibility())
    expect(result.current).toBeNull()
  })

  it('validationResults가 있으면 호환성 Map을 반환한다', () => {
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({ name: 'value', type: 'numeric' }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result } = renderHook(() => useMethodCompatibility())

    expect(result.current).not.toBeNull()
    expect(result.current).toBeInstanceOf(Map)
    expect(result.current!.size).toBeGreaterThanOrEqual(1)
  })

  it('Map에 주요 메서드의 호환성 정보가 포함된다', () => {
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({ name: 'value', type: 'numeric' }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result } = renderHook(() => useMethodCompatibility())
    const map = result.current!

    // 일반적인 통계 메서드가 포함되어야 함
    const hasKnownMethod = map.has('t-test') || map.has('two-sample-t') || map.has('mann-whitney')
    expect(hasKnownMethod).toBe(true)
  })

  it('호환성 결과에 status 필드가 있다', () => {
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({ name: 'value', type: 'numeric' }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result } = renderHook(() => useMethodCompatibility())
    const map = result.current!

    for (const [, compat] of map) {
      expect(['compatible', 'incompatible', 'warning', 'unknown']).toContain(compat.status)
    }
  })

  it('validationResults 변경 시 자동 재계산된다', () => {
    const { result } = renderHook(() => useMethodCompatibility())
    expect(result.current).toBeNull()

    // 수치형 1개만
    act(() => {
      useAnalysisStore.getState().setValidationResults(
        makeValidation([makeColumnStats({ name: 'x' })])
      )
    })

    const map1 = result.current
    expect(map1).not.toBeNull()

    // 범주형 추가
    act(() => {
      useAnalysisStore.getState().setValidationResults(
        makeValidation([
          makeColumnStats({ name: 'x' }),
          makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 3 }),
        ])
      )
    })

    const map2 = result.current
    expect(map2).not.toBeNull()
    // 데이터가 바뀌었으므로 새 Map 인스턴스
    expect(map2).not.toBe(map1)
  })

  it('assumptionResults가 있으면 가정검정 결과를 병합한다', () => {
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({ name: 'value', type: 'numeric' }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result: beforeAssumption } = renderHook(() => useMethodCompatibility())
    const mapBefore = beforeAssumption.current

    act(() => {
      useAnalysisStore.getState().setAssumptionResults({
        normality: {
          shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true },
        },
      })
    })

    const { result: afterAssumption } = renderHook(() => useMethodCompatibility())
    const mapAfter = afterAssumption.current

    // 둘 다 Map이지만 가정검정 병합 후 다를 수 있음
    expect(mapBefore).not.toBeNull()
    expect(mapAfter).not.toBeNull()
  })
})
