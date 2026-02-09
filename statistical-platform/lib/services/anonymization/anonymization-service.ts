/**
 * 변수명/범주값 익명화 서비스
 *
 * 목적:
 * 1. LLM에 전송되는 데이터에서 개인정보 보호
 * 2. 변수명 편향(bias) 제거 → 객관적 통계 분석
 * 3. 양방향 매핑 유지 (익명화 ↔ 원본)
 *
 * 전략:
 * - 변수명: Var1, Var2, Var3, ...
 * - 범주값: CategoryA, CategoryB, CategoryC, ...
 * - ID 컬럼: 자동 제외
 * - 최대 20개 변수 제한
 */

import type { ValidationResults, ColumnStatistics } from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'

/**
 * 익명화 매핑 정보
 */
export interface AnonymizationMapping {
  // 변수명 매핑
  variables: {
    original: string
    anonymized: string
    type: 'numeric' | 'categorical' | 'unknown'
    isId: boolean
  }[]

  // 범주형 값 매핑
  categories: Record<string, {
    original: string[]
    anonymized: string[]
    mapping: Record<string, string> // original → anonymized
    reverseMapping: Record<string, string> // anonymized → original
  }>

  // 메타데이터
  metadata: {
    totalVariables: number
    anonymizedCount: number
    excludedIdCount: number
    timestamp: string
  }
}

/**
 * 익명화된 검증 결과
 */
export interface AnonymizedValidationResults {
  anonymized: ValidationResults
  mapping: AnonymizationMapping
}

/**
 * 변수명 익명화 서비스
 */
export class AnonymizationService {
  /**
   * ValidationResults를 익명화
   *
   * @param validationResults - 원본 검증 결과
   * @param maxVariables - 최대 변수 개수 (기본값: 20)
   * @returns 익명화된 결과 + 매핑 정보
   */
  static anonymize(
    validationResults: ValidationResults | null,
    maxVariables: number = 20
  ): AnonymizedValidationResults | null {
    if (!validationResults) {
      return null
    }

    const columns = validationResults.columns || []

    // 1단계: ID 컬럼 제외
    const nonIdColumns = columns.filter(col => !col.idDetection?.isId)

    // 2단계: 상위 N개만 선택
    const selectedColumns = nonIdColumns.slice(0, maxVariables)

    // 3단계: 변수명 익명화
    const variableMapping = this.createVariableMapping(selectedColumns)

    // 4단계: 범주형 값 익명화
    const categoryMapping = this.createCategoryMapping(selectedColumns)

    // 5단계: 익명화된 ValidationResults 생성
    const anonymizedColumns = selectedColumns.map(col => {
      const varMap = variableMapping.find(v => v.original === col.name)
      if (!varMap) return col

      const anonymizedCol: ColumnStatistics = {
        ...col,
        name: varMap.anonymized
      }

      // 범주형 변수의 topCategories 익명화
      if (col.type === 'categorical' && col.topCategories) {
        const catMap = categoryMapping[col.name]
        if (catMap) {
          anonymizedCol.topCategories = col.topCategories.map(tc => ({
            value: catMap.mapping[tc.value] || tc.value,
            count: tc.count
          }))
        }
      }

      return anonymizedCol
    })

    const anonymized: ValidationResults = {
      ...validationResults,
      columns: anonymizedColumns
    }

    const mapping: AnonymizationMapping = {
      variables: variableMapping,
      categories: categoryMapping,
      metadata: {
        totalVariables: columns.length,
        anonymizedCount: selectedColumns.length,
        excludedIdCount: columns.length - nonIdColumns.length,
        timestamp: new Date().toISOString()
      }
    }

    logger.info('[Anonymization] Anonymized', {
      total: mapping.metadata.totalVariables,
      anonymized: mapping.metadata.anonymizedCount,
      excludedIds: mapping.metadata.excludedIdCount
    })

    return { anonymized, mapping }
  }

  /**
   * 변수명 매핑 생성
   */
  private static createVariableMapping(
    columns: ColumnStatistics[]
  ): AnonymizationMapping['variables'] {
    return columns.map((col, index) => ({
      original: col.name,
      anonymized: `Var${index + 1}`,
      type: col.type as 'numeric' | 'categorical' | 'unknown',
      isId: col.idDetection?.isId || false
    }))
  }

