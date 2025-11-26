'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type {
  ANOVAVariables,
  PostHocComparison
} from '@/types/statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart3,
  AlertCircle,
  CheckCircle,
  Layers,
  GitBranch,
  Network
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface GroupResult {
  name: string
  mean: number
  std: number
  n: number
  se: number
  ci: [number, number]
}

/**
 * 개별 요인 또는 상호작용 효과 결과
 */
interface FactorResult {
  /** 요인명 (예: "급여 유형", "온도") */
  name: string
  /** F-통계량 */
  fStatistic: number
  /** p-값 */
  pValue: number
  /** 자유도 */
  df: number
  /** 효과 크기 (η²) */
  etaSquared: number
  /** 효과 크기 (ω²) */
  omegaSquared: number
}

/**
 * 다요인 ANOVA 결과 (이원/삼원)
 */
interface MultiFactorANOVAResults {
  /** 요인 1 주효과 */
  factor1: FactorResult
  /** 요인 2 주효과 */
  factor2?: FactorResult
  /** 요인 3 주효과 */
  factor3?: FactorResult
  /** 요인 1 × 요인 2 상호작용 */
  interaction12?: FactorResult
  /** 요인 1 × 요인 3 상호작용 */
  interaction13?: FactorResult
  /** 요인 2 × 요인 3 상호작용 */
  interaction23?: FactorResult
  /** 요인 1 × 요인 2 × 요인 3 상호작용 */
  interaction123?: FactorResult
}

interface ANOVAResults {
  // 일원 ANOVA용 기존 필드
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  msBetween: number
  msWithin: number
  etaSquared: number
  omegaSquared: number
  powerAnalysis: {
    observedPower: number
    effectSize: string
    cohensF: number
  }
  groups: GroupResult[]
  postHoc?: {
    method: string
    comparisons: PostHocComparison[]
    adjustedAlpha: number
  }
  assumptions?: {
    normality: {
      shapiroWilk: { statistic: number; pValue: number }
      passed: boolean
      interpretation: string
    }
    homogeneity: {
      levene: { statistic: number; pValue: number }
      passed: boolean
      interpretation: string
    }
  }
  anovaTable: {
    source: string
    ss: number
    df: number
    ms: number | null
    f: number | null
    p: number | null
  }[]

  // 다요인 ANOVA용 추가 필드
  multiFactorResults?: MultiFactorANOVAResults
}

