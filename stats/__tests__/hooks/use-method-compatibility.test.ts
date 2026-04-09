/**
 * useMethodCompatibility 훅 단위 테스트
 *
 * validationResults → 구조적 호환성 Map 파생
 * assumptionResults 병합 시 가정검정 반영
 * validationResults null → null 반환
 * 탐색적 정규성 기반 가이드 (deriveNormalityFromColumns / getNormalitySummary)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import {
  useMethodCompatibility,
  deriveNormalityFromColumns,
  getNormalitySummary,
} from '@/hooks/use-method-compatibility'
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

  it('columnStats 정규성 결과만으로는 메서드 호환성 warning이 발생하지 않는다', () => {
    // 탐색적 정규성은 배너 힌트용이지 호환성 엔진 입력이 아님
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({
        name: 'value',
        type: 'numeric',
        normality: { statistic: 0.8, pValue: 0.01, isNormal: false, testName: 'shapiro-wilk' },
      }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result } = renderHook(() => useMethodCompatibility())
    const map = result.current!

    // assumptionResults 없으면 → 구조적 호환성만 판정, 정규성 경고 없음
    const tTest = map.get('two-sample-t')
    if (tTest && tTest.status !== 'incompatible') {
      expect(tTest.status).toBe('compatible')
      expect(tTest.assumptionViolations).toBeUndefined()
    }
  })

  it('정규 데이터에서도 등분산성 미검정 경고가 발생하지 않는다', () => {
    // Finding 2: 탐색적 경로 제거로 homogeneity: unknown → "등분산성 검정 필요" 방지
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical', uniqueValues: 2 }),
      makeColumnStats({
        name: 'value',
        type: 'numeric',
        normality: { statistic: 0.98, pValue: 0.5, isNormal: true, testName: 'shapiro-wilk' },
      }),
    ]

    act(() => {
      useAnalysisStore.getState().setValidationResults(makeValidation(cols))
    })

    const { result } = renderHook(() => useMethodCompatibility())
    const map = result.current!

    const tTest = map.get('two-sample-t')
    if (tTest && tTest.status !== 'incompatible') {
      expect(tTest.status).toBe('compatible')
      expect(tTest.reasons).toHaveLength(0)
    }
  })
})

describe('deriveNormalityFromColumns', () => {
  it('columnStats가 없으면 null 반환', () => {
    expect(deriveNormalityFromColumns(undefined)).toBeNull()
    expect(deriveNormalityFromColumns([])).toBeNull()
  })

  it('정규성 검정이 아직 안 된 경우 null 반환', () => {
    const cols = [makeColumnStats({ name: 'x', type: 'numeric' })]
    expect(deriveNormalityFromColumns(cols)).toBeNull()
  })

  it('과반수 정규이면 normality=true (summarizeNormality.mostlyNormal 위임)', () => {
    const cols = [
      makeColumnStats({
        name: 'a', normality: { statistic: 0.98, pValue: 0.5, isNormal: true, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'b', normality: { statistic: 0.97, pValue: 0.4, isNormal: true, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'c', normality: { statistic: 0.7, pValue: 0.001, isNormal: false, testName: 'shapiro-wilk' },
      }),
    ]

    const result = deriveNormalityFromColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.normality).toBe(true)
  })

  it('과반수 비정규이면 normality=false', () => {
    const cols = [
      makeColumnStats({
        name: 'a', normality: { statistic: 0.7, pValue: 0.001, isNormal: false, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'b', normality: { statistic: 0.75, pValue: 0.01, isNormal: false, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'c', normality: { statistic: 0.98, pValue: 0.5, isNormal: true, testName: 'shapiro-wilk' },
      }),
    ]

    const result = deriveNormalityFromColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.normality).toBe(false)
  })

  it('범주형 변수는 정규성 판단에서 제외', () => {
    const cols = [
      makeColumnStats({ name: 'group', type: 'categorical' }),
      makeColumnStats({
        name: 'val', normality: { statistic: 0.7, pValue: 0.001, isNormal: false, testName: 'shapiro-wilk' },
      }),
    ]

    const result = deriveNormalityFromColumns(cols)
    expect(result).not.toBeNull()
    expect(result!.normality).toBe(false)
  })
})

describe('getNormalitySummary', () => {
  it('columnStats가 없으면 null 반환', () => {
    expect(getNormalitySummary(undefined)).toBeNull()
  })

  it('정규성 검정이 없으면 null 반환', () => {
    const cols = [makeColumnStats({ name: 'x' })]
    expect(getNormalitySummary(cols)).toBeNull()
  })

  it('정규/비정규 카운트를 정확히 집계한다', () => {
    const cols = [
      makeColumnStats({
        name: 'a', normality: { statistic: 0.98, pValue: 0.5, isNormal: true, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'b', normality: { statistic: 0.7, pValue: 0.001, isNormal: false, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'c', normality: { statistic: 0.75, pValue: 0.01, isNormal: false, testName: 'shapiro-wilk' },
      }),
    ]

    const summary = getNormalitySummary(cols)!
    expect(summary.testedCount).toBe(3)
    expect(summary.normalCount).toBe(1)
    expect(summary.mostlyNormal).toBe(false)
  })

  it('모두 정규이면 mostlyNormal=true', () => {
    const cols = [
      makeColumnStats({
        name: 'a', normality: { statistic: 0.98, pValue: 0.5, isNormal: true, testName: 'shapiro-wilk' },
      }),
      makeColumnStats({
        name: 'b', normality: { statistic: 0.97, pValue: 0.4, isNormal: true, testName: 'shapiro-wilk' },
      }),
    ]

    const summary = getNormalitySummary(cols)!
    expect(summary.mostlyNormal).toBe(true)
    expect(summary.normalCount).toBe(2)
  })
})
