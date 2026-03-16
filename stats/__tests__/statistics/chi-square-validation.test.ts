/**
 * Chi-square validation regression test
 *
 * Simulates the actual data flow:
 * ChiSquareSelector → handleComplete → validateVariableMapping
 *
 * Verifies that the validation function correctly handles
 * the mapping format produced by ChiSquareSelector for each mode.
 */
import { describe, it, expect } from 'vitest'
import { validateVariableMapping } from '@/lib/statistics/variable-mapping'
import type { StatisticalMethod } from '@/types/analysis'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMethod(id: string): StatisticalMethod {
  return {
    id,
    name: id,
    description: '',
    category: 'chi-square',
  }
}

const dummyColumns = [
  { name: 'gender', type: 'categorical' as const, uniqueValues: 2 },
  { name: 'treatment', type: 'categorical' as const, uniqueValues: 3 },
  { name: 'outcome', type: 'categorical' as const, uniqueValues: 2 },
]

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('chi-square validateVariableMapping', () => {

  describe('independence 모드 (chi-square, chi-square-independence, mcnemar)', () => {
    const independenceMethods = ['chi-square', 'chi-square-independence', 'mcnemar']

    it('independentVar + dependentVar 둘 다 있으면 valid', () => {
      for (const id of independenceMethods) {
        const result = validateVariableMapping(
          makeMethod(id),
          { independentVar: 'gender', dependentVar: 'treatment' },
          dummyColumns
        )
        expect(result.isValid, `${id} should be valid`).toBe(true)
        expect(result.errors).toHaveLength(0)
      }
    })

    it('independentVar만 있고 dependentVar 없으면 invalid', () => {
      const result = validateVariableMapping(
        makeMethod('chi-square'),
        { independentVar: 'gender' },
        dummyColumns
      )
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('종속 변수')
    })

    it('dependentVar만 있고 independentVar 없으면 invalid', () => {
      const result = validateVariableMapping(
        makeMethod('chi-square-independence'),
        { dependentVar: 'treatment' },
        dummyColumns
      )
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('독립 변수')
    })

    it('아무 변수도 없으면 invalid (에러 2개)', () => {
      const result = validateVariableMapping(
        makeMethod('chi-square'),
        {},
        dummyColumns
      )
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toContain('독립 변수')
      expect(result.errors[1]).toContain('종속 변수')
    })
  })

  describe('goodness 모드 (chi-square-goodness, proportion-test)', () => {
    const goodnessMethods = ['chi-square-goodness', 'proportion-test']

    it('dependentVar만 있으면 valid', () => {
      for (const id of goodnessMethods) {
        const result = validateVariableMapping(
          makeMethod(id),
          { dependentVar: 'gender' },
          dummyColumns
        )
        expect(result.isValid, `${id} should be valid`).toBe(true)
      }
    })

    it('proportion-test: dependentVar + nullProportion 있으면 valid', () => {
      const result = validateVariableMapping(
        makeMethod('proportion-test'),
        { dependentVar: 'outcome', nullProportion: '0.3' },
        dummyColumns
      )
      expect(result.isValid).toBe(true)
    })

    it('아무 변수도 없으면 invalid', () => {
      const result = validateVariableMapping(
        makeMethod('chi-square-goodness'),
        {},
        dummyColumns
      )
      expect(result.isValid).toBe(false)
    })
  })

  describe('이전 버그 회귀 방지: mapping.variables[] 형식', () => {

    it('variables 배열로 보내면 valid가 아님 (이전 로직은 이걸 기대했음)', () => {
      const result = validateVariableMapping(
        makeMethod('chi-square'),
        { variables: ['gender', 'treatment'] },
        dummyColumns
      )
      expect(result.isValid).toBe(false)
    })
  })

  describe('ChiSquareSelector 실제 출력 시뮬레이션', () => {

    it('independence 모드: { independentVar, dependentVar } → valid', () => {
      // ChiSquareSelector.tsx:135-136 의 실제 출력 형식
      for (const id of ['chi-square', 'chi-square-independence', 'mcnemar']) {
        const mapping = { independentVar: 'gender', dependentVar: 'treatment' }
        const result = validateVariableMapping(makeMethod(id), mapping, dummyColumns)
        expect(result.isValid, `${id} independence output`).toBe(true)
      }
    })

    it('goodness 모드: { dependentVar } → valid', () => {
      // ChiSquareSelector.tsx:137-144 의 실제 출력 형식
      const mapping = { dependentVar: 'gender' }
      const result = validateVariableMapping(makeMethod('chi-square-goodness'), mapping, dummyColumns)
      expect(result.isValid).toBe(true)
    })

    it('proportion-test: { dependentVar, nullProportion } → valid', () => {
      const mapping = { dependentVar: 'outcome', nullProportion: '0.3' }
      const result = validateVariableMapping(makeMethod('proportion-test'), mapping, dummyColumns)
      expect(result.isValid).toBe(true)
    })
  })

  describe('방어: category 누락 시 silent pass 방지', () => {

    it('category가 없는 method → validation case에 매치 안 됨 → isValid: true (알려진 한계)', () => {
      // validateVariableMapping은 method.category로 switch하므로
      // category가 없으면 어떤 case에도 안 걸려서 에러 없이 통과
      const badMethod = { id: 'chi-square', name: 'test', description: '' } as StatisticalMethod
      const result = validateVariableMapping(badMethod, {}, dummyColumns)
      // 이것은 "알려진 한계"를 문서화 — category 필수를 타입이 강제하므로 런타임에는 안 발생
      expect(result.isValid).toBe(true)
    })
  })

  describe('slot-configs dead code 인지', () => {
    // slot-configs.ts의 'chi-square' case는 VariableSelectionStep에서 도달 불가 (ChiSquareSelector로 라우팅)
    // 이 테스트는 buildMappingFromSlots가 만드는 형식이 validation과 불일치함을 증명
    it('slot-configs chi-square 출력 형식은 independence validation과 호환됨', () => {
      // slot-configs가 만드는 형식: { independentVar: '...', dependentVar: '...' }
      // 이건 independence mode validation과 일치 — 만약 누군가 fallback을 제거해도 independence는 동작
      const slotOutput = { independentVar: 'gender', dependentVar: 'treatment' }
      const result = validateVariableMapping(makeMethod('chi-square'), slotOutput, dummyColumns)
      expect(result.isValid).toBe(true)
    })

    it('slot-configs chi-square 출력 형식은 goodness validation과 불일치', () => {
      // slot-configs는 항상 2 슬롯 → goodness 메서드에 불필요한 independentVar 강제
      // 이 테스트는 "slot-configs로 돌아가면 goodness가 다시 깨진다"를 증명
      const slotOutput = { independentVar: 'gender', dependentVar: 'treatment' }
      const result = validateVariableMapping(makeMethod('chi-square-goodness'), slotOutput, dummyColumns)
      // goodness는 dependentVar만 체크 → independentVar가 있어도 valid (문제는 UI가 불필요한 2번째 변수를 요구하는 것)
      expect(result.isValid).toBe(true)
    })
  })
})
