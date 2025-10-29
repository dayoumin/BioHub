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
  Grid3X3,
  Link2
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import type { VariableAssignment } from '@/components/variable-selection/VariableSelector'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Helper functions
function interpretCramersV(value: number): string {
  if (value < 0.1) return '매우 약함 (Very weak)'
  if (value < 0.3) return '약함 (Weak)'
  if (value < 0.5) return '중간 (Moderate)'
  return '강함 (Strong)'
}

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface CrossTabCell {
  observed: number
  expected: number
  residual: number
  standardizedResidual: number
  contribution: number
  row: string
  column: string
}

interface ChiSquareIndependenceResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  crosstab: CrossTabCell[][]
  marginals: {
    rowTotals: Record<string, number>
    columnTotals: Record<string, number>
    total: number
  }
  effectSizes: {
    cramersV: number
    phi: number
    cramersVInterpretation: string
    phiInterpretation: string
  }
  assumptions: {
    minimumExpectedFrequency: number
    cellsBelow5: number
    totalCells: number
    assumptionMet: boolean
  }
  interpretation: {
    summary: string
    association: string
    recommendations: string[]
  }
}

export default function ChiSquareIndependencePage() {
  // Hook for state management
  const { state, actions } = useStatisticsPage<ChiSquareIndependenceResult, VariableAssignment>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

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
  }, [])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: '카이제곱 독립성 검정의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '두 범주형 변수 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '두 범주형 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: '독립성 검정 결과 및 연관성 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info - useMemo로 최적화
  const methodInfo = useMemo(() => ({
    formula: "χ² = Σ[(Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ]",
    assumptions: [
      "두 변수 모두 범주형 데이터",
      "관측값들이 서로 독립적",
      "각 셀의 기댓빈도 ≥ 5"
    ],
    sampleSize: "총 표본 크기 30개 이상, 각 셀 최소 5개",
    usage: "두 범주형 변수 간의 독립성 검정"
  }), [])

  // Event handlers
  const handleDataUploadComplete = useCallback((file: File, data: unknown[]) => {
    const processedData = data.map((row, index) => ({
      ...row as Record<string, unknown>,
      _id: index
    })) as DataRow[]
    setUploadedData(processedData)
    actions.setCurrentStep(2)
    actions.setError(null)
  }, [])

  const runAnalysis = useCallback(async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodide || !variables.independent || !variables.dependent) {
      actions.setError('분석을 실행할 수 없습니다. 두 개의 범주형 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis()
    actions.setError(null)

    try {
      // Convert DataRow[] to contingency table (number[][])
      const rowVar = variables.dependent[0]
      const colVar = variables.independent[0]

      // Get unique values for each variable
      const rowValues = [...new Set(uploadedData.data.map(row => String(row[rowVar])))]
      const colValues = [...new Set(uploadedData.data.map(row => String(row[colVar])))]

      // Create contingency table matrix (using Array.from for safety)
      const matrix: number[][] = Array.from(
        { length: rowValues.length },
        () => Array.from({ length: colValues.length }, () => 0)
      )

      // Fill the contingency table
      uploadedData.data.forEach(row => {
        const rowIdx = rowValues.indexOf(String(row[rowVar]))
        const colIdx = colValues.indexOf(String(row[colVar]))
        if (rowIdx >= 0 && colIdx >= 0) {
          matrix[rowIdx][colIdx]++
        }
      })

      // Call Pyodide function with number[][]
      const pyodideResult = await pyodide.chiSquareIndependenceTest(matrix)

      // Transform Pyodide result to page interface
      const totalN = pyodideResult.observedMatrix.flat().reduce((sum, val) => sum + val, 0)

      // Calculate standardized residuals and contributions
      const crosstab: CrossTabCell[][] = pyodideResult.observedMatrix.map((row, rowIdx) =>
        row.map((observed, colIdx) => {
          const expected = pyodideResult.expectedMatrix[rowIdx][colIdx]
          const residual = observed - expected
          const standardizedResidual = residual / Math.sqrt(expected)
          const contribution = (residual ** 2) / expected

          return {
            observed,
            expected,
            residual,
            standardizedResidual,
            contribution,
            row: rowValues[rowIdx],
            column: colValues[colIdx]
          }
        })
      )

      // Calculate minimum expected frequency and cells below 5
      const allExpected = pyodideResult.expectedMatrix.flat()
      const minimumExpectedFrequency = Math.min(...allExpected)
      const cellsBelow5 = allExpected.filter(val => val < 5).length
      const totalCells = allExpected.length

      // Check if 2x2 table for Phi coefficient
      const is2x2Table = rowValues.length === 2 && colValues.length === 2
      const phi = is2x2Table ? pyodideResult.cramersV :
        Math.sqrt(pyodideResult.chiSquare / totalN)

      const transformedResult: ChiSquareIndependenceResult = {
        statistic: pyodideResult.chiSquare,
        pValue: pyodideResult.pValue,
        degreesOfFreedom: pyodideResult.degreesOfFreedom,
        crosstab,
        marginals: {
          rowTotals: Object.fromEntries(
            rowValues.map((label, idx) => [
              label,
              pyodideResult.observedMatrix[idx].reduce((sum, val) => sum + val, 0)
            ])
          ),
          columnTotals: Object.fromEntries(
            colValues.map((label, idx) => [
              label,
              pyodideResult.observedMatrix.reduce((sum, row) => sum + row[idx], 0)
            ])
          ),
          total: totalN
        },
        effectSizes: {
          cramersV: pyodideResult.cramersV,
          phi: phi,
          cramersVInterpretation: interpretCramersV(pyodideResult.cramersV),
          phiInterpretation: is2x2Table ? interpretCramersV(phi) : 'N/A (2×2 테이블에만 적용)'
        },
        assumptions: {
          minimumExpectedFrequency,
          cellsBelow5,
          totalCells,
          assumptionMet: minimumExpectedFrequency >= 5 && cellsBelow5 === 0
        },
        interpretation: {
          summary: pyodideResult.reject
            ? '두 변수 간 유의한 연관성이 있습니다.'
            : '두 변수 간 유의한 연관성이 없습니다.',
          association: interpretCramersV(pyodideResult.cramersV),
          recommendations: minimumExpectedFrequency < 5
            ? ['일부 셀의 기대빈도가 5 미만입니다. Fisher의 정확검정을 고려하세요.']
            : []
        }
      }

      actions.setResults(transformedResult)
      actions.setCurrentStep(3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('카이제곱 독립성 검정 실패:', errorMessage)
      actions.setError(`카이제곱 독립성 검정 중 오류가 발생했습니다: ${errorMessage}`)
    } finally {
      // isAnalyzing managed by hook
    }
  }, [uploadedData, pyodide])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    actions.setSelectedVariables(variables)
    if (variables.independent && variables.dependent &&
        variables.independent.length === 1 && variables.dependent.length === 1) {
      runAnalysis(variables)
    }
  }, [runAnalysis])

  const getCramersVInterpretation = (v: number) => {
    if (v >= 0.5) return { level: '강한 연관성', color: 'text-red-600', bg: 'bg-red-50' }
    if (v >= 0.3) return { level: '중간 연관성', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (v >= 0.1) return { level: '약한 연관성', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: '연관성 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const getRowCategories = () => {
    if (!analysisResult) return []
    return [...new Set(analysisResult.crosstab.flat().map(cell => cell.row))]
  }

  const getColumnCategories = () => {
    if (!analysisResult) return []
    return [...new Set(analysisResult.crosstab.flat().map(cell => cell.column))]
  }

  return (
    <StatisticsPageLayout
      title="카이제곱 독립성 검정"
      subtitle="Chi-Square Test of Independence"
      description="두 범주형 변수 간의 독립성 및 연관성 검정"
      icon={<Grid3X3 className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="카이제곱 독립성 검정 소개"
          description="두 범주형 변수의 독립성 검정"
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
                    두 범주형 변수가 서로 독립적인지, 아니면 연관성이 있는지 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 두 변수 간의 독립성 검정</li>
                    <li>• 연관성의 강도 측정</li>
                    <li>• 분할표(교차표) 분석</li>
                    <li>• 범주별 기여도 파악</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    적용 예시
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-green-50 p-3 rounded">
                      <h4 className="font-medium text-green-800">성별 × 선호도</h4>
                      <p className="text-green-700">성별에 따른 제품 선호도 차이</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800">교육 × 소득</h4>
                      <p className="text-blue-700">교육수준과 소득수준의 관계</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 두 범주형 변수 간의 독립성을 검정할 때<br/>
                • 분할표(2×2, 3×3 등)에서 연관성을 확인할 때<br/>
                • 설문조사에서 응답 간의 관련성 분석<br/>
                • 치료법과 결과의 독립성 검정
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
          description="두 범주형 변수 데이터를 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUploadComplete}
            onNext={() => actions.setCurrentStep(2)}
          />

          <Alert className="mt-4">
            <Grid3X3 className="h-4 w-4" />
            <AlertTitle>분할표 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 관측값을 나타냅니다<br/>
              • 두 개의 범주형 변수가 필요합니다<br/>
              • 예: 성별(남/여) × 만족도(만족/불만족/보통)<br/>
              • 결측값이 없어야 합니다
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
          description="독립성을 검정할 두 범주형 변수를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="chi_square_independence"
            data={uploadedData}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 첫 번째 범주형 변수 (행 변수)<br/>
              • 독립변수: 두 번째 범주형 변수 (열 변수)<br/>
              • 두 변수 모두 범주형(명목척도 또는 서열척도)이어야 함<br/>
              • 예: 성별(종속) × 선호도(독립)
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
                  <p className="text-sm text-muted-foreground mt-1">χ² 통계량</p>
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
                    {analysisResult.effectSizes.cramersV.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Cramér's V</p>
                  <Badge variant="outline" className="mt-1">
                    {analysisResult.effectSizes.cramersVInterpretation}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="crosstab" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="crosstab">교차표</TabsTrigger>
              <TabsTrigger value="residuals">잔차분석</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
            </TabsList>

            <TabsContent value="crosstab">
              <Card>
                <CardHeader>
                  <CardTitle>교차표 (분할표)</CardTitle>
                  <CardDescription>관측빈도와 기댓빈도 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2"></th>
                          {getColumnCategories().map(col => (
                            <th key={col} className="border p-2 text-center font-medium">
                              {col}
                            </th>
                          ))}
                          <th className="border p-2 text-center font-medium bg-muted">합계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getRowCategories().map(row => (
                          <tr key={row} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium bg-muted">{row}</td>
                            {getColumnCategories().map(col => {
                              const cell = analysisResult.crosstab.flat().find(c => c.row === row && c.column === col)
                              if (!cell) return <td key={col} className="border p-2">-</td>

                              return (
                                <td key={col} className="border p-2 text-center">
                                  <div className="space-y-1">
                                    <div className="font-mono text-lg">{cell.observed}</div>
                                    <div className="text-xs text-muted-foreground">
                                      ({cell.expected.toFixed(1)})
                                    </div>
                                    <div className="text-xs">
                                      {((cell.observed / analysisResult.marginals.total) * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </td>
                              )
                            })}
                            <td className="border p-2 text-center font-medium bg-muted">
                              {analysisResult.marginals.rowTotals[row]}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted font-medium">
                          <td className="border p-2">합계</td>
                          {getColumnCategories().map(col => (
                            <td key={col} className="border p-2 text-center">
                              {analysisResult.marginals.columnTotals[col]}
                            </td>
                          ))}
                          <td className="border p-2 text-center">
                            {analysisResult.marginals.total}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    각 셀: 관측빈도 / (기댓빈도) / 비율%
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="residuals">
              <Card>
                <CardHeader>
                  <CardTitle>표준화 잔차 분석</CardTitle>
                  <CardDescription>각 셀의 기여도와 잔차</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2"></th>
                          {getColumnCategories().map(col => (
                            <th key={col} className="border p-2 text-center font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getRowCategories().map(row => (
                          <tr key={row} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium bg-muted">{row}</td>
                            {getColumnCategories().map(col => {
                              const cell = analysisResult.crosstab.flat().find(c => c.row === row && c.column === col)
                              if (!cell) return <td key={col} className="border p-2">-</td>

                              const absStdResidual = Math.abs(cell.standardizedResidual)
                              const significance = absStdResidual > 2 ? 'significant' : 'normal'

                              return (
                                <td key={col} className="border p-2 text-center">
                                  <div className="space-y-1">
                                    <div className={`font-mono text-sm ${
                                      absStdResidual > 2 ? 'text-red-600 font-bold' :
                                      absStdResidual > 1.5 ? 'text-orange-600' : 'text-gray-700'
                                    }`}>
                                      {cell.standardizedResidual > 0 ? '+' : ''}
                                      {cell.standardizedResidual.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      χ²: {cell.contribution.toFixed(3)}
                                    </div>
                                    <Badge
                                      variant={significance === 'significant' ? 'destructive' : 'outline'}
                                      className="text-xs"
                                    >
                                      {significance === 'significant' ? '유의' : '정상'}
                                    </Badge>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">잔차 해석</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• |표준화 잔차| &gt; 2: 해당 셀이 독립성에서 크게 벗어남</li>
                      <li>• 양의 잔차: 기댓값보다 많은 관측 (양의 연관성)</li>
                      <li>• 음의 잔차: 기댓값보다 적은 관측 (음의 연관성)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>독립성 검정 결과와 연관성 해석</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>독립성 검정 결과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Link2 className="h-4 w-4" />
                    <AlertTitle>연관성 분석</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.association}
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
                    <div className={`p-4 rounded-lg ${getCramersVInterpretation(analysisResult.effectSizes.cramersV).bg}`}>
                      <h4 className={`font-medium mb-2 ${getCramersVInterpretation(analysisResult.effectSizes.cramersV).color}`}>
                        Cramér's V (연관성 강도)
                      </h4>
                      <p className="text-sm">
                        V = {analysisResult.effectSizes.cramersV.toFixed(3)}
                        ({getCramersVInterpretation(analysisResult.effectSizes.cramersV).level})
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Phi 계수 (2×2표)</h4>
                      <p className="text-sm">
                        φ = {analysisResult.effectSizes.phi.toFixed(3)}
                        <br />
                        <span className="text-blue-600">
                          {analysisResult.effectSizes.phiInterpretation}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assumptions">
              <Card>
                <CardHeader>
                  <CardTitle>가정 검정</CardTitle>
                  <CardDescription>카이제곱 검정의 전제조건 확인</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">기댓빈도 조건</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>최소 기댓빈도:</span>
                          <span className="font-mono">{analysisResult.assumptions.minimumExpectedFrequency.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>기댓빈도 &lt; 5인 셀:</span>
                          <span className="font-mono">{analysisResult.assumptions.cellsBelow5}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>전체 셀 수:</span>
                          <span className="font-mono">{analysisResult.assumptions.totalCells}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.assumptionMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {analysisResult.assumptions.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">효과크기 해석 기준</h4>
                      <div className="space-y-1 text-sm">
                        <div>V ≥ 0.5: 강한 연관성</div>
                        <div>V ≥ 0.3: 중간 연관성</div>
                        <div>V ≥ 0.1: 약한 연관성</div>
                        <div>V &lt; 0.1: 연관성 없음</div>
                      </div>
                    </div>
                  </div>

                  {!analysisResult.assumptions.assumptionMet && (
                    <Alert className="mt-4" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>가정 위반 경고</AlertTitle>
                      <AlertDescription>
                        기댓빈도가 5 미만인 셀이 있습니다. Fisher의 정확 검정을 고려하거나 범주를 통합해보세요.
                      </AlertDescription>
                    </Alert>
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
                  <p className="font-medium">카이제곱 독립성 검정 분석 중...</p>
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