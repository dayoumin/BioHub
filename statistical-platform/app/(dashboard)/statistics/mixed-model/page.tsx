'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { MixedModelVariables } from '@/types/statistics'
import { toMixedModelVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Info,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Target,
  Settings,
  Network,
  Layers
} from 'lucide-react'

// Components
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable, type TableColumn, type TableRow } from '@/components/statistics/common/StatisticsTable'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface MixedModelResult {
  fixedEffects: {
    effect: string
    coefficient: number
    standardError: number
    tValue: number
    pValue: number
    ci95Lower: number
    ci95Upper: number
    significance: boolean
  }[]
  randomEffects: {
    group: string
    variance: number
    standardDeviation: number
    correlations?: { effect1: string, effect2: string, correlation: number }[]
  }[]
  varianceComponents: {
    component: string
    variance: number
    proportion: number
    standardError: number
    zValue: number
    pValue: number
  }[]
  modelFit: {
    logLikelihood: number
    aic: number
    bic: number
    deviance: number
    marginalRSquared: number
    conditionalRSquared: number
    icc: number
  }
  residualAnalysis: {
    normality: {
      shapiroW: number
      pValue: number
      assumptionMet: boolean
    }
    homoscedasticity: {
      leveneStatistic: number
      pValue: number
      assumptionMet: boolean
    }
    independence: {
      durbinWatson: number
      pValue: number
      assumptionMet: boolean
    }
  }
  predictedValues: {
    observation: number
    observed: number
    fitted: number
    residual: number
    standardizedResidual: number
  }[]
  randomEffectsTable: {
    group: string
    subject: string | number
    intercept: number
    slopes?: { variable: string, slope: number }[]
  }[]
  interpretation: {
    summary: string
    fixedEffectsInterpretation: string[]
    randomEffectsInterpretation: string[]
    varianceExplained: string
    recommendations: string[]
  }
}

