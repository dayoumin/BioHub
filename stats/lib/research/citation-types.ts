import type { LiteratureItem } from '@/lib/types/literature'

/**
 * 프로젝트에 저장된 인용 레코드
 *
 * LiteratureItem의 스냅샷을 보관. 원본 검색 결과가 사라져도 인용 유지.
 */
export interface CitationRecord {
  id: string          // `cit_${Date.now()}_${random}`
  projectId: string
  item: LiteratureItem  // 저장 시점 스냅샷
  addedAt: string       // ISO string
}

/**
 * 인용 중복 판정 키 — doi 우선, 없으면 url
 *
 * doi는 `doi:` prefix를 붙여 url과 충돌 방지.
 */
export function citationKey(item: LiteratureItem): string {
  return item.doi ? `doi:${item.doi.toLowerCase()}` : item.url
}

import { generateId } from '@/lib/utils/generate-id'

/** CitationRecord 생성 헬퍼 */
export function createCitationRecord(projectId: string, item: LiteratureItem): CitationRecord {
  return {
    id: generateId('cit'),
    projectId,
    item,
    addedAt: new Date().toISOString(),
  }
}
