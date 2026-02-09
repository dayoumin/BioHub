/**
 * 시나리오 5: 한글 변수명 케이스
 * - 나이, 성별, 혈압 등 한글 변수명
 * - 한글 처리 확인
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService, ResponseDeanonymizer } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics, AIRecommendation } from '@/types/smart-flow'

describe('[Scenario 5] 한글 변수명 케이스', () => {
  const mockKoreanData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 80,
    columns: [
      {
        name: '나이',
        type: 'numeric',
        mean: 42.5,
        std: 15.2,
        min: 18,
        max: 75,
        skewness: 0.3,
        uniqueValues: 58,
        missingCount: 0
      },
      {
        name: '성별',
        type: 'categorical',
        uniqueValues: 2,
        missingCount: 0,
        topCategories: [
          { value: '남성', count: 45 },
          { value: '여성', count: 35 }
        ]
      },
      {
        name: '혈압',
        type: 'numeric',
        mean: 125.3,
        std: 18.5,
        min: 90,
        max: 170,
        skewness: 0.5,
        uniqueValues: 65,
        missingCount: 2
      },
      {
        name: '체중',
        type: 'numeric',
        mean: 68.5,
        std: 12.3,
        min: 45,
        max: 95,
        skewness: 0.2,
        uniqueValues: 60,
        missingCount: 1
      },
      {
        name: '흡연여부',
        type: 'categorical',
        uniqueValues: 2,
        missingCount: 0,
        topCategories: [
          { value: '비흡연', count: 55 },
          { value: '흡연', count: 25 }
        ]
      }
    ] as ColumnStatistics[]
  }

  it('한글 변수명이 Var1, Var2, ... 로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    expect(result).not.toBeNull()
    expect(result!.anonymized.columns).toHaveLength(5)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual(['Var1', 'Var2', 'Var3', 'Var4', 'Var5'])
  })

  it('한글 범주값이 A, B로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    const genderCol = result!.anonymized.columns!.find(c => c.name === 'Var2')
    expect(genderCol!.topCategories).toEqual([
      { value: 'A', count: 45 },
      { value: 'B', count: 35 }
    ])

    const smokingCol = result!.anonymized.columns!.find(c => c.name === 'Var5')
    expect(smokingCol!.topCategories).toEqual([
      { value: 'A', count: 55 },
      { value: 'B', count: 25 }
    ])
  })

  it('한글 변수명 매핑이 올바르게 생성되어야 함', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    expect(result!.mapping.variables[0]).toEqual({
      original: '나이',
      anonymized: 'Var1',
      type: 'numeric',
      isId: false
    })

    expect(result!.mapping.variables[1]).toEqual({
      original: '성별',
      anonymized: 'Var2',
      type: 'categorical',
      isId: false
    })
  })

  it('한글 범주값 매핑이 올바르게 생성되어야 함', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    expect(result!.mapping.categories['성별']).toEqual({
      original: ['남성', '여성'],
      anonymized: ['A', 'B'],
      mapping: { '남성': 'A', '여성': 'B' },
      reverseMapping: { 'A': '남성', 'B': '여성' }
    })

    expect(result!.mapping.categories['흡연여부']).toEqual({
      original: ['비흡연', '흡연'],
      anonymized: ['A', 'B'],
      mapping: { '비흡연': 'A', '흡연': 'B' },
      reverseMapping: { 'A': '비흡연', 'B': '흡연' }
    })
  })

  it('한글 텍스트 역변환이 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    const text = 'Var1과 Var2 간의 관계를 분석합니다. GroupA는 GroupB보다 높습니다.'
    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toBe('나이과 성별 간의 관계를 분석합니다. 남성는 여성보다 높습니다.')
  })

  it('복잡한 한글 문장 역변환', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    const text = `
분석 결과 요약:
- Var1의 평균은 42.5세입니다.
- Var2에서 GroupA가 45명, GroupB가 35명입니다.
- Var3와 Var4는 양의 상관관계를 보입니다.
- Var5에서 GroupA가 대다수를 차지합니다.
    `.trim()

    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toContain('나이의 평균은 42.5세입니다.')
    expect(deanonymized).toContain('성별에서 남성가 45명, 여성가 35명입니다.')
    expect(deanonymized).toContain('혈압와 체중는 양의 상관관계를 보입니다.')
    expect(deanonymized).toContain('흡연여부에서 비흡연가 대다수를 차지합니다.')
  })

  it('AI 추천 결과 한글 역변환', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    const mockRecommendation: AIRecommendation = {
      method: {
        id: 't-test',
        name: '독립표본 t-검정',
        description: 'Var3를 종속변수로, Var2를 독립변수로 사용합니다.',
        category: 't-test'
      },
      confidence: 0.85,
      reasoning: [
        'Var2는 2개 그룹(GroupA, GroupB)으로 나뉩니다.',
        'Var3는 정규분포를 따릅니다.',
        'Var1과 Var5는 공변량으로 사용 가능합니다.'
      ],
      assumptions: [],
      alternatives: []
    }

    const deanonymized = ResponseDeanonymizer.deanonymizeRecommendation(
      mockRecommendation,
      result!.mapping
    )

    expect(deanonymized.method.description).toBe('혈압를 종속변수로, 성별를 독립변수로 사용합니다.')
    expect(deanonymized.reasoning[0]).toBe('성별는 2개 그룹(남성, 여성)으로 나뉩니다.')
    expect(deanonymized.reasoning[1]).toBe('혈압는 정규분포를 따릅니다.')
    expect(deanonymized.reasoning[2]).toBe('나이과 흡연여부는 공변량으로 사용 가능합니다.')
  })

  it('한글 변수명 역변환', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    expect(AnonymizationService.deanonymizeVariable('Var1', result!.mapping)).toBe('나이')
    expect(AnonymizationService.deanonymizeVariable('Var2', result!.mapping)).toBe('성별')
    expect(AnonymizationService.deanonymizeVariable('Var5', result!.mapping)).toBe('흡연여부')
  })

  it('한글 범주값 역변환', () => {
    const result = AnonymizationService.anonymize(mockKoreanData as ValidationResults, 20)

    expect(AnonymizationService.deanonymizeCategory('성별', 'A', result!.mapping)).toBe('남성')
    expect(AnonymizationService.deanonymizeCategory('성별', 'B', result!.mapping)).toBe('여성')
    expect(AnonymizationService.deanonymizeCategory('흡연여부', 'A', result!.mapping)).toBe('비흡연')
  })
})
