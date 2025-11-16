'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ANCOVAVariables } from '@/types/statistics'
import { toANCOVAVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings
} from 'lucide-react'

// Components
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ANCOVAResult {
  mainEffects: {
    factor: string
    statistic: number
    pValue: number
    degreesOfFreedom: [number, number]
    partialEtaSquared: number
    observedPower: number
  }[]
  covariates: {
    covariate: string
    statistic: number
    pValue: number
    degreesOfFreedom: [number, number]
    partialEtaSquared: number
    coefficient: number
    standardError: number
  }[]
  adjustedMeans: {
    group: string
    adjustedMean: number
    standardError: number
    ci95Lower: number
    ci95Upper: number
  }[]
  postHoc: {
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
    homogeneityOfSlopes: {
      statistic: number
      pValue: number
      assumptionMet: boolean
    }
    homogeneityOfVariance: {
      leveneStatistic: number
      pValue: number
      assumptionMet: boolean
    }
    normalityOfResiduals: {
      shapiroW: number
      pValue: number
      assumptionMet: boolean
    }
    linearityOfCovariate: {
      correlations: { group: string; correlation: number }[]
      assumptionMet: boolean
    }
  }
  modelFit: {
    rSquared: number
    adjustedRSquared: number
    fStatistic: number
    modelPValue: number
    residualStandardError: number
  }
  interpretation: {
    summary: string
    covariateEffect: string
    groupDifferences: string
    recommendations: string[]
  }
}

