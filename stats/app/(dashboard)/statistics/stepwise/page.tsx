'use client'

/**
 * 단계적 회귀분석 페이지 - TwoPanelLayout (데이터 하단 배치)
 *
 * Migration: StatisticsPageLayout → TwoPanelLayout
 * - Badge-based variable selection (dependent, factor, covariate)
 * - Critical Bug prevention (Badge clicks don't trigger step change)
 * - Separate analysis button ("다음 단계" triggers step + analysis)
 */

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import type { StepwiseVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, TrendingUp, Target, BarChart3, Plus, Minus, Home, ChartBar ,
  FileText,
  ListOrdered,
  Table,
  Activity,
  MessageSquare
} from 'lucide-react'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'
import { escapeHtml } from '@/lib/utils/html-escape'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'

import { openDataWindow } from '@/lib/utils/open-data-window'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'
interface StepwiseResults {
  finalModel: {
    variables: string[]
    rSquared: number
    adjRSquared: number
    fStatistic: number
    fPValue: number
    aic: number
    bic: number
    rmse: number
  }
  stepHistory: Array<{
    step: number
    action: 'add' | 'remove'
    variable: string
    rSquared: number
    adjRSquared: number
    fChange: number
    fChangeP: number
    criterionValue: number
  }>
  coefficients: Array<{
    variable: string
    coefficient: number
    stdError: number
    tStatistic: number
    pValue: number
    beta: number
    vif: number
  }>
  modelDiagnostics: {
    durbinWatson: number
    jarqueBeraP: number
    breuschPaganP: number
    conditionNumber: number
  }
  excludedVariables: Array<{
    variable: string
    partialCorr: number
    tForInclusion: number
    pValue: number
  }>
  interpretation: {
    summary: string
    recommendations: string[]
  }
}

const STEPS = [
  { id: 1, label: '분석 방법 소개' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '분석 결과' }
]

