'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { PoissonVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { StatisticsTable, TableColumn } from '@/components/statistics/common/StatisticsTable'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  ScatterChart,
  Scatter
} from 'recharts'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
  Target,
  Hash,
  FileText,
  Shield,
  TrendingUp,
  Percent,
  MessageSquare,
  Table
} from 'lucide-react'

interface PoissonRegressionResult {
  modelInfo: {
    modelType: string
    linkFunction: string
    distribution: string
    nObservations: number
    nPredictors: number
    convergence: boolean
    iterations: number
    logLikelihood: number
  }
  coefficients: {
    variable: string
    coefficient: number
    stdError: number
    zValue: number
    pValue: number
    ciLower: number
    ciUpper: number
    expCoefficient: number
    irrCiLower: number
    irrCiUpper: number
  }[]
  modelFit: {
    deviance: number
    pearsonChi2: number
    aic: number
    bic: number
    pseudoRSquaredMcfadden: number
    pseudoRSquaredDeviance: number
    dispersionParameter: number
  }
  assumptions: {
    overdispersion: {
      testName: string
      statistic: number
      pValue: number
      dispersionRatio: number
      assumptionMet: boolean
    }
    linearity: {
      testName: string
      pValue: number
      assumptionMet: boolean
    }
    independence: {
      durbinWatson: number
      assumptionMet: boolean
    }
  }
  predictedValues: {
    observation: number
    actualCount: number
    predictedCount: number
    residual: number
    pearsonResidual: number
    devianceResidual: number
  }[]
  goodnessOfFit: {
    pearsonGof: {
      statistic: number
      df: number
      pValue: number
    }
    devianceGof: {
      statistic: number
      df: number
      pValue: number
    }
  }
  rate_ratios: {
    variable: string
    rate_ratio: number
    ciLower: number
    ciUpper: number
    interpretation: string
  }[]
}

