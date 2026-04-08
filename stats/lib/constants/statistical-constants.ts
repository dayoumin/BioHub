/**
 * 통계 분석 공통 상수 및 헬퍼
 *
 * 여러 서비스에서 중복 정의되던 상수/로직을 단일 소스로 통합.
 */

import type { AIRecommendation } from '@/types/analysis'

// ===== Constants =====

/** 가정 검정에 필요한 그룹당 최소 관측치 수 */
export const MIN_GROUP_SIZE = 3

// ===== Helpers =====

/**
 * variableAssignments에서 그룹 변수를 해결한다.
 * 우선순위: factor > independent > between
 */
export function resolveGroupVariable(
  variableAssignments: AIRecommendation['variableAssignments']
): string | undefined {
  return variableAssignments?.factor?.[0]
    ?? variableAssignments?.independent?.[0]
    ?? variableAssignments?.between?.[0]
}
