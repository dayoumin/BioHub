/**
 * BOLD 리뷰 수정 시뮬레이션 테스트
 *
 * 1. parseBoldHits 중첩 구조 flatMap (per-query 래퍼)
 * 2. 히스토리 sequence 저장 + 복원 + 2KB cap
 * 3. toBoldItem.hasResult = hitCount 기반
 * 4. normalizeEntry 레거시 (sequence 없는 엔트리)
 * 5. abortableSleep 공유 함수 동작
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseBoldHits, parseBoldClassification } from '@/lib/genetics/bold-utils'
import { abortableSleep } from '@/lib/genetics/abortable-sleep'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  HISTORY_KEY,
} from '@/lib/genetics/analysis-history'
import type { BoldHistoryEntry } from '@/lib/genetics/analysis-history'
import { toGeneticsHistoryItem } from '@/lib/utils/history-adapters'

// ═══════════════════════════════════════════════════════════════
// 1. parseBoldHits — 중첩 구조 평탄화
// ═══════════════════════════════════════════════════════════════

describe('parseBoldHits — 중첩 구조 평탄화', () => {
  it('per-query 래퍼 { seqid, results: [...] }를 펼친다', () => {
    const raw = [{
      seqid: 'query1',
      sequence: 'ATGC...',
      results: [
        { processId: 'HIT1', similarity: 0.99, taxonomy: { species: 'Gadus morhua' } },
        { processId: 'HIT2', similarity: 0.95, taxonomy: { species: 'Gadus chalcogrammus' } },
      ],
    }]

    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(2)
    expect(hits[0].processId).toBe('HIT1')
    expect(hits[0].similarity).toBe(0.99)
    expect(hits[1].processId).toBe('HIT2')
    expect(hits[1].taxonomy.species).toBe('Gadus chalcogrammus')
  })

  it('multi-query 래퍼를 모두 펼친다', () => {
    const raw = [
      { seqid: 'q1', results: [{ processId: 'A', similarity: 0.98, taxonomy: {} }] },
      { seqid: 'q2', results: [{ processId: 'B', similarity: 0.92, taxonomy: {} }, { processId: 'C', similarity: 0.88, taxonomy: {} }] },
    ]

    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(3)
    expect(hits.map(h => h.processId)).toEqual(['A', 'B', 'C'])
  })

  it('flat 배열 (래퍼 없음)도 정상 처리', () => {
    const raw = [
      { processId: 'FLAT1', similarity: 0.97, taxonomy: { species: 'Salmo salar' } },
      { processId: 'FLAT2', similarity: 0.91, taxonomy: { species: 'Salmo trutta' } },
    ]

    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(2)
    expect(hits[0].processId).toBe('FLAT1')
  })

  it('빈 results 배열인 래퍼는 0건', () => {
    const raw = [{ seqid: 'empty', results: [] }]
    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(0)
  })

  it('래퍼와 flat이 혼합되어도 처리', () => {
    const raw = [
      { processId: 'FLAT', similarity: 0.99, taxonomy: {} },
      { seqid: 'q1', results: [{ processId: 'NESTED', similarity: 0.95, taxonomy: {} }] },
    ]

    const hits = parseBoldHits(raw)
    expect(hits).toHaveLength(2)
    expect(hits.map(h => h.processId)).toEqual(['FLAT', 'NESTED'])
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. 히스토리 sequence 저장 + 복원 + cap
// ═══════════════════════════════════════════════════════════════

describe('BOLD 히스토리 — sequence 저장/복원', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
  })

  it('서열이 저장되고 복원된다', () => {
    const seq = 'ATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGC'
    saveGeneticsHistory({
      type: 'bold',
      sampleName: 'Test',
      db: 'public.tax-derep',
      searchMode: 'rapid',
      sequencePreview: seq.slice(0, 50),
      sequence: seq,
      topSpecies: null,
      topSimilarity: null,
      topBin: null,
      hitCount: 0,
    })

    const entry = loadGeneticsHistory('bold')[0] as BoldHistoryEntry
    expect(entry.sequence).toBe(seq)
  })

  it('2KB 초과 서열은 잘린다', () => {
    const longSeq = 'A'.repeat(3000)
    saveGeneticsHistory({
      type: 'bold',
      sampleName: 'Long',
      db: 'public.tax-derep',
      searchMode: 'rapid',
      sequencePreview: 'AAA',
      sequence: longSeq,
      topSpecies: null,
      topSimilarity: null,
      topBin: null,
      hitCount: 0,
    })

    const entry = loadGeneticsHistory('bold')[0] as BoldHistoryEntry
    expect(entry.sequence.length).toBe(2000)
  })

  it('레거시 엔트리 (sequence 없음) → 빈 문자열 복원', () => {
    const raw = [{
      id: 'bold-legacy-no-seq',
      type: 'bold',
      sampleName: 'Legacy',
      db: 'public.tax-derep',
      searchMode: 'rapid',
      sequencePreview: 'ATGC',
      topSpecies: 'Gadus morhua',
      topSimilarity: 0.99,
      topBin: 'BOLD:AAA1234',
      hitCount: 5,
      createdAt: 1712200000000,
    }]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(raw))

    const entry = loadGeneticsHistory('bold')[0] as BoldHistoryEntry
    expect(entry.sequence).toBe('')
    expect(entry.sampleName).toBe('Legacy')
    expect(entry.topSpecies).toBe('Gadus morhua')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. toBoldItem.hasResult = hitCount 기반
// ═══════════════════════════════════════════════════════════════

describe('toBoldItem — hasResult = hitCount 기반', () => {
  it('hitCount > 0 → hasResult: true', () => {
    const entry: BoldHistoryEntry = {
      id: 'bold-has',
      type: 'bold',
      sampleName: 'With hits',
      db: 'public.tax-derep',
      searchMode: 'rapid',
      sequencePreview: 'ATGC',
      sequence: 'ATGCATGC',
      topSpecies: 'Gadus morhua',
      topSimilarity: 0.99,
      topBin: 'BOLD:AAA1234',
      hitCount: 15,
      createdAt: 1712200000000,
    }

    const item = toGeneticsHistoryItem(entry)
    expect(item.hasResult).toBe(true)
  })

  it('hitCount = 0 → hasResult: false', () => {
    const entry: BoldHistoryEntry = {
      id: 'bold-none',
      type: 'bold',
      sampleName: 'No hits',
      db: 'public.fungi',
      searchMode: 'exhaustive',
      sequencePreview: 'ATGC',
      sequence: 'ATGCATGC',
      topSpecies: null,
      topSimilarity: null,
      topBin: null,
      hitCount: 0,
      createdAt: 1712200000000,
    }

    const item = toGeneticsHistoryItem(entry)
    expect(item.hasResult).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. abortableSleep 공유 함수
// ═══════════════════════════════════════════════════════════════

describe('abortableSleep', () => {
  it('지정 시간 후 resolve', async () => {
    const start = Date.now()
    await abortableSleep(50)
    expect(Date.now() - start).toBeGreaterThanOrEqual(40)
  })

  it('abort 시 즉시 reject', async () => {
    const ctrl = new AbortController()
    const promise = abortableSleep(10_000, ctrl.signal)
    ctrl.abort()
    await expect(promise).rejects.toThrow('Aborted')
  })

  it('이미 abort된 signal → 즉시 reject', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(abortableSleep(100, ctrl.signal)).rejects.toThrow('Aborted')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. E2E: 파싱 → 분류 판정 → 히스토리 저장 → 어댑터
// ═══════════════════════════════════════════════════════════════

describe('E2E: BOLD 결과 파싱 → 히스토리 → 어댑터', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
  })

  it('BOLD API 응답 시뮬레이션 → 저장 → 사이드바 표시', () => {
    // 1. API 응답 파싱
    const rawHits = [{
      seqid: 'query',
      results: [
        {
          processId: 'GBMNB12345-23',
          bin: 'BOLD:AAA1234',
          similarity: 0.992,
          taxonomy: { phylum: 'Chordata', class: 'Actinopterygii', family: 'Gadidae', genus: 'Gadus', species: 'Gadus morhua' },
          accession: 'KF601412',
          country: 'Norway',
        },
        {
          processId: 'GBMNB67890-23',
          bin: 'BOLD:AAA1234',
          similarity: 0.985,
          taxonomy: { species: 'Gadus morhua' },
          accession: 'MH234567',
          country: 'Iceland',
        },
      ],
    }]
    const rawClassification = [{ taxon: 'Gadus morhua', supportingRecords: 42, rank: 'species' }]

    const hits = parseBoldHits(rawHits)
    const classification = parseBoldClassification(rawClassification)

    expect(hits).toHaveLength(2)
    expect(classification.taxon).toBe('Gadus morhua')
    expect(classification.rank).toBe('species')

    // 2. 히스토리 저장
    const sequence = 'CCTCTATCTAGTATTTGGTGCCTGAGCCGGAATGGTAGGAACCGCCCTAAGC'
    const topHit = hits[0]
    saveGeneticsHistory({
      type: 'bold',
      sampleName: 'COI 바코딩 시료',
      db: 'public.tax-derep',
      searchMode: 'rapid',
      sequencePreview: sequence.slice(0, 50),
      sequence,
      topSpecies: classification.taxon || topHit.taxonomy.species || null,
      topSimilarity: topHit.similarity,
      topBin: topHit.bin,
      hitCount: hits.length,
    })

    // 3. 히스토리 로드 + 어댑터 변환
    const entries = loadGeneticsHistory('bold')
    expect(entries).toHaveLength(1)

    const entry = entries[0] as BoldHistoryEntry
    expect(entry.topSpecies).toBe('Gadus morhua')
    expect(entry.sequence).toBe(sequence)

    const item = toGeneticsHistoryItem(entry)
    expect(item.title).toBe('COI 바코딩 시료')
    expect(item.hasResult).toBe(true) // hitCount=2 > 0
    expect(item.badges!).toHaveLength(3) // species + similarity + BIN
    expect(item.badges![0].value).toBe('Gadus morhua')
    expect(item.badges![1].value).toBe('99.2%')
    expect(item.badges![2].value).toBe('BOLD:AAA1234')
  })
})
