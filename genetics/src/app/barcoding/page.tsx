'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/SequenceInput'
import { BlastRunner } from '@/components/BlastRunner'
import { ResultView } from '@/components/ResultView'
import { parseBlastHits, analyzeBlastResult } from '@/lib/decision-engine'
import type { DecisionResult } from '@/lib/decision-engine'

type AppState =
  | { step: 'input' }
  | { step: 'analyzing'; sequence: string; marker: BlastMarker }
  | { step: 'result'; marker: BlastMarker; decision: DecisionResult }
  | { step: 'error'; message: string }

export default function BarcodingPage() {
  const [marker, setMarker] = useState<BlastMarker>('COI')
  const [sequence, setSequence] = useState('')
  const [state, setState] = useState<AppState>({ step: 'input' })

  const handleAnalyze = useCallback((_validation: SequenceValidation) => {
    setState({ step: 'analyzing', sequence, marker })
  }, [sequence, marker])

  const handleResult = useCallback((data: unknown) => {
    const topHits = parseBlastHits(data)

    setState(prev => {
      if (prev.step !== 'analyzing') return prev
      const decision = analyzeBlastResult(topHits, prev.marker)
      return { step: 'result', marker: prev.marker, decision }
    })
  }, [])

  const handleError = useCallback((msg: string) => {
    setState({ step: 'error', message: msg })
  }, [])

  const handleReset = useCallback((clearSequence = true) => {
    setState({ step: 'input' })
    if (clearSequence) setSequence('')
  }, [])

  const handleRetryWithMarker = useCallback((newMarker: BlastMarker) => {
    setMarker(newMarker)
    setState({ step: 'analyzing', sequence, marker: newMarker })
  }, [sequence])

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* 헤더 */}
      <div className="mb-8">
        <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-800">
          &larr; 유전적 분석
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          DNA 바코딩 종 판별
        </h1>
        <p className="text-gray-600">
          서열을 입력하면 종을 동정하고, 결과 해석과 다음 단계를 안내합니다.
        </p>
      </div>

      {/* 안내 — 입력 단계에서만 */}
      {state.step === 'input' && (
        <>
          <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-900">사용 방법</h2>
            <ol className="space-y-2 text-sm text-blue-800">
              <li><span className="mr-2 font-bold text-blue-600">1.</span>마커를 선택하세요 (기본: COI — 동물 표준 바코드)</li>
              <li><span className="mr-2 font-bold text-blue-600">2.</span>FASTA 서열을 붙여넣거나 파일을 업로드하세요</li>
              <li><span className="mr-2 font-bold text-blue-600">3.</span>결과와 함께 <strong>해석, 대안 마커, 다음 단계</strong>를 안내합니다</li>
            </ol>
            <div className="mt-4 rounded bg-white/60 p-3 text-xs text-blue-700">
              <strong>COI로 잘 안 되는 분류군이 있나요?</strong> 참치류, 양서류, 이매패류 등은 COI만으로 종 구분이
              어렵습니다. 분석 결과에서 자동으로 대안 마커를 추천합니다.
            </div>
          </div>

          <SequenceInput
            sequence={sequence}
            onSequenceChange={setSequence}
            marker={marker}
            onMarkerChange={setMarker}
            onSubmit={handleAnalyze}
          />
        </>
      )}

      {state.step === 'analyzing' && (
        <BlastRunner
          sequence={state.sequence}
          marker={state.marker}
          onResult={handleResult}
          onError={handleError}
          onCancel={() => handleReset(false)}
        />
      )}

      {state.step === 'result' && (
        <ResultView
          decision={state.decision}
          marker={state.marker}
          onReset={handleReset}
          onRetryWithMarker={handleRetryWithMarker}
        />
      )}

      {state.step === 'error' && (
        <div className="space-y-4" role="alert">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 font-semibold text-red-800">분석 오류</h2>
            <p className="text-sm text-red-700">{state.message}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-600">해결 방법</h3>
            <ul className="space-y-1 text-xs text-gray-500">
              {state.message.includes('연결') || state.message.includes('서버') ? (
                <>
                  <li>- 인터넷 연결을 확인하세요</li>
                  <li>- 잠시 후 다시 시도하세요 (NCBI 서버 점검일 수 있습니다)</li>
                </>
              ) : state.message.includes('시간 초과') ? (
                <>
                  <li>- NCBI 서버가 혼잡합니다. 몇 분 후 다시 시도하세요</li>
                  <li>- 서열이 너무 길면 잘라서 시도해보세요</li>
                </>
              ) : (
                <>
                  <li>- 서열 형식(FASTA)을 확인하세요</li>
                  <li>- 다른 마커로 시도해보세요</li>
                  <li>- 문제가 반복되면 페이지를 새로고침하세요</li>
                </>
              )}
            </ul>
          </div>
          <button
            onClick={() => handleReset(false)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            다시 시도 (서열 유지)
          </button>
        </div>
      )}
    </main>
  )
}
