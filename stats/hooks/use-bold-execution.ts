import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BoldDatabase,
  BoldSearchMode,
  BoldHit,
  BoldClassification,
} from '@biohub/types'
import { BOLD_SEARCH_PRESETS } from '@biohub/types'
import { abortableSleep as sleep, type AnalysisPhase } from '@/lib/genetics/abortable-sleep'
import {
  type BoldErrorCode,
  BoldError,
  parseBoldHits,
  parseBoldClassification,
  BOLD_POLL_INTERVAL_MS,
  BOLD_MAX_POLLS,
  BOLD_MAX_SUBMIT_RETRIES,
  BOLD_CACHED_DELAY_MS,
} from '@/lib/genetics/bold-utils'

// ── 타입 ──

export interface BoldSubmitPayload {
  sequence: string
  db: BoldDatabase
  searchMode: BoldSearchMode
  mo?: number
}

export interface UseBoldExecutionOptions<T> {
  payload: BoldSubmitPayload

  /**
   * 파싱된 hits + classification → 최종 결과 변환.
   * 순수 후처리 전용 — 이 안에서 부모 콜백을 호출하면 안 됨.
   * 반환값이 onComplete로 전달됨.
   */
  transform: (
    hits: BoldHit[],
    classification: BoldClassification,
    signal: AbortSignal,
  ) => Promise<T>

  /**
   * transform 완료 + UX 딜레이 완료 후 훅이 호출.
   * 이 시점에 phase='done'으로 전이됨.
   */
  onComplete: (result: T, elapsedSec: number) => void

  onError: (message: string, code: BoldErrorCode) => void
  onCancel: () => void
}

export interface UseBoldExecutionReturn {
  phase: AnalysisPhase
  currentStep: number
  elapsed: number
  estimatedTime: number
  errorMessage: string
  cancel: () => void
}

// ── 훅 ──

export function useBoldExecution<T>({
  payload,
  transform,
  onComplete,
  onError,
  onCancel,
}: UseBoldExecutionOptions<T>): UseBoldExecutionReturn {
  const [phase, setPhase] = useState<AnalysisPhase>('submitting')
  const [estimatedTime, setEstimatedTime] = useState(8)
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
    setEstimatedTime(8)
    setErrorMessage('')

    async function run(): Promise<void> {
      try {
        if (signal.aborted) return

        // 프리셋에서 mi, maxh 결정
        const preset = BOLD_SEARCH_PRESETS[payload.searchMode]
        const submitBody: Record<string, unknown> = {
          sequence: payload.sequence,
          db: payload.db,
          mi: preset.mi,
          maxh: preset.maxh,
        }
        if (payload.mo !== undefined) submitBody.mo = payload.mo

        // ── Submit ──
        let submitRes: Response | undefined
        for (let attempt = 0; attempt < BOLD_MAX_SUBMIT_RETRIES; attempt++) {
          submitRes = await fetch('/api/bold/submit', {
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
          throw new BoldError('요청이 너무 많습니다. 잠시 후 다시 시도하세요.', 'network')
        }
        if (!submitRes.ok) {
          const contentType = submitRes.headers.get('Content-Type') || ''
          if (!contentType.includes('application/json')) {
            throw new BoldError(
              '분석 서버에 연결할 수 없습니다. ' +
              (process.env.NODE_ENV === 'development'
                ? '개발 환경에서는 wrangler dev로 Worker를 실행해야 합니다.'
                : '잠시 후 다시 시도하세요.'),
              'network',
            )
          }
          const err = await submitRes.json() as { error?: string; message?: string }
          throw new BoldError(err.message || err.error || `제출 실패 (${submitRes.status})`, 'network')
        }

        const submitData = await submitRes.json() as {
          subId?: string
          cached?: boolean
          hits?: unknown[]
          classifications?: unknown[]
        }
        if (signal.aborted) return

        // ── 캐시 경로 ──
        if (submitData.cached && submitData.hits) {
          const hits = parseBoldHits(submitData.hits)
          const classification = parseBoldClassification(submitData.classifications ?? [])

          setPhase('polling')
          setEstimatedTime(2)

          let failed = false
          const [transformResult] = await Promise.all([
            transformRef.current(hits, classification, signal).catch((err: unknown) => {
              failed = true
              throw err
            }),
            (async () => {
              await sleep(BOLD_CACHED_DELAY_MS, signal)
              if (signal.aborted || failed) return
              setPhase('fetching')
              await sleep(BOLD_CACHED_DELAY_MS, signal)
            })(),
          ])
          if (signal.aborted) return

          setPhase('done')
          const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
          onCompleteRef.current(transformResult, elapsedSec)
          return
        }

        // ── subId 유효성 검사 ──
        if (!submitData.subId) {
          throw new BoldError('서버가 제출 ID를 반환하지 않았습니다.', 'network')
        }

        const subId = submitData.subId

        // 검색 모드에 따라 예상 시간 조정
        if (payload.searchMode === 'exhaustive') setEstimatedTime(15)
        else if (payload.searchMode === 'genus-species') setEstimatedTime(10)
        else setEstimatedTime(5)

        setPhase('polling')

        // ── Poll ──
        let completed = false
        for (let polls = 0; polls < BOLD_MAX_POLLS; polls++) {
          if (signal.aborted) return

          await sleep(BOLD_POLL_INTERVAL_MS, signal)
          if (signal.aborted) return

          const statusRes = await fetch(`/api/bold/status/${subId}`, { signal })
          if (!statusRes.ok) continue

          const statusData = await statusRes.json() as {
            queued: number
            processing: number
            completed: number
          }

          if (statusData.completed > 0) {
            completed = true
            break
          }
        }

        if (!completed) {
          throw new BoldError('분석 시간 초과 (3분). 나중에 다시 시도하세요.', 'timeout')
        }

        if (signal.aborted) return
        setPhase('fetching')

        // ── Fetch results + classifications 병렬 ──
        const [resultsRes, classifyRes] = await Promise.all([
          fetch(`/api/bold/results/${subId}`, { signal }),
          fetch(`/api/bold/classify/${subId}`, { signal }),
        ])

        if (!resultsRes.ok) {
          throw new BoldError(`결과 조회 실패 (${resultsRes.status})`, 'network')
        }
        if (!classifyRes.ok) {
          throw new BoldError(`분류 조회 실패 (${classifyRes.status})`, 'network')
        }

        const resultsData = await resultsRes.json() as { results?: unknown[] }
        const classifyData = await classifyRes.json() as { classifications?: unknown[] }
        if (signal.aborted) return

        const hits = parseBoldHits(resultsData.results ?? [])
        const classification = parseBoldClassification(classifyData.classifications ?? [])

        const result = await transformRef.current(hits, classification, signal)
        if (signal.aborted) return

        setPhase('done')
        const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000)
        onCompleteRef.current(result, elapsedSec)
      } catch (err) {
        if (signal.aborted) return
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        const code: BoldErrorCode =
          err instanceof BoldError ? err.code
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
