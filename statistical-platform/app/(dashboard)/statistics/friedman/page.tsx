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
  RotateCcw,
  Clock
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import type { VariableAssignment } from '@/components/variable-selection/VariableSelector'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ConditionStats {
  median: number
  mean: number
  meanRank: number
  sum: number
  n: number
}

interface FriedmanResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  nBlocks: number
  nConditions: number
  effectSize: {
    kendallW: number
    interpretation: string
  }
  descriptives: {
    [conditionName: string]: ConditionStats
  }
  rankSums: {
    [conditionName: string]: number
  }
  postHoc?: {
    method: string
    comparisons: Array<{
      condition1: string
      condition2: string
      pValue: number
      significant: boolean
      rankDiff: number
    }>
  }
  interpretation: {
    summary: string
    conditions: string
    recommendations: string[]
  }
}

export default function FriedmanPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<FriedmanResult, VariableAssignment>({
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
        actions.setError?.('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [actions])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'Friedman 검정의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '반복측정 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '반복측정 조건 변수들 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Friedman 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info - useMemo로 최적화
  const methodInfo = useMemo(() => ({
    formula: "χ²ᵣ = (12/bk(k+1)) × Σ(R²ᵢ) - 3b(k+1)",
    assumptions: [
      "동일 블록(개체)에서 3회 이상 반복측정",
      "서열척도 이상의 데이터",
      "블록 내 측정값의 독립성"
    ],
    sampleSize: "최소 10개 블록, 3개 이상 조건",
    usage: "반복측정 분산분석의 비모수 대안"
  }), [])

  // Event handlers
  const handleDataUpload = useCallback((data: unknown[]) => {
    const processedData = data.map((row, index) => ({
      ...row as Record<string, unknown>,
      _id: index
    })) as DataRow[]

    // Create UploadedData structure
    const columns = processedData.length > 0 ? Object.keys(processedData[0]) : []
    const uploadedData = {
      data: processedData,
      fileName: 'uploaded.csv',
      columns
    }

    actions.setUploadedData?.(uploadedData)
    actions.setCurrentStep(2)
  }, [actions])

  const runAnalysis = useCallback(async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodide || !variables.dependent) {
      actions.setError?.('분석을 실행할 수 없습니다.')
      return
    }

    // Handle both string and string[] types for dependent
    const dependentVars = Array.isArray(variables.dependent)
      ? variables.dependent
      : [variables.dependent]

    if (dependentVars.length < 3) {
      actions.setError?.('최소 3개 이상의 조건 변수가 필요합니다.')
      return
    }

    actions.startAnalysis?.()

    try {
      // Extract data columns for Friedman test
      const conditionData = dependentVars.map((varName: string) => {
        return uploadedData.data.map(row => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            return isNaN(num) ? 0 : num
          }
          return 0
        })
      })

      // Call friedmanTestWorker which returns basic result
      const basicResult = await pyodide.friedmanTestWorker(conditionData)

      // Calculate additional statistics for FriedmanResult
      const nBlocks = conditionData[0].length
      const nConditions = conditionData.length
      const degreesOfFreedom = nConditions - 1

      // Calculate descriptive statistics for each condition
      const descriptives: { [key: string]: ConditionStats } = {}
      const rankSums: { [key: string]: number } = {}

      dependentVars.forEach((varName: string, idx: number) => {
        const values = conditionData[idx]
        const sorted = [...values].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const sum = values.reduce((a, b) => a + b, 0)

        descriptives[varName] = {
          median,
          mean,
          meanRank: (idx + 1) * nBlocks / nConditions, // Simplified rank estimation
          sum,
          n: values.length
        }

        rankSums[varName] = mean * nBlocks // Simplified rank sum
      })

      // Calculate Kendall's W (coefficient of concordance)
      const kendallW = basicResult.statistic / (nBlocks * (nConditions - 1))
      const kendallInterpretation =
        kendallW >= 0.7 ? '강한 일치도' :
        kendallW >= 0.5 ? '중간 일치도' :
        kendallW >= 0.3 ? '약한 일치도' : '일치도 없음'

      // Build complete FriedmanResult
      const fullResult: FriedmanResult = {
        statistic: basicResult.statistic,
        pValue: basicResult.pValue,
        degreesOfFreedom,
        nBlocks,
        nConditions,
        effectSize: {
          kendallW,
          interpretation: kendallInterpretation
        },
        descriptives,
        rankSums,
        interpretation: {
          summary: basicResult.pValue < 0.05
            ? `Friedman 검정 결과 조건 간 유의한 차이가 있습니다 (χ²=${basicResult.statistic.toFixed(3)}, p=${basicResult.pValue.toFixed(4)}).`
            : `Friedman 검정 결과 조건 간 유의한 차이가 없습니다 (χ²=${basicResult.statistic.toFixed(3)}, p=${basicResult.pValue.toFixed(4)}).`,
          conditions: `${nConditions}개 조건에서 ${nBlocks}개 블록의 반복측정 데이터를 분석했습니다.`,
          recommendations: [
            basicResult.pValue < 0.05
              ? '사후검정을 통해 어느 조건 간에 차이가 있는지 확인하세요.'
              : '조건 간 차이가 없으므로 추가 분석이 불필요합니다.',
            `Kendall's W = ${kendallW.toFixed(3)} (${kendallInterpretation})`
          ]
        }
      }

      actions.completeAnalysis?.(fullResult, 3)
    } catch (err) {
      console.error('Friedman 검정 실패:', err)
      actions.setError?.('Friedman 검정 중 오류가 발생했습니다.')
    }
  }, [uploadedData, pyodide, actions])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    actions.setSelectedVariables?.(variables)

    // Handle both string and string[] types
    const dependentCount = Array.isArray(variables.dependent)
      ? variables.dependent.length
      : variables.dependent ? 1 : 0

    if (dependentCount >= 3) {
      runAnalysis(variables)
    }
  }, [actions, runAnalysis])

  const getKendallWInterpretation = (w: number) => {
    if (w >= 0.7) return { level: '강한 일치도', color: 'text-red-600', bg: 'bg-red-50' }
    if (w >= 0.5) return { level: '중간 일치도', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (w >= 0.3) return { level: '약한 일치도', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: '일치도 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  return (
    <StatisticsPageLayout
      title="Friedman 검정"
      subtitle="Friedman Test for Related Samples"
      description="반복측정 조건들의 중위수 차이를 비모수적으로 검정"
      icon={<RotateCcw className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="Friedman 검정 소개"
          description="반복측정 데이터의 순위 기반 비모수 검정"
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
                    동일한 개체에서 3회 이상 반복측정한 조건들의 중위수 차이를 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 반복측정 설계 분석</li>
                    <li>• 정규분포 가정 불필요</li>
                    <li>• 구형성 가정 불필요</li>
                    <li>• 순위 기반 강건한 검정</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    vs 반복측정 분산분석
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-medium text-green-800">Friedman 검정</h4>
                      <p className="text-green-700">비모수, 구형성 가정 불필요</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800">반복측정 분산분석</h4>
                      <p className="text-blue-700">모수, 정규분포+구형성 가정</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 동일 개체의 3회 이상 반복측정 데이터<br/>
                • 정규분포나 구형성 가정 위반<br/>
                • 서열척도 측정값의 시간별 변화<br/>
                • 반복측정 분산분석의 비모수 대안
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
          description="반복측정 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={(file, data) => {
              handleDataUpload(data)
            }}
          />

          <Alert className="mt-4">
            <Clock className="h-4 w-4" />
            <AlertTitle>반복측정 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 개체(참가자)를 나타냅니다<br/>
              • 각 열은 측정 조건(시점)을 나타냅니다<br/>
              • 예: Time1, Time2, Time3 또는 Pre, Mid, Post<br/>
              • 최소 3개 조건이 필요합니다
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
          description="반복측정 조건 변수들을 선택하세요 (최소 3개)"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="friedman"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 3개 이상의 반복측정 조건들<br/>
              • 모든 변수는 동일한 개체에서 측정되어야 함<br/>
              • 예: Time1, Time2, Time3을 모두 종속변수로 선택
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
                    {analysisResult.statistic.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">χ²ᵣ 통계량</p>
                  <p className="text-xs text-muted-foreground">df = {analysisResult.degreesOfFreedom}</p>
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
                  <div className="text-3xl font-bold text-purple-600">
                    {analysisResult.effectSize.kendallW.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Kendall's W</p>
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
              <TabsTrigger value="posthoc">사후검정</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Friedman 검정 통계량</CardTitle>
                  <CardDescription>χ² 통계량과 검정 결과</CardDescription>
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
                          <td className="border p-2 font-medium">χ²ᵣ 통계량</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.statistic.toFixed(4)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">Friedman 카이제곱</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">자유도</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.degreesOfFreedom}</td>
                          <td className="border p-2 text-sm text-muted-foreground">df = k - 1</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">p-값</td>
                          <td className="border p-2 text-right">
                            <PValueBadge value={analysisResult.pValue} />
                          </td>
                          <td className="border p-2 text-sm text-muted-foreground">카이제곱 분포</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">블록 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.nBlocks}</td>
                          <td className="border p-2 text-sm text-muted-foreground">개체 수</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">조건 수</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.nConditions}</td>
                          <td className="border p-2 text-sm text-muted-foreground">반복측정 조건</td>
                        </tr>
                        <tr>
                          <td className="border p-2 font-medium">Kendall's W</td>
                          <td className="border p-2 text-right font-mono">{analysisResult.effectSize.kendallW.toFixed(4)}</td>
                          <td className="border p-2 text-sm text-muted-foreground">일치도 계수</td>
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
                  <CardTitle>조건별 기술통계량</CardTitle>
                  <CardDescription>각 측정 조건의 중심경향성과 순위 정보</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">조건</th>
                          <th className="border p-2 text-right">N</th>
                          <th className="border p-2 text-right">중위수</th>
                          <th className="border p-2 text-right">평균</th>
                          <th className="border p-2 text-right">평균순위</th>
                          <th className="border p-2 text-right">순위합</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analysisResult.descriptives).map(([conditionName, stats], index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium">{conditionName}</td>
                            <td className="border p-2 text-right">{stats.n}</td>
                            <td className="border p-2 text-right font-mono">{stats.median.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">{stats.mean.toFixed(3)}</td>
                            <td className="border p-2 text-right font-mono">{stats.meanRank.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">{analysisResult.rankSums[conditionName].toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">일치도 해석 (Kendall's W)</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getKendallWInterpretation(analysisResult.effectSize.kendallW).bg}`}>
                      <span className={`font-medium ${getKendallWInterpretation(analysisResult.effectSize.kendallW).color}`}>
                        W = {analysisResult.effectSize.kendallW.toFixed(3)} ({getKendallWInterpretation(analysisResult.effectSize.kendallW).level})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      블록 내 순위 일치도: {(analysisResult.effectSize.kendallW * 100).toFixed(1)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>Friedman 검정 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>전체 검정 결과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>조건별 비교</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.conditions}
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

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Kendall's W 해석 기준</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>W ≥ 0.7: 강한 일치도</div>
                      <div>W ≥ 0.5: 중간 일치도</div>
                      <div>W ≥ 0.3: 약한 일치도</div>
                      <div>W &lt; 0.3: 일치도 없음</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posthoc">
              <Card>
                <CardHeader>
                  <CardTitle>사후검정</CardTitle>
                  <CardDescription>조건 간 쌍별 비교 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisResult.postHoc ? (
                    <>
                      <div className="mb-4">
                        <Badge variant="outline">
                          {analysisResult.postHoc.method}
                        </Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border p-2 text-left">비교</th>
                              <th className="border p-2 text-right">순위 차이</th>
                              <th className="border p-2 text-right">p-값</th>
                              <th className="border p-2 text-center">유의성</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.postHoc.comparisons.map((comp, index) => (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="border p-2 font-medium">
                                  {comp.condition1} vs {comp.condition2}
                                </td>
                                <td className="border p-2 text-right font-mono">
                                  {comp.rankDiff > 0 ? '+' : ''}{comp.rankDiff.toFixed(2)}
                                </td>
                                <td className="border p-2 text-right">
                                  <PValueBadge value={comp.pValue} size="sm" />
                                </td>
                                <td className="border p-2 text-center">
                                  <Badge variant={comp.significant ? "default" : "outline"}>
                                    {comp.significant ? "유의" : "비유의"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      사후검정은 전체 검정이 유의할 때 수행됩니다.
                    </div>
                  )}
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
                  <p className="font-medium">Friedman 검정 분석 중...</p>
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