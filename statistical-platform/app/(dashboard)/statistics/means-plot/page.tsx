'use client'

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'

import React, { useCallback, useEffect, useMemo } from 'react'
import type { MeansPlotVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, BarChart3, Target, CheckCircle2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ErrorBar } from 'recharts'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

// interface SelectedVariables {
//   dependent: string[]
//   factor: string[]
//   covariate?: string[]
// }
// → types/statistics.ts의 MeansPlotVariables 사용

interface MeansPlotResults {
  descriptives: {
    [key: string]: {
      group: string
      mean: number
      std: number
      sem: number
      count: number
      ci_lower: number
      ci_upper: number
    }
  }
  plot_data: Array<{
    group: string
    mean: number
    error: number
    count: number
  }>
  interpretation: {
    summary: string
    recommendations: string[]
  }
}

export default function MeansPlotPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('means-plot')
  }, [])

  // Hook for state management (Pattern A)
  const { state, actions } = useStatisticsPage<MeansPlotResults, MeansPlotVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state

  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: currentStep > index || (currentStep === 3 && results !== null)
    }))
  }, [currentStep, results])

  const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
    actions.setUploadedData?.({
      data: uploadedData as Record<string, unknown>[],
      fileName: 'uploaded-file.csv',
      columns: uploadedColumns
    })
    // Step 변경은 DataUploadStep의 onNext에서 처리 (중복 방지)
  }, [actions])

  const runMeansPlotAnalysis = useCallback(async (variables: MeansPlotVariables) => {
    if (!uploadedData) return

    try {
      // 배열 정규화: string | string[] → string[]
      const dependentVars = Array.isArray(variables.dependent)
        ? variables.dependent
        : [variables.dependent]
      const factorVars = Array.isArray(variables.factor)
        ? variables.factor
        : [variables.factor]

      if (dependentVars.length === 0 || factorVars.length === 0) {
        actions.setError('종속변수와 요인변수가 필요합니다.')
        return
      }

      actions.startAnalysis()

      // PyodideCore Worker 1 호출
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        descriptives: {
          [key: string]: {
            group: string
            mean: number
            std: number
            sem: number
            count: number
            ciLower: number
            ciUpper: number
          }
        }
        plotData: Array<{
          group: string
          mean: number
          error: number
          count: number
        }>
        interpretation: {
          summary: string
          recommendations: string[]
        }
      }>(PyodideWorker.Descriptive, 'means_plot_data', {
        data: uploadedData.data as never,
        dependent_var: dependentVars[0],
        factor_var: factorVars[0]
      })

      // Python에서 snake_case로 반환된 필드명을 camelCase로 변환
      const descriptives: MeansPlotResults['descriptives'] = {}
      for (const [key, value] of Object.entries(result.descriptives)) {
        descriptives[key] = {
          group: value.group,
          mean: value.mean,
          std: value.std,
          sem: value.sem,
          count: value.count,
          ci_lower: value.ciLower,
          ci_upper: value.ciUpper
        }
      }

      const analysisResults: MeansPlotResults = {
        descriptives,
        plot_data: result.plotData,
        interpretation: result.interpretation
      }

      actions.completeAnalysis(analysisResults, 4)
      } catch (err) {
        actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  const handleVariableSelect = useCallback((varName: string, role: 'dependent' | 'factor') => {
    const current = selectedVariables || { dependent: [], factor: [] }
    const currentArray = Array.isArray(current[role]) ? current[role] : []

    const isSelected = currentArray.includes(varName)
    const newVars = isSelected
      ? currentArray.filter((v: string) => v !== varName)
      : [...currentArray, varName]

    actions.setSelectedVariables?.({
      ...current,
      [role]: newVars
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const renderMethodIntroduction = () => (
    <div className="space-y-6">
      <div className="text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">평균 도표 (Means Plot)</h1>
        <p className="text-lg text-gray-600">집단별 평균값과 오차막대를 시각화하여 집단 간 차이를 탐색합니다</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              분석 목적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                집단별 평균값 비교 및 시각화
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                집단 간 차이의 크기 파악
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                데이터의 변산성 확인
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                ANOVA 분석 전 예비 탐색
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              적용 조건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>종속변수:</strong> 연속형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>요인변수:</strong> 범주형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>집단 수:</strong> 2개 이상</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>표본 크기:</strong> 각 집단 최소 3개 이상</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          평균 도표는 집단 간 차이를 시각적으로 탐색하는 도구입니다.
          통계적 유의성을 확인하려면 ANOVA 또는 t-test를 추가로 실시해야 합니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(2)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  )

  const renderResults = () => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>평균 도표 분석을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!results) return null

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">평균 도표 분석 결과</h2>
          <p className="text-gray-600">집단별 평균값과 오차막대를 확인하세요</p>
        </div>

        <Tabs defaultValue="plot" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="plot">평균 도표</TabsTrigger>
            <TabsTrigger value="descriptives">기술통계량</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          <TabsContent value="plot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>집단별 평균 도표</CardTitle>
                <CardDescription>
                  오차막대는 표준오차(SEM)를 나타냅니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.plot_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="group" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: unknown, name: string): [string, string] => [
                          typeof value === 'number' ? value.toFixed(3) : String(value),
                          name === 'mean' ? '평균' : name === 'error' ? '표준오차' : name
                        ]}
                        labelFormatter={(label) => `집단: ${label}`}
                      />
                      <Bar dataKey="mean" fill="#3b82f6" name="평균">
                        <ErrorBar dataKey="error" width={4} stroke="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="descriptives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>집단별 기술통계량</CardTitle>
                <CardDescription>
                  각 집단의 평균, 표준편차, 표본 크기 및 95% 신뢰구간
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  columns={[
                    { key: 'group', header: '집단', type: 'text' },
                    { key: 'count', header: 'N', type: 'number', align: 'right' },
                    { key: 'mean', header: '평균', type: 'number', align: 'right' },
                    { key: 'std', header: '표준편차', type: 'number', align: 'right' },
                    { key: 'sem', header: '표준오차', type: 'number', align: 'right' },
                    { key: 'ciLower', header: '95% CI 하한', type: 'number', align: 'right' },
                    { key: 'ciUpper', header: '95% CI 상한', type: 'number', align: 'right' }
                  ]}
                  data={Object.values(results.descriptives).map((desc) => ({
                    group: desc.group,
                    count: desc.count,
                    mean: desc.mean.toFixed(3),
                    std: desc.std.toFixed(3),
                    sem: desc.sem.toFixed(3),
                    ciLower: desc.ci_lower.toFixed(3),
                    ciUpper: desc.ci_upper.toFixed(3)
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 결과 해석</CardTitle>
                <CardDescription>
                  평균 도표 결과에 대한 해석과 후속 분석 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">권장사항</h4>
                  <ul className="space-y-2">
                    {results.interpretation.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Step 3 변수 선택 UI
  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter(col => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'number' || !isNaN(Number(firstValue))
    })

    const categoricalColumns = uploadedData.columns.filter(col => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'string' || isNaN(Number(firstValue))
    })

    const dependentVars = Array.isArray(selectedVariables?.dependent) ? selectedVariables.dependent : []
    const factorVars = Array.isArray(selectedVariables?.factor) ? selectedVariables.factor : []

    const canProceed = dependentVars.length > 0 && factorVars.length > 0

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">변수 선택</h2>
          <p className="text-gray-600">종속변수(연속형)와 요인변수(범주형)를 선택하세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>종속변수 (Dependent Variable)</CardTitle>
            <CardDescription>평균을 계산할 연속형 변수 (1개 선택)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col) => {
                const isSelected = dependentVars.includes(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      // 종속변수는 1개만 선택 가능
                      const currentFactorVars = Array.isArray(selectedVariables?.factor) ? selectedVariables.factor : []
                      actions.setSelectedVariables?.({
                        dependent: [col],
                        factor: currentFactorVars
                      })
                    }}
                  >
                    {col}
                    {isSelected && <CheckCircle2 className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>요인변수 (Factor Variable)</CardTitle>
            <CardDescription>집단을 구분하는 범주형 변수 (1개 선택)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoricalColumns.map((col) => {
                const isSelected = factorVars.includes(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      // 요인변수는 1개만 선택 가능
                      const currentDependentVars = Array.isArray(selectedVariables?.dependent) ? selectedVariables.dependent : []
                      actions.setSelectedVariables?.({
                        dependent: currentDependentVars,
                        factor: [col]
                      })
                    }}
                  >
                    {col}
                    {isSelected && <CheckCircle2 className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {canProceed && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              변수 선택이 완료되었습니다. 아래 버튼을 클릭하여 분석을 시작하세요.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => actions.setCurrentStep(2)}
            className="flex-1"
          >
            이전 단계
          </Button>
          <Button
            onClick={() => {
              if (selectedVariables) {
                actions.setCurrentStep(4)
                runMeansPlotAnalysis(selectedVariables)
              }
            }}
            disabled={!canProceed}
            className="flex-1"
          >
            다음 단계
          </Button>
        </div>
      </div>
    )
  }

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '평균 도표' }
  ]

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={actions.setCurrentStep}
      analysisTitle="평균 도표"
      analysisSubtitle="Means Plot"
      analysisIcon={<BarChart3 className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep
          onUploadComplete={(_file: File, data: Record<string, unknown>[]) => handleDataUpload(data, Object.keys(data[0] || {}))}
          onNext={() => actions.setCurrentStep(3)}
        />
      )}
      {currentStep === 3 && renderVariableSelection()}
      {currentStep === 4 && renderResults()}
    </TwoPanelLayout>
  )
}