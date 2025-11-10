'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { WilcoxonVariables } from '@/types/statistics'
import { toWilcoxonVariables, type VariableAssignment } from '@/types/statistics-converters'
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
  GitBranch
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Services & Types
import type { UploadedData } from '@/hooks/use-statistics-page'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface WilcoxonResult {
  statistic: number
  pValue: number
  nobs: number
  zScore: number
  medianDiff: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    before: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    after: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    differences: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
      positive: number
      negative: number
      ties: number
    }
  }
  interpretation?: {
    summary: string
    comparison: string
    recommendations: string[]
  }
}

export default function WilcoxonPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('wilcoxon')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<WilcoxonResult, WilcoxonVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Pyodide instance
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideStats.initialize()
        setPyodide(pyodideStats)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        actions.setError('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [])

  // Steps configuration
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'Wilcoxon 부호순위 검정의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '대응표본 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '사전-사후 측정 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Wilcoxon 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  // Event handlers
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'wilcoxon'
  )

  const runAnalysis = useCallback(async (variables: WilcoxonVariables) => {
    if (!uploadedData || !variables.dependent || variables.dependent.length !== 2) {
      actions.setError('분석을 실행할 수 없습니다. 사전-사후 두 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      // Extract data for the two paired variables
      const var1Name = variables.dependent[0]
      const var2Name = variables.dependent[1]

      const values1: number[] = []
      const values2: number[] = []

      for (const row of uploadedData.data) {
        const val1 = row[var1Name]
        const val2 = row[var2Name]

        // Only include pairs where both values are valid numbers
        if (typeof val1 === 'number' && typeof val2 === 'number' &&
            !isNaN(val1) && !isNaN(val2)) {
          values1.push(val1)
          values2.push(val2)
        }
      }

      if (values1.length < 2) {
        actions.setError('유효한 대응표본 데이터가 부족합니다 (최소 2쌍 필요).')
        return
      }

      // Call the real Wilcoxon Signed-Rank Test
      const result = await pyodideStats.wilcoxonSignedRankTest(values1, values2)

      actions.completeAnalysis(result, 3)
    } catch (err) {
      console.error('Wilcoxon 부호순위 검정 실패:', err)
      actions.setError(err instanceof Error ? err.message : 'Wilcoxon 부호순위 검정 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  const handleVariableSelection = createVariableSelectionHandler<WilcoxonVariables>(
    (vars) => actions.setSelectedVariables?.(vars ? toWilcoxonVariables(vars as unknown as VariableAssignment) : null),
    (variables) => {
      if (variables.dependent && variables.dependent.length === 2) {
        runAnalysis(variables)
      }
    },
    'wilcoxon'
  )

  return (
    <StatisticsPageLayout
      title="Wilcoxon 부호순위 검정"
      subtitle="Wilcoxon Signed-Rank Test"
      description="대응표본의 중위수 차이를 비모수적으로 검정"
      icon={<GitBranch className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={{
        formula: "W = Σ(Ri × sign(di))",
        assumptions: [
          "대응표본 (동일한 개체의 사전-사후 측정)",
          "연속형 또는 서열척도 데이터",
          "차이값의 대칭분포 (정규분포 불필요)"
        ],
        sampleSize: "최소 6쌍 이상 권장",
        usage: "사전-사후 비교, 중재 효과 검정"
      }}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="Wilcoxon 부호순위 검정 소개"
          description="대응표본의 순위 기반 비모수 검정"
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
                    동일한 개체에서 두 시점의 측정값 차이를 비모수적으로 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 사전-사후 측정 비교</li>
                    <li>• 중재/처치 효과 검정</li>
                    <li>• 정규분포 가정 불필요</li>
                    <li>• 소표본에서도 강건</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    vs 대응표본 t-검정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">Wilcoxon 검정</h4>
                      <p className="text-muted-foreground">비모수, 순위 기반, 강건</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">대응표본 t-검정</h4>
                      <p className="text-muted-foreground">모수, 차이의 정규분포 가정</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 차이값이 정규분포를 따르지 않을 때<br/>
                • 이상치가 포함된 대응표본 데이터<br/>
                • 서열척도 측정값의 변화 분석<br/>
                • 소표본 크기의 사전-사후 비교
              </AlertDescription>
            </Alert>

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
          description="대응표본 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUpload}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>데이터 형식 안내</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 개체(참가자)를 나타냅니다<br/>
              • 두 개의 열이 필요합니다: 사전 측정값, 사후 측정값<br/>
              • 예: before_score, after_score
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
          description="사전-사후 측정 변수를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelectorModern
            methodId="wilcoxon-signed-rank"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수 1: 사전 측정값 (예: before_score)<br/>
              • 종속변수 2: 사후 측정값 (예: after_score)<br/>
              • 동일한 척도로 측정된 두 변수를 선택해주세요
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
                    {analysisResult.statistic.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">W 통계량</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <PValueBadge value={analysisResult.pValue} size="lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">유의확률</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.effectSize.value.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">효과크기 (r)</p>
                  <Badge variant="outline" className="mt-1">
                    {analysisResult.effectSize.interpretation}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="statistics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="statistics">통계량</TabsTrigger>
              <TabsTrigger value="descriptives">기술통계</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="visualization">시각화</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Wilcoxon 부호순위 검정 통계량</CardTitle>
                  <CardDescription>순위합과 검정통계량 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">통계량</th>
                          <th className="border p-2 text-right">값</th>
                          <th className="border p-2 text-center">설명</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2 font-medium">W 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">부호순위합</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">Z 점수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.zScore.toFixed(4)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">표준화된 검정통계량</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">p-값</td>
                          <td className="border p-2 text-right">
                            <PValueBadge value={analysisResult.pValue} />
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">양측 검정</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">유효 표본 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.nobs}</td>
                          <td className="border p-2 text-sm text-muted-foreground">동점 제외</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">중위수 차이</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.medianDiff > 0 ? '+' : ''}{analysisResult.medianDiff.toFixed(3)}
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">사후 - 사전</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="descriptives">
              <Card>
                <CardHeader>
                  <CardTitle>사전-사후 기술통계량</CardTitle>
                  <CardDescription>각 시점의 중심경향성과 변화량</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">시점</th>
                          <th className="border p-2 text-right">중위수</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">Q1</th>
                          <th className="border p-2 text-right">Q3</th>
                          <th className="border p-2 text-right">IQR</th>
                          <th className="border p-2 text-right">범위</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2 font-medium">사전</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.before.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.before.min.toFixed(2)} - {analysisResult.descriptives.before.max.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">사후</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.after.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.after.min.toFixed(2)} - {analysisResult.descriptives.after.max.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid md:grid-cols-3 gap-4">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-muted-foreground">
                            {analysisResult.descriptives.differences.positive}
                          </div>
                          <p className="text-sm text-muted-foreground">증가한 사례</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-muted-foreground">
                            {analysisResult.descriptives.differences.negative}
                          </div>
                          <p className="text-sm text-muted-foreground">감소한 사례</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {analysisResult.descriptives.differences.ties}
                          </div>
                          <p className="text-sm text-muted-foreground">동일한 사례</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>Wilcoxon 부호순위 검정 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult.interpretation && (
                    <>
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>분석 결과 요약</AlertTitle>
                        <AlertDescription>
                          {analysisResult.interpretation.summary}
                        </AlertDescription>
                      </Alert>

                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertTitle>변화 분석</AlertTitle>
                        <AlertDescription>
                          {analysisResult.interpretation.comparison}
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
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <Card>
                <CardHeader>
                  <CardTitle>데이터 시각화</CardTitle>
                  <CardDescription>사전-사후 변화 시각화</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    📊 사전-사후 비교 차트 및 변화량 분포는 추후 구현 예정입니다
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                결과 내보내기
              </Button>
              <Button onClick={() => actions.setCurrentStep(0)}>
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
                  <p className="font-medium">Wilcoxon 부호순위 검정 분석 중...</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
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