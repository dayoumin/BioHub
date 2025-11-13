'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  GitBranch,
  Calculator,
  TrendingUp,
  Info,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  Download,
  ArrowUpDown,
  Users,
  Activity
} from 'lucide-react'

// Components
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import type { VariableAssignment } from '@/types/statistics-converters'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

// Visualization
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts'
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TTestResult {
  type: 'one-sample' | 'two-sample' | 'paired'
  statistic: number
  pvalue: number
  df: number
  ci_lower?: number
  ci_upper?: number
  mean_diff?: number
  effect_size?: {
    cohens_d: number
    interpretation: string
  }
  assumptions?: {
    normality: { passed: boolean; pvalue: number }
    equal_variance?: { passed: boolean; pvalue: number }
  }
  sample_stats?: {
    group1?: { mean: number; std: number; n: number }
    group2?: { mean: number; std: number; n: number }
  }
}

interface TTestVariables {
  group?: string | string[]
  value?: string | string[]
  [key: string]: string | string[] | undefined
}

export default function TTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('t-test')
  }, [])

  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<TTestResult, TTestVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Page-specific state
  const [activeTab, setActiveTab] = useState<'one-sample' | 'two-sample' | 'paired'>('two-sample')
  const [testValue, setTestValue] = useState<number>(0)

  // Pyodide instance
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
        actions.setError('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [actions])

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '검정 유형',
      description: '분석 방법 선택',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'data',
      number: 2,
      title: '데이터',
      description: '파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '분석할 변수 지정',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과',
      description: '분석 결과 확인',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    }
  ]

  // Method info
  const methodInfo = {
    'one-sample': {
      formula: 't = (x̄ - μ₀) / (s / √n)',
      assumptions: ['정규성', '독립성'],
      sampleSize: '최소 20개 권장',
      usage: '제품 무게가 100g인지, 평균 점수가 70점인지 검정'
    },
    'two-sample': {
      formula: 't = (x̄₁ - x̄₂) / SE',
      assumptions: ['정규성', '등분산성', '독립성'],
      sampleSize: '각 그룹 최소 20개 권장',
      usage: '남녀 성적 차이, 신약 vs 위약 효과 비교'
    },
    'paired': {
      formula: 't = d̄ / (sᴅ / √n)',
      assumptions: ['차이의 정규성', '대응'],
      sampleSize: '최소 20쌍 권장',
      usage: '교육 전후 점수, 다이어트 전후 체중 비교'
    }
  }

  // 데이터 업로드 완료
  // 데이터 업로드 핸들러 (공통 유틸 사용)
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    (uploadedData) => {
      actions.setCurrentStep(2)
      if (actions.setError) {
        actions.setError('')
      }
    },
    't-test'
  )

  // 변수 선택 완료
  const handleVariableSelection = createVariableSelectionHandler<VariableAssignment>(
    actions.setSelectedVariables,
    (variables) => {
      runAnalysis(variables)
    },
    't-test'
  )

  // 분석 실행 - PyodideCore Worker 2
  const runAnalysis = async (variables: VariableAssignment) => {
    if (!pyodideReady) {
      actions.setError?.('통계 엔진이 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.')
      return
    }
    if (!uploadedData) {
      actions.setError?.('데이터를 먼저 업로드해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      let result: TTestResult

      if (activeTab === 'two-sample') {
        // Two-sample t-test
        const group1Var = variables.group1?.[0] || variables.independent?.[0]
        const group2Var = variables.group2?.[0] || variables.independent?.[1]

        if (!group1Var || !group2Var) {
          throw new Error('두 개의 그룹 변수를 선택해주세요.')
        }

        const group1Data = uploadedData.data
          .map(row => row[group1Var])
          .filter((val): val is number => typeof val === 'number' && !isNaN(val))

        const group2Data = uploadedData.data
          .map(row => row[group2Var])
          .filter((val): val is number => typeof val === 'number' && !isNaN(val))

        const workerResult = await pyodideCore.callWorkerMethod<{
          statistic: number
          p_value: number
          df: number
          ci_lower: number
          ci_upper: number
          mean1: number
          mean2: number
          std1: number
          std2: number
          n1: number
          n2: number
          cohens_d: number
          normality1_p: number
          normality2_p: number
          levene_p: number
        }>(2, 't_test_two_sample', {
          group1: group1Data,
          group2: group2Data,
          equal_var: true
        })

        result = {
          type: 'two-sample',
          statistic: workerResult.statistic,
          pvalue: workerResult.p_value,
          df: workerResult.df,
          ci_lower: workerResult.ci_lower,
          ci_upper: workerResult.ci_upper,
          mean_diff: workerResult.mean1 - workerResult.mean2,
          effect_size: {
            cohens_d: workerResult.cohens_d,
            interpretation: getEffectSizeInterpretation(workerResult.cohens_d)
          },
          assumptions: {
            normality: {
              passed: workerResult.normality1_p > 0.05 && workerResult.normality2_p > 0.05,
              pvalue: Math.min(workerResult.normality1_p, workerResult.normality2_p)
            },
            equal_variance: {
              passed: workerResult.levene_p > 0.05,
              pvalue: workerResult.levene_p
            }
          },
          sample_stats: {
            group1: {
              mean: workerResult.mean1,
              std: workerResult.std1,
              n: workerResult.n1
            },
            group2: {
              mean: workerResult.mean2,
              std: workerResult.std2,
              n: workerResult.n2
            }
          }
        }
      } else {
        // TODO: Implement one-sample and paired t-tests
        throw new Error('현재 two-sample t-test만 지원됩니다.')
      }

      actions.completeAnalysis(result, 3)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }

  const getEffectSizeInterpretation = (d: number): string => {
    const absD = Math.abs(d)
    if (absD < 0.2) return '매우 작은 효과'
    if (absD < 0.5) return '작은 효과'
    if (absD < 0.8) return '중간 효과'
    return '큰 효과'
  }

  // 결과 해석
  const getResultInterpretation = (result: TTestResult) => {
    const significant = result.pvalue < 0.05
    const alpha = 0.05

    return {
      significant,
      conclusion: significant
        ? `귀무가설을 기각합니다 (p = ${result.pvalue.toFixed(4)} < ${alpha})`
        : `귀무가설을 기각할 수 없습니다 (p = ${result.pvalue.toFixed(4)} ≥ ${alpha})`,
      interpretation: getDetailedInterpretation(result, significant),
      recommendation: getRecommendation(result, significant)
    }
  }

  const getDetailedInterpretation = (result: TTestResult, significant: boolean) => {
    switch (result.type) {
      case 'one-sample':
        return significant
          ? `표본 평균이 검정값(${testValue})과 통계적으로 유의한 차이를 보입니다.`
          : `표본 평균이 검정값(${testValue})과 통계적으로 유의한 차이를 보이지 않습니다.`

      case 'two-sample':
        return significant
          ? `두 그룹 간 평균에 통계적으로 유의한 차이가 있습니다. 평균 차이는 ${Math.abs(result.mean_diff || 0).toFixed(2)}입니다.`
          : `두 그룹 간 평균에 통계적으로 유의한 차이가 없습니다.`

      case 'paired':
        return significant
          ? `전후 측정값에 통계적으로 유의한 차이가 있습니다. 평균 변화량은 ${Math.abs(result.mean_diff || 0).toFixed(2)}입니다.`
          : `전후 측정값에 통계적으로 유의한 차이가 없습니다.`

      default:
        return ''
    }
  }

  const getRecommendation = (result: TTestResult, significant: boolean) => {
    const recommendations = []

    // 효과크기 기반 추천
    if (result.effect_size) {
      if (result.effect_size.cohens_d < 0.2) {
        recommendations.push('효과크기가 매우 작습니다. 실질적 의미를 재고려하세요.')
      } else if (result.effect_size.cohens_d > 0.8) {
        recommendations.push('효과크기가 큽니다. 결과의 실용적 가치가 높습니다.')
      }
    }

    // 가정 검정 기반 추천
    if (result.assumptions) {
      if (!result.assumptions.normality?.passed) {
        recommendations.push('정규성 가정 위반. 비모수 검정(Mann-Whitney U)을 고려하세요.')
      }
      if (!result.assumptions.equal_variance?.passed) {
        recommendations.push('등분산성 가정 위반. Welch t-test를 사용하세요.')
      }
    }

    // p-value 경계값 경고
    if (result.pvalue > 0.045 && result.pvalue < 0.055) {
      recommendations.push('p-value가 경계선상에 있습니다. 추가 데이터 수집을 권장합니다.')
    }

    return recommendations
  }

  // Method ID 매핑
  const getMethodId = () => {
    switch (activeTab) {
      case 'one-sample': return 'one-sample-t'
      case 'two-sample': return 'two-sample-t'
      case 'paired': return 'paired-t'
      default: return 'two-sample-t'
    }
  }

  // 시각화용 데이터 생성
  const generateVisualizationData = (result: TTestResult) => {
    if (!result.sample_stats) return null

    const { group1, group2 } = result.sample_stats

    // 그룹 비교 차트 데이터
    const groupData = [
      { name: '그룹 1', mean: group1?.mean || 0, std: group1?.std || 0 },
      { name: '그룹 2', mean: group2?.mean || 0, std: group2?.std || 0 }
    ]

    // 신뢰구간 데이터
    const ciData = [
      { x: 0, y: result.ci_lower || 0 },
      { x: 1, y: result.mean_diff || 0 },
      { x: 2, y: result.ci_upper || 0 }
    ]

    return { groupData, ciData }
  }

  return (
    <StatisticsPageLayout
      title="T-검정 (T-Test)"
      subtitle="평균 차이를 검정하는 모수적 통계 방법"
      icon={<GitBranch className="w-8 h-8" />}
      methodInfo={methodInfo[activeTab]}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => selectedVariables && runAnalysis(selectedVariables as VariableAssignment)}
      onReset={actions.reset}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {/* Step 1: 검정 유형 선택 */}
      {currentStep === 0 && (
        <StepCard
          title="검정 유형 선택"
          description="데이터 구조에 맞는 t-검정 방법을 선택하세요"
          icon={<Calculator className="w-5 h-5 text-primary" />}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'one-sample' | 'two-sample' | 'paired')}>
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="one-sample" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <div className="flex flex-col items-center gap-2 py-2">
                  <Activity className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">일표본</div>
                    <div className="text-xs opacity-80">vs 기준값</div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="two-sample" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <div className="flex flex-col items-center gap-2 py-2">
                  <Users className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">독립표본</div>
                    <div className="text-xs opacity-80">그룹 비교</div>
                  </div>
                </div>
              </TabsTrigger>

              <TabsTrigger value="paired" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <div className="flex flex-col items-center gap-2 py-2">
                  <ArrowUpDown className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-medium">대응표본</div>
                    <div className="text-xs opacity-80">전/후 비교</div>
                  </div>
                </div>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4">
              <TabsContent value="one-sample" className="space-y-4">
                <Alert className="border bg-muted dark:bg-blue-950">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle>일표본 t-검정이란?</AlertTitle>
                  <AlertDescription>
                    하나의 표본 평균이 특정 기준값과 차이가 있는지 검정합니다.
                    예: 제품 무게가 100g인지, 학생 평균이 70점인지
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="test-value">검정값 (기준값)</Label>
                  <Input
                    id="test-value"
                    type="number"
                    placeholder="예: 100"
                    value={testValue}
                    onChange={(e) => setTestValue(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    표본 평균과 비교할 기준값을 입력하세요
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="two-sample">
                <Alert className="border bg-muted dark:bg-green-950">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle>독립표본 t-검정이란?</AlertTitle>
                  <AlertDescription>
                    서로 독립적인 두 그룹의 평균을 비교합니다.
                    예: 남녀 성적 차이, 신약 vs 위약 효과
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="paired">
                <Alert className="border bg-muted dark:bg-purple-950">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle>대응표본 t-검정이란?</AlertTitle>
                  <AlertDescription>
                    동일한 대상의 전후 측정값을 비교합니다.
                    예: 교육 전후 점수, 다이어트 전후 체중
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => actions.setCurrentStep(1)}
                className="bg-gradient-to-r from-blue-500 to-purple-500"
              >
                다음 단계
              </Button>
            </div>
          </Tabs>
        </StepCard>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 1 && (
        <StepCard
          title="데이터 업로드"
          description="분석할 데이터 파일을 선택하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-primary" />}
        >
          <DataUploadStep
            onNext={() => {}}
            onUploadComplete={handleDataUpload}
          />

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="분석에 사용할 변수를 지정하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelectorModern
            methodId={getMethodId()}
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.statistic.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">t-통계량</p>
                </div>
              </CardContent>
            </Card>

            <Card className={analysisResult.pvalue < 0.05 ? "border-2 border-green-500" : "border-2"}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${analysisResult.pvalue < 0.05 ? 'text-muted-foreground' : 'text-gray-600'}`}>
                    {analysisResult.pvalue.toFixed(4)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">p-value</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {analysisResult.df}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">자유도</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.effect_size?.cohens_d.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Cohen&apos;s d</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 해석 */}
          <StepCard
            title="결과 해석"
            icon={<CheckCircle2 className="w-5 h-5 text-muted-foreground" />}
          >
            <div className="space-y-4">
              {(() => {
                const interpretation = getResultInterpretation(analysisResult)
                return (
                  <>
                    <Alert className={interpretation.significant ? "border-green-500 bg-muted dark:bg-green-950" : ""}>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>통계적 결론</AlertTitle>
                      <AlertDescription>
                        <p className="font-medium">{interpretation.conclusion}</p>
                        <p className="mt-2">{interpretation.interpretation}</p>
                      </AlertDescription>
                    </Alert>

                    {interpretation.recommendation.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>권장사항</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1">
                            {interpretation.recommendation.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )
              })()}

              {/* 신뢰구간 */}
              {analysisResult.ci_lower && analysisResult.ci_upper && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">95% 신뢰구간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-mono">
                        [{analysisResult.ci_lower.toFixed(3)}, {analysisResult.ci_upper.toFixed(3)}]
                      </span>
                      <Badge variant={analysisResult.ci_lower * analysisResult.ci_upper > 0 ? "default" : "secondary"}>
                        {analysisResult.ci_lower * analysisResult.ci_upper > 0 ? "0 미포함" : "0 포함"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 가정 검정 */}
              {analysisResult.assumptions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">통계적 가정 검정</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.assumptions.normality && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">정규성 (Shapiro-Wilk)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              p = {analysisResult.assumptions.normality.pvalue.toFixed(4)}
                            </span>
                            <Badge variant={analysisResult.assumptions.normality.passed ? "success" : "destructive"}>
                              {analysisResult.assumptions.normality.passed ? '충족' : '위반'}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {analysisResult.assumptions.equal_variance && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">등분산성 (Levene)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              p = {analysisResult.assumptions.equal_variance.pvalue.toFixed(4)}
                            </span>
                            <Badge variant={analysisResult.assumptions.equal_variance.passed ? "success" : "destructive"}>
                              {analysisResult.assumptions.equal_variance.passed ? '충족' : '위반'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 효과크기 해석 */}
              {analysisResult.effect_size && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">효과크기 분석</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cohen&apos;s d</span>
                        <span className="text-2xl font-bold">
                          {analysisResult.effect_size.cohens_d.toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.abs(analysisResult.effect_size.cohens_d) * 50)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-white mix-blend-difference">
                            {analysisResult.effect_size.interpretation}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>작음 (0.2)</span>
                        <span>중간 (0.5)</span>
                        <span>큼 (0.8)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </StepCard>

          {/* 시각화 */}
          {analysisResult.sample_stats && (
            <StepCard
              title="데이터 시각화"
              icon={<BarChart3 className="w-5 h-5 text-primary" />}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* 그룹 평균 비교 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">그룹별 평균 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={generateVisualizationData(analysisResult)?.groupData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="mean" fill="#8884d8">
                          <Cell fill="#3b82f6" />
                          <Cell fill="#a855f7" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 신뢰구간 플롯 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">평균 차이 신뢰구간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={generateVisualizationData(analysisResult)?.ciData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis hide />
                        <YAxis />
                        <RechartsTooltip />
                        <ReferenceLine y={0} stroke="red" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="y" stroke="#8884d8" strokeWidth={2} />
                        <Area type="monotone" dataKey="y" fill="#8884d8" fillOpacity={0.3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </StepCard>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={actions.reset}
            >
              새 분석
            </Button>

            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                결과 저장
              </Button>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                보고서 생성
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </StatisticsPageLayout>
  )
}