/**
 * 논문 초안 서비스용 순수 함수 — React 의존 없음
 *
 * useTerminology() 훅은 UI 전용; 서비스 레이어는 이 파일을 사용한다.
 */

import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

/**
 * 메서드 표시명 조회 (STATISTICAL_METHODS 레지스트리 기반)
 *
 * 등록되지 않은 methodId면 methodId 자체를 반환한다.
 */
export function getMethodDisplayName(methodId: string, lang: 'ko' | 'en'): string {
  const method = STATISTICAL_METHODS[methodId]
  if (!method) return methodId
  return lang === 'ko' ? (method.koreanName ?? method.name) : method.name
}
