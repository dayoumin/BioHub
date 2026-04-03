import { useCallback, useEffect, useRef, useState } from 'react'
import type { BlastMarker, BlastProgram, BlastDatabase } from '@biohub/types'
import {
  type BlastPhase,
  type BlastErrorCode,
  BlastError,
  blastSleep as sleep,
  fetchBlastResult,
  buildResultUrl,
  BLAST_POLL_INTERVAL_MS,
  BLAST_MAX_POLLS,
  BLAST_MAX_SUBMIT_RETRIES,
  BLAST_CACHED_DELAY_MS,
} from '@/lib/genetics/blast-utils'

// ── 타입 ──

export interface BlastSubmitPayload {
  sequence: string
  marker?: BlastMarker
  program?: BlastProgram
  database?: BlastDatabase
  expect?: number
  hitlistSize?: number
  megablast?: boolean
}

export interface UseBlastExecutionOptions<T> {
  payload: BlastSubmitPayload

  /**
   * rawHits → 최종 결과 변환 (enrichment + 타입 매핑).
   * 순수 후처리 전용 — 이 안에서 부모 콜백을 호출하면 안 됨.
   * 반환값이 onComplete로 전달됨.
   *
   * 캐시 경로: UX 딜레이와 병렬 실행 (먼저 끝나면 딜레이 완료까지 대기)
   * 일반 경로: fetch 완료 후 순차 실행
   */
  transform: (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ) => Promise<T>

  /**
   * transform 완료 + UX 딜레이 완료 후 훅이 호출.
   * 이 시점에 phase='done'으로 전이됨.
   * elapsed는 훅이 계산하여 전달 — 소비자가 별도 타이머 불필요.
   */
  onComplete: (result: T, elapsedSec: number) => void

  onError: (message: string, code: BlastErrorCode) => void
  onCancel: () => void
}

export interface UseBlastExecutionReturn {
  phase: BlastPhase
  currentStep: number
  elapsed: number
  estimatedTime: number
  errorMessage: string
  cancel: () => void
}

// ── 훅 ──

