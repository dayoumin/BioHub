/**
 * Smart Flow Store - 업로드 race condition 회귀 테스트
 *
 * 시나리오:
 * 1. uploadNonce: 같은 파일명 재업로드 시 이전 enrichment가 무시되는지
 * 2. patchColumnNormality: assumptionResults/methodCompatibility를 보존하는지
 * 3. resetSession: nonce가 증가하여 진행 중 enrichment를 무효화하는지
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

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
      useSmartFlowStore.getState().reset()
    })
  })

  // ===== 시나리오 1: uploadNonce =====

  describe('uploadNonce', () => {
    it('초기값은 0이다', () => {
      expect(useSmartFlowStore.getState().uploadNonce).toBe(0)
    })

    it('setUploadedFile 호출마다 nonce가 증가한다', () => {
      const store = useSmartFlowStore.getState()

      act(() => { store.setUploadedFile(new File(['a'], 'data.csv')) })
      expect(useSmartFlowStore.getState().uploadNonce).toBe(1)

      act(() => { useSmartFlowStore.getState().setUploadedFile(new File(['b'], 'data.csv')) })
      expect(useSmartFlowStore.getState().uploadNonce).toBe(2)
    })

    it('같은 파일명이라도 nonce가 다르면 stale 감지 가능', () => {
      const store = useSmartFlowStore.getState()

      // 첫 번째 업로드
      act(() => { store.setUploadedFile(new File(['a'], 'same-name.csv')) })
      const firstNonce = useSmartFlowStore.getState().uploadNonce

      // 두 번째 업로드 (같은 파일명)
      act(() => { useSmartFlowStore.getState().setUploadedFile(new File(['b'], 'same-name.csv')) })
      const secondNonce = useSmartFlowStore.getState().uploadNonce

      // 파일명은 같지만 nonce는 다름
      expect(useSmartFlowStore.getState().uploadedFileName).toBe('same-name.csv')
      expect(firstNonce).not.toBe(secondNonce)
    })

    it('resetSession은 nonce를 증가시켜 진행 중 enrichment를 무효화한다', () => {
      const store = useSmartFlowStore.getState()

      act(() => { store.setUploadedFile(new File(['a'], 'data.csv')) })
      const nonceBeforeReset = useSmartFlowStore.getState().uploadNonce

      act(() => { useSmartFlowStore.getState().resetSession() })
      const nonceAfterReset = useSmartFlowStore.getState().uploadNonce

      expect(nonceAfterReset).toBeGreaterThan(nonceBeforeReset)
    })
  })

  // ===== 시나리오 2: patchColumnNormality =====

  describe('patchColumnNormality', () => {
    it('normality를 columnStats에 패치한다', () => {
      const cols = [makeColumnStats({ name: 'weight' })]
      const validation = makeValidation(cols)

      act(() => { useSmartFlowStore.getState().setValidationResults(validation) })

      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]

      act(() => { useSmartFlowStore.getState().patchColumnNormality(enriched) })

      const result = useSmartFlowStore.getState().validationResults
      expect(result?.columnStats?.[0].normality?.pValue).toBe(0.42)
      expect(result?.columns?.[0].normality?.pValue).toBe(0.42)
    })

    it('assumptionResults를 보존한다 (핵심 regression)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      // Step 1: 데이터 업로드 → validationResults 설정
      act(() => { useSmartFlowStore.getState().setValidationResults(validation) })

      // Step 2/4: 가정 검정 결과가 먼저 도착
      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useSmartFlowStore.getState().setAssumptionResults(assumptions) })
      expect(useSmartFlowStore.getState().assumptionResults).not.toBeNull()

      // 늦게 도착한 enrichment: patchColumnNormality 사용
      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]
      act(() => { useSmartFlowStore.getState().patchColumnNormality(enriched) })

      // normality가 추가되었고 assumptionResults가 살아 있어야 함
      expect(useSmartFlowStore.getState().validationResults?.columnStats?.[0].normality).toBeTruthy()
      expect(useSmartFlowStore.getState().assumptionResults).not.toBeNull()
      expect(useSmartFlowStore.getState().assumptionResults?.normality?.shapiroWilk?.pValue).toBe(0.3)
    })

    it('methodCompatibility를 보존한다', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      act(() => { useSmartFlowStore.getState().setValidationResults(validation) })

      // setValidationResults가 생성한 methodCompatibility 확인
      const compatBefore = useSmartFlowStore.getState().methodCompatibility
      expect(compatBefore).not.toBeNull()

      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]
      act(() => { useSmartFlowStore.getState().patchColumnNormality(enriched) })

      // methodCompatibility가 동일하게 유지
      expect(useSmartFlowStore.getState().methodCompatibility).toBe(compatBefore)
    })

    it('validationResults가 null이면 아무것도 하지 않는다', () => {
      const enriched: ColumnStatistics[] = [makeColumnStats()]

      // no-op: validationResults가 없으므로 에러 없이 무시
      act(() => { useSmartFlowStore.getState().patchColumnNormality(enriched) })

      expect(useSmartFlowStore.getState().validationResults).toBeNull()
    })
  })

  // ===== 시나리오 3: 전체 race 시뮬레이션 =====

  describe('race condition 시뮬레이션: enrichment가 늦게 도착', () => {
    it('setValidationResults로 전체 덮어쓰면 assumptionResults가 사라진다 (before 검증)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      act(() => { useSmartFlowStore.getState().setValidationResults(validation) })

      // 가정 검정 결과 도착
      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useSmartFlowStore.getState().setAssumptionResults(assumptions) })
      expect(useSmartFlowStore.getState().assumptionResults).not.toBeNull()

      // 기존 버그 재현: setValidationResults로 전체 갱신하면 assumptionResults: null
      act(() => { useSmartFlowStore.getState().setValidationResults({ ...validation }) })
      expect(useSmartFlowStore.getState().assumptionResults).toBeNull()
    })

    it('patchColumnNormality로 패치하면 assumptionResults가 보존된다 (after 검증)', () => {
      const cols = [makeColumnStats()]
      const validation = makeValidation(cols)

      act(() => { useSmartFlowStore.getState().setValidationResults(validation) })

      const assumptions = {
        normality: { shapiroWilk: { statistic: 0.95, pValue: 0.3, isNormal: true } },
      }
      act(() => { useSmartFlowStore.getState().setAssumptionResults(assumptions) })
      expect(useSmartFlowStore.getState().assumptionResults).not.toBeNull()

      // 수정된 방식: patchColumnNormality 사용
      const enriched: ColumnStatistics[] = [{
        ...cols[0],
        normality: { statistic: 0.98, pValue: 0.42, isNormal: true, testName: 'shapiro-wilk' },
      }]
      act(() => { useSmartFlowStore.getState().patchColumnNormality(enriched) })

      // 둘 다 존재
      expect(useSmartFlowStore.getState().validationResults?.columnStats?.[0].normality).toBeTruthy()
      expect(useSmartFlowStore.getState().assumptionResults?.normality?.shapiroWilk?.pValue).toBe(0.3)
    })
  })
})
