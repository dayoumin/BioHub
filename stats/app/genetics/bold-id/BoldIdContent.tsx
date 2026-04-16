'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  BoldDatabase,
  BoldSearchMode,
  BoldIdResult,
} from '@biohub/types'
import { BOLD_DB_LABELS, BOLD_SEARCH_PRESETS } from '@biohub/types'
import { SequenceInput } from '@/components/genetics/SequenceInput'
import { BoldRunner } from '@/components/genetics/BoldRunner'
import type { BoldErrorCode } from '@/components/genetics/BoldRunner'
import { BoldResultView } from '@/components/genetics/BoldResultView'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import { BIOLOGY_CALLOUT_ERROR, BIOLOGY_CALLOUT_WARNING, BIOLOGY_INPUT, BIOLOGY_PANEL_SOFT } from '@/lib/design-tokens/biology'
import type { BoldHistoryEntry } from '@/lib/genetics/analysis-history'
import { consumeTransferredSequence, formatTransferSource } from '@/lib/genetics/sequence-transfer'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type AppState =
  | { step: 'input' }
  | { step: 'analyzing'; sequence: string; db: BoldDatabase; searchMode: BoldSearchMode }
  | { step: 'result'; result: BoldIdResult; sequence: string; sampleName: string }
  | { step: 'error'; message: string; code: BoldErrorCode }

const BOLD_DB_HELP: Record<BoldDatabase, string> = {
  'all.tax-derep': '공개와 비공개 동물 레퍼런스를 함께 비교할 때 사용합니다.',
  'species': '종 수준으로 정리된 동물 레퍼런스를 빠르게 확인할 때 적합합니다.',
  'all.animal-alt': '보조 마커를 포함한 동물 데이터셋을 넓게 탐색할 때 유용합니다.',
  'public.tax-derep': '공개 레퍼런스를 분류 기준으로 정리한 기본 선택지입니다.',
  'public.plants': '식물 바코드 시료를 식물 공개 라이브러리 기준으로 비교합니다.',
  'public.fungi': 'ITS 같은 진균 바코드 시료를 진균 공개 라이브러리로 비교합니다.',
  'DS-CANREF22': '검증된 캐나다 절지동물 세트로 종 판별을 보수적으로 확인합니다.',
  'DS-IUCNPUB': '검증된 적색목록 동물 세트로 보전 대상 분류군을 확인할 때 적합합니다.',
}

const BOLD_SEARCH_MODE_HELP: Record<BoldSearchMode, string> = {
  rapid: '빠른 1차 동정용입니다. 일반적인 바코딩 확인은 이 모드로 충분합니다.',
  'genus-species': '속과 종 수준 후보를 함께 비교할 때 적합합니다. 빠르기와 범위의 균형형입니다.',
  exhaustive: '가능한 후보를 넓게 훑어야 할 때 사용합니다. 가장 오래 걸립니다.',
}

