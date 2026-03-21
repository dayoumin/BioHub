'use client'

import { useMemo, useCallback } from 'react'
import type { ValidationResults, DataRow, ColumnStatistics } from '@/types/analysis'
import type { OutlierInfo } from '@/components/common/analysis/OutlierDetailPanel'
import { getPercentile } from '@/lib/utils/stats-math'

export interface NumericDistribution extends ColumnStatistics {
  n: number
  outlierCount: number
}

export interface OutlierDetails {
  outliers: OutlierInfo[]
  statistics: {
    min: number
    q1: number
    median: number
    q3: number
    max: number
    mean?: number
    iqr: number
    lowerBound: number
    upperBound: number
    extremeLowerBound: number
    extremeUpperBound: number
  }
}

interface UseDescriptiveStatsReturn {
  numericVariables: string[]
  categoricalVariables: string[]
  numericDistributions: NumericDistribution[]
  totalOutlierCount: number
  formatStat: (value?: number, digits?: number) => string
  getOutlierDetails: (varName: string) => OutlierDetails | null
}

/**
 * 기술통계 계산 훅
 * 수치형/범주형 변수 분류, 분포 계산, 이상치 탐지
 */
export function useDescriptiveStats(
  validationResults: ValidationResults | null,
  data: DataRow[]
): UseDescriptiveStatsReturn {
  // 수치형/범주형 변수 + 통계를 단일 패스로 분류
  const { numericVariables, categoricalVariables, numericColumnStats } = useMemo(() => {
    if (!validationResults?.columnStats) {
      return { numericVariables: [] as string[], categoricalVariables: [] as string[], numericColumnStats: [] as ColumnStatistics[] }
    }
    const numVars: string[] = []
    const catVars: string[] = []
    const numStats: ColumnStatistics[] = []

    for (const col of validationResults.columnStats) {
      if (col.idDetection?.isId) continue
      if (col.type === 'numeric') {
        numVars.push(col.name)
        numStats.push(col)
      } else if (col.type === 'categorical') {
        catVars.push(col.name)
      }
    }
    return { numericVariables: numVars, categoricalVariables: catVars, numericColumnStats: numStats }
  }, [validationResults])

  const numericDistributions = useMemo((): NumericDistribution[] => {
    return numericColumnStats.map(col => {
      const values: number[] = []
      for (const row of data) {
        const v = row[col.name]
        if (v === null || v === undefined || v === '') continue
        const num = Number(v)
        if (!isNaN(num)) values.push(num)
      }
      const n = values.length
      const sorted = [...values].sort((a, b) => a - b)

      const mean = col.mean ?? (n > 0 ? values.reduce((sum, v) => sum + v, 0) / n : undefined)
      // 모집단 표준편차 (/ n) — data-validation-service와 동일
      const std = col.std ?? (n > 1 && mean !== undefined
        ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n)
        : undefined)

      // 항상 선형 보간(getPercentile) 사용 — col.q1은 인덱스 선택 방식이라 일관성을 위해 무시
      const q1 = getPercentile(sorted, 0.25)
      const q3 = getPercentile(sorted, 0.75)
      const median = col.median ?? getPercentile(sorted, 0.5)
      const min = col.min ?? (n > 0 ? sorted[0] : undefined)
      const max = col.max ?? (n > 0 ? sorted[sorted.length - 1] : undefined)

      const iqr = q1 !== undefined && q3 !== undefined ? q3 - q1 : undefined
      // iqr !== undefined이면 q1, q3 모두 defined — 안전한 접근
      const lowerBound = iqr !== undefined && q1 !== undefined ? q1 - 1.5 * iqr : undefined
      const upperBound = iqr !== undefined && q3 !== undefined ? q3 + 1.5 * iqr : undefined
      const outlierCount = lowerBound !== undefined && upperBound !== undefined
        ? values.filter(v => v < lowerBound || v > upperBound).length
        : 0

      // EDA 표시용 근사치 — 검증된 값(col.skewness/col.kurtosis)이 있으면 그것을 우선 사용
      // 통계 검정에는 사용하지 않음 (Pyodide 경유 scipy/pingouin이 담당)
      let skewness = col.skewness
      if (skewness === undefined && n >= 3 && std && std > 0 && mean !== undefined) {
        skewness = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0) / n
      }

      let kurtosis = col.kurtosis
      if (kurtosis === undefined && n >= 4 && std && std > 0 && mean !== undefined) {
        kurtosis = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0) / n - 3
      }

      return {
        ...col,
        n,
        mean,
        median,
        std,
        min,
        max,
        q1,
        q3,
        skewness,
        kurtosis,
        outlierCount
      }
    })
  }, [data, numericColumnStats])

  const totalOutlierCount = useMemo(
    () => numericDistributions.reduce((sum, v) => sum + v.outlierCount, 0),
    [numericDistributions]
  )

  const formatStat = useCallback((value?: number, digits = 2): string => {
    return value !== undefined && !Number.isNaN(value) ? value.toFixed(digits) : 'N/A'
  }, [])

  // numericDistributions의 사전 계산된 통계를 재사용하여 이상치 상세 정보 생성
  const getOutlierDetails = useCallback((varName: string): OutlierDetails | null => {
    const dist = numericDistributions.find(d => d.name === varName)
    if (!dist || dist.n === 0) return null
    // q1/q3 없으면 IQR 기반 이상치 판정 불가
    if (dist.q1 === undefined || dist.q3 === undefined) return null

    const q1 = dist.q1
    const q3 = dist.q3
    const median = dist.median ?? 0
    const iqr = q3 - q1

    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const extremeLowerBound = q1 - 3.0 * iqr
    const extremeUpperBound = q3 + 3.0 * iqr

    // 행 번호 수집만 data 순회 필요 (통계는 numericDistributions에서 재사용)
    const outliers: OutlierInfo[] = []
    data.forEach((row, idx) => {
      const val = row[varName]
      if (val === null || val === undefined || val === '') return
      const numVal = Number(val)
      if (isNaN(numVal)) return

      if (numVal < lowerBound || numVal > upperBound) {
        const isExtreme = numVal < extremeLowerBound || numVal > extremeUpperBound
        outliers.push({
          value: numVal,
          rowIndex: idx + 1,
          isExtreme
        })
      }
    })

    return {
      outliers,
      statistics: {
        min: dist.min ?? 0,
        q1,
        median,
        q3,
        max: dist.max ?? 0,
        mean: dist.mean,
        iqr,
        lowerBound,
        upperBound,
        extremeLowerBound,
        extremeUpperBound
      }
    }
  }, [data, numericDistributions])

  return {
    numericVariables,
    categoricalVariables,
    numericDistributions,
    totalOutlierCount,
    formatStat,
    getOutlierDetails
  }
}