export default function PoissonRegressionPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('poisson-regression')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<PoissonRegressionResult, PoissonVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: true
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'poisson-regression'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('overview')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '통계 분석', href: '/statistics' },
    { label: '포아송 회귀', href: '/statistics/poisson' }
  ], [])

  // 변수 선택 핸들러
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', independent: [] }
    const newDependent = current.dependent === varName ? '' : varName
    actions.setSelectedVariables?.({ ...current, dependent: newDependent })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  const handleIndependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', independent: [] }
    const currentIndependent = current.independent || []
    const newIndependent = currentIndependent.includes(varName)
      ? currentIndependent.filter(v => v !== varName)
      : [...currentIndependent, varName]
    actions.setSelectedVariables?.({ ...current, independent: newIndependent })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 분석 실행
  const runAnalysis = useCallback(async (vars: PoissonVariables) => {
    if (!uploadedData || !vars.dependent || !vars.independent || vars.independent.length === 0) {
      actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Call Worker 2 poisson_regression method
      const workerResult = await pyodideCore.callWorkerMethod<PoissonRegressionResult>(
        PyodideWorker.Hypothesis, // worker2-hypothesis
        'poisson_regression',
        {
          dependent_var: vars.dependent,
          independent_vars: vars.independent,
          data: uploadedData.data as never
        }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(workerResult)
    } catch (error) {
      console.error('분석 중 오류:', error)
      actions.setError?.('분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  // "다음 단계" 버튼 핸들러 (Step 2 → 3: 분석 실행)
  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent && selectedVariables?.independent && selectedVariables.independent.length > 0) {
      actions.setCurrentStep?.(3) // ✅ Step 변경
      await runAnalysis(selectedVariables) // ✅ 분석 실행
    }
  }, [selectedVariables, actions, runAnalysis])

  // STEPS 정의
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 1,
      label: '포아송 회귀 소개',
      completed: currentStep > 0
    },
    {
      id: 2,
      label: '데이터 업로드',
      completed: !!uploadedData
    },
    {
      id: 3,
      label: '변수 선택',
      completed: !!(selectedVariables?.dependent && selectedVariables?.independent && selectedVariables.independent.length > 0)
    },
    {
      id: 4,
      label: '결과 해석',
      completed: !!results
    }
  ], [currentStep, uploadedData, selectedVariables, results])

  // Step 0: 방법 소개
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            포아송 회귀분석 소개
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">포아송 회귀분석이란?</h3>
            <p className="text-muted-foreground mb-4">
              종속변수가 비음의 정수인 카운트 데이터(count data)를 분석하는 일반화선형모델(GLM)입니다.
              포아송 분포를 가정하며 로그 연결함수를 사용하여 발생률(rate)을 모델링합니다.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Calculator className="w-4 h-4 mr-2" />
                  주요 특징
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 카운트 데이터 전용</li>
                  <li>• 포아송 분포 가정</li>
                  <li>• 로그 연결함수 사용</li>
                  <li>• 발생률 비(Rate Ratio) 해석</li>
                </ul>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  적용 예시
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 질병 발생 건수</li>
                  <li>• 교통사고 발생 횟수</li>
                  <li>• 고객 방문 횟수</li>
                  <li>• 결함 발생 개수</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">포아송 회귀의 가정</h3>
            <div className="space-y-3">
              {[
                '포아송 분포: 평균과 분산이 같음',
                '독립성: 관측치들이 서로 독립',
                '선형성: 로그(평균)이 예측변수와 선형관계',
                '과산포 없음: 분산 = 평균 (과산포 시 음이항 회귀 고려)'
              ].map((assumption, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{assumption}</span>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              포아송 회귀에서 <strong>과산포(Overdispersion)</strong>가 발생하면 표준오차가 과소추정될 수 있습니다.
              이 경우 준-포아송 모델이나 음이항 회귀분석을 고려해야 합니다.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions', 'dataFormat', 'sampleData']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          title="분석 전 가정 확인"
        />
      )}
    </div>
  ), [methodMetadata, assumptionItems])

  // Step 1: 데이터 업로드
  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={createDataUploadHandler(
        actions.setUploadedData,
        () => {
          actions.setCurrentStep?.(1)
        },
        'poisson-regression'
      )}
      onPrevious={() => {
        if (actions.setCurrentStep) {
          actions.setCurrentStep(0)
        }
      }}
    />
  ), [actions])

  // Step 2: 변수 선택
  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.data.length > 0
      ? Object.keys(uploadedData.data[0]).filter(key => {
          const value = uploadedData.data[0][key as keyof typeof uploadedData.data[0]]
          return typeof value === 'number'
        })
      : []

    const isDependentSelected = selectedVariables?.dependent !== undefined && selectedVariables.dependent !== ''
    const isIndependentSelected = selectedVariables?.independent && selectedVariables.independent.length > 0

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              변수 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                종속변수 1개(카운트 데이터) + 독립변수 1개 이상 선택
              </AlertDescription>
            </Alert>

            {/* 종속변수 선택 */}
            <div className="space-y-2">
              <Label>종속변수 (카운트 데이터)</Label>
              <div className="flex flex-wrap gap-2">
                {numericColumns.map((col) => {
                  const isSelected = selectedVariables?.dependent === col
                  return (
                    <Badge
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/90 transition-colors"
                      onClick={() => handleDependentSelect(col)}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {col}
                    </Badge>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                비음의 정수 (0, 1, 2, 3, ...) - 예: 발생건수, 방문횟수
              </p>
            </div>

            {/* 독립변수 선택 */}
            {isDependentSelected && (
              <div className="space-y-2">
                <Label>독립변수 (1개 이상 선택)</Label>
                <div className="flex flex-wrap gap-2">
                  {numericColumns.filter(col => col !== selectedVariables?.dependent).map((col) => {
                    const isSelected = selectedVariables?.independent?.includes(col) || false
                    return (
                      <Badge
                        key={col}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/90 transition-colors"
                        onClick={() => handleIndependentSelect(col)}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {col}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  연속형 또는 범주형 (예: 나이, 성별, 소득, 지역)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {isDependentSelected && isIndependentSelected && (
          <Card>
            <CardHeader>
              <CardTitle>선택된 변수</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">종속변수</Label>
                <p className="font-medium">{selectedVariables.dependent}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">독립변수</Label>
                <p className="font-medium">{selectedVariables.independent.join(', ')}</p>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNextStep}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? '분석 중...' : '다음 단계'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, isAnalyzing, handleDependentSelect, handleIndependentSelect, handleNextStep])

  // Step 3: 결과 보기
  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              분석 결과가 없습니다. 변수를 선택하고 분석을 실행해주세요.
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="포아송 회귀분석"
          analysisSubtitle="Poisson Regression"
          fileName={uploadedData?.fileName}
          variables={[selectedVariables?.dependent || '', ...(selectedVariables?.independent || [])].filter(Boolean)}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <Card>
          <CardHeader>
            <CardTitle>포아송 회귀분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            
              <ContentTabs
              tabs={[
                { id: 'overview', label: '개요', icon: FileText },
                { id: 'coefficients', label: '계수', icon: Table },
                { id: 'assumptions', label: '가정검정', icon: Shield },
                { id: 'predictions', label: '예측', icon: TrendingUp },
                { id: 'ratios', label: '발생률비', icon: Percent },
                { id: 'interpretation', label: '해석', icon: MessageSquare }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

              <ContentTabsContent tabId="overview" show={activeResultTab === 'overview'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">모델 정보</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">모델 사양</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">모델 유형:</span>
                          <span className="text-sm font-medium">{results.modelInfo.modelType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">분포:</span>
                          <span className="text-sm font-medium">{results.modelInfo.distribution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">연결함수:</span>
                          <span className="text-sm font-medium">{results.modelInfo.linkFunction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">관측치 수:</span>
                          <span className="text-sm font-medium">{results.modelInfo.nObservations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">수렴:</span>
                          <span className="text-sm font-medium">
                            {results.modelInfo.convergence ? '성공' : '실패'} ({results.modelInfo.iterations}회)
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">모델 적합도</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">AIC:</span>
                          <span className="text-sm font-medium">{results.modelFit.aic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">BIC:</span>
                          <span className="text-sm font-medium">{results.modelFit.bic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">편차:</span>
                          <span className="text-sm font-medium">{results.modelFit.deviance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">McFadden R²:</span>
                          <span className="text-sm font-medium">{results.modelFit.pseudoRSquaredMcfadden.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">산포 계수:</span>
                          <span className="text-sm font-medium">{results.modelFit.dispersionParameter.toFixed(3)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="coefficients" show={activeResultTab === 'coefficients'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">회귀 계수</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'variable', header: '변수', type: 'text' },
                      { key: 'coefficient', header: '계수', type: 'number', formatter: (v) => v.toFixed(4) },
                      { key: 'stdError', header: '표준오차', type: 'number', formatter: (v) => v.toFixed(4) },
                      { key: 'zValue', header: 'z', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'pValue', header: 'p-value', type: 'pvalue' },
                      { key: 'ci', header: '95% CI', type: 'custom', formatter: (_, row) => `[${row.ciLower.toFixed(3)}, ${row.ciUpper.toFixed(3)}]` },
                      { key: 'expCoefficient', header: 'exp(β)', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'irr_ci', header: 'IRR CI', type: 'custom', formatter: (_, row) => `[${row.irrCiLower.toFixed(3)}, ${row.irrCiUpper.toFixed(3)}]` }
                    ] as TableColumn[]}
                    data={results.coefficients}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">발생률비(IRR) 시각화</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.coefficients.filter(c => c.variable !== 'intercept')} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                        <YAxis dataKey="variable" type="category" width={80} />
                        <RechartsTooltip
                          formatter={(value?: number) => [(value ?? 0).toFixed(3), 'IRR']}
                          labelFormatter={(label) => `Variable: ${label}`}
                        />
                        <Bar dataKey="expCoefficient" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <AssumptionTestCard
                  title="가정 검정 결과"
                  testType="poisson-regression"
                  tests={[
                    {
                      name: '과산포 검정 (Overdispersion)',
                      testName: results.assumptions.overdispersion.testName,
                      pValue: results.assumptions.overdispersion.pValue,
                      statistic: results.assumptions.overdispersion.dispersionRatio,
                      passed: results.assumptions.overdispersion.assumptionMet,
                      description: '분산이 평균과 같은지 검정합니다. 포아송 분포는 평균=분산을 가정합니다.',
                      details: `산포비 = ${results.assumptions.overdispersion.dispersionRatio.toFixed(3)}`,
                      recommendation: '과산포가 감지되면 준-포아송 모델이나 음이항 회귀분석을 고려하세요.',
                      severity: results.assumptions.overdispersion.assumptionMet ? 'low' : 'high'
                    },
                    {
                      name: '적합도 검정 (Pearson)',
                      testName: 'Pearson Chi-square',
                      pValue: results.goodnessOfFit.pearsonGof.pValue,
                      statistic: results.goodnessOfFit.pearsonGof.statistic,
                      passed: results.goodnessOfFit.pearsonGof.pValue > 0.05,
                      description: 'Pearson 카이제곱 적합도 검정입니다.',
                      details: `χ² = ${results.goodnessOfFit.pearsonGof.statistic.toFixed(2)}, df = ${results.goodnessOfFit.pearsonGof.df}`,
                      recommendation: 'p < 0.05이면 모델 적합도가 낮을 수 있습니다.',
                      severity: results.goodnessOfFit.pearsonGof.pValue > 0.05 ? 'low' : 'medium'
                    },
                    {
                      name: '적합도 검정 (Deviance)',
                      testName: 'Deviance',
                      pValue: results.goodnessOfFit.devianceGof.pValue,
                      statistic: results.goodnessOfFit.devianceGof.statistic,
                      passed: results.goodnessOfFit.devianceGof.pValue > 0.05,
                      description: 'Deviance 적합도 검정입니다.',
                      details: `Deviance = ${results.goodnessOfFit.devianceGof.statistic.toFixed(2)}, df = ${results.goodnessOfFit.devianceGof.df}`,
                      recommendation: 'p < 0.05이면 모델 개선이 필요할 수 있습니다.',
                      severity: results.goodnessOfFit.devianceGof.pValue > 0.05 ? 'low' : 'medium'
                    }
                  ]}
                />
              </ContentTabsContent>

              <ContentTabsContent tabId="predictions" show={activeResultTab === 'predictions'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">예측값 및 잔차 (상위 10개)</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'observation', header: '관측치', type: 'number' },
                      { key: 'actualCount', header: '실제값', type: 'number' },
                      { key: 'predictedCount', header: '예측값', type: 'number', formatter: (v) => v.toFixed(2) },
                      { key: 'residual', header: '잔차', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'pearsonResidual', header: 'Pearson 잔차', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'devianceResidual', header: '편차 잔차', type: 'number', formatter: (v) => v.toFixed(3) }
                    ] as TableColumn[]}
                    data={results.predictedValues.slice(0, 10)}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">실제값 vs 예측값</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={results.predictedValues.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="predictedCount" name="예측값" />
                        <YAxis dataKey="actualCount" name="실제값" />
                        <RechartsTooltip
                          formatter={(value?: number, name?: string) => [(value ?? 0).toFixed(2), name === 'actualCount' ? '실제값' : '예측값']}
                        />
                        <Scatter dataKey="actualCount" fill="#3b82f6" />
                        <Line dataKey="predictedCount" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="ratios" show={activeResultTab === 'ratios'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">발생률비 (Incidence Rate Ratio)</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'variable', header: '변수', type: 'text' },
                      { key: 'rate_ratio', header: '발생률비', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'ci', header: '95% CI', type: 'custom', formatter: (_, row) => `[${row.ciLower.toFixed(3)}, ${row.ciUpper.toFixed(3)}]` },
                      { key: 'interpretation', header: '해석', type: 'text' }
                    ] as TableColumn[]}
                    data={results.rate_ratios}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">발생률비 해석 가이드</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium mb-2">IRR = 1</h5>
                        <p className="text-muted-foreground">해당 변수가 발생률에 영향 없음</p>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">IRR &gt; 1</h5>
                        <p className="text-muted-foreground">해당 변수가 발생률을 증가시킴</p>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">IRR &lt; 1</h5>
                        <p className="text-muted-foreground">해당 변수가 발생률을 감소시킴</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
                <ResultInterpretation
                  result={{
                    summary: `모델 적합도: McFadden R² = ${results.modelFit.pseudoRSquaredMcfadden.toFixed(3)}로, 모델이 데이터의 변동을 ${(results.modelFit.pseudoRSquaredMcfadden * 100).toFixed(1)}% 설명합니다. ${results.modelFit.pseudoRSquaredMcfadden >= 0.1 ? '포아송 회귀 기준 양호한 적합도입니다.' : '적합도가 다소 낮을 수 있습니다.'}`,
                    details: `과산포 검정 결과 산포비 = ${results.assumptions.overdispersion.dispersionRatio.toFixed(3)}. ${results.assumptions.overdispersion.assumptionMet ? '포아송 분포 가정이 적절합니다.' : '과산포가 존재합니다.'} Deviance = ${results.modelFit.deviance.toFixed(2)}, AIC = ${results.modelFit.aic.toFixed(2)}.`,
                    recommendation: results.assumptions.overdispersion.assumptionMet
                      ? '현재 포아송 모델이 적절합니다. 발생률비(IRR)를 통해 각 예측변수의 효과를 해석하세요.'
                      : '과산포가 존재하므로 준-포아송(Quasi-Poisson) 모델이나 음이항 회귀(Negative Binomial Regression)를 고려해야 합니다.',
                    caution: results.modelFit.pseudoRSquaredMcfadden < 0.1
                      ? '모델 설명력이 낮습니다. 추가 예측변수 도입이나 다른 모델 고려가 필요합니다.'
                      : undefined
                  }}
                  title="포아송 회귀분석 결과 해석"
                />
              </ContentTabsContent>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [results, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="포아송 회귀분석"
      analysisSubtitle="Poisson Regression - 카운트 데이터 회귀분석"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => { actions.setCurrentStep?.(step) }}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