export default function StepwiseRegressionPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('stepwise-regression')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<StepwiseResults, StepwiseVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'stepwise-regression'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '단계적 회귀분석' }
  ], [])

  // Steps with completed state
  const stepsWithCompleted = useMemo(() => STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? currentStep > 0 :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables :
              step.id === 4 ? !!results : false
  })), [currentStep, uploadedData, selectedVariables, results])

  // Handlers
  const handleDataUpload = useCallback((file: File, data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: file.name, columns })
    }
    actions.setCurrentStep(2)
  }, [actions])

  // Variable selection handlers (Critical Bug prevention: NO setCurrentStep here)
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [], factor: [], covariate: [] }
    const currentDeps = Array.isArray(current.dependent) ? current.dependent : []
    const isSelected = currentDeps.includes(varName)
    const newDeps = isSelected
      ? currentDeps.filter(v => v !== varName)
      : [...currentDeps, varName]

    if (actions.setSelectedVariables) {
      actions.setSelectedVariables({
        dependent: newDeps,
        factor: current.factor || [],
        covariate: current.covariate || []
      })
    }
  }, [selectedVariables, actions])

  const handleFactorSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [], factor: [], covariate: [] }
    const currentFactors = Array.isArray(current.factor) ? current.factor : []
    const isSelected = currentFactors.includes(varName)
    const newFactors = isSelected
      ? currentFactors.filter(v => v !== varName)
      : [...currentFactors, varName]

    if (actions.setSelectedVariables) {
      actions.setSelectedVariables({
        dependent: current.dependent || [],
        factor: newFactors,
        covariate: current.covariate || []
      })
    }
  }, [selectedVariables, actions])

  const handleCovariateSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [], factor: [], covariate: [] }
    const currentCovs = Array.isArray(current.covariate) ? current.covariate : []
    const isSelected = currentCovs.includes(varName)
    const newCovs = isSelected
      ? currentCovs.filter(v => v !== varName)
      : [...currentCovs, varName]

    if (actions.setSelectedVariables) {
      actions.setSelectedVariables({
        dependent: current.dependent || [],
        factor: current.factor || [],
        covariate: newCovs
      })
    }
  }, [selectedVariables, actions])

  const runStepwiseAnalysis = useCallback(async (variables: StepwiseVariables) => {
    if (!uploadedData) return

    // 배열 정규화: string | string[] → string[]
    const dependentVars = Array.isArray(variables.dependent)
      ? variables.dependent
      : [variables.dependent]
    const factorVars = Array.isArray(variables.factor)
      ? variables.factor
      : [variables.factor]

    if (dependentVars.length === 0 || factorVars.length === 0) {
      actions.setError('종속변수와 예측변수가 필요합니다.')
      return
    }

    actions.startAnalysis()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const predictorVars = [...factorVars, ...(variables.covariate || [])]

      const result = await pyodideCore.callWorkerMethod<{
        finalModel: {
          variables: string[]
          rSquared: number
          adjRSquared: number
          fStatistic: number
          fPValue: number
          aic: number
          bic: number
          rmse: number
        }
        stepHistory: Array<{
          step: number
          action: string
          variable: string
          rSquared: number
          adjRSquared: number
          fChange: number
          fChangeP: number
          criterionValue: number
        }>
        coefficients: Array<{
          variable: string
          coefficient: number
          stdError: number
          tStatistic: number
          pValue: number
          beta: number
          vif: number
        }>
        modelDiagnostics: {
          durbinWatson: number
          jarqueBeraP: number
          breuschPaganP: number
          conditionNumber: number
        }
        excludedVariables: Array<{
          variable: string
          partialCorr: number
          tForInclusion: number
          pValue: number
        }>
        interpretation: {
          summary: string
          recommendations: string[]
        }
      }>(PyodideWorker.Hypothesis, 'stepwise_regression_forward', {
        data: uploadedData.data as never,
        dependent_var: dependentVars[0],
        predictor_vars: predictorVars as never,
        significance_level: 0.05
      })

      // Convert camelCase to snake_case for StepwiseResults interface
      const results: StepwiseResults = {
        finalModel: {
          variables: result.finalModel.variables,
          rSquared: result.finalModel.rSquared,
          adjRSquared: result.finalModel.adjRSquared,
          fStatistic: result.finalModel.fStatistic,
          fPValue: result.finalModel.fPValue,
          aic: result.finalModel.aic,
          bic: result.finalModel.bic,
          rmse: result.finalModel.rmse
        },
        stepHistory: result.stepHistory.map(step => ({
          step: step.step,
          action: step.action as 'add' | 'remove',
          variable: step.variable,
          rSquared: step.rSquared,
          adjRSquared: step.adjRSquared,
          fChange: step.fChange,
          fChangeP: step.fChangeP,
          criterionValue: step.criterionValue
        })),
        coefficients: result.coefficients.map(coef => ({
          variable: coef.variable,
          coefficient: coef.coefficient,
          stdError: coef.stdError,
          tStatistic: coef.tStatistic,
          pValue: coef.pValue,
          beta: coef.beta,
          vif: coef.vif
        })),
        modelDiagnostics: {
          durbinWatson: result.modelDiagnostics.durbinWatson,
          jarqueBeraP: result.modelDiagnostics.jarqueBeraP,
          breuschPaganP: result.modelDiagnostics.breuschPaganP,
          conditionNumber: result.modelDiagnostics.conditionNumber
        },
        excludedVariables: result.excludedVariables.map(ev => ({
          variable: ev.variable,
          partialCorr: ev.partialCorr,
          tForInclusion: ev.tForInclusion,
          pValue: ev.pValue
        })),
        interpretation: result.interpretation
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(results, 3)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [actions, uploadedData])

  // "다음 단계" button (triggers step change + analysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || selectedVariables.dependent.length === 0 ||
        !selectedVariables?.factor || selectedVariables.factor.length === 0) {
      actions.setError('종속변수와 독립변수를 각각 최소 1개 이상 선택해주세요.')
      return
    }
    actions.setCurrentStep(3)
    await runStepwiseAnalysis(selectedVariables)
  }, [selectedVariables, actions, runStepwiseAnalysis])

  const getModelFitInterpretation = useCallback((r2: number) => {
    if (r2 >= 0.7) return { level: '우수', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (r2 >= 0.5) return { level: '양호', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (r2 >= 0.3) return { level: '보통', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '낮음', color: 'text-muted-foreground', bg: 'bg-muted' }
  }, [])

  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])

  // Render functions (useCallback)
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">단계적 회귀분석 (Stepwise Regression)</h1>
        <p className="text-lg text-gray-600">통계적 기준에 따라 예측변수를 자동으로 선택하는 회귀분석입니다</p>
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
                최적의 예측변수 조합 자동 선택
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                모델의 예측력과 간결성 균형 유지
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                다중공선성 문제 최소화
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                과적합 방지 및 일반화 성능 향상
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
                <span><strong>예측변수:</strong> 연속형/범주형 변수 (2개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>표본크기:</strong> 변수 수의 10-20배 이상</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>선형관계:</strong> 변수 간 선형 관계 가정</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          단계적 회귀분석은 전진선택, 후진제거, 양방향 방법을 통해
          통계적 유의성과 모델 적합도를 고려하여 최적의 변수 조합을 찾습니다.
          AIC/BIC 정보량 기준을 사용하여 모델의 복잡성과 적합도 사이의 균형을 맞춥니다.
        </AlertDescription>
      </Alert>

      
      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="Analysis Assumptions"
          description="Stepwise Regression assumptions to verify before analysis."
        />
      )}

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions, methodMetadata, assumptionItems])

  const renderResults = useCallback(() => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>단계적 회귀분석을 진행하고 있습니다...</p>
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

    const modelFit = getModelFitInterpretation(results.finalModel.rSquared)

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="단계적 회귀분석"
          analysisSubtitle="Stepwise Regression"
          fileName={uploadedData?.fileName}
          variables={[...(selectedVariables?.dependent || []), ...(selectedVariables?.factor || [])]}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">단계적 회귀분석 결과</h2>
          <p className="text-gray-600">단계별 선택 과정과 최종 회귀모델을 확인하세요</p>
        </div>

        
          <ContentTabs
              tabs={[
                { id: 'summary', label: '모델 요약', icon: FileText },
                { id: 'steps', label: '단계별 과정', icon: ListOrdered },
                { id: 'coefficients', label: '회귀계수', icon: Table },
                { id: 'diagnostics', label: '모델 진단', icon: Activity },
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
                <CardTitle>최종 모델 요약</CardTitle>
                <CardDescription>
                  단계적 선택을 통해 도출된 최종 회귀모델의 적합도 지표
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className={`text-center p-4 border rounded-lg ${modelFit.bg}`}>
                      <div className="text-3xl font-bold text-muted-foreground mb-2">
                        {results.finalModel.rSquared.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">R² (결정계수)</div>
                      <Badge className={`${modelFit.color} bg-opacity-20`}>
                        {modelFit.level}
                      </Badge>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {results.finalModel.adjRSquared.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-600">수정된 R²</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">선택된 변수</span>
                      <span className="font-semibold">{results.finalModel.variables.length}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">F 통계량</span>
                      <span className="font-semibold">{results.finalModel.fStatistic.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">F p값</span>
                      <span className={`font-semibold ${results.finalModel.fPValue < 0.05 ? 'text-muted-foreground' : ''}`}>
                        {results.finalModel.fPValue.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">AIC</span>
                      <span className="font-semibold">{results.finalModel.aic.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">BIC</span>
                      <span className="font-semibold">{results.finalModel.bic.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RMSE</span>
                      <span className="font-semibold">{results.finalModel.rmse.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {results.finalModel.variables.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">선택된 변수</h4>
                    <div className="flex flex-wrap gap-1">
                      {results.finalModel.variables.map((variable, index) => (
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

          <ContentTabsContent tabId="steps" show={activeResultTab === 'steps'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>단계별 선택 과정</CardTitle>
                <CardDescription>
                  각 단계에서 변수 추가/제거 과정과 모델 적합도 변화
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.stepHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">단계</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">행동</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">R²</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">수정된 R²</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">F 변화</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">AIC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.stepHistory.map((step, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{step.step}</td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Badge className={step.action === 'add' ? 'bg-muted ' : 'bg-muted '}>
                                {step.action === 'add' ? (
                                  <><Plus className="h-3 w-3 mr-1" />추가</>
                                ) : (
                                  <><Minus className="h-3 w-3 mr-1" />제거</>
                                )}
                              </Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{step.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.rSquared.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.adjRSquared.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.fChange.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={step.fChangeP < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {step.fChangeP.toFixed(4)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.criterionValue.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      선택된 변수가 없습니다. 유의수준 기준을 조정하거나 다른 변수를 고려해보세요.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="coefficients" show={activeResultTab === 'coefficients'} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>회귀계수</CardTitle>
                <CardDescription>
                  최종 모델에 포함된 변수들의 회귀계수와 통계량
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.coefficients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">계수 (B)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준화 계수 (β)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">t 값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">VIF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.coefficients.map((coef, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{coef.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.coefficient.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.stdError.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {coef.variable === '상수' ? '-' : coef.beta.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.tStatistic.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={coef.pValue < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {coef.pValue.toFixed(4)}
                                {coef.pValue < 0.05 && <span className="ml-1">*</span>}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {coef.variable === '상수' ? '-' : (
                                <span className={coef.vif > 10 ? 'text-muted-foreground font-medium' : ''}>
                                  {coef.vif.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">* p &lt; 0.05에서 통계적으로 유의</p>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      선택된 변수가 없어 회귀계수를 표시할 수 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {results.excludedVariables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>제외된 변수</CardTitle>
                  <CardDescription>
                    최종 모델에서 제외된 변수들의 통계량
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">편상관</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">t 값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.excludedVariables.map((variable, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{variable.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.partialCorr.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.tForInclusion.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.pValue.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </ContentTabsContent>

          <ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="space-y-4">
            <AssumptionTestCard
              title="모델 진단"
              testType="stepwise-regression"
              tests={[
                {
                  name: '자기상관성 (Durbin-Watson)',
                  testName: 'Durbin-Watson',
                  pValue: null,
                  statistic: results.modelDiagnostics.durbinWatson,
                  passed: Math.abs(results.modelDiagnostics.durbinWatson - 2) < 0.5,
                  description: '잔차의 자기상관을 검정합니다. 값이 2에 가까울수록 자기상관이 없습니다.',
                  details: `DW = ${results.modelDiagnostics.durbinWatson.toFixed(3)} (이상값: 2)`,
                  recommendation: '자기상관이 있으면 시계열 모델이나 Newey-West 표준오차를 고려하세요.',
                  severity: Math.abs(results.modelDiagnostics.durbinWatson - 2) < 0.5 ? 'low' : 'medium'
                },
                {
                  name: '잔차 정규성 (Jarque-Bera)',
                  testName: 'Jarque-Bera',
                  pValue: results.modelDiagnostics.jarqueBeraP,
                  statistic: undefined,
                  passed: results.modelDiagnostics.jarqueBeraP > 0.05,
                  description: '잔차가 정규분포를 따르는지 검정합니다.',
                  details: `p = ${results.modelDiagnostics.jarqueBeraP.toFixed(4)}`,
                  recommendation: '정규성이 위배되면 부트스트랩이나 비모수 방법을 고려하세요.',
                  severity: results.modelDiagnostics.jarqueBeraP > 0.05 ? 'low' : 'medium'
                },
                {
                  name: '등분산성 (Breusch-Pagan)',
                  testName: 'Breusch-Pagan',
                  pValue: results.modelDiagnostics.breuschPaganP,
                  statistic: undefined,
                  passed: results.modelDiagnostics.breuschPaganP > 0.05,
                  description: '잔차의 분산이 일정한지 검정합니다.',
                  details: `p = ${results.modelDiagnostics.breuschPaganP.toFixed(4)}`,
                  recommendation: '이분산이 있으면 가중최소제곱법(WLS)이나 robust 표준오차를 사용하세요.',
                  severity: results.modelDiagnostics.breuschPaganP > 0.05 ? 'low' : 'medium'
                },
                {
                  name: '다중공선성 (조건수)',
                  testName: 'Condition Number',
                  pValue: null,
                  statistic: results.modelDiagnostics.conditionNumber,
                  passed: results.modelDiagnostics.conditionNumber < 30,
                  description: '예측변수 간 다중공선성을 검정합니다. 조건수 < 30이 권장됩니다.',
                  details: `조건수 = ${results.modelDiagnostics.conditionNumber.toFixed(1)}`,
                  recommendation: '다중공선성이 높으면 변수 제거나 릿지 회귀를 고려하세요.',
                  severity: results.modelDiagnostics.conditionNumber < 30 ? 'low' : results.modelDiagnostics.conditionNumber < 100 ? 'medium' : 'high'
                }
              ]}
            />
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-4">
            <ResultInterpretation
              result={{
                summary: results.interpretation.summary,
                details: `최종 모델: R² = ${results.finalModel.rSquared.toFixed(4)}, 수정 R² = ${results.finalModel.adjRSquared.toFixed(4)}, F = ${results.finalModel.fStatistic.toFixed(2)}, p = ${results.finalModel.fPValue.toFixed(4)}. 선택된 변수 ${results.finalModel.variables.length}개.`,
                recommendation: results.interpretation.recommendations.join(' '),
                caution: (() => {
                  const warnings: string[] = []
                  if (Math.abs(results.modelDiagnostics.durbinWatson - 2) >= 0.5) {
                    warnings.push('자기상관 문제가 의심됩니다.')
                  }
                  if (results.modelDiagnostics.jarqueBeraP <= 0.05) {
                    warnings.push('잔차의 정규성 가정이 위배될 수 있습니다.')
                  }
                  if (results.modelDiagnostics.breuschPaganP <= 0.05) {
                    warnings.push('등분산성 가정이 위배될 수 있습니다.')
                  }
                  if (results.modelDiagnostics.conditionNumber >= 30) {
                    warnings.push('다중공선성 문제가 있습니다.')
                  }
                  if (results.coefficients.some(c => c.variable !== '상수' && c.vif > 10)) {
                    warnings.push('일부 변수의 VIF가 10을 초과합니다.')
                  }
                  return warnings.length > 0
                    ? warnings.join(' ') + ' 교차검증으로 일반화 성능을 확인하세요.'
                    : '단계적 회귀는 데이터 의존적입니다. 교차검증을 통해 모델의 일반화 성능을 확인하세요.'
                })()
              }}
              title="단계적 회귀분석 결과 해석"
            />
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [isAnalyzing, error, results, getModelFitInterpretation, uploadedData, selectedVariables, analysisTimestamp])

  // Type-safe onStepChange handler
  const handleStepChange = useCallback((step: number) => {
    actions.setCurrentStep(step)
  }, [actions])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={handleStepChange}
      analysisTitle="단계적 회귀분석"
      analysisSubtitle="Stepwise Regression"
      analysisIcon={<TrendingUp className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        onOpenNewWindow: handleOpenNewWindow
      } : undefined}
    >
      {/* Step 0: 분석 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              단계적 회귀분석할 데이터 파일을 업로드하세요
            </p>
          </div>

          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={() => actions.setCurrentStep(2)}
            canGoNext={!!uploadedData}
          />

          {/* 업로드된 데이터 미리보기 */}
          {uploadedData && (
            <DataPreviewPanel
              data={uploadedData.data}
              fileName={uploadedData.fileName}
              defaultExpanded={true}
              onOpenNewWindow={handleOpenNewWindow}
            />
          )}
        </div>
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              종속변수, 독립변수(factor), 공변량(선택)을 지정하세요
            </p>
          </div>

          <div className="space-y-4">
            {/* 종속변수 선택 (numeric, multi-select, at least 1) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">종속변수 (Dependent Variable)</Label>
              <p className="text-xs text-muted-foreground">연속형 변수를 1개 이상 선택하세요</p>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const isSelected = selectedVariables?.dependent?.includes(header) || false
                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleDependentSelect(header)}
                    >
                      {header}
                      {isSelected && (
                        <CheckCircle2 className="ml-1 h-3 w-3 flex-shrink-0" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* 독립변수 선택 (factor, multi-select, at least 1) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">독립변수 (Factor Variables)</Label>
              <p className="text-xs text-muted-foreground">예측변수 후보를 2개 이상 선택하세요</p>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const isSelected = selectedVariables?.factor?.includes(header) || false
                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleFactorSelect(header)}
                    >
                      {header}
                      {isSelected && (
                        <CheckCircle2 className="ml-1 h-3 w-3 flex-shrink-0" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* 공변량 선택 (covariate, optional multi-select) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">공변량 (Covariate, 선택 사항)</Label>
              <p className="text-xs text-muted-foreground">추가 예측변수가 있다면 선택하세요 (선택 사항)</p>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const isSelected = selectedVariables?.covariate?.includes(header) || false
                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleCovariateSelect(header)}
                    >
                      {header}
                      {isSelected && (
                        <CheckCircle2 className="ml-1 h-3 w-3 flex-shrink-0" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 다음 단계 버튼 (Critical Bug prevention: triggers step + analysis) */}
          <div className="flex gap-3">
            <Button
              onClick={handleNextStep}
              disabled={isAnalyzing ||
                !selectedVariables?.dependent || selectedVariables.dependent.length === 0 ||
                !selectedVariables?.factor || selectedVariables.factor.length === 0
              }
              size="lg"
              className="flex-1 md:flex-none md:w-auto shadow-lg"
            >
              {isAnalyzing ? '분석 중...' : '다음 단계 (분석 실행)'}
            </Button>
          </div>

          {/* 업로드된 데이터 미리보기 */}
          <DataPreviewPanel
            data={uploadedData.data}
            fileName={uploadedData.fileName}
            defaultExpanded={true}
            onOpenNewWindow={handleOpenNewWindow}
          />
        </div>
      )}

      {/* Step 3: 분석 결과 */}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
