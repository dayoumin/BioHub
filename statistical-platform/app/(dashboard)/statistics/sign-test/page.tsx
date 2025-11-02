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
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
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
  TrendingUp,
  Minus,
  Plus,
  Scale
} from 'lucide-react'

interface DataRow {
  [key: string]: string | number
}

interface SignTestResult {
  test_info: {
    test_name: string
    test_type: string
    paired_samples: boolean
    n_pairs: number
    n_valid_pairs: number
    n_ties: number
  }
  descriptive: {
    differences: number[]
    positive_differences: number
    negative_differences: number
    zero_differences: number
    median_difference: number
    mean_difference: number
  }
  test_statistics: {
    s_positive: number
    s_negative: number
    test_statistic: number
    expected_value: number
    variance: number
    z_score: number
    continuity_correction: boolean
  }
  p_values: {
    two_tailed: number
    one_tailed_greater: number
    one_tailed_less: number
    exact_p_value: number
    asymptotic_p_value: number
  }
  confidence_interval: {
    median_diff_ci_lower: number
    median_diff_ci_upper: number
    confidence_level: number
  }
  effect_size: {
    matched_pairs_rank_biserial: number
    interpretation: string
  }
  assumptions: {
    independence: {
      assumption_met: boolean
      note: string
    }
    symmetry: {
      assumption_met: boolean
      note: string
    }
  }
  summary: {
    conclusion: string
    interpretation: string
    practical_significance: string
    recommendation: string
  }
}

