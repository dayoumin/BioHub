'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { MANOVAVariables } from '@/types/statistics'
import { toMANOVAVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
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
  Settings,
  Layers3
,
  Grid3X3,
  Table,
  GitBranch,
  Shield,
  MessageSquare
} from 'lucide-react'

// Components
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ManovaResult {
  overallTests: {
    test: string
    statistic: number
    approximate_f: number
    numerator_df: number
    denominator_df: number
    pValue: number
  }[]
  univariateTests: {
    variable: string
    sumSquares: number
    degreesOfFreedom: number
    meanSquare: number
    fStatistic: number
    pValue: number
    etaSquared: number
    observedPower: number
  }[]
  canonicalAnalysis: {
    eigenvalue: number
    canonicalCorrelation: number
    wilksLambda: number
    fStatistic: number
    pValue: number
    proportionOfVariance: number
  }[]
  discriminantFunctions: {
    function: number
    coefficients: { variable: string, coefficient: number }[]
    groupCentroids: { group: string, centroid: number }[]
  }[]
  descriptiveStats: {
    group: string
    variable: string
    n: number
    mean: number
    std: number
    se: number
    ci95Lower: number
    ci95Upper: number
  }[]
  postHoc: {
    variable: string
    comparison: string
    meanDiff: number
    standardError: number
    tValue: number
    pValue: number
    adjustedPValue: number
    cohensD: number
    lowerCI: number
    upperCI: number
  }[]
  assumptions: {
    multivariateNormality: {
      test: string
      statistic: number
      pValue: number
      assumptionMet: boolean
    }
    homogeneityOfCovariance: {
      boxM: number
      fStatistic: number
      pValue: number
      assumptionMet: boolean
    }
    sphericity: {
      mauchlysW: number
      pValue: number
      assumptionMet: boolean
      epsilonGG: number
      epsilonHF: number
    } | null
    outliers: {
      multivariate: {
        observation: number
        mahalanobisDistance: number
        pValue: number
        isOutlier: boolean
      }[]
    }
  }
  modelFit: {
    pillaiTrace: number
    wilksLambda: number
    hotellingTrace: number
    royMaxRoot: number
    rSquaredMultivariate: number
    effectSize: number
  }
  interpretation: {
    summary: string
    overallEffect: string
    univariateEffects: string[]
    discriminantInterpretation: string
    recommendations: string[]
  }
}

