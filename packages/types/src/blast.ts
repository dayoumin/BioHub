/**
 * BLAST 분석 공유 타입
 *
 * DNA 바코딩 종 판별 결과 데이터 모델.
 * Decision Engine 상태, 마커 추천, 분류군 안내 포함.
 */

export type BlastMarker = 'COI' | 'CytB' | '16S' | '12S' | 'ITS' | 'D-loop'

export type BlastApiSource = 'ncbi' | 'ebi'

/** Decision Engine 4단계 결과 상태 */
export type BlastResultStatus =
  | 'high'       // ≥97% 단일 매칭 → 녹색
  | 'ambiguous'  // 95-97% 또는 top 3 차이 <2% → 노랑
  | 'low'        // 90-95% → 주황
  | 'failed'     // <90% → 빨강
  | 'no_hit'     // 매칭 없음 → 빨강

export interface BlastTopHit {
  species: string
  identity: number       // 0-1 (예: 0.992)
  accession: string
  evalue?: number
  queryCoverage?: number
  description?: string
}

export interface BlastResult {
  id: string
  userId: string
  projectId?: string
  sequenceHash: string   // md5(sequence)
  sequence?: string      // 원본 서열
  marker: BlastMarker
  sequenceLength: number
  gcContent: number
  ambiguousCount: number
  apiSource: BlastApiSource
  status: BlastResultStatus
  topHits: BlastTopHit[]
  decisionReason?: string
  recommendedMarkers?: string[]
  taxonAlert?: string
  createdAt: number
}

export interface BlastCacheEntry {
  sequenceHash: string
  marker: BlastMarker
  apiSource: BlastApiSource
  resultJson: string
  cachedAt: number
  expiresAt: number
}

/** 서열 입력 유효성 검사 결과 */
export interface SequenceValidation {
  valid: boolean
  length: number
  gcContent: number
  ambiguousCount: number
  ambiguousRatio: number
  errors: string[]       // "최소 100 bp 이상 필요합니다" 등
  warnings: string[]     // "모호 염기가 많습니다" 등
}
