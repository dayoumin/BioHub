/**
 * Bio-Tools 공통 분석 훅
 *
 * CSV 업로드 → Pyodide 분석 → 결과 상태 관리를 한곳에서 처리.
 * 6개 ecology 도구 페이지의 70% 보일러플레이트를 제거.
 */

import { useCallback, useState } from 'react'
import { PyodideCoreService, type WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { CsvData } from '@/components/bio-tools/BioCsvUpload'

interface UseBioToolAnalysisOptions {
  worker?: PyodideWorker
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
  runAnalysis: (methodName: string, params: Record<string, WorkerMethodParam>) => Promise<void>
  /** pre-step이 필요한 분석 (beta_diversity → main analysis 등). isAnalyzing를 단일 소유. */
  runWithPreStep: (preStep: () => Promise<Record<string, WorkerMethodParam>>, methodName: string) => Promise<void>
}

export function useBioToolAnalysis<T>(
  options?: UseBioToolAnalysisOptions,
): UseBioToolAnalysisReturn<T> {
  const workerNum = options?.worker ?? PyodideWorker.Ecology
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [siteCol, setSiteCol] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDataLoaded = useCallback((data: CsvData) => {
    setCsvData(data)
    setSiteCol(data.headers[0])
    setResults(null)
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setCsvData(null)
    setSiteCol('')
    setResults(null)
    setError(null)
  }, [])

  const runAnalysis = useCallback(async (methodName: string, params: Record<string, WorkerMethodParam>) => {
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
    methodName: string,
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
  }
}
