'use client'

import { useCallback } from 'react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, Activity, Target, TrendingUp } from 'lucide-react'
import type { StatisticsStep } from '@/components/statistics/StatisticsPageLayout'

interface SelectedVariables {
  dependent: string[]
  factor: string[]
  covariate?: string[]
}

interface PartialCorrelationResults {
  correlations: Array<{
    variable1: string
    variable2: string
    partial_corr: number
    p_value: number
    t_stat: number
    df: number
    control_vars: string[]
  }>
  zero_order_correlations: Array<{
    variable1: string
    variable2: string
    correlation: number
    p_value: number
  }>
  summary: {
    n_pairs: number
    significant_pairs: number
    mean_partial_corr: number
    max_partial_corr: number
    min_partial_corr: number
  }
  interpretation: {
    summary: string
    recommendations: string[]
  }
}

export default function PartialCorrelationPage() {
  const { state, actions } = useStatisticsPage<PartialCorrelationResults, SelectedVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state

  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '편상관분석',
      description: '제3변수의 영향을 통제한 후 두 변수 간의 순수한 상관관계를 분석합니다.',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 파일을 업로드하고 데이터를 확인합니다.',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '분석할 변수들과 통제할 변수들을 선택합니다.',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '분석 결과',
      description: '편상관계수와 통계적 유의성을 확인합니다.',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  const runPartialCorrelationAnalysis = useCallback(async (variables: SelectedVariables) => {
    if (!uploadedData) return

    actions.startAnalysis()

    try {
      // Load Pyodide with required packages
      const pyodide: PyodideInterface = await loadPyodideWithPackages([
        'numpy',
        'pandas',
        'scipy'
      ])

      pyodide.globals.set('data', uploadedData.data)
      pyodide.globals.set('analysis_vars', variables.dependent)
      pyodide.globals.set('control_vars', variables.covariate || [])

      const pythonCode = `
import pandas as pd
import numpy as np
from scipy import stats
from itertools import combinations
import json

df = pd.DataFrame(data)

# 분석 변수와 통제 변수
analysis_vars = analysis_vars
control_vars = control_vars if control_vars else []

# 결측값 제거
all_vars = analysis_vars + control_vars
df_clean = df[all_vars].dropna()

def partial_correlation(df, x, y, control_vars):
    """편상관계수 계산"""
    if not control_vars:
        # 통제변수가 없으면 단순 상관
        corr, p_val = stats.pearsonr(df[x], df[y])
        n = len(df)
        t_stat = corr * np.sqrt((n-2)/(1-corr**2)) if corr != 1 and corr != -1 else np.inf
        return corr, p_val, t_stat, n-2

    # 편상관 계산
    # X와 control_vars에 대한 회귀
    X_matrix = np.column_stack([df[control_vars].values, np.ones(len(df))])
    x_resid = df[x] - X_matrix @ np.linalg.lstsq(X_matrix, df[x], rcond=None)[0]
    y_resid = df[y] - X_matrix @ np.linalg.lstsq(X_matrix, df[y], rcond=None)[0]

    # 잔차 간 상관
    corr, p_val = stats.pearsonr(x_resid, y_resid)
    n = len(df_clean)
    df_val = n - len(control_vars) - 2

    if corr != 1 and corr != -1:
        t_stat = corr * np.sqrt(df_val / (1 - corr**2))
    else:
        t_stat = np.inf

    return corr, p_val, t_stat, df_val

# 모든 변수 쌍에 대해 편상관 계산
correlations = []
zero_order_correlations = []

for x, y in combinations(analysis_vars, 2):
    # 편상관
    partial_corr, p_val, t_stat, df_val = partial_correlation(df_clean, x, y, control_vars)

    correlations.append({
        'variable1': x,
        'variable2': y,
        'partial_corr': float(partial_corr),
        'p_value': float(p_val),
        't_stat': float(t_stat),
        'df': int(df_val),
        'control_vars': control_vars.copy()
    })

    # 단순상관 (비교용)
    zero_corr, zero_p = stats.pearsonr(df_clean[x], df_clean[y])
    zero_order_correlations.append({
        'variable1': x,
        'variable2': y,
        'correlation': float(zero_corr),
        'p_value': float(zero_p)
    })

# 요약 통계
partial_values = [c['partial_corr'] for c in correlations]
significant_count = sum(1 for c in correlations if c['p_value'] < 0.05)

summary = {
    'n_pairs': len(correlations),
    'significant_pairs': significant_count,
    'mean_partial_corr': float(np.mean(np.abs(partial_values))),
    'max_partial_corr': float(np.max(partial_values)),
    'min_partial_corr': float(np.min(partial_values))
}

# 해석 생성
control_text = f" (통제변수: {', '.join(control_vars)})" if control_vars else ""
interpretation = {
    'summary': f'{len(analysis_vars)}개 변수 간 {summary["n_pairs"]}개 쌍의 편상관을 분석했습니다{control_text}. {significant_count}개 쌍이 통계적으로 유의했습니다.',
    'recommendations': [
        '편상관계수는 통제변수의 영향을 제거한 순수한 관계를 나타냅니다.',
        '절대값이 0.7 이상이면 강한 상관, 0.5-0.7은 중간 상관입니다.',
        '편상관과 단순상관을 비교하여 통제변수의 효과를 파악하세요.',
        '유의한 편상관은 다른 변수의 영향을 받지 않는 독립적 관계입니다.',
        '편상관이 음수라면 통제 후 역방향 관계가 나타납니다.'
    ]
}

results = {
    'correlations': correlations,
    'zero_order_correlations': zero_order_correlations,
    'summary': summary,
    'interpretation': interpretation
}

json.dumps(results)
`

      const result = pyodide.runPython(pythonCode)
      const parsedResults: PartialCorrelationResults = JSON.parse(result)

      actions.completeAnalysis(parsedResults, 3)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    const uploadedData: UploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }
    if (actions.setUploadedData) {
      actions.setUploadedData(uploadedData)
    }
    actions.setCurrentStep(1)
  }, [actions])

  const handleVariablesSelected = useCallback((variables: unknown) => {
    if (typeof variables === 'object' && variables !== null) {
      if (actions.setSelectedVariables) {
        actions.setSelectedVariables(variables as SelectedVariables)
      }
      actions.setCurrentStep(3)
      runPartialCorrelationAnalysis(variables as SelectedVariables)
    }
  }, [actions, runPartialCorrelationAnalysis])

  const getCorrelationStrength = (corr: number) => {
    const abs = Math.abs(corr)
    if (abs >= 0.7) return { level: '강함', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    if (abs >= 0.5) return { level: '중간', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    if (abs >= 0.3) return { level: '약함', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    return { level: '매우 약함', color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }

  const handleIntroductionNext = useCallback(() => {
    actions.setCurrentStep(1)
  }, [actions])

  const handleDataUploadBack = useCallback(() => {
    actions.setCurrentStep(0)
  }, [actions])

  const handleVariablesBack = useCallback(() => {
    actions.setCurrentStep(1)
  }, [actions])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="text-center">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">편상관분석 (Partial Correlation)</h1>
        <p className="text-lg text-gray-600">제3변수의 영향을 통제한 후 두 변수 간의 순수한 상관관계를 분석합니다</p>
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
                통제변수의 영향 제거 후 순수한 관계 파악
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                제3변수의 매개/억제 효과 탐지
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                단순상관과의 비교 분석
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                독립적 관계의 통계적 유의성 검정
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
                <span><strong>분석변수:</strong> 연속형 변수 (2개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>통제변수:</strong> 연속형 변수 (1개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>선형관계:</strong> 변수 간 선형 관계 가정</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>표본크기:</strong> 변수 수보다 충분히 큰 표본</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          편상관분석은 단순상관에서 나타난 관계가 제3변수의 영향 때문인지,
          아니면 두 변수 간의 독립적 관계인지를 구분하는 데 사용됩니다.
          특히 매개효과나 억제효과를 탐지하는 데 유용합니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={handleIntroductionNext} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [handleIntroductionNext])

  const renderResults = useCallback(() => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>편상관분석을 진행하고 있습니다...</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">편상관분석 결과</h2>
          <p className="text-gray-600">편상관계수와 통계적 유의성을 확인하세요</p>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">분석 요약</TabsTrigger>
            <TabsTrigger value="partial">편상관계수</TabsTrigger>
            <TabsTrigger value="comparison">상관 비교</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 요약</CardTitle>
                <CardDescription>
                  전체 편상관분석 결과의 요약 정보
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">분석된 변수 쌍</span>
                      <span className="font-semibold">{results.summary.n_pairs}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">통계적 유의한 쌍</span>
                      <span className="font-semibold text-muted-foreground">{results.summary.significant_pairs}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">평균 편상관계수</span>
                      <span className="font-semibold">{results.summary.mean_partial_corr.toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">최대 편상관계수</span>
                      <span className="font-semibold text-muted-foreground">{results.summary.max_partial_corr.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">최소 편상관계수</span>
                      <span className="font-semibold text-muted-foreground">{results.summary.min_partial_corr.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">통제변수 수</span>
                      <span className="font-semibold">{selectedVariables?.covariate?.length || 0}개</span>
                    </div>
                  </div>
                </div>

                {selectedVariables && selectedVariables.covariate && selectedVariables.covariate.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">통제변수</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedVariables.covariate.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="bg-muted">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="partial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>편상관계수 결과</CardTitle>
                <CardDescription>
                  통제변수의 영향을 제거한 후의 편상관계수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 1</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 2</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">편상관계수</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">t 통계량</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">자유도</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">강도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.correlations.map((corr, index) => {
                        const strength = getCorrelationStrength(corr.partial_corr)
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{corr.variable1}</td>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{corr.variable2}</td>
                            <td className={`border border-gray-300 px-4 py-2 text-right font-semibold ${strength.color}`}>
                              {corr.partial_corr.toFixed(3)}
                              {corr.p_value < 0.05 && <span className="text-red-500">*</span>}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{corr.t_stat.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={corr.p_value < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {corr.p_value.toFixed(4)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{corr.df}</td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge className={`${strength.bgColor} ${strength.color} border-0`}>
                                {strength.level}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">* p &lt; 0.05에서 통계적으로 유의</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>편상관 vs 단순상관 비교</CardTitle>
                <CardDescription>
                  통제변수의 영향을 제거하기 전후의 상관계수 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">변수 쌍</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">단순상관</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">편상관</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">차이</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">해석</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.correlations.map((corr, index) => {
                        const zeroOrder = results.zero_order_correlations[index]
                        const difference = corr.partial_corr - zeroOrder.correlation
                        const absChange = Math.abs(difference)

                        let changeInterpretation = { text: '변화 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
                        if (absChange > 0.2) {
                          changeInterpretation = { text: '큰 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        } else if (absChange > 0.1) {
                          changeInterpretation = { text: '중간 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        } else if (absChange > 0.05) {
                          changeInterpretation = { text: '작은 변화', color: 'text-muted-foreground', bg: 'bg-muted' }
                        }

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">
                              {corr.variable1} - {corr.variable2}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {zeroOrder.correlation.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                              {corr.partial_corr.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                              <span className={changeInterpretation.color}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              <Badge className={`${changeInterpretation.bg} ${changeInterpretation.color} border-0`}>
                                {changeInterpretation.text}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
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
                  편상관분석 결과에 대한 해석과 후속 분석 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">편상관 해석 기준</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">|r| ≥ 0.7: 강한 상관</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">0.5 ≤ |r| &lt; 0.7: 중간 상관</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-muted0 rounded-full mr-2"></div>
                        <span className="text-sm">0.3 ≤ |r| &lt; 0.5: 약한 상관</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                        <span className="text-sm">|r| &lt; 0.3: 매우 약한 상관</span>
                      </div>
                    </div>
                  </div>
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
  }, [isAnalyzing, error, results, selectedVariables])

  return (
    <StatisticsPageLayout
      steps={steps}
      currentStep={currentStep}
      title="편상관분석"
      description="제3변수의 영향을 통제한 순수한 상관관계 분석"
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onPrevious={handleDataUploadBack}
          currentStep={1}
          totalSteps={4}
        />
      )}
      {currentStep === 2 && uploadedData && (
        <VariableSelector
          methodId="partial-correlation"
          data={uploadedData.data}
          onVariablesSelected={handleVariablesSelected}
          onBack={handleVariablesBack}
        />
      )}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}