export default function ManovaPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('manova')
  }, [])

  const { state, actions } = useStatisticsPage<ManovaResult, MANOVAVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables: _selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Pyodide ready state
  const [pyodideReady, setPyodideReady] = useState(false)
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('multivariate')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '다변량 분산분석', href: '/statistics/manova' }
  ], [])

  // STEPS (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '변수 선택', completed: currentStep > 2 },
    { id: 3, label: '결과 확인', completed: currentStep > 3 }
  ], [currentStep])

  // Initialize PyodideCore
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideCore = PyodideCoreService.getInstance()
        await pyodideCore.initialize()
        setPyodideReady(true)
      } catch (err) {
        console.error('PyodideCore 초기화 실패:', err)
      }
    }
    initPyodide()
  }, [])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'manova'
  )

  const runAnalysis = useCallback(async (variables: MANOVAVariables) => {
    if (!pyodideReady || !uploadedData) {
      actions.setError?.('데이터나 통계 엔진이 준비되지 않았습니다.')
      return
    }

    actions.startAnalysis()

    try {
      const pyodideCore = PyodideCoreService.getInstance()

      // Call Worker 2 manova method
      const workerResult = await pyodideCore.callWorkerMethod<ManovaResult>(
        PyodideWorker.Hypothesis,
        'manova',
        {
          dependent_vars: variables.dependent,
          factor_vars: variables.factor,
          data: uploadedData.data as never
        }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(workerResult, 3)
    } catch (err) {
      console.error('MANOVA 분석 실패:', err)
      actions.setError?.('MANOVA 분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, pyodideReady, actions])


  const handleVariableSelection = createVariableSelectionHandler<MANOVAVariables>(
    (vars) => actions.setSelectedVariables?.(vars ? toMANOVAVariables(vars as unknown as VariableAssignment) : null),
    (variables) => {
      if (variables.dependent && variables.factor &&
          variables.dependent.length >= 2 && variables.factor.length >= 1) {
        runAnalysis(variables)
      }
    },
    'manova'
  )

  const getEffectSizeInterpretation = useCallback((etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '효과 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }, [])

  const _getCohensInterpretation = useCallback((d: number) => {
    const absD = Math.abs(d)
    if (absD >= 0.8) return '큰 효과'
    if (absD >= 0.5) return '중간 효과'
    if (absD >= 0.2) return '작은 효과'
    return '효과 없음'
  }, [])

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
              여러 종속변수에 대한 집단 간 차이를 동시에 검정하여 1종 오류를 통제합니다.
            </p>
            <ul className="text-sm space-y-1">
              <li>• 다변량 검정으로 전체적 차이 확인</li>
              <li>• 종속변수별 단변량 F 검정</li>
              <li>• 정준 판별분석으로 차이 패턴 파악</li>
              <li>• 다변량 효과크기 계산</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              적용 예시
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">교육 연구</h4>
                <p className="text-muted-foreground">학습법이 수학, 국어, 과학 성취도에 미치는 효과</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">심리 연구</h4>
                <p className="text-muted-foreground">치료법이 불안, 우울, 스트레스에 미치는 영향</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">의학 연구</h4>
                <p className="text-muted-foreground">약물이 혈압, 콜레스테롤, 혈당에 미치는 효과</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertTitle>ANOVA vs MANOVA</AlertTitle>
        <AlertDescription>
          • ANOVA: 종속변수 1개, 독립변수 1개 이상<br/>
          • MANOVA: 종속변수 2개 이상, 독립변수 1개 이상<br/>
          • MANOVA 장점: 1종 오류 통제, 종속변수 간 상관 고려<br/>
          • 다변량 효과가 유의하면 단변량 분석 실시
        </AlertDescription>
      </Alert>

      <div className="p-4 bg-muted border border rounded-lg">
        <h4 className="font-medium mb-2">다변량 검정 통계량</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Pillai&apos;s Trace:</strong> 가장 보수적, 가정 위반에 강함</li>
          <li>• <strong>Wilks&apos; Lambda:</strong> 가장 일반적, 검정력 높음</li>
          <li>• <strong>Hotelling&apos;s Trace:</strong> 표본 크기가 클 때 유용</li>
          <li>• <strong>Roy&apos;s Max Root:</strong> 가장 자유롭지만 가정에 민감</li>
        </ul>
      </div>
    </div>
  ), [])

  const renderDataUpload = useCallback(() => (
    <div className="space-y-6">
      <DataUploadStep
        onUploadComplete={handleDataUpload}
      />

      <Alert>
        <Layers3 className="h-4 w-4" />
        <AlertTitle>MANOVA 데이터 형식</AlertTitle>
        <AlertDescription>
          • 각 행은 하나의 관측값을 나타냅니다<br/>
          • 종속변수들: 연속형 변수 2개 이상 (예: 수학점수, 국어점수, 과학점수)<br/>
          • 독립변수: 범주형 변수 1개 이상 (예: 집단, 처치조건)<br/>
          • 종속변수들 간에는 상관관계가 있어야 효과적<br/>
          • 각 집단에 충분한 표본 수 필요 (최소 20개 이상 권장)
        </AlertDescription>
      </Alert>
    </div>
  ), [handleDataUpload])

  const renderVariableSelection = useCallback(() => (
    <div className="space-y-6">
      <VariableSelectorModern
        methodId="manova"
        data={uploadedData?.data ?? []}
        onVariablesSelected={handleVariableSelection}
        onBack={() => actions.setCurrentStep?.(1)}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>변수 선택 가이드</AlertTitle>
        <AlertDescription>
          • 종속변수: 분석하고자 하는 연속형 결과 변수들 (2개 이상)<br/>
          • 독립변수: 집단을 구분하는 범주형 변수 (1개 이상)<br/>
          • 종속변수들은 서로 상관이 있어야 MANOVA가 효과적<br/>
          • 예: 종속변수(수학, 국어, 과학점수), 독립변수(학습법)
        </AlertDescription>
      </Alert>
    </div>
  ), [uploadedData, handleVariableSelection, actions])

  const renderResults = useCallback(() => {
    if (!analysisResult) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">분석 결과가 없습니다. 변수를 선택하고 분석을 실행하세요.</p>
        </div>
      )
    }

    // Build variables list
    const usedVariables = [
      ...(Array.isArray(_selectedVariables?.dependent) ? _selectedVariables.dependent : []),
      ...(Array.isArray(_selectedVariables?.factor) ? _selectedVariables.factor : [])
    ]

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="다변량 분산분석"
          analysisSubtitle="Multivariate Analysis of Variance (MANOVA)"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />
        <Card>
          <CardHeader>
            <CardTitle>MANOVA 분석 결과</CardTitle>
            <CardDescription>다변량 검정, 단변량 검정, 판별분석 결과</CardDescription>
          </CardHeader>
          <CardContent>
            
              <ContentTabs
              tabs={[
                { id: 'multivariate', label: '다변량 검정', icon: Grid3X3 },
                { id: 'univariate', label: '단변량 검정', icon: BarChart3 },
                { id: 'posthoc', label: '사후검정', icon: Activity },
                { id: 'descriptives', label: '기술통계', icon: Table },
                { id: 'discriminant', label: '판별분석', icon: GitBranch },
                { id: 'assumptions', label: '가정검정', icon: Shield },
                { id: 'interpretation', label: '해석', icon: MessageSquare }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

              {/* 다변량 검정 탭 */}
              <ContentTabsContent tabId="multivariate" show={activeResultTab === 'multivariate'} className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers3 className="w-5 h-5" />
                      다변량 검정 결과
                    </CardTitle>
                    <CardDescription>4가지 다변량 검정 통계량</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StatisticsTable
                      title="다변량 검정 통계량"
                      columns={[
                        { key: 'test', header: '검정', type: 'text', align: 'left' },
                        { key: 'statistic', header: '통계량', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                        { key: 'approximateF', header: '근사 F', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'df', header: '자유도', type: 'custom', align: 'center', formatter: (v: string) => v },
                        { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                        { key: 'interpretation', header: '해석', type: 'custom', align: 'center', formatter: (v) => v }
                      ]}
                      data={analysisResult.overallTests.map(test => ({
                        test: test.test,
                        statistic: test.statistic,
                        approximateF: test.approximate_f,
                        df: `${test.numerator_df}, ${test.denominator_df}`,
                        pValue: <PValueBadge value={test.pValue} />,
                        interpretation: (
                          <Badge variant={test.pValue < 0.05 ? "default" : "outline"}>
                            {test.pValue < 0.05 ? "유의함" : "유의하지 않음"}
                          </Badge>
                        )
                      }))}
                      bordered
                      compactMode
                    />

                    <Alert className="mt-4">
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>다변량 검정 해석</AlertTitle>
                      <AlertDescription>
                        모든 다변량 검정에서 유의한 결과를 보입니다 (p &lt; 0.001).
                        Wilks&apos; Lambda = {analysisResult.overallTests[1].statistic.toFixed(3)}로,
                        집단 간 다변량 차이가 존재함을 의미합니다.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* 모델 적합도 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      다변량 효과크기
                    </CardTitle>
                    <CardDescription>전체 모델의 설명력</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">다변량 R²</h4>
                          <p className="text-2xl font-bold">
                            {(analysisResult.modelFit.rSquaredMultivariate * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            전체 다변량 변동의 설명 비율
                          </p>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">효과크기 (d)</h4>
                          <p className="text-2xl font-bold">
                            {analysisResult.modelFit.effectSize.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cohen의 다변량 효과크기
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-800 mb-3">검정 통계량 요약</h4>
                          <div className="space-y-2 text-sm">
                            <p>Pillai&apos;s Trace: {analysisResult.modelFit.pillaiTrace.toFixed(3)}</p>
                            <p>Wilks&apos; Lambda: {analysisResult.modelFit.wilksLambda.toFixed(3)}</p>
                            <p>Hotelling&apos;s Trace: {analysisResult.modelFit.hotellingTrace.toFixed(3)}</p>
                            <p>Roy&apos;s Max Root: {analysisResult.modelFit.royMaxRoot.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ContentTabsContent>

              {/* 단변량 검정 탭 */}
              <ContentTabsContent tabId="univariate" show={activeResultTab === 'univariate'} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      단변량 F 검정
                    </CardTitle>
                    <CardDescription>각 종속변수별 ANOVA 결과</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StatisticsTable
                      title="일변량 ANOVA 결과"
                      columns={[
                        { key: 'variable', header: '종속변수', type: 'text', align: 'left' },
                        { key: 'sumSquares', header: '제곱합', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'df', header: '자유도', type: 'number', align: 'center' },
                        { key: 'meanSquare', header: '평균제곱', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'fStatistic', header: 'F', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                        { key: 'etaSquared', header: 'η²', type: 'custom', align: 'center', formatter: (v) => v },
                        { key: 'power', header: '검정력', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) }
                      ]}
                      data={analysisResult.univariateTests.map(test => {
                        const effectSize = getEffectSizeInterpretation(test.etaSquared)
                        return {
                          variable: test.variable,
                          sumSquares: test.sumSquares,
                          df: test.degreesOfFreedom,
                          meanSquare: test.meanSquare,
                          fStatistic: test.fStatistic,
                          pValue: <PValueBadge value={test.pValue} />,
                          etaSquared: (
                            <Badge variant="outline" className={`${effectSize.color} ${effectSize.bg}`}>
                              {test.etaSquared.toFixed(3)}
                            </Badge>
                          ),
                          power: test.observedPower
                        }
                      })}
                      bordered
                      compactMode
                    />

                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertTitle>단변량 검정 해석</AlertTitle>
                      <AlertDescription>
                        각 종속변수별로 집단 간 차이를 검정합니다.
                        η² (에타제곱)는 각 변수에서 집단 변수가 설명하는 분산 비율입니다.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </ContentTabsContent>

              {/* 사후검정 탭 */}
              <ContentTabsContent tabId="posthoc" show={activeResultTab === 'posthoc'} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      사후검정 (Post-hoc Analysis)
                    </CardTitle>
                    <CardDescription>유의한 종속변수에 대한 집단 간 쌍별 비교</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analysisResult.postHoc && analysisResult.postHoc.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline">Bonferroni correction</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({analysisResult.postHoc.length}개 비교)
                          </span>
                        </div>
                        <StatisticsTable
                          title="쌍별 비교 결과"
                          columns={[
                            { key: 'variable', header: '종속변수', type: 'text', align: 'left' },
                            { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                            { key: 'meanDiff', header: '평균차이', type: 'number', align: 'center', formatter: (v: number) => v.toFixed(3) },
                            { key: 'tValue', header: 't-값', type: 'number', align: 'center', formatter: (v: number) => v.toFixed(3) },
                            { key: 'pValue', header: 'p-값', type: 'custom', align: 'center', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                            { key: 'adjustedPValue', header: '보정 p-값', type: 'custom', align: 'center', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                            { key: 'cohensD', header: "Cohen's d", type: 'number', align: 'center', formatter: (v: number) => v.toFixed(3) },
                            { key: 'ci', header: '95% CI', type: 'text', align: 'center' },
                            { key: 'significant', header: '유의성', type: 'custom', align: 'center', formatter: (v: boolean) => (
                              <Badge variant={v ? 'default' : 'outline'}>{v ? '유의' : '비유의'}</Badge>
                            )}
                          ]}
                          data={analysisResult.postHoc.map(comp => ({
                            variable: comp.variable,
                            comparison: comp.comparison,
                            meanDiff: comp.meanDiff,
                            tValue: comp.tValue,
                            pValue: comp.pValue,
                            adjustedPValue: comp.adjustedPValue,
                            cohensD: comp.cohensD,
                            ci: `[${comp.lowerCI.toFixed(3)}, ${comp.upperCI.toFixed(3)}]`,
                            significant: comp.adjustedPValue < 0.05
                          }))}
                          bordered
                          compactMode
                        />
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>사후검정 해석:</strong> 단변량 F 검정에서 유의한 종속변수에 대해서만 사후검정이 수행됩니다.
                            Bonferroni 보정된 p-값이 0.05 미만인 경우 해당 집단 간 차이가 통계적으로 유의합니다.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {analysisResult.univariateTests.some(ut => ut.pValue < 0.05)
                          ? '사후검정 결과가 없습니다.'
                          : '단변량 검정에서 유의한 종속변수가 없어 사후검정이 필요하지 않습니다.'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ContentTabsContent>

              {/* 기술통계 탭 */}
              <ContentTabsContent tabId="descriptives" show={activeResultTab === 'descriptives'} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>집단별 기술통계</CardTitle>
                    <CardDescription>각 집단의 종속변수별 평균과 표준편차</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StatisticsTable
                      title="기술통계량"
                      columns={[
                        { key: 'group', header: '집단', type: 'text', align: 'left' },
                        { key: 'variable', header: '변수', type: 'text', align: 'left' },
                        { key: 'n', header: 'N', type: 'number', align: 'center' },
                        { key: 'mean', header: '평균', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'std', header: 'SD', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                        { key: 'se', header: 'SE', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                        { key: 'ci95', header: '95% CI', type: 'custom', align: 'center', formatter: (v: string) => v }
                      ]}
                      data={analysisResult.descriptiveStats.map(stat => ({
                        group: stat.group,
                        variable: stat.variable,
                        n: stat.n,
                        mean: stat.mean,
                        std: stat.std,
                        se: stat.se,
                        ci95: `[${stat.ci95Lower.toFixed(2)}, ${stat.ci95Upper.toFixed(2)}]`
                      }))}
                      bordered
                      compactMode
                    />
                  </CardContent>
                </Card>
              </ContentTabsContent>

              {/* 판별분석 탭 */}
              <ContentTabsContent tabId="discriminant" show={activeResultTab === 'discriminant'} className="mt-6 space-y-6">
                {analysisResult.canonicalAnalysis && analysisResult.canonicalAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>정준 판별분석</CardTitle>
                      <CardDescription>집단 간 차이를 설명하는 판별함수</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StatisticsTable
                        title="정준 상관분석"
                        columns={[
                          { key: 'function', header: '함수', type: 'number', align: 'center' },
                          { key: 'eigenvalue', header: '고유값', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                          { key: 'correlation', header: '정준상관', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                          { key: 'wilks', header: 'Wilks λ', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                          { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                          { key: 'variance', header: '설명 분산', type: 'number', align: 'center', formatter: (v) => `${(v * 100).toFixed(1)}%` }
                        ]}
                        data={analysisResult.canonicalAnalysis.map((func, i) => ({
                          function: i + 1,
                          eigenvalue: func.eigenvalue,
                          correlation: func.canonicalCorrelation,
                          wilks: func.wilksLambda,
                          pValue: <PValueBadge value={func.pValue} />,
                          variance: func.proportionOfVariance
                        }))}
                        bordered
                        compactMode
                      />
                    </CardContent>
                  </Card>
                )}

                {analysisResult.discriminantFunctions && analysisResult.discriminantFunctions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>판별함수 계수</CardTitle>
                      <CardDescription>각 판별함수의 변수별 가중치</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analysisResult.discriminantFunctions.map((func, index) => (
                        <div key={index} className="mb-6 last:mb-0">
                          <h4 className="font-medium mb-3">판별함수 {func.function}</h4>
                          <StatisticsTable
                            columns={[
                              { key: 'variable', header: '변수', type: 'text', align: 'left' },
                              { key: 'coefficient', header: '계수', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) }
                            ]}
                            data={func.coefficients.map(coef => ({
                              variable: coef.variable,
                              coefficient: coef.coefficient
                            }))}
                            bordered
                            compactMode
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </ContentTabsContent>

              {/* 가정검정 탭 */}
              <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>다변량 정규성</CardTitle>
                    <CardDescription>종속변수들의 결합분포 정규성 검정</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{analysisResult.assumptions.multivariateNormality.test}</h4>
                          <p className="text-sm text-muted-foreground">
                            통계량: {analysisResult.assumptions.multivariateNormality.statistic.toFixed(3)}
                          </p>
                        </div>
                        <div className="text-right">
                          <PValueBadge value={analysisResult.assumptions.multivariateNormality.pValue} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysisResult.assumptions.multivariateNormality.assumptionMet ? '✓ 충족' : '✗ 위반'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>공분산 행렬 동질성</CardTitle>
                    <CardDescription>Box&apos;s M 검정</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Box&apos;s M</h4>
                          <p className="text-sm text-muted-foreground">
                            M = {analysisResult.assumptions.homogeneityOfCovariance.boxM.toFixed(2)},
                            F = {analysisResult.assumptions.homogeneityOfCovariance.fStatistic.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfCovariance.pValue} />
                          <p className="text-xs text-muted-foreground mt-1">
                            {analysisResult.assumptions.homogeneityOfCovariance.assumptionMet ? '✓ 충족' : '✗ 위반'}
                          </p>
                        </div>
                      </div>

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>가정 해석</AlertTitle>
                        <AlertDescription>
                          p-value가 0.05보다 크면 공분산 행렬 동질성 가정이 충족됩니다.
                          위반 시 Pillai&apos;s Trace를 우선 사용하세요.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>

                {analysisResult.assumptions.outliers && (
                  <Card>
                    <CardHeader>
                      <CardTitle>다변량 이상치</CardTitle>
                      <CardDescription>Mahalanobis 거리 기반 이상치 탐지</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StatisticsTable
                        title="이상치 진단"
                        columns={[
                          { key: 'observation', header: '관측치', type: 'number', align: 'center' },
                          { key: 'distance', header: 'Mahalanobis D²', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                          { key: 'pValue', header: 'p-value', type: 'custom', align: 'center', formatter: (v) => v },
                          { key: 'outlier', header: '이상치', type: 'custom', align: 'center', formatter: (v) => v }
                        ]}
                        data={analysisResult.assumptions.outliers.multivariate
                          .filter(o => o.isOutlier)
                          .map(outlier => ({
                            observation: outlier.observation,
                            distance: outlier.mahalanobisDistance,
                            pValue: <PValueBadge value={outlier.pValue} />,
                            outlier: (
                              <Badge variant="destructive">
                                이상치
                              </Badge>
                            )
                          }))}
                        bordered
                        compactMode
                      />

                      {analysisResult.assumptions.outliers.multivariate.filter(o => o.isOutlier).length === 0 && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>탐지된 이상치가 없습니다.</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </ContentTabsContent>

              {/* 해석 탭 */}
              <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>결과 해석 및 권장사항</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">전체 요약</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">다변량 효과</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.overallEffect}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">단변량 효과</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysisResult.interpretation.univariateEffects.map((effect, i) => (
                          <li key={i}>• {effect}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">판별함수 해석</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.interpretation.discriminantInterpretation}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">권장사항</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysisResult.interpretation.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>

                    <Alert>
                      <Layers3 className="h-4 w-4" />
                      <AlertTitle>MANOVA 해석 순서</AlertTitle>
                      <AlertDescription>
                        1. 다변량 검정에서 유의성 확인 → 2. 단변량 F 검정 해석 →
                        3. 사후검정으로 구체적 차이 확인 → 4. 판별분석으로 차이 패턴 이해
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </ContentTabsContent>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep?.(2)}>
            다시 분석
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            결과 다운로드
          </Button>
        </div>
      </div>
    )
  }, [analysisResult, getEffectSizeInterpretation, actions, uploadedData, _selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="다변량 분산분석"
      analysisSubtitle="Multivariate Analysis of Variance (MANOVA)"
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
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>MANOVA 분석을 수행하고 있습니다...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </TwoPanelLayout>
  )
}
