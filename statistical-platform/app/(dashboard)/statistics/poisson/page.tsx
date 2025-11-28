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
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
  Target,
  Hash
,
  FileText,
  Shield,
  TrendingUp,
  Percent,
  MessageSquare
,
  Table
} from 'lucide-react'

interface PoissonRegressionResult {
  model_info: {
    model_type: string
    link_function: string
    distribution: string
    n_observations: number
    n_predictors: number
    convergence: boolean
    iterations: number
    log_likelihood: number
  }
  coefficients: {
    variable: string
    coefficient: number
    std_error: number
    z_value: number
    p_value: number
    ci_lower: number
    ci_upper: number
    exp_coefficient: number
    irr_ci_lower: number
    irr_ci_upper: number
  }[]
  model_fit: {
    deviance: number
    pearson_chi2: number
    aic: number
    bic: number
    pseudo_r_squared_mcfadden: number
    pseudo_r_squared_deviance: number
    dispersion_parameter: number
  }
  assumptions: {
    overdispersion: {
      test_name: string
      statistic: number
      p_value: number
      dispersion_ratio: number
      assumption_met: boolean
    }
    linearity: {
      test_name: string
      p_value: number
      assumption_met: boolean
    }
    independence: {
      durbin_watson: number
      assumption_met: boolean
    }
  }
  predicted_values: {
    observation: number
    actual_count: number
    predicted_count: number
    residual: number
    pearson_residual: number
    deviance_residual: number
  }[]
  goodness_of_fit: {
    pearson_gof: {
      statistic: number
      df: number
      p_value: number
    }
    deviance_gof: {
      statistic: number
      df: number
      p_value: number
    }
  }
  rate_ratios: {
    variable: string
    rate_ratio: number
    ci_lower: number
    ci_upper: number
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
  ), [])

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
                          <span className="text-sm font-medium">{results.model_info.model_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">분포:</span>
                          <span className="text-sm font-medium">{results.model_info.distribution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">연결함수:</span>
                          <span className="text-sm font-medium">{results.model_info.link_function}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">관측치 수:</span>
                          <span className="text-sm font-medium">{results.model_info.n_observations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">수렴:</span>
                          <span className="text-sm font-medium">
                            {results.model_info.convergence ? '성공' : '실패'} ({results.model_info.iterations}회)
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
                          <span className="text-sm font-medium">{results.model_fit.aic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">BIC:</span>
                          <span className="text-sm font-medium">{results.model_fit.bic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">편차:</span>
                          <span className="text-sm font-medium">{results.model_fit.deviance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">McFadden R²:</span>
                          <span className="text-sm font-medium">{results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">산포 계수:</span>
                          <span className="text-sm font-medium">{results.model_fit.dispersion_parameter.toFixed(3)}</span>
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
                      { key: 'std_error', header: '표준오차', type: 'number', formatter: (v) => v.toFixed(4) },
                      { key: 'z_value', header: 'z', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'p_value', header: 'p-value', type: 'pvalue' },
                      { key: 'ci', header: '95% CI', type: 'custom', formatter: (_, row) => `[${row.ci_lower.toFixed(3)}, ${row.ci_upper.toFixed(3)}]` },
                      { key: 'exp_coefficient', header: 'exp(β)', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'irr_ci', header: 'IRR CI', type: 'custom', formatter: (_, row) => `[${row.irr_ci_lower.toFixed(3)}, ${row.irr_ci_upper.toFixed(3)}]` }
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
                          formatter={(value: number) => [value.toFixed(3), 'IRR']}
                          labelFormatter={(label: string) => `Variable: ${label}`}
                        />
                        <Bar dataKey="exp_coefficient" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">과산포 검정</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">{results.assumptions.overdispersion.test_name}</h5>
                            <p className="text-sm text-muted-foreground">
                              분산이 평균보다 과도하게 큰지 검정
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)}
                            </div>
                            <PValueBadge value={results.assumptions.overdispersion.p_value} />
                          </div>
                        </div>

                        <Alert>
                          {results.assumptions.overdispersion.assumption_met ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <AlertDescription>
                            {results.assumptions.overdispersion.assumption_met ? (
                              <span className="text-muted-foreground">
                                과산포가 없습니다. 포아송 모델이 적절합니다.
                                (산포비 = {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)})
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                과산포가 감지되었습니다. 준-포아송 모델이나 음이항 회귀를 고려하세요.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">적합도 검정</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Pearson 카이제곱</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">통계량:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.pearson_gof.statistic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">자유도:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.pearson_gof.df}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">p-value:</span>
                          <PValueBadge value={results.goodness_of_fit.pearson_gof.p_value} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">편차 검정</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">편차:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.deviance_gof.statistic.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">자유도:</span>
                          <span className="text-sm font-medium">{results.goodness_of_fit.deviance_gof.df}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">p-value:</span>
                          <PValueBadge value={results.goodness_of_fit.deviance_gof.p_value} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="predictions" show={activeResultTab === 'predictions'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">예측값 및 잔차 (상위 10개)</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'observation', header: '관측치', type: 'number' },
                      { key: 'actual_count', header: '실제값', type: 'number' },
                      { key: 'predicted_count', header: '예측값', type: 'number', formatter: (v) => v.toFixed(2) },
                      { key: 'residual', header: '잔차', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'pearson_residual', header: 'Pearson 잔차', type: 'number', formatter: (v) => v.toFixed(3) },
                      { key: 'deviance_residual', header: '편차 잔차', type: 'number', formatter: (v) => v.toFixed(3) }
                    ] as TableColumn[]}
                    data={results.predicted_values.slice(0, 10)}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">실제값 vs 예측값</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={results.predicted_values.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="predicted_count" name="예측값" />
                        <YAxis dataKey="actual_count" name="실제값" />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [value.toFixed(2), name === 'actual_count' ? '실제값' : '예측값']}
                        />
                        <Scatter dataKey="actual_count" fill="#3b82f6" />
                        <Line dataKey="predicted_count" stroke="#ef4444" strokeWidth={2} dot={false} />
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
                      { key: 'ci', header: '95% CI', type: 'custom', formatter: (_, row) => `[${row.ci_lower.toFixed(3)}, ${row.ci_upper.toFixed(3)}]` },
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
                <div>
                  <h4 className="font-medium mb-3">결과 해석</h4>
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>모델 적합도:</strong> McFadden R² = {results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}으로,
                        모델이 데이터의 변동을 {(results.model_fit.pseudo_r_squared_mcfadden * 100).toFixed(1)}% 설명합니다.
                        포아송 회귀에서 0.1 이상이면 양호한 적합도로 판단됩니다.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <Calculator className="h-4 w-4" />
                      <AlertDescription>
                        <strong>과산포 검정:</strong> 산포비 = {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)}로,
                        {results.assumptions.overdispersion.assumption_met ?
                          '포아송 분포 가정이 적절합니다.' :
                          '과산포가 존재하므로 준-포아송 모델이나 음이항 회귀를 고려해야 합니다.'
                        }
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <BarChart3 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>주요 결과:</strong> {results.rate_ratios.find(r => r.variable === 'treatment')?.rate_ratio &&
                        `치료 효과는 발생률을 ${((1 - results.rate_ratios.find(r => r.variable === 'treatment')!.rate_ratio) * 100).toFixed(1)}% 감소시킵니다`}
                        {results.rate_ratios.find(r => r.variable === 'age')?.rate_ratio &&
                        `. 연령은 1세 증가당 발생률을 ${((results.rate_ratios.find(r => r.variable === 'age')!.rate_ratio - 1) * 100).toFixed(1)}% 증가시킵니다.`}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">실용적 함의</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>임상 적용:</strong> 치료 효과의 크기와 통계적 유의성을 정량화</li>
                      <li>• <strong>위험도 평가:</strong> 위험요인들의 상대적 영향력 비교</li>
                      <li>• <strong>정책 결정:</strong> 개입 우선순위 결정을 위한 근거 제공</li>
                      <li>• <strong>예측 모델:</strong> 새로운 조건에서의 발생률 예측</li>
                      <li>• <strong>모델 개선:</strong> 과산포 문제 시 모델 수정 방향 제시</li>
                    </ul>
                  </div>
                </div>
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
