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
    setState(prev => {
      if (prev.step !== 'analyzing') return prev

      const topHits = parseBlastHits(data)
      const decision = analyzeBlastResult(topHits, prev.marker)

      return { step: 'result', marker: prev.marker, decision }
    })
  }, [])

  const handleError = useCallback((msg: string) => {
    setState({ step: 'error', message: msg })
  }, [])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setSequence('')
  }, [])

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
      )}

      {/* 단계별 UI */}
      {state.step === 'input' && (
        <SequenceInput
          sequence={sequence}
          onSequenceChange={setSequence}
          marker={marker}
          onMarkerChange={setMarker}
          onSubmit={handleAnalyze}
        />
      )}

      {state.step === 'analyzing' && (
        <BlastRunner
          sequence={state.sequence}
          marker={state.marker}
          onResult={handleResult}
          onError={handleError}
        />
      )}

      {state.step === 'result' && (
        <ResultView
          decision={state.decision}
          marker={state.marker}
          onReset={handleReset}
        />
      )}

      {state.step === 'error' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="mb-2 font-semibold text-red-800">분석 오류</h2>
            <p className="text-sm text-red-700">{state.message}</p>
          </div>
          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            다시 시도
          </button>
        </div>
      )}
    </main>
  )
}
