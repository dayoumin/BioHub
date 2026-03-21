'use client'

import { useMemo, useCallback } from 'react'
import type { DataRow } from '@/types/analysis'
import { calculateCorrelation, type CorrelationPair } from '@/components/analysis/steps/exploration/correlation-utils'

interface UseCorrelationDataReturn {
  getPairedData: (var1: string, var2: string) => { x: number[]; y: number[] }
  correlationMatrix: CorrelationPair[]
  heatmapMatrix: number[][]
}

/**
 * 상관분석 데이터 계산 훅 — 상관계수 행렬, 히트맵, 산점도 데이터
 */
export function useCorrelationData(
  data: DataRow[],
  numericVariables: string[]
): UseCorrelationDataReturn {
  // Row-wise pairwise deletion: X와 Y 모두 valid한 행만 유지
  const getPairedData = useCallback((var1: string, var2: string): { x: number[]; y: number[] } => {
    const x: number[] = []
    const y: number[] = []

    for (const row of data) {
      const v1 = row[var1]
      const v2 = row[var2]
      if (v1 === null || v1 === undefined || v1 === '' || v2 === null || v2 === undefined || v2 === '') continue
      const n1 = Number(v1)
      const n2 = Number(v2)
      if (isNaN(n1) || isNaN(n2)) continue
      x.push(n1)
      y.push(n2)
    }

    return { x, y }
  }, [data])

  // strength/color는 ScatterHeatmapSection에서 처리
  const correlationMatrix = useMemo((): CorrelationPair[] => {
    if (numericVariables.length < 2) return []

    const matrix: CorrelationPair[] = []

    for (let i = 0; i < numericVariables.length; i++) {
      for (let j = i + 1; j < numericVariables.length; j++) {
        const var1 = numericVariables[i]
        const var2 = numericVariables[j]
        const { x: data1, y: data2 } = getPairedData(var1, var2)
        const { r, r2 } = calculateCorrelation(data1, data2)
        matrix.push({ var1, var2, r, r2 })
      }
    }

    return matrix.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  }, [numericVariables, getPairedData])

  const heatmapMatrix = useMemo((): number[][] => {
    if (numericVariables.length < 2) return []

    const n = numericVariables.length
    const corrMap = new Map<string, number>()
    correlationMatrix.forEach(({ var1, var2, r }) => {
      corrMap.set(`${var1}|${var2}`, r)
      corrMap.set(`${var2}|${var1}`, r)
    })

    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0) as number[])
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1
      for (let j = i + 1; j < n; j++) {
        const r = corrMap.get(`${numericVariables[i]}|${numericVariables[j]}`) ?? 0
        matrix[i][j] = r
        matrix[j][i] = r
      }
    }
    return matrix
  }, [numericVariables, correlationMatrix])

  return {
    getPairedData,
    correlationMatrix,
    heatmapMatrix
  }
}
