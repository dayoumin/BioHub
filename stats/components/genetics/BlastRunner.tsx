'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlastMarker } from '@biohub/types'
import { cleanSequence } from '@/lib/genetics/validate-sequence'
import { Button } from '@/components/ui/button'

export type BlastErrorCode = 'network' | 'timeout' | 'blast-failed' | 'unknown'

interface BlastRunnerProps {
  sequence: string
  marker: BlastMarker
  onResult: (data: unknown) => void
  onError: (message: string, code: BlastErrorCode) => void
  onCancel: () => void
}

type BlastPhase =
  | 'submitting'
  | 'polling'
  | 'fetching'
  | 'done'
  | 'error'

const POLL_INTERVAL_MS = 15_000
const MAX_POLLS = 40 // 최대 10분

const STEP_LABELS = [
  '입력 서열을 NCBI BLAST 서버에 전송',
  'NCBI 유전자 데이터베이스에서 유사 서열 검색',
  '유사도 정렬 및 통계적 유의성 계산',
  '결과 수신 및 종 판별',
] as const

/**
 * BLAST 분석 실행 컴포넌트
 *
 * 마운트 시 자동 실행:
 * 1. /api/blast/submit → RID
 * 2. /api/blast/status/:rid 폴링 (15초 간격)
 * 3. READY → /api/blast/result/:rid
 * 4. onResult 콜백
 */
