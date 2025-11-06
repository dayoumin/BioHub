'use client'

import React, { useState, useCallback, useEffect } from 'react'
import type { MannWhitneyVariables } from '@/types/statistics'
import { toMannWhitneyVariables, type VariableAssignment } from '@/types/statistics-converters'
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
  Target
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface MannWhitneyResult {
  statistic: number
  pValue: number
  uValue: number
  nobs1: number
  nobs2: number
  medianDiff: number
  rankSum1: number
  rankSum2: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    group1: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    group2: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
  }
  interpretation: {
    summary: string
    comparison: string
    recommendations: string[]
  }
}

export default function MannWhitneyPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<MannWhitneyResult, MannWhitneyVariables>({
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
  }, [actions])

  // Steps configuration
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'Mann-Whitney U 검정의 개념과 적용 조건',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 그룹 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Mann-Whitney U 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  // Event handlers - using common utility
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
      actions.setError('')
    },
    'mann-whitney'
  )

  const handleVariableSelection = createVariableSelectionHandler<MannWhitneyVariables>(
    (vars) => actions.setSelectedVariables?.(vars ? toMannWhitneyVariables(vars as unknown as VariableAssignment) : null),
    (variables) => {
      if (variables.dependent && variables.groups && variables.groups.length >= 1) {
        runAnalysis(variables)
      }
    },
    'mann-whitney'
  )

  const runAnalysis = async (variables: MannWhitneyVariables) => {
    if (!uploadedData || !uploadedData.data || !pyodide || !variables.dependent || !variables.groups || variables.groups.length === 0) {
      actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      const data = uploadedData.data
      const dependentVar = variables.dependent
      const groupVar = variables.groups[0]

      // 그룹별로 데이터 분리
      const groups = new Map<string | number, number[]>()
      for (const row of data) {
        const groupValue = row[groupVar]
        const depValue = row[dependentVar]

        if (groupValue !== null && groupValue !== undefined &&
            typeof depValue === 'number' && !isNaN(depValue)) {
          const key = String(groupValue)
          if (!groups.has(key)) {
            groups.set(key, [])
          }
          groups.get(key)!.push(depValue)
        }
      }

      const groupValues = Array.from(groups.keys())
      if (groupValues.length !== 2) {
        actions.setError(`그룹 변수는 정확히 2개 범주를 가져야 합니다. 현재: ${groupValues.length}개`)
        return
      }

      const group1 = groups.get(groupValues[0])!
      const group2 = groups.get(groupValues[1])!

      // Mann-Whitney U 검정 실행
      const result = await pyodide.mannWhitneyU(group1, group2)

      // 결과를 MannWhitneyResult 형식으로 변환
      const formattedResult: MannWhitneyResult = {
        statistic: result.statistic,
        pValue: result.pvalue,
        uValue: result.statistic,
        nobs1: group1.length,
        nobs2: group2.length,
        medianDiff: 0, // 계산 필요
        rankSum1: 0, // 계산 필요
        rankSum2: 0, // 계산 필요
        effectSize: {
          value: 0, // 계산 필요
          interpretation: 'Unknown'
        },
        descriptives: {
          group1: {
            median: group1.sort((a, b) => a - b)[Math.floor(group1.length / 2)],
            mean: group1.reduce((a, b) => a + b, 0) / group1.length,
            iqr: 0, // 계산 필요
            min: Math.min(...group1),
            max: Math.max(...group1),
            q1: 0, // 계산 필요
            q3: 0 // 계산 필요
          },
          group2: {
            median: group2.sort((a, b) => a - b)[Math.floor(group2.length / 2)],
            mean: group2.reduce((a, b) => a + b, 0) / group2.length,
            iqr: 0, // 계산 필요
            min: Math.min(...group2),
            max: Math.max(...group2),
            q1: 0, // 계산 필요
            q3: 0 // 계산 필요
          }
        },
        interpretation: {
          summary: `Mann-Whitney U 검정 결과 (U = ${result.statistic.toFixed(2)}, p = ${result.pvalue.toFixed(3)})`,
          comparison: `두 그룹 간 ${result.pvalue < 0.05 ? '유의한' : '유의하지 않은'} 차이가 있습니다.`,
          recommendations: [
            result.pvalue < 0.05 ? '귀무가설을 기각합니다.' : '귀무가설을 기각할 수 없습니다.',
            '효과크기를 확인하여 실질적 의미를 평가하세요.',
            '데이터 시각화를 통해 분포를 확인하세요.'
          ]
        }
      }

      // completeAnalysis로 결과 저장 + Step 이동 + isAnalyzing 리셋
      actions.completeAnalysis(formattedResult, 3)
    } catch (err) {
      console.error('Mann-Whitney U 검정 실패:', err)
      actions.setError('Mann-Whitney U 검정 중 오류가 발생했습니다.')
    }
  }

  return (
    <StatisticsPageLayout
      title="Mann-Whitney U 검정"
      subtitle="Wilcoxon Rank-Sum Test"
      description="독립된 두 집단의 중위수 차이를 비모수적으로 검정"
      icon={<Activity className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={{
        formula: "U = n₁ × n₂ + n₁(n₁+1)/2 - R₁",
        assumptions: [
          "두 표본은 독립적이어야 함",
          "연속형 또는 서열척도 데이터",
          "정규분포 가정 불필요"
        ],
        sampleSize: "각 집단에서 최소 5개 이상 권장",
        usage: "정규분포를 따르지 않는 두 집단 비교"
      }}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="Mann-Whitney U 검정 소개"
          description="독립된 두 집단의 순위 기반 비모수 검정"
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
                    두 독립집단의 분포가 동일한지 검정하며, 중위수 차이를 비교합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 정규분포 가정 불필요</li>
                    <li>• 등분산성 가정 불필요</li>
                    <li>• 이상치에 강건한 검정</li>
                    <li>• 소표본에도 적용 가능</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    vs 독립표본 t-검정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">Mann-Whitney U</h4>
                      <p className="text-muted-foreground">비모수 검정, 정규분포 불필요</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">독립표본 t-검정</h4>
                      <p className="text-muted-foreground">모수 검정, 정규분포 가정 필요</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 데이터가 정규분포를 따르지 않을 때<br/>
                • 이상치가 많이 포함된 데이터<br/>
                • 서열척도(순위) 데이터 분석<br/>
                • 소표본 크기에서 두 집단 비교
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
          description="Mann-Whitney U 검정할 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onPrevious={() => actions.setCurrentStep(0)}
          />

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && uploadedData.data && (
        <StepCard
          title="변수 선택"
          description="종속변수(연속형)와 그룹변수(범주형)를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="mann-whitney"
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
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.uValue}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">U 통계량</p>
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
                  <CardTitle>Mann-Whitney U 검정 통계량</CardTitle>
                  <CardDescription>순위합과 U 통계량 결과</CardDescription>
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
                          <td className="border p-2 font-medium">U 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.uValue}</td>
                          <td className="border p-2 text-sm text-muted-foreground">Mann-Whitney U 값</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">검정통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(4)}</td>
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
                          <td className="border p-2 font-medium">그룹 1 순위합</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.rankSum1.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">첫 번째 그룹 순위합</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">그룹 2 순위합</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.rankSum2.toFixed(1)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">두 번째 그룹 순위합</td>
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
                  <CardTitle>집단별 기술통계량</CardTitle>
                  <CardDescription>각 그룹의 중심경향성과 분산 지표</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">집단</th>
                          <th className="border p-2 text-right">N</th>
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
                          <td className="border p-2 font-medium">그룹 1</td>
                          <td className="border p-2 text-right">{analysisResult.nobs1}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group1.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.group1.min.toFixed(2)} - {analysisResult.descriptives.group1.max.toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">그룹 2</td>
                          <td className="border p-2 text-right">{analysisResult.nobs2}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.median.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.mean.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.q1.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.q3.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.descriptives.group2.iqr.toFixed(3)}</td>
                          <td className="border p-2 text-right font-mono">
                            {analysisResult.descriptives.group2.min.toFixed(2)} - {analysisResult.descriptives.group2.max.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">중위수 차이</h4>
                    <div className="text-2xl font-bold text-primary">
                      {analysisResult.medianDiff > 0 ? '+' : ''}{analysisResult.medianDiff.toFixed(3)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      그룹 1 중위수 - 그룹 2 중위수
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>Mann-Whitney U 검정 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>분석 결과 요약</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>집단 비교</AlertTitle>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <Card>
                <CardHeader>
                  <CardTitle>데이터 시각화</CardTitle>
                  <CardDescription>집단별 분포 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    📊 박스플롯 및 히스토그램은 추후 구현 예정입니다
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
                  <p className="font-medium">Mann-Whitney U 검정 분석 중...</p>
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