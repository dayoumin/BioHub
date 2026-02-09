/**
 * 시나리오 3: 대응표본 케이스
 * - before, after 같은 변수명
 * - LLM이 대응 관계를 추론할 수 있는지 확인
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

describe('[Scenario 3] 대응표본 케이스', () => {
  const mockPairedData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 30,
    columns: [
      {
        name: 'before',
        type: 'numeric',
        mean: 72.3,
        std: 8.5,
        min: 55,
        max: 90,
        skewness: 0.2,
        uniqueValues: 28,
        missingCount: 0
      },
      {
        name: 'after',
        type: 'numeric',
        mean: 78.5,
        std: 7.2,
        min: 62,
        max: 95,
        skewness: -0.1,
        uniqueValues: 27,
        missingCount: 0
      },
      {
        name: 'improvement',
        type: 'numeric',
        mean: 6.2,
        std: 3.1,
        min: -2,
        max: 15,
        skewness: 0.5,
        uniqueValues: 25,
        missingCount: 0
      }
    ] as ColumnStatistics[]
  }

  it('변수명이 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    expect(result).not.toBeNull()
    expect(result!.anonymized.columns).toHaveLength(3)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual(['Var1', 'Var2', 'Var3'])
  })

  it('통계량은 보존되어야 함 (상관계수 계산 가능)', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    const var1 = result!.anonymized.columns!.find(c => c.name === 'Var1')
    const var2 = result!.anonymized.columns!.find(c => c.name === 'Var2')

    // 평균 차이 보존 (LLM이 대응관계 추론 가능)
    expect(var1!.mean).toBe(72.3)
    expect(var2!.mean).toBe(78.5)

    // 평균 차이가 improvement와 유사 (6.2)
    const meanDiff = var2!.mean! - var1!.mean!
    expect(meanDiff).toBeCloseTo(6.2, 1)
  })

  it('LLM 응답에서 대응 관계가 언급될 수 있음', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    // LLM이 이렇게 응답할 수 있음
    const llmResponse = 'Var1과 Var2는 높은 상관관계를 보입니다. Var3는 두 변수의 차이를 나타냅니다. 대응표본 t-test를 권장합니다.'

    const deanonymized = AnonymizationService.deanonymizeText(llmResponse, result!.mapping)

    expect(deanonymized).toBe('before과 after는 높은 상관관계를 보입니다. improvement는 두 변수의 차이를 나타냅니다. 대응표본 t-test를 권장합니다.')
  })

  it('변수명 없이도 통계적 특성으로 판단 가능함을 확인', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    // 익명화된 데이터만 봐도:
    // - Var1: mean=72.3
    // - Var2: mean=78.5
    // - Var3: mean=6.2 (차이값)
    // → LLM이 Var3 = Var2 - Var1 관계를 추론 가능

    const var3 = result!.anonymized.columns!.find(c => c.name === 'Var3')
    expect(var3!.mean).toBe(6.2)
  })

  it('매핑이 올바르게 생성되어야 함', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    expect(result!.mapping.variables).toHaveLength(3)
    expect(result!.mapping.variables.map(v => v.original)).toEqual([
      'before',
      'after',
      'improvement'
    ])
  })

  it('복잡한 텍스트 역변환', () => {
    const result = AnonymizationService.anonymize(mockPairedData as ValidationResults, 20)

    const text = `
분석 결과:
- Var1의 평균은 72.3입니다.
- Var2의 평균은 78.5입니다.
- Var3는 Var2와 Var1의 차이를 나타냅니다.
- Var1과 Var2 간 대응표본 t-test를 수행합니다.
    `.trim()

    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toContain('before의 평균은 72.3입니다.')
    expect(deanonymized).toContain('after의 평균은 78.5입니다.')
    expect(deanonymized).toContain('improvement는 after와 before의 차이를 나타냅니다.')
    expect(deanonymized).toContain('before과 after 간 대응표본 t-test를 수행합니다.')
  })
})
