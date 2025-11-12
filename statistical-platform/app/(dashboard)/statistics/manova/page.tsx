'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { MANOVAVariables } from '@/types/statistics'
import { toMANOVAVariables, type VariableAssignment } from '@/types/statistics-converters'
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
  // GitBranch,
  Settings,
  Layers3
} from 'lucide-react'

// Components
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ManovaResult {
  overallTests: {
    test: string
    statistic: number
    approximate_f: number
    numerator_df: number
    denominator_df: number
    pValue: number
  }[]
  univariateTests: {
    variable: string
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number
    pValue: number
    etaSquared: number
    observedPower: number
  }[]
  canonicalAnalysis: {
    eigenvalue: number
    canonicalCorrelation: number
    wilksLambda: number
    fStatistic: number
    pValue: number
    proportionOfVariance: number
  }[]
  discriminantFunctions: {
    function: number
    coefficients: { variable: string, coefficient: number }[]
    groupCentroids: { group: string, centroid: number }[]
  }[]
  descriptiveStats: {
    group: string
    variable: string
    n: number
    mean: number
    std: number
    se: number
    ci95Lower: number
    ci95Upper: number
  }[]
  postHoc: {
    variable: string
    comparison: string
    meanDiff: number
    standardError: number
    tValue: number
    pValue: number
    adjustedPValue: number
    cohensD: number
    lowerCI: number
    upperCI: number
  }[]
  assumptions: {
    multivariateNormality: {
      test: string
      statistic: number
      pValue: number
      assumptionMet: boolean
    }
    homogeneityOfCovariance: {
      boxM: number
      fStatistic: number
      pValue: number
      assumptionMet: boolean
    }
    sphericity: {
      mauchlysW: number
      pValue: number
      assumptionMet: boolean
      epsilonGG: number
      epsilonHF: number
    } | null
    outliers: {
      multivariate: {
        observation: number
        mahalanobisDistance: number
        pValue: number
        isOutlier: boolean
      }[]
    }
  }
  modelFit: {
    pillaiTrace: number
    wilksLambda: number
    hotellingTrace: number
    royMaxRoot: number
    rSquaredMultivariate: number
    effectSize: number
  }
  interpretation: {
    summary: string
    overallEffect: string
    univariateEffects: string[]
    discriminantInterpretation: string
    recommendations: string[]
  }
}

