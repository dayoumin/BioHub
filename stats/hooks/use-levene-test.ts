'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import type { ColumnStatistics, DataRow, ValidationResults } from '@/types/analysis'
import { MIN_GROUP_SIZE } from '@/lib/constants/statistical-constants'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { raceWithTimeout } from '@/lib/utils/promise-utils'
import { extractGroupedNumericData } from '@/lib/utils/grouped-data'
import { logger } from '@/lib/utils/logger'

interface LeveneResult {
  statistic: number
  pValue: number
  equalVariance: boolean
}

interface WorkerLeveneResult {
  homogeneity: {
    levene: { statistic: number; pValue: number }
    passed: boolean
  }
  normality: unknown
}

export interface LevenePairResult extends LeveneResult {
  numericVariable: string
  groupVariable: string
}

export interface UseLeveneTestReturn {
  result: LeveneResult | null
  results: LevenePairResult[]
  isLoading: boolean
  groupVariable: string | null
  groupCandidates: string[]
  setGroupVariable: (varName: string) => void
}

const MIN_GROUPS = 2
const MAX_GROUPS = 10
const TIMEOUT_MS = 15_000

export function useLeveneTest(
  validationResults: ValidationResults | null,
  data: DataRow[],
  numericVariables: string[],
  primaryNumericVar: string | undefined,
): UseLeveneTestReturn {
  const [results, setResults] = useState<LevenePairResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const groupCandidates = useMemo(() => {
    if (!validationResults?.columnStats) return []

    return validationResults.columnStats
      .filter((col: ColumnStatistics) =>
        col.type === 'categorical'
        && !col.idDetection?.isId
        && col.uniqueValues >= MIN_GROUPS
        && col.uniqueValues <= MAX_GROUPS,
      )
      .map((col: ColumnStatistics) => col.name)
  }, [validationResults])

  useEffect(() => {
    if (groupCandidates.length === 0) {
      setSelectedGroup(null)
      setResults([])
      return
    }

    if (selectedGroup === null || !groupCandidates.includes(selectedGroup)) {
      setSelectedGroup(groupCandidates[0])
    }
  }, [groupCandidates, selectedGroup])

  const setGroupVariable = useCallback((varName: string) => {
    setSelectedGroup(varName)
  }, [])

  useEffect(() => {
    if (groupCandidates.length === 0 || numericVariables.length === 0 || data.length < MIN_GROUP_SIZE * 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setResults([])
    setIsLoading(true)

    async function run(): Promise<void> {
      try {
        const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
        const pyodide = PyodideCoreService.getInstance()

        if (!pyodide.isInitialized()) {
          await pyodide.initialize()
        }

        const nextResults: LevenePairResult[] = []

        for (const numericVariable of numericVariables) {
          for (const groupVariable of groupCandidates) {
            try {
              const groupMap = extractGroupedNumericData(data, numericVariable, groupVariable)
              const validGroups = [...groupMap.values()].filter((group) => group.length >= MIN_GROUP_SIZE)

              if (validGroups.length < 2) {
                continue
              }

              const workerResult = await raceWithTimeout(
                pyodide.callWorkerMethod<WorkerLeveneResult>(
                  PyodideWorker.NonparametricAnova,
                  'test_assumptions',
                  { groups: validGroups },
                ),
                TIMEOUT_MS,
                'Levene test timeout',
              )

              nextResults.push({
                numericVariable,
                groupVariable,
                statistic: workerResult.homogeneity.levene.statistic,
                pValue: workerResult.homogeneity.levene.pValue,
                equalVariance: workerResult.homogeneity.passed,
              })

              if (!cancelled) {
                setResults([...nextResults])
              }
            } catch (error) {
              logger.warn('Levene test failed in Step 1', {
                error,
                groupVariable,
                numericVariable,
              })
            }
          }
        }
      } catch (error) {
        logger.warn('Levene test batch failed in Step 1', { error })
        if (!cancelled) {
          setResults([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [data, groupCandidates, numericVariables])

  const result = useMemo<LeveneResult | null>(() => {
    if (!primaryNumericVar || !selectedGroup) return null

    const match = results.find(
      (item) => item.numericVariable === primaryNumericVar && item.groupVariable === selectedGroup,
    )

    if (!match) return null

    return {
      statistic: match.statistic,
      pValue: match.pValue,
      equalVariance: match.equalVariance,
    }
  }, [primaryNumericVar, results, selectedGroup])

  return {
    result,
    results,
    isLoading,
    groupVariable: selectedGroup,
    groupCandidates,
    setGroupVariable,
  }
}
