import { describe, expect, it } from 'vitest'
import { getLocalizedSlotConfigs } from '@/components/analysis/variable-selector/localized-slot-metadata'
import type { SlotConfig } from '@/components/analysis/variable-selector/slot-configs'

const genericTerminology = {
  domain: 'generic' as const,
  language: 'en' as const,
  variables: {
    group: { title: 'Group Variable', description: 'Categorical variable defining groups to compare' },
    dependent: { title: 'Dependent Variable (Y)', description: 'Numeric variable to compare across groups' },
    independent: { title: 'Independent Variable (X)', description: 'Predictor variables' },
    factor: { title: 'Factor', description: 'Categorical factor variable' },
    covariate: { title: 'Covariate', description: 'Continuous control variable' },
    time: { title: 'Time Variable', description: 'Time or sequence variable' },
    event: { title: 'Event Variable', description: 'Binary outcome variable' },
    pairedFirst: { title: 'Time 1 / Before', description: 'First measurement' },
    pairedSecond: { title: 'Time 2 / After', description: 'Second measurement' },
    correlation: { title: 'Numeric Variables', description: 'Select 2 or more numeric variables to analyze correlations' },
  },
}

function createSlotConfig(overrides: Partial<SlotConfig>): SlotConfig {
  return {
    id: 'dependent',
    label: '종속 변수 (Y)',
    description: '분석하고자 하는 결과 변수',
    required: true,
    accepts: ['numeric'],
    multiple: false,
    colorScheme: 'info',
    mappingKey: 'dependentVar',
    ...overrides,
  }
}

describe('getLocalizedSlotConfigs', () => {
  it('uses Group Variable copy for group-comparison factor slots in the generic domain', () => {
    const [localized] = getLocalizedSlotConfigs([
      createSlotConfig({
        id: 'factor',
        label: '그룹 변수 (X)',
        description: '그룹을 나누는 범주형 변수',
        colorScheme: 'success',
        accepts: ['categorical'],
        mappingKey: 'groupVar',
      }),
    ], genericTerminology)

    expect(localized.label).toBe('Group Variable')
    expect(localized.description).toBe('Categorical variable defining groups to compare')
  })

  it('keeps Factor copy for true factor slots in the generic domain', () => {
    const [localized] = getLocalizedSlotConfigs([
      createSlotConfig({
        id: 'factor',
        label: '요인 변수',
        description: '2개의 범주형 요인 변수',
        colorScheme: 'success',
        accepts: ['categorical'],
        multiple: true,
        minCount: 2,
        maxCount: 2,
        mappingKey: 'groupVar',
      }),
    ], genericTerminology)

    expect(localized.label).toBe('Factor')
    expect(localized.description).toBe('Categorical factor variable')
  })

  it('uses context-aware copy for paired and multivariate variables slots', () => {
    const [pairedSlot, manovaSlot] = getLocalizedSlotConfigs([
      createSlotConfig({
        id: 'variables',
        label: '비교 변수',
        description: '대응 비교할 연속형 변수 2개',
        colorScheme: 'highlight',
        accepts: ['numeric'],
        multiple: true,
        minCount: 2,
        maxCount: 2,
        mappingKey: 'variables',
      }),
      createSlotConfig({
        id: 'variables',
        label: '종속 변수 (Y)',
        description: '2개 이상의 다변량 종속 변수들',
        colorScheme: 'info',
        accepts: ['numeric'],
        multiple: true,
        minCount: 2,
        mappingKey: 'variables',
      }),
    ], genericTerminology)

    expect(pairedSlot.label).toBe('Comparison Variables')
    expect(pairedSlot.description).toBe('Select the variables compared together as a matched or paired analysis.')
    expect(manovaSlot.label).toBe('Dependent Variables')
    expect(manovaSlot.description).toBe('Select the multiple numeric outcome variables analyzed together.')
  })

  it('preserves method-specific dependent and independent slot semantics in the generic domain', () => {
    const [testSlot, binarySlot, rowSlot, columnSlot] = getLocalizedSlotConfigs([
      createSlotConfig({
        id: 'dependent',
        label: '검정 변수',
        description: '검정할 연속형 변수',
      }),
      createSlotConfig({
        id: 'dependent',
        label: '이진 변수',
        description: '성공/실패를 나타내는 이진 변수',
      }),
      createSlotConfig({
        id: 'independent',
        label: '행 변수',
        description: '행을 구성할 범주형 변수',
        accepts: ['categorical'],
        colorScheme: 'highlight',
        mappingKey: 'independentVar',
      }),
      createSlotConfig({
        id: 'dependent',
        label: '열 변수',
        description: '열을 구성할 범주형 변수',
        accepts: ['categorical'],
      }),
    ], genericTerminology)

    expect(testSlot.label).toBe('Test Variable')
    expect(testSlot.description).toBe('Select the variable evaluated by this test.')
    expect(binarySlot.label).toBe('Binary Variable')
    expect(binarySlot.description).toBe('Select the binary outcome variable used in this test.')
    expect(rowSlot.label).toBe('Row Variable')
    expect(rowSlot.description).toBe('Select the categorical variable used for the table rows.')
    expect(columnSlot.label).toBe('Column Variable')
    expect(columnSlot.description).toBe('Select the categorical variable used for the table columns.')
  })
})
