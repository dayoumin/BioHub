'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { MultiSequenceInput } from '@/components/genetics/MultiSequenceInput'
import { SimilarityResult } from '@/components/genetics/SimilarityResult'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import type { SimilarityHistoryEntry } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type DistanceModel = 'K2P' | 'p-distance' | 'Jukes-Cantor'

export interface SimilarityResultData {
  distanceMatrix: number[][]
  labels: string[]
  model: DistanceModel
  sequenceCount: number
  alignmentLength: number
  minDistance: number
  maxDistance: number
  meanDistance: number
  saturatedPairCount: number
  dendrogram: {
    labels: string[]
    mergeMatrix: [number, number, number, number][]
  }
}

type AppState =
  | { step: 'input' }
  | { step: 'running' }
  | { step: 'result'; result: SimilarityResultData; analysisName: string }
  | { step: 'error'; message: string }

export default function SimilarityContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [rawText, setRawText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysisName, setAnalysisName] = useState('')
  const [distanceModel, setDistanceModel] = useState<DistanceModel>('K2P')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // History restoration
  useEffect(() => {
    const historyId = searchParams.get('history')
    if (!historyId) return

    let cancelled = false
    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return
      const all = loadGeneticsHistory('similarity')
      const entry = all.find(e => e.id === historyId) as SimilarityHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setAnalysisName(entry.analysisName)
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

      const result = await pyodideCore.callWorkerMethod<SimilarityResultData>(
        PyodideWorker.Genetics,
        'seq_similarity',
        { sequences: seqStrings, labels, model: distanceModel },
      )

      const now = new Date()
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const autoName = analysisName.trim()
        || (uploadedFileName
          ? `${uploadedFileName} · ${distanceModel} · ${dateStr}`
          : `유사도 ${result.sequenceCount}종 · ${distanceModel} · ${dateStr}`)

      setState({ step: 'result', result, analysisName: autoName })

      const saved = saveGeneticsHistory({
        type: 'similarity',
        analysisName: autoName,
        sequenceCount: result.sequenceCount,
        distanceModel,
        alignmentLength: result.alignmentLength,
        meanDistance: result.meanDistance,
        projectId: activeResearchProjectId ?? undefined,
      })
      if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setState({ step: 'error', message: msg })
    }
  }, [distanceModel, analysisName, uploadedFileName, activeResearchProjectId])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setRawText('')
    setUploadedFileName(null)
    setAnalysisName('')
  }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">다종 유사도 행렬</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          정렬된 다중 서열의 거리 행렬(K2P/JC/p-distance)과 UPGMA 덴드로그램을 생성합니다.
        </p>
      </div>

      {deepLinkError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50/50 p-6 dark:bg-amber-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{deepLinkError}</p>
          <Button variant="outline" onClick={() => { setDeepLinkError(null) }}>
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="analysisName" className="mb-1 block text-sm font-medium text-gray-700">
                분석명 <span className="font-normal text-gray-400">(선택)</span>
              </label>
              <input
                id="analysisName"
                type="text"
                value={analysisName}
                onChange={(e) => setAnalysisName(e.target.value)}
                placeholder="예: COI 10종 비교"
                maxLength={100}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
            </div>
            <div className="w-48">
              <label htmlFor="distanceModel" className="mb-1 block text-sm font-medium text-gray-700">
                거리 모델
              </label>
              <select
                id="distanceModel"
                value={distanceModel}
                onChange={(e) => setDistanceModel(e.target.value as DistanceModel)}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <p className="text-sm">거리 행렬 계산 중... (Pyodide + SciPy)</p>
        </div>
      )}

      {state.step === 'error' && (
        <div className="rounded-lg border border-red-500/30 bg-red-50/50 p-6 dark:bg-red-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-red-800 dark:text-red-300">분석 오류</h2>
          <p className="mb-4 text-sm text-red-700 dark:text-red-400">{state.message}</p>
          <Button variant="outline" onClick={handleReset}>
            다시 시도
          </Button>
        </div>
      )}

      {state.step === 'result' && (
        <SimilarityResult
          result={state.result}
          analysisName={state.analysisName}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