export function useBlastExecution<T>({
  payload,
  transform,
  onComplete,
  onError,
  onCancel,
}: UseBlastExecutionOptions<T>): UseBlastExecutionReturn {
  const [phase, setPhase] = useState<BlastPhase>('submitting')
  const [estimatedTime, setEstimatedTime] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const abortCtrlRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef(Date.now())

  // 콜백 ref — 최신 참조 유지
  const transformRef = useRef(transform)
  transformRef.current = transform
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // elapsed 타이머
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

    // 상태 초기화
    startTimeRef.current = Date.now()
    setPhase('submitting')
    setElapsed(0)
    setEstimatedTime(30)
    setErrorMessage('')

    async function run(): Promise<void> {
      try {
        if (signal.aborted) return

        const submitBody: Record<string, unknown> = {
          sequence: payload.sequence,
        }
        if (payload.marker) submitBody.marker = payload.marker
        if (payload.program) submitBody.program = payload.program
        if (payload.database) submitBody.database = payload.database
        if (payload.expect !== undefined) submitBody.expect = payload.expect
        if (payload.hitlistSize !== undefined) submitBody.hitlistSize = payload.hitlistSize
        if (payload.megablast !== undefined) submitBody.megablast = payload.megablast

        let submitRes: Response | undefined
        for (let attempt = 0; attempt < BLAST_MAX_SUBMIT_RETRIES; attempt++) {
          submitRes = await fetch('/api/blast/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submitBody),
            signal,
          })

          if (submitRes.status === 429) {
            let waitSec = 10
            try {
              const body429 = await submitRes.json() as { retryAfter?: number }
              if (typeof body429.retryAfter === 'number') waitSec = body429.retryAfter
            } catch { /* non-JSON 429 — 기본값 사용 */ }
            await sleep(Math.min((waitSec + 1) * 1000, 60_000), signal)
            if (signal.aborted) return
            continue
          }
          break
        }

        if (!submitRes || submitRes.status === 429) {
          throw new BlastError('요청이 너무 많습니다. 잠시 후 다시 시도하세요.', 'network')
        }
        if (!submitRes.ok) {
          const contentType = submitRes.headers.get('Content-Type') || ''
          if (!contentType.includes('application/json')) {
            throw new BlastError(
              '분석 서버에 연결할 수 없습니다. ' +
              (process.env.NODE_ENV === 'development'
                ? '개발 환경에서는 wrangler dev로 Worker를 실행해야 합니다.'
                : '잠시 후 다시 시도하세요.'),
              'network',
            )
          }
          const err = await submitRes.json() as { error?: string; message?: string }
          throw new BlastError(err.message || err.error || `제출 실패 (${submitRes.status})`, 'network')
        }

        const submitData = await submitRes.json() as {
          rid?: string; rtoe?: number; sequenceHash?: string; cacheKey?: string
          cached?: boolean; hits?: Array<Record<string, unknown>>
        }
        if (signal.aborted) return

        let rawHits: Array<Record<string, unknown>>

        if (submitData.cached && submitData.hits) {
          rawHits = submitData.hits

          setPhase('polling')
          setEstimatedTime(2)

          // transform이 먼저 끝나도 딜레이 완료까지 대기 — 진행 UI 스킵 방지
          // transform reject 시 delay IIFE가 phase를 덮어쓰지 않도록 failed 플래그로 격리
          let failed = false
          const [transformResult] = await Promise.all([
            transformRef.current(rawHits, signal).catch((err: unknown) => {
              failed = true
              throw err
            }),
            (async () => {
              await sleep(BLAST_CACHED_DELAY_MS, signal)
              if (signal.aborted || failed) return
              setPhase('fetching')
              await sleep(BLAST_CACHED_DELAY_MS, signal)
            })(),
          ])
          if (signal.aborted) return

          setPhase('done')
          const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
          onCompleteRef.current(transformResult, elapsedSec)
          return
        }

        // rid 유효성 검사 — 폴링 전에 확인해야 /api/blast/status/undefined 40회 방지
        if (!submitData.rid) {
          throw new BlastError('서버가 요청 ID를 반환하지 않았습니다.', 'network')
        }

        setEstimatedTime(submitData.rtoe ?? 30)
        setPhase('polling')

        let ready = false
        for (let polls = 0; polls < BLAST_MAX_POLLS; polls++) {
          if (signal.aborted) return

          await sleep(BLAST_POLL_INTERVAL_MS, signal)
          if (signal.aborted) return

          const statusRes = await fetch(`/api/blast/status/${submitData.rid}`, { signal })
          if (!statusRes.ok) continue

          const statusData = await statusRes.json() as { status: string }

          if (statusData.status === 'READY') {
            ready = true
            break
          }
          if (statusData.status === 'FAILED' || statusData.status === 'UNKNOWN') {
            throw new BlastError(`NCBI BLAST 실패: ${statusData.status}`, 'blast-failed')
          }
        }

        if (!ready) {
          throw new BlastError('분석 시간 초과 (10분). 나중에 다시 시도하세요.', 'timeout')
        }

        if (signal.aborted) return
        setPhase('fetching')

        const resultUrl = buildResultUrl(submitData.rid, {
          sequenceHash: submitData.sequenceHash,
          marker: payload.marker,
          cacheKey: submitData.cacheKey,
        })
        rawHits = await fetchBlastResult(resultUrl, signal)
        if (signal.aborted) return

        const result = await transformRef.current(rawHits, signal)
        if (signal.aborted) return

        setPhase('done')
        const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
        onCompleteRef.current(result, elapsedSec)
      } catch (err) {
        if (signal.aborted) return
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        const code: BlastErrorCode =
          err instanceof BlastError ? err.code
          : err instanceof TypeError ? 'network'
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
    // payload가 변경되면 재실행 — 소비자는 useMemo로 payload 안정화 필수
     
  }, [payload])

  // currentStep 계산
  const currentStep =
    phase === 'submitting' ? 0
    : phase === 'polling' ? (elapsed < estimatedTime * 0.6 ? 1 : 2)
    : 3 // fetching, done, error

  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  const cancel = useCallback(() => {
    abortCtrlRef.current?.abort()
    onCancelRef.current()
  }, [])

  return { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel }
}
