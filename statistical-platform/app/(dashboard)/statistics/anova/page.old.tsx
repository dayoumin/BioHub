'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type {
  ANOVAVariables,
  PostHocComparison,
  PostHocResult,
  TwoWayANOVAResult,
  ThreeWayANOVAResult,
  RepeatedMeasuresANOVAResult
} from '@/types/statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  AlertCircle,
  Users,
  Layers,
  GitBranch,
  Network,
  Sparkles,
  FileText,
  Download,
  Activity
} from 'lucide-react'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { MethodSelectionCard } from '@/components/statistics/MethodSelectionCard'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// interface SelectedVariables {
//   dependent: string
//   independent: string[]
//   covariates?: string[]
//   [key: string]: string | string[] | undefined
// }
// → types/statistics.ts의 ANOVAVariables 사용

interface GroupResult {
  name: string
  mean: number
  std: number
  n: number
  se: number
  ci: [number, number]
}

// PostHocComparison 타입은 types/statistics.ts에서 import
// (Section 18: 타입 중앙 정의 규칙)

interface ANOVAResults {
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
}

export default function ANOVAPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('anova')
  }, [])

  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<ANOVAResults, ANOVAVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: results, isAnalyzing, error } = state

  // Page-specific state
  const [anovaType, setAnovaType] = useState<'oneWay' | 'twoWay' | 'threeWay' | 'repeated' | ''>('')

  // ANOVA 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: 'ANOVA 유형 선택',
      description: '분석 목적에 맞는 ANOVA 방법 선택',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 요인 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 확인',
      description: '분석 결과 및 해석',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    }
  ]

  // ANOVA 유형별 정보 (수산 관련 예시)
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
    actions.setCurrentStep(1)
  }, [actions])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'anova'
  )

  const handleVariableSelection = createVariableSelectionHandler<ANOVAVariables>(
    actions.setSelectedVariables,
    (variables) => {
      // 자동으로 분석 실행
      handleAnalysis(variables)
    },
    'anova'
  )

  /**
   * Two-Way ANOVA 실행
   * - Python Worker: two_way_anova(data_values, factor1_values, factor2_values)
   * - 타입: TwoWayANOVAResult (types/statistics.ts)
   */
  const runTwoWayANOVA = useCallback(async (
    variables: ANOVAVariables,
    data: Array<Record<string, string | number | null | undefined>>
  ) => {
    try {
      // 1️⃣ 배열 정규화: string | string[] → string[]
      const factorVars = Array.isArray(variables.factor)
        ? variables.factor
        : [variables.factor]

      // 변수 검증
      if (factorVars.length < 2) {
        throw new Error('Two-Way ANOVA는 2개의 요인 변수가 필요합니다')
      }

      const dependentVar = variables.dependent
      const factor1Var = factorVars[0]
      const factor2Var = factorVars[1]

      // 2️⃣ 데이터 추출 및 정렬
      const dataValues: number[] = []
      const factor1Values: (string | number)[] = []
      const factor2Values: (string | number)[] = []

      for (const row of data) {
        const depValue = row[dependentVar]
        const f1Value = row[factor1Var]
        const f2Value = row[factor2Var]

        // 유효한 데이터만 추가
        if (
          depValue !== null &&
          depValue !== undefined &&
          typeof depValue === 'number' &&
          !isNaN(depValue) &&
          f1Value !== null &&
          f1Value !== undefined &&
          f2Value !== null &&
          f2Value !== undefined
        ) {
          dataValues.push(depValue)
          factor1Values.push(f1Value)
          factor2Values.push(f2Value)
        }
      }

      // 3️⃣ 최소 데이터 검증
      if (dataValues.length < 4) {
        throw new Error(`Two-Way ANOVA는 최소 4개의 관측값이 필요합니다. 현재: ${dataValues.length}개`)
      }

      // 4️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<TwoWayANOVAResult>(
        3, // worker3-nonparametric-anova.py
        'two_way_anova',
        {
          data_values: dataValues,
          factor1_values: factor1Values,
          factor2_values: factor2Values
        }
      )

      // 5️⃣ 결과 저장 및 다음 단계로 이동
      actions.completeAnalysis(result as unknown as ANOVAResults, 3)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Two-Way ANOVA 분석 중 오류가 발생했습니다'
      actions.setError(errorMessage)
      throw err
    }
  }, [actions])

  /**
   * Repeated Measures ANOVA 실행
   * - Python Worker: repeated_measures_anova(data_matrix, subject_ids, time_labels)
   * - 타입: RepeatedMeasuresANOVAResult (types/statistics.ts)
   */
  const runRepeatedMeasuresANOVA = useCallback(async (
    variables: ANOVAVariables,
    data: Array<Record<string, string | number | null | undefined>>
  ) => {
    try {
      // 1️⃣ 변수 검증 (종속변수가 배열이어야 함)
      if (!variables.dependent || !Array.isArray(variables.dependent)) {
        throw new Error('반복측정 ANOVA는 종속변수가 배열이어야 합니다')
      }

      const dependentVars = variables.dependent as unknown as string[]

      if (dependentVars.length < 2) {
        throw new Error(`반복측정 ANOVA는 최소 2개의 측정 시점이 필요합니다. 현재: ${dependentVars.length}개`)
      }

      // 2️⃣ 데이터 추출 - 2D 매트릭스 구성
      const dataMatrix: number[][] = []
      const subjectIds: number[] = []
      const timeLabels: string[] = dependentVars.map((v, i) => `T${i + 1}`)

      for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
        const row = data[rowIdx]
        const rowData: number[] = []
        let hasValidData = true

        for (const depVar of dependentVars) {
          const value = row[depVar]

          if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
            rowData.push(value)
          } else {
            hasValidData = false
            break
          }
        }

        if (hasValidData && rowData.length === dependentVars.length) {
          dataMatrix.push(rowData)
          subjectIds.push(rowIdx + 1)
        }
      }

      // 3️⃣ 최소 데이터 검증
      if (dataMatrix.length < 2) {
        throw new Error(`반복측정 ANOVA는 최소 2명의 피험자가 필요합니다. 현재: ${dataMatrix.length}명`)
      }

      // 4️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<RepeatedMeasuresANOVAResult>(
        3, // worker3-nonparametric-anova.py
        'repeated_measures_anova',
        {
          data_matrix: dataMatrix,
          subject_ids: subjectIds,
          time_labels: timeLabels
        }
      )

      // 5️⃣ 결과 저장 및 다음 단계로 이동
      actions.completeAnalysis(result as unknown as ANOVAResults, 3)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Repeated Measures ANOVA 분석 중 오류가 발생했습니다'
      actions.setError(errorMessage)
      throw err
    }
  }, [actions])

  /**
   * Three-Way ANOVA 실행
   * - Python Worker: three_way_anova(data_values, factor1_values, factor2_values, factor3_values)
   * - 타입: ThreeWayANOVAResult (types/statistics.ts)
   */
  const runThreeWayANOVA = useCallback(async (
    variables: ANOVAVariables,
    data: Array<Record<string, string | number | null | undefined>>
  ) => {
    try {
      // 1️⃣ 배열 정규화: string | string[] → string[]
      const factorVars = Array.isArray(variables.factor)
        ? variables.factor
        : [variables.factor]

      // 변수 검증
      if (factorVars.length < 3) {
        throw new Error('Three-Way ANOVA는 3개의 요인 변수가 필요합니다')
      }

      const dependentVar = variables.dependent
      const factor1Var = factorVars[0]
      const factor2Var = factorVars[1]
      const factor3Var = factorVars[2]

      // 2️⃣ 데이터 추출
      const dataValues: number[] = []
      const factor1Values: (string | number)[] = []
      const factor2Values: (string | number)[] = []
      const factor3Values: (string | number)[] = []

      for (const row of data) {
        const depValue = row[dependentVar]
        const f1Value = row[factor1Var]
        const f2Value = row[factor2Var]
        const f3Value = row[factor3Var]

        // 유효한 데이터만 추가
        if (
          depValue !== null &&
          depValue !== undefined &&
          typeof depValue === 'number' &&
          !isNaN(depValue) &&
          f1Value !== null &&
          f1Value !== undefined &&
          f2Value !== null &&
          f2Value !== undefined &&
          f3Value !== null &&
          f3Value !== undefined
        ) {
          dataValues.push(depValue)
          factor1Values.push(f1Value)
          factor2Values.push(f2Value)
          factor3Values.push(f3Value)
        }
      }

      // 3️⃣ 최소 데이터 검증
      if (dataValues.length < 8) {
        throw new Error(`Three-Way ANOVA는 최소 8개의 관측값이 필요합니다. 현재: ${dataValues.length}개`)
      }

      // 4️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<ThreeWayANOVAResult>(
        3, // worker3-nonparametric-anova.py
        'three_way_anova',
        {
          data_values: dataValues,
          factor1_values: factor1Values,
          factor2_values: factor2Values,
          factor3_values: factor3Values
        }
      )

      // 5️⃣ 결과 저장 및 다음 단계로 이동
      actions.completeAnalysis(result as unknown as ANOVAResults, 3)

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Three-Way ANOVA 분석 중 오류가 발생했습니다'
      actions.setError(errorMessage)
      throw err
    }
  }, [actions])

  const handleAnalysis = useCallback(async (variables: ANOVAVariables) => {
    try {
      // 1️⃣ 분석 시작
      actions.startAnalysis()

      // 2️⃣ 업로드된 데이터 검증
      if (!uploadedData?.data || uploadedData.data.length === 0) {
        throw new Error('업로드된 데이터가 없습니다. 먼저 데이터를 업로드해주세요.')
      }

      // 3️⃣ ANOVA 유형 검증 (CRITICAL FIX)
      if (!anovaType) {
        throw new Error('ANOVA 유형을 선택해주세요')
      }

      // 요인 변수 개수 검증 (ANOVA 유형별 요구사항)
      const requiredFactorCount = anovaType === 'oneWay' ? 1 :
                                   anovaType === 'twoWay' ? 2 :
                                   anovaType === 'threeWay' ? 3 : 1

      if (!variables.factor || variables.factor.length === 0) {
        throw new Error('요인(factor) 변수를 선택해주세요')
      }

      if (variables.factor.length < requiredFactorCount) {
        const anovaTypeNames = {
          oneWay: '일원분산분석',
          twoWay: '이원분산분석',
          threeWay: '삼원분산분석',
          repeated: '반복측정분산분석'
        }
        throw new Error(
          `${anovaTypeNames[anovaType]}은(는) ${requiredFactorCount}개의 요인 변수가 필요합니다. ` +
          `현재 ${variables.factor.length}개 선택됨`
        )
      }

      // 4️⃣ ANOVA 타입별 분석 실행
      if (anovaType === 'twoWay') {
        // ========== Two-Way ANOVA ==========
        await runTwoWayANOVA(
          variables,
          uploadedData.data as Array<Record<string, string | number | null | undefined>>
        )
        return
      } else if (anovaType === 'threeWay') {
        // ========== Three-Way ANOVA ==========
        await runThreeWayANOVA(
          variables,
          uploadedData.data as Array<Record<string, string | number | null | undefined>>
        )
        return
      } else if (anovaType === 'repeated') {
        // ========== Repeated Measures ANOVA ==========
        await runRepeatedMeasuresANOVA(
          variables,
          uploadedData.data as Array<Record<string, string | number | null | undefined>>
        )
        return
      }

      // ========== One-Way ANOVA (기존 로직) ==========
      // 배열 정규화: string | string[] → string[]
      const factorVars = Array.isArray(variables.factor)
        ? variables.factor
        : [variables.factor]

      if (factorVars.length === 0) {
        throw new Error('최소 1개의 요인 변수가 필요합니다')
      }

      const groups: number[][] = []
      const groupNames: string[] = []

      const factorVariable = factorVars[0]
      const dependentVariable = variables.dependent

      // 그룹별로 데이터 분리
      const groupMap = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const factorValue = row[factorVariable]
        const dependentValue = row[dependentVariable]

        // 유효한 숫자 데이터만 사용
        if (
          dependentValue !== null &&
          dependentValue !== undefined &&
          typeof dependentValue === 'number' &&
          !isNaN(dependentValue) &&
          factorValue !== null &&
          factorValue !== undefined
        ) {
          const groupKey = String(factorValue)
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, [])
          }
          groupMap.get(groupKey)!.push(dependentValue)
        }
      }

      // Map을 배열로 변환
      for (const [key, values] of groupMap.entries()) {
        if (values.length >= 2) {
          groups.push(values)
          groupNames.push(String(key))
        }
      }

      // 최소 그룹 수 검증
      if (groups.length < 2) {
        throw new Error(`ANOVA는 최소 2개 이상의 그룹이 필요합니다. 현재 그룹 수: ${groups.length}`)
      }

      // 5️⃣ PyodideCore 초기화 및 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        fStatistic: number
        pValue: number
        df1: number
        df2: number
      }>(
        3,  // Worker 3 (ANOVA)
        'one_way_anova',
        { groups }
      )

      // 6️⃣ 그룹별 기술통계량 계산 (t-critical 값은 Python에서 계산)
      const groupStatsPromises = groups.map(async (groupData, idx) => {
        const n = groupData.length
        const mean = groupData.reduce((sum, v) => sum + v, 0) / n
        const variance = groupData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
        const std = Math.sqrt(variance)
        const se = std / Math.sqrt(n)

        // Python Worker에서 정확한 t-critical 값 가져오기
        const df = n - 1
        const tCriticalResult = await pyodideCore.callWorkerMethod<number>(
          3,
          'get_t_critical',
          { df, alpha: 0.05 }
        )
        const tCritical = tCriticalResult
        const ciMargin = tCritical * se

        return {
          name: groupNames[idx] || `Group ${idx + 1}`,
          mean: parseFloat(mean.toFixed(2)),
          std: parseFloat(std.toFixed(2)),
          n,
          se: parseFloat(se.toFixed(2)),
          ci: [
            parseFloat((mean - ciMargin).toFixed(2)),
            parseFloat((mean + ciMargin).toFixed(2))
          ] as [number, number]
        }
      })

      const groupStats = await Promise.all(groupStatsPromises)

      // 6️⃣ 효과크기 계산 (Eta-squared)
      const totalN = groups.reduce((sum, g) => sum + g.length, 0)
      const grandMean = groups.reduce((sum, g, idx) =>
        sum + g.reduce((gSum, v) => gSum + v, 0), 0
      ) / totalN

      const ssBetween = groups.reduce((sum, g, i) => {
        const groupMean = groupStats[i].mean
        return sum + g.length * Math.pow(groupMean - grandMean, 2)
      }, 0)

      const ssWithin = groups.reduce((sum, g, i) => {
        const groupMean = groupStats[i].mean
        return sum + g.reduce((gSum, v) => gSum + Math.pow(v - groupMean, 2), 0)
      }, 0)

      const ssTotal = ssBetween + ssWithin
      const etaSquared = ssBetween / ssTotal
      const omegaSquared = (ssBetween - result.df1 * (ssWithin / result.df2)) / (ssTotal + (ssWithin / result.df2))

      const msBetween = ssBetween / result.df1
      const msWithin = ssWithin / result.df2

      // 7️⃣ 통계 검정력 계산 (Python Worker 사용)
      const observedPower = await pyodideCore.callWorkerMethod<number>(
        3,
        'calculate_statistical_power',
        { f_statistic: result.fStatistic, df1: result.df1, df2: result.df2, alpha: 0.05 }
      )

      // 8️⃣ 가정 검정 (Shapiro-Wilk, Levene)
      const assumptionsResult = await pyodideCore.callWorkerMethod<{
        normality: {
          shapiroWilk: Array<{
            group: number
            statistic: number | null
            pValue: number | null
            passed: boolean | null
            warning?: string
          }>
          passed: boolean
          interpretation: string
        }
        homogeneity: {
          levene: {
            statistic: number
            pValue: number
          }
          passed: boolean
          interpretation: string
        }
      }>(
        3,
        'test_assumptions',
        { groups }
      )

      // 9️⃣ Post-hoc 테스트 (p < 0.05이고 그룹이 3개 이상일 때만)
      let postHocResult: {
        method: string
        comparisons: PostHocComparison[]
        adjustedAlpha: number
      } | undefined

      if (result.pValue < 0.05 && groups.length >= 3) {
        try {
          const tukeyResult = await pyodideCore.callWorkerMethod<{
            statistic: number | number[] | null
            pvalue: number | number[] | null
            confidence_interval: { lower: number[], upper: number[] } | null
            comparisons: PostHocComparison[]
          }>(
            3,
            'tukey_hsd',
            { groups }
          )

          // Worker가 반환한 comparisons 배열을 직접 사용
          postHocResult = {
            method: 'Tukey HSD',
            comparisons: tukeyResult.comparisons || [],
            adjustedAlpha: 0.05
          }
        } catch (err) {
          console.warn('Tukey HSD 계산 실패:', err)
          postHocResult = undefined
        }
      }

      // 🔟 결과 매핑
      const anovaResults: ANOVAResults = {
        fStatistic: result.fStatistic,
        pValue: result.pValue,
        dfBetween: result.df1,
        dfWithin: result.df2,
        msBetween: parseFloat(msBetween.toFixed(2)),
        msWithin: parseFloat(msWithin.toFixed(2)),
        etaSquared: parseFloat(etaSquared.toFixed(3)),
        omegaSquared: parseFloat(Math.max(0, omegaSquared).toFixed(3)),
        powerAnalysis: {
          observedPower: parseFloat(observedPower.toFixed(3)),
          effectSize: etaSquared > 0.14 ? 'large' : etaSquared > 0.06 ? 'medium' : 'small',
          cohensF: parseFloat(Math.sqrt(etaSquared / (1 - etaSquared)).toFixed(2))
        },
        groups: groupStats,
        postHoc: postHocResult,
        assumptions: {
          normality: {
            shapiroWilk: {
              statistic: assumptionsResult.normality.shapiroWilk[0]?.statistic || 0,
              pValue: assumptionsResult.normality.shapiroWilk[0]?.pValue || 1.0
            },
            passed: assumptionsResult.normality.passed,
            interpretation: assumptionsResult.normality.interpretation
          },
          homogeneity: {
            levene: assumptionsResult.homogeneity.levene,
            passed: assumptionsResult.homogeneity.passed,
            interpretation: assumptionsResult.homogeneity.interpretation
          }
        },
        anovaTable: [
          {
            source: 'Between Groups',
            ss: parseFloat(ssBetween.toFixed(2)),
            df: result.df1,
            ms: parseFloat(msBetween.toFixed(2)),
            f: parseFloat(result.fStatistic.toFixed(3)),
            p: result.pValue
          },
          {
            source: 'Within Groups',
            ss: parseFloat(ssWithin.toFixed(2)),
            df: result.df2,
            ms: parseFloat(msWithin.toFixed(2)),
            f: null,
            p: null
          },
          {
            source: 'Total',
            ss: parseFloat(ssTotal.toFixed(2)),
            df: result.df1 + result.df2,
            ms: null,
            f: null,
            p: null
          }
        ]
      }

      // ⚡ 완료
      actions.completeAnalysis(anovaResults, 3)
    } catch (err) {
      // 9️⃣ 에러 처리
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다'
      console.error('ANOVA Analysis Error:', err)
      actions.setError(errorMessage)
    }
  }, [uploadedData, actions, anovaType])

  const renderMethodSelection = () => (
    <StepCard
      title="ANOVA 분석 방법 선택"
      description="데이터 구조와 연구 목적에 맞는 ANOVA 방법을 선택하세요"
      icon={<BarChart3 className="w-5 h-5 text-primary" />}
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(anovaTypeInfo).map(([key, info]) => (
          <MethodSelectionCard
            key={key}
            methodInfo={info}
            isSelected={anovaType === key}
            onSelect={() => handleMethodSelect(key as 'oneWay' | 'twoWay' | 'threeWay' | 'repeated')}
          />
        ))}
      </div>

      {anovaType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {anovaTypeInfo[anovaType].title} 선택됨
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            다음 단계에서 데이터를 업로드해주세요.
          </p>
        </motion.div>
      )}
    </StepCard>
  )

  const renderDataUpload = () => (
    <StepCard
      title="데이터 업로드"
      description="분산 분석할 데이터 파일을 업로드하세요"
    >
      {anovaType && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <div>
              <span className="text-sm font-medium">{anovaTypeInfo[anovaType].title}</span>
              <span className="text-xs text-muted-foreground ml-2">({anovaTypeInfo[anovaType].subtitle})</span>
            </div>
          </div>
        </div>
      )}
      <DataUploadStep
        onNext={() => {}}
        onUploadComplete={handleDataUpload}
      />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) {
      return (
        <StepCard
          title="변수 선택"
          description="데이터가 업로드되지 않았습니다"
          icon={<Users className="w-5 h-5 text-primary" />}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>데이터 없음</AlertTitle>
            <AlertDescription>
              데이터를 먼저 업로드해주세요. Step 2로 돌아가서 데이터를 업로드하세요.
            </AlertDescription>
          </Alert>
          <Button onClick={() => actions.setCurrentStep(1)} className="mt-4">
            데이터 업로드로 돌아가기
          </Button>
        </StepCard>
      )
    }

    if (!uploadedData.data || uploadedData.data.length === 0) {
      return (
        <StepCard
          title="변수 선택"
          description="데이터를 불러올 수 없습니다"
          icon={<Users className="w-5 h-5 text-primary" />}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>데이터 오류</AlertTitle>
            <AlertDescription>
              업로드된 데이터가 비어있습니다. 올바른 CSV 파일인지 확인해주세요.
            </AlertDescription>
          </Alert>
        </StepCard>
      )
    }

    // Type guard for anovaType to ensure it's not empty string
    const currentAnovaType = anovaType as 'oneWay' | 'twoWay' | 'threeWay' | 'repeated'
    if (!currentAnovaType) {
      return (
        <StepCard
          title="변수 선택"
          description="분석 방법을 선택해주세요"
          icon={<Users className="w-5 h-5 text-primary" />}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>분석 방법 미선택</AlertTitle>
            <AlertDescription>
              Step 1에서 ANOVA 유형을 먼저 선택해주세요.
            </AlertDescription>
          </Alert>
          <Button onClick={() => actions.setCurrentStep(0)} className="mt-4">
            ANOVA 유형 선택으로 돌아가기
          </Button>
        </StepCard>
      )
    }

    const methodId = currentAnovaType === 'oneWay' ? 'one-way-anova' :
      currentAnovaType === 'twoWay' ? 'two-way-anova' :
      currentAnovaType === 'threeWay' ? 'three-way-anova' :
      'repeated-measures-anova'

    return (
      <StepCard
        title="변수 선택"
        description="분산분석에 사용할 종속변수와 요인을 선택하세요"
      >
        <VariableSelectorModern
          methodId={methodId}
          data={uploadedData.data}
          onVariablesSelected={(variables) => {
            const selectedVars: ANOVAVariables = {
              dependent: (variables.dependent as string) || '',
              factor: Array.isArray(variables.factor)
                ? variables.factor as string[]
                : variables.factor
                  ? [variables.factor as string]
                  : [],
              covariate: variables.covariate
                ? Array.isArray(variables.covariate)
                  ? variables.covariate as string[]
                  : [variables.covariate as string]
                : undefined
            }
            handleVariableSelection(selectedVars)
          }}
          onBack={() => actions.setCurrentStep(1)}
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const { groups, postHoc, assumptions, anovaTable, powerAnalysis } = results

    // 그룹 평균 비교 차트 데이터
    const groupMeansData = groups.map(g => ({
      name: g.name,
      mean: g.mean,
      ci_lower: g.ci[0],
      ci_upper: g.ci[1]
    }))


    return (
      <StepCard
        title="분산분석 결과"
        description="ANOVA 분석이 완료되었습니다"
      >
        <div className="space-y-4">
          {/* 주요 결과 요약 */}
          <Alert className={results.pValue < 0.05 ? "border-green-500 bg-muted" : "border-yellow-500 bg-muted"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>분석 결과</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  F({results.dfBetween}, {results.dfWithin}) = {results.fStatistic.toFixed(3)},
                  p = {results.pValue.toFixed(4)}
                </p>
                <p>
                  {results.pValue < 0.05
                    ? "✅ 그룹 간 평균에 통계적으로 유의한 차이가 있습니다 (p < 0.05)"
                    : "❌ 그룹 간 평균에 통계적으로 유의한 차이가 없습니다 (p ≥ 0.05)"}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* ANOVA 표 */}
          <StatisticsTable
            title="ANOVA Table"
            columns={[
              { key: 'source', header: 'Source', type: 'text', align: 'left' },
              { key: 'ss', header: 'SS', type: 'number', align: 'right', formatter: (v) => v.toFixed(2) },
              { key: 'df', header: 'df', type: 'number', align: 'right' },
              { key: 'ms', header: 'MS', type: 'number', align: 'right', formatter: (v) => v ? v.toFixed(2) : '-' },
              { key: 'f', header: 'F', type: 'number', align: 'right', formatter: (v) => v ? v.toFixed(3) : '-' },
              {
                key: 'p',
                header: 'p-value',
                type: 'pvalue',
                align: 'right',
                formatter: (v) => v !== null ? (
                  <Badge variant={v < 0.05 ? "default" : "secondary"}>
                    {v < 0.001 ? '< 0.001' : v.toFixed(4)}
                  </Badge>
                ) : '-'
              }
            ]}
            data={anovaTable}
            compactMode
          />

          {/* 그룹 평균 시각화 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">그룹별 평균 및 95% 신뢰구간</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupMeansData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="mean" fill="#3b82f6" />
                  {/* 에러바는 커스텀 렌더링 필요 */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 사후검정 결과 */}
          {results.pValue < 0.05 && postHoc && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">사후검정 결과 (Tukey HSD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {postHoc.comparisons.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          그룹 {comp.group1} vs 그룹 {comp.group2}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          평균 차이: {typeof comp.meanDiff === 'number' ? comp.meanDiff.toFixed(2) : 'N/A'}
                          {comp.ciLower !== undefined && comp.ciUpper !== undefined &&
                            ` [${comp.ciLower.toFixed(2)}, ${comp.ciUpper.toFixed(2)}]`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={comp.significant ? "default" : "secondary"}>
                          p = {typeof comp.pValue === 'number' ? comp.pValue.toFixed(4) : 'N/A'}
                        </Badge>
                        <p className="text-xs mt-1">
                          {comp.significant ? "유의함 ✓" : "유의하지 않음"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 효과크기 및 검정력 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">효과크기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Eta-squared (η²)</span>
                  <Badge>{results.etaSquared.toFixed(3)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Omega-squared (ω²)</span>
                  <Badge>{results.omegaSquared.toFixed(3)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cohen&apos;s f</span>
                  <Badge>{powerAnalysis.cohensF.toFixed(3)}</Badge>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">
                  효과크기: <strong>{powerAnalysis.effectSize}</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">가정 검정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assumptions ? (
                  <>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">정규성 (Shapiro-Wilk)</span>
                        <Badge variant={assumptions.normality.passed ? "default" : "destructive"}>
                          {assumptions.normality.passed ? "만족" : "위반"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        W = {assumptions.normality.shapiroWilk.statistic.toFixed(3)},
                        p = {assumptions.normality.shapiroWilk.pValue.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">등분산성 (Levene)</span>
                        <Badge variant={assumptions.homogeneity.passed ? "default" : "destructive"}>
                          {assumptions.homogeneity.passed ? "만족" : "위반"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        F = {assumptions.homogeneity.levene.statistic.toFixed(3)},
                        p = {assumptions.homogeneity.levene.pValue.toFixed(3)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    가정 검정 결과는 아직 구현되지 않았습니다.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center pt-4">
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled>
                  <FileText className="w-4 h-4 mr-2" />
                  보고서 생성
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>향후 제공 예정입니다</p>
              </TooltipContent>
            </UITooltip>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  결과 다운로드
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>향후 제공 예정입니다</p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>
      </StepCard>
    )
  }


  return (
    <StatisticsPageLayout
      title="ANOVA 분산분석"
      subtitle="Analysis of Variance - 세 개 이상 그룹의 평균 비교"
      icon={<BarChart3 className="w-6 h-6" />}
      selectedMethod={anovaType ? {
        name: anovaTypeInfo[anovaType].title,
        subtitle: anovaTypeInfo[anovaType].subtitle
      } : undefined}
      methodInfo={{
        formula: 'F = MS_between / MS_within',
        assumptions: ['정규성', '등분산성', '독립성', '무작위 표집'],
        sampleSize: '각 그룹 최소 20개 이상 권장',
        usage: '여러 그룹 간 평균 차이 검정'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => {
        if (selectedVariables) {
          handleAnalysis(selectedVariables)
        }
      }}
      onReset={() => {
        actions.reset()
        setAnovaType('')
      }}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {currentStep === 0 && renderMethodSelection()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}

      {/* 분석 중 로딩 모달 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">ANOVA 분산분석 실행 중...</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </StatisticsPageLayout>
  )
}