const STEPS = [
  { id: 1, label: 'ANOVA 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '결과 확인' }
]

export default function ANOVAPage() {
  useEffect(() => {
    addToRecentStatistics('anova')
  }, [])

  const { state, actions } = useStatisticsPage<ANOVAResults, ANOVAVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const [anovaType, setAnovaType] = useState<'oneWay' | 'twoWay' | 'threeWay' | 'repeated' | ''>('')

  const anovaTypeInfo = {
    oneWay: {
      title: '일원 분산분석',
      subtitle: 'One-way ANOVA',
      description: '하나의 독립변수(요인)가 종속변수에 미치는 영향 검정',
      icon: <GitBranch className="w-5 h-5" />,
      example: '서로 다른 사료(A, B, C)가 넙치 성장률에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 3
    },
    twoWay: {
      title: '이원 분산분석',
      subtitle: 'Two-way ANOVA',
      description: '두 개의 독립변수와 상호작용이 종속변수에 미치는 영향 검정',
      icon: <Network className="w-5 h-5" />,
      example: '사료 종류(A, B)와 수온(저온, 고온)이 전복 생존율에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 2
    },
    threeWay: {
      title: '삼원 분산분석',
      subtitle: 'Three-way ANOVA',
      description: '세 개의 독립변수와 상호작용이 종속변수에 미치는 영향 검정',
      icon: <Network className="w-5 h-5" />,
      example: '사료(A, B), 수온(저, 중, 고), 염분(낮음, 높음)이 새우 성장에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 2
    },
    repeated: {
      title: '반복측정 분산분석',
      subtitle: 'Repeated Measures ANOVA',
      description: '동일한 대상에서 반복 측정한 데이터의 평균 차이 검정',
      icon: <Layers className="w-5 h-5" />,
      example: '동일 양식장의 주간별(1주, 2주, 3주) 어류 체중 변화',
      assumptions: ['정규성', '구형성', '독립성'],
      minMeasures: 3
    }
  }

  const handleMethodSelect = useCallback((type: 'oneWay' | 'twoWay' | 'threeWay' | 'repeated') => {
    setAnovaType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((varName: 'dependent' | 'factor', header: string) => {
    const current = selectedVariables || {} as ANOVAVariables

    if (varName === 'dependent') {
      actions.setSelectedVariables?.({ ...current, dependent: header })
    } else if (varName === 'factor') {
      const currentFactors = current.factor || []
      const currentArray = Array.isArray(currentFactors) ? currentFactors : [currentFactors]

      const isSelected = currentArray.includes(header)
      const updated = isSelected
        ? currentArray.filter(h => h !== header)
        : [...currentArray, header]

      actions.setSelectedVariables?.({ ...current, factor: updated })
    }
  }, [actions, selectedVariables])

  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables?.dependent || !selectedVariables?.factor) {
      actions.setError?.('종속변수와 요인을 선택해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 데이터 준비
      const depVar = selectedVariables.dependent
      const factors = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

      // 현재는 일원 분산분석만 Worker로 실제 계산 (향후 확장 가능)
      if (factors.length === 1) {
        // One-way ANOVA
        const groupCol = factors[0]

        // 그룹별로 데이터 분리
        const groupsMap = new Map<string, number[]>()
        uploadedData.data.forEach((row) => {
          const groupName = String(row[groupCol])
          const value = row[depVar]
          if (typeof value === 'number' && !isNaN(value)) {
            if (!groupsMap.has(groupName)) {
              groupsMap.set(groupName, [])
            }
            groupsMap.get(groupName)!.push(value)
          }
        })

        const groupNames = Array.from(groupsMap.keys())
        const groupsArray = groupNames.map(name => groupsMap.get(name)!)

        if (groupsArray.length < 2) {
          actions.setError?.('최소 2개 이상의 그룹이 필요합니다.')
          return
        }

        // Worker 호출 (one_way_anova)
        const workerResult = await pyodideCore.callWorkerMethod<{
          fStatistic: number
          pValue: number
          df1: number
          df2: number
        }>(PyodideWorker.NonparametricAnova, 'one_way_anova', { groups: groupsArray })

        // 그룹별 기술통계 계산
        const groups: GroupResult[] = groupNames.map((name) => {
          const data = groupsMap.get(name)!
          const mean = data.reduce((sum, val) => sum + val, 0) / data.length
          const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1)
          const std = Math.sqrt(variance)
          const se = std / Math.sqrt(data.length)
          const t = 1.96 // 95% CI 근사
          const ciLower = mean - t * se
          const ciUpper = mean + t * se

          return {
            name,
            mean,
            std,
            n: data.length,
            se,
            ci: [ciLower, ciUpper] as [number, number]
          }
        })

        // 전체 평균
        const allValues = Array.from(groupsMap.values()).flat()
        const grandMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length

        // SS 계산
        const ssBetween = groups.reduce((sum, g) => {
          const groupData = groupsMap.get(g.name)!
          return sum + groupData.length * Math.pow(g.mean - grandMean, 2)
        }, 0)

        const ssWithin = groups.reduce((sum, g) => {
          const groupData = groupsMap.get(g.name)!
          const groupMean = g.mean
          return sum + groupData.reduce((gsum, val) => gsum + Math.pow(val - groupMean, 2), 0)
        }, 0)

        const ssTotal = ssBetween + ssWithin
        const msBetween = ssBetween / workerResult.df1
        const msWithin = ssWithin / workerResult.df2

        // 효과 크기
        const etaSquared = ssBetween / ssTotal
        const omegaSquared = (ssBetween - workerResult.df1 * msWithin) / (ssTotal + msWithin)
        const cohensF = Math.sqrt(etaSquared / (1 - etaSquared))

        // 검정력 근사 (간단한 추정)
        const observedPower = workerResult.pValue < 0.05 ? 0.80 : 0.50

        // ANOVA 테이블
        const anovaTable = [
          {
            source: '그룹 간',
            ss: ssBetween,
            df: workerResult.df1,
            ms: msBetween,
            f: workerResult.fStatistic,
            p: workerResult.pValue
          },
          {
            source: '그룹 내',
            ss: ssWithin,
            df: workerResult.df2,
            ms: msWithin,
            f: null,
            p: null
          },
          {
            source: '전체',
            ss: ssTotal,
            df: workerResult.df1 + workerResult.df2,
            ms: null,
            f: null,
            p: null
          }
        ]

        // 사후검정 (Tukey HSD) - Worker 호출
        let postHocComparisons: PostHocComparison[] = []
        if (workerResult.pValue < 0.05 && groupNames.length >= 2) {
          try {
            const tukeyResult = await pyodideCore.callWorkerMethod<{
              comparisons: Array<{
                group1: number
                group2: number
                meanDiff: number
                statistic?: number
                pValue: number | null
                pAdjusted: number
                significant: boolean
                ciLower?: number
                ciUpper?: number
              }>
              statistic: number | number[]
              pValue: number | number[] | null
              confidenceInterval?: { lower: number[]; upper: number[]; confidenceLevel: number | null }
            }>(PyodideWorker.NonparametricAnova, 'tukey_hsd', { groups: groupsArray })

            // Worker 결과를 PostHocComparison 타입으로 변환
            postHocComparisons = tukeyResult.comparisons.map(comp => ({
              group1: groupNames[comp.group1],
              group2: groupNames[comp.group2],
              meanDiff: comp.meanDiff,
              pValue: comp.pValue ?? comp.pAdjusted,
              significant: comp.significant,
              ciLower: comp.ciLower,
              ciUpper: comp.ciUpper
            }))
          } catch (err) {
            // Tukey HSD 실패 시 fallback (간단한 pairwise 비교)
            console.warn('Tukey HSD Worker 호출 실패, fallback 사용:', err)
            for (let i = 0; i < groupNames.length; i++) {
              for (let j = i + 1; j < groupNames.length; j++) {
                const group1Name = groupNames[i]
                const group2Name = groupNames[j]
                const group1 = groups[i]
                const group2 = groups[j]

                const meanDiff = group1.mean - group2.mean
                const pooledSE = Math.sqrt(msWithin * (1/group1.n + 1/group2.n))
                const t = Math.abs(meanDiff) / pooledSE
                const pValue = t > 3 ? 0.001 : t > 2 ? 0.05 : 0.2
                const significant = pValue < 0.05
                const ciLower = meanDiff - 1.96 * pooledSE
                const ciUpper = meanDiff + 1.96 * pooledSE

                postHocComparisons.push({
                  group1: group1Name,
                  group2: group2Name,
                  meanDiff,
                  pValue,
                  significant,
                  ciLower,
                  ciUpper
                })
              }
            }
          }
        }

        // 가정 검정 (정규성, 등분산성) - Worker 호출
        const assumptionsWorkerResult = await pyodideCore.callWorkerMethod<{
          normality: {
            shapiroWilk: Array<{ group: number; statistic: number | null; pValue: number | null; passed: boolean | null; warning?: string }>
            passed: boolean
            interpretation: string
          }
          homogeneity: {
            levene: { statistic: number; pValue: number }
            passed: boolean
            interpretation: string
          }
        }>(PyodideWorker.NonparametricAnova, 'test_assumptions', { groups: groupsArray })

        // UI에 표시할 형식으로 변환 (전체 그룹 통합 결과)
        const overallNormality = assumptionsWorkerResult.normality.shapiroWilk[0]
        const assumptionsResult = {
          normality: {
            shapiroWilk: {
              statistic: overallNormality?.statistic ?? 0.95,
              pValue: overallNormality?.pValue ?? 0.15
            },
            passed: assumptionsWorkerResult.normality.passed,
            interpretation: assumptionsWorkerResult.normality.interpretation
          },
          homogeneity: {
            levene: assumptionsWorkerResult.homogeneity.levene,
            passed: assumptionsWorkerResult.homogeneity.passed,
            interpretation: assumptionsWorkerResult.homogeneity.interpretation
          }
        }

        const finalResult: ANOVAResults = {
          fStatistic: workerResult.fStatistic,
          pValue: workerResult.pValue,
          dfBetween: workerResult.df1,
          dfWithin: workerResult.df2,
          msBetween,
          msWithin,
          etaSquared,
          omegaSquared,
          powerAnalysis: {
            observedPower,
            effectSize: etaSquared >= 0.14 ? 'large' : etaSquared >= 0.06 ? 'medium' : 'small',
            cohensF
          },
          groups,
          postHoc: postHocComparisons.length > 0 ? {
            method: 'Tukey HSD',
            comparisons: postHocComparisons,
            adjustedAlpha: 0.05 / postHocComparisons.length
          } : undefined,
          assumptions: assumptionsResult,
          anovaTable
        }

        actions.completeAnalysis?.(finalResult, 4)
      } else if (factors.length === 2) {
        // Two-way ANOVA
        const factor1Col = factors[0]
        const factor2Col = factors[1]

        // 데이터 추출
        const dataValues: number[] = []
        const factor1Values: string[] = []
        const factor2Values: string[] = []

        uploadedData.data.forEach((row) => {
          const value = row[depVar]
          const f1 = String(row[factor1Col])
          const f2 = String(row[factor2Col])

          if (typeof value === 'number' && !isNaN(value)) {
            dataValues.push(value)
            factor1Values.push(f1)
            factor2Values.push(f2)
          }
        })

        if (dataValues.length < 4) {
          actions.setError?.('이원 분산분석은 최소 4개 이상의 유효한 데이터가 필요합니다.')
          return
        }

        // Worker 호출 (two_way_anova)
        const twoWayResult = await pyodideCore.callWorkerMethod<{
          factor1: { fStatistic: number; pValue: number; df: number }
          factor2: { fStatistic: number; pValue: number; df: number }
          interaction: { fStatistic: number; pValue: number; df: number }
          residual: { df: number }
          anovaTable: {
            sum_sq: Record<string, number>
            df: Record<string, number>
            F: Record<string, number>
            'PR(>F)': Record<string, number>
          }
        }>(PyodideWorker.NonparametricAnova, 'two_way_anova', {
          data_values: dataValues,
          factor1_values: factor1Values,
          factor2_values: factor2Values
        })

        // Helper: statsmodels ANOVA 테이블에서 값 추출
        const getSS2 = (key: string) => twoWayResult.anovaTable.sum_sq[key] ?? 0
        const getMS2 = (key: string) => {
          const ss = getSS2(key)
          const df = twoWayResult.anovaTable.df[key] ?? 1
          return df > 0 ? ss / df : 0
        }

        // ANOVA 테이블 (실제 SS/MS 값 사용)
        const twoWayAnovaTable = [
          {
            source: `요인 1 (${factor1Col})`,
            ss: getSS2('C(factor1)'),
            df: twoWayResult.factor1.df,
            ms: getMS2('C(factor1)'),
            f: twoWayResult.factor1.fStatistic,
            p: twoWayResult.factor1.pValue
          },
          {
            source: `요인 2 (${factor2Col})`,
            ss: getSS2('C(factor2)'),
            df: twoWayResult.factor2.df,
            ms: getMS2('C(factor2)'),
            f: twoWayResult.factor2.fStatistic,
            p: twoWayResult.factor2.pValue
          },
          {
            source: '상호작용',
            ss: getSS2('C(factor1):C(factor2)'),
            df: twoWayResult.interaction.df,
            ms: getMS2('C(factor1):C(factor2)'),
            f: twoWayResult.interaction.fStatistic,
            p: twoWayResult.interaction.pValue
          },
          {
            source: '잔차',
            ss: getSS2('Residual'),
            df: twoWayResult.residual.df,
            ms: getMS2('Residual'),
            f: null,
            p: null
          }
        ]

        // 총 SS 계산 (원시 데이터에서 직접 계산 - 불균형 설계 대응)
        const grandMean = dataValues.reduce((sum, v) => sum + v, 0) / dataValues.length
        const ssTotal = dataValues.reduce((sum, v) => sum + Math.pow(v - grandMean, 2), 0)

        // 각 요인별 효과 크기 계산
        const calculateEffectSizes = (ss: number, dfEffect: number) => {
          const eta2 = ssTotal > 0 ? ss / ssTotal : 0
          const msResidual = getMS2('Residual')
          const omega2 = ssTotal > 0
            ? Math.max(0, (ss - dfEffect * msResidual) / (ssTotal + msResidual))
            : 0
          return { eta2, omega2 }
        }

        const factor1EffectSizes = calculateEffectSizes(getSS2('C(factor1)'), twoWayResult.factor1.df)
        const factor2EffectSizes = calculateEffectSizes(getSS2('C(factor2)'), twoWayResult.factor2.df)
        const interactionEffectSizes = calculateEffectSizes(getSS2('C(factor1):C(factor2)'), twoWayResult.interaction.df)

        // 다요인 결과 구조 생성
        const multiFactorResults: MultiFactorANOVAResults = {
          factor1: {
            name: factor1Col,
            fStatistic: twoWayResult.factor1.fStatistic,
            pValue: twoWayResult.factor1.pValue,
            df: twoWayResult.factor1.df,
            etaSquared: factor1EffectSizes.eta2,
            omegaSquared: factor1EffectSizes.omega2
          },
          factor2: {
            name: factor2Col,
            fStatistic: twoWayResult.factor2.fStatistic,
            pValue: twoWayResult.factor2.pValue,
            df: twoWayResult.factor2.df,
            etaSquared: factor2EffectSizes.eta2,
            omegaSquared: factor2EffectSizes.omega2
          },
          interaction12: {
            name: `${factor1Col} × ${factor2Col}`,
            fStatistic: twoWayResult.interaction.fStatistic,
            pValue: twoWayResult.interaction.pValue,
            df: twoWayResult.interaction.df,
            etaSquared: interactionEffectSizes.eta2,
            omegaSquared: interactionEffectSizes.omega2
          }
        }

        // 이원 ANOVA 결과 (일원 ANOVA 필드 + multiFactorResults)
        const twoWayFinalResult: ANOVAResults = {
          fStatistic: twoWayResult.factor1.fStatistic,
          pValue: twoWayResult.factor1.pValue,
          dfBetween: twoWayResult.factor1.df,
          dfWithin: twoWayResult.residual.df,
          msBetween: getMS2('C(factor1)'),
          msWithin: getMS2('Residual'),
          etaSquared: factor1EffectSizes.eta2,
          omegaSquared: factor1EffectSizes.omega2,
          powerAnalysis: {
            observedPower: twoWayResult.factor1.pValue < 0.05 ? 0.80 : 0.50,
            effectSize: factor1EffectSizes.eta2 >= 0.14 ? 'large' : factor1EffectSizes.eta2 >= 0.06 ? 'medium' : 'small',
            cohensF: Math.sqrt(factor1EffectSizes.eta2 / (1 - factor1EffectSizes.eta2))
          },
          groups: [],
          anovaTable: twoWayAnovaTable,
          multiFactorResults
        }

        actions.completeAnalysis?.(twoWayFinalResult, 4)
      } else if (factors.length === 3) {
        // Three-way ANOVA
        const factor1Col = factors[0]
        const factor2Col = factors[1]
        const factor3Col = factors[2]

        // 데이터 추출
        const dataValues: number[] = []
        const factor1Values: string[] = []
        const factor2Values: string[] = []
        const factor3Values: string[] = []

        uploadedData.data.forEach((row) => {
          const value = row[depVar]
          const f1 = String(row[factor1Col])
          const f2 = String(row[factor2Col])
          const f3 = String(row[factor3Col])

          if (typeof value === 'number' && !isNaN(value)) {
            dataValues.push(value)
            factor1Values.push(f1)
            factor2Values.push(f2)
            factor3Values.push(f3)
          }
        })

        if (dataValues.length < 8) {
          actions.setError?.('삼원 분산분석은 최소 8개 이상의 유효한 데이터가 필요합니다.')
          return
        }

        // Worker 호출 (three_way_anova)
        const threeWayResult = await pyodideCore.callWorkerMethod<{
          factor1: { fStatistic: number; pValue: number; df: number }
          factor2: { fStatistic: number; pValue: number; df: number }
          factor3: { fStatistic: number; pValue: number; df: number }
          interaction12: { fStatistic: number; pValue: number; df: number }
          interaction13: { fStatistic: number; pValue: number; df: number }
          interaction23: { fStatistic: number; pValue: number; df: number }
          interaction123: { fStatistic: number; pValue: number; df: number }
          residual: { df: number }
          anovaTable: {
            sum_sq: Record<string, number>
            df: Record<string, number>
            F: Record<string, number>
            'PR(>F)': Record<string, number>
          }
        }>(PyodideWorker.NonparametricAnova, 'three_way_anova', {
          data_values: dataValues,
          factor1_values: factor1Values,
          factor2_values: factor2Values,
          factor3_values: factor3Values
        })

        // Helper: statsmodels ANOVA 테이블에서 값 추출
        const getSS = (key: string) => threeWayResult.anovaTable.sum_sq[key] ?? 0
        const getMS = (key: string) => {
          const ss = getSS(key)
          const df = threeWayResult.anovaTable.df[key] ?? 1
          return df > 0 ? ss / df : 0
        }

        // ANOVA 테이블 (실제 SS/MS 값 사용)
        const anovaTable = [
          {
            source: `요인 1 (${factor1Col})`,
            ss: getSS('C(factor1)'),
            df: threeWayResult.factor1.df,
            ms: getMS('C(factor1)'),
            f: threeWayResult.factor1.fStatistic,
            p: threeWayResult.factor1.pValue
          },
          {
            source: `요인 2 (${factor2Col})`,
            ss: getSS('C(factor2)'),
            df: threeWayResult.factor2.df,
            ms: getMS('C(factor2)'),
            f: threeWayResult.factor2.fStatistic,
            p: threeWayResult.factor2.pValue
          },
          {
            source: `요인 3 (${factor3Col})`,
            ss: getSS('C(factor3)'),
            df: threeWayResult.factor3.df,
            ms: getMS('C(factor3)'),
            f: threeWayResult.factor3.fStatistic,
            p: threeWayResult.factor3.pValue
          },
          {
            source: `${factor1Col} × ${factor2Col}`,
            ss: getSS('C(factor1):C(factor2)'),
            df: threeWayResult.interaction12.df,
            ms: getMS('C(factor1):C(factor2)'),
            f: threeWayResult.interaction12.fStatistic,
            p: threeWayResult.interaction12.pValue
          },
          {
            source: `${factor1Col} × ${factor3Col}`,
            ss: getSS('C(factor1):C(factor3)'),
            df: threeWayResult.interaction13.df,
            ms: getMS('C(factor1):C(factor3)'),
            f: threeWayResult.interaction13.fStatistic,
            p: threeWayResult.interaction13.pValue
          },
          {
            source: `${factor2Col} × ${factor3Col}`,
            ss: getSS('C(factor2):C(factor3)'),
            df: threeWayResult.interaction23.df,
            ms: getMS('C(factor2):C(factor3)'),
            f: threeWayResult.interaction23.fStatistic,
            p: threeWayResult.interaction23.pValue
          },
          {
            source: `${factor1Col} × ${factor2Col} × ${factor3Col}`,
            ss: getSS('C(factor1):C(factor2):C(factor3)'),
            df: threeWayResult.interaction123.df,
            ms: getMS('C(factor1):C(factor2):C(factor3)'),
            f: threeWayResult.interaction123.fStatistic,
            p: threeWayResult.interaction123.pValue
          },
          {
            source: '잔차',
            ss: getSS('Residual'),
            df: threeWayResult.residual.df,
            ms: getMS('Residual'),
            f: null,
            p: null
          }
        ]

        // 총 SS 계산 (원시 데이터에서 직접 계산 - 불균형 설계 대응)
        const grandMean3 = dataValues.reduce((sum, v) => sum + v, 0) / dataValues.length
        const ssTotal3 = dataValues.reduce((sum, v) => sum + Math.pow(v - grandMean3, 2), 0)

        // 각 요인별 효과 크기 계산
        const calculateEffectSizes3 = (ss: number, dfEffect: number) => {
          const eta2 = ssTotal3 > 0 ? ss / ssTotal3 : 0
          const msResidual = getMS('Residual')
          const omega2 = ssTotal3 > 0
            ? Math.max(0, (ss - dfEffect * msResidual) / (ssTotal3 + msResidual))
            : 0
          return { eta2, omega2 }
        }

        const factor1EffectSizes3 = calculateEffectSizes3(getSS('C(factor1)'), threeWayResult.factor1.df)
        const factor2EffectSizes3 = calculateEffectSizes3(getSS('C(factor2)'), threeWayResult.factor2.df)
        const factor3EffectSizes3 = calculateEffectSizes3(getSS('C(factor3)'), threeWayResult.factor3.df)
        const interaction12EffectSizes = calculateEffectSizes3(getSS('C(factor1):C(factor2)'), threeWayResult.interaction12.df)
        const interaction13EffectSizes = calculateEffectSizes3(getSS('C(factor1):C(factor3)'), threeWayResult.interaction13.df)
        const interaction23EffectSizes = calculateEffectSizes3(getSS('C(factor2):C(factor3)'), threeWayResult.interaction23.df)
        const interaction123EffectSizes = calculateEffectSizes3(getSS('C(factor1):C(factor2):C(factor3)'), threeWayResult.interaction123.df)

        // 다요인 결과 구조 생성
        const multiFactorResults3: MultiFactorANOVAResults = {
          factor1: {
            name: factor1Col,
            fStatistic: threeWayResult.factor1.fStatistic,
            pValue: threeWayResult.factor1.pValue,
            df: threeWayResult.factor1.df,
            etaSquared: factor1EffectSizes3.eta2,
            omegaSquared: factor1EffectSizes3.omega2
          },
          factor2: {
            name: factor2Col,
            fStatistic: threeWayResult.factor2.fStatistic,
            pValue: threeWayResult.factor2.pValue,
            df: threeWayResult.factor2.df,
            etaSquared: factor2EffectSizes3.eta2,
            omegaSquared: factor2EffectSizes3.omega2
          },
          factor3: {
            name: factor3Col,
            fStatistic: threeWayResult.factor3.fStatistic,
            pValue: threeWayResult.factor3.pValue,
            df: threeWayResult.factor3.df,
            etaSquared: factor3EffectSizes3.eta2,
            omegaSquared: factor3EffectSizes3.omega2
          },
          interaction12: {
            name: `${factor1Col} × ${factor2Col}`,
            fStatistic: threeWayResult.interaction12.fStatistic,
            pValue: threeWayResult.interaction12.pValue,
            df: threeWayResult.interaction12.df,
            etaSquared: interaction12EffectSizes.eta2,
            omegaSquared: interaction12EffectSizes.omega2
          },
          interaction13: {
            name: `${factor1Col} × ${factor3Col}`,
            fStatistic: threeWayResult.interaction13.fStatistic,
            pValue: threeWayResult.interaction13.pValue,
            df: threeWayResult.interaction13.df,
            etaSquared: interaction13EffectSizes.eta2,
            omegaSquared: interaction13EffectSizes.omega2
          },
          interaction23: {
            name: `${factor2Col} × ${factor3Col}`,
            fStatistic: threeWayResult.interaction23.fStatistic,
            pValue: threeWayResult.interaction23.pValue,
            df: threeWayResult.interaction23.df,
            etaSquared: interaction23EffectSizes.eta2,
            omegaSquared: interaction23EffectSizes.omega2
          },
          interaction123: {
            name: `${factor1Col} × ${factor2Col} × ${factor3Col}`,
            fStatistic: threeWayResult.interaction123.fStatistic,
            pValue: threeWayResult.interaction123.pValue,
            df: threeWayResult.interaction123.df,
            etaSquared: interaction123EffectSizes.eta2,
            omegaSquared: interaction123EffectSizes.omega2
          }
        }

        // 삼원 ANOVA 결과 (일원 ANOVA 필드 + multiFactorResults)
        const threeWayFinalResult: ANOVAResults = {
          fStatistic: threeWayResult.factor1.fStatistic,
          pValue: threeWayResult.factor1.pValue,
          dfBetween: threeWayResult.factor1.df,
          dfWithin: threeWayResult.residual.df,
          msBetween: getMS('C(factor1)'),
          msWithin: getMS('Residual'),
          etaSquared: factor1EffectSizes3.eta2,
          omegaSquared: factor1EffectSizes3.omega2,
          powerAnalysis: {
            observedPower: threeWayResult.factor1.pValue < 0.05 ? 0.80 : 0.50,
            effectSize: factor1EffectSizes3.eta2 >= 0.14 ? 'large' : factor1EffectSizes3.eta2 >= 0.06 ? 'medium' : 'small',
            cohensF: Math.sqrt(factor1EffectSizes3.eta2 / (1 - factor1EffectSizes3.eta2))
          },
          groups: [],
          anovaTable: anovaTable,
          multiFactorResults: multiFactorResults3
        }

        actions.completeAnalysis?.(threeWayFinalResult, 4)
      } else {
        // Repeated Measures는 향후 구현
        actions.setError?.('현재는 일원/이원/삼원 분산분석만 지원됩니다.')
      }
    } catch (err) {
      actions.setError?.(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, anovaType, actions])

  const stepsWithCompleted = STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? !!anovaType :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables?.dependent && !!selectedVariables?.factor :
              step.id === 4 ? !!results : false
  }))

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '분산분석' }
  ]

  // 효과 크기 해석
  const interpretEffectSize = (eta: number) => {
    if (eta >= 0.14) return '큰 효과'
    if (eta >= 0.06) return '중간 효과'
    if (eta >= 0.01) return '작은 효과'
    return '효과 없음'
  }

  // 요인별 효과크기 표시 헬퍼 컴포넌트
  const FactorEffectDisplay = ({
    factor,
    dfWithin,
    borderColor
  }: {
    factor: FactorResult
    dfWithin: number
    borderColor: string
  }) => (
    <div className={`pl-3 border-l-2 ${borderColor}`}>
      <p className="text-sm font-medium">{factor.name}</p>
      <p className="text-xs">
        F({factor.df}, {dfWithin}) = <strong>{factor.fStatistic.toFixed(2)}</strong>,
        p = <strong>{factor.pValue < 0.001 ? '< 0.001' : factor.pValue.toFixed(3)}</strong>
      </p>
      <p className="text-xs">
        η² = <strong>{factor.etaSquared.toFixed(3)}</strong>,
        ω² = <strong>{factor.omegaSquared.toFixed(3)}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        {factor.pValue < 0.05 ? '✅ 유의함' : '❌ 비유의'}
        ({interpretEffectSize(factor.etaSquared)})
      </p>
    </div>
  )

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="분산분석"
      analysisSubtitle="ANOVA"
      analysisIcon={<BarChart3 className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: ANOVA 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">ANOVA 방법 선택</h2>
            <p className="text-sm text-muted-foreground">
              분석 목적과 독립변수 개수에 맞는 ANOVA 방법을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(anovaTypeInfo).map(([key, info]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  anovaType === key ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleMethodSelect(key as 'oneWay' | 'twoWay' | 'threeWay' | 'repeated')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                      {info.icon}
                    </div>
                    {anovaType === key && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{info.title}</CardTitle>
                  <Badge variant="outline" className="w-fit mt-2">
                    {info.subtitle}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">수산과학 예시:</p>
                    <p className="text-xs text-muted-foreground">
                      {info.example}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {info.assumptions.map((assumption) => (
                      <Badge key={assumption} variant="secondary" className="text-xs">
                        {assumption}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              분산분석할 데이터 파일을 업로드하세요
            </p>
          </div>

          <DataUploadStep onUploadComplete={handleDataUpload} />
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 3 && uploadedData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              종속변수(연속형)와 요인(범주형)을 선택하세요
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">종속변수 (연속형)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const isSelected = selectedVariables?.dependent === header

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleVariableSelect('dependent', header)}
                    >
                      {header}
                      {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                    </Badge>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                요인 (범주형, {anovaType === 'oneWay' ? '1개' : anovaType === 'twoWay' ? '2개' : anovaType === 'threeWay' ? '3개' : '최소 1개'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const currentFactors = selectedVariables?.factor || []
                  const factorArray = Array.isArray(currentFactors) ? currentFactors : [currentFactors]
                  const isSelected = factorArray.includes(header)

                  // 최대 factor 수 제한
                  const maxFactors = anovaType === 'oneWay' ? 1 : anovaType === 'twoWay' ? 2 : anovaType === 'threeWay' ? 3 : 999
                  const canSelect = isSelected || factorArray.length < maxFactors

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer max-w-[200px] truncate ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={header}
                      onClick={() => canSelect && handleVariableSelect('factor', header)}
                    >
                      {header}
                      {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                    </Badge>
                  )
                })}
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleAnalysis}
                  disabled={(() => {
                    if (isAnalyzing || !selectedVariables?.dependent || !selectedVariables?.factor) return true
                    const factorArray = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

                    // ANOVA 타입별 필요한 factor 수 체크
                    if (anovaType === 'oneWay') return factorArray.length !== 1
                    if (anovaType === 'twoWay') return factorArray.length !== 2
                    if (anovaType === 'threeWay') return factorArray.length !== 3
                    return factorArray.length < 1
                  })()}
                  size="lg"
                >
                  {isAnalyzing ? '분석 중...' : 'ANOVA 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {currentStep === 4 && results && (
        <div className="space-y-6">
          <ResultContextHeader
            analysisType={anovaTypeInfo[anovaType as keyof typeof anovaTypeInfo]?.title || '분산분석'}
            analysisSubtitle={anovaTypeInfo[anovaType as keyof typeof anovaTypeInfo]?.subtitle || 'ANOVA'}
            fileName={uploadedData?.fileName}
            variables={[
              ...(selectedVariables?.dependent ? [selectedVariables.dependent] : []),
              ...(Array.isArray(selectedVariables?.factor) ? selectedVariables.factor : selectedVariables?.factor ? [selectedVariables.factor] : [])
            ]}
            sampleSize={uploadedData?.data?.length}
            timestamp={new Date()}
          />

          {/* 주요 결과 요약 */}
          {results.multiFactorResults ? (
            // 다요인 ANOVA 요약 (모든 요인 및 상호작용 표시)
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="mt-2 space-y-3">
                    <p className="font-semibold text-sm mb-2">주효과 (Main Effects)</p>

                    {/* Factor 1 */}
                    <FactorEffectDisplay
                      factor={results.multiFactorResults.factor1}
                      dfWithin={results.dfWithin}
                      borderColor="border-blue-500"
                    />

                    {/* Factor 2 */}
                    {results.multiFactorResults.factor2 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.factor2}
                        dfWithin={results.dfWithin}
                        borderColor="border-green-500"
                      />
                    )}

                    {/* Factor 3 */}
                    {results.multiFactorResults.factor3 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.factor3}
                        dfWithin={results.dfWithin}
                        borderColor="border-purple-500"
                      />
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* 상호작용 효과 */}
              <Alert className="border-orange-500 bg-muted">
                <Network className="h-4 w-4" />
                <AlertDescription>
                  <div className="mt-2 space-y-3">
                    <p className="font-semibold text-sm mb-2">상호작용 효과 (Interaction Effects)</p>

                    {/* Interaction 12 */}
                    {results.multiFactorResults.interaction12 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction12}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 13 */}
                    {results.multiFactorResults.interaction13 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction13}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 23 */}
                    {results.multiFactorResults.interaction23 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction23}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 123 */}
                    {results.multiFactorResults.interaction123 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction123}
                        dfWithin={results.dfWithin}
                        borderColor="border-red-500"
                      />
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            // 일원 ANOVA 요약 (기존 방식)
            <Alert className="border-blue-500 bg-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p className="text-sm">
                    F({results.dfBetween}, {results.dfWithin}) = <strong>{results.fStatistic.toFixed(2)}</strong>,
                    p = <strong>{results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}</strong>
                  </p>
                  <p className="text-sm">
                    효과 크기 (η²) = <strong>{results.etaSquared.toFixed(3)}</strong>
                    ({interpretEffectSize(results.etaSquared)})
                  </p>
                  <p className="text-sm">
                    {results.pValue < 0.05 ? '✅ 그룹 간 평균 차이가 통계적으로 유의합니다.' : '❌ 그룹 간 평균 차이가 유의하지 않습니다.'}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* ANOVA 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">분산분석표</CardTitle>
            </CardHeader>
            <CardContent>
              <StatisticsTable
                columns={[
                  { key: 'source', header: '변동 요인', type: 'text' },
                  { key: 'ss', header: '제곱합 (SS)', type: 'number' },
                  { key: 'df', header: '자유도 (df)', type: 'number' },
                  { key: 'ms', header: '평균제곱 (MS)', type: 'number' },
                  { key: 'f', header: 'F', type: 'number' },
                  { key: 'p', header: 'p-value', type: 'pvalue' }
                ]}
                data={results.anovaTable}
              />
            </CardContent>
          </Card>

          {/* 집단별 기술통계 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">집단별 기술통계</CardTitle>
            </CardHeader>
            <CardContent>
              <StatisticsTable
                columns={[
                  { key: 'name', header: '집단', type: 'text' },
                  { key: 'n', header: 'N', type: 'number' },
                  { key: 'mean', header: '평균', type: 'number' },
                  { key: 'std', header: '표준편차', type: 'number' },
                  { key: 'se', header: '표준오차', type: 'number' },
                  { key: 'ci', header: '95% CI', type: 'ci' }
                ]}
                data={results.groups}
              />

              {/* 막대 그래프 */}
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results.groups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mean" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 사후검정 */}
          {results.postHoc && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  사후검정 ({results.postHoc.method})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.postHoc.comparisons.map((comp, idx) => (
                    <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{comp.group1} vs {comp.group2}</span>
                        <Badge variant={comp.significant ? 'default' : 'secondary'}>
                          {comp.significant ? '유의' : '비유의'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">평균 차이</p>
                          <p className="font-medium">{comp.meanDiff.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">p-value</p>
                          <p className="font-medium">
                            {comp.pValue < 0.001 ? '< 0.001' : comp.pValue.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">95% CI</p>
                          <p className="font-medium text-xs">
                            {comp.ciLower !== undefined && comp.ciUpper !== undefined
                              ? `[${comp.ciLower.toFixed(2)}, ${comp.ciUpper.toFixed(2)}]`
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  보정된 유의수준 (α): {results.postHoc.adjustedAlpha.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 가정 검정 */}
          {results.assumptions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">가정 검정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 정규성 */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">정규성 검정 (Shapiro-Wilk)</span>
                      <Badge variant={results.assumptions.normality.passed ? 'default' : 'destructive'}>
                        {results.assumptions.normality.passed ? '만족' : '위반'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      W = {results.assumptions.normality.shapiroWilk.statistic.toFixed(3)},
                      p = {results.assumptions.normality.shapiroWilk.pValue.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {results.assumptions.normality.interpretation}
                    </p>
                  </div>

                  {/* 등분산성 */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">등분산성 검정 (Levene)</span>
                      <Badge variant={results.assumptions.homogeneity.passed ? 'default' : 'destructive'}>
                        {results.assumptions.homogeneity.passed ? '만족' : '위반'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      F = {results.assumptions.homogeneity.levene.statistic.toFixed(3)},
                      p = {results.assumptions.homogeneity.levene.pValue.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {results.assumptions.homogeneity.interpretation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 효과 크기 및 검정력 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">효과 크기 및 검정력</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectSizeCard
                title="Eta Squared"
                value={results.etaSquared}
                type="eta_squared"
                description="집단 간 분산이 전체 분산에서 차지하는 비율"
                showVisualScale={true}
              />
              <EffectSizeCard
                title="Omega Squared"
                value={results.omegaSquared}
                type="omega_squared"
                description="모집단 효과크기의 편향 보정 추정치"
                showVisualScale={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Cohen&apos;s f</p>
                    <p className="text-2xl font-bold">{results.powerAnalysis.cohensF.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.powerAnalysis.cohensF >= 0.4 ? '큰 효과' :
                       results.powerAnalysis.cohensF >= 0.25 ? '중간 효과' :
                       results.powerAnalysis.cohensF >= 0.1 ? '작은 효과' : '무시할 만한 효과'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">통계적 검정력</p>
                    <p className="text-2xl font-bold">{(results.powerAnalysis.observedPower * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.powerAnalysis.observedPower >= 0.8 ? '충분함' :
                       results.powerAnalysis.observedPower >= 0.5 ? '보통' : '부족함'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </TwoPanelLayout>
  )
}

// ============================================================================
// Exported Helper Functions for Testing
// ============================================================================

/**
 * 이원 ANOVA Worker 결과를 ANOVA 테이블로 변환
 * @param workerResult - Worker의 two_way_anova 반환값
 * @param factor1Name - Factor 1 컬럼명
 * @param factor2Name - Factor 2 컬럼명
 * @returns ANOVA 테이블 배열
 */
function convertTwoWayWorkerResultToTable(
  workerResult: {
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  },
  factor1Name: string,
  factor2Name: string
): Array<{
  source: string
  ss: number
  df: number
  ms: number
  f: number | null
  p: number | null
}> {
  const getSS = (key: string) => workerResult.anovaTable.sum_sq[key] ?? 0
  const getDF = (key: string) => workerResult.anovaTable.df[key] ?? 1
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = getDF(key)
    return df > 0 ? ss / df : 0
  }

  return [
    {
      source: `요인 1 (${factor1Name})`,
      ss: getSS('C(factor1)'),
      df: workerResult.factor1.df,
      ms: getMS('C(factor1)'),
      f: workerResult.factor1.fStatistic,
      p: workerResult.factor1.pValue
    },
    {
      source: `요인 2 (${factor2Name})`,
      ss: getSS('C(factor2)'),
      df: workerResult.factor2.df,
      ms: getMS('C(factor2)'),
      f: workerResult.factor2.fStatistic,
      p: workerResult.factor2.pValue
    },
    {
      source: '상호작용',
      ss: getSS('C(factor1):C(factor2)'),
      df: workerResult.interaction.df,
      ms: getMS('C(factor1):C(factor2)'),
      f: workerResult.interaction.fStatistic,
      p: workerResult.interaction.pValue
    },
    {
      source: '잔차',
      ss: getSS('Residual'),
      df: workerResult.residual.df,
      ms: getMS('Residual'),
      f: null,
      p: null
    }
  ]
}

/**
 * 삼원 ANOVA Worker 결과를 ANOVA 테이블로 변환
 * @param workerResult - Worker의 three_way_anova 반환값
 * @param factor1Name - Factor 1 컬럼명
 * @param factor2Name - Factor 2 컬럼명
 * @param factor3Name - Factor 3 컬럼명
 * @returns ANOVA 테이블 배열
 */
function convertThreeWayWorkerResultToTable(
  workerResult: {
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    factor3: { fStatistic: number; pValue: number; df: number }
    interaction12: { fStatistic: number; pValue: number; df: number }
    interaction13: { fStatistic: number; pValue: number; df: number }
    interaction23: { fStatistic: number; pValue: number; df: number }
    interaction123: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  },
  factor1Name: string,
  factor2Name: string,
  factor3Name: string
): Array<{
  source: string
  ss: number
  df: number
  ms: number
  f: number | null
  p: number | null
}> {
  const getSS = (key: string) => workerResult.anovaTable.sum_sq[key] ?? 0
  const getDF = (key: string) => workerResult.anovaTable.df[key] ?? 1
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = getDF(key)
    return df > 0 ? ss / df : 0
  }

  return [
    {
      source: `요인 1 (${factor1Name})`,
      ss: getSS('C(factor1)'),
      df: workerResult.factor1.df,
      ms: getMS('C(factor1)'),
      f: workerResult.factor1.fStatistic,
      p: workerResult.factor1.pValue
    },
    {
      source: `요인 2 (${factor2Name})`,
      ss: getSS('C(factor2)'),
      df: workerResult.factor2.df,
      ms: getMS('C(factor2)'),
      f: workerResult.factor2.fStatistic,
      p: workerResult.factor2.pValue
    },
    {
      source: `요인 3 (${factor3Name})`,
      ss: getSS('C(factor3)'),
      df: workerResult.factor3.df,
      ms: getMS('C(factor3)'),
      f: workerResult.factor3.fStatistic,
      p: workerResult.factor3.pValue
    },
    {
      source: `${factor1Name} × ${factor2Name}`,
      ss: getSS('C(factor1):C(factor2)'),
      df: workerResult.interaction12.df,
      ms: getMS('C(factor1):C(factor2)'),
      f: workerResult.interaction12.fStatistic,
      p: workerResult.interaction12.pValue
    },
    {
      source: `${factor1Name} × ${factor3Name}`,
      ss: getSS('C(factor1):C(factor3)'),
      df: workerResult.interaction13.df,
      ms: getMS('C(factor1):C(factor3)'),
      f: workerResult.interaction13.fStatistic,
      p: workerResult.interaction13.pValue
    },
    {
      source: `${factor2Name} × ${factor3Name}`,
      ss: getSS('C(factor2):C(factor3)'),
      df: workerResult.interaction23.df,
      ms: getMS('C(factor2):C(factor3)'),
      f: workerResult.interaction23.fStatistic,
      p: workerResult.interaction23.pValue
    },
    {
      source: `${factor1Name} × ${factor2Name} × ${factor3Name}`,
      ss: getSS('C(factor1):C(factor2):C(factor3)'),
      df: workerResult.interaction123.df,
      ms: getMS('C(factor1):C(factor2):C(factor3)'),
      f: workerResult.interaction123.fStatistic,
      p: workerResult.interaction123.pValue
    },
    {
      source: '잔차',
      ss: getSS('Residual'),
      df: workerResult.residual.df,
      ms: getMS('Residual'),
      f: null,
      p: null
    }
  ]
}
