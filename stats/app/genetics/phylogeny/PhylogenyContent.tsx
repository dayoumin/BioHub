'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { MultiSequenceInput } from '@/components/genetics/MultiSequenceInput'
import { PhylogenyResult } from '@/components/genetics/PhylogenyResult'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import type { PhylogenyHistoryEntry } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIOLOGY_CALLOUT_ERROR, BIOLOGY_CALLOUT_WARNING, BIOLOGY_INPUT } from '@/lib/design-tokens/biology'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type PhylogenyMethod = 'NJ' | 'UPGMA'
export type DistanceModel = 'K2P' | 'p-distance' | 'Jukes-Cantor'

export interface PhylogenyResultData {
  newick: string
  method: PhylogenyMethod
  distanceModel: DistanceModel
  sequenceCount: number
  alignmentLength: number
}

type AppState =
  | { step: 'input' }
  | { step: 'running' }
  | { step: 'result'; result: PhylogenyResultData; analysisName: string }
  | { step: 'error'; message: string }

export default function PhylogenyContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [rawText, setRawText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysisName, setAnalysisName] = useState('')
  const [method, setMethod] = useState<PhylogenyMethod>('NJ')
  const [distanceModel, setDistanceModel] = useState<DistanceModel>('K2P')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  useEffect(() => {
    const historyId = searchParams.get('history')
    if (!historyId) return

    let cancelled = false
    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return
      const all = loadGeneticsHistory('phylogeny')
      const entry = all.find(e => e.id === historyId) as PhylogenyHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setAnalysisName(entry.analysisName)
        setMethod(entry.treeMethod)
        setDistanceModel(entry.distanceModel)
        setState({ step: 'input' })
        toast.info(`${entry.analysisName} 기록을 불러왔습니다. 서열을 다시 입력하여 분석하세요.`)
      } else {
        setDeepLinkError('요청한 분석 기록을 찾을 수 없습니다.')
      }
    })
    return () => { cancelled = true }
  }, [searchParams])

  const handleSubmit = useCallback(async (sequences: ParsedSequence[]) => {
    setState({ step: 'running' })

    try {
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const seqStrings = sequences.map(s => s.sequence)
      const labels = sequences.map(s => s.label)

      const result = await pyodideCore.callWorkerMethod<PhylogenyResultData>(
        PyodideWorker.Genetics,
        'build_phylogeny',
        { sequences: seqStrings, labels, method, distanceModel },
      )

      const now = new Date()
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const autoName = analysisName.trim()
        || (uploadedFileName
          ? `${uploadedFileName} · ${method} · ${dateStr}`
          : `계통수 ${result.sequenceCount}종 · ${method} · ${dateStr}`)

      setState({ step: 'result', result, analysisName: autoName })

      const saved = saveGeneticsHistory({
        type: 'phylogeny',
        analysisName: autoName,
        sequenceCount: result.sequenceCount,
        treeMethod: method,
        distanceModel,
        alignmentLength: result.alignmentLength,
        projectId: activeResearchProjectId ?? undefined,
      })
      if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setState({ step: 'error', message: msg })
    }
  }, [method, distanceModel, analysisName, uploadedFileName, activeResearchProjectId])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setRawText('')
    setUploadedFileName(null)
    setAnalysisName('')
  }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">계통수 시각화</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          정렬된 다중 서열에서 NJ 또는 UPGMA 계통수를 생성하고 Newick 형식으로 내보냅니다.
        </p>
      </div>

      {deepLinkError && (
        <div className={`mb-6 ${BIOLOGY_CALLOUT_WARNING}`} role="alert">
          <h2 className="mb-2 font-semibold text-warning">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-warning-muted">{deepLinkError}</p>
          <Button variant="outline" onClick={() => { setDeepLinkError(null) }}>새 분석 시작</Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="analysisName" className="mb-1 block text-sm font-medium text-foreground">
                분석명 <span className="font-normal text-muted-foreground">(선택)</span>
              </label>
              <input
                id="analysisName"
                type="text"
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
                placeholder="예: COI 10종 계통수"
                maxLength={100}
                className={BIOLOGY_INPUT}
              />
            </div>
            <div className="w-36">
              <label htmlFor="method" className="mb-1 block text-sm font-medium text-foreground">
                트리 방법
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PhylogenyMethod)}
                className={BIOLOGY_INPUT}
              >
                <option value="NJ">Neighbor-Joining</option>
                <option value="UPGMA">UPGMA</option>
              </select>
            </div>
            <div className="w-48">
              <label htmlFor="distanceModel" className="mb-1 block text-sm font-medium text-foreground">
                거리 모델
              </label>
              <select
                id="distanceModel"
                value={distanceModel}
                onChange={(e) => setDistanceModel(e.target.value as DistanceModel)}
                className={BIOLOGY_INPUT}
              >
                <option value="K2P">Kimura 2-Parameter</option>
                <option value="p-distance">p-distance</option>
                <option value="Jukes-Cantor">Jukes-Cantor</option>
              </select>
            </div>
          </div>

          <MultiSequenceInput
            value={rawText}
            onChange={setRawText}
            minSequences={3}
            uploadedFileName={uploadedFileName}
            onUploadedFileNameChange={setUploadedFileName}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {state.step === 'running' && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">계통수 생성 중... ({method} + {distanceModel})</p>
        </div>
      )}

      {state.step === 'error' && (
        <div className={BIOLOGY_CALLOUT_ERROR} role="alert">
          <h2 className="mb-2 font-semibold text-error">분석 오류</h2>
          <p className="mb-4 text-sm text-error/80">{state.message}</p>
          <Button variant="outline" onClick={handleReset}>다시 시도</Button>
        </div>
      )}

      {state.step === 'result' && (
        <PhylogenyResult
          result={state.result}
          analysisName={state.analysisName}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
