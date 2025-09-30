'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
  GitBranch,
  Settings,
  Layers
} from 'lucide-react'

// Components
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import type { VariableAssignment } from '@/components/variable-selection/VariableSelector'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ThreeWayAnovaResult {
  mainEffects: {
    factor: string
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number
    pValue: number
    etaSquared: number
    observedPower: number
  }[]
  twoWayInteractions: {
    factors: string
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number
    pValue: number
    etaSquared: number
  }[]
  threeWayInteraction: {
    factors: string
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number
    pValue: number
    etaSquared: number
  }
  error: {
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
  }
  total: {
    sumSquares: number
    degreesOfFreedom: number
  }
  descriptiveStats: {
    factorA: string
    factorB: string
    factorC: string
    n: number
    mean: number
    std: number
    se: number
    ci95Lower: number
    ci95Upper: number
  }[]
  postHoc: {
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
    normalityByGroup: {
      group: string
      shapiroW: number
      pValue: number
      assumptionMet: boolean
    }[]
    homogeneityOfVariance: {
      leveneStatistic: number
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
  }
  modelFit: {
    rSquared: number
    adjustedRSquared: number
    fStatistic: number
    modelPValue: number
    residualStandardError: number
  }
  interpretation: {
    summary: string
    mainEffectsInterpretation: string[]
    interactionInterpretation: string
    recommendations: string[]
  }
}

export default function ThreeWayAnovaPage() {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
  const [_selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
  const [analysisResult, setAnalysisResult] = useState<ThreeWayAnovaResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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
          setError('통계 엔진을 초기화할 수 없습니다.')
        }
      }
    }

    initPyodide()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: '삼원분산분석의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '삼원분산분석 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 3개 독립변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '분석 결과',
      description: '주효과, 상호작용, 사후검정',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  const methodInfo = useMemo(() => ({
    title: "삼원분산분석 (Three-way ANOVA)",
    description: "3개 독립변수의 주효과와 모든 상호작용 효과를 분석합니다.",
    keyFeatures: [
      "3개 주효과 분석",
      "3개 2원 상호작용 분석",
      "1개 3원 상호작용 분석",
      "포괄적 사후검정",
      "가정 검정 및 진단"
    ],
    assumptions: [
      "정규성: 각 조건별 정규분포",
      "등분산성: 집단 간 분산 동일",
      "독립성: 관측값 독립",
      "무선 표집: 표본의 무선성"
    ],
    useCases: [
      "복잡한 실험 설계 분석",
      "다중 처치 효과 검증",
      "상호작용 패턴 규명"
    ]
  }), [])

  const handleDataUpload = useCallback((data: DataRow[]) => {
    setUploadedData(data)
    setCurrentStep(2)
  }, [])

  const runAnalysis = useCallback(async (_variables: VariableAssignment) => {
    if (!pyodide || !uploadedData) {
      setError('데이터나 통계 엔진이 준비되지 않았습니다.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      // Mock 삼원분산분석 결과
      const mockResult: ThreeWayAnovaResult = {
        mainEffects: [
          { factor: "Factor A", sumSquares: 450.25, degreesOfFreedom: 2, meanSquare: 225.13, fStatistic: 18.47, pValue: 0.0001, etaSquared: 0.298, observedPower: 0.995 },
          { factor: "Factor B", sumSquares: 280.50, degreesOfFreedom: 1, meanSquare: 280.50, fStatistic: 23.04, pValue: 0.0001, etaSquared: 0.186, observedPower: 0.997 },
          { factor: "Factor C", sumSquares: 195.75, degreesOfFreedom: 2, meanSquare: 97.88, fStatistic: 8.04, pValue: 0.001, etaSquared: 0.130, observedPower: 0.948 }
        ],
        twoWayInteractions: [
          { factors: "A × B", sumSquares: 125.40, degreesOfFreedom: 2, meanSquare: 62.70, fStatistic: 5.15, pValue: 0.008, etaSquared: 0.083 },
          { factors: "A × C", sumSquares: 98.60, degreesOfFreedom: 4, meanSquare: 24.65, fStatistic: 2.03, pValue: 0.098, etaSquared: 0.066 },
          { factors: "B × C", sumSquares: 87.25, degreesOfFreedom: 2, meanSquare: 43.63, fStatistic: 3.58, pValue: 0.032, etaSquared: 0.058 }
        ],
        threeWayInteraction: {
          factors: "A × B × C",
          sumSquares: 56.80,
          degreesOfFreedom: 4,
          meanSquare: 14.20,
          fStatistic: 1.17,
          pValue: 0.331,
          etaSquared: 0.038
        },
        error: {
          sumSquares: 1098.45,
          degreesOfFreedom: 90,
          meanSquare: 12.20
        },
        total: {
          sumSquares: 2393.00,
          degreesOfFreedom: 107
        },
        descriptiveStats: [
          { factorA: "A1", factorB: "B1", factorC: "C1", n: 6, mean: 78.5, std: 3.2, se: 1.3, ci95Lower: 75.2, ci95Upper: 81.8 },
          { factorA: "A1", factorB: "B1", factorC: "C2", n: 6, mean: 82.1, std: 2.8, se: 1.1, ci95Lower: 79.4, ci95Upper: 84.8 },
          { factorA: "A1", factorB: "B2", factorC: "C1", n: 6, mean: 75.3, std: 3.5, se: 1.4, ci95Lower: 71.8, ci95Upper: 78.8 },
          { factorA: "A1", factorB: "B2", factorC: "C2", n: 6, mean: 79.7, std: 2.9, se: 1.2, ci95Lower: 76.8, ci95Upper: 82.6 },
          { factorA: "A2", factorB: "B1", factorC: "C1", n: 6, mean: 85.2, std: 3.1, se: 1.3, ci95Lower: 82.0, ci95Upper: 88.4 },
          { factorA: "A2", factorB: "B1", factorC: "C2", n: 6, mean: 88.9, std: 2.7, se: 1.1, ci95Lower: 86.3, ci95Upper: 91.5 },
          { factorA: "A2", factorB: "B2", factorC: "C1", n: 6, mean: 81.8, std: 3.4, se: 1.4, ci95Lower: 78.4, ci95Upper: 85.2 },
          { factorA: "A2", factorB: "B2", factorC: "C2", n: 6, mean: 84.5, std: 2.6, se: 1.1, ci95Lower: 82.0, ci95Upper: 87.0 },
          { factorA: "A3", factorB: "B1", factorC: "C1", n: 6, mean: 72.1, std: 3.8, se: 1.5, ci95Lower: 68.4, ci95Upper: 75.8 },
          { factorA: "A3", factorB: "B1", factorC: "C2", n: 6, mean: 76.8, std: 3.3, se: 1.3, ci95Lower: 73.5, ci95Upper: 80.1 },
          { factorA: "A3", factorB: "B2", factorC: "C1", n: 6, mean: 69.5, std: 4.1, se: 1.7, ci95Lower: 65.3, ci95Upper: 73.7 },
          { factorA: "A3", factorB: "B2", factorC: "C2", n: 6, mean: 73.2, std: 3.6, se: 1.5, ci95Lower: 69.6, ci95Upper: 76.8 }
        ],
        postHoc: [
          { comparison: "A1 vs A2", meanDiff: -6.8, standardError: 1.2, tValue: -5.67, pValue: 0.0001, adjustedPValue: 0.0003, cohensD: 1.95, lowerCI: -9.2, upperCI: -4.4 },
          { comparison: "A1 vs A3", meanDiff: 5.4, standardError: 1.2, tValue: 4.50, pValue: 0.0001, adjustedPValue: 0.0003, cohensD: 1.54, lowerCI: 3.0, upperCI: 7.8 },
          { comparison: "A2 vs A3", meanDiff: 12.2, standardError: 1.2, tValue: 10.17, pValue: 0.0001, adjustedPValue: 0.0001, cohensD: 3.49, lowerCI: 9.8, upperCI: 14.6 },
          { comparison: "B1 vs B2", meanDiff: 3.8, standardError: 0.9, tValue: 4.22, pValue: 0.0001, adjustedPValue: 0.0001, cohensD: 1.22, lowerCI: 2.0, upperCI: 5.6 },
          { comparison: "C1 vs C2", meanDiff: -3.2, standardError: 0.9, tValue: -3.56, pValue: 0.001, adjustedPValue: 0.003, cohensD: 1.02, lowerCI: -5.0, upperCI: -1.4 }
        ],
        assumptions: {
          normalityByGroup: [
            { group: "A1-B1-C1", shapiroW: 0.956, pValue: 0.798, assumptionMet: true },
            { group: "A1-B1-C2", shapiroW: 0.962, pValue: 0.831, assumptionMet: true },
            { group: "A1-B2-C1", shapiroW: 0.948, pValue: 0.732, assumptionMet: true },
            { group: "A1-B2-C2", shapiroW: 0.969, pValue: 0.872, assumptionMet: true },
            { group: "A2-B1-C1", shapiroW: 0.951, pValue: 0.756, assumptionMet: true },
            { group: "A2-B1-C2", shapiroW: 0.973, pValue: 0.896, assumptionMet: true },
            { group: "A2-B2-C1", shapiroW: 0.945, pValue: 0.704, assumptionMet: true },
            { group: "A2-B2-C2", shapiroW: 0.967, pValue: 0.859, assumptionMet: true },
            { group: "A3-B1-C1", shapiroW: 0.941, pValue: 0.665, assumptionMet: true },
            { group: "A3-B1-C2", shapiroW: 0.958, pValue: 0.807, assumptionMet: true },
            { group: "A3-B2-C1", shapiroW: 0.936, pValue: 0.621, assumptionMet: true },
            { group: "A3-B2-C2", shapiroW: 0.953, pValue: 0.769, assumptionMet: true }
          ],
          homogeneityOfVariance: {
            leveneStatistic: 1.23,
            pValue: 0.282,
            assumptionMet: true
          },
          sphericity: null // 삼원분산분석에서는 해당 없음
        },
        modelFit: {
          rSquared: 0.541,
          adjustedRSquared: 0.486,
          fStatistic: 9.82,
          modelPValue: 0.0001,
          residualStandardError: 3.49
        },
        interpretation: {
          summary: "3개 주효과가 모두 유의하며, A×B와 B×C 상호작용이 유의합니다.",
          mainEffectsInterpretation: [
            "Factor A의 주효과가 가장 강합니다 (η² = 0.298, F = 18.47, p < 0.001)",
            "Factor B도 강한 주효과를 보입니다 (η² = 0.186, F = 23.04, p < 0.001)",
            "Factor C는 중간 정도의 주효과를 보입니다 (η² = 0.130, F = 8.04, p < 0.01)"
          ],
          interactionInterpretation: "A×B 상호작용(p = 0.008)과 B×C 상호작용(p = 0.032)이 유의하나, 삼원 상호작용(A×B×C)은 유의하지 않습니다(p = 0.331).",
          recommendations: [
            "유의한 2원 상호작용들에 대한 단순효과 분석 실시",
            "각 요인의 주효과에 대한 사후검정 해석",
            "상호작용 그래프를 통한 패턴 시각화",
            "실제 효과크기(η²)를 고려한 실용적 해석"
          ]
        }
      }

      setAnalysisResult(mockResult)
      setCurrentStep(3)
    } catch (err) {
      console.error('삼원분산분석 실패:', err)
      setError('삼원분산분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedData, pyodide])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    setSelectedVariables(variables)
    if (variables.dependent && variables.independent &&
        variables.dependent.length === 1 && variables.independent.length === 3) {
      runAnalysis(variables)
    }
  }, [runAnalysis])

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-red-600', bg: 'bg-red-50' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-yellow-600', bg: 'bg-yellow-50' }
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
      title="삼원분산분석"
      subtitle="Three-way ANOVA"
      description="3개 독립변수의 주효과와 상호작용 효과 분석"
      icon={<Layers className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="삼원분산분석 소개"
          description="3개 독립변수의 복합적 효과 분석"
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
                    3개 독립변수가 종속변수에 미치는 개별 효과와 상호작용 효과를 종합적으로 분석합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 3개 주효과 검정</li>
                    <li>• 3개 2원 상호작용 검정</li>
                    <li>• 1개 3원 상호작용 검정</li>
                    <li>• 복잡한 상호작용 패턴 해석</li>
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
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-medium text-green-800">교육 연구</h4>
                      <p className="text-green-700">학습법×성별×학년이 성취도에 미치는 효과</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800">심리 실험</h4>
                      <p className="text-blue-700">처치×성격×환경이 행동에 미치는 영향</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <h4 className="font-medium text-purple-800">마케팅</h4>
                      <p className="text-purple-700">광고×가격×매장이 구매에 미치는 효과</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 3개의 범주형 독립변수가 있을 때<br/>
                • 복잡한 상호작용 패턴을 탐구하고 싶을 때<br/>
                • 다중 요인의 종합적 효과를 분석하고 싶을 때<br/>
                • 실험 설계가 3원 요인 설계일 때
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">검정할 가설들</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>주효과 3개:</strong> 각 독립변수의 개별 효과</li>
                <li>• <strong>2원 상호작용 3개:</strong> A×B, A×C, B×C 효과</li>
                <li>• <strong>3원 상호작용 1개:</strong> A×B×C 효과</li>
                <li>• <strong>총 7개의 가설 검정</strong></li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)}>
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
          description="삼원분산분석용 데이터를 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onNext={handleDataUpload}
            acceptedFormats={['.csv', '.xlsx', '.xls']}
          />

          <Alert className="mt-4">
            <Layers className="h-4 w-4" />
            <AlertTitle>삼원분산분석 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 관측값을 나타냅니다<br/>
              • 종속변수: 연속형 변수 (예: 점수, 측정값)<br/>
              • 독립변수 A: 범주형 변수 (2개 이상 수준)<br/>
              • 독립변수 B: 범주형 변수 (2개 이상 수준)<br/>
              • 독립변수 C: 범주형 변수 (2개 이상 수준)<br/>
              • 모든 조합에 충분한 표본 수 필요
            </AlertDescription>
          </Alert>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="종속변수와 3개 독립변수를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="three-way-anova"
            data={uploadedData}
            onVariablesSelected={handleVariableSelection}
            onBack={() => setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 분석하고자 하는 연속형 결과 변수 (1개)<br/>
              • 독립변수 A: 첫 번째 범주형 요인 (1개)<br/>
              • 독립변수 B: 두 번째 범주형 요인 (1개)<br/>
              • 독립변수 C: 세 번째 범주형 요인 (1개)<br/>
              • 예: 성취도(종속) = 학습법(A) + 성별(B) + 학년(C) + 상호작용들
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <StepCard
          title="삼원분산분석 결과"
          description="주효과, 상호작용, 사후검정 결과"
          icon={<BarChart3 className="w-5 h-5 text-green-500" />}
        >
          <Tabs defaultValue="anova" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="anova">ANOVA 결과</TabsTrigger>
              <TabsTrigger value="descriptives">기술통계</TabsTrigger>
              <TabsTrigger value="posthoc">사후검정</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
              <TabsTrigger value="model">모델적합도</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
            </TabsList>

            {/* ANOVA 결과 탭 */}
            <TabsContent value="anova" className="mt-6 space-y-6">
              {/* 주효과 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    주효과 (Main Effects)
                  </CardTitle>
                  <CardDescription>각 독립변수의 개별적 효과</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">요인</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">제곱합</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">자유도</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균제곱</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">F</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">η²</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">검정력</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.mainEffects.map((effect, index) => {
                          const effectSize = getEffectSizeInterpretation(effect.etaSquared)
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2 font-medium">{effect.factor}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{effect.sumSquares.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{effect.degreesOfFreedom}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{effect.meanSquare.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{effect.fStatistic.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <PValueBadge value={effect.pValue} />
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <Badge variant="outline" className={`${effectSize.color} ${effectSize.bg}`}>
                                  {effect.etaSquared.toFixed(3)}
                                </Badge>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{effect.observedPower.toFixed(3)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 2원 상호작용 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    2원 상호작용 (Two-way Interactions)
                  </CardTitle>
                  <CardDescription>두 독립변수 간의 상호작용 효과</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">상호작용</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">제곱합</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">자유도</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균제곱</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">F</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">η²</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.twoWayInteractions.map((interaction, index) => {
                          const effectSize = getEffectSizeInterpretation(interaction.etaSquared)
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2 font-medium">{interaction.factors}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{interaction.sumSquares.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{interaction.degreesOfFreedom}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">{interaction.meanSquare.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{interaction.fStatistic.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <PValueBadge value={interaction.pValue} />
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <Badge variant="outline" className={`${effectSize.color} ${effectSize.bg}`}>
                                  {interaction.etaSquared.toFixed(3)}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 3원 상호작용 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    3원 상호작용 (Three-way Interaction)
                  </CardTitle>
                  <CardDescription>3개 독립변수 간의 복합적 상호작용 효과</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">상호작용</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">제곱합</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">자유도</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균제곱</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">F</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">η²</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{analysisResult.threeWayInteraction.factors}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{analysisResult.threeWayInteraction.sumSquares.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{analysisResult.threeWayInteraction.degreesOfFreedom}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">{analysisResult.threeWayInteraction.meanSquare.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center font-semibold">{analysisResult.threeWayInteraction.fStatistic.toFixed(2)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <PValueBadge value={analysisResult.threeWayInteraction.pValue} />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <Badge variant="outline" className="text-gray-600 bg-gray-50">
                              {analysisResult.threeWayInteraction.etaSquared.toFixed(3)}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {analysisResult.threeWayInteraction.pValue > 0.05 && (
                    <Alert className="mt-4">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>3원 상호작용 결과</AlertTitle>
                      <AlertDescription>
                        3원 상호작용이 유의하지 않으므로(p = {analysisResult.threeWayInteraction.pValue.toFixed(3)}),
                        2원 상호작용과 주효과에 집중하여 해석할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 오차 및 전체 */}
              <Card>
                <CardHeader>
                  <CardTitle>오차 및 전체 변동</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">오차 (Error)</h4>
                      <p className="text-sm">제곱합: {analysisResult.error.sumSquares.toFixed(2)}</p>
                      <p className="text-sm">자유도: {analysisResult.error.degreesOfFreedom}</p>
                      <p className="text-sm">평균제곱: {analysisResult.error.meanSquare.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">전체 (Total)</h4>
                      <p className="text-sm">제곱합: {analysisResult.total.sumSquares.toFixed(2)}</p>
                      <p className="text-sm">자유도: {analysisResult.total.degreesOfFreedom}</p>
                    </div>
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
                    조건별 기술통계
                  </CardTitle>
                  <CardDescription>각 조건 조합별 기본 통계량</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-center">Factor A</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Factor B</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Factor C</th>
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
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.factorA}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.factorB}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.factorC}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{stat.n}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-medium">{stat.mean.toFixed(2)}</td>
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

            {/* 사후검정 탭 */}
            <TabsContent value="posthoc" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    사후검정 (Post-hoc Tests)
                  </CardTitle>
                  <CardDescription>주효과에 대한 다중비교 (Bonferroni 보정)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">비교</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">평균차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">표준오차</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">t값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">보정된 p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Cohen&apos;s d</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.postHoc.map((test, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{test.comparison}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.meanDiff.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.standardError.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.tValue.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={test.pValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={test.adjustedPValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge variant="outline" className={
                                Math.abs(test.cohensD) >= 0.8 ? 'text-red-600 bg-red-50' :
                                Math.abs(test.cohensD) >= 0.5 ? 'text-orange-600 bg-orange-50' :
                                Math.abs(test.cohensD) >= 0.2 ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50'
                              }>
                                {test.cohensD.toFixed(2)}
                              </Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              [{test.lowerCI.toFixed(2)}, {test.upperCI.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>해석 가이드</AlertTitle>
                    <AlertDescription>
                      보정된 p값 &lt; 0.05인 비교는 유의한 차이를 나타냅니다.
                      Cohen&apos;s d는 효과크기를 나타내며, |d| ≥ 0.8(큰 효과), 0.5-0.8(중간 효과), 0.2-0.5(작은 효과)입니다.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 가정검정 탭 */}
            <TabsContent value="assumptions" className="mt-6 space-y-6">
              {/* 정규성 검정 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    정규성 검정
                  </CardTitle>
                  <CardDescription>각 조건별 Shapiro-Wilk 검정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left">집단</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">Shapiro-W</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">p-value</th>
                          <th className="border border-gray-300 px-4 py-2 text-center">가정 충족</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.assumptions.normalityByGroup.map((test, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2">{test.group}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">{test.shapiroW.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <PValueBadge value={test.pValue} />
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {test.assumptionMet ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 등분산성 검정 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    등분산성 검정
                  </CardTitle>
                  <CardDescription>Levene 검정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Levene 통계량</p>
                        <p className="text-lg">{analysisResult.assumptions.homogeneityOfVariance.leveneStatistic.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">p-value</p>
                        <PValueBadge value={analysisResult.assumptions.homogeneityOfVariance.pValue} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">가정 충족</p>
                        {analysisResult.assumptions.homogeneityOfVariance.assumptionMet ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>등분산성 검정 해석</AlertTitle>
                    <AlertDescription>
                      {analysisResult.assumptions.homogeneityOfVariance.assumptionMet
                        ? "등분산성 가정이 충족되었습니다 (p > 0.05). 일반적인 ANOVA 결과를 신뢰할 수 있습니다."
                        : "등분산성 가정이 위반되었습니다 (p ≤ 0.05). Welch 검정이나 비모수 검정을 고려해야 합니다."}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 모델적합도 탭 */}
            <TabsContent value="model" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    모델 적합도
                  </CardTitle>
                  <CardDescription>전체 모델의 설명력과 적합도</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">결정계수</h4>
                        <p className="text-2xl font-bold text-blue-900">{(analysisResult.modelFit.rSquared * 100).toFixed(1)}%</p>
                        <p className="text-sm text-blue-700">R² = {analysisResult.modelFit.rSquared.toFixed(3)}</p>
                        <p className="text-sm text-blue-700">수정된 R² = {analysisResult.modelFit.adjustedRSquared.toFixed(3)}</p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">모델 유의성</h4>
                        <p className="text-lg font-bold text-green-900">F = {analysisResult.modelFit.fStatistic.toFixed(2)}</p>
                        <PValueBadge value={analysisResult.modelFit.modelPValue} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">잔차 표준오차</h4>
                        <p className="text-lg font-bold text-gray-900">{analysisResult.modelFit.residualStandardError.toFixed(2)}</p>
                      </div>

                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>모델 적합도 해석</AlertTitle>
                        <AlertDescription>
                          이 모델은 종속변수 변동의 {(analysisResult.modelFit.rSquared * 100).toFixed(1)}%를 설명합니다.
                          모델이 통계적으로 유의합니다 (p &lt; 0.001).
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
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
                  <CardDescription>삼원분산분석 결과의 종합적 해석</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 요약 */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">분석 요약</h4>
                    <p className="text-blue-700">{analysisResult.interpretation.summary}</p>
                  </div>

                  {/* 주효과 해석 */}
                  <div>
                    <h4 className="font-medium mb-3">주효과 해석</h4>
                    <div className="space-y-2">
                      {analysisResult.interpretation.mainEffectsInterpretation.map((interpretation, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded border-l-4 border-green-400">
                          <p className="text-green-700 text-sm">{interpretation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 상호작용 해석 */}
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">상호작용 해석</h4>
                    <p className="text-yellow-700">{analysisResult.interpretation.interactionInterpretation}</p>
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
                    <Layers className="h-4 w-4" />
                    <AlertTitle>주의사항</AlertTitle>
                    <AlertDescription>
                      삼원분산분석은 복잡한 상호작용 패턴을 해석해야 합니다.
                      유의한 상호작용이 있을 경우 단순효과분석을 통해 구체적인 패턴을 파악하시기 바랍니다.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
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
            <p>삼원분산분석을 수행하고 있습니다...</p>
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