export default function SignTestPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<SignTestResult>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [selectedBefore, setSelectedBefore] = useState<string>('')
  const [selectedAfter, setSelectedAfter] = useState<string>('')
  const [testType, setTestType] = useState<'two-tailed' | 'greater' | 'less'>('two-tailed')
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

  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    const uploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }

    if (!actions.setUploadedData) {
      console.error('[sign-test] setUploadedData not available')
      return
    }

    actions.setUploadedData(uploadedData)

    if (!actions.setCurrentStep) {
      console.error('[sign-test] setCurrentStep not available')
      return
    }

    actions.setCurrentStep(1)
  }, [actions])

  const canProceedToAnalysis = useMemo(() => {
    return selectedBefore && selectedAfter && selectedBefore !== selectedAfter
  }, [selectedBefore, selectedAfter])

  const runSignTest = useCallback(async () => {
    if (!canProceedToAnalysis || !uploadedData || !pyodideReady) return

    actions.startAnalysis()

    try {
      // Mock implementation - will be replaced with actual Pyodide + SciPy call
      const mockResult: SignTestResult = {
        test_info: {
          test_name: 'Sign Test',
          test_type: testType === 'two-tailed' ? '양측 검정' : testType === 'greater' ? '우측 검정' : '좌측 검정',
          paired_samples: true,
          n_pairs: 50,
          n_valid_pairs: 47,
          n_ties: 3
        },
        descriptive: {
          differences: [0.5, -0.2, 1.3, 0.8, -0.1, 2.1, 0.3, -0.4, 1.2, 0.7],
          positive_differences: 32,
          negative_differences: 15,
          zero_differences: 3,
          median_difference: 0.45,
          mean_difference: 0.52
        },
        test_statistics: {
          s_positive: 32,
          s_negative: 15,
          test_statistic: 15,
          expected_value: 23.5,
          variance: 11.75,
          z_score: -2.48,
          continuity_correction: true
        },
        p_values: {
          two_tailed: 0.013,
          one_tailed_greater: 0.0065,
          one_tailed_less: 0.9935,
          exact_p_value: 0.0089,
          asymptotic_p_value: 0.013
        },
        confidence_interval: {
          median_diff_ci_lower: 0.12,
          median_diff_ci_upper: 0.78,
          confidence_level: 95
        },
        effect_size: {
          matched_pairs_rank_biserial: 0.36,
          interpretation: '중간 효과크기'
        },
        assumptions: {
          independence: {
            assumption_met: true,
            note: '각 관측치는 독립적으로 수집되었다고 가정'
          },
          symmetry: {
            assumption_met: true,
            note: '차이점수의 분포가 0을 중심으로 대칭이라고 가정'
          }
        },
        summary: {
          conclusion: '유의한 차이가 있음 (p = 0.013 < 0.05)',
          interpretation: '사전-사후 측정값 간에 통계적으로 유의한 차이가 있습니다. 양의 차이가 음의 차이보다 유의하게 많습니다.',
          practical_significance: '중간 크기의 효과(r = 0.36)로 실질적 의미가 있습니다.',
          recommendation: '결과는 통계적으로나 실질적으로 유의하므로 개입 효과가 있다고 결론지을 수 있습니다.'
        }
      }

      if (!actions.completeAnalysis) {
        console.error('[sign-test] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(mockResult, 3)
    } catch (error) {
      console.error('분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[sign-test] setError not available')
        return
      }

      actions.setError('분석 중 오류가 발생했습니다.')
    }
  }, [canProceedToAnalysis, uploadedData, pyodideReady, testType, actions])

  const handleVariableSelection = useCallback(() => {
    if (canProceedToAnalysis) {
      if (!actions.setCurrentStep) {
        console.error('[sign-test] setCurrentStep not available')
        return
      }

      actions.setCurrentStep(2)
    }
  }, [canProceedToAnalysis, actions])

  const renderIntroductionStep = useCallback(() => (
    <StepCard title="부호 검정 소개">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">부호 검정(Sign Test)이란?</h3>
          <p className="text-gray-600 mb-4">
            대응 표본에서 중앙값의 차이를 검정하는 비모수 방법입니다.
            차이값의 부호(+, -)만을 사용하여 분석하므로 분포의 가정이 필요하지 않습니다.
            데이터의 정규성이나 대칭성에 대한 가정 없이 사용할 수 있는 강건한 검정법입니다.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                주요 장점
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 분포 가정 불필요</li>
                <li>• 이상치에 강건함</li>
                <li>• 계산이 간단함</li>
                <li>• 소표본에도 적용 가능</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Scale className="w-4 h-4 mr-2" />
                적용 상황
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 사전-사후 비교</li>
                <li>• 치료 전후 효과</li>
                <li>• 교육 프로그램 효과</li>
                <li>• 제품 개선 효과</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Wilcoxon 부호순위 검정과의 비교</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">부호 검정</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 차이의 부호만 사용</li>
                  <li>• 크기 정보 무시</li>
                  <li>• 검정력 낮음</li>
                  <li>• 가정 최소</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">부호순위 검정</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 차이의 크기와 부호 사용</li>
                  <li>• 크기 정보 활용</li>
                  <li>• 검정력 높음</li>
                  <li>• 대칭 분포 가정</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">부호 검정의 원리</h3>
          <div className="space-y-3">
            {[
              '각 대응 쌍의 차이값(After - Before) 계산',
              '차이값이 0인 경우는 분석에서 제외',
              '양수(+)와 음수(-) 차이의 개수 계산',
              '이항분포를 이용하여 확률 계산',
              '귀무가설 하에서 양수와 음수의 비율이 같음을 검정'
            ].map((principle, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm">{principle}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">적용 예시</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <TrendingUp className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h4 className="font-medium">의학</h4>
                <p className="text-xs text-gray-600">치료 전후 증상 점수, 혈압 변화, 체중 감소</p>
              </div>
              <div>
                <BarChart3 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <h4 className="font-medium">교육</h4>
                <p className="text-xs text-gray-600">교육 전후 성적, 만족도, 이해도 변화</p>
              </div>
              <div>
                <Calculator className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <h4 className="font-medium">마케팅</h4>
                <p className="text-xs text-gray-600">캠페인 전후 판매량, 인지도, 선호도</p>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            부호 검정은 <strong>중앙값</strong>의 차이를 검정합니다.
            평균의 차이를 검정하려면 t-검정이나 Wilcoxon 부호순위 검정을 고려하세요.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={() => {
            if (!actions.setCurrentStep) {
              console.error('[sign-test] setCurrentStep not available')
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
            console.error('[sign-test] setCurrentStep not available')
            return
          }
          actions.setCurrentStep(0)
        }}
      />

      <div className="mt-6">
        <h4 className="font-medium mb-3">부호 검정 데이터 요구사항</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">대응 표본 구조 (필수)</h5>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div>ID | Before_Score | After_Score | Gender | Age</div>
                <div>1  | 75          | 82         | M      | 25</div>
                <div>2  | 68          | 71         | F      | 30</div>
                <div>3  | 80          | 85         | M      | 28</div>
                <div>4  | 72          | 69         | F      | 35</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                각 행은 동일한 개체의 사전-사후 측정값을 포함해야 함
              </p>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">측정값 특성</h5>
              <div className="bg-white p-3 rounded border text-xs">
                <ul className="space-y-1">
                  <li>• <strong>순서형</strong>: 순서가 있는 척도 (예: 만족도 1-5점)</li>
                  <li>• <strong>구간형</strong>: 등간격 척도 (예: 점수, 온도)</li>
                  <li>• <strong>비율형</strong>: 절대영점이 있는 척도 (예: 체중, 시간)</li>
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">데이터 품질 요구사항</h5>
              <div className="bg-white p-3 rounded border text-xs">
                <ul className="space-y-1">
                  <li>• <strong>대응성</strong>: 동일 개체의 사전-사후 측정</li>
                  <li>• <strong>독립성</strong>: 각 개체는 서로 독립적</li>
                  <li>• <strong>표본크기</strong>: 최소 10개 이상의 대응 쌍</li>
                  <li>• <strong>결측값</strong>: 한 쪽만 결측인 경우 해당 쌍 제외</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  ), [handleDataUpload])

  const handleVariablesSelected = useCallback((mapping: unknown) => {
    // 1. Type guard
    if (!mapping || typeof mapping !== 'object') {
      console.error('[sign-test] Invalid mapping')
      return
    }

    // 2. Extract variables array
    let variables: string[] = []

    if ('variables' in mapping) {
      const vars = (mapping as { variables: unknown }).variables
      if (Array.isArray(vars)) {
        variables = vars.filter((v): v is string => typeof v === 'string')
      }
    }

    // 3. Expect 2 variables: before and after
    if (variables.length < 2) {
      console.error('[sign-test] Need 2 variables (before, after)')
      return
    }

    // 4. Update state
    setSelectedBefore(variables[0])
    setSelectedAfter(variables[1])

    // 5. Move to next step
    if (!actions.setCurrentStep) {
      console.error('[sign-test] setCurrentStep not available')
      return
    }
    actions.setCurrentStep(2)
  }, [actions])

  const renderVariableSelectionStep = useCallback(() => (
    <StepCard title="변수 선택">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">변수 선택 (2개 필요: Before, After)</h4>
          {uploadedData && (
            <VariableSelector
              methodId="sign-test"
              data={uploadedData.data}
              onVariablesSelected={handleVariablesSelected}
            />
          )}
          <p className="text-xs text-gray-500 mt-2">
            첫 번째: 사전 측정값 (개입 이전), 두 번째: 사후 측정값 (개입 이후)
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">분석 가이드</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>대응 표본</strong>: 동일한 개체에서 두 번 측정된 데이터</li>
            <li>• <strong>차이값 계산</strong>: 사후값 - 사전값으로 계산됨</li>
            <li>• <strong>가정</strong>: 독립성만 만족하면 됨 (정규성 불필요)</li>
            <li>• <strong>검정력</strong>: Wilcoxon 부호순위 검정보다 낮음</li>
          </ul>
        </div>

        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={() => {
              if (!actions.setCurrentStep) {
                console.error('[sign-test] setCurrentStep not available')
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
              onClick={runSignTest}
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
                  <span>부호 검정 실행</span>
                </>
              )}
            </Button>
          </div>
        </StepCard>
      )
    }

    const pieData = [
      { name: '양의 차이', value: results.descriptive.positive_differences, color: '#10b981' },
      { name: '음의 차이', value: results.descriptive.negative_differences, color: '#ef4444' },
      { name: '차이 없음', value: results.descriptive.zero_differences, color: '#6b7280' }
    ]

    return (
      <div className="space-y-6">
        <StepCard title="부호 검정 결과">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">개요</TabsTrigger>
              <TabsTrigger value="descriptive">기술통계</TabsTrigger>
              <TabsTrigger value="test">검정결과</TabsTrigger>
              <TabsTrigger value="effect">효과크기</TabsTrigger>
              <TabsTrigger value="assumptions">가정</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">검정 정보</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">기본 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">검정명:</span>
                        <span className="text-sm font-medium">{results.test_info.test_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">검정 유형:</span>
                        <span className="text-sm font-medium">{results.test_info.test_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">전체 쌍:</span>
                        <span className="text-sm font-medium">{results.test_info.n_pairs}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">유효 쌍:</span>
                        <span className="text-sm font-medium">{results.test_info.n_valid_pairs}개</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">동점:</span>
                        <span className="text-sm font-medium">{results.test_info.n_ties}개</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">검정 결과</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">p-value:</span>
                        <PValueBadge value={results.p_values.two_tailed} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">효과크기 (r):</span>
                        <span className="text-sm font-medium">{results.effect_size.matched_pairs_rank_biserial.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">중앙값 차이:</span>
                        <span className="text-sm font-medium">{results.descriptive.median_difference.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">95% CI:</span>
                        <span className="text-sm font-medium">
                          [{results.confidence_interval.median_diff_ci_lower.toFixed(3)}, {results.confidence_interval.median_diff_ci_upper.toFixed(3)}]
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">결론</h4>
                <Alert>
                  {results.p_values.two_tailed < 0.05 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <strong>{results.summary.conclusion}</strong>
                    <br />
                    {results.summary.interpretation}
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="descriptive" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">차이값 분포</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">부호별 빈도</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="value"
                              label={({name, value}) => `${name}: ${value}`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">기술통계량</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">양의 차이:</span>
                        <span className="text-sm font-medium flex items-center">
                          <Plus className="w-3 h-3 text-muted-foreground mr-1" />
                          {results.descriptive.positive_differences}개
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">음의 차이:</span>
                        <span className="text-sm font-medium flex items-center">
                          <Minus className="w-3 h-3 text-muted-foreground mr-1" />
                          {results.descriptive.negative_differences}개
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">차이 없음:</span>
                        <span className="text-sm font-medium">
                          {results.descriptive.zero_differences}개
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-sm">중앙값 차이:</span>
                        <span className="text-sm font-medium">{results.descriptive.median_difference.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">평균 차이:</span>
                        <span className="text-sm font-medium">{results.descriptive.mean_difference.toFixed(3)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">검정통계량</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>통계량</TableHead>
                      <TableHead>값</TableHead>
                      <TableHead>설명</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>S+</TableCell>
                      <TableCell>{results.test_statistics.s_positive}</TableCell>
                      <TableCell>양의 차이 개수</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>S-</TableCell>
                      <TableCell>{results.test_statistics.s_negative}</TableCell>
                      <TableCell>음의 차이 개수</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>검정통계량</TableCell>
                      <TableCell>{results.test_statistics.test_statistic}</TableCell>
                      <TableCell>min(S+, S-)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Z-점수</TableCell>
                      <TableCell>{results.test_statistics.z_score.toFixed(3)}</TableCell>
                      <TableCell>정규근사값</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h4 className="font-medium mb-3">p-값</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">정확 p-값</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">양측 검정:</span>
                        <PValueBadge value={results.p_values.exact_p_value} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">우측 검정:</span>
                        <PValueBadge value={results.p_values.one_tailed_greater} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">좌측 검정:</span>
                        <PValueBadge value={results.p_values.one_tailed_less} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">근사 p-값</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">정규근사:</span>
                        <PValueBadge value={results.p_values.asymptotic_p_value} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">연속성 보정:</span>
                        <span className="text-sm font-medium">
                          {results.test_statistics.continuity_correction ? '적용됨' : '미적용'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="effect" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">효과크기</h4>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">대응표본 순위 이연상관 (r)</h5>
                          <p className="text-sm text-gray-600">대응 표본에서의 효과크기 측정</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {results.effect_size.matched_pairs_rank_biserial.toFixed(3)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {results.effect_size.interpretation}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <h6 className="font-medium mb-2">효과크기 해석 기준</h6>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">작은 효과</span>
                            <p className="text-muted-foreground">r ≈ 0.1</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">중간 효과</span>
                            <p className="text-muted-foreground">r ≈ 0.3</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">큰 효과</span>
                            <p className="text-muted-foreground">r ≈ 0.5</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3">신뢰구간</h4>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">중앙값 차이 95% CI:</span>
                        <span className="text-sm font-medium">
                          [{results.confidence_interval.median_diff_ci_lower.toFixed(3)}, {results.confidence_interval.median_diff_ci_upper.toFixed(3)}]
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        모집단 중앙값 차이의 95% 신뢰구간입니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assumptions" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">가정 검토</h4>
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">독립성</h5>
                          <p className="text-sm text-gray-600">{results.assumptions.independence.note}</p>
                        </div>
                        <div className="text-right">
                          {results.assumptions.independence.assumption_met ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                          )}
                          <p className="text-xs text-gray-600">
                            {results.assumptions.independence.assumption_met ? '만족' : '위반 가능성'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-medium">대칭성 (선택적)</h5>
                          <p className="text-sm text-gray-600">{results.assumptions.symmetry.note}</p>
                        </div>
                        <div className="text-right">
                          {results.assumptions.symmetry.assumption_met ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-6 h-6 text-amber-500" />
                          )}
                          <p className="text-xs text-gray-600">
                            {results.assumptions.symmetry.assumption_met ? '만족' : '위반 가능성'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    부호 검정은 비모수 검정으로 <strong>정규성</strong>이나 <strong>등분산성</strong> 가정이 필요하지 않습니다.
                    단, 관측치들의 <strong>독립성</strong>은 중요합니다.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="interpretation" className="space-y-4">
              <div>
                <h4 className="font-medium mb-3">결과 해석</h4>
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>통계적 유의성:</strong> {results.summary.conclusion}
                      <br />
                      {results.summary.interpretation}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>실질적 의미:</strong> {results.summary.practical_significance}
                      <br />
                      효과크기 r = {results.effect_size.matched_pairs_rank_biserial.toFixed(3)}는 {results.effect_size.interpretation}에 해당합니다.
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>권장사항:</strong> {results.summary.recommendation}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">추가 고려사항</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <ul className="space-y-2 text-sm">
                    <li>• <strong>대안 검정:</strong> Wilcoxon 부호순위 검정이 더 높은 검정력을 제공할 수 있습니다</li>
                    <li>• <strong>표본크기:</strong> 소표본(n&lt;20)에서는 정확 p-값을 사용하는 것이 좋습니다</li>
                    <li>• <strong>동점 처리:</strong> 차이가 0인 경우는 분석에서 제외됩니다</li>
                    <li>• <strong>측정 척도:</strong> 순서형 이상의 데이터에서만 의미있는 결과</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </StepCard>
      </div>
    )
  }, [results, isAnalyzing, pyodideReady, runSignTest])

  const steps = [
    { id: 'upload', title: '소개', component: renderIntroductionStep },
    { id: 'variables', title: '데이터 업로드', component: renderDataUploadStep },
    { id: 'analysis', title: '변수 선택', component: renderVariableSelectionStep },
    { id: 'results', title: '분석 결과', component: renderresults }
  ]

  return (
    <StatisticsPageLayout
      title="부호 검정"
      subtitle="Sign Test"
    >
      {steps[currentStep].component()}
    </StatisticsPageLayout>
  )
}