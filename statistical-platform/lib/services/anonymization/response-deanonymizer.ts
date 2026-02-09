/**
 * LLM 응답 역변환 서비스
 *
 * 익명화된 변수명(Var1, Var2)과 범주값(A, B)을
 * 원본 변수명과 값으로 복원
 */

import type { AIRecommendation } from '@/types/smart-flow'
import type { AnonymizationMapping } from './anonymization-service'
import { AnonymizationService } from './anonymization-service'
import { logger } from '@/lib/utils/logger'

/**
 * AI 추천 결과 역변환기
 */
export class ResponseDeanonymizer {
  /**
   * AIRecommendation 객체 역변환
   *
   * @param recommendation - 익명화된 추천 결과
   * @param mapping - 매핑 정보
   * @returns 원본 변수명으로 복원된 추천 결과
   */
  static deanonymizeRecommendation(
    recommendation: AIRecommendation,
    mapping: AnonymizationMapping
  ): AIRecommendation {
    // 1. reasoning 텍스트 복원
    const deanonymizedReasoning = recommendation.reasoning.map(text =>
      AnonymizationService.deanonymizeText(text, mapping)
    )

    // 2. method description 복원
    const deanonymizedDescription = AnonymizationService.deanonymizeText(
      recommendation.method.description,
      mapping
    )

    // 3. alternatives 복원
    const deanonymizedAlternatives = recommendation.alternatives?.map(alt => ({
      ...alt,
      name: AnonymizationService.deanonymizeText(alt.name, mapping),
      description: AnonymizationService.deanonymizeText(alt.description, mapping)
    }))

    // 4. assumptions 복원 (가정 검정 결과 이름)
    const deanonymizedAssumptions = recommendation.assumptions?.map(assumption => ({
      ...assumption,
      name: AnonymizationService.deanonymizeText(assumption.name, mapping)
    }))

    const result: AIRecommendation = {
      ...recommendation,
      method: {
        ...recommendation.method,
        description: deanonymizedDescription
      },
      reasoning: deanonymizedReasoning,
      alternatives: deanonymizedAlternatives,
      assumptions: deanonymizedAssumptions
    }

    logger.info('[Deanonymizer] Recommendation restored', {
      methodId: result.method.id,
      variablesRestored: mapping.variables.length
    })

    return result
  }

  /**
   * 텍스트 응답 역변환 (간단한 텍스트 응답용)
   *
   * @param text - 익명화된 텍스트
   * @param mapping - 매핑 정보
   * @returns 복원된 텍스트
   */
  static deanonymizeText(
    text: string,
    mapping: AnonymizationMapping
  ): string {
    return AnonymizationService.deanonymizeText(text, mapping)
  }

  /**
   * 역변환 검증 (디버깅용)
   *
   * @param original - 원본 텍스트
   * @param anonymized - 익명화된 텍스트
   * @param deanonymized - 역변환된 텍스트
   * @returns 검증 결과
   */
  static validateDeanonymization(
    original: string,
    anonymized: string,
    deanonymized: string
  ): {
    isValid: boolean
    differences: string[]
  } {
    const differences: string[] = []

    // 길이 체크
    if (original.length !== deanonymized.length) {
      differences.push(`Length mismatch: ${original.length} vs ${deanonymized.length}`)
    }

    // 내용 체크
    if (original !== deanonymized) {
      differences.push('Content mismatch')
      // 상세 차이 분석 (첫 100자만)
      const maxLen = Math.min(100, Math.max(original.length, deanonymized.length))
      for (let i = 0; i < maxLen; i++) {
        if (original[i] !== deanonymized[i]) {
          differences.push(`First diff at position ${i}: '${original[i]}' vs '${deanonymized[i]}'`)
          break
        }
      }
    }

    const isValid = differences.length === 0

    if (!isValid) {
      logger.warn('[Deanonymizer] Validation failed', {
        differences,
        originalPreview: original.slice(0, 50),
        deanonymizedPreview: deanonymized.slice(0, 50)
      })
    }

    return { isValid, differences }
  }
}
