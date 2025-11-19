'use client'

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ChiSquareGoodnessVariables } from '@/types/statistics'
import type { VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'

// Hooks & Utils
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Type definitions
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
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('chi-square-goodness')
  }, [])

  // State management with useStatisticsPage hook
  const { state, actions } = useStatisticsPage<ChiSquareGoodnessResult, ChiSquareGoodnessVariables>({
    withUploadedData: true,
    withError: true
  })

  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [expectedProportions, setExpectedProportions] = useState<Record<string, number>>({})
  const [useUniformDistribution, setUseUniformDistribution] = useState(true)

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '카이제곱 적합도 검정', href: '/statistics/chi-square-goodness' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '변수 선택', completed: currentStep > 2 },
    { id: 3, label: '결과 해석', completed: currentStep > 3 }
  ], [currentStep])

  // Step 0: Method Introduction
  const renderMethodIntroduction = useCallback(() => (
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
        <Button onClick={() => actions.setCurrentStep(1)}>
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions])

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
      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 변수 추출
      const variableName = selectedVariables.dependent[0]

      // 빈도 계산
      const freqMap: Record<string, number> = {}
      uploadedData.data.forEach((row: Record<string, unknown>) => {
        const val = String(row[variableName])
        freqMap[val] = (freqMap[val] || 0) + 1
      })

      const categories = Object.keys(freqMap)
      const observed = Object.values(freqMap)
      const totalN = observed.reduce((sum, v) => sum + v, 0)

      // 기댓값 계산
      const expected = useUniformDistribution
        ? Array(categories.length).fill(totalN / categories.length)
        : categories.map(cat => (expectedProportions[cat] || 1 / categories.length) * totalN)

      // Worker 2 (hypothesis), method: 'chi_square_goodness_test' 호출
      interface ChiSquareResult {
        statistic: number
        pValue: number
        df: number
        cramersV?: number
      }

      const result = await pyodideCore.callWorkerMethod<ChiSquareResult>(
        PyodideWorker.Hypothesis,
        'chi_square_goodness_test',
        {
          observed,
          expected
        }
      )

      const categoriesData: CategoryData[] = categories.map((cat, i) => {
        const obs = observed[i]
        const exp = expected[i]
        const residual = obs - exp
        const stdResidual = residual / Math.sqrt(exp)
        return {
          category: cat,
          observed: obs,
          expected: exp,
          residual,
          standardizedResidual: stdResidual,
          contribution: (residual * residual) / exp
        }
      })

      const mockResult: ChiSquareGoodnessResult = {
        statistic: result.statistic,
        pValue: result.pValue,
        degreesOfFreedom: result.df,
        categories: categoriesData,
        effectSize: {
          cramersV: result.cramersV ?? Math.sqrt(result.statistic / totalN),
          interpretation: (result.cramersV ?? 0) >= 0.5 ? '강한 효과크기' : (result.cramersV ?? 0) >= 0.3 ? '중간 효과크기' : '작은 효과크기'
        },
        expectedModel: useUniformDistribution ? 'uniform' : 'specified',
        totalN,
        interpretation: {
          summary: `χ²(${result.df}) = ${result.statistic.toFixed(3)}, p = ${result.pValue.toFixed(4)}. 관측빈도가 기댓빈도와 ${result.pValue < 0.05 ? '통계적으로 유의한 차이가 있습니다' : '통계적으로 유의한 차이가 없습니다'}.`,
          categories: '범주별 잔차를 확인하세요.',
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

  // Column definitions for frequency table
  const frequencyColumns: TableColumn[] = useMemo(() => [
    { key: 'category', header: '범주', type: 'text' },
    { key: 'observed', header: '관측빈도 (O)', type: 'number', align: 'right' },
    { key: 'expected', header: '기댓빈도 (E)', type: 'number', align: 'right' },
    { key: 'residual', header: '잔차 (O-E)', type: 'number', align: 'right' },
    { key: 'contribution', header: '기여도', type: 'number', align: 'right' },
    { key: 'percentage', header: '비율', type: 'percentage', align: 'right' }
  ], [])

  // Column definitions for residuals table
  const residualColumns: TableColumn[] = useMemo(() => [
    { key: 'category', header: '범주', type: 'text' },
    { key: 'standardizedResidual', header: '표준화 잔차', type: 'number', align: 'right' },
    { key: 'contribution', header: 'χ² 기여도', type: 'number', align: 'right' },
    { key: 'interpretation', header: '해석', type: 'text', align: 'center' }
  ], [])

  return (
    <TwoPanelLayout
      analysisTitle="카이제곱 적합도 검정"
      analysisSubtitle="Chi-Square Goodness-of-Fit Test"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      {/* Step 0: 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>데이터 업로드</CardTitle>
            <CardDescription>범주형 데이터 파일을 업로드하세요</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <Card>
          <CardHeader>
            <CardTitle>변수 선택 및 기댓값 설정</CardTitle>
            <CardDescription>범주형 변수를 선택하고 기댓값을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <VariableSelectorModern
              methodId="chi-square-goodness"
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
          </CardContent>
        </Card>
      )}

      {/* Step 3: 결과 */}
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

                  <StatisticsTable
                    columns={frequencyColumns}
                    data={results.categories.map(category => ({
                      category: category.category,
                      observed: category.observed,
                      expected: category.expected,
                      residual: category.residual,
                      contribution: category.contribution,
                      percentage: (category.observed / results.totalN) * 100
                    }))}
                  />
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
                  <StatisticsTable
                    columns={residualColumns}
                    data={results.categories.map(category => {
                      const absStdResidual = Math.abs(category.standardizedResidual)
                      return {
                        category: category.category,
                        standardizedResidual: category.standardizedResidual,
                        contribution: category.contribution,
                        interpretation: absStdResidual > 2 ? '이상치' : '정상'
                      }
                    })}
                  />

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
                          <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    결과 내보내기
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>향후 제공 예정입니다</p>
                </TooltipContent>
              </Tooltip>
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
    </TwoPanelLayout>
  )
}
