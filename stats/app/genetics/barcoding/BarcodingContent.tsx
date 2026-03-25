'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { BlastMarker, SequenceValidation } from '@biohub/types'
import { SequenceInput } from '@/components/genetics/SequenceInput'
import { BlastRunner } from '@/components/genetics/BlastRunner'
import type { BlastErrorCode } from '@/components/genetics/BlastRunner'
import { ResultView } from '@/components/genetics/ResultView'
import { parseBlastHits, analyzeBlastResult } from '@/lib/genetics/decision-engine'
import type { DecisionResult } from '@/lib/genetics/decision-engine'
import { getExampleById } from '@/lib/genetics/example-sequences'
import { saveAnalysisHistory, loadAnalysisHistory } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { Button } from '@/components/ui/button'

type AppState =
  | { step: 'input' }
  | { step: 'analyzing'; sequence: string; marker: BlastMarker }
  | { step: 'result'; marker: BlastMarker; decision: DecisionResult; analyzedSequence: string }
  | { step: 'error'; message: string; code: BlastErrorCode }

export default function BarcodingContent(): React.ReactElement {
  const [marker, setMarker] = useState<BlastMarker>('COI')
  const [sequence, setSequence] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // 히스토리 결과 복원
    const historyId = params.get('history')
    if (historyId) {
      const entry = loadAnalysisHistory().find(e => e.id === historyId)
      if (entry?.resultData) {
        setMarker(entry.marker)
        setState({ step: 'result', marker: entry.marker, decision: entry.resultData, analyzedSequence: '' })
        return
      }
      // entry가 없거나 resultData가 없는 경우 — 사용자에게 피드백
      setDeepLinkError(
        entry
          ? '이 분석 기록의 결과 데이터가 손실되었습니다. 새로 분석을 실행해 주세요.'
          : '요청한 분석 기록을 찾을 수 없습니다. 삭제되었거나 다른 브라우저의 기록일 수 있습니다.'
      )
      // URL에서 history 파라미터 제거 (뒤로가기 시 재트리거 방지)
      const cleaned = new URLSearchParams(params)
      cleaned.delete('history')
      const qs = cleaned.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
      return
    }

    // 예제 쿼리 파라미터 처리
    const exampleId = params.get('example')
    if (exampleId) {
      const example = getExampleById(exampleId)
      if (example) {
        setSequence(example.sequence)
        setMarker(example.marker)
      }
    }
  }, [])

  const handleAnalyze = useCallback((_validation: SequenceValidation) => {
    setState({ step: 'analyzing', sequence, marker })
  }, [sequence, marker])

  const handleResult = useCallback((data: unknown) => {
    const topHits = parseBlastHits(data)
    const decision = analyzeBlastResult(topHits, marker)

    setState(prev => {
      if (prev.step !== 'analyzing') return prev
      return { step: 'result', marker: prev.marker, decision, analyzedSequence: prev.sequence }
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
      resultData: decision,
      projectId: activeResearchProjectId ?? undefined,
    })
  }, [marker, sequence, sampleName, uploadedFileName, activeResearchProjectId])

  const handleError = useCallback((msg: string, code: BlastErrorCode) => {
    setState({ step: 'error', message: msg, code })
  }, [])

  const handleReset = useCallback((clearSequence = true) => {
    setState({ step: 'input' })
    if (clearSequence) {
      setSequence('')
      setUploadedFileName(null)
    }
  }, [])

  return (
    <main>
      <div className="mb-6">
        <Link href="/genetics" className="mb-3 inline-block text-sm text-primary hover:underline">
          &larr; 유전적 분석
        </Link>
        <h1 className="text-2xl font-bold">DNA 바코딩 종 판별</h1>
      </div>

      {deepLinkError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50/50 p-6 dark:bg-amber-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">분석 기록 복원 실패</h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{deepLinkError}</p>
          <Button
            variant="outline"
            onClick={() => setDeepLinkError(null)}
          >
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <>
          <SequenceInput
            sequence={sequence}
            onSequenceChange={setSequence}
            marker={marker}
            onMarkerChange={setMarker}
            sampleName={sampleName}
            onSampleNameChange={setSampleName}
            uploadedFileName={uploadedFileName}
            onUploadedFileNameChange={setUploadedFileName}
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
          sequence={state.analyzedSequence}
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
              {state.code === 'network' ? (
                <>
                  <li>- 인터넷 연결을 확인하세요</li>
                  <li>- 잠시 후 다시 시도하세요 (NCBI 서버 점검일 수 있습니다)</li>
                </>
              ) : state.code === 'timeout' ? (
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
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleReset(false)}
          >
            다시 시도 (서열 유지)
          </Button>
        </div>
      )}
    </main>
  )
}