export default function ANCOVAPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('ancova')
  }, [])

  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<ANCOVAResult, ANCOVAVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables: _selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // PyodideCore state
  const [pyodideReady, setPyodideReady] = useState(false)

  // Initialize PyodideCore
  useEffect(() => {
    const initPyodide = async () => {
      try {
        const pyodideCore = PyodideCoreService.getInstance()
        await pyodideCore.initialize()
        setPyodideReady(true)
      } catch (err) {
        console.error('PyodideCore 초기화 실패:', err)
        actions.setError('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [actions])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'ANCOVA의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'ANCOVA 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수, 요인, 공변량 설정',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'ANCOVA 결과 및 수정된 평균',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info - useMemo로 최적화
  const methodInfo = useMemo(() => ({
    formula: "Y = μ + α + βX + ε (X: 공변량)",
    assumptions: [
      "공변량과 종속변수의 선형관계",
      "회귀직선의 동질성 (slopes homogeneity)",
      "잔차의 정규성과 등분산성",
      "공변량과 요인 간 독립성"
    ],
    sampleSize: "각 그룹 최소 20명",
    usage: "공변량을 통제한 집단 간 평균 비교"
  }), [])

  // Event handlers - using common utility
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'ancova'
  )

  const runAnalysis = useCallback(async (variables: ANCOVAVariables) => {
    if (!uploadedData || !pyodideReady || !variables.dependent || !variables.factor?.length || !variables.covariate?.length) {
      actions.setError?.('분석을 실행할 수 없습니다. 종속변수, 요인, 공변량을 모두 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const pyodideCore = PyodideCoreService.getInstance()

      // Call Worker 2 ancova_analysis method
      const workerResult = await pyodideCore.callWorkerMethod<ANCOVAResult>(
        2,
        'ancova_analysis',
        {
          dependent_var: variables.dependent,
          factor_vars: variables.factor,
          covariate_vars: variables.covariate,
          data: uploadedData.data as never
        }
      )

      actions.completeAnalysis(workerResult, 3)
    } catch (err) {
      console.error('ANCOVA 분석 실패:', err)
      actions.setError?.(err instanceof Error ? err.message : 'ANCOVA 분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, pyodideReady, actions])

  const handleVariableSelection = useCallback((vars: VariableAssignment) => {
    const typedVars = toANCOVAVariables(vars)

    if (!actions.setSelectedVariables) {
      console.error('[ancova] setSelectedVariables not available')
      return
    }

    actions.setSelectedVariables(typedVars)

    // 자동 분석 실행
    if (typedVars.dependent && typedVars.factor?.length >= 1 && typedVars.covariate?.length >= 1) {
      runAnalysis(typedVars)
    }
  }, [actions, runAnalysis])

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '효과 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const getCohensInterpretation = (d: number) => {
    const absD = Math.abs(d)
    if (absD >= 0.8) return '큰 효과'
    if (absD >= 0.5) return '중간 효과'
    if (absD >= 0.2) return '작은 효과'
    return '효과 없음'
  }

  return (
    <StatisticsPageLayout
      title="공분산분석"
      subtitle="Analysis of Covariance (ANCOVA)"
      description="공변량을 통제한 집단 간 평균 비교 분석"
      icon={<GitBranch className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="공분산분석 소개"
          description="공변량을 통제한 집단 간 비교 분석"
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
                    공변량(covariate)의 영향을 통제한 후 집단 간 평균 차이를 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 사전 점수나 연령 등의 영향 제거</li>
                    <li>• 순수한 처치 효과 확인</li>
                    <li>• 검정력 향상 효과</li>
                    <li>• 수정된 평균(adjusted means) 비교</li>
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
                      <h4 className="font-medium">교육 효과</h4>
                      <p className="text-muted-foreground">사전 점수를 통제한 학습법 비교</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">임상 시험</h4>
                      <p className="text-muted-foreground">기저선 값을 통제한 치료 효과</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 집단 간 비교에서 영향을 미칠 수 있는 변수가 있을 때<br/>
                • 사전-사후 설계에서 사전 점수를 통제하고 싶을 때<br/>
                • ANOVA의 검정력을 향상시키고 싶을 때<br/>
                • 무작위 배정이 완전하지 않은 준실험 설계
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted border border rounded-lg">
              <h4 className="font-medium mb-2">주요 가정</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>선형성:</strong> 공변량과 종속변수 간 선형관계</li>
                <li>• <strong>회귀직선 동질성:</strong> 집단별 회귀계수가 동일</li>
                <li>• <strong>정규성:</strong> 잔차가 정규분포</li>
                <li>• <strong>등분산성:</strong> 집단 간 잔차 분산 동일</li>
                <li>• <strong>독립성:</strong> 공변량과 처치가 독립적</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => actions.setCurrentStep(1)}>
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
          description="ANCOVA 분석용 데이터를 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onNext={() => {}}
            onUploadComplete={handleDataUpload}
          />

          <Alert className="mt-4">
            <GitBranch className="h-4 w-4" />
            <AlertTitle>ANCOVA 데이터 형식</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 참가자를 나타냅니다<br/>
              • 종속변수: 연속형 변수 (예: 사후점수)<br/>
              • 요인(독립변수): 범주형 변수 (예: 집단)<br/>
              • 공변량: 연속형 변수 (예: 사전점수, 연령)<br/>
              • 결측값은 최소화해야 합니다
            </AlertDescription>
          </Alert>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="종속변수, 요인, 공변량을 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelectorModern
            methodId="ancova"
            data={Array.isArray(uploadedData) ? uploadedData : []}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 비교하고자 하는 연속형 결과 변수 (1개)<br/>
              • 독립변수: 집단을 구분하는 범주형 변수 (1개)<br/>
              • 공변량: 통제하고자 하는 연속형 변수 (1개 이상)<br/>
              • 예: 종속변수(사후점수), 독립변수(처치집단), 공변량(사전점수)
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.mainEffects[0].statistic.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">F 통계량</p>
                  <p className="text-xs text-muted-foreground">
                    df = ({analysisResult.mainEffects[0].degreesOfFreedom[0]}, {analysisResult.mainEffects[0].degreesOfFreedom[1]})
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <PValueBadge value={analysisResult.mainEffects[0].pValue} size="lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">유의확률</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.mainEffects[0].partialEtaSquared.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">부분 η²</p>
                  <Badge variant="outline" className="mt-1">
                    {getEffectSizeInterpretation(analysisResult.mainEffects[0].partialEtaSquared).level}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="means" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="means">수정된 평균</TabsTrigger>
              <TabsTrigger value="anova">ANCOVA 결과</TabsTrigger>
              <TabsTrigger value="posthoc">사후검정</TabsTrigger>
              <TabsTrigger value="assumptions">가정검정</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
            </TabsList>

            <TabsContent value="means">
              <Card>
                <CardHeader>
                  <CardTitle>수정된 평균 (Adjusted Means)</CardTitle>
                  <CardDescription>공변량의 영향을 제거한 집단별 평균</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="수정된 평균"
                    columns={[
                      { key: 'group', header: '집단', type: 'text', align: 'left' },
                      { key: 'adjustedMean', header: '수정된 평균', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'standardError', header: '표준오차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'ci95', header: '95% 신뢰구간', type: 'custom', align: 'center', formatter: (v: string) => v }
                    ]}
                    data={analysisResult.adjustedMeans.map(mean => ({
                      group: mean.group,
                      adjustedMean: mean.adjustedMean,
                      standardError: mean.standardError,
                      ci95: `[${mean.ci95Lower.toFixed(2)}, ${mean.ci95Upper.toFixed(2)}]`
                    }))}
                    bordered
                    compactMode
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    * 공변량 값이 전체 평균으로 조정된 집단별 예측 평균
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anova">
              <Card>
                <CardHeader>
                  <CardTitle>ANCOVA 결과</CardTitle>
                  <CardDescription>공분산분석 분산표</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <StatisticsTable
                    title="ANCOVA 분산표"
                    columns={[
                      { key: 'source', header: '변수원', type: 'text', align: 'left' },
                      { key: 'df', header: '자유도', type: 'custom', align: 'center', formatter: (v: string) => v },
                      { key: 'statistic', header: 'F 통계량', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'pValue', header: 'p-값', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'partialEtaSquared', header: '부분 η²', type: 'number', align: 'center', formatter: (v) => v.toFixed(3) },
                      { key: 'power', header: '검정력', type: 'custom', align: 'center', formatter: (v) => v }
                    ]}
                    data={[
                      ...analysisResult.covariates.map(cov => ({
                        source: cov.covariate,
                        df: `${cov.degreesOfFreedom[0]}, ${cov.degreesOfFreedom[1]}`,
                        statistic: cov.statistic,
                        pValue: <PValueBadge value={cov.pValue} />,
                        partialEtaSquared: cov.partialEtaSquared,
                        power: '-'
                      })),
                      ...analysisResult.mainEffects.map(effect => ({
                        source: effect.factor,
                        df: `${effect.degreesOfFreedom[0]}, ${effect.degreesOfFreedom[1]}`,
                        statistic: effect.statistic,
                        pValue: <PValueBadge value={effect.pValue} />,
                        partialEtaSquared: effect.partialEtaSquared,
                        power: `${(effect.observedPower * 100).toFixed(0)}%`
                      }))
                    ]}
                    bordered
                    compactMode
                  />

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-3">모델 적합도</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">R²:</span>
                        <p className="font-mono font-bold">{analysisResult.modelFit.rSquared.toFixed(3)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">수정된 R²:</span>
                        <p className="font-mono">{analysisResult.modelFit.adjustedRSquared.toFixed(3)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">모델 F:</span>
                        <p className="font-mono">{analysisResult.modelFit.fStatistic.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">잔차 표준오차:</span>
                        <p className="font-mono">{analysisResult.modelFit.residualStandardError.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posthoc">
              <Card>
                <CardHeader>
                  <CardTitle>사후검정</CardTitle>
                  <CardDescription>Bonferroni 보정된 집단 간 쌍별 비교</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="사후검정"
                    columns={[
                      { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                      { key: 'meanDiff', header: '평균차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'standardError', header: '표준오차', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'tValue', header: 't값', type: 'number', align: 'center', formatter: (v) => v.toFixed(2) },
                      { key: 'adjustedPValue', header: '보정 p-값', type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'cohensD', header: "Cohen's d", type: 'custom', align: 'center', formatter: (v) => v },
                      { key: 'ci95', header: '95% 신뢰구간', type: 'custom', align: 'center', formatter: (v: string) => v }
                    ]}
                    data={analysisResult.postHoc.map((result, index) => ({
                      comparison: result.comparison,
                      meanDiff: result.meanDiff,
                      standardError: result.standardError,
                      tValue: result.tValue,
                      adjustedPValue: <PValueBadge value={result.adjustedPValue} />,
                      cohensD: (
                        <div className="space-y-1">
                          <span className="font-mono">{result.cohensD.toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs block">
                            {getCohensInterpretation(result.cohensD)}
                          </Badge>
                        </div>
                      ),
                      ci95: `[${result.lowerCI.toFixed(2)}, ${result.upperCI.toFixed(2)}]`
                    }))}
                    bordered
                    compactMode
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assumptions">
              <Card>
                <CardHeader>
                  <CardTitle>가정 검정</CardTitle>
                  <CardDescription>ANCOVA의 전제조건 확인</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">회귀직선 동질성</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>F 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.homogeneityOfSlopes.statistic.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfSlopes.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.homogeneityOfSlopes.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.homogeneityOfSlopes.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">등분산성 (Levene)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Levene 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.homogeneityOfVariance.leveneStatistic.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.homogeneityOfVariance.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.homogeneityOfVariance.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.homogeneityOfVariance.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">정규성 (Shapiro-Wilk)</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>W 통계량:</span>
                          <span className="font-mono">{analysisResult.assumptions.normalityOfResiduals.shapiroW.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>p-값:</span>
                          <PValueBadge value={analysisResult.assumptions.normalityOfResiduals.pValue} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.normalityOfResiduals.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.normalityOfResiduals.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">선형성 (집단별 상관)</h4>
                      <div className="space-y-2 text-sm">
                        {analysisResult.assumptions.linearityOfCovariate.correlations.map(corr => (
                          <div key={corr.group} className="flex justify-between">
                            <span>{corr.group}:</span>
                            <span className="font-mono">r = {corr.correlation.toFixed(3)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center mt-2">
                          <span>가정 만족:</span>
                          <Badge className={analysisResult.assumptions.linearityOfCovariate.assumptionMet ? 'bg-muted ' : 'bg-muted '}>
                            {analysisResult.assumptions.linearityOfCovariate.assumptionMet ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>ANCOVA 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>주요 결과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertTitle>공변량 효과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.covariateEffect}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>집단 차이</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.groupDifferences}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">권장사항</h4>
                    <ul className="space-y-2">
                      {analysisResult.interpretation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg ${getEffectSizeInterpretation(analysisResult.mainEffects[0].partialEtaSquared).bg}`}>
                      <h4 className={`font-medium mb-2 ${getEffectSizeInterpretation(analysisResult.mainEffects[0].partialEtaSquared).color}`}>
                        부분 η² (효과 크기)
                      </h4>
                      <p className="text-sm">
                        η²p = {analysisResult.mainEffects[0].partialEtaSquared.toFixed(3)}
                        ({getEffectSizeInterpretation(analysisResult.mainEffects[0].partialEtaSquared).level})
                      </p>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">공변량 기여도</h4>
                      <p className="text-sm">
                        R² 증가분 = {(analysisResult.covariates[0].partialEtaSquared * 100).toFixed(1)}%
                        <br />
                        <span className="text-muted-foreground">
                          공변량으로 인한 검정력 향상
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
              <Button onClick={() => actions.reset()}>
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
                  <p className="font-medium">ANCOVA 분석 중...</p>
                  <p className="text-sm text-muted-foreground">공변량 통제 및 가정 검정 포함</p>
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