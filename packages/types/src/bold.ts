/**
 * BOLD Systems v5 ID Engine 공유 타입
 *
 * DNA 바코딩 종 동정 — BOLD 참조 라이브러리 기반.
 * submit → poll → results/classifications 비동기 워크플로우.
 */

// ── 데이터베이스 ──

export type BoldDatabase =
  | 'public.tax-derep'   // Animal Library (Public)
  | 'all.tax-derep'      // Animal Library (Public + Private)
  | 'species'            // Animal Species-Level (Public + Private)
  | 'all.animal-alt'     // Animal Secondary Markers (Public)
  | 'public.plants'      // Plant Library (Public)
  | 'public.fungi'       // Fungi Library (Public)
  | 'DS-CANREF22'        // Validated Canadian Arthropod
  | 'DS-IUCNPUB'         // Validated Animal Red List

export const BOLD_DB_LABELS: Record<BoldDatabase, string> = {
  'public.tax-derep': 'Animal (Public)',
  'all.tax-derep': 'Animal (Public + Private)',
  'species': 'Animal Species-Level',
  'all.animal-alt': 'Animal Secondary Markers',
  'public.plants': 'Plant',
  'public.fungi': 'Fungi',
  'DS-CANREF22': 'Canadian Arthropod (Validated)',
  'DS-IUCNPUB': 'Animal Red List (Validated)',
}

// ── 검색 모드 프리셋 ──

export type BoldSearchMode = 'rapid' | 'genus-species' | 'exhaustive'

export const BOLD_SEARCH_PRESETS: Record<BoldSearchMode, {
  label: string
  mi: number
  maxh: number
  maxSequences: number
  description: string
}> = {
  rapid: {
    label: 'Rapid Species',
    mi: 0.94,
    maxh: 25,
    maxSequences: 1000,
    description: '빠른 종 수준 검색 (≥94% 유사도)',
  },
  'genus-species': {
    label: 'Genus + Species',
    mi: 0.90,
    maxh: 50,
    maxSequences: 200,
    description: '속·종 수준 검색 (≥90% 유사도)',
  },
  exhaustive: {
    label: 'Exhaustive',
    mi: 0.75,
    maxh: 100,
    maxSequences: 100,
    description: '탐색적 검색 (≥75% 유사도, 느림)',
  },
}

// ── 제출 파라미터 ──

export interface BoldSubmitParams {
  /** FASTA 형식 서열 (1개) */
  sequence: string
  /** 참조 라이브러리 */
  db: BoldDatabase
  /** 검색 모드 (프리셋) */
  searchMode: BoldSearchMode
  /** 최소 서열 중첩 (bp, 기본 100) */
  mo?: number
}

// ── 결과 타입 ──

/** BOLD 결과 히트 (JSONL에서 파싱) */
export interface BoldHit {
  /** 매칭 서열 ID (BOLD process ID) */
  processId: string
  /** BIN (Barcode Index Number) */
  bin: string | null
  /** 유사도 (0-1) */
  similarity: number
  /** 분류 체계 */
  taxonomy: {
    phylum: string | null
    class: string | null
    order: string | null
    family: string | null
    genus: string | null
    species: string | null
  }
  /** GenBank accession (있는 경우) */
  accession: string | null
  /** 국가 */
  country: string | null
}

/** BOLD 분류 결과 */
export interface BoldClassification {
  /** 판정된 분류군 (빈 문자열 = 판정 불가) */
  taxon: string
  /** 판정 근거가 된 히트 수 */
  supportingRecords: number
  /** 판정 신뢰 수준 */
  rank: 'species' | 'genus' | 'family' | 'order' | 'none'
}

/** BOLD ID 분석 최종 결과 */
export interface BoldIdResult {
  /** 매칭 히트 목록 */
  hits: BoldHit[]
  /** 분류 판정 */
  classification: BoldClassification
  /** 사용된 DB */
  db: BoldDatabase
  /** 사용된 검색 모드 */
  searchMode: BoldSearchMode
}
