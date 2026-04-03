// stats/app/genetics/seq-stats/SeqStatsContent.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { computeSeqStats, type SeqStatsResult } from '@/lib/genetics/seq-stats-engine'
import { MultiSequenceInput } from '@/components/genetics/MultiSequenceInput'
import { SeqStatsResultView } from '@/components/genetics/SeqStatsResult'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import type { SeqStatsHistoryEntry } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type AppState =
  | { step: 'input' }
  | { step: 'result'; result: SeqStatsResult; analysisName: string }

export default function SeqStatsContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [rawText, setRawText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysisName, setAnalysisName] = useState('')
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
      const all = loadGeneticsHistory('seq-stats')
      const entry = all.find(e => e.id === historyId) as SeqStatsHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setAnalysisName(entry.analysisName)
        setState({ step: 'input' })
        toast.info(`${entry.analysisName} 기록을 불러왔습니다. 서열을 다시 입력하여 분석하세요.`)
      } else {
        setDeepLinkError('요청한 분석 기록을 찾을 수 없습니다.')
      }
    })
    return () => { cancelled = true }
  }, [searchParams])

  const handleSubmit = useCallback((sequences: ParsedSequence[]) => {
    const result = computeSeqStats(sequences)

    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const autoName = analysisName.trim()
      || (uploadedFileName
        ? `${uploadedFileName} · ${dateStr}`
        : `서열 통계 · ${result.sequenceCount}개 · ${dateStr}`)

    setState({ step: 'result', result, analysisName: autoName })

    // Save to history
    const saved = saveGeneticsHistory({
      type: 'seq-stats',
      analysisName: autoName,
      sequenceCount: result.sequenceCount,
      meanLength: Math.round(result.meanLength),
      overallGcContent: result.overallGcContent,
      projectId: activeResearchProjectId ?? undefined,
    })
    if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
  }, [analysisName, uploadedFileName, activeResearchProjectId])

  const handleDismissError = useCallback(() => { setDeepLinkError(null) }, [])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setRawText('')
    setUploadedFileName(null)
    setAnalysisName('')
  }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">서열 기본 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          다중 서열의 GC 함량, 염기 조성, 길이 분포, 디뉴클레오티드 빈도를 분석합니다.
        </p>
      </div>

      {deepLinkError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50/50 p-6 dark:bg-amber-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{deepLinkError}</p>
          <Button variant="outline" onClick={handleDismissError}>
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="analysisName" className="mb-1 block text-sm font-medium text-gray-700">
              분석명 <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <input
              id="analysisName"
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder="예: COI 10종 비교, 채집 시료 배치 #1"
              maxLength={100}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
            />
          </div>

          <MultiSequenceInput
            value={rawText}
            onChange={setRawText}
            minSequences={2}
            uploadedFileName={uploadedFileName}
            onUploadedFileNameChange={setUploadedFileName}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {state.step === 'result' && (
        <SeqStatsResultView
          result={state.result}
          analysisName={state.analysisName}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
