'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/genetics/SequenceInput'
import { BlastRunner } from '@/components/genetics/BlastRunner'
import { ResultView } from '@/components/genetics/ResultView'
import { parseBlastHits, analyzeBlastResult } from '@/lib/genetics/decision-engine'
import type { DecisionResult } from '@/lib/genetics/decision-engine'
import { getExampleById } from '@/lib/genetics/example-sequences'
import { saveAnalysisHistory } from '@/lib/genetics/analysis-history'

type AppState =
  | { step: 'input' }
  | { step: 'analyzing'; sequence: string; marker: BlastMarker }
  | { step: 'result'; marker: BlastMarker; decision: DecisionResult }
  | { step: 'error'; message: string }

export default function BarcodingPage() {
  return (
    <Suspense fallback={null}>
      <BarcodingContent />
    </Suspense>
  )
}

function BarcodingContent() {
  const searchParams = useSearchParams()
  const [marker, setMarker] = useState<BlastMarker>('COI')
  const [sequence, setSequence] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [state, setState] = useState<AppState>({ step: 'input' })

  // 예제 쿼리 파라미터 처리
  useEffect(() => {
    const exampleId = searchParams.get('example')
    if (!exampleId) return

    const example = getExampleById(exampleId)
    if (example) {
      setSequence(example.sequence)
      setMarker(example.marker)
    }
  }, [searchParams])

  const handleAnalyze = useCallback((_validation: SequenceValidation) => {
    setState({ step: 'analyzing', sequence, marker })
  }, [sequence, marker])

  const handleResult = useCallback((data: unknown) => {
    const topHits = parseBlastHits(data)
    const decision = analyzeBlastResult(topHits, marker)

    setState(prev => {
      if (prev.step !== 'analyzing') return prev
      return { step: 'result', marker: prev.marker, decision }
    })

    // 시료명 자동 생성: 비어 있으면 "마커 + (파일명) + 날짜"
    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const autoName = sampleName.trim()
      || (uploadedFileName
        ? `${marker} · ${uploadedFileName} · ${dateStr}`
        : `${marker} 바코딩 · ${dateStr}`)

    saveAnalysisHistory({
      sampleName: autoName,
      marker,
      sequencePreview: sequence.slice(0, 50),
      topSpecies: decision.topHits[0]?.species ?? null,
      topIdentity: decision.topHits[0]?.identity ?? null,
      status: decision.status,
    })
  }, [marker, sequence, sampleName, uploadedFileName])

  const handleError = useCallback((msg: string) => {
    setState({ step: 'error', message: msg })
  }, [])

  const handleReset = useCallback((clearSequence = true) => {
    setState({ step: 'input' })
    if (clearSequence) setSequence('')
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-900">사용 방법</h2>
            <ol className="space-y-2 text-sm text-blue-800">
              <li><span className="mr-2 font-bold text-blue-600">1.</span>마커를 선택하세요 (기본: COI — 동물 표준 바코드)</li>
              <li><span className="mr-2 font-bold text-blue-600">2.</span>FASTA 서열을 붙여넣거나 파일을 업로드하세요</li>
              <li><span className="mr-2 font-bold text-blue-600">3.</span>결과와 함께 <strong className="text-blue-900">해석, 대안 마커, 다음 단계</strong>를 안내합니다</li>
            </ol>
          </div>

          <div className="mt-4 rounded bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>COI로 잘 안 되는 분류군이 있나요?</strong> 참치류, 양서류, 이매패류 등은 COI만으로 종 구분이
            어렵습니다. 분석 결과에서 자동으로 대안 마커를 추천합니다.
          </div>

          <SequenceInput
            sequence={sequence}
            onSequenceChange={setSequence}
            marker={marker}
            onMarkerChange={setMarker}
            sampleName={sampleName}
            onSampleNameChange={setSampleName}
            onFileNameChange={setUploadedFileName}
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
        />
      )}

      {state.step === 'error' && (
        <div className="space-y-4" role="alert">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
            <h2 className="mb-2 font-semibold text-destructive">분석 오류</h2>
            <p className="text-sm text-destructive/80">{state.message}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">해결 방법</h3>
            <ul className="space-y-1 text-xs text-muted-foreground/80">
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
            className="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            다시 시도 (서열 유지)
          </button>
        </div>
      )}
    </main>
  )
}
