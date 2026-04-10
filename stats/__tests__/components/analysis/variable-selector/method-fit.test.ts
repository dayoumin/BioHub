import { describe, expect, it } from 'vitest'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import {
  buildSlotsFromMethodRequirements,
  buildMethodFitState,
  buildVariableCandidates,
  resolveMethodSlots,
  type SelectorColumnInfo,
} from '@/components/analysis/variable-selector/method-fit'

function getGroupComparisonSlots() {
  const requirements = getMethodRequirements('two-sample-t')
  expect(requirements).toBeDefined()
  return {
    requirements,
    slots: resolveMethodSlots('group-comparison', requirements),
  }
}

describe('method-fit helpers', () => {
  it('derives two-sample-t slots directly from method requirements', () => {
    const requirements = getMethodRequirements('two-sample-t')
    expect(requirements).toBeDefined()

    const slots = resolveMethodSlots('group-comparison', requirements)
    expect(slots).toHaveLength(2)
    expect(slots.map(slot => slot.id)).toEqual(['dependent', 'factor'])
  })

  it('falls back to generic repeated-measures slots when method requirements are not representable yet', () => {
    const requirements = getMethodRequirements('repeated-measures-anova')
    expect(requirements).toBeDefined()

    const slots = resolveMethodSlots('repeated-measures', requirements)
    expect(slots).toHaveLength(2)
    expect(slots.map(slot => slot.id)).toEqual(['variables', 'group'])
  })

  it('derives analysis and covariate slots for partial-correlation from method requirements', () => {
    const requirements = getMethodRequirements('partial-correlation')
    expect(requirements).toBeDefined()

    const slots = resolveMethodSlots('correlation', requirements)
    expect(slots).toHaveLength(2)
    expect(slots.map(slot => slot.id)).toEqual(['variables', 'covariate'])
    expect(slots[1]).toMatchObject({
      mappingKey: 'covariate',
      multiple: true,
      required: true,
    })
  })

  it('builds a single categorical slot for chi-square-goodness from method requirements', () => {
    const requirements = getMethodRequirements('chi-square-goodness')
    expect(requirements).toBeDefined()

    const slots = buildSlotsFromMethodRequirements('chi-square', requirements)
    expect(slots).toHaveLength(1)
    expect(slots?.[0]).toMatchObject({
      id: 'dependent',
      mappingKey: 'dependentVar',
      accepts: ['categorical'],
      multiple: false,
      required: true,
    })
  })

  it('builds a paired categorical variables slot for mcnemar from method requirements', () => {
    const requirements = getMethodRequirements('mcnemar')
    expect(requirements).toBeDefined()

    const slots = buildSlotsFromMethodRequirements('chi-square', requirements)
    expect(slots).toHaveLength(1)
    expect(slots?.[0]).toMatchObject({
      id: 'variables',
      mappingKey: 'variables',
      accepts: ['categorical'],
      multiple: true,
      minCount: 2,
      maxCount: 2,
      required: true,
    })
  })

  it('blocks when a required slot has no valid candidates in the dataset', () => {
    const { requirements, slots } = getGroupComparisonSlots()
    const columns: SelectorColumnInfo[] = [
      {
        name: 'pre',
        type: 'numeric',
        rawType: 'continuous',
        dataType: 'number',
        uniqueCount: 12,
        missingCount: 0,
        nonMissingCount: 12,
        sampleValues: [1, 2, 3],
      },
      {
        name: 'post',
        type: 'numeric',
        rawType: 'continuous',
        dataType: 'number',
        uniqueCount: 12,
        missingCount: 0,
        nonMissingCount: 12,
        sampleValues: [2, 3, 4],
      },
    ]

    const result = buildMethodFitState({
      slots,
      assignments: { dependent: ['pre'], factor: [], covariate: [] },
      columns,
      methodRequirements: requirements,
      methodId: 'two-sample-t',
    })

    expect(result.status).toBe('blocked')
    expect(result.message).toContain('그룹')
  })

  it('returns ready when required t-test roles are assigned with valid types', () => {
    const { requirements, slots } = getGroupComparisonSlots()
    const columns: SelectorColumnInfo[] = [
      {
        name: 'score',
        type: 'numeric',
        rawType: 'continuous',
        dataType: 'number',
        uniqueCount: 20,
        missingCount: 0,
        nonMissingCount: 20,
        sampleValues: [75, 80, 77],
      },
      {
        name: 'group',
        type: 'categorical',
        rawType: 'categorical',
        dataType: 'string',
        uniqueCount: 2,
        missingCount: 0,
        nonMissingCount: 20,
        sampleValues: ['A', 'B', 'A'],
      },
    ]

    const result = buildMethodFitState({
      slots,
      assignments: { dependent: ['score'], factor: ['group'], covariate: [] },
      columns,
      methodRequirements: requirements,
      methodId: 'two-sample-t',
    })

    expect(result.status).toBe('ready')
  })

  it('marks a binary-like categorical column as recommended for the group slot', () => {
    const { requirements, slots } = getGroupComparisonSlots()
    const columns: SelectorColumnInfo[] = [
      {
        name: 'score',
        type: 'numeric',
        rawType: 'continuous',
        dataType: 'number',
        uniqueCount: 20,
        missingCount: 0,
        nonMissingCount: 20,
        sampleValues: [75, 80, 77],
      },
      {
        name: 'sex',
        type: 'categorical',
        rawType: 'categorical',
        dataType: 'string',
        uniqueCount: 2,
        missingCount: 0,
        nonMissingCount: 20,
        sampleValues: ['M', 'F', 'M'],
      },
      {
        name: 'age',
        type: 'numeric',
        rawType: 'continuous',
        dataType: 'number',
        uniqueCount: 20,
        missingCount: 0,
        nonMissingCount: 20,
        sampleValues: [21, 22, 20],
      },
    ]

    const candidates = buildVariableCandidates({
      columns,
      slots,
      assignments: { dependent: [], factor: [], covariate: [] },
      focusSlotId: 'factor',
      methodRequirements: requirements,
      methodId: 'two-sample-t',
    })

    expect(candidates.find(candidate => candidate.column.name === 'sex')?.status).toBe('recommended')
    expect(candidates.find(candidate => candidate.column.name === 'age')?.status).toBe('invalid')
  })

  it('surfaces a mismatch hint before slot-based validation', () => {
    const { requirements, slots } = getGroupComparisonSlots()

    const result = buildMethodFitState({
      slots,
      assignments: { dependent: [], factor: [], covariate: [] },
      columns: [],
      methodRequirements: requirements,
      methodId: 'two-sample-t',
      mismatchHint: {
        title: '현재 데이터는 대응 비교 구조에 더 가깝습니다',
        message: '전후 측정 구조가 감지되었습니다.',
        actionLabel: '대응표본 t-검정을 검토하세요.',
      },
    })

    expect(result.status).toBe('mismatch')
    expect(result.actionLabel).toContain('대응표본')
  })
})
