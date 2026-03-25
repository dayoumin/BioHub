/**
 * Bio-Tools 공통 분석 훅
 *
 * CSV 업로드 → Pyodide 분석 → 결과 상태 관리를 한곳에서 처리.
 * 6개 ecology 도구 페이지의 70% 보일러플레이트를 제거.
 */

import { useCallback, useRef, useState } from 'react'
import { PyodideCoreService, type WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { AllMethodNames } from '@/lib/constants/methods-registry.types'
import type { CsvData } from '@/components/bio-tools/BioCsvUpload'
import { saveBioToolEntry } from '@/lib/bio-tools/bio-tool-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'

const selectActiveProject = (s: ReturnType<typeof useResearchProjectStore.getState>) =>
  s.projects.find(p => p.id === s.activeResearchProjectId && p.status === 'active') ?? null
import { toast } from 'sonner'

interface UseBioToolAnalysisOptions {
  worker?: PyodideWorker
  /** 히스토리에서 복원할 초기 결과 (복원 모드) */
  initialResults?: unknown
}

interface UseBioToolAnalysisReturn<T> {
  csvData: CsvData | null
  siteCol: string
  setSiteCol: (col: string) => void
  isAnalyzing: boolean
  results: T | null
  error: string | null
  handleDataLoaded: (data: CsvData) => void
  handleClear: () => void
  setError: (error: string | null) => void
  runAnalysis: (methodName: AllMethodNames, params: Record<string, WorkerMethodParam>) => Promise<void>
  runWithPreStep: (preStep: () => Promise<Record<string, WorkerMethodParam>>, methodName: AllMethodNames) => Promise<void>
  /** 현재 분석을 히스토리에 저장 */
  saveToHistory: (meta: { toolId: string; toolNameEn: string; toolNameKo: string; columnConfig: Record<string, string> }) => void
  /** 이미 저장되었는지 여부 */
  isSaved: boolean
}

export function useBioToolAnalysis<T>(
  options?: UseBioToolAnalysisOptions,
): UseBioToolAnalysisReturn<T> {
  const workerNum = options?.worker ?? PyodideWorker.Ecology
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [siteCol, setSiteCol] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<T | null>((options?.initialResults as T) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(!!options?.initialResults)
  const hasSavedRef = useRef(!!options?.initialResults)
  // activeProject는 saveToHistory 내에서 getState()로 읽음 (구독 없음)

  const handleDataLoaded = useCallback((data: CsvData) => {
    setCsvData(data)
    setSiteCol(data.headers[0])
    setResults(null)
    setError(null)
    setIsSaved(false)
    hasSavedRef.current = false
  }, [])

  const handleClear = useCallback(() => {
    setCsvData(null)
    setSiteCol('')
    setResults(null)
    setError(null)
    setIsSaved(false)
    hasSavedRef.current = false
  }, [])

  const runAnalysis = useCallback(async (methodName: AllMethodNames, params: Record<string, WorkerMethodParam>) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const pyodide = PyodideCoreService.getInstance()
      const result = await pyodide.callWorkerMethod<T>(
        workerNum,
        methodName,
        params,
      )
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }, [workerNum])

  const runWithPreStep = useCallback(async (
    preStep: () => Promise<Record<string, WorkerMethodParam>>,
    methodName: AllMethodNames,
  ) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const params = await preStep()
      const pyodide = PyodideCoreService.getInstance()
      const result = await pyodide.callWorkerMethod<T>(
        workerNum,
        methodName,
        params,
      )
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }, [workerNum])

  const saveToHistory = useCallback((meta: {
    toolId: string
    toolNameEn: string
    toolNameKo: string
    columnConfig: Record<string, string>
  }) => {
    if (!results || !csvData || hasSavedRef.current) return
    hasSavedRef.current = true

    const activeProject = selectActiveProject(useResearchProjectStore.getState())

    try {
      saveBioToolEntry({
        toolId: meta.toolId,
        toolNameEn: meta.toolNameEn,
        toolNameKo: meta.toolNameKo,
        csvFileName: csvData.fileName,
        columnConfig: meta.columnConfig,
        results,
        projectId: activeProject?.id,
      })

      setIsSaved(true)
      toast.success(activeProject ? `${activeProject.name}에 저장됨` : '히스토리에 저장됨')
    } catch (err) {
      hasSavedRef.current = false
      if (err instanceof Error && err.message === 'QUOTA_EXCEEDED') {
        toast.error('저장 공간이 부족합니다. 오래된 히스토리를 삭제해주세요.')
      } else {
        toast.error('저장에 실패했습니다')
      }
    }
  }, [results, csvData])

  return {
    csvData,
    siteCol,
    setSiteCol,
    isAnalyzing,
    results,
    error,
    handleDataLoaded,
    handleClear,
    setError,
    runAnalysis,
    runWithPreStep,
    saveToHistory,
    isSaved,
  }
}
