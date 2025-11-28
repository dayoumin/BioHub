'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { WilcoxonVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  GitBranch,
  AlertCircle
,
  Table,
  MessageSquare,
  LineChart
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

import type { UploadedData } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { extractRowValue } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface WilcoxonResult {
  statistic: number
  pValue: number
  nobs: number
  zScore: number
  medianDiff: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    before: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    after: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    differences: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
      positive: number
      negative: number
      ties: number
    }
  }
  interpretation?: {
    summary: string
    comparison: string
    recommendations: string[]
  }
}

export default function WilcoxonPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('wilcoxon')
  }, [])

  const { state, actions } = useStatisticsPage<WilcoxonResult, WilcoxonVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('statistics')

  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: currentStep > index || (currentStep === 3 && analysisResult !== null)
    }))
  }, [currentStep, analysisResult])

  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: 'Wilcoxon 검정' }
  ], [])

  const runAnalysis = useCallback(async (variables: WilcoxonVariables) => {
    if (!uploadedData || !variables.dependent || variables.dependent.length !== 2) {
      actions.setError('분석을 실행할 수 없습니다. 사전-사후 두 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      const pyodideCore = PyodideCoreService.getInstance()

      const var1Name = variables.dependent[0]
      const var2Name = variables.dependent[1]

      const values1: number[] = []
      const values2: number[] = []

      for (const row of uploadedData.data) {
        const val1 = extractRowValue(row, var1Name)
        const val2 = extractRowValue(row, var2Name)

        if (val1 !== null && val2 !== null) {
          values1.push(val1)
          values2.push(val2)
        }
      }

      if (values1.length < 2) {
        actions.setError('유효한 대응표본 데이터가 부족합니다 (최소 2쌍 필요).')
        return
      }

      const result = await pyodideCore.callWorkerMethod<WilcoxonResult>(
        PyodideWorker.NonparametricAnova,
        'wilcoxon_test',
        { values1, values2 }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(result, 3)
    } catch (err) {
      console.error('Wilcoxon 부호순위 검정 실패:', err)
      actions.setError(err instanceof Error ? err.message : 'Wilcoxon 부호순위 검정 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  const handleDataUpload = useCallback(
    createDataUploadHandler(
      actions?.setUploadedData,
      () => {
        if (!actions) return
        actions.setCurrentStep(1)
      },
      'wilcoxon'
    ),
    [actions]
  )

  const handleAnalysis = useCallback(() => {
    if (!selectedVariables || !actions) return
    actions.setCurrentStep(3)
    runAnalysis(selectedVariables)
  }, [selectedVariables, actions, runAnalysis])

  // Badge 기반 변수 선택 핸들러
  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [] }
    const currentVars = Array.isArray(current.dependent) ? current.dependent : []

    const isSelected = currentVars.includes(varName)
    let newVars: string[]

    if (isSelected) {
      // 선택 해제
      newVars = currentVars.filter((v: string) => v !== varName)
    } else {
      // 정확히 2개만 선택 가능
      if (currentVars.length >= 2) {
        newVars = [currentVars[1], varName] // 첫 번째 제거, 새 변수 추가
      } else {
        newVars = [...currentVars, varName]
      }
    }

    actions.setSelectedVariables?.({ dependent: newVars })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

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
        <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wilcoxon 부호순위 검정</h1>
        <p className="text-lg text-gray-600">대응표본의 중위수 차이를 비모수적으로 검정</p>
      </div>

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
              동일한 개체에서 두 시점의 측정값 차이를 비모수적으로 검정합니다.
            </p>
            <ul className="text-sm space-y-1">
              <li>• 사전-사후 측정 비교</li>
              <li>• 중재/처치 효과 검정</li>
              <li>• 정규분포 가정 불필요</li>
              <li>• 소표본에서도 강건</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              vs 대응표본 t-검정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">Wilcoxon 검정</h4>
                <p className="text-muted-foreground">비모수, 순위 기반, 강건</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">대응표본 t-검정</h4>
                <p className="text-muted-foreground">모수, 차이의 정규분포 가정</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertTitle>언제 사용하나요?</AlertTitle>
        <AlertDescription>
          • 차이값이 정규분포를 따르지 않을 때<br/>
          • 이상치가 포함된 대응표본 데이터<br/>
          • 서열척도 측정값의 변화 분석<br/>
          • 소표본 크기의 사전-사후 비교
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'number'
    })

    const selectedVars = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent
      : []

    const canProceed = selectedVars.length === 2

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">변수 선택</h2>
          <p className="text-gray-600">사전-사후 측정 변수를 2개 선택하세요</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            • 종속변수 1: 사전 측정값 (예: before_score)<br/>
            • 종속변수 2: 사후 측정값 (예: after_score)<br/>
            • 동일한 척도로 측정된 두 변수를 선택해주세요
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>대응표본 변수 선택</CardTitle>
            <CardDescription>
              사전-사후 측정을 나타내는 연속형 변수를 2개 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col: string) => {
                const isSelected = selectedVars.includes(col)
                const index = selectedVars.indexOf(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleVariableSelect(col)}
                  >
                    {col}
                    {isSelected && (
                      <span className="ml-1">
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                        {index === 0 ? '(사전)' : '(사후)'}
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
            {selectedVars.length > 0 && (
              <div className="mt-3 p-2 bg-muted rounded text-sm">
                <span className="font-medium">선택된 변수: </span>
                {selectedVars.length >= 1 && `사전: ${selectedVars[0]}`}
                {selectedVars.length === 2 && ` / 사후: ${selectedVars[1]}`}
              </div>
            )}
          </CardContent>
        </Card>

        {!canProceed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              정확히 2개의 변수를 선택해야 합니다 (사전 + 사후).
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
            <p>Wilcoxon 부호순위 검정을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!analysisResult) return null

    // Get variable names for context header (WilcoxonVariables uses dependent: string[])
    const usedVariables = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent
      : selectedVariables?.dependent ? [selectedVariables.dependent] : []

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Wilcoxon 부호순위 검정"
          analysisSubtitle="Wilcoxon Signed-Rank Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wilcoxon 부호순위 검정 결과</h2>
          <p className="text-gray-600">대응표본 비모수 검정 결과</p>
        </div>

        {/* 주요 결과 카드 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {analysisResult.statistic.toFixed(1)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">W 통계량</p>
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
                <div className="text-3xl font-bold text-muted-foreground">
                  {analysisResult.effectSize.value.toFixed(3)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">효과크기 (r)</p>
                <Badge variant="outline" className="mt-1">
                  {analysisResult.effectSize.interpretation}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 결과 탭 */}
        <ContentTabs
              tabs={[
                { id: 'statistics', label: '통계량', icon: Calculator },
                { id: 'descriptives', label: '기술통계', icon: Table },
                { id: 'interpretation', label: '해석', icon: MessageSquare },
                { id: 'visualization', label: '시각화', icon: LineChart }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">
          

          <ContentTabsContent tabId="statistics" show={activeResultTab === 'statistics'}>
            <Card>
              <CardHeader>
                <CardTitle>Wilcoxon 부호순위 검정 통계량</CardTitle>
                <CardDescription>순위합과 검정통계량 결과</CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="Wilcoxon 검정 통계량"
                  description="W 통계량과 검정 결과"
                  columns={[
                    { key: 'name', header: '통계량', type: 'text', align: 'left' },
                    { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'description', header: '설명', type: 'text', align: 'center' }
                  ]}
                  data={[
                    { name: 'W 통계량', value: analysisResult.statistic.toFixed(1), description: '부호순위합' },
                    { name: 'Z 점수', value: analysisResult.zScore.toFixed(4), description: '표준화된 검정통계량' },
                    { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '양측 검정' },
                    { name: '유효 표본 수', value: analysisResult.nobs, description: '동점 제외' },
                    { name: '중위수 차이', value: `${analysisResult.medianDiff > 0 ? '+' : ''}${analysisResult.medianDiff.toFixed(3)}`, description: '사후 - 사전' }
                  ]}
                  bordered
                  compactMode
                />
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="descriptives" show={activeResultTab === 'descriptives'}>
            <Card>
              <CardHeader>
                <CardTitle>사전-사후 기술통계량</CardTitle>
                <CardDescription>각 시점의 중심경향성과 변화량</CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="사전-사후 기술통계량"
                  columns={[
                    { key: 'timepoint', header: '시점', type: 'text', align: 'left' },
                    { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                    { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                    { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                    { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                    { key: 'iqr', header: 'IQR', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                    { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                  ]}
                  data={[
                    {
                      timepoint: '사전',
                      median: analysisResult.descriptives.before.median,
                      mean: analysisResult.descriptives.before.mean,
                      q1: analysisResult.descriptives.before.q1,
                      q3: analysisResult.descriptives.before.q3,
                      iqr: analysisResult.descriptives.before.iqr,
                      range: `${analysisResult.descriptives.before.min.toFixed(2)} - ${analysisResult.descriptives.before.max.toFixed(2)}`
                    },
                    {
                      timepoint: '사후',
                      median: analysisResult.descriptives.after.median,
                      mean: analysisResult.descriptives.after.mean,
                      q1: analysisResult.descriptives.after.q1,
                      q3: analysisResult.descriptives.after.q3,
                      iqr: analysisResult.descriptives.after.iqr,
                      range: `${analysisResult.descriptives.after.min.toFixed(2)} - ${analysisResult.descriptives.after.max.toFixed(2)}`
                    }
                  ]}
                  bordered
                  compactMode
                />

                <div className="mt-6 grid md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-muted-foreground">
                          {analysisResult.descriptives.differences.positive}
                        </div>
                        <p className="text-sm text-muted-foreground">증가한 사례</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-muted-foreground">
                          {analysisResult.descriptives.differences.negative}
                        </div>
                        <p className="text-sm text-muted-foreground">감소한 사례</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {analysisResult.descriptives.differences.ties}
                        </div>
                        <p className="text-sm text-muted-foreground">동일한 사례</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
                <CardDescription>Wilcoxon 부호순위 검정 결과 해석 및 권장사항</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.interpretation && (
                  <>
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>분석 결과 요약</AlertTitle>
                      <AlertDescription>
                        {analysisResult.interpretation.summary}
                      </AlertDescription>
                    </Alert>

                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>변화 분석</AlertTitle>
                      <AlertDescription>
                        {analysisResult.interpretation.comparison}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <h4 className="font-medium">권장사항</h4>
                      <ul className="space-y-2">
                        {analysisResult.interpretation.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="visualization" show={activeResultTab === 'visualization'}>
            <Card>
              <CardHeader>
                <CardTitle>데이터 시각화</CardTitle>
                <CardDescription>사전-사후 변화 시각화</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  📊 사전-사후 비교 차트 및 변화량 분포는 추후 구현 예정입니다
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
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
            <Button onClick={() => actions.setCurrentStep(0)}>
              새로운 분석
            </Button>
          </div>
        </div>
      </div>
    )
  }, [isAnalyzing, error, analysisResult, actions, uploadedData, selectedVariables])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step) => actions.setCurrentStep(step - 1)}
      analysisTitle="Wilcoxon 검정"
      analysisSubtitle="Wilcoxon Signed-Rank Test"
      analysisIcon={<GitBranch className="h-5 w-5 text-primary" />}
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
