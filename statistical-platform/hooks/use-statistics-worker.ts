/**
 * Statistics Worker Hook
 * Web Worker를 사용한 통계 계산을 위한 React Hook
 */

import { useState, useEffect, useCallback } from 'react'
import { workerManager, shouldUseWorker, WorkerProgress } from '@/lib/services/worker-manager'

interface UseStatisticsWorkerOptions {
  autoCalculate?: boolean
  onProgress?: (progress: WorkerProgress) => void
  onError?: (error: Error) => void
}

interface StatisticsResult {
  n: number
  mean: number
  median: number
  std: number
  variance: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  outliers: number[]
  outlierCount: number
}

/**
 * 기초 통계 계산 Hook
 */
export function useStatisticsWorker(
  data: number[] | null,
  options: UseStatisticsWorkerOptions = {}
) {
  const { autoCalculate = true, onProgress, onError } = options

  const [result, setResult] = useState<StatisticsResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const calculate = useCallback(async () => {
    if (!data || data.length === 0) {
      setResult(null)
      return
    }

    setIsCalculating(true)
    setProgress(0)
    setError(null)

    try {
      const validData = data.filter(v => !isNaN(v) && isFinite(v))

      if (shouldUseWorker(validData.length)) {
        // Worker 사용
        const result = await workerManager.calculateStatistics(
          validData,
          (prog) => {
            setProgress(prog.percentage)
            onProgress?.(prog)
          }
        )
        setResult(result)
      } else {
        // 동기 계산
        setResult(calculateStatisticsSync(validData))
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('통계 계산 실패')
      setError(error)
      onError?.(error)
    } finally {
      setIsCalculating(false)
      setProgress(100)
    }
  }, [data, onProgress, onError])

  useEffect(() => {
    if (autoCalculate && data) {
      calculate()
    }
  }, [data, autoCalculate, calculate])

  return {
    result,
    isCalculating,
    progress,
    error,
    recalculate: calculate
  }
}

/**
 * 상관계수 행렬 계산 Hook
 */
export function useCorrelationMatrix(
  data: Record<string, any>[] | null,
  columns: Array<{ name: string }> | null,
  options: UseStatisticsWorkerOptions = {}
) {
  const { autoCalculate = true, onProgress, onError } = options

  const [result, setResult] = useState<{ matrix: number[][], labels: string[] } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const calculate = useCallback(async () => {
    if (!data || !columns || columns.length < 2) {
      setResult(null)
      return
    }

    setIsCalculating(true)
    setProgress(0)
    setError(null)

    try {
      if (shouldUseWorker(data.length)) {
        const result = await workerManager.calculateCorrelationMatrix(
          data,
          columns,
          (prog) => {
            setProgress(prog.percentage)
            onProgress?.(prog)
          }
        )
        setResult(result)
      } else {
        // 동기 계산 (작은 데이터셋)
        setResult(calculateCorrelationSync(data, columns))
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('상관계수 계산 실패')
      setError(error)
      onError?.(error)
    } finally {
      setIsCalculating(false)
      setProgress(100)
    }
  }, [data, columns, onProgress, onError])

  useEffect(() => {
    if (autoCalculate && data && columns) {
      calculate()
    }
  }, [data, columns, autoCalculate, calculate])

  return {
    result,
    isCalculating,
    progress,
    error,
    recalculate: calculate
  }
}

/**
 * 히스토그램 데이터 계산 Hook
 */
export function useHistogramData(
  data: number[] | null,
  bins: number = 20,
  options: UseStatisticsWorkerOptions = {}
) {
  const { autoCalculate = true, onProgress, onError } = options

  const [result, setResult] = useState<{
    counts: number[]
    edges: number[]
    binWidth: number
  } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const calculate = useCallback(async () => {
    if (!data || data.length === 0) {
      setResult(null)
      return
    }

    setIsCalculating(true)
    setProgress(0)
    setError(null)

    try {
      const validData = data.filter(v => !isNaN(v) && isFinite(v))

      if (shouldUseWorker(validData.length)) {
        const result = await workerManager.calculateHistogram(
          validData,
          bins,
          (prog) => {
            setProgress(prog.percentage)
            onProgress?.(prog)
          }
        )
        setResult(result)
      } else {
        setResult(calculateHistogramSync(validData, bins))
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('히스토그램 계산 실패')
      setError(error)
      onError?.(error)
    } finally {
      setIsCalculating(false)
      setProgress(100)
    }
  }, [data, bins, onProgress, onError])

  useEffect(() => {
    if (autoCalculate && data) {
      calculate()
    }
  }, [data, bins, autoCalculate, calculate])

  return {
    result,
    isCalculating,
    progress,
    error,
    recalculate: calculate
  }
}

// 동기 계산 함수들 (작은 데이터셋용)
function calculateStatisticsSync(data: number[]): StatisticsResult {
  const n = data.length
  if (n === 0) throw new Error('데이터가 없습니다')

  const sorted = [...data].sort((a, b) => a - b)
  const mean = data.reduce((sum, val) => sum + val, 0) / n
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  const std = Math.sqrt(variance)

  const q1Index = Math.floor(n * 0.25)
  const q3Index = Math.floor(n * 0.75)
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]
  const iqr = q3 - q1

  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = data.filter(v => v < lowerBound || v > upperBound)

  return {
    n, mean, median, std, variance,
    min: sorted[0], max: sorted[n - 1],
    q1, q3, iqr, outliers,
    outlierCount: outliers.length
  }
}

function calculateCorrelationSync(
  data: Record<string, any>[],
  columns: Array<{ name: string }>
): { matrix: number[][], labels: string[] } {
  const labels = columns.map(c => c.name)
  const matrix: number[][] = []

  // 데이터 캐싱
  const columnData = new Map<string, number[]>()
  for (const col of columns) {
    const values = data
      .map(row => Number(row[col.name]))
      .filter(v => !isNaN(v) && isFinite(v))
    columnData.set(col.name, values)
  }

  // 상관계수 계산
  for (let i = 0; i < columns.length; i++) {
    const row: number[] = []
    const col1 = columnData.get(columns[i].name) || []

    for (let j = 0; j < columns.length; j++) {
      if (i === j) {
        row.push(1)
      } else if (j < i && matrix[j]) {
        row.push(matrix[j][i])
      } else {
        const col2 = columnData.get(columns[j].name) || []
        row.push(calculatePearsonCorrelation(col1, col2))
      }
    }
    matrix.push(row)
  }

  return { matrix, labels }
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    sumX += x[i]
    sumY += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateHistogramSync(data: number[], bins: number): {
  counts: number[]
  edges: number[]
  binWidth: number
} {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const binWidth = (max - min) / bins

  const counts = Array(bins).fill(0)
  const edges = []

  for (let i = 0; i <= bins; i++) {
    edges.push(min + i * binWidth)
  }

  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
    counts[binIndex]++
  })

  return { counts, edges, binWidth }
}