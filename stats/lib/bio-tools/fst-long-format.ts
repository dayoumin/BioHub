/**
 * Fst long-format CSV → Worker v2 호환 locusCountData 변환
 *
 * 입력: population/locus/allele/count 4컬럼 CSV
 * 출력: Worker9 fst() 함수의 locusCountData 파라미터
 *
 * Long-format은 집계된 allele count이므로 개체별 데이터 없음
 * → permutation 불가, bootstrap만 가능
 */

import type { CsvData } from '@/components/bio-tools/BioCsvUpload'
import { parseNumericCell } from './parse-numeric-cell'

/** Worker에 전달할 locus별 allele count 구조 */
export interface LocusCountEntry {
  locus: string
  alleles: string[]
  /** counts[popLabel] = allele별 count 배열 (alleles 순서와 동일) */
  counts: Record<string, number[]>
  /** sampleSizes[popLabel] = 총 allele count (= sum of counts) */
  sampleSizes: Record<string, number>
}

export interface LongFormatConversionResult {
  locusCountData: LocusCountEntry[]
  populationLabels: string[]
  locusNames: string[]
}

/**
 * Long-format CSV rows를 Worker v2 호환 구조로 변환
 *
 * @throws Error 유효성 검증 실패 시
 */
export function convertLongFormatToLocusData(
  csvData: CsvData,
  popCol: string,
  locusCol: string,
  alleleCol: string,
  countCol: string,
): LongFormatConversionResult {
  if (!popCol || !locusCol || !alleleCol || !countCol) {
    throw new Error('4개 컬럼(집단, 유전자좌, 대립유전자, 개수)을 모두 선택해주세요')
  }

  const uniqueCols = new Set([popCol, locusCol, alleleCol, countCol])
  if (uniqueCols.size < 4) {
    throw new Error('4개 컬럼을 모두 다르게 선택해주세요')
  }

  // 중첩 맵 구성: locus → allele → pop → count
  const locusMap = new Map<string, Map<string, Map<string, number>>>()
  const allPops = new Set<string>()

  for (const row of csvData.rows) {
    const pop = String(row[popCol] ?? '').trim()
    const locus = String(row[locusCol] ?? '').trim()
    const allele = String(row[alleleCol] ?? '').trim()
    const count = parseNumericCell(row[countCol])

    if (!pop || !locus || !allele) continue
    if (Number.isNaN(count) || count < 0) {
      throw new Error(`유효하지 않은 count 값: 집단=${pop}, 유전자좌=${locus}, 대립유전자=${allele}`)
    }

    allPops.add(pop)

    if (!locusMap.has(locus)) locusMap.set(locus, new Map())
    const alleleMap = locusMap.get(locus)!
    if (!alleleMap.has(allele)) alleleMap.set(allele, new Map())
    alleleMap.get(allele)!.set(pop, (alleleMap.get(allele)!.get(pop) ?? 0) + count)
  }

  if (allPops.size < 2) {
    throw new Error(`최소 2개 집단이 필요합니다 (현재 ${allPops.size}개)`)
  }
  if (locusMap.size < 1) {
    throw new Error('유전자좌 데이터가 없습니다')
  }

  const populationLabels = [...allPops].sort()
  const locusNames = [...locusMap.keys()]

  const locusCountData: LocusCountEntry[] = locusNames.map(locus => {
    const alleleMap = locusMap.get(locus)!
    const alleles = [...alleleMap.keys()]
    const counts: Record<string, number[]> = {}
    const sampleSizes: Record<string, number> = {}

    for (const pop of populationLabels) {
      const popCounts = alleles.map(allele => alleleMap.get(allele)?.get(pop) ?? 0)
      counts[pop] = popCounts
      sampleSizes[pop] = popCounts.reduce((a, b) => a + b, 0)
    }

    return { locus, alleles, counts, sampleSizes }
  })

  return { locusCountData, populationLabels, locusNames }
}
