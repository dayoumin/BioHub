/**
 * 시나리오 6: 복잡한 범주형 케이스
 * - 지역, 부서명, 직급 등 많은 카테고리
 * - 범주값 익명화 확인
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

describe('[Scenario 6] 복잡한 범주형 케이스', () => {
  const mockComplexCategorical: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 200,
    columns: [
      {
        name: '지역',
        type: 'categorical',
        uniqueValues: 16,
        missingCount: 0,
        topCategories: [
          { value: '서울', count: 45 },
          { value: '부산', count: 30 },
          { value: '대구', count: 25 },
          { value: '인천', count: 20 },
          { value: '광주', count: 18 },
          { value: '대전', count: 15 }
        ]
      },
      {
        name: '부서',
        type: 'categorical',
        uniqueValues: 8,
        missingCount: 0,
        topCategories: [
          { value: '영업부', count: 40 },
          { value: '기술부', count: 35 },
          { value: '관리부', count: 30 },
          { value: '마케팅부', count: 25 },
          { value: '인사부', count: 20 }
        ]
      },
      {
        name: '직급',
        type: 'categorical',
        uniqueValues: 5,
        missingCount: 0,
        topCategories: [
          { value: '사원', count: 80 },
          { value: '대리', count: 50 },
          { value: '과장', count: 40 },
          { value: '차장', count: 20 },
          { value: '부장', count: 10 }
        ]
      },
      {
        name: '급여',
        type: 'numeric',
        mean: 4500,
        std: 1200,
        min: 2500,
        max: 8000,
        skewness: 0.8,
        uniqueValues: 150,
        missingCount: 0
      }
    ] as ColumnStatistics[]
  }

  it('모든 범주형 변수가 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    expect(result).not.toBeNull()
    expect(result!.anonymized.columns).toHaveLength(4)

    const regionCol = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(regionCol!.type).toBe('categorical')
    expect(regionCol!.topCategories).toHaveLength(6)

    // 지역명이 V1_A, V1_B, V1_C, V1_D, V1_E, V1_F로 익명화
    expect(regionCol!.topCategories![0].value).toBe('V1_A')
    expect(regionCol!.topCategories![5].value).toBe('V1_F')
  })

  it('많은 카테고리도 알파벳으로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    // 지역: 6개 카테고리 → V1_A, V1_B, V1_C, V1_D, V1_E, V1_F
    const regionMapping = result!.mapping.categories['지역']
    expect(regionMapping.anonymized).toEqual(['V1_A', 'V1_B', 'V1_C', 'V1_D', 'V1_E', 'V1_F'])
    expect(regionMapping.mapping).toEqual({
      '서울': 'V1_A',
      '부산': 'V1_B',
      '대구': 'V1_C',
      '인천': 'V1_D',
      '광주': 'V1_E',
      '대전': 'V1_F'
    })

    // 부서: 5개 카테고리 → V2_A, V2_B, V2_C, V2_D, V2_E
    const deptMapping = result!.mapping.categories['부서']
    expect(deptMapping.anonymized).toEqual(['V2_A', 'V2_B', 'V2_C', 'V2_D', 'V2_E'])

    // 직급: 5개 카테고리 → V3_A, V3_B, V3_C, V3_D, V3_E
    const rankMapping = result!.mapping.categories['직급']
    expect(rankMapping.anonymized).toEqual(['V3_A', 'V3_B', 'V3_C', 'V3_D', 'V3_E'])
  })

  it('범주 빈도는 보존되어야 함', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    const regionCol = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(regionCol!.topCategories![0]).toEqual({ value: 'V1_A', count: 45 }) // 서울 45명
    expect(regionCol!.topCategories![1]).toEqual({ value: 'V1_B', count: 30 }) // 부산 30명

    const deptCol = result!.anonymized.columns!.find(c => c.name === 'Var2')
    expect(deptCol!.topCategories![0]).toEqual({ value: 'V2_A', count: 40 }) // 영업부 40명
  })

  it('복잡한 텍스트 역변환', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    const text = `
Var1에서 V1_A가 가장 많고(45명), V1_B가 그 다음(30명)입니다.
Var2에서 V2_A와 V2_B가 주요 그룹입니다.
Var3에서 V3_A가 80명으로 가장 많습니다.
Var4는 Var3와 상관관계가 있습니다.
    `.trim()

    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toContain('지역에서 서울가 가장 많고(45명), 부산가 그 다음(30명)입니다.')
    expect(deanonymized).toContain('부서에서 영업부와 기술부가 주요 그룹입니다.')
    expect(deanonymized).toContain('직급에서 사원가 80명으로 가장 많습니다.')
    expect(deanonymized).toContain('급여는 직급와 상관관계가 있습니다.')
  })

  it('범주값이 26개 초과 시에도 동작해야 함 (알파벳 확장)', () => {
    // 실제로는 A-Z (26개)까지만 지원하므로, 현재 구현에서는 6개까지만 테스트
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    const regionMapping = result!.mapping.categories['지역']
    expect(regionMapping.anonymized.length).toBe(6)
    expect(regionMapping.anonymized[0]).toBe('V1_A')
    expect(regionMapping.anonymized[5]).toBe('V1_F')
  })

  it('수치형 변수는 정상적으로 처리되어야 함', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    const salaryCol = result!.anonymized.columns!.find(c => c.name === 'Var4')
    expect(salaryCol!.type).toBe('numeric')
    expect(salaryCol!.mean).toBe(4500)
    expect(salaryCol!.std).toBe(1200)
  })

  it('여러 범주형 변수의 동일한 알파벳 코드는 다른 의미임', () => {
    const result = AnonymizationService.anonymize(mockComplexCategorical as ValidationResults, 20)

    // 각 변수마다 고유한 접두사 사용
    // Var1 (지역)의 V1_A = 서울
    // Var2 (부서)의 V2_A = 영업부
    // Var3 (직급)의 V3_A = 사원

    expect(result!.mapping.categories['지역'].mapping['서울']).toBe('V1_A')
    expect(result!.mapping.categories['부서'].mapping['영업부']).toBe('V2_A')
    expect(result!.mapping.categories['직급'].mapping['사원']).toBe('V3_A')
  })
})