export function BlastRunner({ sequence, marker, onResult, onError, onCancel }: BlastRunnerProps) {
  const [phase, setPhase] = useState<BlastPhase>('submitting')
  const [estimatedTime, setEstimatedTime] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const abortCtrlRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef(Date.now())
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  onResultRef.current = onResult
  onErrorRef.current = onError

  // 경과 시간 타이머
  useEffect(() => {
    if (phase === 'done' || phase === 'error') return

    const timer = setInterval(() => {
      setElapsed(prev => {
        const next = Math.floor((Date.now() - startTimeRef.current) / 1000)
        return next === prev ? prev : next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase])

  // 메인 실행 로직
  useEffect(() => {
    const ctrl = new AbortController()
    abortCtrlRef.current = ctrl
    const { signal } = ctrl

    async function run(): Promise<void> {
      try {
        setPhase('submitting')
        const cleaned = cleanSequence(sequence)

        const submitRes = await fetch('/api/blast/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence: cleaned, marker }),
          signal,
        })

        if (!submitRes.ok) {
          const contentType = submitRes.headers.get('Content-Type') || ''
          if (!contentType.includes('application/json')) {
            throw new Error(
              '분석 서버에 연결할 수 없습니다. ' +
              (process.env.NODE_ENV === 'development'
                ? '개발 환경에서는 wrangler dev로 Worker를 실행해야 합니다.'
                : '잠시 후 다시 시도하세요.')
            )
          }
          const err = await submitRes.json() as { error?: string; message?: string }
          throw new Error(err.message || err.error || `제출 실패 (${submitRes.status})`)
        }

        const submitData = await submitRes.json() as {
          rid?: string; rtoe?: number; sequenceHash?: string
          cached?: boolean; hits?: Array<Record<string, unknown>>
        }
        if (signal.aborted) return

        let resultData: { hits?: Array<Record<string, unknown>> }

        if (submitData.cached && submitData.hits) {
          // 캐시 히트: NCBI 호출 스킵, UX 흐름은 동일하게 유지
          resultData = { hits: submitData.hits }

          // efetch를 UX 딜레이와 병렬 실행
          const speciesPromise = enrichHitsWithSpecies(resultData.hits, signal)

          setPhase('polling')
          setEstimatedTime(2)
          // step 1(검색) ~800ms → step 2(분석) ~800ms (임계값 2*0.6=1.2s)
          await sleep(800, signal)
          if (signal.aborted) return
          await sleep(800, signal)
          if (signal.aborted) return

          setPhase('fetching')
          await speciesPromise
          if (signal.aborted) return
        } else {
          // NCBI BLAST 폴링
          setEstimatedTime(submitData.rtoe ?? 30)
          setPhase('polling')

          let polls = 0
          while (polls < MAX_POLLS) {
            if (signal.aborted) return

            await sleep(POLL_INTERVAL_MS, signal)
            if (signal.aborted) return

            const statusRes = await fetch(`/api/blast/status/${submitData.rid}`, { signal })
            if (!statusRes.ok) continue

            polls++

            const statusData = await statusRes.json() as { status: string }

            if (statusData.status === 'READY') {
              break
            }
            if (statusData.status === 'FAILED' || statusData.status === 'UNKNOWN') {
              throw new Error(`NCBI BLAST 실패: ${statusData.status}`)
            }
          }

          if (polls >= MAX_POLLS) {
            throw new Error('분석 시간 초과 (10분). 나중에 다시 시도하세요.')
          }

          if (signal.aborted) return
          setPhase('fetching')

          const resultUrl = submitData.sequenceHash
            ? `/api/blast/result/${submitData.rid}?hash=${submitData.sequenceHash}&marker=${marker}`
            : `/api/blast/result/${submitData.rid}`
          const resultRes = await fetch(resultUrl, { signal })
          if (!resultRes.ok) {
            throw new Error(`결과 조회 실패 (${resultRes.status})`)
          }

          resultData = await resultRes.json() as { hits?: Array<Record<string, unknown>> }
          if (signal.aborted) return
        }

        // 종명 조회 — 캐시 히트는 위에서 병렬 처리, 여기는 일반 경로만
        if (!submitData.cached) {
          await enrichHitsWithSpecies(resultData.hits, signal)
        }

        setPhase('done')
        onResultRef.current(resultData)
      } catch (err) {
        if (signal.aborted) return
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        const code: BlastErrorCode =
          err instanceof TypeError || msg.includes('연결') || msg.includes('서버') ? 'network'
          : msg.includes('시간 초과') ? 'timeout'
          : msg.includes('BLAST 실패') ? 'blast-failed'
          : 'unknown'
        setErrorMessage(msg)
        setPhase('error')
        onErrorRef.current(msg, code)
      }
    }

    run()

    return () => {
      ctrl.abort()
    }
  }, [sequence, marker])

  // 현재 활성 단계 (0-indexed): phase + 경과 시간 기반
  const currentStep =
    phase === 'submitting' ? 0
    : phase === 'polling' ? (elapsed < estimatedTime * 0.6 ? 1 : 2)
    : phase === 'fetching' ? 3
    : 3

  const phaseHeader =
    phase === 'submitting' ? '서열 제출 중...'
    : phase === 'polling' && currentStep === 1 ? '데이터베이스 검색 중...'
    : phase === 'polling' ? '유사도 분석 중...'
    : phase === 'fetching' ? '결과 수신 중...'
    : phase === 'error' ? '오류 발생' : ''

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{phaseHeader}</span>
          <span className="text-gray-500">{elapsed}초 경과</span>
        </div>

        {/* 4-segment progress bar */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 transition-colors${
                i === 0 ? ' rounded-l-full' : i === 3 ? ' rounded-r-full' : ''
              } ${
                phase === 'error' ? 'bg-red-300'
                : i < currentStep ? 'bg-blue-600'
                : i === currentStep ? 'animate-pulse bg-blue-400'
                : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>제출</span>
          <span>검색</span>
          <span>분석</span>
          <span>결과</span>
        </div>
      </div>

      {/* 분석 과정 — 모든 활성 단계에서 표시 */}
      {phase !== 'done' && phase !== 'error' && (
        <div className="space-y-3" role="status" aria-live="polite">
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">분석 과정</h4>
            <ol className="space-y-1.5 text-xs">
              {STEP_LABELS.map((label, i) => (
                <li
                  key={i}
                  className={
                    i < currentStep ? 'text-emerald-600'
                    : i === currentStep ? 'font-medium text-blue-700'
                    : 'text-gray-400'
                  }
                >
                  <span className="mr-1.5 inline-block w-4 text-center">
                    {i < currentStep ? '\u2713' : `${i + 1}.`}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>

          {phase === 'polling' && (
            <div className="text-sm text-gray-600">
              <p>
                예상 시간: 약 {estimatedTime}초
                {estimatedTime > 0 && elapsed < estimatedTime
                  ? ` · 남은 시간 약 ${Math.max(estimatedTime - elapsed, 1)}초`
                  : ''}
              </p>
            </div>
          )}

          {phase === 'fetching' && (
            <p className="text-sm text-gray-600">거의 완료되었습니다...</p>
          )}

          <p className="text-xs text-amber-600/80">
            분석이 완료될 때까지 이 페이지를 유지해주세요.
          </p>
          {elapsed > 120 && (
            <p className="text-xs text-amber-600">
              평소보다 오래 걸리고 있습니다. NCBI 서버 상태에 따라 지연될 수 있습니다.
            </p>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {phase !== 'done' && phase !== 'error' && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => {
            abortCtrlRef.current?.abort()
            onCancel()
          }}
        >
          분석 취소
        </Button>
      )}
    </div>
  )
}

/** accession → 종명 일괄 조회 (실패 시 무시) */
async function enrichHitsWithSpecies(
  hits: Array<Record<string, unknown>> | undefined,
  signal: AbortSignal
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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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