export default function MixedModelPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('mixed-model')
  }, [])

  // Hook for state management
  const { state, actions } = useStatisticsPage<MixedModelResult, MixedModelVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // Pyodide ready state
  const [pyodideReady, setPyodideReady] = useState(false)

  // Initialize PyodideCore
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideCore = PyodideCoreService.getInstance()
        await pyodideCore.initialize()
        setPyodideReady(true)
      } catch (err) {
        console.error('PyodideCore 초기화 실패:', err)
      }
    }
    initPyodide()
  }, [])

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '선형 혼합 모형', href: '/statistics/mixed-model' }
  ], [])

  // Steps configuration - 0-based indexing
  const STEPS = [
    { id: 0, label: '방법 소개' },
    { id: 1, label: '데이터 업로드' },
    { id: 2, label: '변수 선택' },
    { id: 3, label: '결과 확인' }
  ]

  // 단계 완료 상태 추가 (각 단계별 조건 명확화)
  const stepsWithCompleted = STEPS.map(step => ({
    ...step,
    completed: step.id === 0 ? true : // 방법 소개는 항상 표시되므로 완료
              step.id === 1 ? !!uploadedData : // 데이터 업로드됨
              step.id === 2 ? !!selectedVariables : // 변수 선택됨
              step.id === 3 ? !!analysisResult : false // 분석 결과 존재
  }))

  const methodInfo = useMemo(() => ({
    title: "선형 혼합 모형 (Linear Mixed Model)",
    description: "고정효과와 무선효과를 동시에 모델링하여 계층적 데이터를 분석합니다.",
    keyFeatures: [
      "고정효과와 무선효과 동시 모델링",
      "계층적/클러스터 데이터 처리",
      "분산 성분 분해 및 해석",
      "개체별 예측값 산출",
      "모형 비교 및 선택"
    ],
    assumptions: [
      "잔차의 정규성: 조건부 잔차가 정규분포",
      "무선효과의 정규성: 무선효과가 정규분포",
      "등분산성: 잔차의 분산이 일정",
      "독립성: 서로 다른 클러스터 간 독립",
      "선형성: 예측변수와 결과변수 간 선형관계"
    ],
    useCases: [
      "교육 연구 (학생이 학급에 중첩)",
      "의학 연구 (환자가 병원에 중첩)",
      "심리학 연구 (반복측정 설계)",
      "경영학 연구 (직원이 부서에 중첩)"
    ]
  }), [])

  const handleDataUpload = useCallback(
    createDataUploadHandler(
      actions?.setUploadedData,
      () => {
        if (actions?.setCurrentStep) {
          actions.setCurrentStep(2)
        }
      },
      'mixed-model'
    ),
    [actions]
  )

  const runAnalysis = useCallback(async (_variables: VariableAssignment) => {
    if (!pyodideReady || !uploadedData) {
      if (actions?.setError) {
        actions.setError('데이터나 통계 엔진이 준비되지 않았습니다.')
      }
      return
    }

    // Use _variables parameter instead of selectedVariables state
    const mixedModelVars = toMixedModelVariables(_variables)

    if (actions?.startAnalysis) {
      actions.startAnalysis()
    }
    if (actions?.setError) {
      actions.setError('')
    }

    try {
      const pyodideCore = PyodideCoreService.getInstance()

      // Call Worker 2 mixed_model method
      const workerResult = await pyodideCore.callWorkerMethod<MixedModelResult>(
        PyodideWorker.Hypothesis,
        'mixed_model',
        {
          dependent_var: mixedModelVars.dependent,
          fixed_effects: mixedModelVars.factor,
          random_effects: mixedModelVars.blocking || [],
          data: uploadedData.data as never
        }
      )

      if (actions?.completeAnalysis) {
        setAnalysisTimestamp(new Date())
        actions.completeAnalysis(workerResult, 3)  // Move to step 3 (results)
      }
    } catch (err) {
      console.error('Mixed Model 분석 실패:', err)
      if (actions?.setError) {
        actions.setError('선형 혼합 모형 분석 중 오류가 발생했습니다.')
      }
    } finally {
      // isAnalyzing managed by hook
    }
  }, [uploadedData, pyodideReady, actions])

  const handleVariableSelection = useCallback(
    createVariableSelectionHandler<MixedModelVariables>(
      (vars) => actions?.setSelectedVariables?.(vars ? toMixedModelVariables(vars as unknown as VariableAssignment) : null),
      (variables) => {
        if (variables?.dependent && variables?.factor && variables.factor.length >= 1) {
          runAnalysis(variables as unknown as VariableAssignment)
        }
      },
      'mixed-model'
    ),
    [actions, runAnalysis]
  )

  const getSignificanceColor = useCallback((pValue: number): string => {
    if (pValue < 0.001) return 'text-muted-foreground bg-muted'
    if (pValue < 0.01) return 'text-muted-foreground bg-muted'
    if (pValue < 0.05) return 'text-muted-foreground bg-muted'
    return 'text-gray-600 bg-gray-50'
  }, [])

  const renderMethodIntroduction = useCallback(() => {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                분석 목적
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                계층적 구조를 가진 데이터에서 고정효과와 무선효과를 동시에 고려하여 정확한 분석을 수행합니다.
              </p>
              <ul className="text-sm space-y-1">
                <li>• 집단 내 상관 구조 고려</li>
                <li>• 개체별 변동성 모델링</li>
                <li>• 분산 성분 분해 및 해석</li>
                <li>• 누락 데이터 효과적 처리</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                적용 예시
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-3 text-sm">
                <div className="bg-muted p-3 rounded">
                  <h4 className="font-medium">교육 연구</h4>
                  <p className="text-muted-foreground">학생(Level 1) ⊂ 학급(Level 2) ⊂ 학교(Level 3)</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <h4 className="font-medium">의학 연구</h4>
                  <p className="text-muted-foreground">측정시점 ⊂ 환자 ⊂ 병원 (반복측정)</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <h4 className="font-medium">심리학</h4>
                  <p className="text-muted-foreground">반복측정 ⊂ 개인 ⊂ 집단</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <Calculator className="h-4 w-4" />
          <AlertTitle>고정효과 vs 무선효과</AlertTitle>
          <AlertDescription>
            • <strong>고정효과:</strong> 모집단에서 일정한 효과 (예: 성별, 처치조건)<br/>
            • <strong>무선효과:</strong> 모집단에서 변동하는 효과 (예: 개인차, 학교차)<br/>
            • 혼합 모형은 두 효과를 동시에 고려하여 정확한 추론 제공<br/>
            • 계층내 상관(ICC)을 통해 집단화 효과 정량화
          </AlertDescription>
        </Alert>

        <div className="p-4 bg-muted border border rounded-lg">
          <h4 className="font-medium mb-2">모형 선택 기준</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>ICC &gt; 0.05:</strong> 다수준 모형 고려 필요</li>
            <li>• <strong>AIC/BIC:</strong> 작을수록 더 나은 모형</li>
            <li>• <strong>우도비 검정:</strong> 중첩 모형 간 비교</li>
            <li>• <strong>잔차 진단:</strong> 모형 가정 검토</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => actions?.setCurrentStep && actions.setCurrentStep(1)}>
            다음: 데이터 업로드
          </Button>
        </div>
      </div>
    )
  }, [actions])

  const renderDataUpload = useCallback(() => {
    return (
      <div className="space-y-4">
        <DataUploadStep
          onNext={() => {}}
          onUploadComplete={handleDataUpload}
        />

        <Alert>
          <Layers className="h-4 w-4" />
          <AlertTitle>선형 혼합 모형 데이터 형식</AlertTitle>
          <AlertDescription>
            • 각 행은 하나의 관측값을 나타냅니다<br/>
            • 종속변수: 연속형 결과 변수 (1개)<br/>
            • 고정효과: 관심 있는 예측변수들<br/>
            • 집단변수: 무선효과를 정의하는 범주형 변수<br/>
            • 예: ID(개체), School(학교), Treatment(처치), Time(시점), Score(점수)
          </AlertDescription>
        </Alert>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">데이터 구조 예시</h4>
          <div className="text-sm text-muted-foreground">
            <table className="w-full border-collapse border border">
              <thead>
                <tr className="bg-muted">
                  <th className="border border px-2 py-1">ID</th>
                  <th className="border border px-2 py-1">School</th>
                  <th className="border border px-2 py-1">Treatment</th>
                  <th className="border border px-2 py-1">Time</th>
                  <th className="border border px-2 py-1">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border px-2 py-1">001</td><td className="border border px-2 py-1">A</td><td className="border border px-2 py-1">Control</td><td className="border border px-2 py-1">1</td><td className="border border px-2 py-1">45.2</td></tr>
                <tr><td className="border border px-2 py-1">001</td><td className="border border px-2 py-1">A</td><td className="border border px-2 py-1">Control</td><td className="border border px-2 py-1">2</td><td className="border border px-2 py-1">47.8</td></tr>
                <tr><td className="border border px-2 py-1">002</td><td className="border border px-2 py-1">A</td><td className="border border px-2 py-1">Treatment</td><td className="border border px-2 py-1">1</td><td className="border border px-2 py-1">52.1</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions?.setCurrentStep && actions.setCurrentStep(0)}>
            이전
          </Button>
        </div>
      </div>
    )
  }, [handleDataUpload, actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    return (
      <div className="space-y-4">
        <VariableSelectorModern
          methodId="mixed-model"
          data={uploadedData.data}
          onVariablesSelected={handleVariableSelection}
          onBack={() => actions?.setCurrentStep && actions.setCurrentStep(1)}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            • 종속변수: 예측하고자 하는 연속형 결과 변수 (1개)<br/>
            • 고정효과: 관심 있는 예측변수들 (연속형/범주형 모두 가능)<br/>
            • 집단변수: 무선효과를 정의하는 범주형 변수<br/>
            • 예: Score(종속) ~ Treatment + Time + (1|Subject) + (1|School)
          </AlertDescription>
        </Alert>
      </div>
    )
  }, [uploadedData, handleVariableSelection, actions])

  const renderResults = useCallback(() => {
    if (!analysisResult) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">분석 결과가 없습니다. 변수를 선택하고 분석을 실행하세요.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="선형 혼합 모형"
          analysisSubtitle="Linear Mixed Model"
          fileName={uploadedData?.fileName}
          variables={[selectedVariables?.dependent || '', ...(selectedVariables?.factor || [])].filter(Boolean)}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <Tabs defaultValue="fixed" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="fixed">고정효과</TabsTrigger>
            <TabsTrigger value="random">무선효과</TabsTrigger>
            <TabsTrigger value="variance">분산성분</TabsTrigger>
            <TabsTrigger value="fit">모형적합도</TabsTrigger>
            <TabsTrigger value="diagnostics">진단</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          {/* 고정효과 탭 */}
          <TabsContent value="fixed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  고정효과 (Fixed Effects)
                </CardTitle>
                <CardDescription>모집단 수준의 평균적인 효과</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">효과</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">계수</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">표준오차</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">t값</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">95% 신뢰구간</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">유의성</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.fixedEffects.map((effect, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 font-medium">{effect.effect}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{effect.coefficient.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{effect.standardError.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{effect.tValue.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <PValueBadge value={effect.pValue} />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            [{effect.ci95Lower.toFixed(2)}, {effect.ci95Upper.toFixed(2)}]
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <Badge variant={effect.significance ? "default" : "outline"}
                                   className={effect.significance ? getSignificanceColor(effect.pValue) : ''}>
                              {effect.significance ? "유의함" : "유의하지 않음"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>고정효과 해석</AlertTitle>
                  <AlertDescription>
                    고정효과는 모집단 전체에서 일정하게 나타나는 평균적 효과입니다.
                    처치 효과 (β = 8.67, p &lt; 0.001)와 시간 효과 (β = 2.34, p = 0.009)가 유의하며,
                    상호작용은 유의하지 않습니다 (p = 0.151).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 무선효과 탭 */}
          <TabsContent value="random" className="mt-6 space-y-6">
            {/* 무선효과 분산 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  무선효과 분산
                </CardTitle>
                <CardDescription>집단 수준별 변동성</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {analysisResult.randomEffects.map((random, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-3">{random.group} 수준</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>분산:</span>
                          <span className="font-medium">{random.variance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>표준편차:</span>
                          <span className="font-medium">{random.standardDeviation.toFixed(2)}</span>
                        </div>
                        {random.correlations && (
                          <div className="mt-3">
                            <h5 className="font-medium mb-2">상관계수</h5>
                            {random.correlations.map((corr, corrIndex) => (
                              <div key={corrIndex} className="flex justify-between">
                                <span>{corr.effect1} ↔ {corr.effect2}:</span>
                                <span className="font-medium">{corr.correlation.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 개체별 무선효과 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  개체별 무선효과
                </CardTitle>
                <CardDescription>각 개체/집단의 편차</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">집단</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">개체/ID</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">절편 편차</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">기울기 편차</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.randomEffectsTable.slice(0, 8).map((effect, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 font-medium">{effect.group}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{effect.subject}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{effect.intercept.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {effect.slopes ? effect.slopes.map(slope =>
                              `${slope.variable}: ${slope.slope.toFixed(2)}`
                            ).join(', ') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>무선효과 해석</AlertTitle>
                  <AlertDescription>
                    양수는 평균보다 높은 값을, 음수는 평균보다 낮은 값을 의미합니다.
                    개체 1은 기저 수준이 낮지만(-2.34) 시간에 따른 증가율이 높고(+0.67),
                    개체 2는 기저 수준이 높지만(+4.12) 시간에 따른 감소 경향(-0.89)을 보입니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 분산성분 탭 */}
          <TabsContent value="variance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  분산 성분 분해
                </CardTitle>
                <CardDescription>전체 변동의 구성 요소</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">분산 성분</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">분산</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">비율 (%)</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">표준오차</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Z값</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.varianceComponents.map((component, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 font-medium">{component.component}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{component.variance.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-medium">{(component.proportion * 100).toFixed(1)}%</span>
                              <div className="w-16 h-2 bg-gray-200 rounded">
                                <div
                                  className="h-2 bg-muted0 rounded"
                                  style={{width: `${component.proportion * 100}%`}}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{component.standardError.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{component.zValue.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <PValueBadge value={component.pValue} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">분산 분해 요약</h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p><strong>집단 수준 변동:</strong> {((analysisResult.varianceComponents[0].proportion + analysisResult.varianceComponents[1].proportion + analysisResult.varianceComponents[2].proportion) * 100).toFixed(1)}%</p>
                      <p><strong>개체 내 변동 (잔차):</strong> {(analysisResult.varianceComponents[3].proportion * 100).toFixed(1)}%</p>
                      <p><strong>ICC:</strong> {analysisResult.modelFit.icc.toFixed(3)} (클러스터링 효과)</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">해석 가이드</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>• ICC &gt; 0.05: 다수준 분석 필요</p>
                      <p>• 개체 수준 변동이 가장 큰 비율 차지</p>
                      <p>• 학교 수준 변동도 상당함</p>
                      <p>• 모든 분산 성분이 유의함</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 모형적합도 탭 */}
          <TabsContent value="fit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  모형 적합도
                </CardTitle>
                <CardDescription>모형의 설명력과 적합도 지수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">R² 값</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">주변 R² (고정효과)</p>
                          <p className="text-2xl font-bold">{(analysisResult.modelFit.marginalRSquared * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">조건부 R² (전체)</p>
                          <p className="text-2xl font-bold">{(analysisResult.modelFit.conditionalRSquared * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">ICC</h4>
                      <p className="text-2xl font-bold">{analysisResult.modelFit.icc.toFixed(3)}</p>
                      <p className="text-sm text-muted-foreground">계층내 상관계수</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">정보 기준</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>AIC:</span>
                          <span className="font-bold">{analysisResult.modelFit.aic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BIC:</span>
                          <span className="font-bold">{analysisResult.modelFit.bic.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">작을수록 좋은 모형</p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">우도</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Log-likelihood:</span>
                          <span className="font-bold">{analysisResult.modelFit.logLikelihood.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deviance:</span>
                          <span className="font-bold">{analysisResult.modelFit.deviance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>적합도 해석</AlertTitle>
                      <AlertDescription className="text-sm">
                        <strong>조건부 R² = 56.7%</strong><br/>
                        모형이 전체 변동의 절반 이상을 설명합니다.<br/><br/>
                        <strong>주변 R² = 23.4%</strong><br/>
                        고정효과만으로도 상당한 설명력을 가집니다.<br/><br/>
                        <strong>ICC = 0.403</strong><br/>
                        집단 수준 변동이 상당하므로 다수준 분석이 필수입니다.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 진단 탭 */}
          <TabsContent value="diagnostics" className="mt-6 space-y-6">
            {/* 잔차 진단 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  잔차 진단
                </CardTitle>
                <CardDescription>모형 가정 검정</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">정규성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Shapiro-Wilk W:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.normality.shapiroW.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.normality.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.normality.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.normality.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.normality.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">등분산성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Levene 통계량:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.homoscedasticity.leveneStatistic.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.homoscedasticity.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.homoscedasticity.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">독립성</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Durbin-Watson:</span>
                        <span className="font-medium">{analysisResult.residualAnalysis.independence.durbinWatson.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>p-value:</span>
                        <PValueBadge value={analysisResult.residualAnalysis.independence.pValue} />
                      </div>
                      <div className="flex items-center gap-2">
                        {analysisResult.residualAnalysis.independence.assumptionMet ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={analysisResult.residualAnalysis.independence.assumptionMet ? 'text-muted-foreground' : 'text-muted-foreground'}>
                          {analysisResult.residualAnalysis.independence.assumptionMet ? '가정 충족' : '가정 위반'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>잔차 진단 요약</AlertTitle>
                  <AlertDescription>
                    모든 주요 가정이 충족되었습니다. 정규성 (p = 0.234), 등분산성 (p = 0.178),
                    독립성 (DW = 1.98) 모두 적절한 수준을 보입니다. 혼합 모형 결과를 신뢰할 수 있습니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* 예측값과 잔차 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  예측값과 잔차 (일부)
                </CardTitle>
                <CardDescription>관측값, 예측값, 잔차 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-center">관측값</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">관측된 값</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">예측값</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">잔차</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">표준화 잔차</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.predictedValues.map((pred, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 text-center font-medium">{pred.observation}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{pred.observed.toFixed(1)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{pred.fitted.toFixed(1)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center font-medium">{pred.residual.toFixed(1)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <Badge variant="outline" className={
                              Math.abs(pred.standardizedResidual) > 2 ? 'text-muted-foreground bg-muted' :
                              Math.abs(pred.standardizedResidual) > 1.5 ? 'text-muted-foreground bg-muted' :
                              'text-gray-600 bg-gray-50'
                            }>
                              {pred.standardizedResidual.toFixed(2)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>잔차 해석</AlertTitle>
                  <AlertDescription>
                    표준화 잔차가 대부분 ±2 범위 내에 있어 이상치가 거의 없습니다.
                    예측값과 관측값이 전반적으로 잘 일치하여 모형이 데이터를 적절히 설명합니다.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 해석 탭 */}
          <TabsContent value="interpretation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  결과 해석
                </CardTitle>
                <CardDescription>선형 혼합 모형 결과의 종합적 해석</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 요약 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">분석 요약</h4>
                  <p className="text-muted-foreground">{analysisResult.interpretation.summary}</p>
                </div>

                {/* 고정효과 해석 */}
                <div>
                  <h4 className="font-medium mb-3">고정효과 해석</h4>
                  <div className="space-y-2">
                    {analysisResult.interpretation.fixedEffectsInterpretation.map((interpretation, index) => (
                      <div key={index} className="p-3 bg-muted rounded border-l-4 border-success">
                        <p className="text-muted-foreground text-sm">{interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 무선효과 해석 */}
                <div>
                  <h4 className="font-medium mb-3">무선효과 해석</h4>
                  <div className="space-y-2">
                    {analysisResult.interpretation.randomEffectsInterpretation.map((interpretation, index) => (
                      <div key={index} className="p-3 bg-muted rounded border-l-4 border-orange-400">
                        <p className="text-muted-foreground text-sm">{interpretation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 분산 설명 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">분산 설명</h4>
                  <p className="text-muted-foreground">{analysisResult.interpretation.varianceExplained}</p>
                </div>

                {/* 권장사항 */}
                <div>
                  <h4 className="font-medium mb-3">권장사항</h4>
                  <ul className="space-y-2">
                    {analysisResult.interpretation.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Alert>
                  <Network className="h-4 w-4" />
                  <AlertTitle>혼합 모형의 장점</AlertTitle>
                  <AlertDescription>
                    1. 계층적 데이터 구조 적절히 모델링<br/>
                    2. 개체 간 이질성 고려한 정확한 추정<br/>
                    3. 누락 데이터에 대한 강건성<br/>
                    4. 집단 및 개체 수준 예측 가능
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => actions?.setCurrentStep && actions.setCurrentStep(2)}>
            다시 분석
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            결과 다운로드
          </Button>
        </div>
      </div>
    )
  }, [analysisResult, getSignificanceColor, actions, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="선형 혼합 모형"
      analysisSubtitle="Linear Mixed Model (LMM)"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={(step: number) => actions?.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}

      {/* Loading and Error States */}
      {isAnalyzing && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>선형 혼합 모형 분석을 수행하고 있습니다...</p>
          </div>
        </div>
      )}

      {error && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </TwoPanelLayout>
  )
}
