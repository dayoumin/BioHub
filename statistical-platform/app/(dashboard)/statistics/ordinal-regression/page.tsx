'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { OrdinalRegressionVariables } from '@/types/statistics'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
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
  const [selectedDependent, setSelectedDependent] = useState<string>('')
  const [selectedIndependent, setSelectedIndependent] = useState<string[]>([])
  const [pyodideReady, setPyodideReady] = useState(false)

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'introduction',
      number: 1,
      title: '소개',
      description: '순서형 회귀 소개',
      status: currentStep >= 1 ? 'completed' : 'current'
    },
    {
      id: 'upload-data',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 또는 Excel 파일 업로드',
      status: uploadedData ? 'completed' : currentStep >= 1 ? 'current' : 'pending'
    },
    {
      id: 'select-variables',
      number: 3,
      title: '변수 선택',
      description: '종속/독립 변수 선택',
      status: selectedVariables && Object.keys(selectedVariables).length > 0 ? 'completed'
              : currentStep >= 2 ? 'current' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 확인',
      description: '순서형 회귀 결과',
      status: results ? 'completed' : currentStep >= 3 ? 'current' : 'pending'
    }
  ]

  useEffect(() => {
    let isMounted = true

    const initializePyodide = async () => {
      try {
        await pyodideStats.initialize()
        if (isMounted) {
          setPyodideReady(true)
        }

      } catch (error) {
        console.error('Pyodide 초기화 실패:', error)
      }
    }

    initializePyodide()

    return () => {
      isMounted = false
    }
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
      actions.setCurrentStep(1)
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
      // Mock implementation - will be replaced with actual Pyodide + statsmodels call
      const mockResult: OrdinalRegressionResult = {
        model_info: {
          model_type: 'Proportional Odds Model',
          link_function: 'logit',
          n_observations: 150,
          n_predictors: 3,
          convergence: true,
          iterations: 12
        },
        coefficients: [
          {
            variable: 'age',
            coefficient: 0.045,
            std_error: 0.015,
            z_value: 3.00,
            p_value: 0.003,
            ci_lower: 0.016,
            ci_upper: 0.074,
            odds_ratio: 1.046,
            or_ci_lower: 1.016,
            or_ci_upper: 1.077
          },
          {
            variable: 'income',
            coefficient: 0.002,
            std_error: 0.001,
            z_value: 2.45,
            p_value: 0.014,
            ci_lower: 0.000,
            ci_upper: 0.004,
            odds_ratio: 1.002,
            or_ci_lower: 1.000,
            or_ci_upper: 1.004
          },
          {
            variable: 'education',
            coefficient: 0.512,
            std_error: 0.178,
            z_value: 2.87,
            p_value: 0.004,
            ci_lower: 0.163,
            ci_upper: 0.861,
            odds_ratio: 1.669,
            or_ci_lower: 1.177,
            or_ci_upper: 2.365
          }
        ],
        thresholds: [
          {
            threshold: '불만족|보통',
            coefficient: -2.15,
            std_error: 0.45,
            z_value: -4.78,
            p_value: 0.000,
            ci_lower: -3.03,
            ci_upper: -1.27
          },
          {
            threshold: '보통|만족',
            coefficient: 0.85,
            std_error: 0.42,
            z_value: 2.02,
            p_value: 0.043,
            ci_lower: 0.03,
            ci_upper: 1.67
          }
        ],
        model_fit: {
          deviance: 298.45,
          aic: 306.45,
          bic: 318.12,
          log_likelihood: -149.23,
          pseudo_r_squared_mcfadden: 0.142,
          pseudo_r_squared_nagelkerke: 0.198,
          pseudo_r_squared_cox_snell: 0.165
        },
        assumptions: {
          proportional_odds: {
            test_name: 'Test of Parallel Lines',
            test_statistic: 5.67,
            p_value: 0.225,
            assumption_met: true
          },
          multicollinearity: [
            { variable: 'age', vif: 1.23, tolerance: 0.813 },
            { variable: 'income', vif: 1.45, tolerance: 0.690 },
            { variable: 'education', vif: 1.18, tolerance: 0.847 }
          ]
        },
        predicted_probabilities: [
          {
            observation: 1,
            category_1_prob: 0.15,
            category_2_prob: 0.45,
            category_3_prob: 0.40,
            predicted_category: 2,
            actual_category: 2
          },
          {
            observation: 2,
            category_1_prob: 0.25,
            category_2_prob: 0.35,
            category_3_prob: 0.40,
            predicted_category: 3,
            actual_category: 3
          },
          {
            observation: 3,
            category_1_prob: 0.60,
            category_2_prob: 0.30,
            category_3_prob: 0.10,
            predicted_category: 1,
            actual_category: 1
          }
        ],
        classification_metrics: {
          accuracy: 0.73,
          confusion_matrix: [
            [45, 8, 2],
            [12, 38, 10],
            [3, 7, 25]
          ],
          category_labels: ['불만족', '보통', '만족'],
          precision: [0.75, 0.72, 0.68],
          recall: [0.82, 0.63, 0.71],
          f1_score: [0.78, 0.67, 0.69]
        }
      }

      if (!actions.completeAnalysis) {
        console.error('[ordinal-regression] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(mockResult, 2)
    } catch (error) {
      console.error('분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[ordinal-regression] setError not available')
        return
      }

      actions.setError('분석 중 오류가 발생했습니다.')
    }
  }, [canProceedToAnalysis, uploadedData, pyodideReady, actions])

  const handleVariableSelection = useCallback(() => {
    if (canProceedToAnalysis) {
      if (!actions.setCurrentStep) {
        console.error('[ordinal-regression] setCurrentStep not available')
        return
      }

      actions.setCurrentStep(2)
    }
  }, [canProceedToAnalysis, actions])

  const renderIntroductionStep = useCallback(() => (
    <StepCard title="서열 회귀분석 소개">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">서열 회귀분석이란?</h3>
          <p className="text-gray-600 mb-4">
            종속변수가 순서가 있는 범주형 변수(ordinal variable)일 때 사용하는 회귀분석 방법입니다.
            일반적인 다항 로지스틱 회귀분석과 달리 범주 간의 순서 정보를 활용합니다.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
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
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">일반 로지스틱 회귀 vs 서열 회귀</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
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
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">분석 절차</h3>
          <div className="space-y-3">
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
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            서열 회귀분석의 핵심 가정은 <strong>비례 오즈 가정</strong>입니다.
            이는 독립변수의 효과가 모든 임계값에서 동일하다는 가정으로, 위반 시 부분 비례 오즈 모델을 고려해야 합니다.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={() => {
            if (!actions.setCurrentStep) {
              console.error('[ordinal-regression] setCurrentStep not available')
              return
            }
            actions.setCurrentStep(1)
          }} className="flex items-center space-x-2">
            <span>다음: 데이터 업로드</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </StepCard>
  ), [])

  const renderDataUploadStep = useCallback(() => (
    <StepCard title="데이터 업로드">
      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onPrevious={() => {
          if (!actions.setCurrentStep) {
            console.error('[ordinal-regression] setCurrentStep not available')
            return
          }
          actions.setCurrentStep(0)
        }}
      />

      <div className="mt-6">
        <h4 className="font-medium mb-3">서열 회귀분석 데이터 요구사항</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
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
          </div>

          <p className="text-xs text-gray-500 mt-3">
            종속변수는 반드시 순서가 있는 범주형 변수여야 하며, 숫자 코딩 시 1, 2, 3... 순으로 입력해주세요.
          </p>
        </div>
      </div>
    </StepCard>
  ), [handleDataUpload])

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

  const renderVariableSelectionStep = useCallback(() => (
    <StepCard title="변수 선택">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">변수 선택 (종속변수 1개 + 독립변수 1개 이상)</h4>
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
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">변수 선택 가이드</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>종속변수</strong>: 반드시 순서가 있는 범주형 (3개 이상 범주 권장)</li>
            <li>• <strong>독립변수</strong>: 연속형, 이진형, 범주형 모두 가능</li>
            <li>• <strong>표본 크기</strong>: 범주당 최소 10-15개 관측치 필요</li>
            <li>• <strong>다중공선성</strong>: VIF &lt; 10 권장</li>
          </ul>
        </div>

        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={() => {
              if (!actions.setCurrentStep) {
                console.error('[ordinal-regression] setCurrentStep not available')
                return
              }
              actions.setCurrentStep(0)
            }}
          >
            이전: 소개
          </Button>
        </div>
      </div>
    </StepCard>
  ), [uploadedData, handleVariablesSelected, actions])

  const renderresults = useCallback(() => {
    if (!results) {
      return (
        <StepCard title="분석 실행">
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
        </StepCard>
      )
    }

    return (
      <div className="space-y-6">
        <StepCard title="서열 회귀분석 결과">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>변수</TableHead>
                      <TableHead>계수</TableHead>
                      <TableHead>표준오차</TableHead>
                      <TableHead>z</TableHead>
                      <TableHead>p-value</TableHead>
                      <TableHead>95% CI</TableHead>
                      <TableHead>오즈비</TableHead>
                      <TableHead>오즈비 CI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.coefficients.map((coef, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{coef.variable}</TableCell>
                        <TableCell>{coef.coefficient.toFixed(4)}</TableCell>
                        <TableCell>{coef.std_error.toFixed(4)}</TableCell>
                        <TableCell>{coef.z_value.toFixed(3)}</TableCell>
                        <TableCell>
                          <PValueBadge value={coef.p_value} />
                        </TableCell>
                        <TableCell>
                          [{coef.ci_lower.toFixed(3)}, {coef.ci_upper.toFixed(3)}]
                        </TableCell>
                        <TableCell>{coef.odds_ratio.toFixed(3)}</TableCell>
                        <TableCell>
                          [{coef.or_ci_lower.toFixed(3)}, {coef.or_ci_upper.toFixed(3)}]
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>임계값</TableHead>
                      <TableHead>계수</TableHead>
                      <TableHead>표준오차</TableHead>
                      <TableHead>z</TableHead>
                      <TableHead>p-value</TableHead>
                      <TableHead>95% CI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.thresholds.map((threshold, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{threshold.threshold}</TableCell>
                        <TableCell>{threshold.coefficient.toFixed(4)}</TableCell>
                        <TableCell>{threshold.std_error.toFixed(4)}</TableCell>
                        <TableCell>{threshold.z_value.toFixed(3)}</TableCell>
                        <TableCell>
                          <PValueBadge value={threshold.p_value} />
                        </TableCell>
                        <TableCell>
                          [{threshold.ci_lower.toFixed(3)}, {threshold.ci_upper.toFixed(3)}]
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>변수</TableHead>
                      <TableHead>VIF</TableHead>
                      <TableHead>Tolerance</TableHead>
                      <TableHead>판정</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.assumptions.multicollinearity.map((vif, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{vif.variable}</TableCell>
                        <TableCell>{vif.vif.toFixed(3)}</TableCell>
                        <TableCell>{vif.tolerance.toFixed(3)}</TableCell>
                        <TableCell>
                          <Badge variant={vif.vif < 5 ? "default" : vif.vif < 10 ? "secondary" : "destructive"}>
                            {vif.vif < 5 ? '양호' : vif.vif < 10 ? '주의' : '위험'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">예측 확률</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>관측치</TableHead>
                      <TableHead>불만족 확률</TableHead>
                      <TableHead>보통 확률</TableHead>
                      <TableHead>만족 확률</TableHead>
                      <TableHead>예측 범주</TableHead>
                      <TableHead>실제 범주</TableHead>
                      <TableHead>정확성</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.predicted_probabilities.slice(0, 10).map((pred, index) => (
                      <TableRow key={index}>
                        <TableCell>{pred.observation}</TableCell>
                        <TableCell>{(pred.category_1_prob * 100).toFixed(1)}%</TableCell>
                        <TableCell>{(pred.category_2_prob * 100).toFixed(1)}%</TableCell>
                        <TableCell>{(pred.category_3_prob * 100).toFixed(1)}%</TableCell>
                        <TableCell>{pred.predicted_category}</TableCell>
                        <TableCell>{pred.actual_category}</TableCell>
                        <TableCell>
                          {pred.predicted_category === pred.actual_category ? (
                            <Badge variant="default">정확</Badge>
                          ) : (
                            <Badge variant="secondary">틀림</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-3">혼동 행렬</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>실제\예측</TableHead>
                          <TableHead>불만족</TableHead>
                          <TableHead>보통</TableHead>
                          <TableHead>만족</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.classification_metrics.confusion_matrix.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {results.classification_metrics.category_labels[i]}
                            </TableCell>
                            {row.map((cell, j) => (
                              <TableCell key={j} className={i === j ? "bg-muted font-medium" : ""}>
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
        </StepCard>
      </div>
    )
  }, [results, isAnalyzing, pyodideReady, runOrdinalRegression])

  const stepComponents = [
    { id: 'upload', title: '소개', component: renderIntroductionStep },
    { id: 'variables', title: '데이터 업로드', component: renderDataUploadStep },
    { id: 'analysis', title: '변수 선택', component: renderVariableSelectionStep },
    { id: 'results', title: '분석 결과', component: renderresults }
  ]

  return (
    <StatisticsPageLayout
      title="서열 회귀분석"
      subtitle="Ordinal Regression"
      steps={steps}
      currentStep={currentStep + 1}
    >
      {stepComponents[currentStep].component()}
    </StatisticsPageLayout>
  )
}