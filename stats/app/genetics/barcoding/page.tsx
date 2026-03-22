'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/genetics/SequenceInput'
import { BlastRunner } from '@/components/genetics/BlastRunner'
import { ResultView } from '@/components/genetics/ResultView'
import { parseBlastHits, analyzeBlastResult } from '@/lib/genetics/decision-engine'
import type { DecisionResult } from '@/lib/genetics/decision-engine'

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link href="/genetics" className="mb-4 inline-block text-sm text-primary hover:underline">
          &larr; 유전적 분석
        </Link>
        <h1 className="mb-2 text-2xl font-bold">DNA 바코딩 종 판별</h1>
        <p className="text-sm text-muted-foreground">
          서열을 입력하면 종을 동정하고, 결과 해석과 다음 단계를 안내합니다.
        </p>
      </div>

      {state.step === 'input' && (
        <>
          <div className="mb-8 rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-400">사용 방법</h2>
            <ol className="space-y-2 text-sm text-blue-300/80">
              <li><span className="mr-2 font-bold text-blue-400">1.</span>마커를 선택하세요 (기본: COI — 동물 표준 바코드)</li>
              <li><span className="mr-2 font-bold text-blue-400">2.</span>FASTA 서열을 붙여넣거나 파일을 업로드하세요</li>
              <li><span className="mr-2 font-bold text-blue-400">3.</span>결과와 함께 <strong className="text-blue-300">해석, 대안 마커, 다음 단계</strong>를 안내합니다</li>
            </ol>
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
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
            <h2 className="mb-2 font-semibold text-destructive">분석 오류</h2>
            <p className="text-sm text-destructive/80">{state.message}</p>
          </div>
          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}
