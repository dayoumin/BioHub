/** BLAST 실행 공통 유틸리티 — BlastRunner + BlastSearchContent + useBlastExecution 공유 */

import type { GenericBlastHit } from '@biohub/types'

// ── 상수 ──

export const BLAST_POLL_INTERVAL_MS = 15_000
export const BLAST_MAX_POLLS = 40
export const BLAST_RESULT_RETRY_MS = 3_000
export const BLAST_MAX_RESULT_RETRIES = 5
export const BLAST_MAX_SUBMIT_RETRIES = 3

export const BLAST_CACHED_DELAY_MS = 800

// ── 타입 ──

export type BlastErrorCode = 'network' | 'timeout' | 'blast-failed' | 'unknown'

export type BlastPhase =
  | 'submitting'
  | 'polling'
  | 'fetching'
  | 'done'
  | 'error'

export const BLAST_STEP_LABELS = [
  'NCBI BLAST 서버에 서열 전송',
  '데이터베이스에서 유사 서열 검색',
  '유사도 정렬 및 통계적 유의성 계산',
  '결과 수신 및 분석',
] as const

// ── 에러 ──

export class BlastError extends Error {
  constructor(message: string, public readonly code: BlastErrorCode) {
    super(message)
    this.name = 'BlastError'
  }
}

// ── 유틸 함수 ──

/** Abort 가능한 sleep */
export function blastSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = (): void => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** BLAST 결과 fetch + 202 retry */
export async function fetchBlastResult(
  resultUrl: string,
  signal: AbortSignal,
): Promise<Array<Record<string, unknown>>> {
  for (let attempt = 0; attempt < BLAST_MAX_RESULT_RETRIES; attempt++) {
    const res = await fetch(resultUrl, { signal })

    if (res.status === 202) {
      await blastSleep(BLAST_RESULT_RETRY_MS, signal)
      continue
    }

    if (!res.ok) {
      throw new BlastError(`결과 조회 실패 (${res.status})`, 'network')
    }

    const data = await res.json() as { hits?: Array<Record<string, unknown>> }
    return data.hits ?? []
  }

  throw new BlastError('결과가 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.', 'timeout')
}

/** 결과 URL 구성 */
export function buildResultUrl(
  rid: string,
  params: { sequenceHash?: string; marker?: string; cacheKey?: string },
): string {
  const qs = new URLSearchParams()
  if (params.sequenceHash) qs.set('hash', params.sequenceHash)
  if (params.marker) qs.set('marker', params.marker)
  if (params.cacheKey) qs.set('cacheKey', params.cacheKey)
  const qsStr = qs.toString()
  return `/api/blast/result/${rid}${qsStr ? `?${qsStr}` : ''}`
}

// ── Species Enrichment ──

/** 바코딩용: accession → 종명/메타 일괄 조회 (실패 시 무시) */
export async function enrichBarcodeHits(
  hits: Array<Record<string, unknown>> | undefined,
  signal: AbortSignal,
): Promise<void> {
  if (!hits || hits.length === 0) return
  try {
    const accessions = hits.map(h => h['accession'] as string).filter(Boolean)
    if (accessions.length === 0) return

    const res = await fetch('/api/ncbi/species', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessions }),
      signal,
    })
    if (res.ok) {
      const { species, meta } = await res.json() as {
        species: Record<string, string>
        meta?: Record<string, { title?: string; taxid?: number; country?: string; isBarcode?: boolean }>
      }
      for (const hit of hits) {
        const acc = hit['accession'] as string
        if (!acc) continue
        if (species[acc]) hit['species'] = species[acc]
        if (meta?.[acc]) {
          const m = meta[acc]
          if (m.taxid) hit['taxid'] = m.taxid
          if (m.country) hit['country'] = m.country
          if (m.isBarcode) hit['isBarcode'] = true
        }
      }
    }
  } catch {
    // 종명 조회 실패 시 accession으로 표시
  }
}

/** 범용 BLAST용: accession → 종명 일괄 조회 (50개씩 배치, 실패 시 무시) */
export async function enrichGenericHits(
  hits: GenericBlastHit[],
  program: string,
  signal: AbortSignal,
): Promise<void> {
  if (hits.length === 0) return
  const db = (program === 'blastp' || program === 'blastx') ? 'protein' : 'nuccore'
  const BATCH = 50
  // accession → hit 맵 (중복 accession 제거 + O(1) 룩업)
  const hitsByAccession = new Map<string, GenericBlastHit[]>()
  for (const hit of hits) {
    if (!hit.accession) continue
    const arr = hitsByAccession.get(hit.accession)
    if (arr) arr.push(hit)
    else hitsByAccession.set(hit.accession, [hit])
  }
  const uniqueAccessions = Array.from(hitsByAccession.keys())

  for (let i = 0; i < uniqueAccessions.length; i += BATCH) {
    if (signal.aborted) return
    const batch = uniqueAccessions.slice(i, i + BATCH)
    try {
      const res = await fetch('/api/ncbi/species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessions: batch, db }),
        signal,
      })
      if (res.ok) {
        const { species, meta } = await res.json() as {
          species: Record<string, string>
          meta?: Record<string, { title?: string; taxid?: number }>
        }
        for (const acc of batch) {
          const matchedHits = hitsByAccession.get(acc)
          if (!matchedHits) continue
          for (const hit of matchedHits) {
            if (species[acc]) hit.species = species[acc]
            if (meta?.[acc]?.taxid) hit.taxid = meta[acc].taxid
            if (meta?.[acc]?.title) hit.description = meta[acc].title
          }
        }
      }
    } catch { /* 배치 실패 시 무시, 다음 배치 진행 */ }
  }
}

/** rawHits → GenericBlastHit[] 타입 매핑 */
export function mapToGenericHits(rawHits: Array<Record<string, unknown>>): GenericBlastHit[] {
  return rawHits.map(h => ({
    accession: String(h['accession'] ?? ''),
    identity: Number(h['identity'] ?? 0),
    alignLength: Number(h['alignLength'] ?? 0),
    mismatches: Number(h['mismatches'] ?? 0),
    gapOpens: Number(h['gapOpens'] ?? 0),
    queryStart: Number(h['queryStart'] ?? 0),
    queryEnd: Number(h['queryEnd'] ?? 0),
    subjectStart: Number(h['subjectStart'] ?? 0),
    subjectEnd: Number(h['subjectEnd'] ?? 0),
    evalue: Number(h['evalue'] ?? 0),
    bitScore: Number(h['bitScore'] ?? 0),
    species: h['species'] as string | undefined,
    taxid: h['taxid'] as number | undefined,
  }))
}
