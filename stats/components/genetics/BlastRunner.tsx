'use client'

import { useEffect, useRef, useState } from 'react'
import type { BlastMarker } from '@biohub/types'
import { cleanSequence } from '@/lib/genetics/validate-sequence'

interface BlastRunnerProps {
  sequence: string
  marker: BlastMarker
  onResult: (data: unknown) => void
  onError: (error: string) => void
}

type BlastPhase =
  | 'submitting'
  | 'polling'
  | 'fetching'
  | 'done'
  | 'error'

const POLL_INTERVAL_MS = 15_000
const MAX_POLLS = 40 // 최대 10분

/**
 * BLAST 분석 실행 컴포넌트
 *
 * 마운트 시 자동 실행:
 * 1. /api/blast/submit → RID
 * 2. /api/blast/status/:rid 폴링 (15초 간격)
 * 3. READY → /api/blast/result/:rid
 * 4. onResult 콜백
 */
export function BlastRunner({ sequence, marker, onResult, onError }: BlastRunnerProps) {
  const [phase, setPhase] = useState<BlastPhase>('submitting')
  const [rid, setRid] = useState<string | null>(null)
  const [estimatedTime, setEstimatedTime] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [pollCount, setPollCount] = useState(0)
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
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
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
        // 1. 제출
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

        const submitData = await submitRes.json() as { rid: string; rtoe: number }
        if (signal.aborted) return

        setRid(submitData.rid)
        setEstimatedTime(submitData.rtoe)
        setPhase('polling')

        // 2. 폴링
        let polls = 0
        while (polls < MAX_POLLS) {
          if (signal.aborted) return

          await sleep(POLL_INTERVAL_MS, signal)
          if (signal.aborted) return

          polls++
          setPollCount(polls)

          const statusRes = await fetch(`/api/blast/status/${submitData.rid}`, { signal })
          if (!statusRes.ok) continue

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

        // 3. 결과 조회
        if (signal.aborted) return
        setPhase('fetching')

        const resultRes = await fetch(`/api/blast/result/${submitData.rid}`, { signal })
        if (!resultRes.ok) {
          throw new Error(`결과 조회 실패 (${resultRes.status})`)
        }

        const resultData = await resultRes.json()
        if (signal.aborted) return

        setPhase('done')
        onResultRef.current(resultData)
      } catch (err) {
        if (signal.aborted) return
        const msg = err instanceof Error ? err.message : '알 수 없는 오류'
        setErrorMessage(msg)
        setPhase('error')
        onErrorRef.current(msg)
      }
    }

    run()

    return () => {
      ctrl.abort()
    }
  }, [sequence, marker]) // onResult/onError는 ref로 참조 — deps에서 제외

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8">
      {/* 프로그레스 */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            {phase === 'submitting' && '서열 제출 중...'}
            {phase === 'polling' && `분석 처리 중... (폴링 ${pollCount}회)`}
            {phase === 'fetching' && '결과 수신 중...'}
            {phase === 'error' && '오류 발생'}
          </span>
          <span className="text-gray-500">{elapsed}초 경과</span>
        </div>

        {/* 3단계 프로그레스 바 */}
        <div className="flex gap-1">
          <div className={`h-2 flex-1 rounded-l-full transition-colors ${
            phase === 'submitting' ? 'animate-pulse bg-blue-400' :
            phase !== 'error' ? 'bg-blue-600' : 'bg-red-300'
          }`} />
          <div className={`h-2 flex-1 transition-colors ${
            phase === 'polling' ? 'animate-pulse bg-blue-400' :
            phase === 'fetching' || phase === 'done' ? 'bg-blue-600' :
            phase === 'error' ? 'bg-red-300' : 'bg-gray-200'
          }`} />
          <div className={`h-2 flex-1 rounded-r-full transition-colors ${
            phase === 'fetching' ? 'animate-pulse bg-blue-400' :
            phase === 'done' ? 'bg-blue-600' :
            phase === 'error' ? 'bg-red-300' : 'bg-gray-200'
          }`} />
        </div>

        <div className="mt-2 flex justify-between text-xs text-gray-400">
          <span>제출</span>
          <span>처리 중</span>
          <span>완료</span>
        </div>
      </div>

      {/* 상태별 메시지 */}
      {phase === 'polling' && (
        <div className="space-y-2 text-sm text-gray-600">
          {rid && <p>Request ID: <code className="rounded bg-gray-100 px-1 text-xs">{rid}</code></p>}
          <p>예상 시간: 약 {estimatedTime}초 · 페이지를 떠나도 분석은 계속됩니다.</p>
          {elapsed > 120 && (
            <p className="text-amber-600">
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
    </div>
  )
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}
