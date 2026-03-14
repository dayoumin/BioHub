/**
 * Smart Flow Store - 업로드 race condition 회귀 테스트
 *
 * 시나리오:
 * 1. uploadNonce: 같은 파일명 재업로드 시 이전 enrichment가 무시되는지
 * 2. patchColumnNormality: assumptionResults를 보존하는지
 * 3. resetSession: nonce가 증가하여 진행 중 enrichment를 무효화하는지
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import type { ValidationResults, ColumnStatistics } from '@/types/analysis'

// ===== Test Fixtures =====

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

describe('Smart Flow Store - Upload Race Conditions', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  // ===== 시나리오 1: uploadNonce =====

  describe('uploadNonce', () => {
    it('초기값은 0이다', () => {
      expect(useAnalysisStore.getState().uploadNonce).toBe(0)
    })

    it('setUploadedFile 호출마다 nonce가 증가한다', () => {
      const store = useAnalysisStore.getState()

      act(() => { store.setUploadedFile(new File(['a'], 'data.csv')) })
      expect(useAnalysisStore.getState().uploadNonce).toBe(1)

      act(() => { useAnalysisStore.getState().setUploadedFile(new File(['b'], 'data.csv')) })
      expect(useAnalysisStore.getState().uploadNonce).toBe(2)
    })

    it('같은 파일명이라도 nonce가 다르면 stale 감지 가능', () => {
      const store = useAnalysisStore.getState()

      // 첫 번째 업로드
      act(() => { store.setUploadedFile(new File(['a'], 'same-name.csv')) })
      const firstNonce = useAnalysisStore.getState().uploadNonce

      // 두 번째 업로드 (같은 파일명)
      act(() => { useAnalysisStore.getState().setUploadedFile(new File(['b'], 'same-name.csv')) })
      const secondNonce = useAnalysisStore.getState().uploadNonce

      // 파일명은 같지만 nonce는 다름
      expect(useAnalysisStore.getState().uploadedFileName).toBe('same-name.csv')
      expect(firstNonce).not.toBe(secondNonce)
    })

    it('resetSession은 nonce를 증가시켜 진행 중 enrichment를 무효화한다', () => {
      const store = useAnalysisStore.getState()

      act(() => { store.setUploadedFile(new File(['a'], 'data.csv')) })
      const nonceBeforeReset = useAnalysisStore.getState().uploadNonce

      act(() => { useAnalysisStore.getState().resetSession() })
      const nonceAfterReset = useAnalysisStore.getState().uploadNonce

      expect(nonceAfterReset).toBeGreaterThan(nonceBeforeReset)
    })
  })

  // ===== 시나리오 2: patchColumnNormality =====

  describe('patchColumnNormality', () => {
    it('normality를 columnStats에 패치한다', () => {
      const cols = [makeColumnStats({ name: 'weight' })]
      const validation = makeValidation(cols)

      act(() => { useAnalysisStore.getState().setValidationResults(validation) })

      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]

      act(() => { useAnalysisStore.getState().patchColumnNormality(enriched) })

      const result = useAnalysisStore.getState().validationResults
      expect(result?.columnStats?.[0].normality?.pValue).toBe(0.42)
      expect(result?.columns?.[0].normality?.pValue).toBe(0.42)
    })

    it('assumptionResults를 보존한다 (핵심 regression)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      // Step 1: 데이터 업로드 → validationResults 설정
      act(() => { useAnalysisStore.getState().setValidationResults(validation) })

      // Step 2/4: 가정 검정 결과가 먼저 도착
      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useAnalysisStore.getState().setAssumptionResults(assumptions) })
      expect(useAnalysisStore.getState().assumptionResults).not.toBeNull()

      // 늦게 도착한 enrichment: patchColumnNormality 사용
      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]
      act(() => { useAnalysisStore.getState().patchColumnNormality(enriched) })

      // normality가 추가되었고 assumptionResults가 살아 있어야 함
      expect(useAnalysisStore.getState().validationResults?.columnStats?.[0].normality).toBeTruthy()
      expect(useAnalysisStore.getState().assumptionResults).not.toBeNull()
      expect(useAnalysisStore.getState().assumptionResults?.normality?.shapiroWilk?.pValue).toBe(0.3)
    })

    // TD-10-D: methodCompatibility는 useMethodCompatibility 훅으로 이동
    // patchColumnNormality가 validationResults를 업데이트하면 훅이 자동 재계산

    it('validationResults가 null이면 아무것도 하지 않는다', () => {
      const enriched: ColumnStatistics[] = [makeColumnStats()]

      // no-op: validationResults가 없으므로 에러 없이 무시
      act(() => { useAnalysisStore.getState().patchColumnNormality(enriched) })

      expect(useAnalysisStore.getState().validationResults).toBeNull()
    })
  })

  // ===== 시나리오 3: 전체 race 시뮬레이션 =====

  describe('race condition 시뮬레이션: enrichment가 늦게 도착', () => {
    it('setValidationResults로 전체 덮어쓰면 assumptionResults가 사라진다 (before 검증)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      act(() => { useAnalysisStore.getState().setValidationResults(validation) })

      // 가정 검정 결과 도착
      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useAnalysisStore.getState().setAssumptionResults(assumptions) })
      expect(useAnalysisStore.getState().assumptionResults).not.toBeNull()

      // 기존 버그 재현: setValidationResults로 전체 갱신하면 assumptionResults: null
      act(() => { useAnalysisStore.getState().setValidationResults({ ...validation }) })
      expect(useAnalysisStore.getState().assumptionResults).toBeNull()
    })

    it('patchColumnNormality로 패치하면 assumptionResults가 보존된다 (after 검증)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      act(() => { useAnalysisStore.getState().setValidationResults(validation) })

      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useAnalysisStore.getState().setAssumptionResults(assumptions) })
      expect(useAnalysisStore.getState().assumptionResults).not.toBeNull()

      // 수정된 방식: patchColumnNormality 사용
      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]
      act(() => { useAnalysisStore.getState().patchColumnNormality(enriched) })

      // 둘 다 존재
      expect(useAnalysisStore.getState().validationResults?.columnStats?.[0].normality).toBeTruthy()
      expect(useAnalysisStore.getState().assumptionResults?.normality?.shapiroWilk?.pValue).toBe(0.3)
    })
  })
})
