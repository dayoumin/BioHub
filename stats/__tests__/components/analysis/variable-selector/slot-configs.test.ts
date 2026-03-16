/**
 * slot-configs 단위 테스트
 *
 * 검증 항목:
 * 1. getSlotConfigs: SelectorType별 올바른 슬롯 반환
 * 2. buildMappingFromSlots: 슬롯 → VariableMapping 변환
 * 3. validateSlots: 필수/최소/최대 제약 검증
 * 4. toAcceptedType: 변수 타입 변환
 */

import { describe, it, expect } from 'vitest'
import {
  getSlotConfigs,
  buildMappingFromSlots,
  validateSlots,
  toAcceptedType,
  isTypeAccepted,
  type SelectorType,
} from '@/components/analysis/variable-selector/slot-configs'

describe('getSlotConfigs', () => {

  const allTypes: SelectorType[] = [
    'group-comparison', 'correlation', 'multiple-regression',
    'paired', 'one-sample', 'chi-square', 'two-way-anova', 'default',
  ]

  it('모든 SelectorType에 대해 비어있지 않은 슬롯 배열 반환', () => {
    for (const type of allTypes) {
      const slots = getSlotConfigs(type)
      expect(slots.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('auto는 빈 배열 반환', () => {
    expect(getSlotConfigs('auto')).toEqual([])
  })

  it('group-comparison: dependent(연속) + factor(범주) + covariate?(연속)', () => {
    const slots = getSlotConfigs('group-comparison')
    expect(slots).toHaveLength(3)

    const dep = slots.find(s => s.id === 'dependent')
    expect(dep?.required).toBe(true)
    expect(dep?.accepts).toEqual(['numeric'])
    expect(dep?.multiple).toBe(false)
    expect(dep?.mappingKey).toBe('dependentVar')

    const factor = slots.find(s => s.id === 'factor')
    expect(factor?.required).toBe(true)
    expect(factor?.accepts).toEqual(['categorical'])
    expect(factor?.mappingKey).toBe('groupVar')

    const cov = slots.find(s => s.id === 'covariate')
    expect(cov?.required).toBe(false)
    expect(cov?.multiple).toBe(true)
  })

  it('correlation: variables(N, 연속, min2 max10)', () => {
    const slots = getSlotConfigs('correlation')
    expect(slots).toHaveLength(1)
    const vars = slots[0]
    expect(vars.id).toBe('variables')
    expect(vars.multiple).toBe(true)
    expect(vars.minCount).toBe(2)
    expect(vars.maxCount).toBe(10)
    expect(vars.accepts).toEqual(['numeric'])
  })

  it('paired: variables(2, 연속)', () => {
    const slots = getSlotConfigs('paired')
    expect(slots).toHaveLength(1)
    expect(slots[0].minCount).toBe(2)
    expect(slots[0].maxCount).toBe(2)
  })

  it('chi-square: independent(범주) + dependent(범주)', () => {
    const slots = getSlotConfigs('chi-square')
    expect(slots).toHaveLength(2)
    for (const s of slots) {
      expect(s.accepts).toEqual(['categorical'])
      expect(s.multiple).toBe(false)
    }
  })

  it('two-way-anova: dependent(연속) + factor(범주, min2 max2)', () => {
    const slots = getSlotConfigs('two-way-anova')
    const factor = slots.find(s => s.id === 'factor')
    expect(factor?.multiple).toBe(true)
    expect(factor?.minCount).toBe(2)
    expect(factor?.maxCount).toBe(2)
  })

  it('모든 슬롯에 id, label, colorScheme, mappingKey 존재', () => {
    for (const type of allTypes) {
      for (const slot of getSlotConfigs(type)) {
        expect(slot.id).toEqual(expect.any(String))
        expect(slot.label).toEqual(expect.any(String))
        expect(slot.colorScheme).toEqual(expect.any(String))
        expect(slot.mappingKey).toEqual(expect.any(String))
      }
    }
  })
})

describe('buildMappingFromSlots', () => {

  it('group-comparison: dependent + factor → VariableMapping', () => {
    const slots = getSlotConfigs('group-comparison')
    const assignments = {
      dependent: ['score'],
      factor: ['gender'],
      covariate: [],
    }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.dependentVar).toBe('score')
    expect(mapping.groupVar).toBe('gender')
    expect(mapping.covariate).toBeUndefined()
  })

  it('group-comparison with covariate → covariate 배열', () => {
    const slots = getSlotConfigs('group-comparison')
    const assignments = {
      dependent: ['weight'],
      factor: ['group'],
      covariate: ['age', 'height'],
    }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.covariate).toEqual(['age', 'height'])
  })

  it('correlation → variables 배열', () => {
    const slots = getSlotConfigs('correlation')
    const assignments = { variables: ['a', 'b', 'c'] }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.variables).toEqual(['a', 'b', 'c'])
  })

  it('two-way-anova: factor 2개 → groupVar 콤마 구분', () => {
    const slots = getSlotConfigs('two-way-anova')
    const assignments = {
      dependent: ['score'],
      factor: ['gender', 'treatment'],
    }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.groupVar).toBe('gender,treatment')
    expect(mapping.dependentVar).toBe('score')
  })

  it('multiple-regression: independent 다수 → independentVar 콤마 구분', () => {
    const slots = getSlotConfigs('multiple-regression')
    const assignments = {
      dependent: ['y'],
      independent: ['x1', 'x2', 'x3'],
    }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.independentVar).toBe('x1,x2,x3')
  })

  it('빈 assignments → 빈 매핑', () => {
    const slots = getSlotConfigs('group-comparison')
    const assignments = { dependent: [], factor: [], covariate: [] }
    const mapping = buildMappingFromSlots(slots, assignments)
    expect(mapping.dependentVar).toBeUndefined()
    expect(mapping.groupVar).toBeUndefined()
  })
})

