'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { OrdinalRegressionVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatisticsTable, TableColumn, TableRow as StatTableRow } from '@/components/statistics/common/StatisticsTable'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
  Target
} from 'lucide-react'

interface DataRow {
  [key: string]: string | number
}

interface OrdinalRegressionResult {
  model_info: {
    model_type: string
    link_function: string
    n_observations: number
    n_predictors: number
    convergence: boolean
    iterations: number
  }
  coefficients: {
    variable: string
    coefficient: number
    std_error: number
    z_value: number
    p_value: number
    ci_lower: number
    ci_upper: number
    odds_ratio: number
    or_ci_lower: number
    or_ci_upper: number
  }[]
  thresholds: {
    threshold: string
    coefficient: number
    std_error: number
    z_value: number
    p_value: number
    ci_lower: number
    ci_upper: number
  }[]
  model_fit: {
    deviance: number
    aic: number
    bic: number
    log_likelihood: number
    pseudo_r_squared_mcfadden: number
    pseudo_r_squared_nagelkerke: number
    pseudo_r_squared_cox_snell: number
  }
  assumptions: {
    proportional_odds: {
    test_name: string
    test_statistic: number
    p_value: number
    assumption_met: boolean
    }
    multicollinearity: {
    variable: string
    vif: number
    tolerance: number
    }[]
  }
  predicted_probabilities: {
    observation: number
    category_1_prob: number
    category_2_prob: number
    category_3_prob: number
    predicted_category: number
    actual_category: number
  }[]
  classification_metrics: {
    accuracy: number
    confusion_matrix: number[][]
    category_labels: string[]
    precision: number[]
    recall: number[]
    f1_score: number[]
  }
}

