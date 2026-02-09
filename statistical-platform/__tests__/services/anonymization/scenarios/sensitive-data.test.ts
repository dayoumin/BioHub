/**
 * 시나리오 2: 민감 정보 케이스
 * - patient_id, 주민번호, 병원명 등 개인정보
 * - 완전 익명화 확인
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

describe('[Scenario 2] 민감 정보 케이스', () => {
  const mockSensitiveData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 50,
    columns: [
      {
        name: 'patient_id',
        type: 'categorical',
        uniqueValues: 50,
        missingCount: 0,
        idDetection: { isId: true, confidence: 0.95 }
      },
      {
        name: '주민번호',
        type: 'categorical',
        uniqueValues: 50,
        missingCount: 0,
        idDetection: { isId: true, confidence: 0.98 }
      },
      {
        name: '병원명',
        type: 'categorical',
        uniqueValues: 5,
        missingCount: 0,
        topCategories: [
          { value: '서울대병원', count: 15 },
          { value: '삼성서울병원', count: 12 },
          { value: '세브란스병원', count: 10 },
          { value: '아산병원', count: 8 },
          { value: '서울성모병원', count: 5 }
        ]
      },
      {
        name: 'blood_pressure',
        type: 'numeric',
        mean: 120,
        std: 15,
        min: 90,
        max: 160,
        skewness: 0.3,
        uniqueValues: 45,
        missingCount: 0
      },
      {
        name: 'age',
        type: 'numeric',
        mean: 45.5,
        std: 12.3,
        min: 20,
        max: 80,
        skewness: 0.1,
        uniqueValues: 40,
        missingCount: 0
      }
    ] as ColumnStatistics[]
  }

  it('ID 컬럼은 자동으로 제외되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    expect(result).not.toBeNull()

    // ID로 감지된 2개 컬럼 제외 → 3개만 남음
    expect(result!.anonymized.columns).toHaveLength(3)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual(['Var1', 'Var2', 'Var3'])

    // patient_id와 주민번호는 제외됨
    expect(anonymizedNames).not.toContain('patient_id')
    expect(anonymizedNames).not.toContain('주민번호')
  })

  it('병원명은 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    const hospitalCol = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(hospitalCol).toBeDefined()
    expect(hospitalCol!.type).toBe('categorical')

    // 병원명이 A, B, C, D, E로 익명화됨
    expect(hospitalCol!.topCategories).toEqual([
      { value: 'A', count: 15 },
      { value: 'B', count: 12 },
      { value: 'C', count: 10 },
      { value: 'D', count: 8 },
      { value: 'E', count: 5 }
    ])
  })

  it('메타데이터에 제외된 ID 컬럼 수가 기록되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    expect(result!.mapping.metadata.totalVariables).toBe(5)
    expect(result!.mapping.metadata.anonymizedCount).toBe(3)
    expect(result!.mapping.metadata.excludedIdCount).toBe(2)
  })

  it('범주형 매핑에서 병원명이 올바르게 매핑되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    const hospitalMapping = result!.mapping.categories['병원명']
    expect(hospitalMapping).toBeDefined()
    expect(hospitalMapping.mapping).toEqual({
      '서울대병원': 'A',
      '삼성서울병원': 'B',
      '세브란스병원': 'C',
      '아산병원': 'D',
      '서울성모병원': 'E'
    })
  })

  it('역변환 시 병원명이 복원되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    const text = 'Var1에서 GroupA가 가장 많습니다.'
    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toBe('병원명에서 서울대병원가 가장 많습니다.')
  })

  it('수치형 변수는 정상적으로 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    const bloodPressure = result!.anonymized.columns!.find(c => c.name === 'Var2')
    expect(bloodPressure).toBeDefined()
    expect(bloodPressure!.mean).toBe(120)
    expect(bloodPressure!.std).toBe(15)

    const ageCol = result!.anonymized.columns!.find(c => c.name === 'Var3')
    expect(ageCol).toBeDefined()
    expect(ageCol!.mean).toBe(45.5)
  })

  it('변수 매핑에서 ID 컬럼은 제외되어야 함', () => {
    const result = AnonymizationService.anonymize(mockSensitiveData as ValidationResults, 20)

    const variableNames = result!.mapping.variables.map(v => v.original)
    expect(variableNames).not.toContain('patient_id')
    expect(variableNames).not.toContain('주민번호')
    expect(variableNames).toEqual(['병원명', 'blood_pressure', 'age'])
  })
})
