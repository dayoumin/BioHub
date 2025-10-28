'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { StatisticsPageLayout, StepCard } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
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
  Line,
  ScatterChart,
  Scatter
} from 'recharts'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  BarChart3,
  Target,
  Hash
} from 'lucide-react'

interface DataRow {
  [key: string]: string | number
}

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
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<PoissonResult, string[]>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [selectedDependent, setSelectedDependent] = useState<string>('')
  const [selectedIndependent, setSelectedIndependent] = useState<string[]>([])
  const [selectedOffset, setSelectedOffset] = useState<string>('')
  const [pyodideReady, setPyodideReady] = useState(false)

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
    if (!uploadedData || (uploadedData ?? []).length === 0) return []

    const firstRow = (uploadedData as unknown[] ?? [])[0]
    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof firstRow[key] === 'number' ? 'numeric' : 'categorical'
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

  const handleDataUpload = useCallback((data: DataRow[]) => {
    actions.setUploadedData(data)
    actions.setCurrentStep(1)
  }, [])

  const canProceedToAnalysis = useMemo(() => {
    return selectedDependent && selectedIndependent.length > 0
  }, [selectedDependent, selectedIndependent])

  const runPoissonRegression = useCallback(async () => {
    if (!canProceedToAnalysis || !uploadedData || !pyodideReady) return

    setIsAnalyzing(true)

    try {
      // Mock implementation - will be replaced with actual Pyodide + statsmodels call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockResult: PoissonRegressionResult = {
        model_info: {
          model_type: 'Poisson GLM',
          link_function: 'log',
          distribution: 'Poisson',
          n_observations: 200,
          n_predictors: 3,
          convergence: true,
          iterations: 6,
          log_likelihood: -245.67
        },
        coefficients: [
          {
            variable: 'intercept',
            coefficient: 1.245,
            std_error: 0.158,
            z_value: 7.88,
            p_value: 0.000,
            ci_lower: 0.935,
            ci_upper: 1.555,
            exp_coefficient: 3.472,
            irr_ci_lower: 2.547,
            irr_ci_upper: 4.737
          },
          {
            variable: 'age',
            coefficient: 0.025,
            std_error: 0.008,
            z_value: 3.12,
            p_value: 0.002,
            ci_lower: 0.009,
            ci_upper: 0.041,
            exp_coefficient: 1.025,
            irr_ci_lower: 1.009,
            irr_ci_upper: 1.042
          },
          {
            variable: 'treatment',
            coefficient: -0.452,
            std_error: 0.142,
            z_value: -3.18,
            p_value: 0.001,
            ci_lower: -0.730,
            ci_upper: -0.174,
            exp_coefficient: 0.636,
            irr_ci_lower: 0.482,
            irr_ci_upper: 0.840
          },
          {
            variable: 'exposure_time',
            coefficient: 0.083,
            std_error: 0.025,
            z_value: 3.32,
            p_value: 0.001,
            ci_lower: 0.034,
            ci_upper: 0.132,
            exp_coefficient: 1.087,
            irr_ci_lower: 1.035,
            irr_ci_upper: 1.141
          }
        ],
        model_fit: {
          deviance: 187.45,
          pearson_chi2: 192.33,
          aic: 499.34,
          bic: 512.78,
          pseudo_r_squared_mcfadden: 0.134,
          pseudo_r_squared_deviance: 0.156,
          dispersion_parameter: 0.98
        },
        assumptions: {
          overdispersion: {
            test_name: 'Overdispersion Test',
            statistic: 192.33,
            p_value: 0.245,
            dispersion_ratio: 0.98,
            assumption_met: true
          },
          linearity: {
            test_name: 'Link Test',
            p_value: 0.634,
            assumption_met: true
          },
          independence: {
            durbin_watson: 2.15,
            assumption_met: true
          }
        },
        predicted_values: [
          {
            observation: 1,
            actual_count: 3,
            predicted_count: 2.85,
            residual: 0.15,
            pearson_residual: 0.089,
            deviance_residual: 0.091
          },
          {
            observation: 2,
            actual_count: 7,
            predicted_count: 6.23,
            residual: 0.77,
            pearson_residual: 0.309,
            deviance_residual: 0.295
          },
          {
            observation: 3,
            actual_count: 12,
            predicted_count: 11.67,
            residual: 0.33,
            pearson_residual: 0.097,
            deviance_residual: 0.095
          }
        ],
        goodness_of_fit: {
          pearson_gof: {
            statistic: 192.33,
            df: 196,
            p_value: 0.578
          },
          deviance_gof: {
            statistic: 187.45,
            df: 196,
            p_value: 0.643
          }
        },
        rate_ratios: [
          {
            variable: 'age',
            rate_ratio: 1.025,
            ci_lower: 1.009,
            ci_upper: 1.042,
            interpretation: '나이가 1세 증가할 때마다 발생률이 2.5% 증가'
          },
          {
            variable: 'treatment',
            rate_ratio: 0.636,
            ci_lower: 0.482,
            ci_upper: 0.840,
            interpretation: '치료군에서 대조군 대비 발생률이 36.4% 감소'
          },
          {
            variable: 'exposure_time',
            rate_ratio: 1.087,
            ci_lower: 1.035,
            ci_upper: 1.141,
            interpretation: '노출시간이 1시간 증가할 때마다 발생률이 8.7% 증가'
          }
        ]
      }

      actions.setResults(mockResult)
      actions.setCurrentStep(2)
    } catch (error) {
      console.error('분석 중 오류:', error)
    }
  }, [canProceedToAnalysis, (uploadedData as unknown[] ?? []), pyodideReady])

  const handleVariableSelection = useCallback(() => {
    if (canProceedToAnalysis) {
      actions.setCurrentStep(2)
    }
  }, [canProceedToAnalysis])

  const renderIntroductionStep = useCallback(() => (
    <StepCard title="포아송 회귀분석 소개">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">포아송 회귀분석이란?</h3>
          <p className="text-gray-600 mb-4">
            종속변수가 비음의 정수인 카운트 데이터(count data)를 분석하는 일반화선형모델(GLM)입니다.
            포아송 분포를 가정하며 로그 연결함수를 사용하여 발생률(rate)을 모델링합니다.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                주요 특징
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 카운트 데이터 전용</li>
                <li>• 포아송 분포 가정</li>
                <li>• 로그 연결함수 사용</li>
                <li>• 발생률 비(Rate Ratio) 해석</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                적용 예시
              </h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 질병 발생 건수</li>
                <li>• 교통사고 발생 횟수</li>
                <li>• 고객 방문 횟수</li>
                <li>• 결함 발생 개수</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">일반 선형회귀 vs 포아송 회귀</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">일반 선형회귀</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 연속형 종속변수</li>
                  <li>• 정규분포 가정</li>
                  <li>• 항등 연결함수</li>
                  <li>• 음수 예측값 가능</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">포아송 회귀</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 카운트 종속변수</li>
                  <li>• 포아송분포 가정</li>
                  <li>• 로그 연결함수</li>
                  <li>• 항상 양수 예측값</li>
                </ul>
              </div>
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

        <div>
          <h3 className="text-lg font-medium mb-3">카운트 데이터 예시</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <Hash className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h4 className="font-medium">의료</h4>
                <p className="text-xs text-gray-600">병원 방문 횟수, 발작 횟수, 합병증 건수</p>
              </div>
              <div>
                <Hash className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <h4 className="font-medium">품질관리</h4>
                <p className="text-xs text-gray-600">결함 개수, 불량품 수, 클레임 건수</p>
              </div>
              <div>
                <Hash className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <h4 className="font-medium">마케팅</h4>
                <p className="text-xs text-gray-600">구매 횟수, 클릭 수, 문의 건수</p>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            포아송 회귀에서 <strong>과산포(Overdispersion)</strong>가 발생하면 표준오차가 과소추정될 수 있습니다.
            이 경우 준-포아송 모델이나 음이항 회귀분석을 고려해야 합니다.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={() => actions.setCurrentStep(1)} className="flex items-center space-x-2">
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
        onDataUploaded={handleDataUpload}
        acceptedFileTypes={['.csv', '.xlsx', '.txt']}
        maxFileSize={10 * 1024 * 1024}
      />

      <div className="mt-6">
        <h4 className="font-medium mb-3">포아송 회귀분석 데이터 요구사항</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">종속변수 (카운트 데이터)</h5>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div>event_count | disease_cases | accidents | visits</div>
                <div>3          | 5            | 0         | 12</div>
                <div>7          | 2            | 1         | 8</div>
                <div>0          | 8            | 3         | 15</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                비음의 정수 (0, 1, 2, 3, ...)만 포함
              </p>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">독립변수 (연속형/범주형)</h5>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div>age | gender | income | exposure_days</div>
                <div>25  | M      | 35000  | 30</div>
                <div>32  | F      | 42000  | 45</div>
                <div>28  | M      | 38000  | 22</div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">오프셋 변수 (선택사항)</h5>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div>population | person_years | exposure_time</div>
                <div>1000       | 2.5          | 8.0</div>
                <div>1500       | 3.2          | 12.5</div>
                <div>800        | 1.8          | 6.2</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                발생률 모델링 시 분모 역할 (예: 인구수, 관찰기간)
              </p>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  ), [handleDataUpload])

  const renderVariableSelectionStep = useCallback(() => (
    <StepCard title="변수 선택">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">종속변수 (카운트, 필수)</h4>
          <VariableSelector
            variables={numericVariables}
            selectedVariables={selectedDependent ? [selectedDependent] : []}
            onVariableSelect={(vars) => setSelectedDependent(vars[0] || '')}
            maxSelection={1}
            placeholder="카운트 데이터 변수를 선택하세요"
          />
          <p className="text-xs text-gray-500 mt-2">
            비음의 정수 데이터 (0, 1, 2, 3, ...) - 예: 발생건수, 방문횟수
          </p>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">독립변수 (1개 이상 필수)</h4>
          <VariableSelector
            variables={numericVariables.concat(categoricalVariables).filter(v => v !== selectedDependent && v !== selectedOffset)}
            selectedVariables={selectedIndependent}
            onVariableSelect={setSelectedIndependent}
            placeholder="예측에 사용할 변수들을 선택하세요"
          />
          <p className="text-xs text-gray-500 mt-2">
            연속형 또는 범주형 독립변수들 (예: 나이, 성별, 소득, 지역)
          </p>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">오프셋 변수 (선택사항)</h4>
          <VariableSelector
            variables={numericVariables.filter(v => v !== selectedDependent && !selectedIndependent.includes(v))}
            selectedVariables={selectedOffset ? [selectedOffset] : []}
            onVariableSelect={(vars) => setSelectedOffset(vars[0] || '')}
            maxSelection={1}
            placeholder="발생률 계산을 위한 오프셋 변수 선택"
          />
          <p className="text-xs text-gray-500 mt-2">
            노출량, 관찰기간, 인구수 등 (예: person_years, population_size)
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">변수 선택 가이드</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>종속변수</strong>: 반드시 카운트 데이터 (0 이상의 정수)</li>
            <li>• <strong>독립변수</strong>: 연속형, 이진형, 다항 범주형 모두 가능</li>
            <li>• <strong>오프셋</strong>: 발생률 모델링 시 필요 (log(오프셋)이 모델에 포함)</li>
            <li>• <strong>표본크기</strong>: 독립변수당 최소 10-15개 사건 권장</li>
          </ul>
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => actions.setCurrentStep(0)}
          >
            이전: 소개
          </Button>
          <Button
            onClick={handleVariableSelection}
            disabled={!canProceedToAnalysis}
            className="flex items-center space-x-2"
          >
            <span>분석 실행</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </StepCard>
  ), [
    numericVariables,
    categoricalVariables,
    selectedDependent,
    selectedIndependent,
    selectedOffset,
    canProceedToAnalysis,
    handleVariableSelection
  ])

  const renderAnalysisResults = useCallback(() => {
    if (!results) {
      return (
        <StepCard title="분석 실행">
          <div className="text-center py-8">
            <Button
              onClick={runPoissonRegression}
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
                  <Calculator className="w-4 h-4" />
                  <span>포아송 회귀분석 실행</span>
                </>
              )}
            </Button>
          </div>
        </StepCard>
      )
    }

    return (
      <div className="space-y-6">
        <StepCard title="포아송 회귀분석 결과">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="coefficients">계수</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
              <TabsTrigger value="predictions">예측</TabsTrigger>
              <TabsTrigger value="ratios">발생률비</TabsTrigger>
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
                      <TableHead>exp(β)</TableHead>
                      <TableHead>IRR CI</TableHead>
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
                          <PValueBadge pValue={coef.p_value} />
                        </TableCell>
                        <TableCell>
                          [{coef.ci_lower.toFixed(3)}, {coef.ci_upper.toFixed(3)}]
                        </TableCell>
                        <TableCell>{coef.exp_coefficient.toFixed(3)}</TableCell>
                        <TableCell>
                          [{coef.irr_ci_lower.toFixed(3)}, {coef.irr_ci_upper.toFixed(3)}]
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-3">발생률비(IRR) 시각화</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.coefficients.filter(c => c.variable !== 'intercept')} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                      <YAxis dataKey="variable" type="category" width={80} />
                      <Tooltip
                        formatter={(value: number) => [value.toFixed(3), 'IRR']}
                        labelFormatter={(label: string) => `Variable: ${label}`}
                      />
                      <Bar dataKey="exp_coefficient" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assumptions" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">과산포 검정</h4>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{results.assumptions.overdispersion.test_name}</h5>
                          <p className="text-sm text-gray-600">
                            분산이 평균보다 과도하게 큰지 검정
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)}
                          </div>
                          <PValueBadge pValue={results.assumptions.overdispersion.p_value} />
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
                            <span className="text-green-700">
                              과산포가 없습니다. 포아송 모델이 적절합니다.
                              (산포비 = {results.assumptions.overdispersion.dispersion_ratio.toFixed(3)})
                            </span>
                          ) : (
                            <span className="text-amber-700">
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
                        <PValueBadge pValue={results.goodness_of_fit.pearson_gof.p_value} />
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
                        <PValueBadge pValue={results.goodness_of_fit.deviance_gof.p_value} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">기타 가정</h4>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">선형성 검정</h5>
                          <p className="text-xs text-gray-600">로그(평균)과 예측변수의 선형관계</p>
                        </div>
                        <div className="text-right">
                          <PValueBadge pValue={results.assumptions.linearity.p_value} />
                          <p className="text-xs text-gray-600">
                            {results.assumptions.linearity.assumption_met ? '선형성 만족' : '선형성 위반'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">독립성</h5>
                          <p className="text-xs text-gray-600">Durbin-Watson 검정</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{results.assumptions.independence.durbin_watson.toFixed(2)}</span>
                          <p className="text-xs text-gray-600">
                            {results.assumptions.independence.assumption_met ? '독립성 만족' : '자기상관 존재'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">예측값 및 잔차</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>관측치</TableHead>
                      <TableHead>실제값</TableHead>
                      <TableHead>예측값</TableHead>
                      <TableHead>잔차</TableHead>
                      <TableHead>Pearson 잔차</TableHead>
                      <TableHead>편차 잔차</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.predicted_values.slice(0, 10).map((pred, index) => (
                      <TableRow key={index}>
                        <TableCell>{pred.observation}</TableCell>
                        <TableCell>{pred.actual_count}</TableCell>
                        <TableCell>{pred.predicted_count.toFixed(2)}</TableCell>
                        <TableCell>{pred.residual.toFixed(3)}</TableCell>
                        <TableCell>{pred.pearson_residual.toFixed(3)}</TableCell>
                        <TableCell>{pred.deviance_residual.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-3">실제값 vs 예측값</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={results.predicted_values.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="predicted_count" name="예측값" />
                      <YAxis dataKey="actual_count" name="실제값" />
                      <Tooltip
                        formatter={(value: number, name: string) => [value.toFixed(2), name === 'actual_count' ? '실제값' : '예측값']}
                      />
                      <Scatter dataKey="actual_count" fill="#3b82f6" />
                      <Line dataKey="predicted_count" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ratios" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">발생률비 (Incidence Rate Ratio)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>변수</TableHead>
                      <TableHead>발생률비</TableHead>
                      <TableHead>95% CI</TableHead>
                      <TableHead>해석</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.rate_ratios.map((ratio, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{ratio.variable}</TableCell>
                        <TableCell>{ratio.rate_ratio.toFixed(3)}</TableCell>
                        <TableCell>
                          [{ratio.ci_lower.toFixed(3)}, {ratio.ci_upper.toFixed(3)}]
                        </TableCell>
                        <TableCell className="text-sm">{ratio.interpretation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-3">발생률비 해석 가이드</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">IRR = 1</h5>
                      <p className="text-blue-700">해당 변수가 발생률에 영향 없음</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">IRR &gt; 1</h5>
                      <p className="text-blue-700">해당 변수가 발생률을 증가시킴</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-800 mb-2">IRR &lt; 1</h5>
                      <p className="text-blue-700">해당 변수가 발생률을 감소시킴</p>
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
                <div className="bg-green-50 p-4 rounded-lg">
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>임상 적용:</strong> 치료 효과의 크기와 통계적 유의성을 정량화</li>
                    <li>• <strong>위험도 평가:</strong> 위험요인들의 상대적 영향력 비교</li>
                    <li>• <strong>정책 결정:</strong> 개입 우선순위 결정을 위한 근거 제공</li>
                    <li>• <strong>예측 모델:</strong> 새로운 조건에서의 발생률 예측</li>
                    <li>• <strong>모델 개선:</strong> 과산포 문제 시 모델 수정 방향 제시</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </StepCard>
      </div>
    )
  }, [results, isAnalyzing, pyodideReady, runPoissonRegression])

  const steps = [
    { title: '소개', component: renderIntroductionStep },
    { title: '데이터 업로드', component: renderDataUploadStep },
    { title: '변수 선택', component: renderVariableSelectionStep },
    { title: '분석 결과', component: renderAnalysisResults }
  ]

  return (
    <StatisticsPageLayout
      title="포아송 회귀분석"
      subtitle="Poisson Regression"
      currentStep={currentStep}
      totalSteps={steps.length}
      onStepChange={actions.setCurrentStep}
    >
      {steps[currentStep].component()}
    </StatisticsPageLayout>
  )
}