export default function OrdinalRegressionPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('ordinal-regression')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<OrdinalRegressionResult>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [selectedDependent, setSelectedDependent] = useState<string>('')
  const [selectedIndependent, setSelectedIndependent] = useState<string[]>([])
  const [pyodideReady, setPyodideReady] = useState(false)

  // Breadcrumbs (useMemo)
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '서열 회귀분석', href: '/statistics/ordinal-regression' }
  ], [])

  // STEPS (useMemo, 0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '변수 선택', completed: currentStep > 2 },
    { id: 3, label: '결과 확인', completed: currentStep > 3 }
  ], [currentStep])

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

  const availableVariables = useMemo(() => {
    if (!uploadedData || uploadedData.data.length === 0) return []

    const firstRow = uploadedData.data[0]
    if (!firstRow || typeof firstRow !== 'object') return []

    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof (firstRow as Record<string, unknown>)[key] === 'number' ? 'numeric' : 'categorical'
    }))
  }, [uploadedData])

  const numericVariables = useMemo(() =>
    availableVariables.filter(v => v.type === 'numeric').map(v => v.name),
    [availableVariables]
  )

  const categoricalVariables = useMemo(() =>
    availableVariables.filter(v => v.type === 'categorical').map(v => v.name),
    [availableVariables]
  )

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'ordinal-regression'
  )

  const canProceedToAnalysis = useMemo(() => {
    return selectedDependent && selectedIndependent.length > 0
  }, [selectedDependent, selectedIndependent])

  const runOrdinalRegression = useCallback(async () => {
    if (!canProceedToAnalysis || !uploadedData || !pyodideReady) return

    actions.startAnalysis()

    try {
      const pyodideCore = PyodideCoreService.getInstance()

      // Call Worker 2 ordinal_regression method
      const workerResult = await pyodideCore.callWorkerMethod<OrdinalRegressionResult>(
        PyodideWorker.Hypothesis,
        'ordinal_regression',
        {
          dependent_var: selectedDependent,
          independent_vars: selectedIndependent,
          data: uploadedData.data as never
        }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(workerResult, 3)
    } catch (error) {
      console.error('분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[ordinal-regression] setError not available')
        return
      }

      actions.setError('분석 중 오류가 발생했습니다.')
    }
  }, [canProceedToAnalysis, uploadedData, pyodideReady, selectedDependent, selectedIndependent, actions])

  const handleVariableSelection = useCallback(() => {
    if (canProceedToAnalysis) {
      if (!actions.setCurrentStep) {
        console.error('[ordinal-regression] setCurrentStep not available')
        return
      }

      actions.setCurrentStep(2)
    }
  }, [canProceedToAnalysis, actions])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>서열 회귀분석이란?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            종속변수가 순서가 있는 범주형 변수(ordinal variable)일 때 사용하는 회귀분석 방법입니다.
            일반적인 다항 로지스틱 회귀분석과 달리 범주 간의 순서 정보를 활용합니다.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                주요 특징
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 순서형 종속변수 예측</li>
                <li>• 비례 오즈 가정 (Proportional Odds)</li>
                <li>• 로지스틱 회귀의 확장</li>
                <li>• 임계값(threshold) 추정</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                적용 예시
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 만족도 조사 (불만족→보통→만족)</li>
                <li>• 학점 예측 (F→D→C→B→A)</li>
                <li>• 질병 중증도 (경증→중등→중증)</li>
                <li>• 경제 상태 (하→중→상)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>일반 로지스틱 회귀 vs 서열 회귀</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">다항 로지스틱 회귀</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 명목형 범주 (순서 없음)</li>
                <li>• 각 범주별 독립적 모델링</li>
                <li>• 많은 모수 추정 필요</li>
                <li>• 순서 정보 무시</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">서열 회귀분석</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 순서형 범주 (순서 있음)</li>
                <li>• 단일 모델로 모든 범주 예측</li>
                <li>• 효율적인 모수 추정</li>
                <li>• 순서 정보 활용</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>분석 절차</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            '종속변수의 순서 확인',
            '독립변수 선택 및 전처리',
            '비례 오즈 가정 검정',
            '모델 적합 및 계수 해석',
            '모델 진단 및 예측 성능 평가'
          ].map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                {index + 1}
              </Badge>
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          서열 회귀분석의 핵심 가정은 <strong>비례 오즈 가정</strong>입니다.
          이는 독립변수의 효과가 모든 임계값에서 동일하다는 가정으로, 위반 시 부분 비례 오즈 모델을 고려해야 합니다.
        </AlertDescription>
      </Alert>
    </div>
  ), [])

  const renderDataUpload = useCallback(() => (
    <div className="space-y-6">
      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onPrevious={() => actions.setCurrentStep?.(0)}
      />

      <Card>
        <CardHeader>
          <CardTitle>서열 회귀분석 데이터 요구사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h5 className="font-medium text-sm mb-2">종속변수 (순서형)</h5>
            <div className="bg-white p-3 rounded border text-xs font-mono">
              <div>satisfaction | education_level | income_group</div>
              <div>1 (불만족)   | 1 (초졸)       | 1 (저소득)</div>
              <div>2 (보통)     | 2 (중졸)       | 2 (중소득)</div>
              <div>3 (만족)     | 3 (고졸)       | 3 (고소득)</div>
              <div>            | 4 (대졸)       |          </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-sm mb-2">독립변수 (연속형 또는 범주형)</h5>
            <div className="bg-white p-3 rounded border text-xs font-mono">
              <div>age | gender | experience | salary</div>
              <div>25  | 1      | 2.5       | 35000</div>
              <div>32  | 0      | 5.2       | 42000</div>
              <div>28  | 1      | 3.1       | 38000</div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            종속변수는 반드시 순서가 있는 범주형 변수여야 하며, 숫자 코딩 시 1, 2, 3... 순으로 입력해주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  ), [handleDataUpload, actions])

  const handleVariablesSelected = useCallback((mapping: unknown) => {
    // 1. Type guard
    if (!mapping || typeof mapping !== 'object') {
      console.error('[ordinal-regression] Invalid mapping')
      return
    }

    // 2. Extract dependent and independent variables
    let dependent = ''
    let independent: string[] = []

    if ('dependent' in mapping) {
      const dep = (mapping as { dependent: unknown }).dependent
      if (typeof dep === 'string') {
        dependent = dep
      }
    }

    if ('independent' in mapping) {
      const indep = (mapping as { independent: unknown }).independent
      if (Array.isArray(indep)) {
        independent = indep.filter((v): v is string => typeof v === 'string')
      }
    }

    // 3. Validate
    if (!dependent || independent.length === 0) {
      console.error('[ordinal-regression] Need dependent and at least 1 independent variable')
      return
    }

    // 4. Update state
    setSelectedDependent(dependent)
    setSelectedIndependent(independent)

    // 5. Move to next step
    if (!actions.setCurrentStep) {
      console.error('[ordinal-regression] setCurrentStep not available')
      return
    }
    actions.setCurrentStep(2)
  }, [actions])

  const renderVariableSelection = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>변수 선택 (종속변수 1개 + 독립변수 1개 이상)</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedData && (
            <VariableSelectorModern
              methodId="ordinal-regression"
              data={uploadedData.data}
              onVariablesSelected={handleVariablesSelected}
            />
          )}
          <p className="text-xs text-gray-500 mt-2">
            종속변수: 순서가 있는 범주형 변수 (예: 만족도, 학점, 중증도)
            <br />
            독립변수: 연속형 또는 범주형 (예: 나이, 소득, 성별, 교육수준)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>변수 선택 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>종속변수</strong>: 반드시 순서가 있는 범주형 (3개 이상 범주 권장)</li>
            <li>• <strong>독립변수</strong>: 연속형, 이진형, 범주형 모두 가능</li>
            <li>• <strong>표본 크기</strong>: 범주당 최소 10-15개 관측치 필요</li>
            <li>• <strong>다중공선성</strong>: VIF &lt; 10 권장</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  ), [uploadedData, handleVariablesSelected])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <div className="text-center py-8">
          <Button
            onClick={runOrdinalRegression}
            disabled={isAnalyzing || !pyodideReady}
            size="lg"
            className="flex items-center space-x-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>분석 중...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>서열 회귀분석 실행</span>
              </>
            )}
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="서열 회귀분석"
          analysisSubtitle="Ordinal Regression"
          fileName={uploadedData?.fileName}
          variables={[selectedDependent, ...selectedIndependent]}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <Card>
          <CardHeader>
            <CardTitle>서열 회귀분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="coefficients">계수</TabsTrigger>
                <TabsTrigger value="thresholds">임계값</TabsTrigger>
                <TabsTrigger value="assumptions">가정검정</TabsTrigger>
                <TabsTrigger value="predictions">예측</TabsTrigger>
                <TabsTrigger value="interpretation">해석</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
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
                          <span className="text-sm">연결 함수:</span>
                          <span className="text-sm font-medium">{results.model_info.link_function}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">관측치 수:</span>
                          <span className="text-sm font-medium">{results.model_info.n_observations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">예측변수 수:</span>
                          <span className="text-sm font-medium">{results.model_info.n_predictors}</span>
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
                          <span className="text-sm">McFadden R²:</span>
                          <span className="text-sm font-medium">{results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Nagelkerke R²:</span>
                          <span className="text-sm font-medium">{results.model_fit.pseudo_r_squared_nagelkerke.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">정확도:</span>
                          <span className="text-sm font-medium">{(results.classification_metrics.accuracy * 100).toFixed(1)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="coefficients" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">회귀 계수</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'variable', header: '변수', type: 'text' },
                      { key: 'coefficient', header: '계수', type: 'number' },
                      { key: 'std_error', header: '표준오차', type: 'number' },
                      { key: 'z_value', header: 'z', type: 'number' },
                      { key: 'p_value', header: 'p-value', type: 'pvalue' },
                      {
                        key: 'ci',
                        header: '95% CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const ci_lower = row?.ci_lower as number | undefined
                          const ci_upper = row?.ci_upper as number | undefined
                          if (ci_lower !== undefined && ci_upper !== undefined) {
                            return `[${ci_lower.toFixed(3)}, ${ci_upper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      },
                      { key: 'odds_ratio', header: '오즈비', type: 'number' },
                      {
                        key: 'or_ci',
                        header: '오즈비 CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const or_ci_lower = row?.or_ci_lower as number | undefined
                          const or_ci_upper = row?.or_ci_upper as number | undefined
                          if (or_ci_lower !== undefined && or_ci_upper !== undefined) {
                            return `[${or_ci_lower.toFixed(3)}, ${or_ci_upper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      }
                    ] as TableColumn[]}
                    data={results.coefficients.map(coef => ({
                      variable: coef.variable,
                      coefficient: coef.coefficient,
                      std_error: coef.std_error,
                      z_value: coef.z_value,
                      p_value: coef.p_value,
                      ci_lower: coef.ci_lower,
                      ci_upper: coef.ci_upper,
                      odds_ratio: coef.odds_ratio,
                      or_ci_lower: coef.or_ci_lower,
                      or_ci_upper: coef.or_ci_upper
                    }))}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">오즈비 시각화</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.coefficients} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                        <YAxis dataKey="variable" type="category" width={80} />
                        <Tooltip
                          formatter={(value: number) => [value.toFixed(3), 'Odds Ratio']}
                          labelFormatter={(label: string) => `Variable: ${label}`}
                        />
                        <Bar dataKey="odds_ratio" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="thresholds" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">임계값 (Cut-off Points)</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'threshold', header: '임계값', type: 'text' },
                      { key: 'coefficient', header: '계수', type: 'number' },
                      { key: 'std_error', header: '표준오차', type: 'number' },
                      { key: 'z_value', header: 'z', type: 'number' },
                      { key: 'p_value', header: 'p-value', type: 'pvalue' },
                      {
                        key: 'ci',
                        header: '95% CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const ci_lower = row?.ci_lower as number | undefined
                          const ci_upper = row?.ci_upper as number | undefined
                          if (ci_lower !== undefined && ci_upper !== undefined) {
                            return `[${ci_lower.toFixed(3)}, ${ci_upper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      }
                    ] as TableColumn[]}
                    data={results.thresholds.map(threshold => ({
                      threshold: threshold.threshold,
                      coefficient: threshold.coefficient,
                      std_error: threshold.std_error,
                      z_value: threshold.z_value,
                      p_value: threshold.p_value,
                      ci_lower: threshold.ci_lower,
                      ci_upper: threshold.ci_upper
                    }))}
                    compactMode
                  />

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      임계값은 순서형 범주들을 구분하는 기준점입니다.
                      예를 들어, &quot;불만족|보통&quot; 임계값은 불만족과 보통 사이의 경계를 나타냅니다.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>

              <TabsContent value="assumptions" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">비례 오즈 가정 검정</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">{results.assumptions.proportional_odds.test_name}</h5>
                            <p className="text-sm text-gray-600">
                              독립변수의 효과가 모든 임계값에서 동일한지 검정
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">
                              {results.assumptions.proportional_odds.test_statistic.toFixed(3)}
                            </div>
                            <PValueBadge value={results.assumptions.proportional_odds.p_value} />
                          </div>
                        </div>

                        <Alert>
                          {results.assumptions.proportional_odds.assumption_met ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <AlertDescription>
                            {results.assumptions.proportional_odds.assumption_met ? (
                              <span className="text-muted-foreground">
                                비례 오즈 가정이 충족됩니다. 표준 서열 회귀모델을 사용할 수 있습니다.
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                비례 오즈 가정이 위반되었습니다. 부분 비례 오즈 모델을 고려하세요.
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-3">다중공선성 진단</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'variable', header: '변수', type: 'text' },
                      { key: 'vif', header: 'VIF', type: 'number' },
                      { key: 'tolerance', header: 'Tolerance', type: 'number' },
                      {
                        key: 'judgment',
                        header: '판정',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const vifValue = row?.vif as number | undefined
                          if (vifValue === undefined) return '-'
                          return (
                            <Badge variant={vifValue < 5 ? "default" : vifValue < 10 ? "secondary" : "destructive"}>
                              {vifValue < 5 ? '양호' : vifValue < 10 ? '주의' : '위험'}
                            </Badge>
                          )
                        }
                      }
                    ] as TableColumn[]}
                    data={results.assumptions.multicollinearity.map(vif => ({
                      variable: vif.variable,
                      vif: vif.vif,
                      tolerance: vif.tolerance
                    }))}
                    compactMode
                  />
                </div>
              </TabsContent>

              <TabsContent value="predictions" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">예측 확률</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'observation', header: '관측치', type: 'number' },
                      {
                        key: 'category_1_prob',
                        header: '불만족 확률',
                        type: 'custom',
                        formatter: (value: unknown) => `${((value as number) * 100).toFixed(1)}%`
                      },
                      {
                        key: 'category_2_prob',
                        header: '보통 확률',
                        type: 'custom',
                        formatter: (value: unknown) => `${((value as number) * 100).toFixed(1)}%`
                      },
                      {
                        key: 'category_3_prob',
                        header: '만족 확률',
                        type: 'custom',
                        formatter: (value: unknown) => `${((value as number) * 100).toFixed(1)}%`
                      },
                      { key: 'predicted_category', header: '예측 범주', type: 'number' },
                      { key: 'actual_category', header: '실제 범주', type: 'number' },
                      {
                        key: 'accuracy',
                        header: '정확성',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const predicted = row?.predicted_category as number | undefined
                          const actual = row?.actual_category as number | undefined
                          if (predicted === undefined || actual === undefined) return '-'
                          return predicted === actual ? (
                            <Badge variant="default">정확</Badge>
                          ) : (
                            <Badge variant="secondary">틀림</Badge>
                          )
                        }
                      }
                    ] as TableColumn[]}
                    data={results.predicted_probabilities.slice(0, 10).map(pred => ({
                      observation: pred.observation,
                      category_1_prob: pred.category_1_prob,
                      category_2_prob: pred.category_2_prob,
                      category_3_prob: pred.category_3_prob,
                      predicted_category: pred.predicted_category,
                      actual_category: pred.actual_category
                    }))}
                    compactMode
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">혼동 행렬</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <StatisticsTable
                        columns={[
                          { key: 'actual', header: '실제\\예측', type: 'text' },
                          { key: 'pred_1', header: '불만족', type: 'number' },
                          { key: 'pred_2', header: '보통', type: 'number' },
                          { key: 'pred_3', header: '만족', type: 'number' }
                        ] as TableColumn[]}
                        data={results.classification_metrics.confusion_matrix.map((row, i) => ({
                          actual: results.classification_metrics.category_labels[i],
                          pred_1: row[0],
                          pred_2: row[1],
                          pred_3: row[2],
                          _className: ''
                        }))}
                        compactMode
                        bordered
                      />
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">분류 성능 지표</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>전체 정확도:</span>
                          <span className="font-medium">{(results.classification_metrics.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        {results.classification_metrics.category_labels.map((label, i) => (
                          <div key={i}>
                            <div className="text-sm font-medium text-gray-700">{label}</div>
                            <div className="ml-4 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>정밀도:</span>
                                <span>{(results.classification_metrics.precision[i] * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>재현율:</span>
                                <span>{(results.classification_metrics.recall[i] * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>F1-점수:</span>
                                <span>{(results.classification_metrics.f1_score[i] * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="interpretation" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">결과 해석</h4>
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>모델 적합도:</strong> McFadden R² = {results.model_fit.pseudo_r_squared_mcfadden.toFixed(3)}으로,
                        모델이 데이터의 {(results.model_fit.pseudo_r_squared_mcfadden * 100).toFixed(1)}%를 설명합니다.
                        일반적으로 0.2 이상이면 양호한 적합도로 판단됩니다.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>계수 해석:</strong> 각 독립변수의 오즈비가 1보다 크면 해당 변수가 증가할 때
                        더 높은 범주에 속할 가능성이 증가함을 의미합니다. 예를 들어,
                        교육수준의 오즈비가 {results.coefficients.find(c => c.variable === 'education')?.odds_ratio.toFixed(2)}라면,
                        교육수준이 한 단계 올라갈 때마다 더 높은 만족도를 가질 오즈가 {results.coefficients.find(c => c.variable === 'education')?.odds_ratio.toFixed(2)}배 증가합니다.
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <BarChart3 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>예측 성능:</strong> 모델의 전체 정확도는 {(results.classification_metrics.accuracy * 100).toFixed(1)}%입니다.
                        이는 실제 범주를 올바르게 예측한 비율을 나타냅니다.
                        각 범주별로 정밀도와 재현율을 확인하여 특정 범주에서의 예측 성능을 파악할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">실용적 함의</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>정책 결정:</strong> 각 변수의 영향력을 통해 만족도 향상을 위한 우선순위 설정</li>
                      <li>• <strong>자원 배분:</strong> 가장 효과적인 변수에 집중적으로 투자</li>
                      <li>• <strong>위험 관리:</strong> 낮은 만족도가 예측되는 집단에 대한 사전 대응</li>
                      <li>• <strong>성과 모니터링:</strong> 모델을 통한 지속적인 만족도 예측 및 평가</li>
                      <li>• <strong>개선 방안:</strong> 비례 오즈 가정 {results.assumptions.proportional_odds.assumption_met ? '충족' : '위반'} 상황에 따른 모델 개선 필요성</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }, [results, isAnalyzing, pyodideReady, runOrdinalRegression, uploadedData, selectedDependent, selectedIndependent, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="서열 회귀분석"
      analysisSubtitle="Ordinal Regression"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
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
    </TwoPanelLayout>
  )
}
