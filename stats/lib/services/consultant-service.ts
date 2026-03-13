/**
 * 통계 상담 서비스
 *
 * 사용자의 자연어 질문에서 키워드를 추출하여
 * purpose-categories.ts의 카테고리를 매칭하고,
 * statistical-methods.ts에서 추천 메서드를 반환.
 *
 * 데이터 소스:
 * - PURPOSE_CATEGORIES (purpose-categories.ts) — 카테고리 + 키워드
 * - STATISTICAL_METHODS (statistical-methods.ts) — canonical 메서드 정보
 *
 * 새 ID 매핑을 만들지 않음 → 드리프트 방지
 */

import { PURPOSE_CATEGORIES } from '@/lib/constants/purpose-categories'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { MethodRecommendation, ConsultantResponse } from '@/types/analysis'

interface CategoryScore {
  categoryId: string
  score: number
  matchedKeywords: string[]
}

/**
 * 사용자 메시지에서 목적 카테고리를 매칭하고 추천 메서드를 반환
 *
 * @param message 사용자 입력 텍스트
 * @param maxRecommendations 최대 추천 수 (기본 3)
 */
export function getRecommendations(
  message: string,
  maxRecommendations = 3
): ConsultantResponse {
  const normalizedMessage = message.toLowerCase().trim()

  if (!normalizedMessage) {
    return { recommendations: [], summary: undefined }
  }

  // 1. 각 카테고리의 키워드 매칭 점수 계산
  const scores: CategoryScore[] = PURPOSE_CATEGORIES
    .filter(cat => !cat.disabled && cat.methodIds.length > 0)
    .map(cat => {
      const matchedKeywords = cat.keywords.filter(kw =>
        normalizedMessage.includes(kw.toLowerCase())
      )
      return {
        categoryId: cat.id,
        score: matchedKeywords.length,
        matchedKeywords,
      }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    return { recommendations: [], summary: undefined }
  }

  // 2. 상위 카테고리에서 대표 메서드 추출
  const recommendations: MethodRecommendation[] = []
  const usedMethodIds = new Set<string>()

  for (const { categoryId, matchedKeywords } of scores) {
    if (recommendations.length >= maxRecommendations) break

    const category = PURPOSE_CATEGORIES.find(c => c.id === categoryId)
    if (!category) continue

    for (const methodId of category.methodIds) {
      if (recommendations.length >= maxRecommendations) break
      if (usedMethodIds.has(methodId)) continue

      const method = STATISTICAL_METHODS[methodId]
      if (!method) continue

      usedMethodIds.add(methodId)
      recommendations.push({
        methodId,
        methodName: method.name,
        koreanName: method.koreanName ?? method.name,
        reason: buildReason(category.label, matchedKeywords),
        badge: recommendations.length === 0 ? 'recommended' : 'alternative',
      })
    }
  }

  const topCategory = PURPOSE_CATEGORIES.find(c => c.id === scores[0].categoryId)
  const summary = topCategory
    ? `"${topCategory.label}" 분야의 분석 방법을 추천합니다.`
    : undefined

  return { recommendations, summary }
}

/** 추천 이유 텍스트 생성 */
function buildReason(categoryLabel: string, matchedKeywords: string[]): string {
  const keywordStr = matchedKeywords.slice(0, 3).map(k => `"${k}"`).join(', ')
  return `${categoryLabel} 분석 — 입력에서 ${keywordStr} 키워드가 감지되었습니다.`
}