describe('validateSlots', () => {

  it('필수 슬롯 미선택 → 에러', () => {
    const slots = getSlotConfigs('group-comparison')
    const errors = validateSlots(slots, { dependent: [], factor: [], covariate: [] })
    expect(errors.length).toBe(2) // dependent + factor
    expect(errors[0]).toContain('종속 변수')
    expect(errors[1]).toContain('그룹 변수')
  })

  it('필수 슬롯 선택 완료 → 에러 없음', () => {
    const slots = getSlotConfigs('group-comparison')
    const errors = validateSlots(slots, { dependent: ['a'], factor: ['b'], covariate: [] })
    expect(errors).toHaveLength(0)
  })

  it('correlation min 미달 → 에러', () => {
    const slots = getSlotConfigs('correlation')
    const errors = validateSlots(slots, { variables: ['a'] })
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain('최소 2개')
  })

  it('correlation min 충족 → 에러 없음', () => {
    const slots = getSlotConfigs('correlation')
    const errors = validateSlots(slots, { variables: ['a', 'b'] })
    expect(errors).toHaveLength(0)
  })

  it('paired maxCount 초과 → 에러', () => {
    const slots = getSlotConfigs('paired')
    const errors = validateSlots(slots, { variables: ['a', 'b', 'c'] })
    expect(errors.length).toBe(1)
    expect(errors[0]).toContain('최대 2개')
  })

  it('선택 슬롯 비어있어도 에러 없음', () => {
    const slots = getSlotConfigs('group-comparison')
    const errors = validateSlots(slots, { dependent: ['a'], factor: ['b'], covariate: [] })
    expect(errors).toHaveLength(0)
  })
})

describe('toAcceptedType', () => {

  it('continuous → numeric', () => {
    expect(toAcceptedType('continuous')).toBe('numeric')
  })

  it('categorical → categorical', () => {
    expect(toAcceptedType('categorical')).toBe('categorical')
  })

  it('binary → categorical', () => {
    expect(toAcceptedType('binary')).toBe('categorical')
  })
})

describe('isTypeAccepted', () => {

  it('numeric 슬롯에 numeric 허용', () => {
    const slot = getSlotConfigs('group-comparison')[0] // dependent, numeric only
    expect(isTypeAccepted(slot, 'numeric')).toBe(true)
    expect(isTypeAccepted(slot, 'categorical')).toBe(false)
  })

  it('both 타입 허용 슬롯', () => {
    const slot = getSlotConfigs('default')[0] // accepts both
    expect(isTypeAccepted(slot, 'numeric')).toBe(true)
    expect(isTypeAccepted(slot, 'categorical')).toBe(true)
  })
})