export default function BoldIdContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [sequence, setSequence] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [db, setDb] = useState<BoldDatabase>('public.tax-derep')
  const [searchMode, setSearchMode] = useState<BoldSearchMode>('rapid')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // 히스토리 복원
  useEffect(() => {
    let cancelled = false
    const historyId = searchParams.get('history')
    if (!historyId) return

    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return
      const entry = loadGeneticsHistory('bold').find(e => e.id === historyId) as BoldHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setSampleName(entry.sampleName)
        if (entry.sequence) setSequence(entry.sequence)
        setDb(entry.db)
        setSearchMode(entry.searchMode)
        setState({ step: 'input' })
        toast.info(entry.sequence
          ? '히스토리에서 입력을 복원했습니다. 바로 재실행할 수 있습니다.'
          : '히스토리에서 시료 정보를 복원했습니다. 서열을 다시 입력해 주세요.')
      } else {
        setState({ step: 'input' })
        setDeepLinkError('요청한 분석 기록을 찾을 수 없습니다.')
      }
    })

    return () => { cancelled = true }
  }, [searchParams])

  // 서열 전달 수신 — history 복원과 충돌 방지
  useEffect(() => {
    if (searchParams.get('history')) return
    const transferred = consumeTransferredSequence()
    if (transferred) {
      setSequence(transferred.sequence)
      setState({ step: 'input' })
      toast.info(`${formatTransferSource(transferred.source)}에서 서열이 전달되었습니다.`)
    }
  }, [searchParams])

  const handleAnalyze = useCallback((_validation?: unknown) => {
    setState({ step: 'analyzing', sequence, db, searchMode })
  }, [sequence, db, searchMode])

  const handleResult = useCallback((result: BoldIdResult) => {
    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const autoName = sampleName.trim()
      || (uploadedFileName
        ? `BOLD · ${uploadedFileName} · ${dateStr}`
        : `BOLD 종 동정 · ${dateStr}`)

    setState({ step: 'result', result, sequence, sampleName: autoName })

    const topHit = result.hits[0]
    const saved = saveGeneticsHistory({
      type: 'bold',
      sampleName: autoName,
      db: result.db,
      searchMode: result.searchMode,
      sequencePreview: sequence.slice(0, 50),
      sequence,
      topSpecies: result.classification.taxon || topHit?.taxonomy.species || null,
      topSimilarity: topHit?.similarity ?? null,
      topBin: topHit?.bin ?? null,
      hitCount: result.hits.length,
      projectId: activeResearchProjectId ?? undefined,
    })
    if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
  }, [sampleName, uploadedFileName, sequence, activeResearchProjectId])

  const handleError = useCallback((msg: string, code: BoldErrorCode) => {
    setState({ step: 'error', message: msg, code })
  }, [])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
  }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">BOLD ID 종 동정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          BOLD Systems 참조 라이브러리 기반 종 동정. DNA 바코드 서열로 종, 속, 과 수준 분류 판정 + BIN 매핑을 수행합니다.
        </p>
      </div>

      {deepLinkError && (
        <div className={`mb-6 ${BIOLOGY_CALLOUT_WARNING}`} role="alert">
          <h2 className="mb-2 font-semibold text-warning">분석 기록 복원 실패</h2>
          <p className="mb-4 text-sm text-warning-muted">{deepLinkError}</p>
          <Button variant="outline" onClick={() => { setDeepLinkError(null); setState({ step: 'input' }) }}>
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          {/* DB + 검색 모드 선택 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                참조 라이브러리
              </label>
              <select
                value={db}
                onChange={(e) => setDb(e.target.value as BoldDatabase)}
                className={BIOLOGY_INPUT}
              >
                {Object.entries(BOLD_DB_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground/75">
                {BOLD_DB_HELP[db]}
              </p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                검색 모드
              </label>
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as BoldSearchMode)}
                className={BIOLOGY_INPUT}
              >
                {Object.entries(BOLD_SEARCH_PRESETS).map(([value, preset]) => (
                  <option key={value} value={value}>
                    {preset.label} — {preset.description}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground/75">
                {BOLD_SEARCH_MODE_HELP[searchMode]}
              </p>
            </div>
          </div>

          <SequenceInput
            sequence={sequence}
            onSequenceChange={setSequence}
            marker="COI"
            onMarkerChange={() => {/* BOLD는 마커 선택 불필요 */}}
            sampleName={sampleName}
            onSampleNameChange={setSampleName}
            uploadedFileName={uploadedFileName}
            onUploadedFileNameChange={setUploadedFileName}
            onSubmit={handleAnalyze}
            submitLabel="BOLD 종 동정 시작"
            hideMarkerSelector
          />
        </div>
      )}

      {state.step === 'analyzing' && (
        <BoldRunner
          sequence={state.sequence}
          db={state.db}
          searchMode={state.searchMode}
          onResult={handleResult}
          onError={handleError}
          onCancel={handleReset}
        />
      )}

      {state.step === 'result' && (
        <BoldResultView
          hits={state.result.hits}
          classification={state.result.classification}
          db={state.result.db}
          searchMode={state.result.searchMode}
          sequence={state.sequence}
          sampleName={state.sampleName}
          onReset={handleReset}
        />
      )}

      {state.step === 'error' && (
        <div className="space-y-4" role="alert">
          <div className={BIOLOGY_CALLOUT_ERROR}>
            <h2 className="mb-2 font-semibold text-destructive">분석 오류</h2>
            <p className="text-sm text-destructive/80">{state.message}</p>
          </div>
          <div className={`${BIOLOGY_PANEL_SOFT} p-4`}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">해결 방법</h3>
            <ul className="space-y-1 text-xs text-muted-foreground/80">
              {state.code === 'network' ? (
                <>
                  <li>- 인터넷 연결을 확인하세요</li>
                  <li>- BOLD 서버가 점검 중일 수 있습니다. 잠시 후 다시 시도하세요</li>
                </>
              ) : state.code === 'timeout' ? (
                <>
                  <li>- BOLD 서버가 혼잡합니다. 몇 분 후 다시 시도하세요</li>
                  <li>- Rapid 모드로 전환하면 더 빠릅니다</li>
                </>
              ) : (
                <>
                  <li>- 서열 형식(FASTA)을 확인하세요</li>
                  <li>- 다른 참조 라이브러리를 시도해보세요</li>
                </>
              )}
            </ul>
          </div>
          <Button variant="outline" className="w-full" onClick={handleReset}>
            다시 시도 (서열 유지)
          </Button>
        </div>
      )}
    </main>
  )
}
