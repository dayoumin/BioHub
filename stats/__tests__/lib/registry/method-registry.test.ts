/**
 * Method Registry 단위 테스트
 *
 * 검증 항목:
 * 1. boot 데이터: 기존 SELECTOR_MAP과 동치성
 * 2. getSelectorType(): 등록된 ID → 올바른 타입, 미등록 → 'default'
 * 3. registerMethod(): 새 메서드 등록 + 별칭 + canonical 자동 등록
 * 4. getMethodRequirements(): requirements 저장/조회
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getSelectorType,
  registerMethod,
  getMethodRequirements,
  getRegistrySize,
} from '@/lib/registry'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

describe('Method Registry', () => {
  describe('boot 데이터 (기존 SELECTOR_MAP 동치성)', () => {
    it('등록된 엔트리가 60개 이상이어야 함', () => {
      // 기존 SELECTOR_MAP: 64 primary + 9 legacy = 73 entries
      expect(getRegistrySize()).toBeGreaterThanOrEqual(60)
    })

    // Primary IDs (method-mapping.ts)
    const primaryMappings: Array<[string, string]> = [
      ['one-sample-t', 'one-sample'],
      ['paired-t', 'paired'],
      ['wilcoxon', 'paired'],
      ['two-sample-t', 'group-comparison'],
      ['welch-t', 'group-comparison'],
      ['one-way-anova', 'group-comparison'],
      ['mann-whitney', 'group-comparison'],
      ['kruskal-wallis', 'group-comparison'],
      ['two-way-anova', 'two-way-anova'],
      ['correlation', 'correlation'],
      ['pca', 'correlation'],
      ['simple-regression', 'multiple-regression'],
      ['logistic-regression', 'multiple-regression'],
      ['chi-square', 'chi-square'],
      ['chi-square-independence', 'chi-square'],
      ['friedman', 'auto'],
      ['repeated-measures-anova', 'auto'],
      ['arima', 'auto'],
      ['kaplan-meier', 'auto'],
      ['power-analysis', 'auto'],
    ]

    it.each(primaryMappings)(
      'primary: %s → %s',
      (methodId, expectedType) => {
        expect(getSelectorType(methodId)).toBe(expectedType)
      }
    )

    // Legacy aliases (statistical-methods.ts canonical IDs)
    const legacyMappings: Array<[string, string]> = [
      ['t-test', 'group-comparison'],
      ['anova', 'group-comparison'],
      ['regression', 'multiple-regression'],
      ['cluster', 'correlation'],
      ['roc-curve', 'auto'],
    ]

    it.each(legacyMappings)(
      'legacy alias: %s → %s',
      (methodId, expectedType) => {
        expect(getSelectorType(methodId)).toBe(expectedType)
      }
    )
  })

  describe('getSelectorType()', () => {
    it('미등록 ID → "default" 반환', () => {
      expect(getSelectorType('nonexistent-method')).toBe('default')
      expect(getSelectorType('')).toBe('default')
    })
  })

  describe('registerMethod()', () => {
    it('새 메서드 등록 후 getSelectorType()으로 조회 가능', () => {
      registerMethod({
        id: '__test-new-method__',
        selectorType: 'paired',
      })
      expect(getSelectorType('__test-new-method__')).toBe('paired')
    })

    it('별칭도 같은 selectorType으로 매핑', () => {
      registerMethod({
        id: '__test-alias-primary__',
        selectorType: 'one-sample',
        aliases: ['__test-alias-1__', '__test-alias-2__'],
      })
      expect(getSelectorType('__test-alias-primary__')).toBe('one-sample')
      expect(getSelectorType('__test-alias-1__')).toBe('one-sample')
      expect(getSelectorType('__test-alias-2__')).toBe('one-sample')
    })

    it('name + category 제공 시 STATISTICAL_METHODS에 자동 등록', () => {
      const testId = '__test-auto-canonical__'
      expect(STATISTICAL_METHODS[testId]).toBeUndefined()

      registerMethod({
        id: testId,
        selectorType: 'correlation',
        name: 'Test Auto Canonical',
        koreanName: '테스트 자동 등록',
        description: 'Test method for auto-registration',
        category: 'descriptive',
      })

      expect(STATISTICAL_METHODS[testId]).toBeDefined()
      expect(STATISTICAL_METHODS[testId].name).toBe('Test Auto Canonical')
      expect(STATISTICAL_METHODS[testId].koreanName).toBe('테스트 자동 등록')
      expect(STATISTICAL_METHODS[testId].category).toBe('descriptive')
    })

    it('이미 STATISTICAL_METHODS에 있으면 덮어쓰지 않음', () => {
      const existing = STATISTICAL_METHODS['t-test']
      expect(existing).toBeDefined()

      registerMethod({
        id: 't-test',
        selectorType: 'group-comparison',
        name: 'Should Not Overwrite',
        category: 'other',
      })

      // 기존 이름 유지
      expect(STATISTICAL_METHODS['t-test'].name).toBe(existing.name)
    })

    it('selectorType 충돌 시 console.warn 발생', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      registerMethod({
        id: '__test-conflict__',
        selectorType: 'paired',
      })
      // 같은 ID를 다른 selectorType으로 재등록
      registerMethod({
        id: '__test-conflict__',
        selectorType: 'correlation',
      })

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('selectorType 충돌')
      )
      // 새 값으로 덮어씌워짐
      expect(getSelectorType('__test-conflict__')).toBe('correlation')

      warnSpy.mockRestore()
    })

    it('동일 selectorType 재등록은 경고 없음 (idempotent)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      registerMethod({
        id: '__test-idempotent__',
        selectorType: 'auto',
      })
      registerMethod({
        id: '__test-idempotent__',
        selectorType: 'auto',
      })

      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    })
  })

  describe('getMethodRequirements()', () => {
    it('requirements 등록 후 조회 가능', () => {
      registerMethod({
        id: '__test-with-reqs__',
        selectorType: 'group-comparison',
        requirements: {
          minSampleSize: 30,
          variableTypes: ['numeric', 'categorical'],
          assumptions: ['정규성', '등분산성'],
        },
      })

      const reqs = getMethodRequirements('__test-with-reqs__')
      expect(reqs).toBeDefined()
      expect(reqs!.minSampleSize).toBe(30)
      expect(reqs!.variableTypes).toEqual(['numeric', 'categorical'])
      expect(reqs!.assumptions).toEqual(['정규성', '등분산성'])
    })

    it('requirements 없이 등록한 메서드 → undefined', () => {
      registerMethod({
        id: '__test-no-reqs__',
        selectorType: 'auto',
      })
      expect(getMethodRequirements('__test-no-reqs__')).toBeUndefined()
    })

    it('미등록 메서드 → undefined', () => {
      expect(getMethodRequirements('__never-registered__')).toBeUndefined()
    })
  })
})
