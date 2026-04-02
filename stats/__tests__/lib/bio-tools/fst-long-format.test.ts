import { describe, it, expect } from 'vitest'
import { convertLongFormatToLocusData } from '@/lib/bio-tools/fst-long-format'
import type { CsvData } from '@/components/bio-tools/BioCsvUpload'

function makeCsv(rows: Record<string, string | number>[]): CsvData {
  const headers = Object.keys(rows[0] ?? {})
  return { headers, rows, fileName: 'test.csv' }
}

describe('convertLongFormatToLocusData', () => {
  const BASIC_ROWS = [
    { population: 'Pop_A', locus: 'COI', allele: 'A', count: 45 },
    { population: 'Pop_A', locus: 'COI', allele: 'B', count: 55 },
    { population: 'Pop_B', locus: 'COI', allele: 'A', count: 70 },
    { population: 'Pop_B', locus: 'COI', allele: 'B', count: 30 },
    { population: 'Pop_A', locus: 'CytB', allele: 'A', count: 60 },
    { population: 'Pop_A', locus: 'CytB', allele: 'B', count: 40 },
    { population: 'Pop_B', locus: 'CytB', allele: 'A', count: 50 },
    { population: 'Pop_B', locus: 'CytB', allele: 'B', count: 50 },
  ]

  it('2집단 2유전자좌 기본 변환', () => {
    const csv = makeCsv(BASIC_ROWS)
    const result = convertLongFormatToLocusData(csv, 'population', 'locus', 'allele', 'count')

    expect(result.populationLabels).toEqual(['Pop_A', 'Pop_B'])
    expect(result.locusNames).toEqual(['COI', 'CytB'])
    expect(result.locusCountData).toHaveLength(2)

    const coi = result.locusCountData[0]
    expect(coi.locus).toBe('COI')
    expect(coi.alleles).toEqual(['A', 'B'])
    expect(coi.counts['Pop_A']).toEqual([45, 55])
    expect(coi.counts['Pop_B']).toEqual([70, 30])
    expect(coi.sampleSizes['Pop_A']).toBe(100)
    expect(coi.sampleSizes['Pop_B']).toBe(100)
  })

  it('집단 1개면 에러', () => {
    const rows = [
      { population: 'Pop_A', locus: 'COI', allele: 'A', count: 45 },
      { population: 'Pop_A', locus: 'COI', allele: 'B', count: 55 },
    ]
    expect(() => convertLongFormatToLocusData(makeCsv(rows), 'population', 'locus', 'allele', 'count'))
      .toThrow('최소 2개 집단')
  })

  it('음수 count면 에러', () => {
    const rows = [
      ...BASIC_ROWS.slice(0, 7),
      { population: 'Pop_B', locus: 'CytB', allele: 'B', count: -5 },
    ]
    expect(() => convertLongFormatToLocusData(makeCsv(rows), 'population', 'locus', 'allele', 'count'))
      .toThrow('유효하지 않은 count')
  })

  it('컬럼 미선택 시 에러', () => {
    expect(() => convertLongFormatToLocusData(makeCsv(BASIC_ROWS), '', 'locus', 'allele', 'count'))
      .toThrow('4개 컬럼')
  })

  it('동일 컬럼 중복 선택 시 에러', () => {
    expect(() => convertLongFormatToLocusData(makeCsv(BASIC_ROWS), 'population', 'population', 'allele', 'count'))
      .toThrow('다르게 선택')
  })

  it('3집단 3유전자좌 — 집단 라벨 정렬', () => {
    const rows = [
      { pop: 'C', loc: 'L1', al: 'X', n: 10 },
      { pop: 'A', loc: 'L1', al: 'X', n: 20 },
      { pop: 'B', loc: 'L1', al: 'X', n: 30 },
      { pop: 'C', loc: 'L1', al: 'Y', n: 90 },
      { pop: 'A', loc: 'L1', al: 'Y', n: 80 },
      { pop: 'B', loc: 'L1', al: 'Y', n: 70 },
    ]
    const result = convertLongFormatToLocusData(makeCsv(rows), 'pop', 'loc', 'al', 'n')
    expect(result.populationLabels).toEqual(['A', 'B', 'C'])
    expect(result.locusCountData[0].counts['A']).toEqual([20, 80])
  })

  it('누락 집단-대립유전자 조합은 0으로 채움', () => {
    const rows = [
      { population: 'Pop_A', locus: 'COI', allele: 'A', count: 45 },
      { population: 'Pop_A', locus: 'COI', allele: 'B', count: 55 },
      { population: 'Pop_B', locus: 'COI', allele: 'A', count: 70 },
      // Pop_B의 COI allele B 누락
    ]
    const result = convertLongFormatToLocusData(makeCsv(rows), 'population', 'locus', 'allele', 'count')
    expect(result.locusCountData[0].counts['Pop_B']).toEqual([70, 0])
    expect(result.locusCountData[0].sampleSizes['Pop_B']).toBe(70)
  })
})
