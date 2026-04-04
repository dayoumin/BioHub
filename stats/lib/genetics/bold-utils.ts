/** BOLD ID Engine 실행 공통 유틸리티 — useBoldExecution + BoldSearchContent 공유 */

import type { BoldHit, BoldClassification } from '@biohub/types'
export type { AnalysisPhase } from '@/lib/genetics/abortable-sleep'

// ── 상수 ──

export const BOLD_POLL_INTERVAL_MS = 3_000
export const BOLD_MAX_POLLS = 60
export const BOLD_MAX_SUBMIT_RETRIES = 2
export const BOLD_CACHED_DELAY_MS = 800

// ── 타입 ──

export type BoldErrorCode = 'network' | 'timeout' | 'bold-failed' | 'unknown'


export const BOLD_STEP_LABELS = [
  'BOLD 서버에 서열 전송',
  'BOLD 참조 라이브러리 검색',
  '분류 판정 및 BIN 매칭',
  '결과 수신 및 분석',
] as const

// ── 에러 ──

export class BoldError extends Error {
  constructor(message: string, public readonly code: BoldErrorCode) {
    super(message)
    this.name = 'BoldError'
  }
}


// ── 결과 파싱 ──

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function similarity(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * BOLD 결과 JSONL → BoldHit[] 변환.
 *
 * BOLD v5 응답은 per-query 래퍼(`{ seqid, sequence, results: [...] }`)로
 * 올 수도 있고, 단일 서열 제출 시 flat hit 배열로 올 수도 있다.
 * 양쪽 모두 처리하며 필드명 camelCase/snake_case 양쪽 지원.
 */
export function parseBoldHits(rawResults: unknown[]): BoldHit[] {
  // 중첩 구조 평탄화: 각 원소에 results 배열이 있으면 펼침
  const flat = rawResults.flatMap((entry) => {
    const r = entry as Record<string, unknown>
    if (Array.isArray(r['results'])) return r['results'] as unknown[]
    return [entry]
  })

  return flat.map((entry) => {
    const r = entry as Record<string, unknown>

    const taxonomy = (r['taxonomy'] ?? {}) as Record<string, unknown>

    return {
      processId: String(r['processId'] ?? r['process_id'] ?? ''),
      bin: str(r['bin'] ?? r['BIN']),
      similarity: similarity(r['similarity'] ?? r['pident']),
      taxonomy: {
        phylum: str(taxonomy['phylum']),
        class: str(taxonomy['class']),
        order: str(taxonomy['order']),
        family: str(taxonomy['family']),
        genus: str(taxonomy['genus']),
        species: str(taxonomy['species']),
      },
      accession: str(r['accession']),
      country: str(r['country']),
    }
  })
}

/**
 * BOLD 분류 JSONL → BoldClassification 변환.
 * /api/bold/classify/:id 응답의 classifications 배열을 파싱한다.
 * 배열이 비어 있으면 판정 불가(none)를 반환.
 */
export function parseBoldClassification(
  rawClassifications: unknown[],
): BoldClassification {
  if (rawClassifications.length === 0) {
    return { taxon: '', supportingRecords: 0, rank: 'none' }
  }

  // 첫 번째 (최상위 신뢰) 항목 사용
  const c = rawClassifications[0] as Record<string, unknown>

  const taxon = String(c['taxon'] ?? c['TAXON'] ?? '')
  const supportingRecords = Number(c['supportingRecords'] ?? c['supporting_records'] ?? 0)

  // rank 결정: 명시적 필드가 있으면 사용, 없으면 taxon에서 추론
  const rawRank = str(c['rank'] ?? c['taxonomicRank'] ?? c['taxonomic_rank'])
  let rank: BoldClassification['rank'] = 'none'

  if (rawRank) {
    const lower = rawRank.toLowerCase()
    if (lower === 'species') rank = 'species'
    else if (lower === 'genus') rank = 'genus'
    else if (lower === 'family') rank = 'family'
    else if (lower === 'order') rank = 'order'
  } else if (taxon) {
    // taxon 형태로 rank 추론: 이명(공백 포함) → species, 단명 → genus 이상
    rank = taxon.includes(' ') ? 'species' : 'genus'
  }

  return { taxon, supportingRecords, rank }
}