export default function ManovaPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('manova')
  }, [])

  const { state, actions } = useStatisticsPage<ManovaResult, MANOVAVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables: _selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Pyodide instance
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  // Initialize Pyodide - 메모리 누수 방지
  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const initPyodide = async () => {
      try {
        if (abortController.signal.aborted) return
        await pyodideStats.initialize()
        if (isMounted && !abortController.signal.aborted) {
          setPyodide(pyodideStats)
        }
      } catch (err) {
        if (isMounted && !abortController.signal.aborted) {
          console.error('Pyodide 초기화 실패:', err)
          actions.setError('통계 엔진을 초기화할 수 없습니다.')
        }
      }
    }

    initPyodide()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [actions])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'MANOVA의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'MANOVA 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '여러 종속변수와 독립변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '분석 결과',
      description: '다변량 검정, 단변량 검정, 판별분석',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  const methodInfo = useMemo(() => ({
    title: "다변량 분산분석 (MANOVA)",
    description: "여러 종속변수를 동시에 분석하여 집단 간 차이를 검정합니다.",
    keyFeatures: [
      "다변량 검정 (Wilks' Lambda, Pillai's Trace)",
      "단변량 F 검정 (각 종속변수별)",
      "정준 판별분석",
      "다변량 효과크기 계산",
      "포괄적 가정 검정"
    ],
    assumptions: [
      "다변량 정규성: 종속변수들의 결합분포가 정규분포",
      "공분산 행렬 동질성: 집단 간 공분산 행렬이 동일",
      "독립성: 관측값들이 서로 독립",
      "다중공선성 부재: 종속변수 간 완전한 선형관계 없음"
    ],
    useCases: [
      "여러 결과변수 동시 비교",
      "심리학 연구 (인지능력 다면 평가)",
      "교육학 연구 (다중 성취도 평가)",
      "의학 연구 (다양한 생리지표 분석)"
    ]
  }), [])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'manova'
  )

  const runAnalysis = useCallback(async (_variables: MANOVAVariables) => {
    if (!pyodide || !uploadedData) {
      actions.setError('데이터나 통계 엔진이 준비되지 않았습니다.')
      return
    }

    actions.startAnalysis()

    try {
      // Mock MANOVA 결과
      const mockResult: ManovaResult = {
        overallTests: [
          { test: "Pillai&apos;s Trace", statistic: 0.423, approximate_f: 5.68, numerator_df: 6, denominator_df: 174, pValue: 0.0001 },
          { test: "Wilks&apos; Lambda", statistic: 0.603, approximate_f: 6.12, numerator_df: 6, denominator_df: 172, pValue: 0.0001 },
          { test: "Hotelling&apos;s Trace", statistic: 0.632, approximate_f: 6.58, numerator_df: 6, denominator_df: 170, pValue: 0.0001 },
          { test: "Roy&apos;s Max Root", statistic: 0.465, approximate_f: 13.45, numerator_df: 3, denominator_df: 87, pValue: 0.0001 }
        ],
        univariateTests: [
          { variable: "Math Score", sumSquares: 2850.45, degreesOfFreedom: 2, meanSquare: 1425.23, fStatistic: 18.47, pValue: 0.0001, etaSquared: 0.298, observedPower: 0.995 },
          { variable: "Reading Score", sumSquares: 1980.32, degreesOfFreedom: 2, meanSquare: 990.16, fStatistic: 12.84, pValue: 0.0001, etaSquared: 0.227, observedPower: 0.988 },
          { variable: "Science Score", sumSquares: 1650.78, degreesOfFreedom: 2, meanSquare: 825.39, fStatistic: 10.71, pValue: 0.0001, etaSquared: 0.197, observedPower: 0.982 }
        ],
        canonicalAnalysis: [
          { eigenvalue: 0.465, canonicalCorrelation: 0.563, wilksLambda: 0.603, fStatistic: 6.58, pValue: 0.0001, proportionOfVariance: 73.6 },
          { eigenvalue: 0.167, canonicalCorrelation: 0.378, wilksLambda: 0.857, fStatistic: 2.34, pValue: 0.045, proportionOfVariance: 26.4 }
        ],
        discriminantFunctions: [
          {
            function: 1,
            coefficients: [
              { variable: "Math Score", coefficient: 0.642 },
              { variable: "Reading Score", coefficient: 0.478 },
              { variable: "Science Score", coefficient: 0.593 }
            ],
            groupCentroids: [
              { group: "Group A", centroid: -1.23 },
              { group: "Group B", centroid: 0.45 },
              { group: "Group C", centroid: 0.78 }
            ]
          },
          {
            function: 2,
            coefficients: [
              { variable: "Math Score", coefficient: 0.289 },
              { variable: "Reading Score", coefficient: -0.734 },
              { variable: "Science Score", coefficient: 0.456 }
            ],
            groupCentroids: [
              { group: "Group A", centroid: 0.67 },
              { group: "Group B", centroid: -0.92 },
              { group: "Group C", centroid: 0.25 }
            ]
          }
        ],
        descriptiveStats: [
          { group: "Group A", variable: "Math Score", n: 30, mean: 78.5, std: 8.2, se: 1.5, ci95Lower: 75.4, ci95Upper: 81.6 },
          { group: "Group A", variable: "Reading Score", n: 30, mean: 82.1, std: 7.8, se: 1.4, ci95Lower: 79.2, ci95Upper: 85.0 },
          { group: "Group A", variable: "Science Score", n: 30, mean: 75.3, std: 9.1, se: 1.7, ci95Lower: 71.9, ci95Upper: 78.7 },
          { group: "Group B", variable: "Math Score", n: 30, mean: 85.2, std: 7.9, se: 1.4, ci95Lower: 82.3, ci95Upper: 88.1 },
          { group: "Group B", variable: "Reading Score", n: 30, mean: 88.9, std: 8.4, se: 1.5, ci95Lower: 85.8, ci95Upper: 92.0 },
          { group: "Group B", variable: "Science Score", n: 30, mean: 81.8, std: 8.7, se: 1.6, ci95Lower: 78.6, ci95Upper: 85.0 },
          { group: "Group C", variable: "Math Score", n: 30, mean: 72.1, std: 9.5, se: 1.7, ci95Lower: 68.6, ci95Upper: 75.6 },
          { group: "Group C", variable: "Reading Score", n: 30, mean: 76.8, std: 8.9, se: 1.6, ci95Lower: 73.5, ci95Upper: 80.1 },
          { group: "Group C", variable: "Science Score", n: 30, mean: 69.5, std: 10.2, se: 1.9, ci95Lower: 65.7, ci95Upper: 73.3 }
        ],
        postHoc: [
          { variable: "Math Score", comparison: "Group A vs Group B", meanDiff: -6.7, standardError: 2.1, tValue: -3.19, pValue: 0.002, adjustedPValue: 0.006, cohensD: 0.85, lowerCI: -10.9, upperCI: -2.5 },
          { variable: "Math Score", comparison: "Group A vs Group C", meanDiff: 6.4, standardError: 2.1, tValue: 3.05, pValue: 0.003, adjustedPValue: 0.009, cohensD: 0.73, lowerCI: 2.2, upperCI: 10.6 },
          { variable: "Math Score", comparison: "Group B vs Group C", meanDiff: 13.1, standardError: 2.1, tValue: 6.24, pValue: 0.0001, adjustedPValue: 0.0001, cohensD: 1.58, lowerCI: 8.9, upperCI: 17.3 },
          { variable: "Reading Score", comparison: "Group A vs Group B", meanDiff: -6.8, standardError: 2.0, tValue: -3.40, pValue: 0.001, adjustedPValue: 0.003, cohensD: 0.84, lowerCI: -10.8, upperCI: -2.8 },
          { variable: "Reading Score", comparison: "Group A vs Group C", meanDiff: 5.3, standardError: 2.0, tValue: 2.65, pValue: 0.009, adjustedPValue: 0.027, cohensD: 0.61, lowerCI: 1.3, upperCI: 9.3 },
          { variable: "Reading Score", comparison: "Group B vs Group C", meanDiff: 12.1, standardError: 2.0, tValue: 6.05, pValue: 0.0001, adjustedPValue: 0.0001, cohensD: 1.45, lowerCI: 8.1, upperCI: 16.1 }
        ],
        assumptions: {
          multivariateNormality: {
            test: "Mardia&apos;s Test",
            statistic: 12.45,
            pValue: 0.087,
            assumptionMet: true
          },
          homogeneityOfCovariance: {
            boxM: 18.67,
            fStatistic: 2.03,
            pValue: 0.124,
            assumptionMet: true
          },
          sphericity: null,
          outliers: {
            multivariate: [
              { observation: 23, mahalanobisDistance: 15.67, pValue: 0.023, isOutlier: true },
              { observation: 56, mahalanobisDistance: 14.89, pValue: 0.031, isOutlier: true },
              { observation: 78, mahalanobisDistance: 16.23, pValue: 0.018, isOutlier: true }
            ]
          }
        },
        modelFit: {
          pillaiTrace: 0.423,
          wilksLambda: 0.603,
          hotellingTrace: 0.632,
          royMaxRoot: 0.465,
          rSquaredMultivariate: 0.397,
          effectSize: 0.63
        },
        interpretation: {
          summary: "다변량 검정 결과 집단 간 유의한 차이가 있습니다 (Wilks&apos; Λ = 0.603, F(6, 172) = 6.12, p &lt; 0.001).",
          overallEffect: "중간에서 큰 크기의 다변량 효과가 관찰됩니다 (η²multivariate = 0.397).",
          univariateEffects: [
            "Math Score에서 가장 강한 집단 간 차이 (F = 18.47, p &lt; 0.001, η² = 0.298)",
            "Reading Score에서도 유의한 집단 간 차이 (F = 12.84, p &lt; 0.001, η² = 0.227)",
            "Science Score에서 중간 정도의 집단 간 차이 (F = 10.71, p &lt; 0.001, η² = 0.197)"
          ],
          discriminantInterpretation: "첫 번째 판별함수가 전체 분산의 73.6%를 설명하며, 주로 Math와 Science 점수에서 집단을 구분합니다.",
          recommendations: [
            "다변량 효과가 유의하므로 단변량 분석도 신뢰할 수 있습니다",
            "Group B가 모든 영역에서 가장 높은 성과를 보입니다",
            "다변량 이상치 3개를 추가 검토할 필요가 있습니다",
            "판별함수를 활용하여 집단 분류 모델을 구축할 수 있습니다"
          ]
        }
      }

      actions.completeAnalysis(mockResult, 3)
    } catch (err) {
      console.error('MANOVA 분석 실패:', err)
      actions.setError('MANOVA 분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, pyodide, actions])

  const handleVariableSelection = createVariableSelectionHandler<MANOVAVariables>(
    (vars) => actions.setSelectedVariables?.(vars ? toMANOVAVariables(vars as unknown as VariableAssignment) : null),
    (variables) => {
      if (variables.dependent && variables.factor &&
          variables.dependent.length >= 2 && variables.factor.length >= 1) {
        runAnalysis(variables)
      }
    },
    'manova'
  )

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '효과 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const _getCohensInterpretation = (d: number) => {
    const absD = Math.abs(d)
    if (absD >= 0.8) return '큰 효과'
    if (absD >= 0.5) return '중간 효과'
    if (absD >= 0.2) return '작은 효과'
    return '효과 없음'
  }

  return (
    <StatisticsPageLayout
      title="다변량 분산분석"
      subtitle="Multivariate Analysis of Variance (MANOVA)"
      description="여러 종속변수를 동시에 분석하여 집단 간 차이 검정"
      icon={<Layers3 className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="다변량 분산분석 소개"
          description="여러 종속변수의 동시 분석"
          icon={<Info className="w-5 h-5 text-blue-500" />}
        >
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
                    여러 종속변수에 대한 집단 간 차이를 동시에 검정하여 1종 오류를 통제합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 다변량 검정으로 전체적 차이 확인</li>
                    <li>• 종속변수별 단변량 F 검정</li>
                    <li>• 정준 판별분석으로 차이 패턴 파악</li>
                    <li>• 다변량 효과크기 계산</li>
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
                      <p className="text-muted-foreground">학습법이 수학, 국어, 과학 성취도에 미치는 효과</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">심리 연구</h4>
                      <p className="text-muted-foreground">치료법이 불안, 우울, 스트레스에 미치는 영향</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">의학 연구</h4>
                      <p className="text-muted-foreground">약물이 혈압, 콜레스테롤, 혈당에 미치는 효과</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>ANOVA vs MANOVA</AlertTitle>
              <AlertDescription>
                • ANOVA: 종속변수 1개, 독립변수 1개 이상<br/>
                • MANOVA: 종속변수 2개 이상, 독립변수 1개 이상<br/>
                • MANOVA 장점: 1종 오류 통제, 종속변수 간 상관 고려<br/>
                • 다변량 효과가 유의하면 단변량 분석 실시
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted border border rounded-lg">
              <h4 className="font-medium mb-2">다변량 검정 통계량</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Pillai&apos;s Trace:</strong> 가장 보수적, 가정 위반에 강함</li>
                <li>• <strong>Wilks&apos; Lambda:</strong> 가장 일반적, 검정력 높음</li>
                <li>• <strong>Hotelling&apos;s Trace:</strong> 표본 크기가 클 때 유용</li>
                <li>• <strong>Roy&apos;s Max Root:</strong> 가장 자유롭지만 가정에 민감</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => actions.setCurrentStep(1)}>
                다음: 데이터 업로드
              </Button>
            </div>
          </div>
        </StepCard>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 1 && (
        <StepCard
          title="데이터 업로드"
          description="MANOVA 분석용 데이터를 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUpload}
          />

          <Alert className="mt-4">
            <Layers3 className="h-4 w-4" />
            <AlertTitle>MANOVA 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 관측값을 나타냅니다<br/>
              • 종속변수들: 연속형 변수 2개 이상 (예: 수학점수, 국어점수, 과학점수)<br/>
              • 독립변수: 범주형 변수 1개 이상 (예: 집단, 처치조건)<br/>
              • 종속변수들 간에는 상관관계가 있어야 효과적<br/>
              • 각 집단에 충분한 표본 수 필요 (최소 20개 이상 권장)
            </AlertDescription>
          </Alert>

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
          description="여러 종속변수와 독립변수를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelectorModern
            methodId="manova"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 분석하고자 하는 연속형 결과 변수들 (2개 이상)<br/>
              • 독립변수: 집단을 구분하는 범주형 변수 (1개 이상)<br/>
              • 종속변수들은 서로 상관이 있어야 MANOVA가 효과적<br/>
              • 예: 종속변수(수학, 국어, 과학점수), 독립변수(학습법)
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <StepCard
          title="MANOVA 분석 결과"
          description="다변량 검정, 단변량 검정, 판별분석 결과"
          icon={<BarChart3 className="w-5 h-5 text-green-500" />}
        >
          <Tabs defaultValue="multivariate" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="multivariate">다변량 검정</TabsTrigger>
              <TabsTrigger value="univariate">단변량 검정</TabsTrigger>
              <TabsTrigger value="descriptives">기술통계</TabsTrigger>
              <TabsTrigger value="discriminant">판별분석</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
            </TabsList>

            {/* 다변량 검정 탭 */}
            <TabsContent value="multivariate" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers3 className="w-5 h-5" />
                    다변량 검정 결과
                  </CardTitle>
                  <CardDescription>4가지 다변량 검정 통계량</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="다변량 검정 통계량"
                    columns={[
                      { key: 'test', header: '검정', type: 'text', align: 'left' },
                      { key: 'statistic', header: '통계량', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                      { key: 'approximateF', header: '근사 F', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'df', header: '자유도', type: 'custom', align: 'center', formatter: (v: string) => v },
                      { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'interpretation', header: '해석', type: 'custom', align: 'center', formatter: (v) => v }
                    ]}
                    data={analysisResult.overallTests.map(test => ({
                      test: test.test,
                      statistic: test.statistic,
                      approximateF: test.approximate_f,
                      df: `${test.numerator_df}, ${test.denominator_df}`,
                      pValue: <PValueBadge value={test.pValue} />,
                      interpretation: (
                        <Badge variant={test.pValue < 0.05 ? "default" : "outline"}>
                          {test.pValue < 0.05 ? "유의함" : "유의하지 않음"}
                        </Badge>
                      )
                    }))}
                    bordered
                    compactMode
                  />

                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>다변량 검정 해석</AlertTitle>
                    <AlertDescription>
                      모든 다변량 검정에서 유의한 결과를 보입니다 (p &lt; 0.001).
                      Wilks&apos; Lambda = {analysisResult.overallTests[1].statistic.toFixed(3)}로,
                      집단 간 다변량 차이가 존재함을 의미합니다.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* 모델 적합도 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    다변량 효과크기
                  </CardTitle>
                  <CardDescription>전체 모델의 설명력</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">다변량 R²</h4>
                        <p className="text-2xl font-bold">
                          {(analysisResult.modelFit.rSquaredMultivariate * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          전체 다변량 변동의 설명 비율
                        </p>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">효과크기 (d)</h4>
                        <p className="text-2xl font-bold">
                          {analysisResult.modelFit.effectSize.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Cohen의 다변량 효과크기
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-3">검정 통계량 요약</h4>
                        <div className="space-y-2 text-sm">
                          <p>Pillai&apos;s Trace: {analysisResult.modelFit.pillaiTrace.toFixed(3)}</p>
                          <p>Wilks&apos; Lambda: {analysisResult.modelFit.wilksLambda.toFixed(3)}</p>
                          <p>Hotelling&apos;s Trace: {analysisResult.modelFit.hotellingTrace.toFixed(3)}</p>
                          <p>Roy&apos;s Max Root: {analysisResult.modelFit.royMaxRoot.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 단변량 검정 탭 */}
            <TabsContent value="univariate" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    단변량 F 검정
                  </CardTitle>
                  <CardDescription>각 종속변수별 ANOVA 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="일변량 ANOVA 결과"
                    columns={[
                      { key: 'variable', header: '종속변수', type: 'text', align: 'left' },
                      { key: 'sumSquares', header: '제곱합', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'df', header: '자유도', type: 'number', align: 'center' },
                      { key: 'meanSquare', header: '평균제곱', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'fStatistic', header: 'F', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'etaSquared', header: 'η²', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'power', header: '검정력', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) }
                    ]}
                    data={analysisResult.univariateTests.map(test => {
                      const effectSize = getEffectSizeInterpretation(test.etaSquared)
                      return {
                        variable: test.variable,
                        sumSquares: test.sumSquares,
                        df: test.degreesOfFreedom,
                        meanSquare: test.meanSquare,
                        fStatistic: test.fStatistic,
                        pValue: <PValueBadge value={test.pValue} />,
                        etaSquared: (
                          <Badge variant="outline" className={`${effectSize.color} ${effectSize.bg}`}>
                            {test.etaSquared.toFixed(3)}
                          </Badge>
                        ),
                        power: test.observedPower
                      }
                    })}
                    bordered
                    compactMode
                  />

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>단변량 검정 해석</AlertTitle>
                    <AlertDescription>
                      다변량 검정이 유의하므로 단변량 검정 결과를 신뢰할 수 있습니다.
                      모든 종속변수에서 집단 간 유의한 차이가 관찰됩니다.
                      Math Score에서 가장 큰 효과크기를 보입니다 (η² = 0.298).
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* 사후검정 결과 */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    사후검정 (Post-hoc Tests)
                  </CardTitle>
                  <CardDescription>단변량 검정에 대한 다중비교 (Bonferroni 보정)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">종속변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">비교</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">표준오차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">보정된 p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Cohen&apos;s d</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.postHoc.slice(0, 6).map((test, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{test.variable}</td>
                            <td className="border border-gray-300 px-4 py-2">{test.comparison}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.meanDiff.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.standardError.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={test.pValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={test.adjustedPValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge variant="outline" className={
                                Math.abs(test.cohensD) >= 0.8 ? 'text-muted-foreground bg-muted' :
                                Math.abs(test.cohensD) >= 0.5 ? 'text-muted-foreground bg-muted' :
                                Math.abs(test.cohensD) >= 0.2 ? 'text-muted-foreground bg-muted' : 'text-gray-600 bg-gray-50'
                              }>
                                {test.cohensD.toFixed(2)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 기술통계 탭 */}
            <TabsContent value="descriptives" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    집단별 기술통계
                  </CardTitle>
                  <CardDescription>각 집단의 종속변수별 기본 통계량</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-center">집단</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">종속변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">N</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">표준편차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">표준오차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.descriptiveStats.map((stat, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 text-center font-medium">{stat.group}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.n}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{stat.mean.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.std.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.se.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              [{stat.ci95Lower.toFixed(2)}, {stat.ci95Upper.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 판별분석 탭 */}
            <TabsContent value="discriminant" className="mt-6 space-y-6">
              {/* 정준 상관분석 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    정준 상관분석
                  </CardTitle>
                  <CardDescription>판별함수의 고유값과 설명력</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-center">함수</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">고유값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">정준상관</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Wilks&apos; Λ</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">F</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">분산 설명 (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.canonicalAnalysis.map((analysis, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 text-center font-medium">{index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{analysis.eigenvalue.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{analysis.canonicalCorrelation.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{analysis.wilksLambda.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{analysis.fStatistic.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={analysis.pValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                              {analysis.proportionOfVariance.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 판별함수 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    판별함수 계수
                  </CardTitle>
                  <CardDescription>표준화된 판별함수 계수</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {analysisResult.discriminantFunctions.map((func, funcIndex) => (
                      <div key={funcIndex} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">판별함수 {func.function}</h4>
                        <div className="space-y-2">
                          {func.coefficients.map((coef, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{coef.variable}:</span>
                              <span className="font-medium">{coef.coefficient.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 집단 중심점 */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">집단 중심점 (Group Centroids)</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      {analysisResult.discriminantFunctions.map((func, funcIndex) => (
                        <div key={funcIndex}>
                          <h5 className="text-sm font-medium mb-2">판별함수 {func.function}</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="border border-gray-300 px-3 py-1 text-left">집단</th>
                                  <th className="border border-gray-300 px-3 py-1 text-center">중심점</th>
                                </tr>
                              </thead>
                              <tbody>
                                {func.groupCentroids.map((centroid, index) => (
                                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-3 py-1">{centroid.group}</td>
                                    <td className="border border-gray-300 px-3 py-1 text-center font-medium">
                                      {centroid.centroid.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 가정검정 탭 */}
            <TabsContent value="assumptions" className="mt-6 space-y-6">
              {/* 다변량 정규성 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    다변량 정규성
                  </CardTitle>
                  <CardDescription>Mardia 검정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">검정법</p>
                        <p className="text-lg">{analysisResult.assumptions.multivariateNormality.test}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">통계량</p>
                        <p className="text-lg">{analysisResult.assumptions.multivariateNormality.statistic.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">p-value</p>
                        <PValueBadge value={analysisResult.assumptions.multivariateNormality.pValue} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium">가정 충족</p>
                      {analysisResult.assumptions.multivariateNormality.assumptionMet ? (
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-muted-foreground">다변량 정규성 가정이 충족되었습니다</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="text-muted-foreground">다변량 정규성 가정이 위반되었습니다</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 공분산 행렬 동질성 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    공분산 행렬 동질성
                  </CardTitle>
                  <CardDescription>Box&apos;s M 검정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Box&apos;s M</p>
                        <p className="text-lg">{analysisResult.assumptions.homogeneityOfCovariance.boxM.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">F 통계량</p>
                        <p className="text-lg">{analysisResult.assumptions.homogeneityOfCovariance.fStatistic.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">p-value</p>
                        <PValueBadge value={analysisResult.assumptions.homogeneityOfCovariance.pValue} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium">가정 충족</p>
                      {analysisResult.assumptions.homogeneityOfCovariance.assumptionMet ? (
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-muted-foreground">공분산 행렬 동질성 가정이 충족되었습니다</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="text-muted-foreground">공분산 행렬 동질성 가정이 위반되었습니다</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Box&apos;s M 검정 해석</AlertTitle>
                    <AlertDescription>
                      {analysisResult.assumptions.homogeneityOfCovariance.assumptionMet
                        ? "공분산 행렬이 집단 간 동질하므로 MANOVA 결과를 신뢰할 수 있습니다."
                        : "공분산 행렬 동질성이 위반되었으나, MANOVA는 이 가정 위반에 상당히 강합니다. Pillai's Trace를 우선적으로 참고하시기 바랍니다."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* 다변량 이상치 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    다변량 이상치
                  </CardTitle>
                  <CardDescription>Mahalanobis 거리 기반 이상치 탐지</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-center">관측값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Mahalanobis 거리</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">이상치 여부</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.assumptions.outliers.multivariate
                          .filter(outlier => outlier.isOutlier)
                          .map((outlier, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2 text-center font-medium">#{outlier.observation}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{outlier.mahalanobisDistance.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <PValueBadge value={outlier.pValue} />
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <Badge variant="outline" className="text-muted-foreground bg-muted">
                                  이상치
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length > 0 && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>다변량 이상치 발견</AlertTitle>
                      <AlertDescription>
                        {analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length}개의
                        다변량 이상치가 발견되었습니다. 이상치를 제거한 후 재분석을 고려해보시기 바랍니다.
                      </AlertDescription>
                    </Alert>
                  )}
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
                  <CardDescription>MANOVA 결과의 종합적 해석</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 요약 */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">분석 요약</h4>
                    <p className="text-muted-foreground">{analysisResult.interpretation.summary}</p>
                  </div>

                  {/* 전체 효과 */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">다변량 효과</h4>
                    <p className="text-muted-foreground">{analysisResult.interpretation.overallEffect}</p>
                  </div>

                  {/* 단변량 효과 해석 */}
                  <div>
                    <h4 className="font-medium mb-3">단변량 효과 해석</h4>
                    <div className="space-y-2">
                      {analysisResult.interpretation.univariateEffects.map((interpretation, index) => (
                        <div key={index} className="p-3 bg-muted rounded border-l-4 border-yellow-400">
                          <p className="text-muted-foreground text-sm">{interpretation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 판별분석 해석 */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">판별분석 해석</h4>
                    <p className="text-muted-foreground">{analysisResult.interpretation.discriminantInterpretation}</p>
                  </div>

                  {/* 권장사항 */}
                  <div>
                    <h4 className="font-medium mb-3">권장사항</h4>
                    <ul className="space-y-2">
                      {analysisResult.interpretation.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Alert>
                    <Layers3 className="h-4 w-4" />
                    <AlertTitle>MANOVA 해석 순서</AlertTitle>
                    <AlertDescription>
                      1. 다변량 검정에서 유의성 확인 → 2. 단변량 F 검정 해석 →
                      3. 사후검정으로 구체적 차이 확인 → 4. 판별분석으로 차이 패턴 이해
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
              다시 분석
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              결과 다운로드
            </Button>
          </div>
        </StepCard>
      )}

      {/* Loading and Error States */}
      {isAnalyzing && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>MANOVA 분석을 수행하고 있습니다...</p>
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
    </StatisticsPageLayout>
  )
}