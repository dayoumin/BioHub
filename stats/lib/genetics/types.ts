/**
 * Genetics 모듈 로컬 타입
 * @biohub/types에서 가져오되, stats webpack 호환을 위해 로컬 복사
 */

export type BlastMarker = 'COI' | 'CytB' | '16S' | '12S' | 'ITS' | 'D-loop'

export type BlastResultStatus =
  | 'high'
  | 'ambiguous'
  | 'low'
  | 'failed'
  | 'no_hit'

export interface BlastTopHit {
  species: string
  identity: number
  accession: string
  evalue?: number
  queryCoverage?: number
  description?: string
}

export interface SequenceValidation {
  valid: boolean
  length: number
  gcContent: number
  ambiguousCount: number
  ambiguousRatio: number
  errors: string[]
  warnings: string[]
}
