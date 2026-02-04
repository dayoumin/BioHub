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
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { StatisticsTable, TableColumn, TableRow as StatTableRow } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import type { InterpretationResult } from '@/lib/interpretation/engine'
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
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
  Target,
  FileText,
  Gauge,
  Shield,
  MessageSquare,
  Table
} from 'lucide-react'

interface DataRow {
  [key: string]: string | number
}

interface OrdinalRegressionResult {
  modelInfo: {
    modelType: string
    linkFunction: string
    nObservations: number
    nPredictors: number
    convergence: boolean
    iterations: number
  }
  coefficients: {
    variable: string
    coefficient: number
    stdError: number
    zValue: number
    pValue: number
    ciLower: number
    ciUpper: number
    oddsRatio: number
    orCiLower: number
    orCiUpper: number
  }[]
  thresholds: {
    threshold: string
    coefficient: number
    stdError: number
    zValue: number
    pValue: number
    ciLower: number
    ciUpper: number
  }[]
  modelFit: {
    deviance: number
    aic: number
    bic: number
    logLikelihood: number
    pseudoRSquaredMcfadden: number
    pseudoRSquaredNagelkerke: number
    pseudoRSquaredCoxSnell: number
  }
  assumptions: {
    proportionalOdds: {
    testName: string
    testStatistic: number
    pValue: number
    assumptionMet: boolean
    }
    multicollinearity: {
    variable: string
    vif: number
    tolerance: number
    }[]
  }
  predictedProbabilities: {
    observation: number
    category_1_prob: number
    category_2_prob: number
    category_3_prob: number
    predictedCategory: number
    actualCategory: number
  }[]
  classificationMetrics: {
    accuracy: number
    confusionMatrix: number[][]
    categoryLabels: string[]
    precision: number[]
    recall: number[]
    f1Score: number[]
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

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'ordinal-regression'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('overview')
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
            
              <ContentTabs
              tabs={[
                { id: 'overview', label: '개요', icon: FileText },
                { id: 'coefficients', label: '계수', icon: Table },
                { id: 'thresholds', label: '임계값', icon: Gauge },
                { id: 'assumptions', label: '가정검정', icon: Shield },
                { id: 'predictions', label: '예측', icon: TrendingUp },
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
                          <span className="text-sm">연결 함수:</span>
                          <span className="text-sm font-medium">{results.modelInfo.linkFunction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">관측치 수:</span>
                          <span className="text-sm font-medium">{results.modelInfo.nObservations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">예측변수 수:</span>
                          <span className="text-sm font-medium">{results.modelInfo.nPredictors}</span>
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
                          <span className="text-sm">McFadden R²:</span>
                          <span className="text-sm font-medium">{results.modelFit.pseudoRSquaredMcfadden.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Nagelkerke R²:</span>
                          <span className="text-sm font-medium">{results.modelFit.pseudoRSquaredNagelkerke.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">정확도:</span>
                          <span className="text-sm font-medium">{(results.classificationMetrics.accuracy * 100).toFixed(1)}%</span>
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
                      { key: 'coefficient', header: '계수', type: 'number' },
                      { key: 'stdError', header: '표준오차', type: 'number' },
                      { key: 'zValue', header: 'z', type: 'number' },
                      { key: 'pValue', header: 'p-value', type: 'pvalue' },
                      {
                        key: 'ci',
                        header: '95% CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const ciLower = row?.ciLower as number | undefined
                          const ciUpper = row?.ciUpper as number | undefined
                          if (ciLower !== undefined && ciUpper !== undefined) {
                            return `[${ciLower.toFixed(3)}, ${ciUpper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      },
                      { key: 'oddsRatio', header: '오즈비', type: 'number' },
                      {
                        key: 'or_ci',
                        header: '오즈비 CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const orCiLower = row?.orCiLower as number | undefined
                          const orCiUpper = row?.orCiUpper as number | undefined
                          if (orCiLower !== undefined && orCiUpper !== undefined) {
                            return `[${orCiLower.toFixed(3)}, ${orCiUpper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      }
                    ] as TableColumn[]}
                    data={results.coefficients.map(coef => ({
                      variable: coef.variable,
                      coefficient: coef.coefficient,
                      stdError: coef.stdError,
                      zValue: coef.zValue,
                      pValue: coef.pValue,
                      ciLower: coef.ciLower,
                      ciUpper: coef.ciUpper,
                      oddsRatio: coef.oddsRatio,
                      orCiLower: coef.orCiLower,
                      orCiUpper: coef.orCiUpper
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
                        <Bar dataKey="oddsRatio" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="thresholds" show={activeResultTab === 'thresholds'} className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">임계값 (Cut-off Points)</h4>
                  <StatisticsTable
                    columns={[
                      { key: 'threshold', header: '임계값', type: 'text' },
                      { key: 'coefficient', header: '계수', type: 'number' },
                      { key: 'stdError', header: '표준오차', type: 'number' },
                      { key: 'zValue', header: 'z', type: 'number' },
                      { key: 'pValue', header: 'p-value', type: 'pvalue' },
                      {
                        key: 'ci',
                        header: '95% CI',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const ciLower = row?.ciLower as number | undefined
                          const ciUpper = row?.ciUpper as number | undefined
                          if (ciLower !== undefined && ciUpper !== undefined) {
                            return `[${ciLower.toFixed(3)}, ${ciUpper.toFixed(3)}]`
                          }
                          return '-'
                        }
                      }
                    ] as TableColumn[]}
                    data={results.thresholds.map(threshold => ({
                      threshold: threshold.threshold,
                      coefficient: threshold.coefficient,
                      stdError: threshold.stdError,
                      zValue: threshold.zValue,
                      pValue: threshold.pValue,
                      ciLower: threshold.ciLower,
                      ciUpper: threshold.ciUpper
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
              </ContentTabsContent>

              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
                <AssumptionTestCard
                  title="서열 회귀분석 가정 검정"
                  tests={[
                    {
                      name: '비례 오즈 가정',
                      description: '독립변수의 효과가 모든 임계값에서 동일한지 검정합니다',
                      testName: results.assumptions.proportionalOdds.testName,
                      pValue: results.assumptions.proportionalOdds.pValue,
                      passed: results.assumptions.proportionalOdds.assumptionMet,
                      details: results.assumptions.proportionalOdds.assumptionMet
                        ? '비례 오즈 가정이 충족됩니다. 표준 서열 회귀모델을 사용할 수 있습니다.'
                        : '비례 오즈 가정이 위반되었습니다. 부분 비례 오즈 모델을 고려하세요.',
                      recommendation: !results.assumptions.proportionalOdds.assumptionMet
                        ? '부분 비례 오즈 모델 또는 다항 로지스틱 회귀 고려'
                        : undefined,
                      severity: !results.assumptions.proportionalOdds.assumptionMet ? 'high' : undefined
                    } satisfies AssumptionTest,
                    ...results.assumptions.multicollinearity.map(vif => ({
                      name: `다중공선성: ${vif.variable}`,
                      description: `VIF = ${vif.vif.toFixed(2)}, Tolerance = ${vif.tolerance.toFixed(3)}`,
                      pValue: null,
                      passed: vif.vif < 10,
                      details: vif.vif < 5
                        ? '다중공선성 문제 없음'
                        : vif.vif < 10
                          ? '주의 필요 - 다중공선성 존재 가능'
                          : '심각한 다중공선성 - 변수 제거 권장',
                      recommendation: vif.vif >= 10 ? '해당 변수 제거 또는 결합 고려' : undefined,
                      severity: vif.vif >= 10 ? 'high' : vif.vif >= 5 ? 'medium' : undefined
                    } satisfies AssumptionTest))
                  ]}
                  testType="ordinal-regression"
                  showRecommendations={true}
                  showDetails={true}
                />
              </ContentTabsContent>

              <ContentTabsContent tabId="predictions" show={activeResultTab === 'predictions'} className="space-y-4">
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
                      { key: 'predictedCategory', header: '예측 범주', type: 'number' },
                      { key: 'actualCategory', header: '실제 범주', type: 'number' },
                      {
                        key: 'accuracy',
                        header: '정확성',
                        type: 'custom',
                        formatter: (_value: unknown, row: StatTableRow) => {
                          const predicted = row?.predictedCategory as number | undefined
                          const actual = row?.actualCategory as number | undefined
                          if (predicted === undefined || actual === undefined) return '-'
                          return predicted === actual ? (
                            <Badge variant="default">정확</Badge>
                          ) : (
                            <Badge variant="secondary">틀림</Badge>
                          )
                        }
                      }
                    ] as TableColumn[]}
                    data={results.predictedProbabilities.slice(0, 10).map(pred => ({
                      observation: pred.observation,
                      category_1_prob: pred.category_1_prob,
                      category_2_prob: pred.category_2_prob,
                      category_3_prob: pred.category_3_prob,
                      predictedCategory: pred.predictedCategory,
                      actualCategory: pred.actualCategory
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
                        data={results.classificationMetrics.confusionMatrix.map((row, i) => ({
                          actual: results.classificationMetrics.categoryLabels[i],
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
                          <span className="font-medium">{(results.classificationMetrics.accuracy * 100).toFixed(1)}%</span>
                        </div>
                        {results.classificationMetrics.categoryLabels.map((label, i) => (
                          <div key={i}>
                            <div className="text-sm font-medium text-gray-700">{label}</div>
                            <div className="ml-4 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>정밀도:</span>
                                <span>{(results.classificationMetrics.precision[i] * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>재현율:</span>
                                <span>{(results.classificationMetrics.recall[i] * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>F1-점수:</span>
                                <span>{(results.classificationMetrics.f1Score[i] * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ContentTabsContent>

              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
                {/* 주요 계수에 대한 신뢰구간 표시 */}
                {results.coefficients.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">주요 계수의 95% 신뢰구간</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {results.coefficients.slice(0, 3).map((coef, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">{coef.variable}</p>
                          <ConfidenceIntervalDisplay
                            lower={coef.ciLower}
                            upper={coef.ciUpper}
                            estimate={coef.coefficient}
                            level={0.95}
                            showVisualization={true}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 결과 해석 */}
                <ResultInterpretation
                  result={{
                    title: '서열 회귀분석 결과 해석',
                    summary: `McFadden R² = ${results.modelFit.pseudoRSquaredMcfadden.toFixed(3)}으로 모델이 데이터의 ${(results.modelFit.pseudoRSquaredMcfadden * 100).toFixed(1)}%를 설명합니다. 모델의 전체 예측 정확도는 ${(results.classificationMetrics.accuracy * 100).toFixed(1)}%입니다.`,
                    statistical: `Ordinal Logistic Regression: n = ${results.modelInfo.nObservations}, AIC = ${results.modelFit.aic.toFixed(2)}, BIC = ${results.modelFit.bic.toFixed(2)}, McFadden R² = ${results.modelFit.pseudoRSquaredMcfadden.toFixed(3)}, Nagelkerke R² = ${results.modelFit.pseudoRSquaredNagelkerke.toFixed(3)}, 정확도 = ${(results.classificationMetrics.accuracy * 100).toFixed(1)}%`,
                    practical: results.modelFit.pseudoRSquaredMcfadden >= 0.2
                      ? `McFadden R² ≥ 0.2로 양호한 모델 적합도를 보입니다. 각 독립변수의 오즈비를 통해 종속변수 범주에 미치는 영향력을 해석할 수 있습니다. 비례 오즈 가정이 ${results.assumptions.proportionalOdds.assumptionMet ? '충족되어 표준 서열 회귀모델이 적합합니다' : '위반되어 부분 비례 오즈 모델을 고려해야 합니다'}.`
                      : `McFadden R² < 0.2로 모델 설명력이 낮습니다. 추가 예측 변수를 고려하거나 다른 모델링 방법을 검토하세요. 비례 오즈 가정이 ${results.assumptions.proportionalOdds.assumptionMet ? '충족됩니다' : '위반되었습니다'}.`
                  } satisfies InterpretationResult}
                />
              </ContentTabsContent>
            </div>
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
