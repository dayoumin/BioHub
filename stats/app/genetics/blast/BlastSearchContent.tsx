'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { GenericBlastParams, GenericBlastHit } from '@biohub/types'
import { BlastSearchInput } from '@/components/genetics/BlastSearchInput'
import type { BlastInitialValues } from '@/components/genetics/BlastSearchInput'
import { BlastSearchResult } from '@/components/genetics/BlastSearchResult'
import { BlastProgressUI } from '@/components/genetics/BlastProgressUI'
import {
  enrichGenericHits,
  mapToGenericHits,
  BLAST_STEP_LABELS,
} from '@/lib/genetics/blast-utils'
import { useBlastExecution } from '@/hooks/use-blast-execution'
import { saveGeneticsHistory, loadGeneticsHistory } from '@/lib/genetics/analysis-history'
import type { BlastSearchHistoryEntry } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { Button } from '@/components/ui/button'

// ── 타입 ──

type AppState =
  | { step: 'input' }
  | { step: 'running'; params: GenericBlastParams }
  | { step: 'result'; params: GenericBlastParams; hits: GenericBlastHit[]; elapsed: number }
  | { step: 'error'; message: string }

// ── Runner 컴포넌트 ──

interface RunnerProps {
  params: GenericBlastParams
  onResult: (hits: GenericBlastHit[], elapsed: number) => void
  onError: (message: string) => void
  onCancel: () => void
}

function GenericBlastRunner({ params, onResult, onError, onCancel }: RunnerProps): React.ReactElement {
  const payload = useMemo(() => ({
    sequence: params.sequence,
    program: params.program,
    database: params.database,
    expect: params.expect,
    hitlistSize: params.hitlistSize,
    megablast: params.megablast,
  }), [params.sequence, params.program, params.database, params.expect, params.hitlistSize, params.megablast])

  const transform = useCallback(async (
    rawHits: Array<Record<string, unknown>>,
    signal: AbortSignal,
  ): Promise<GenericBlastHit[]> => {
    const hits = mapToGenericHits(rawHits)
    await enrichGenericHits(hits, params.program, signal)
    return hits
  }, [params.program])

  const { phase, currentStep, elapsed, estimatedTime, errorMessage, cancel } =
    useBlastExecution<GenericBlastHit[]>({
      payload,
      transform,
      onComplete: onResult,
      onError,
      onCancel,
    })

  return (
    <BlastProgressUI
      phase={phase}
      currentStep={currentStep}
      elapsed={elapsed}
      estimatedTime={estimatedTime}
      stepLabels={BLAST_STEP_LABELS}
      errorMessage={errorMessage}
      onCancel={cancel}
    />
  )
}

// ── 메인 페이지 ──

export default function BlastSearchContent(): React.ReactElement {
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [restoredEntry, setRestoredEntry] = useState<BlastSearchHistoryEntry | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // 히스토리 복원
  useEffect(() => {
    const historyId = new URLSearchParams(window.location.search).get('history')
    if (!historyId) return
    const entry = loadGeneticsHistory('blast').find(e => e.id === historyId)
    if (entry?.type === 'blast') {
      setRestoredEntry(entry)
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  // 히스토리에서 복원 시 프로그램/DB/서열 프리필
  const initialValues = useMemo<BlastInitialValues | undefined>(() => {
    if (!restoredEntry) return undefined
    return {
      program: restoredEntry.program,
      database: restoredEntry.database,
      sequence: restoredEntry.sequence || undefined,
    }
  }, [restoredEntry])

  const handleSubmit = useCallback((params: GenericBlastParams) => {
    setRestoredEntry(null)
    setState({ step: 'running', params })
  }, [])

  const handleResult = useCallback((hits: GenericBlastHit[], elapsed: number) => {
    setState(prev => {
      if (prev.step !== 'running') return prev

      saveGeneticsHistory({
        type: 'blast',
        program: prev.params.program,
        database: prev.params.database,
        sequence: prev.params.sequence,
        sequencePreview: prev.params.sequence.slice(0, 50),
        hitCount: hits.length,
        topHitAccession: hits[0]?.accession ?? null,
        topHitSpecies: hits[0]?.species ?? null,
        topHitIdentity: hits[0]?.identity ?? null,
        elapsed,
        projectId: activeResearchProjectId ?? undefined,
      })

      return { step: 'result', params: prev.params, hits, elapsed }
    })
  }, [activeResearchProjectId])

  const handleError = useCallback((message: string) => {
    setState({ step: 'error', message })
  }, [])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
  }, [])

  return (
    <main>
      <div className="mb-6">
        <Link href="/genetics" className="mb-3 inline-block text-sm text-primary hover:underline">
          &larr; 유전적 분석
        </Link>
        <h1 className="text-2xl font-bold">BLAST 서열 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NCBI BLAST를 이용한 범용 서열 유사성 검색. 프로그램을 선택하고 서열을 입력하면 데이터베이스에서 가장 유사한 서열을 찾아줍니다.
        </p>
      </div>

      {state.step === 'input' && (
        <>
          {restoredEntry && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                이전 검색: <span className="font-medium">{restoredEntry.program} · {restoredEntry.database}</span>
                {' — '}
                {restoredEntry.hitCount} hits
                {restoredEntry.topHitSpecies && (
                  <> (top: <span className="italic">{restoredEntry.topHitSpecies}</span>
                  {restoredEntry.topHitIdentity != null && ` ${(restoredEntry.topHitIdentity * 100).toFixed(1)}%`})</>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {restoredEntry.sequence
                  ? '이전 검색 설정이 복원되었습니다. 바로 검색하거나 서열을 수정하세요.'
                  : '프로그램과 데이터베이스가 설정되었습니다. 서열을 입력하고 검색하세요.'}
              </p>
            </div>
          )}
          <BlastSearchInput onSubmit={handleSubmit} initialValues={initialValues} />
        </>
      )}

      {state.step === 'running' && (
        <GenericBlastRunner
          params={state.params}
          onResult={handleResult}
          onError={handleError}
          onCancel={handleReset}
        />
      )}

      {state.step === 'result' && (
        <BlastSearchResult
          hits={state.hits}
          program={state.params.program}
          database={state.params.database}
          elapsed={state.elapsed}
          onReset={handleReset}
        />
      )}

      {state.step === 'error' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
            <h2 className="mb-2 font-semibold text-destructive">검색 오류</h2>
            <p className="text-sm text-destructive/80">{state.message}</p>
          </div>
          <Button variant="outline" className="w-full" onClick={handleReset}>
            다시 시도
          </Button>
        </div>
      )}
    </main>
  )
}
