/**
 * 시나리오 1: 기본 케이스
 * - 수치형 3개 + 범주형 2개
 * - 정상 익명화/복원
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService, ResponseDeanonymizer } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics, AIRecommendation } from '@/types/smart-flow'

describe('[Scenario 1] 기본 케이스 - 수치형 + 범주형', () => {
  const mockValidationResults: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 100,
    columns: [
      {
        name: 'age',
        type: 'numeric',
        mean: 35.5,
        std: 12.3,
        min: 18,
        max: 65,
        skewness: 0.2,
        uniqueValues: 48,
        missingCount: 0
      },
      {
        name: 'income',
        type: 'numeric',
        mean: 55000,
        std: 15000,
        min: 20000,
        max: 120000,
        skewness: 0.5,
        uniqueValues: 87,
        missingCount: 2
      },
      {
        name: 'score',
        type: 'numeric',
        mean: 75.2,
        std: 8.4,
        min: 50,
        max: 95,
        skewness: -0.3,
        uniqueValues: 46,
        missingCount: 0
      },
      {
        name: 'gender',
        type: 'categorical',
        uniqueValues: 2,
        missingCount: 0,
        topCategories: [
          { value: 'Male', count: 55 },
          { value: 'Female', count: 45 }
        ]
      },
      {
        name: 'group',
        type: 'categorical',
        uniqueValues: 3,
        missingCount: 0,
        topCategories: [
          { value: 'Control', count: 35 },
          { value: 'Treatment A', count: 30 },
          { value: 'Treatment B', count: 35 }
        ]
      }
    ] as ColumnStatistics[]
  }

  it('변수명이 Var1, Var2, ... 로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    expect(result).not.toBeNull()
    expect(result!.anonymized.columns).toHaveLength(5)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual(['Var1', 'Var2', 'Var3', 'Var4', 'Var5'])
  })

  it('범주형 값이 V{colIndex}_A, V{colIndex}_B 형식으로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const genderCol = result!.anonymized.columns!.find(c => c.name === 'Var4')
    expect(genderCol).toBeDefined()
    expect(genderCol!.topCategories).toEqual([
      { value: 'V4_A', count: 55 },
      { value: 'V4_B', count: 45 }
    ])

    const groupCol = result!.anonymized.columns!.find(c => c.name === 'Var5')
    expect(groupCol).toBeDefined()
    expect(groupCol!.topCategories).toEqual([
      { value: 'V5_A', count: 35 },
      { value: 'V5_B', count: 30 },
      { value: 'V5_C', count: 35 }
    ])
  })

  it('매핑 정보가 올바르게 생성되어야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    expect(result!.mapping.variables).toHaveLength(5)
    expect(result!.mapping.variables[0]).toEqual({
      original: 'age',
      anonymized: 'Var1',
      type: 'numeric',
      isId: false
    })

    expect(result!.mapping.categories['gender']).toEqual({
      original: ['Male', 'Female'],
      anonymized: ['V4_A', 'V4_B'],
      mapping: { 'Male': 'V4_A', 'Female': 'V4_B' },
      reverseMapping: { 'V4_A': 'Male', 'V4_B': 'Female' }
    })
  })

  it('변수명 역변환이 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const original = AnonymizationService.deanonymizeVariable('Var1', result!.mapping)
    expect(original).toBe('age')

    const original2 = AnonymizationService.deanonymizeVariable('Var4', result!.mapping)
    expect(original2).toBe('gender')
  })

  it('범주값 역변환이 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const original = AnonymizationService.deanonymizeCategory('gender', 'V4_A', result!.mapping)
    expect(original).toBe('Male')

    const original2 = AnonymizationService.deanonymizeCategory('group', 'V5_C', result!.mapping)
    expect(original2).toBe('Treatment B')
  })

  it('텍스트 역변환이 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const text = 'Var1과 Var4 간의 관계를 분석합니다. V4_A와 V4_B를 비교합니다.'
    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toBe('age과 gender 간의 관계를 분석합니다. Male와 Female를 비교합니다.')
  })

  it('AI 추천 결과 역변환이 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const mockRecommendation: AIRecommendation = {
      method: {
        id: 't-test',
        name: '독립표본 t-검정',
        description: 'Var1을 종속변수로, Var4를 독립변수로 사용',
        category: 't-test'
      },
      confidence: 0.9,
      reasoning: [
        'Var1은 정규분포를 따름',
        'Var4는 2개 그룹을 가짐',
        'V4_A와 V4_B 비교 가능'
      ],
      assumptions: [
        { name: 'Var1 정규성', passed: true, pValue: 0.123 }
      ],
      alternatives: [
        {
          id: 'mann-whitney',
          name: 'Mann-Whitney U',
          description: 'Var1이 비정규일 경우',
          category: 'nonparametric'
        }
      ]
    }

    const deanonymized = ResponseDeanonymizer.deanonymizeRecommendation(
      mockRecommendation,
      result!.mapping
    )

    expect(deanonymized.method.description).toBe('age을 종속변수로, gender를 독립변수로 사용')
    expect(deanonymized.reasoning[0]).toBe('age은 정규분포를 따름')
    expect(deanonymized.reasoning[1]).toBe('gender는 2개 그룹을 가짐')
    expect(deanonymized.reasoning[2]).toBe('Male와 Female 비교 가능')
    expect(deanonymized.assumptions![0].name).toBe('age 정규성')
    expect(deanonymized.alternatives![0].description).toBe('age이 비정규일 경우')
  })

  it('메타데이터가 올바르게 생성되어야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    expect(result!.mapping.metadata).toEqual({
      totalVariables: 5,
      anonymizedCount: 5,
      excludedIdCount: 0,
      timestamp: expect.any(String)
    })
  })

  it('수치형 통계는 변경되지 않아야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const var1 = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(var1!.mean).toBe(35.5)
    expect(var1!.std).toBe(12.3)
    expect(var1!.min).toBe(18)
    expect(var1!.max).toBe(65)
  })

  it('범주형 빈도는 변경되지 않아야 함', () => {
    const result = AnonymizationService.anonymize(mockValidationResults as ValidationResults, 20)

    const var4 = result!.anonymized.columns!.find(c => c.name === 'Var4')
    expect(var4!.topCategories![0].count).toBe(55)
    expect(var4!.topCategories![1].count).toBe(45)
  })
})
