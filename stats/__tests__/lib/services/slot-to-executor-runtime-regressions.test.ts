import { describe, it, expect } from 'vitest'
import { getSlotConfigs, buildMappingFromSlots } from '@/components/analysis/variable-selector/slot-configs'
import { normalizeSlotMapping } from '@/lib/services/statistical-executor'

function simulatePipeline(
  selectorType: Parameters<typeof getSlotConfigs>[0],
  assignments: Record<string, string[]>,
  methodId: string,
): Record<string, unknown> {
  const slots = getSlotConfigs(selectorType)
  const mapping = buildMappingFromSlots(slots, assignments)
  return normalizeSlotMapping(mapping as Record<string, unknown>, methodId)
}

describe('slot to executor runtime regressions', () => {
  it('normalizes mixed-model slot output into handler-friendly arrays', () => {
    const result = simulatePipeline('mixed-model', {
      dependent: ['outcome'],
      fixed: ['treatment', 'timepoint'],
      random: ['subject'],
    }, 'mixed-model')

    expect(result.dependent).toEqual(['outcome'])
    expect(result.independent).toEqual(['treatment', 'timepoint'])
    expect(result.blocking).toEqual(['subject'])
    expect(result.groupVar).toBeUndefined()
  })

  it('normalizes discriminant-analysis slot output into groupVar and predictor arrays', () => {
    const result = simulatePipeline('discriminant', {
      group: ['species'],
      predictors: ['length', 'width'],
    }, 'discriminant-analysis')

    expect(result.groupVar).toBe('species')
    expect(result.dependentVar).toBeUndefined()
    expect(result.independentVar).toEqual(['length', 'width'])
  })
})
