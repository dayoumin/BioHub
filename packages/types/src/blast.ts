/**
 * BLAST 분석 공유 타입
 *
 * DNA 바코딩 종 판별 + 범용 BLAST 검색 데이터 모델.
 * Decision Engine 상태, 마커 추천, 분류군 안내 포함.
 */

/** 서열 최소 길이 (클라이언트 + 서버 공유) */
export const MIN_SEQUENCE_LENGTH = 100

/** 서열 최대 길이 (클라이언트 + 서버 공유) */
export const MAX_SEQUENCE_LENGTH = 10_000

export type BlastMarker = 'COI' | 'CytB' | '16S' | '12S' | 'ITS' | 'D-loop'

export type BlastApiSource = 'ncbi' | 'ebi'

// ── 범용 BLAST 검색 타입 ──

export type BlastProgram = 'blastn' | 'blastp' | 'blastx' | 'tblastn' | 'tblastx'

export type BlastDatabase =
  | 'nt' | 'nr' | 'refseq_select' | 'refseq_rna'
  | 'swissprot' | 'pdb' | 'core_nt'

/** 프로그램별 허용 데이터베이스 */
export const BLAST_DB_BY_PROGRAM: Record<BlastProgram, BlastDatabase[]> = {
  blastn:  ['nt', 'core_nt', 'refseq_select', 'refseq_rna'],
  blastp:  ['nr', 'swissprot', 'pdb', 'refseq_select'],
  blastx:  ['nr', 'swissprot', 'pdb', 'refseq_select'],
  tblastn: ['nt', 'core_nt', 'refseq_select', 'refseq_rna'],
  tblastx: ['nt', 'core_nt', 'refseq_select'],
}

/** 프로그램별 기본 데이터베이스 */
export const BLAST_DEFAULT_DB: Record<BlastProgram, BlastDatabase> = {
  blastn: 'nt',
  blastp: 'nr',
  blastx: 'nr',
  tblastn: 'nt',
  tblastx: 'nt',
}

export const BLAST_PROGRAM_LABELS: Record<BlastProgram, { name: string; input: string; search: string }> = {
  blastn:  { name: 'blastn',  input: 'DNA', search: 'DNA DB' },
  blastp:  { name: 'blastp',  input: '단백질', search: '단백질 DB' },
  blastx:  { name: 'blastx',  input: 'DNA (번역)', search: '단백질 DB' },
  tblastn: { name: 'tblastn', input: '단백질', search: 'DNA DB (번역)' },
  tblastx: { name: 'tblastx', input: 'DNA (번역)', search: 'DNA DB (번역)' },
}

export const BLAST_DB_LABELS: Record<BlastDatabase, string> = {
  nt: 'Nucleotide collection (nt)',
  nr: 'Non-redundant protein (nr)',
  core_nt: 'Core nucleotide (core_nt)',
  refseq_select: 'RefSeq Select',
  refseq_rna: 'RefSeq RNA',
  swissprot: 'UniProtKB/Swiss-Prot',
  pdb: 'Protein Data Bank (pdb)',
}

/** 범용 BLAST 검색 요청 파라미터 */
export interface GenericBlastParams {
  sequence: string
  program: BlastProgram
  database: BlastDatabase
  expect?: number         // E-value threshold (기본 10)
  hitlistSize?: number    // 최대 결과 수 (기본 50, 최대 500)
  megablast?: boolean     // blastn 전용 (기본 true)
}

/** 범용 BLAST 검색 히트 */
export interface GenericBlastHit {
  accession: string
  identity: number        // 0-1
  alignLength: number
  mismatches: number
  gapOpens: number
  queryStart: number
  queryEnd: number
  subjectStart: number
  subjectEnd: number
  evalue: number
  bitScore: number
  species?: string
  description?: string
  taxid?: number
}

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
  bitScore?: number
  queryCoverage?: number
  description?: string
  taxid?: number
  country?: string
  isBarcode?: boolean
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
  createdAt: string
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