  /**
   * 범주형 값 매핑 생성
   */
  private static createCategoryMapping(
    columns: ColumnStatistics[]
  ): AnonymizationMapping['categories'] {
    const categoryMapping: AnonymizationMapping['categories'] = {}

    const categoricalColumns = columns.filter(col =>
      col.type === 'categorical' && col.topCategories
    )

    for (const col of categoricalColumns) {
      if (!col.topCategories) continue

      const original = col.topCategories.map(tc => tc.value)
      const anonymized = original.map((_, i) =>
        String.fromCharCode(65 + i) // A, B, C, ...
      )

      const mapping: Record<string, string> = {}
      const reverseMapping: Record<string, string> = {}

      original.forEach((orig, i) => {
        mapping[orig] = anonymized[i]
        reverseMapping[anonymized[i]] = orig
      })

      categoryMapping[col.name] = {
        original,
        anonymized,
        mapping,
        reverseMapping
      }
    }

    return categoryMapping
  }

  /**
   * 변수명 복원 (익명화 → 원본)
   *
   * @param anonymizedName - 익명화된 변수명 (예: "Var1")
   * @param mapping - 매핑 정보
   * @returns 원본 변수명
   */
  static deanonymizeVariable(
    anonymizedName: string,
    mapping: AnonymizationMapping
  ): string | null {
    const varMap = mapping.variables.find(v => v.anonymized === anonymizedName)
    return varMap?.original || null
  }

  /**
   * 범주값 복원 (익명화 → 원본)
   *
   * @param variableName - 원본 변수명
   * @param anonymizedValue - 익명화된 값 (예: "A")
   * @param mapping - 매핑 정보
   * @returns 원본 값
   */
  static deanonymizeCategory(
    variableName: string,
    anonymizedValue: string,
    mapping: AnonymizationMapping
  ): string | null {
    const catMap = mapping.categories[variableName]
    return catMap?.reverseMapping[anonymizedValue] || null
  }

  /**
   * 텍스트에서 익명화된 변수명을 모두 원본으로 복원
   *
   * @param text - LLM 응답 텍스트
   * @param mapping - 매핑 정보
   * @returns 복원된 텍스트
   */
  static deanonymizeText(
    text: string,
    mapping: AnonymizationMapping
  ): string {
    let result = text

    // 변수명 복원 (Var1, Var2, ... → 원본)
    for (const varMap of mapping.variables) {
      // \b를 사용하여 단어 경계에서만 매칭 (Var10이 Var1로 잘못 매칭되는 것 방지)
      const regex = new RegExp(`\\b${varMap.anonymized}\\b`, 'g')
      result = result.replace(regex, varMap.original)
    }

    // 범주값 복원 (A, B, C → 원본)
    // ⚠️ 주의: 범주값은 변수명과 함께 사용될 때만 정확하게 복원 가능
    // 예: "Var2에서 A" → "성별에서 남성"
    // 단독 "GroupA"는 어떤 변수의 A인지 불명확하여 복원 불가
    for (const [varName, catMap] of Object.entries(mapping.categories)) {
      for (const [anonymized, original] of Object.entries(catMap.reverseMapping)) {
        // 패턴 1: "Group" + 알파벳 (예: GroupA → 실제값)
        // 패턴 2: "Category" + 알파벳
        // 패턴 3: 괄호 안의 알파벳 목록 (예: (A, B, C) → (남성, 여성, ...))
        const patterns = [
          { pattern: `Group${anonymized}\\b`, replacement: original },
          { pattern: `Category${anonymized}\\b`, replacement: original },
          // 괄호 안에서만 매칭 (더 안전)
          {
            pattern: `\\(([^)]*?)\\b${anonymized}\\b([^)]*)\\)`,
            replacement: `($1${original}$2)`
          }
        ]

        for (const { pattern, replacement } of patterns) {
          const regex = new RegExp(pattern, 'g')
          result = result.replace(regex, replacement)
        }
      }
    }

    logger.debug('[Anonymization] Deanonymized text', {
      originalLength: text.length,
      resultLength: result.length,
      variablesRestored: mapping.variables.length
    })

    return result
  }

  /**
   * 매핑 정보 검증
   */
  static validateMapping(mapping: AnonymizationMapping): boolean {
    // 변수명 중복 체크
    const anonymizedNames = mapping.variables.map(v => v.anonymized)
    const uniqueNames = new Set(anonymizedNames)

    if (anonymizedNames.length !== uniqueNames.size) {
      logger.error('[Anonymization] Duplicate anonymized variable names detected')
      return false
    }

    // 범주값 매핑 체크
    for (const [varName, catMap] of Object.entries(mapping.categories)) {
      if (catMap.original.length !== catMap.anonymized.length) {
        logger.error('[Anonymization] Category mapping length mismatch', { varName })
        return false
      }
    }

    return true
  }
}
