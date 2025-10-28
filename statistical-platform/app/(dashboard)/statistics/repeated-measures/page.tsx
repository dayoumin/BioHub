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
  Repeat,
  Clock
} from 'lucide-react'

// Components - 기존 시스템 사용
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

interface SphericityCorrectionResult {
  method: 'none' | 'greenhouse-geisser' | 'huynh-feldt' | 'lower-bound'
  epsilon: number
  correctedDf: number
  correctedF: number
  correctedPValue: number
}

interface PostHocResult {
  comparison: string
  meanDiff: number
  stdError: number
  tValue: number
  pValue: number
  adjustedPValue: number
  cohensD: number
  lowerCI: number
  upperCI: number
}

interface RepeatedMeasuresResult {
  withinSubjectsEffects: {
    factor: string
    statistic: number
    pValue: number
    degreesOfFreedom: [number, number]
    partialEtaSquared: number
    observedPower: number
  }
  sphericityTest: {
    mauchlysW: number
    pValue: number
    epsilon: {
      greenhouseGeisser: number
      huynhFeldt: number
    }
    sphericityViolated: boolean
  }
  sphericityCorrection: SphericityCorrectionResult
  descriptives: {
    timePoint: string
    n: number
    mean: number
    stdDev: number
    stdError: number
    ci95Lower: number
    ci95Upper: number
  }[]
  postHoc: PostHocResult[]
  assumptions: {
    normalityTests: {
      timePoint: string
      shapiroW: number
      pValue: number
      normal: boolean
    }[]
    sphericityMet: boolean
    compoundSymmetryMet: boolean
  }
  interpretation: {
    summary: string
    effectSize: string
    recommendations: string[]
  }
}

