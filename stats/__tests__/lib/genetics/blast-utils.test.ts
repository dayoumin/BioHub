import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  BlastError,
  fetchBlastResult,
  buildResultUrl,
  enrichBarcodeHits,
  enrichGenericHits,
  mapToGenericHits,
  BLAST_MAX_RESULT_RETRIES,
} from '@/lib/genetics/blast-utils'
import { abortableSleep } from '@/lib/genetics/abortable-sleep'

// ── abortableSleep ──

describe('abortableSleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('지정 시간 후 resolve', async () => {
    const p = abortableSleep(100)
    vi.advanceTimersByTime(100)
    await expect(p).resolves.toBeUndefined()
  })

  it('이미 abort된 signal이면 즉시 reject', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(abortableSleep(100, ctrl.signal)).rejects.toThrow('Aborted')
  })

  it('sleep 중 abort되면 reject', async () => {
    const ctrl = new AbortController()
    const p = abortableSleep(1000, ctrl.signal)
    vi.advanceTimersByTime(100)
    ctrl.abort()
    await expect(p).rejects.toThrow('Aborted')
  })
})

// ── fetchBlastResult ──

describe('fetchBlastResult', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('성공 응답에서 hits 반환', async () => {
    const mockHits = [{ accession: 'AB123', identity: 0.99 }]
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ hits: mockHits }), { status: 200 }),
    )

    const result = await fetchBlastResult('/api/blast/result/RID123', new AbortController().signal)
    expect(result).toEqual(mockHits)
  })

  it('hits 없으면 빈 배열 반환', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    )

    const result = await fetchBlastResult('/api/blast/result/RID123', new AbortController().signal)
    expect(result).toEqual([])
  })

  it('202 응답 시 재시도 후 성공', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 202 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ hits: [{ accession: 'X' }] }), { status: 200 }),
      )

    const result = await fetchBlastResult('/api/blast/result/RID', new AbortController().signal)
    expect(result).toEqual([{ accession: 'X' }])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('모든 재시도 실패 시 BlastError(timeout)', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 202 }),
    )

    let caught: unknown
    const promise = fetchBlastResult('/api/blast/result/RID', new AbortController().signal)
      .catch((err: unknown) => { caught = err })

    // 5회 retry × 3초 sleep을 즉시 진행
    for (let i = 0; i < BLAST_MAX_RESULT_RETRIES; i++) {
      await vi.advanceTimersByTimeAsync(3_100)
    }

    await promise
    expect(caught).toBeInstanceOf(BlastError)
    expect((caught as BlastError).code).toBe('timeout')
    vi.useRealTimers()
  })

  it('비정상 상태 코드에서 BlastError(network)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', { status: 500 }),
    )

    await expect(
      fetchBlastResult('/api/blast/result/RID', new AbortController().signal),
    ).rejects.toMatchObject({ code: 'network' })
  })
})

// ── buildResultUrl ──

describe('buildResultUrl', () => {
  it('파라미터 없으면 기본 경로만', () => {
    expect(buildResultUrl('RID123', {})).toBe('/api/blast/result/RID123')
  })

  it('hash + marker 포함', () => {
    const url = buildResultUrl('RID', { sequenceHash: 'abc', marker: 'COI' })
    expect(url).toContain('hash=abc')
    expect(url).toContain('marker=COI')
  })

  it('cacheKey 포함', () => {
    const url = buildResultUrl('RID', { cacheKey: 'key1' })
    expect(url).toBe('/api/blast/result/RID?cacheKey=key1')
  })
})

// ── enrichBarcodeHits ──

describe('enrichBarcodeHits', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('종명/메타 매핑', async () => {
    const hits: Array<Record<string, unknown>> = [
      { accession: 'AB123' },
      { accession: 'CD456' },
    ]

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        species: { AB123: 'Oncorhynchus mykiss', CD456: 'Salmo salar' },
        meta: {
          AB123: { taxid: 8022, country: 'Japan', isBarcode: true },
          CD456: { taxid: 8030 },
        },
      }), { status: 200 }),
    )

    await enrichBarcodeHits(hits, new AbortController().signal)

    expect(hits[0]['species']).toBe('Oncorhynchus mykiss')
    expect(hits[0]['taxid']).toBe(8022)
    expect(hits[0]['country']).toBe('Japan')
    expect(hits[0]['isBarcode']).toBe(true)
    expect(hits[1]['species']).toBe('Salmo salar')
    expect(hits[1]['country']).toBeUndefined()
  })

  it('빈 배열이면 fetch 안 함', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    await enrichBarcodeHits([], new AbortController().signal)
    expect(spy).not.toHaveBeenCalled()
  })

  it('fetch 실패해도 에러 안 던짐', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'))
    const hits = [{ accession: 'AB123' }]
    await expect(enrichBarcodeHits(hits, new AbortController().signal)).resolves.toBeUndefined()
  })
})

