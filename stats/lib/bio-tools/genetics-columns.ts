/**
 * Genetics 도구 공통 컬럼 감지 헬퍼.
 * hardy-weinberg, fst 페이지에서 공유.
 */

import { detectColumn } from './fisheries-columns'

/** 유전자좌 컬럼 후보 (case-insensitive 매칭) */
const LOCUS_HINTS = ['locus', 'marker', 'snp', '유전자좌'] as const

/** 집단 컬럼 후보 (case-insensitive 매칭) */
const POP_HINTS = ['population', 'pop', 'group', 'site', '집단'] as const

export function detectLocusColumn(headers: string[]): string {
  return detectColumn(headers, LOCUS_HINTS, 0)
}

export function detectPopulationColumn(headers: string[]): string {
  return detectColumn(headers, POP_HINTS, 0)
}

/** 개체 컬럼 후보 (case-insensitive 매칭) */
const IND_HINTS = ['individual', 'sample', 'id', 'ind', 'specimen', '개체', '시료'] as const

export function detectIndividualColumn(headers: string[]): string {
  return detectColumn(headers, IND_HINTS, 0)
}

/** 대립유전자 컬럼 후보 */
const ALLELE_HINTS = ['allele', '대립유전자', 'variant'] as const

export function detectAlleleColumn(headers: string[]): string {
  return detectColumn(headers, ALLELE_HINTS, 0)
}

/** 개수/빈도 컬럼 후보 */
const COUNT_HINTS = ['count', 'frequency', 'freq', 'n', '개수', '빈도'] as const

export function detectCountColumn(headers: string[]): string {
  return detectColumn(headers, COUNT_HINTS, 0)
}
