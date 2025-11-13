'use client'

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'

import React, { useCallback, useEffect } from 'react'
import type { MeansPlotVariables } from '@/types/statistics'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, BarChart3, Target } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ErrorBar, LineChart, Line } from 'recharts'

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

  const steps: StatisticsStep[] = [
    {
      id: 'intro',
      number: 1,
      title: '평균 도표 분석',
      description: '집단별 평균값과 오차막대를 시각화하여 집단 간 차이를 탐색합니다.',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 파일을 업로드하고 데이터를 확인합니다.',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 요인변수를 선택합니다.',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '분석 결과',
      description: '평균 도표와 기술통계량을 확인합니다.',
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending'
    }
  ]

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
      }>(1, 'means_plot_data', {
        data: uploadedData.data as never,
        dependent_var: variables.dependent[0],
        factor_var: variables.factor[0]
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

  const handleVariablesSelected = useCallback((variables: unknown) => {
    if (!variables || typeof variables !== 'object') return

    actions.setSelectedVariables?.(variables as MeansPlotVariables)
    actions.setCurrentStep?.(4)
    runMeansPlotAnalysis(variables as MeansPlotVariables)
  }, [actions, runMeansPlotAnalysis])

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
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                집단별 평균값 비교 및 시각화
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                집단 간 차이의 크기 파악
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                데이터의 변산성 확인
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>종속변수:</strong> 연속형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>요인변수:</strong> 범주형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>집단 수:</strong> 2개 이상</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">집단</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">N</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">평균</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">표준편차</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">95% CI 하한</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">95% CI 상한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(results.descriptives).map((desc, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{desc.group}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.count}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.mean.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.std.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.sem.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.ci_lower.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{desc.ci_upper.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
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

  return (
    <StatisticsPageLayout
      steps={steps}
      currentStep={currentStep}
      title="평균 도표"
      description="집단별 평균값과 오차막대 시각화"
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep
          onUploadComplete={(_file: File, data: Record<string, unknown>[]) => handleDataUpload(data, Object.keys(data[0] || {}))}
          onNext={() => actions.setCurrentStep(3)}
        />
      )}
      {currentStep === 3 && uploadedData && (
        <VariableSelectorModern
          methodId="means-plot"
          data={uploadedData.data}
          onVariablesSelected={handleVariablesSelected}
          onBack={() => actions.setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && renderResults()}
    </StatisticsPageLayout>
  )
}