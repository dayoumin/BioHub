'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  GitBranch,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  Users,
  Activity
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface TTestResult {
  type: 'one-sample' | 'two-sample' | 'paired'
  statistic: number
  pvalue: number
  df: number
  ci_lower?: number
  ci_upper?: number
  mean_diff?: number
  effect_size?: {
    cohens_d: number
    interpretation: string
  }
  assumptions?: {
    normality: { passed: boolean; pvalue: number }
    equal_variance?: { passed: boolean; pvalue: number }
  }
  sample_stats?: {
    group1?: { mean: number; std: number; n: number }
    group2?: { mean: number; std: number; n: number }
  }
}

interface TTestVariables {
  group?: string | string[]
  value?: string | string[]
  [key: string]: string | string[] | undefined
}

const STEPS = [
  { id: 1, label: '검정 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '결과 확인' }
]

export default function TTestPage() {
  useEffect(() => {
    addToRecentStatistics('t-test')
  }, [])

  const { state, actions } = useStatisticsPage<TTestResult, TTestVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const [testType, setTestType] = useState<'one-sample' | 'two-sample' | 'paired' | ''>('')
  const [testValue, setTestValue] = useState<number>(0)

  const testTypeInfo = {
    'one-sample': {
      title: '일표본 t-검정',
      subtitle: 'One-Sample t-test',
      description: '하나의 표본 평균이 특정 값과 같은지 검정',
      icon: <Activity className="w-5 h-5" />,
      example: '넙치의 평균 체중이 500g인지 검정',
      variables: ['value']
    },
    'two-sample': {
      title: '독립표본 t-검정',
      subtitle: 'Independent Samples t-test',
      description: '두 독립 집단의 평균이 같은지 검정',
      icon: <GitBranch className="w-5 h-5" />,
      example: '사료 A와 B의 성장률 비교',
      variables: ['group', 'value']
    },
    'paired': {
      title: '대응표본 t-검정',
      subtitle: 'Paired Samples t-test',
      description: '동일 대상의 전후 측정값 평균 차이 검정',
      icon: <ArrowUpDown className="w-5 h-5" />,
      example: '사료 교체 전후 체중 변화',
      variables: ['before', 'after']
    }
  }

  const handleMethodSelect = useCallback((type: 'one-sample' | 'two-sample' | 'paired') => {
    setTestType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((varName: string, header: string) => {
    const current = selectedVariables || {} as TTestVariables
    actions.setSelectedVariables?.({ ...current, [varName]: header })
  }, [actions, selectedVariables])

  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) {
      actions.setError?.('데이터와 변수를 확인해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      let workerResult: unknown
      let resultType: 'one-sample' | 'two-sample' | 'paired' = testType as 'one-sample' | 'two-sample' | 'paired'

      if (testType === 'one-sample') {
        // 일표본 t-검정
        const valueCol = selectedVariables.value as string
        const values = uploadedData.data.map((row: Record<string, unknown>) => row[valueCol] as number)

        workerResult = await pyodideCore.callWorkerMethod<{
          statistic: number
          pValue: number
          sampleMean: number
        }>(PyodideWorker.Hypothesis, 't_test_one_sample', { data: values, popmean: testValue })

      } else if (testType === 'two-sample') {
        // 독립표본 t-검정
        const groupCol = selectedVariables.group as string
        const valueCol = selectedVariables.value as string

        const uniqueGroups = Array.from(new Set(uploadedData.data.map((row: Record<string, unknown>) => row[groupCol])))
        if (uniqueGroups.length !== 2) {
          throw new Error(`집단 변수는 정확히 2개의 값을 가져야 합니다 (현재: ${uniqueGroups.length}개)`)
        }

        const group1Data = uploadedData.data
          .filter((row: Record<string, unknown>) => row[groupCol] === uniqueGroups[0])
          .map((row: Record<string, unknown>) => row[valueCol] as number)
        const group2Data = uploadedData.data
          .filter((row: Record<string, unknown>) => row[groupCol] === uniqueGroups[1])
          .map((row: Record<string, unknown>) => row[valueCol] as number)

        workerResult = await pyodideCore.callWorkerMethod<{
          statistic: number
          pValue: number
          cohensD: number
          mean1: number
          mean2: number
          std1: number
          std2: number
          n1: number
          n2: number
        }>(PyodideWorker.Hypothesis, 't_test_two_sample', { group1: group1Data, group2: group2Data, equal_var: true })

      } else if (testType === 'paired') {
        // 대응표본 t-검정
        const beforeCol = selectedVariables.before as string
        const afterCol = selectedVariables.after as string

        const values1 = uploadedData.data.map((row: Record<string, unknown>) => row[beforeCol] as number)
        const values2 = uploadedData.data.map((row: Record<string, unknown>) => row[afterCol] as number)

        workerResult = await pyodideCore.callWorkerMethod<{
          statistic: number
          pValue: number
          meanDiff: number
          nPairs: number
        }>(PyodideWorker.Hypothesis, 't_test_paired', { values1, values2 })

      } else {
        throw new Error('Invalid test type')
      }

      // Worker 결과를 TTestResult 타입으로 변환
      const finalResult: TTestResult = (() => {
        if (testType === 'one-sample') {
          const res = workerResult as { statistic: number; pValue: number; sampleMean: number }
          return {
            type: 'one-sample',
            statistic: res.statistic,
            pvalue: res.pValue,
            df: uploadedData.data.length - 1,
            ci_lower: undefined,
            ci_upper: undefined
          }
        } else if (testType === 'two-sample') {
          const res = workerResult as {
            statistic: number
            pValue: number
            cohensD: number
            mean1: number
            mean2: number
            std1: number
            std2: number
            n1: number
            n2: number
          }
          return {
            type: 'two-sample',
            statistic: res.statistic,
            pvalue: res.pValue,
            df: res.n1 + res.n2 - 2,
            mean_diff: res.mean1 - res.mean2,
            effect_size: {
              cohens_d: res.cohensD,
              interpretation: interpretEffectSize(res.cohensD)
            },
            sample_stats: {
              group1: { mean: res.mean1, std: res.std1, n: res.n1 },
              group2: { mean: res.mean2, std: res.std2, n: res.n2 }
            }
          }
        } else {
          // paired
          const res = workerResult as { statistic: number; pValue: number; meanDiff: number; nPairs: number }
          return {
            type: 'paired',
            statistic: res.statistic,
            pvalue: res.pValue,
            df: res.nPairs - 1,
            mean_diff: res.meanDiff
          }
        }
      })()

      actions.completeAnalysis?.(finalResult, 4)
    } catch (err) {
      actions.setError?.(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, testType, testValue, actions])

  const stepsWithCompleted = STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? !!testType :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables :
              step.id === 4 ? !!results : false
  }))

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: 't-검정' }
  ]

  const interpretEffectSize = (d: number) => {
    const abs = Math.abs(d)
    if (abs >= 0.8) return '큰 효과'
    if (abs >= 0.5) return '중간 효과'
    if (abs >= 0.2) return '작은 효과'
    return '효과 없음'
  }

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="t-검정"
      analysisSubtitle="t-test"
      analysisIcon={<Activity className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: 검정 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">t-검정 방법 선택</h2>
            <p className="text-sm text-muted-foreground">
              연구 설계와 데이터 특성에 맞는 t-검정 방법을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(testTypeInfo).map(([key, info]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  testType === key ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleMethodSelect(key as 'one-sample' | 'two-sample' | 'paired')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                      {info.icon}
                    </div>
                    {testType === key && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{info.title}</CardTitle>
                  <Badge variant="outline" className="w-fit mt-2">
                    {info.subtitle}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-medium mb-1">예시:</p>
                    <p className="text-xs text-muted-foreground">
                      {info.example}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {testType === 'one-sample' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">검정 값 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="testValue">비교할 기준 값</Label>
                <Input
                  id="testValue"
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(parseFloat(e.target.value))}
                  placeholder="예: 500"
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              t-검정할 데이터 파일을 업로드하세요
            </p>
          </div>

          <DataUploadStep onUploadComplete={handleDataUpload} />
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 3 && uploadedData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              분석에 사용할 변수를 선택하세요
            </p>
          </div>

          {testType === 'one-sample' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">측정 변수 (연속형)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => {
                    const isSelected = selectedVariables?.value === header

                    return (
                      <Badge
                        key={header}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer max-w-[200px] truncate"
                        title={header}
                        onClick={() => handleVariableSelect('value', header)}
                      >
                        {header}
                        {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {testType === 'two-sample' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">집단 변수 (범주형)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.group === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('group', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">측정 변수 (연속형)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.value === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('value', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {testType === 'paired' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">전 측정값 (Before)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.before === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('before', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">후 측정값 (After)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.after === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('after', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <Button
              onClick={handleAnalysis}
              disabled={
                isAnalyzing ||
                (testType === 'one-sample' && !selectedVariables?.value) ||
                (testType === 'two-sample' && (!selectedVariables?.group || !selectedVariables?.value)) ||
                (testType === 'paired' && (!selectedVariables?.before || !selectedVariables?.after))
              }
              size="lg"
            >
              {isAnalyzing ? '분석 중...' : 't-검정 실행'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {currentStep === 4 && results && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">t-검정 결과</h2>
            <p className="text-sm text-muted-foreground">
              {testTypeInfo[results.type]?.title} 분석이 완료되었습니다
            </p>
          </div>

          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  t({results.df}) = <strong>{results.statistic.toFixed(3)}</strong>,
                  p = <strong>{results.pvalue < 0.001 ? '< 0.001' : results.pvalue.toFixed(3)}</strong>
                </p>
                {results.mean_diff !== undefined && (
                  <p className="text-sm">
                    평균 차이 = <strong>{results.mean_diff.toFixed(2)}</strong>
                    {results.ci_lower !== undefined && results.ci_upper !== undefined && (
                      <>, 95% CI [{results.ci_lower.toFixed(2)}, {results.ci_upper.toFixed(2)}]</>
                    )}
                  </p>
                )}
                <p className="text-sm">
                  {results.pvalue < 0.05
                    ? '✅ 두 집단 간 평균 차이가 통계적으로 유의합니다.'
                    : '❌ 두 집단 간 평균 차이가 유의하지 않습니다.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 집단별 기술통계 */}
          {results.sample_stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">집단별 기술통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {results.sample_stats.group1 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">집단 1</p>
                      <div className="space-y-1 text-sm">
                        <p>N = {results.sample_stats.group1.n}</p>
                        <p>평균 = {results.sample_stats.group1.mean.toFixed(2)}</p>
                        <p>표준편차 = {results.sample_stats.group1.std.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  {results.sample_stats.group2 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">집단 2</p>
                      <div className="space-y-1 text-sm">
                        <p>N = {results.sample_stats.group2.n}</p>
                        <p>평균 = {results.sample_stats.group2.mean.toFixed(2)}</p>
                        <p>표준편차 = {results.sample_stats.group2.std.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 막대 그래프 */}
                {results.sample_stats.group1 && results.sample_stats.group2 && (
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: '집단 1', mean: results.sample_stats.group1.mean },
                        { name: '집단 2', mean: results.sample_stats.group2.mean }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="mean" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 효과 크기 */}
          {results.effect_size && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">효과 크기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Cohen's d</p>
                    <p className="text-lg font-semibold">{results.effect_size.cohens_d.toFixed(3)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">해석</p>
                    <p className="text-lg font-semibold">{interpretEffectSize(results.effect_size.cohens_d)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 가정 검정 */}
          {results.assumptions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">가정 검정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 정규성 */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">정규성 검정 (Shapiro-Wilk)</span>
                      <Badge variant={results.assumptions.normality.passed ? 'default' : 'destructive'}>
                        {results.assumptions.normality.passed ? '만족' : '위반'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      p = {results.assumptions.normality.pvalue.toFixed(3)}
                    </p>
                  </div>

                  {/* 등분산성 */}
                  {results.assumptions.equal_variance && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">등분산성 검정 (Levene)</span>
                        <Badge variant={results.assumptions.equal_variance.passed ? 'default' : 'destructive'}>
                          {results.assumptions.equal_variance.passed ? '만족' : '위반'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        p = {results.assumptions.equal_variance.pvalue.toFixed(3)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </TwoPanelLayout>
  )
}