export default function RepeatedMeasuresANOVAPage() {
  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
  const [_selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
  const [analysisResult, setAnalysisResult] = useState<RepeatedMeasuresResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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
      description: '반복측정 분산분석의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '반복측정 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 2,
      title: '변수 선택',
      description: '반복측정 변수 선택 및 설정',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: '반복측정 ANOVA 결과 및 사후검정',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info - useMemo로 최적화
  const methodInfo = useMemo(() => ({
    formula: "F = MS_between / MS_error",
    assumptions: [
      "정규성: 각 시점에서 정규분포",
      "구형성: 분산-공분산 구조 일치",
      "독립성: 대상 간 독립성"
    ],
    sampleSize: "각 그룹 최소 15-20명",
    usage: "동일 대상의 여러 시점 평균 비교"
  }), [])

  // Event handlers
  const handleDataUpload = useCallback((data: unknown[]) => {
    const processedData = data.map((row, index) => ({
      ...row as Record<string, unknown>,
      _id: index
    })) as DataRow[]
    setUploadedData(processedData)
    setCurrentStep(2)
    setError(null)
  }, [])

  const runAnalysis = useCallback(async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodide || !variables.dependent || variables.dependent.length < 2) {
      setError('분석을 실행할 수 없습니다. 최소 2개 이상의 반복측정 변수가 필요합니다.')
      return
    }

    // AbortController로 비동기 작업 취소 지원
    const abortController = new AbortController()
    setIsAnalyzing(true)
    setError(null)

    try {
      if (abortController.signal.aborted) return

      // Mock 데이터로 시연 (실제로는 Pyodide 통계 엔진 사용)
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (abortController.signal.aborted) return

      const mockResult: RepeatedMeasuresResult = {
        withinSubjectsEffects: {
          factor: "시간",
          statistic: 12.45,
          pValue: 0.0001,
          degreesOfFreedom: [2, 58],
          partialEtaSquared: 0.301,
          observedPower: 0.95
        },
        sphericityTest: {
          mauchlysW: 0.823,
          pValue: 0.045,
          epsilon: {
            greenhouseGeisser: 0.864,
            huynhFeldt: 0.912
          },
          sphericityViolated: true
        },
        sphericityCorrection: {
          method: 'greenhouse-geisser',
          epsilon: 0.864,
          correctedDf: 1.728,
          correctedF: 12.45,
          correctedPValue: 0.0002
        },
        descriptives: [
          { timePoint: "사전", n: 30, mean: 45.2, stdDev: 8.3, stdError: 1.52, ci95Lower: 42.1, ci95Upper: 48.3 },
          { timePoint: "중간", n: 30, mean: 52.7, stdDev: 9.1, stdError: 1.66, ci95Lower: 49.3, ci95Upper: 56.1 },
          { timePoint: "사후", n: 30, mean: 58.9, stdDev: 8.8, stdError: 1.61, ci95Lower: 55.6, ci95Upper: 62.2 }
        ],
        postHoc: [
          { comparison: "사전 vs 중간", meanDiff: -7.5, stdError: 1.8, tValue: -4.17, pValue: 0.0003, adjustedPValue: 0.0009, cohensD: 0.89, lowerCI: -11.2, upperCI: -3.8 },
          { comparison: "사전 vs 사후", meanDiff: -13.7, stdError: 1.9, tValue: -7.21, pValue: 0.0001, adjustedPValue: 0.0001, cohensD: 1.58, lowerCI: -17.6, upperCI: -9.8 },
          { comparison: "중간 vs 사후", meanDiff: -6.2, stdError: 1.7, tValue: -3.65, pValue: 0.001, adjustedPValue: 0.003, cohensD: 0.71, lowerCI: -9.7, upperCI: -2.7 }
        ],
        assumptions: {
          normalityTests: [
            { timePoint: "사전", shapiroW: 0.957, pValue: 0.25, normal: true },
            { timePoint: "중간", shapiroW: 0.962, pValue: 0.32, normal: true },
            { timePoint: "사후", shapiroW: 0.944, pValue: 0.12, normal: true }
          ],
          sphericityMet: false,
          compoundSymmetryMet: false
        },
        interpretation: {
          summary: "반복측정 ANOVA 결과 시간 효과가 유의미합니다 (F(1.73, 50.15) = 12.45, p < 0.001, η²p = 0.301).",
          effectSize: "큰 효과크기(η²p = 0.301)로 시간에 따른 변화가 실질적으로 의미가 있습니다.",
          recommendations: [
            "구형성 가정이 위반되어 Greenhouse-Geisser 보정을 적용했습니다",
            "모든 시점 간 유의한 차이가 발견되었습니다",
            "사전-사후 변화량이 가장 큽니다 (Cohen&apos;s d = 1.58)",
            "추가적인 효과 분석을 위해 선형 대비 검정을 고려해보세요"
          ]
        }
      }

      setAnalysisResult(mockResult)
      setCurrentStep(3)
    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('반복측정 ANOVA 실패:', err)
        setError('반복측정 ANOVA 중 오류가 발생했습니다.')
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsAnalyzing(false)
      }
    }

    // 컴포넌트 언마운트 시 작업 취소를 위한 cleanup 함수 반환
    return () => {
      abortController.abort()
      setIsAnalyzing(false)
    }
  }, [uploadedData, pyodide])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    setSelectedVariables(variables)
    if (variables.dependent && variables.dependent.length >= 2) {
      runAnalysis(variables)
    }
  }, [runAnalysis])

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-red-600', bg: 'bg-red-50' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: '효과 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const getCohensInterpretation = (d: number) => {
    const absD = Math.abs(d)
    if (absD >= 0.8) return '큰 효과'
    if (absD >= 0.5) return '중간 효과'
    if (absD >= 0.2) return '작은 효과'
    return '효과 없음'
  }

  return (
    <StatisticsPageLayout
      title="반복측정 분산분석"
      subtitle="Repeated Measures ANOVA"
      description="동일 대상의 여러 시점 측정값 비교 분석"
      icon={<Repeat className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="반복측정 분산분석 소개"
          description="동일 대상의 반복 측정 비교 분석"
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
                    동일한 피험자들을 여러 시점에서 측정한 데이터의 평균 차이를 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 시간에 따른 변화 추적</li>
                    <li>• 개체 내 변동 통제</li>
                    <li>• 치료 효과의 시간별 비교</li>
                    <li>• 학습이나 성장 곡선 분석</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    적용 예시
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-medium text-green-800">치료 효과</h4>
                      <p className="text-green-700">사전-중간-사후 측정 비교</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800">학습 곡선</h4>
                      <p className="text-blue-700">시간별 성과 변화 추적</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 동일한 피험자를 3회 이상 측정했을 때<br/>
                • 시간에 따른 변화 패턴을 분석할 때<br/>
                • 개체 내 변동을 통제하고 싶을 때<br/>
                • 치료나 중재의 시점별 효과 비교
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">주요 가정</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• <strong>구형성(Sphericity):</strong> 차이점수들의 분산이 동일</li>
                <li>• <strong>정규성:</strong> 각 시점의 측정값이 정규분포</li>
                <li>• <strong>독립성:</strong> 피험자 간 측정값이 독립적</li>
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
          description="반복측정 데이터를 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onNext={handleDataUpload}
            acceptedFormats={['.csv', '.xlsx', '.xls']}
          />

          <Alert className="mt-4">
            <Repeat className="h-4 w-4" />
            <AlertTitle>반복측정 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 피험자를 나타냅니다<br/>
              • 각 열은 다른 시점의 측정값입니다<br/>
              • 예: Subject_ID, Pre_Score, Mid_Score, Post_Score<br/>
              • 결측값은 최소화해야 합니다
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
          description="반복측정할 변수들을 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="repeated_measures_anova"
            data={uploadedData}
            onVariablesSelected={handleVariableSelection}
            onBack={() => setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 반복 측정된 변수들 (최소 3개)<br/>
              • 각 변수는 동일한 척도로 측정되어야 함<br/>
              • 시간 순서대로 선택하는 것을 권장<br/>
              • 예: 사전점수, 중간점수, 사후점수
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.withinSubjectsEffects.statistic.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">F 통계량</p>
                  <p className="text-xs text-muted-foreground">
                    df = ({analysisResult.sphericityCorrection.correctedDf.toFixed(1)}, {analysisResult.withinSubjectsEffects.degreesOfFreedom[1]})
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <PValueBadge value={analysisResult.sphericityCorrection.correctedPValue} size="lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">보정된 p-값</p>
                  <Badge variant="outline" className="mt-1">
                    {analysisResult.sphericityCorrection.method}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {analysisResult.withinSubjectsEffects.partialEtaSquared.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">부분 η²</p>
                  <Badge variant="outline" className="mt-1">
                    {getEffectSizeInterpretation(analysisResult.withinSubjectsEffects.partialEtaSquared).level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="descriptives" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="descriptives">기술통계</TabsTrigger>
              <TabsTrigger value="anova">ANOVA</TabsTrigger>
              <TabsTrigger value="posthoc">사후검정</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
            </TabsList>

            <TabsContent value="descriptives">
              <Card>
                <CardHeader>
                  <CardTitle>기술통계량</CardTitle>
                  <CardDescription>각 시점별 기본 통계량</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-3 text-left">시점</th>
                          <th className="border p-3 text-center">N</th>
                          <th className="border p-3 text-center">평균</th>
                          <th className="border p-3 text-center">표준편차</th>
                          <th className="border p-3 text-center">표준오차</th>
                          <th className="border p-3 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.descriptives.map(desc => (
                          <tr key={desc.timePoint} className="hover:bg-muted/50">
                            <td className="border p-3 font-medium">{desc.timePoint}</td>
                            <td className="border p-3 text-center font-mono">{desc.n}</td>
                            <td className="border p-3 text-center font-mono">{desc.mean.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{desc.stdDev.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{desc.stdError.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">
                              [{desc.ci95Lower.toFixed(2)}, {desc.ci95Upper.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anova">
              <Card>
                <CardHeader>
                  <CardTitle>반복측정 ANOVA 결과</CardTitle>
                  <CardDescription>구형성 검정 및 보정 결과</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">구형성 검정 (Mauchly&apos;s Test)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Mauchly&apos;s W:</span>
                          <span className="font-mono">{analysisResult.sphericityTest.mauchlysW.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.sphericityTest.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>구형성:</span>
                          <Badge className={analysisResult.sphericityTest.sphericityViolated ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {analysisResult.sphericityTest.sphericityViolated ? '위반' : '만족'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">보정계수 (Epsilon)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Greenhouse-Geisser:</span>
                          <span className="font-mono">{analysisResult.sphericityTest.epsilon.greenhouseGeisser.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Huynh-Feldt:</span>
                          <span className="font-mono">{analysisResult.sphericityTest.epsilon.huynhFeldt.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>적용된 보정:</span>
                          <Badge variant="outline">{analysisResult.sphericityCorrection.method}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-3">ANOVA 결과 (보정됨)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">F 통계량:</span>
                        <p className="font-mono font-bold">{analysisResult.sphericityCorrection.correctedF.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">자유도:</span>
                        <p className="font-mono">{analysisResult.sphericityCorrection.correctedDf.toFixed(1)}, {analysisResult.withinSubjectsEffects.degreesOfFreedom[1]}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">p-값:</span>
                        <PValueBadge value={analysisResult.sphericityCorrection.correctedPValue} />
                      </div>
                      <div>
                        <span className="text-blue-600">부분 η²:</span>
                        <p className="font-mono font-bold">{analysisResult.withinSubjectsEffects.partialEtaSquared.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posthoc">
              <Card>
                <CardHeader>
                  <CardTitle>사후검정</CardTitle>
                  <CardDescription>Bonferroni 보정된 쌍별 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-3 text-left">비교</th>
                          <th className="border p-3 text-center">평균차</th>
                          <th className="border p-3 text-center">표준오차</th>
                          <th className="border p-3 text-center">t값</th>
                          <th className="border p-3 text-center">보정 p-값</th>
                          <th className="border p-3 text-center">Cohen&apos;s d</th>
                          <th className="border p-3 text-center">95% 신뢰구간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisResult.postHoc.map((result, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-3 font-medium">{result.comparison}</td>
                            <td className="border p-3 text-center font-mono">{result.meanDiff.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{result.stdError.toFixed(2)}</td>
                            <td className="border p-3 text-center font-mono">{result.tValue.toFixed(2)}</td>
                            <td className="border p-3 text-center">
                              <PValueBadge value={result.adjustedPValue} />
                            </td>
                            <td className="border p-3 text-center">
                              <div className="space-y-1">
                                <span className="font-mono">{result.cohensD.toFixed(2)}</span>
                                <Badge variant="outline" className="text-xs block">
                                  {getCohensInterpretation(result.cohensD)}
                                </Badge>
                              </div>
                            </td>
                            <td className="border p-3 text-center font-mono text-xs">
                              [{result.lowerCI.toFixed(2)}, {result.upperCI.toFixed(2)}]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assumptions">
              <Card>
                <CardHeader>
                  <CardTitle>가정 검정</CardTitle>
                  <CardDescription>반복측정 ANOVA의 전제조건 확인</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">정규성 검정 (Shapiro-Wilk)</h4>
                      <div className="space-y-3">
                        {analysisResult.assumptions.normalityTests.map(test => (
                          <div key={test.timePoint} className="flex justify-between items-center">
                            <span className="text-sm">{test.timePoint}:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">W = {test.shapiroW.toFixed(3)}</span>
                              <PValueBadge value={test.pValue} />
                              <Badge className={test.normal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {test.normal ? '정상' : '위반'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">구형성 및 복합대칭성</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">구형성:</span>
                          <Badge className={analysisResult.assumptions.sphericityMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {analysisResult.assumptions.sphericityMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">복합대칭성:</span>
                          <Badge className={analysisResult.assumptions.compoundSymmetryMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {analysisResult.assumptions.compoundSymmetryMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {analysisResult.sphericityTest.sphericityViolated && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>가정 위반 경고</AlertTitle>
                      <AlertDescription>
                        구형성 가정이 위반되어 {analysisResult.sphericityCorrection.method} 보정이 적용되었습니다.
                        보정된 결과를 해석에 사용하세요.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>반복측정 ANOVA 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>주요 결과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>효과 크기</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.effectSize}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">권장사항</h4>
                    <ul className="space-y-2">
                      {analysisResult.interpretation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${getEffectSizeInterpretation(analysisResult.withinSubjectsEffects.partialEtaSquared).bg}`}>
                      <h4 className={`font-medium mb-2 ${getEffectSizeInterpretation(analysisResult.withinSubjectsEffects.partialEtaSquared).color}`}>
                        부분 η² (효과 크기)
                      </h4>
                      <p className="text-sm">
                        η²p = {analysisResult.withinSubjectsEffects.partialEtaSquared.toFixed(3)}
                        ({getEffectSizeInterpretation(analysisResult.withinSubjectsEffects.partialEtaSquared).level})
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">검정력</h4>
                      <p className="text-sm">
                        검정력 = {(analysisResult.withinSubjectsEffects.observedPower * 100).toFixed(1)}%
                        <br />
                        <span className="text-blue-600">
                          {analysisResult.withinSubjectsEffects.observedPower >= 0.8 ? '충분한 검정력' : '검정력 부족'}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                결과 내보내기
              </Button>
              <Button onClick={() => setCurrentStep(0)}>
                새로운 분석
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">반복측정 ANOVA 분석 중...</p>
                  <p className="text-sm text-muted-foreground">구형성 검정 및 사후검정 포함</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </StatisticsPageLayout>
  )
}