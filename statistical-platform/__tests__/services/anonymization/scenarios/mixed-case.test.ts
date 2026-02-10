/**
 * 시나리오 7: 혼합 케이스 (통합)
 * - ID + 수치형 + 범주형 + 한글
 * - 전체 시나리오 통합 테스트
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService, ResponseDeanonymizer } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics, AIRecommendation } from '@/types/smart-flow'

describe('[Scenario 7] 혼합 케이스 (통합)', () => {
  const mockMixedData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 150,
    columns: [
      // ID 컬럼 (제외되어야 함)
      {
        name: 'patient_id',
        type: 'categorical',
        uniqueValues: 150,
        missingCount: 0,
        idDetection: { isId: true, confidence: 0.98 }
      },
      // 한글 수치형
      {
        name: '나이',
        type: 'numeric',
        mean: 48.5,
        std: 14.2,
        min: 20,
        max: 80,
        skewness: 0.1,
        uniqueValues: 60,
        missingCount: 0
      },
      // 영문 수치형
      {
        name: 'blood_pressure',
        type: 'numeric',
        mean: 128.3,
        std: 16.5,
        min: 95,
        max: 175,
        skewness: 0.4,
        uniqueValues: 70,
        missingCount: 2
      },
      // 한글 범주형
      {
        name: '성별',
        type: 'categorical',
        uniqueValues: 2,
        missingCount: 0,
        topCategories: [
          { value: '남성', count: 80 },
          { value: '여성', count: 70 }
        ]
      },
      // 영문 범주형
      {
        name: 'smoking_status',
        type: 'categorical',
        uniqueValues: 3,
        missingCount: 0,
        topCategories: [
          { value: 'Never', count: 70 },
          { value: 'Former', count: 50 },
          { value: 'Current', count: 30 }
        ]
      },
      // 한글 수치형 (결측치 포함)
      {
        name: '체질량지수',
        type: 'numeric',
        mean: 24.8,
        std: 3.5,
        min: 18.5,
        max: 35.2,
        skewness: 0.6,
        uniqueValues: 90,
        missingCount: 5
      },
      // 영문 범주형 (많은 카테고리)
      {
        name: 'region',
        type: 'categorical',
        uniqueValues: 10,
        missingCount: 0,
        topCategories: [
          { value: 'Seoul', count: 40 },
          { value: 'Busan', count: 30 },
          { value: 'Daegu', count: 25 },
          { value: 'Incheon', count: 20 },
          { value: 'Gwangju', count: 15 }
        ]
      }
    ] as ColumnStatistics[]
  }

  it('ID 컬럼이 자동 제외되고 나머지가 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    expect(result).not.toBeNull()
    // 7개 컬럼 중 ID 1개 제외 → 6개
    expect(result!.anonymized.columns).toHaveLength(6)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual(['Var1', 'Var2', 'Var3', 'Var4', 'Var5', 'Var6'])

    // patient_id는 포함되지 않음
    const variableNames = result!.mapping.variables.map(v => v.original)
    expect(variableNames).not.toContain('patient_id')
  })

  it('한글과 영문 변수명이 모두 매핑되어야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    const variableNames = result!.mapping.variables.map(v => v.original)
    expect(variableNames).toEqual([
      '나이',
      'blood_pressure',
      '성별',
      'smoking_status',
      '체질량지수',
      'region'
    ])
  })

  it('한글과 영문 범주값이 모두 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    // 한글 범주형 (성별) - selectedColumns에서 index 2 → colIndex=3
    const genderMapping = result!.mapping.categories['성별']
    expect(genderMapping.mapping).toEqual({
      '남성': 'V3_A',
      '여성': 'V3_B'
    })

    // 영문 범주형 (smoking_status) - selectedColumns에서 index 3 → colIndex=4
    const smokingMapping = result!.mapping.categories['smoking_status']
    expect(smokingMapping.mapping).toEqual({
      'Never': 'V4_A',
      'Former': 'V4_B',
      'Current': 'V4_C'
    })

    // 영문 범주형 (region) - selectedColumns에서 index 5 → colIndex=6
    const regionMapping = result!.mapping.categories['region']
    expect(regionMapping.anonymized).toEqual(['V6_A', 'V6_B', 'V6_C', 'V6_D', 'V6_E'])
  })

  it('복잡한 혼합 텍스트 역변환', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    const text = `
## 분석 결과

### 기술통계
- Var1의 평균: 48.5세
- Var2의 평균: 128.3 mmHg
- Var5의 평균: 24.8

### 범주형 분포
- Var3: V3_A 80명, V3_B 70명
- Var4: V4_A 70명, V4_B 50명, V4_C 30명
- Var6: V6_A가 가장 많음 (40명)

### 추천 분석
Var2를 종속변수로, Var3를 독립변수로 사용하여 독립표본 t-test를 수행합니다.
Var4와 Var6는 공변량으로 고려할 수 있습니다.
    `.trim()

    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toContain('나이의 평균: 48.5세')
    expect(deanonymized).toContain('blood_pressure의 평균: 128.3 mmHg')
    expect(deanonymized).toContain('체질량지수의 평균: 24.8')
    expect(deanonymized).toContain('성별: 남성 80명, 여성 70명')
    expect(deanonymized).toContain('smoking_status: Never 70명, Former 50명, Current 30명')
    expect(deanonymized).toContain('region: Seoul가 가장 많음 (40명)')
    expect(deanonymized).toContain('blood_pressure를 종속변수로, 성별를 독립변수로')
    expect(deanonymized).toContain('smoking_status와 region는 공변량으로')
  })

  it('AI 추천 결과 혼합 역변환', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    const mockRecommendation: AIRecommendation = {
      method: {
        id: 'ancova',
        name: '공분산분석',
        description: 'Var2를 종속변수로, Var3를 독립변수로, Var1을 공변량으로 사용합니다.',
        category: 'anova'
      },
      confidence: 0.92,
      reasoning: [
        'Var2는 정규분포를 따릅니다.',
        'Var3는 2개 그룹(V3_A, V3_B)으로 나뉩니다.',
        'Var1은 연속형 공변량으로 적합합니다.',
        'Var4(V4_A, V4_B, V4_C)와 Var6(V6_A-E)도 고려 가능합니다.'
      ],
      assumptions: [
        { name: 'Var2 정규성', passed: true, pValue: 0.234 },
        { name: 'Var3 등분산성', passed: true, pValue: 0.156 }
      ],
      alternatives: [
        {
          id: 'kruskal-wallis',
          name: 'Kruskal-Wallis',
          description: 'Var2가 비정규일 경우 사용',
          category: 'nonparametric'
        }
      ]
    }

    const deanonymized = ResponseDeanonymizer.deanonymizeRecommendation(
      mockRecommendation,
      result!.mapping
    )

    expect(deanonymized.method.description).toBe('blood_pressure를 종속변수로, 성별를 독립변수로, 나이을 공변량으로 사용합니다.')
    expect(deanonymized.reasoning[0]).toBe('blood_pressure는 정규분포를 따릅니다.')
    expect(deanonymized.reasoning[1]).toBe('성별는 2개 그룹(남성, 여성)으로 나뉩니다.')
    expect(deanonymized.reasoning[2]).toBe('나이은 연속형 공변량으로 적합합니다.')
    expect(deanonymized.reasoning[3]).toBe('smoking_status(Never, Former, Current)와 region(Seoul-E)도 고려 가능합니다.')
    expect(deanonymized.assumptions![0].name).toBe('blood_pressure 정규성')
    expect(deanonymized.assumptions![1].name).toBe('성별 등분산성')
    expect(deanonymized.alternatives![0].description).toBe('blood_pressure가 비정규일 경우 사용')
  })

  it('메타데이터가 정확해야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    expect(result!.mapping.metadata).toEqual({
      totalVariables: 7,
      anonymizedCount: 6,
      excludedIdCount: 1,
      timestamp: expect.any(String)
    })
  })

  it('통계량이 보존되어야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    const var1 = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(var1!.mean).toBe(48.5)
    expect(var1!.missingCount).toBe(0)

    const var5 = result!.anonymized.columns!.find(c => c.name === 'Var5')
    expect(var5!.mean).toBe(24.8)
    expect(var5!.missingCount).toBe(5)
  })

  it('매핑 검증이 통과되어야 함', () => {
    const result = AnonymizationService.anonymize(mockMixedData as ValidationResults, 20)

    const isValid = AnonymizationService.validateMapping(result!.mapping)
    expect(isValid).toBe(true)
  })
})
