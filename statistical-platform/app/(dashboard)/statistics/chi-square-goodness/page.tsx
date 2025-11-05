'use client'

import React, { useCallback, useMemo, useState } from 'react'
import type { ChiSquareGoodnessVariables } from '@/types/statistics'
import type { VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  PieChart,
  Percent
} from 'lucide-react'

// Components
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// Hooks & Utils
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Services
import { pyodideStats } from '@/lib/services/pyodide-statistics'

// Type definitions
interface UploadedData {
  file: File
  data: Record<string, unknown>[]
  columns: string[]
}

// interface SelectedVariables {
//   dependent: string[]
//   [key: string]: string | string[] | undefined
// }
// → types/statistics.ts의 ChiSquareGoodnessVariables 사용

interface CategoryData {
  category: string
  observed: number
  expected: number
  residual: number
  standardizedResidual: number
  contribution: number
}

interface ChiSquareGoodnessResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  categories: CategoryData[]
  effectSize: {
    cramersV: number
    interpretation: string
  }
  expectedModel: 'uniform' | 'specified' | 'theoretical'
  totalN: number
  interpretation: {
    summary: string
    categories: string
    recommendations: string[]
  }
}

export default function ChiSquareGoodnessPage() {
  // State management with useStatisticsPage hook
  const { state, actions } = useStatisticsPage<ChiSquareGoodnessResult, ChiSquareGoodnessVariables>({
    withUploadedData: true,
    withError: true
  })

  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [expectedProportions, setExpectedProportions] = useState<Record<string, number>>({})
  const [useUniformDistribution, setUseUniformDistribution] = useState(true)

  // Steps configuration
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: '카이제곱 적합도 검정의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '범주형 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '범주형 변수 선택 및 기댓값 설정',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: '카이제곱 적합도 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info
  const methodInfo = useMemo(() => ({
    formula: "χ² = Σ[(Oᵢ - Eᵢ)² / Eᵢ]",
    assumptions: [
      "관측값은 서로 독립적",
      "각 범주의 기댓값 ≥ 5",
      "범주형(명목척도) 데이터"
    ],
    sampleSize: "총 표본 크기 30개 이상 권장",
    usage: "이론적 분포와의 일치도 검정"
  }), [])

  // Event handlers with useCallback
  const handleDataUploadComplete = useCallback(
    createDataUploadHandler(
      actions.setUploadedData,
      () => {
        if (actions?.setCurrentStep) {
          actions.setCurrentStep(2)
        }
      },
      'chi-square-goodness'
    ),
    [actions]
  )

  const handleVariableSelection = useCallback(
    (variables: VariableAssignment) => {
      // Convert to SelectedVariables type
      const selectedVars: ChiSquareGoodnessVariables = {
        dependent: Array.isArray(variables.dependent)
          ? variables.dependent as string[]
          : variables.dependent
            ? [variables.dependent as string]
            : []
      }

      if (actions?.setSelectedVariables) {
        actions.setSelectedVariables(selectedVars)
      }

      // Extract unique categories from the dependent variable
      if (!selectedVars.dependent || selectedVars.dependent.length === 0 || !uploadedData?.data) {
        return
      }

      const categoryVariable = selectedVars.dependent[0]
      const uniqueCategories = [...new Set(
        uploadedData.data
          .map((row: Record<string, unknown>) => row[categoryVariable])
          .filter((val: unknown): val is string | number => val !== null && val !== undefined)
          .map((val: string | number) => String(val))
      )]

      // Initialize with uniform distribution
      const initialProportions: Record<string, number> = {}
      const uniformProportion = 1 / uniqueCategories.length
      uniqueCategories.forEach((category: string) => {
        initialProportions[category] = uniformProportion
      })
      setExpectedProportions(initialProportions)
    },
    [actions, uploadedData]
  )

  const runAnalysis = useCallback(async () => {
    if (!uploadedData?.data || !selectedVariables?.dependent || selectedVariables.dependent.length === 0) {
      if (actions?.setError) {
        actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      }
      return
    }

    if (!actions?.startAnalysis || !actions?.completeAnalysis || !actions?.setError) {
      return
    }

    actions.startAnalysis()

    try {
      // Mock result for now (실제로는 Pyodide 사용 예정)
      const mockResult: ChiSquareGoodnessResult = {
        statistic: 12.456,
        pValue: 0.0062,
        degreesOfFreedom: 3,
        categories: [
          { category: 'A', observed: 25, expected: 20, residual: 5, standardizedResidual: 1.118, contribution: 1.25 },
          { category: 'B', observed: 18, expected: 20, residual: -2, standardizedResidual: -0.447, contribution: 0.2 },
          { category: 'C', observed: 22, expected: 20, residual: 2, standardizedResidual: 0.447, contribution: 0.2 },
          { category: 'D', observed: 15, expected: 20, residual: -5, standardizedResidual: -1.118, contribution: 1.25 }
        ],
        effectSize: {
          cramersV: 0.395,
          interpretation: '중간 효과크기'
        },
        expectedModel: useUniformDistribution ? 'uniform' : 'specified',
        totalN: 80,
        interpretation: {
          summary: 'χ²(3) = 12.456, p = 0.0062. 관측빈도가 기댓빈도와 통계적으로 유의한 차이가 있습니다.',
          categories: 'A와 D 범주에서 기댓값과의 편차가 크게 나타났습니다.',
          recommendations: [
            '표본 크기가 충분한지 확인하세요 (각 범주 최소 5개)',
            '기댓값 설정이 연구 목적에 부합하는지 검토하세요',
            '잔차 분석을 통해 어느 범주가 기댓값과 다른지 파악하세요'
          ]
        }
      }

      actions.completeAnalysis(mockResult, 3)
    } catch (err: unknown) {
      console.error('카이제곱 적합도 검정 실패:', err)
      const errorMessage = err instanceof Error
        ? err.message
        : '카이제곱 적합도 검정 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, selectedVariables, useUniformDistribution, actions])

  const handleProportionChange = useCallback((category: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setExpectedProportions(prev => ({
      ...prev,
      [category]: numValue
    }))
  }, [])

  const normalizeProportions = useCallback(() => {
    const total = Object.values(expectedProportions).reduce((sum, val) => sum + val, 0)
    if (total > 0) {
      const normalized: Record<string, number> = {}
      Object.entries(expectedProportions).forEach(([category, value]) => {
        normalized[category] = value / total
      })
      setExpectedProportions(normalized)
    }
  }, [expectedProportions])

  const getCramersVInterpretation = useCallback((v: number) => {
    if (v >= 0.5) return { level: '강한 연관성', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (v >= 0.3) return { level: '중간 연관성', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (v >= 0.1) return { level: '약한 연관성', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '연관성 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }, [])

  return (
    <StatisticsPageLayout
      title="카이제곱 적합도 검정"
      subtitle="Chi-Square Goodness-of-Fit Test"
      description="관측된 빈도가 이론적 분포와 일치하는지 검정"
      icon={<PieChart className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions?.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="카이제곱 적합도 검정 소개"
          description="범주형 데이터의 이론적 분포 일치도 검정"
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
                    관측된 범주형 데이터가 특정 이론적 분포를 따르는지 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 균등분포 가정 검정</li>
                    <li>• 이론적 비율과의 일치도</li>
                    <li>• 범주별 기댓값과 관측값 비교</li>
                    <li>• 단일 범주형 변수 분석</li>
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
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">주사위 공정성</h4>
                      <p className="text-muted-foreground">각 면이 균등하게 나오는가?</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">선호도 조사</h4>
                      <p className="text-muted-foreground">특정 비율대로 응답하는가?</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 범주형 데이터의 분포가 특정 이론과 일치하는지 확인<br/>
                • 각 범주의 출현 빈도가 예상과 같은지 검정<br/>
                • 균등분포 가정 검증<br/>
                • 품질관리에서 불량률 분포 검정
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={() => actions?.setCurrentStep && actions.setCurrentStep(1)}>
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
          description="범주형 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUploadComplete}
            onNext={() => actions?.setCurrentStep && actions.setCurrentStep(2)}
          />

          <Alert className="mt-4">
            <PieChart className="h-4 w-4" />
            <AlertTitle>범주형 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 관측값을 나타냅니다<br/>
              • 범주형 변수: 텍스트 또는 숫자 코드<br/>
              • 예: 색상(빨강, 파랑, 노랑), 등급(A, B, C, D)<br/>
              • 결측값이 없어야 합니다
            </AlertDescription>
          </Alert>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions?.setCurrentStep && actions.setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택 및 기댓값 설정"
          description="범주형 변수를 선택하고 기댓값을 설정하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId="chi_square_goodness"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions?.setCurrentStep && actions.setCurrentStep(1)}
          />

          {selectedVariables && Object.keys(expectedProportions).length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="uniform"
                    checked={useUniformDistribution}
                    onChange={() => setUseUniformDistribution(true)}
                  />
                  <Label htmlFor="uniform">균등분포 (모든 범주가 동일한 확률)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="specified"
                    checked={!useUniformDistribution}
                    onChange={() => setUseUniformDistribution(false)}
                  />
                  <Label htmlFor="specified">사용자 정의 비율</Label>
                </div>
              </div>

              {!useUniformDistribution && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3">각 범주별 기댓값 비율 설정</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(expectedProportions).map(([category, proportion]) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Label className="min-w-0 flex-1">{category}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={proportion}
                          onChange={(e) => handleProportionChange(category, e.target.value)}
                          className="w-20"
                        />
                        <Percent className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={normalizeProportions}
                    >
                      비율 정규화
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      총합: {Object.values(expectedProportions).reduce((a, b) => a + b, 0).toFixed(3)}
                    </p>
                  </div>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={runAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing ? '분석 중...' : '분석 실행'}
                </Button>
              </div>
            </div>
          )}

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>설정 가이드</AlertTitle>
            <AlertDescription>
              • 균등분포: 모든 범주가 동일한 확률을 갖는다고 가정<br/>
              • 사용자 정의: 특정 이론적 비율로 검정<br/>
              • 비율의 합은 1.0이 되어야 합니다
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && results && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {results.statistic.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">χ² 통계량</p>
                  <p className="text-xs text-muted-foreground">df = {results.degreesOfFreedom}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <PValueBadge value={results.pValue} size="lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">유의확률</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {results.effectSize.cramersV.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Cramér&apos;s V</p>
                  <Badge variant="outline" className="mt-1">
                    {results.effectSize.interpretation}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="frequencies" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="frequencies">빈도표</TabsTrigger>
              <TabsTrigger value="residuals">잔차분석</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="visualization">시각화</TabsTrigger>
            </TabsList>

            <TabsContent value="frequencies">
              <Card>
                <CardHeader>
                  <CardTitle>관측빈도 vs 기댓빈도</CardTitle>
                  <CardDescription>각 범주별 관측값과 이론적 기댓값 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Badge variant="outline">
                      {results.expectedModel === 'uniform' ? '균등분포 모델' :
                       results.expectedModel === 'specified' ? '사용자 정의 모델' :
                       '이론적 모델'}
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">범주</th>
                          <th className="border p-2 text-right">관측빈도 (O)</th>
                          <th className="border p-2 text-right">기댓빈도 (E)</th>
                          <th className="border p-2 text-right">잔차 (O-E)</th>
                          <th className="border p-2 text-right">기여도</th>
                          <th className="border p-2 text-center">비율</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.categories.map((category, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2 font-medium">{category.category}</td>
                            <td className="border p-2 text-right font-mono">{category.observed}</td>
                            <td className="border p-2 text-right font-mono">{category.expected.toFixed(2)}</td>
                            <td className="border p-2 text-right font-mono">
                              <span className={category.residual > 0 ? 'text-muted-foreground' : 'text-muted-foreground'}>
                                {category.residual > 0 ? '+' : ''}{category.residual.toFixed(2)}
                              </span>
                            </td>
                            <td className="border p-2 text-right font-mono">{category.contribution.toFixed(3)}</td>
                            <td className="border p-2 text-center">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{width: `${(category.observed / results.totalN) * 100}%`}}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {((category.observed / results.totalN) * 100).toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium bg-muted/30">
                          <td className="border p-2">총계</td>
                          <td className="border p-2 text-right font-mono">{results.totalN}</td>
                          <td className="border p-2 text-right font-mono">{results.totalN}</td>
                          <td className="border p-2 text-right font-mono">0.00</td>
                          <td className="border p-2 text-right font-mono">
                            {results.categories.reduce((sum, cat) => sum + cat.contribution, 0).toFixed(3)}
                          </td>
                          <td className="border p-2 text-center">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="residuals">
              <Card>
                <CardHeader>
                  <CardTitle>잔차 분석</CardTitle>
                  <CardDescription>표준화 잔차와 각 범주의 기여도</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left">범주</th>
                          <th className="border p-2 text-right">표준화 잔차</th>
                          <th className="border p-2 text-right">χ² 기여도</th>
                          <th className="border p-2 text-center">해석</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.categories.map((category, index) => {
                          const absStdResidual = Math.abs(category.standardizedResidual)
                          const significance = absStdResidual > 2 ? 'significant' : 'normal'

                          return (
                            <tr key={index} className="hover:bg-muted/50">
                              <td className="border p-2 font-medium">{category.category}</td>
                              <td className="border p-2 text-right font-mono">
                                <span className={
                                  absStdResidual > 2 ? 'text-muted-foreground font-bold' :
                                  absStdResidual > 1.5 ? 'text-muted-foreground' : 'text-gray-700'
                                }>
                                  {category.standardizedResidual > 0 ? '+' : ''}
                                  {category.standardizedResidual.toFixed(3)}
                                </span>
                              </td>
                              <td className="border p-2 text-right font-mono">{category.contribution.toFixed(3)}</td>
                              <td className="border p-2 text-center">
                                <Badge variant={significance === 'significant' ? 'destructive' : 'outline'}>
                                  {significance === 'significant' ? '이상치' : '정상'}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">잔차 해석 가이드</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• |표준화 잔차| &gt; 2: 해당 범주가 기댓값과 크게 다름</li>
                      <li>• 양의 잔차: 관측값이 기댓값보다 큼 (과다표현)</li>
                      <li>• 음의 잔차: 관측값이 기댓값보다 작음 (과소표현)</li>
                      <li>• χ² 기여도: 전체 통계량에 대한 각 범주의 기여분</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>카이제곱 적합도 검정 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>전체 검정 결과</AlertTitle>
                    <AlertDescription>
                      {results.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>범주별 분석</AlertTitle>
                    <AlertDescription>
                      {results.interpretation.categories}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">권장사항</h4>
                    <ul className="space-y-2">
                      {results.interpretation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${getCramersVInterpretation(results.effectSize.cramersV).bg}`}>
                      <h4 className={`font-medium mb-2 ${getCramersVInterpretation(results.effectSize.cramersV).color}`}>
                        효과크기 (Cramér&apos;s V)
                      </h4>
                      <p className="text-sm">
                        V = {results.effectSize.cramersV.toFixed(3)}
                        ({getCramersVInterpretation(results.effectSize.cramersV).level})
                      </p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Cramér&apos;s V 해석 기준</h4>
                      <div className="text-sm space-y-1">
                        <div>V ≥ 0.5: 강한 연관성</div>
                        <div>V ≥ 0.3: 중간 연관성</div>
                        <div>V ≥ 0.1: 약한 연관성</div>
                        <div>V &lt; 0.1: 연관성 없음</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <Card>
                <CardHeader>
                  <CardTitle>데이터 시각화</CardTitle>
                  <CardDescription>관측빈도와 기댓빈도 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    막대그래프와 파이차트는 추후 구현 예정입니다
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => actions?.setCurrentStep && actions.setCurrentStep(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                결과 내보내기
              </Button>
              <Button onClick={() => actions?.setCurrentStep && actions.setCurrentStep(0)}>
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
                  <p className="font-medium">카이제곱 적합도 검정 분석 중...</p>
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