// ── enrichGenericHits ──

describe('enrichGenericHits', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('배치별 종명 매핑 + 중복 accession 제거', async () => {
    // 같은 accession이 2번 나오는 경우
    const hits = mapToGenericHits([
      { accession: 'AB1', identity: 0.99, alignLength: 100, mismatches: 1, gapOpens: 0, queryStart: 1, queryEnd: 100, subjectStart: 1, subjectEnd: 100, evalue: 0, bitScore: 200 },
      { accession: 'AB1', identity: 0.98, alignLength: 90, mismatches: 2, gapOpens: 0, queryStart: 1, queryEnd: 90, subjectStart: 1, subjectEnd: 90, evalue: 0, bitScore: 180 },
      { accession: 'CD2', identity: 0.95, alignLength: 80, mismatches: 4, gapOpens: 0, queryStart: 1, queryEnd: 80, subjectStart: 1, subjectEnd: 80, evalue: 0, bitScore: 150 },
    ])

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        species: { AB1: 'Species A', CD2: 'Species B' },
        meta: { AB1: { taxid: 100, title: 'Title A' }, CD2: { taxid: 200, title: 'Title B' } },
      }), { status: 200 }),
    )

    await enrichGenericHits(hits, 'blastn', new AbortController().signal)

    // 중복 accession이 API 요청에서 deduplicated 됐는지 확인
    const requestBody = JSON.parse(spy.mock.calls[0][1]?.body as string) as { accessions: string[] }
    expect(requestBody.accessions).toEqual(['AB1', 'CD2'])
    expect(requestBody.accessions).toHaveLength(2) // not 3

    // 두 AB1 hit 모두 enrichment 적용
    expect(hits[0].species).toBe('Species A')
    expect(hits[1].species).toBe('Species A')
    expect(hits[2].species).toBe('Species B')
    expect(hits[0].description).toBe('Title A')
  })

  it('blastp이면 db=protein 전달', async () => {
    const hits = mapToGenericHits([
      { accession: 'P1', identity: 0.9, alignLength: 50, mismatches: 5, gapOpens: 0, queryStart: 1, queryEnd: 50, subjectStart: 1, subjectEnd: 50, evalue: 0, bitScore: 100 },
    ])

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ species: {}, meta: {} }), { status: 200 }),
    )

    await enrichGenericHits(hits, 'blastp', new AbortController().signal)
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as { db: string }
    expect(body.db).toBe('protein')
  })
})

// ── mapToGenericHits ──

describe('mapToGenericHits', () => {
  it('Record → GenericBlastHit 타입 변환', () => {
    const raw = [
      {
        accession: 'AB123',
        identity: 0.995,
        alignLength: 658,
        mismatches: 3,
        gapOpens: 0,
        queryStart: 1,
        queryEnd: 658,
        subjectStart: 1,
        subjectEnd: 658,
        evalue: 0.0,
        bitScore: 1200,
        species: 'Test species',
      },
    ]
    const hits = mapToGenericHits(raw)

    expect(hits).toHaveLength(1)
    expect(hits[0].accession).toBe('AB123')
    expect(hits[0].identity).toBe(0.995)
    expect(hits[0].species).toBe('Test species')
    expect(hits[0].taxid).toBeUndefined()
  })

  it('누락 필드는 기본값 사용', () => {
    const hits = mapToGenericHits([{}])
    expect(hits[0].accession).toBe('')
    expect(hits[0].identity).toBe(0)
    expect(hits[0].evalue).toBe(0)
  })
})

// ── BlastError ──

describe('BlastError', () => {
  it('code 속성 유지', () => {
    const err = new BlastError('test', 'timeout')
    expect(err.message).toBe('test')
    expect(err.code).toBe('timeout')
    expect(err.name).toBe('BlastError')
    expect(err).toBeInstanceOf(Error)
  })
})
