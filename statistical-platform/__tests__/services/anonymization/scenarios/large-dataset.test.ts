/**
 * 시나리오 4: 20개 초과 변수 케이스
 * - 25개 변수
 * - 상위 20개만 익명화
 */

import { describe, it, expect } from 'vitest'
import { AnonymizationService } from '@/lib/services/anonymization'
import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'

describe('[Scenario 4] 20개 초과 변수 케이스', () => {
  // 25개 변수 생성
  const generate25Columns = (): ColumnStatistics[] => {
    const columns: ColumnStatistics[] = []

    for (let i = 1; i <= 25; i++) {
      columns.push({
        name: `var_${i}`,
        type: 'numeric',
        mean: 50 + i,
        std: 10,
        min: 20,
        max: 100,
        skewness: 0,
        uniqueValues: 80,
        missingCount: 0
      } as ColumnStatistics)
    }

    return columns
  }

  const mockLargeData: Partial<ValidationResults> & { columns: ColumnStatistics[] } = {
    isValid: true,
    totalRows: 100,
    columns: generate25Columns()
  }

  it('상위 20개 변수만 익명화되어야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    expect(result).not.toBeNull()
    expect(result!.anonymized.columns).toHaveLength(20)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toHaveLength(20)
    expect(anonymizedNames[0]).toBe('Var1')
    expect(anonymizedNames[19]).toBe('Var20')
  })

  it('메타데이터에 전체 변수 수와 익명화된 수가 기록되어야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    expect(result!.mapping.metadata.totalVariables).toBe(25)
    expect(result!.mapping.metadata.anonymizedCount).toBe(20)
    expect(result!.mapping.metadata.excludedIdCount).toBe(0)
  })

  it('매핑 정보는 20개만 포함해야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    expect(result!.mapping.variables).toHaveLength(20)
    expect(result!.mapping.variables[0].original).toBe('var_1')
    expect(result!.mapping.variables[19].original).toBe('var_20')
  })

  it('21번째 이후 변수는 매핑에 포함되지 않아야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    const var21Exists = result!.mapping.variables.some(v => v.original === 'var_21')
    expect(var21Exists).toBe(false)

    const var25Exists = result!.mapping.variables.some(v => v.original === 'var_25')
    expect(var25Exists).toBe(false)
  })

  it('역변환 시 21번째 이후 변수는 복원되지 않음', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    // Var21은 매핑에 없으므로 복원 안 됨
    const text = 'Var1과 Var20과 Var21을 분석합니다.'
    const deanonymized = AnonymizationService.deanonymizeText(text, result!.mapping)

    expect(deanonymized).toBe('var_1과 var_20과 Var21을 분석합니다.')
    // Var21은 그대로 남음 (매핑 없음)
  })

  it('통계량은 정확하게 보존되어야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    const var1 = result!.anonymized.columns!.find(c => c.name === 'Var1')
    expect(var1!.mean).toBe(51) // 50 + 1

    const var20 = result!.anonymized.columns!.find(c => c.name === 'Var20')
    expect(var20!.mean).toBe(70) // 50 + 20
  })

  it('커스텀 maxVariables 파라미터 동작 확인', () => {
    // 10개만 익명화
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 10)

    expect(result!.anonymized.columns).toHaveLength(10)
    expect(result!.mapping.variables).toHaveLength(10)
    expect(result!.mapping.metadata.anonymizedCount).toBe(10)

    const anonymizedNames = result!.anonymized.columns!.map(c => c.name)
    expect(anonymizedNames).toEqual([
      'Var1', 'Var2', 'Var3', 'Var4', 'Var5',
      'Var6', 'Var7', 'Var8', 'Var9', 'Var10'
    ])
  })

  it('매핑 검증이 통과되어야 함', () => {
    const result = AnonymizationService.anonymize(mockLargeData as ValidationResults, 20)

    const isValid = AnonymizationService.validateMapping(result!.mapping)
    expect(isValid).toBe(true)
  })
})
