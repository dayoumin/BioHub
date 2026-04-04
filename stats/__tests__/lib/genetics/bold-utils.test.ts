import { describe, expect, it } from 'vitest'
import { parseBoldHits, parseBoldClassification, BoldError } from '@/lib/genetics/bold-utils'

describe('parseBoldHits', () => {
  it('camelCase 필드를 파싱한다', () => {
    const raw = [{
      processId: 'GBMNB12345-23',
      bin: 'BOLD:AAA1234',
      similarity: 0.992,
      taxonomy: {
        phylum: 'Chordata',
        class: 'Actinopterygii',
        order: 'Gadiformes',
        family: 'Gadidae',
        genus: 'Gadus',
        species: 'Gadus morhua',
      },
      accession: 'KF601412',
      country: 'Norway',
    }]

    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(1)
    expect(hits[0].processId).toBe('GBMNB12345-23')
    expect(hits[0].bin).toBe('BOLD:AAA1234')
    expect(hits[0].similarity).toBe(0.992)
    expect(hits[0].taxonomy.species).toBe('Gadus morhua')
    expect(hits[0].taxonomy.family).toBe('Gadidae')
    expect(hits[0].accession).toBe('KF601412')
    expect(hits[0].country).toBe('Norway')
  })

  it('snake_case 필드도 처리한다', () => {
    const raw = [{
      process_id: 'PROC001',
      BIN: 'BOLD:BBB5678',
      pident: 0.95,
      taxonomy: { species: 'Salmo salar' },
    }]

    const hits = parseBoldHits(raw)
    expect(hits[0].processId).toBe('PROC001')
    expect(hits[0].bin).toBe('BOLD:BBB5678')
    expect(hits[0].similarity).toBe(0.95)
    expect(hits[0].taxonomy.species).toBe('Salmo salar')
  })

  it('빈 배열 처리', () => {
    expect(parseBoldHits([])).toEqual([])
  })

  it('taxonomy 누락 시 null 반환', () => {
    const raw = [{ processId: 'X', similarity: 0.8 }]
    const hits = parseBoldHits(raw)
    expect(hits[0].taxonomy.species).toBeNull()
    expect(hits[0].taxonomy.family).toBeNull()
    expect(hits[0].bin).toBeNull()
  })

  it('유효하지 않은 similarity는 0으로 처리', () => {
    const raw = [{ processId: 'X', similarity: 'invalid', taxonomy: {} }]
    const hits = parseBoldHits(raw)
    expect(hits[0].similarity).toBe(0)
  })
})

describe('parseBoldClassification', () => {
  it('종 수준 분류를 파싱한다', () => {
    const raw = [{
      taxon: 'Gadus morhua',
      supportingRecords: 42,
      rank: 'species',
    }]

    const result = parseBoldClassification(raw)
    expect(result.taxon).toBe('Gadus morhua')
    expect(result.supportingRecords).toBe(42)
    expect(result.rank).toBe('species')
  })

  it('속 수준 분류를 파싱한다', () => {
    const raw = [{ taxon: 'Gadus', supporting_records: 10, rank: 'genus' }]
    const result = parseBoldClassification(raw)
    expect(result.taxon).toBe('Gadus')
    expect(result.rank).toBe('genus')
    expect(result.supportingRecords).toBe(10)
  })

  it('rank 없으면 taxon에서 추론한다 — 이명이면 species', () => {
    const raw = [{ TAXON: 'Gadus morhua' }]
    const result = parseBoldClassification(raw)
    expect(result.taxon).toBe('Gadus morhua')
    expect(result.rank).toBe('species')
  })

  it('rank 없으면 taxon에서 추론한다 — 단명이면 genus', () => {
    const raw = [{ taxon: 'Gadus' }]
    const result = parseBoldClassification(raw)
    expect(result.rank).toBe('genus')
  })

  it('빈 배열 → 판정 불가', () => {
    const result = parseBoldClassification([])
    expect(result.taxon).toBe('')
    expect(result.rank).toBe('none')
    expect(result.supportingRecords).toBe(0)
  })

  it('빈 taxon → none rank', () => {
    const raw = [{ taxon: '' }]
    const result = parseBoldClassification(raw)
    expect(result.rank).toBe('none')
  })
})

describe('BoldError', () => {
  it('code를 포함한다', () => {
    const err = new BoldError('test', 'timeout')
    expect(err.message).toBe('test')
    expect(err.code).toBe('timeout')
    expect(err.name).toBe('BoldError')
  })
})
