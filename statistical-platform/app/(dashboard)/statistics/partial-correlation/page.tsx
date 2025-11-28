'use client'

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import type { PartialCorrelationVariables } from '@/types/statistics'
import type { VariableAssignment } from '@/types/statistics-converters'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, Activity, Target, TrendingUp ,
  FileText,
  Shield,
  ArrowLeftRight,
  MessageSquare
} from 'lucide-react'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface NormalityTest {
  variable: string
  statistic: number | null
  pValue: number | null
  passed: boolean | null
}

interface LinearityTest {
  variable1: string
  variable2: string
  rSquared: number
  passed: boolean
}

interface MulticollinearityTest {
  variable1: string
  variable2: string
  correlation: number
  passed: boolean
}

interface PartialCorrelationAssumptions {
  normality: {
    testName: string
    tests: NormalityTest[]
    allPassed: boolean
    interpretation: string
  }
  linearity: {
    testName: string
    tests: LinearityTest[]
    allPassed: boolean
    interpretation: string
  }
  multicollinearity: {
    testName: string
    tests: MulticollinearityTest[]
    allPassed: boolean
    interpretation: string
  }
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
  assumptions?: PartialCorrelationAssumptions
}

export default function PartialCorrelationPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('partial-correlation')
  }, [])

  const { state, actions } = useStatisticsPage<PartialCorrelationResults, PartialCorrelationVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')

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

  const runPartialCorrelationAnalysis = useCallback(async (variables: VariableAssignment) => {
    if (!uploadedData || !actions) return

    actions.startAnalysis()

    try {
      // PyodideCore Worker 2 호출
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        correlations: Array<{
          variable1: string
          variable2: string
          partialCorr: number
          pValue: number
          tStat: number
          df: number
          controlVars: string[]
        }>
        zeroOrderCorrelations: Array<{
          variable1: string
          variable2: string
          correlation: number
          pValue: number
        }>
        summary: {
          nPairs: number
          significantPairs: number
          meanPartialCorr: number
          maxPartialCorr: number
          minPartialCorr: number
        }
        interpretation: {
          summary: string
          recommendations: string[]
        }
        assumptions?: PartialCorrelationAssumptions
      }>(PyodideWorker.Hypothesis, 'partial_correlation_analysis', {
        data: uploadedData.data as never,
        analysis_vars: variables.dependent as never,
        control_vars: (variables.covariate || []) as never
      })

      // Python camelCase → TypeScript snake_case 변환
      const parsedResults: PartialCorrelationResults = {
        correlations: result.correlations.map(c => ({
          variable1: c.variable1,
          variable2: c.variable2,
          partial_corr: c.partialCorr,
          p_value: c.pValue,
          t_stat: c.tStat,
          df: c.df,
          control_vars: c.controlVars
        })),
        zero_order_correlations: result.zeroOrderCorrelations.map(z => ({
          variable1: z.variable1,
          variable2: z.variable2,
          correlation: z.correlation,
          p_value: z.pValue
        })),
        summary: {
          n_pairs: result.summary.nPairs,
          significant_pairs: result.summary.significantPairs,
          mean_partial_corr: result.summary.meanPartialCorr,
          max_partial_corr: result.summary.maxPartialCorr,
          min_partial_corr: result.summary.minPartialCorr
        },
        interpretation: result.interpretation,
        assumptions: result.assumptions
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(parsedResults, 3)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  const handleDataUpload = useCallback(
    createDataUploadHandler(
      actions?.setUploadedData,
      () => {
        if (!actions) return
        actions.setCurrentStep(1)
      },
      'partial-correlation'
    ),
    [actions]
  )

  const handleAnalysis = useCallback(() => {
    if (!selectedVariables || !actions) return
    actions.setCurrentStep(3)
    runPartialCorrelationAnalysis(selectedVariables as unknown as VariableAssignment)
  }, [selectedVariables, actions, runPartialCorrelationAnalysis])

  // Badge 기반 변수 선택 핸들러
  const handleVariableSelect = useCallback((varName: string, role: 'dependent' | 'covariate') => {
    const current = selectedVariables || { dependent: [], covariate: [] }
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

  const getCorrelationStrength = useCallback((corr: number) => {
    const abs = Math.abs(corr)
    if (abs >= 0.7) return { level: '강함', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    if (abs >= 0.5) return { level: '중간', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    if (abs >= 0.3) return { level: '약함', color: 'text-muted-foreground', bgColor: 'bg-muted' }
    return { level: '매우 약함', color: 'text-gray-600', bgColor: 'bg-gray-50' }
  }, [])

  const handleIntroductionNext = useCallback(() => {
    if (!actions) return
    actions.setCurrentStep(1)
  }, [actions])

  const handleDataUploadBack = useCallback(() => {
    if (!actions) return
    actions.setCurrentStep(0)
  }, [actions])

  const handleVariablesBack = useCallback(() => {
    if (!actions) return
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                통제변수의 영향 제거 후 순수한 관계 파악
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                제3변수의 매개/억제 효과 탐지
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                단순상관과의 비교 분석
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>분석변수:</strong> 연속형 변수 (2개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>통제변수:</strong> 연속형 변수 (1개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>선형관계:</strong> 변수 간 선형 관계 가정</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
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

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'number'
    })

    const dependentVars = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent
      : selectedVariables?.dependent
        ? [selectedVariables.dependent]
        : []
    const covariateVars = Array.isArray(selectedVariables?.covariate)
      ? selectedVariables.covariate
      : selectedVariables?.covariate
        ? [selectedVariables.covariate]
        : []

    const canProceed = dependentVars.length >= 2 && covariateVars.length >= 1

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">변수 선택</h2>
          <p className="text-gray-600">분석할 변수들과 통제할 변수들을 선택하세요 (복수 선택 가능)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>분석 변수 선택</CardTitle>
            <CardDescription>
              편상관분석을 수행할 연속형 변수를 2개 이상 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col: string) => {
                const isSelected = dependentVars.includes(col)
                const isCovariate = covariateVars.includes(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer ${isCovariate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!isCovariate) {
                        handleVariableSelect(col, 'dependent')
                      }
                    }}
                  >
                    {col}
                    {isSelected && <CheckCircle2 className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
            {dependentVars.length > 0 && (
              <div className="mt-3 p-2 bg-muted rounded text-sm">
                <span className="font-medium">선택된 변수: </span>
                {dependentVars.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>통제 변수 선택</CardTitle>
            <CardDescription>
              영향을 통제할 연속형 변수를 1개 이상 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col: string) => {
                const isSelected = covariateVars.includes(col)
                const isDependent = dependentVars.includes(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer ${isDependent ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (!isDependent) {
                        handleVariableSelect(col, 'covariate')
                      }
                    }}
                  >
                    {col}
                    {isSelected && <CheckCircle2 className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
            {covariateVars.length > 0 && (
              <div className="mt-3 p-2 bg-muted rounded text-sm">
                <span className="font-medium">선택된 통제변수: </span>
                {covariateVars.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        {!canProceed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              분석 변수를 2개 이상, 통제 변수를 1개 이상 선택해야 합니다.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleVariablesBack}>
            이전 단계
          </Button>
          <Button
            onClick={handleAnalysis}
            disabled={!canProceed}
          >
            다음 단계
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, handleVariableSelect, handleVariablesBack, handleAnalysis])

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
        <ResultContextHeader
          analysisType="편상관분석"
          analysisSubtitle="Partial Correlation"
          fileName={uploadedData?.fileName}
          variables={[...(selectedVariables?.dependent || []), ...(selectedVariables?.covariate || [])]}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">편상관분석 결과</h2>
          <p className="text-gray-600">편상관계수와 통계적 유의성을 확인하세요</p>
        </div>

        <ContentTabs
              tabs={[
                { id: 'summary', label: '분석 요약', icon: FileText },
                { id: 'assumptions', label: '가정 검정', icon: Shield },
                { id: 'partial', label: '편상관계수', icon: Table },
                { id: 'comparison', label: '상관 비교', icon: ArrowLeftRight },
                { id: 'interpretation', label: '해석', icon: MessageSquare }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

          <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-4">
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
                      {(Array.isArray(selectedVariables.covariate)
                        ? selectedVariables.covariate
                        : [selectedVariables.covariate]).map((variable: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-muted">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-4">
            {results.assumptions && (
              <AssumptionTestCard
                title="편상관분석 가정 검정"
                tests={[
                  {
                    name: '정규성',
                    description: '각 분석 변수가 정규분포를 따르는지 검정합니다',
                    testName: results.assumptions.normality.testName,
                    passed: results.assumptions.normality.allPassed,
                    details: results.assumptions.normality.interpretation,
                    pValue: (() => {
                      const validPValues = results.assumptions.normality.tests
                        .filter(t => t.pValue !== null)
                        .map(t => t.pValue as number)
                      return validPValues.length > 0 ? Math.min(...validPValues) : null
                    })(),
                    recommendation: results.assumptions.normality.allPassed === false ? 'Spearman 편상관을 고려하세요' : undefined,
                    severity: results.assumptions.normality.allPassed === false ? 'medium' : undefined
                  },
                  {
                    name: '선형성',
                    description: '변수 쌍 간 선형 관계가 있는지 검정합니다',
                    testName: results.assumptions.linearity.testName,
                    passed: results.assumptions.linearity.allPassed,
                    pValue: null,
                    details: results.assumptions.linearity.interpretation,
                    recommendation: !results.assumptions.linearity.allPassed ? '비선형 관계가 있을 수 있습니다. 산점도를 확인하세요' : undefined,
                    severity: !results.assumptions.linearity.allPassed ? 'low' : undefined
                  },
                  {
                    name: '다중공선성',
                    description: '통제변수 간 높은 상관관계가 있는지 검정합니다',
                    testName: results.assumptions.multicollinearity.testName,
                    passed: results.assumptions.multicollinearity.allPassed,
                    pValue: null,
                    details: results.assumptions.multicollinearity.interpretation,
                    recommendation: !results.assumptions.multicollinearity.allPassed ? '통제변수 중 일부를 제거하거나 VIF 분석을 수행하세요' : undefined,
                    severity: !results.assumptions.multicollinearity.allPassed ? 'high' : undefined
                  }
                ]}
                showRecommendations={true}
                showDetails={true}
              />
            )}

            {results.assumptions && results.assumptions.normality.tests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">변수별 정규성 검정 상세</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="정규성 검정 (Shapiro-Wilk)"
                    columns={[
                      { key: 'variable', header: '변수', type: 'text', align: 'left' },
                      { key: 'statistic', header: 'W 통계량', type: 'number', align: 'right', formatter: (v: number | null) => v !== null ? v.toFixed(4) : '-' },
                      { key: 'pValue', header: 'p값', type: 'number', align: 'right', formatter: (v: number | null) => v !== null ? v.toFixed(4) : '-' },
                      { key: 'result', header: '결과', type: 'custom', align: 'center', formatter: (v) => v }
                    ] as const}
                    data={results.assumptions.normality.tests.map(t => ({
                      variable: t.variable,
                      statistic: t.statistic,
                      pValue: t.pValue,
                      result: (
                        <Badge variant={t.passed === true ? 'default' : t.passed === false ? 'destructive' : 'secondary'}>
                          {t.passed === true ? '정규' : t.passed === false ? '비정규' : '검정 불가'}
                        </Badge>
                      )
                    }))}
                    bordered
                    compactMode
                  />
                </CardContent>
              </Card>
            )}
          </ContentTabsContent>

          <ContentTabsContent tabId="partial" show={activeResultTab === 'partial'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>편상관계수 결과</CardTitle>
                <CardDescription>
                  통제변수의 영향을 제거한 후의 편상관계수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="편상관계수"
                  columns={[
                    { key: 'variable1', header: '변수 1', type: 'text', align: 'left' },
                    { key: 'variable2', header: '변수 2', type: 'text', align: 'left' },
                    { key: 'partialCorr', header: '편상관계수', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'tStat', header: 't 통계량', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'pValue', header: 'p값', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'df', header: '자유도', type: 'number', align: 'right' },
                    { key: 'strength', header: '강도', type: 'custom', align: 'center', formatter: (v) => v }
                  ] as const}
                  data={results.correlations.map((corr, index) => {
                    const strength = getCorrelationStrength(corr.partial_corr)
                    return {
                      variable1: corr.variable1,
                      variable2: corr.variable2,
                      partialCorr: (
                        <span className={`font-semibold ${strength.color}`}>
                          {corr.partial_corr.toFixed(3)}
                          {corr.p_value < 0.05 && <span className="text-red-500">*</span>}
                        </span>
                      ),
                      tStat: corr.t_stat,
                      pValue: (
                        <span className={corr.p_value < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                          {corr.p_value.toFixed(4)}
                        </span>
                      ),
                      df: corr.df,
                      strength: (
                        <Badge className={`${strength.bgColor} ${strength.color} border-0`}>
                          {strength.level}
                        </Badge>
                      )
                    }
                  })}
                  bordered
                  compactMode
                />
                <p className="text-xs text-gray-500 mt-2">* p &lt; 0.05에서 통계적으로 유의</p>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="comparison" show={activeResultTab === 'comparison'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>편상관 vs 단순상관 비교</CardTitle>
                <CardDescription>
                  통제변수의 영향을 제거하기 전후의 상관계수 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="편상관 vs 단순상관 비교"
                  columns={[
                    { key: 'variablePair', header: '변수 쌍', type: 'text', align: 'left' },
                    { key: 'zeroOrder', header: '단순상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'partial', header: '편상관', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'difference', header: '차이', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'interpretation', header: '해석', type: 'custom', align: 'center', formatter: (v) => v }
                  ] as const}
                  data={results.correlations.map((corr, index) => {
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

                    return {
                      variablePair: `${corr.variable1} - ${corr.variable2}`,
                      zeroOrder: zeroOrder.correlation,
                      partial: corr.partial_corr,
                      difference: (
                        <span className={`font-medium ${changeInterpretation.color}`}>
                          {difference > 0 ? '+' : ''}{difference.toFixed(3)}
                        </span>
                      ),
                      interpretation: (
                        <Badge className={`${changeInterpretation.bg} ${changeInterpretation.color} border-0`}>
                          {changeInterpretation.text}
                        </Badge>
                      )
                    }
                  })}
                  bordered
                  compactMode
                />
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
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
                        <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [isAnalyzing, error, results, selectedVariables, getCorrelationStrength, uploadedData, analysisTimestamp])

  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '편상관분석' }
  ], [])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step) => actions.setCurrentStep(step - 1)}
      analysisTitle="편상관분석"
      analysisSubtitle="Partial Correlation"
      analysisIcon={<Activity className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
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
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
