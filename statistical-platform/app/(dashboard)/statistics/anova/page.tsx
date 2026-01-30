'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type {
  ANOVAVariables,
  PostHocComparison
} from '@/types/statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BarChart3,
  AlertCircle,
  CheckCircle,
  Layers,
  GitBranch,
  Network
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { TestStatisticDisplay } from '@/components/statistics/common/TestStatisticDisplay'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import {
  runOneWayANOVA,
  runTwoWayANOVA,
  runThreeWayANOVA,
  convertOneWayToPageResults,
  convertTwoWayToPageResults,
  convertThreeWayToPageResults,
  type GroupResult as HelperGroupResult
} from '@/lib/statistics/anova-helpers'

// Guide Components
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

// ANOVA 페이지 전용 메서드 ID 매핑 (camelCase → kebab-case method ID)
const ANOVA_METHOD_MAP: Record<string, string> = {
  'oneWay': 'one-way-anova',
  'twoWay': 'two-way-anova',
  'threeWay': 'three-way-anova',
  'repeated': 'repeated-measures-anova'
}

interface GroupResult {
  name: string
  mean: number
  std: number
  n: number
  se: number
  ci: [number, number]
}

/**
 * 개별 요인 또는 상호작용 효과 결과
 */
interface FactorResult {
  /** 요인명 (예: "급여 유형", "온도") */
  name: string
  /** F-통계량 */
  fStatistic: number
  /** p-값 */
  pValue: number
  /** 자유도 */
  df: number
  /** 효과 크기 (η²) */
  etaSquared: number
  /** 효과 크기 (ω²) */
  omegaSquared: number
}

/**
 * 다요인 ANOVA 결과 (이원/삼원)
 */
interface MultiFactorANOVAResults {
  /** 요인 1 주효과 */
  factor1: FactorResult
  /** 요인 2 주효과 */
  factor2?: FactorResult
  /** 요인 3 주효과 */
  factor3?: FactorResult
  /** 요인 1 × 요인 2 상호작용 */
  interaction12?: FactorResult
  /** 요인 1 × 요인 3 상호작용 */
  interaction13?: FactorResult
  /** 요인 2 × 요인 3 상호작용 */
  interaction23?: FactorResult
  /** 요인 1 × 요인 2 × 요인 3 상호작용 */
  interaction123?: FactorResult
}

interface ANOVAResults {
  // 일원 ANOVA용 기존 필드
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  msBetween: number
  msWithin: number
  etaSquared: number
  omegaSquared: number
  powerAnalysis: {
    observedPower: number
    effectSize: string
    cohensF: number
  }
  groups: GroupResult[]
  postHoc?: {
    method: string
    comparisons: PostHocComparison[]
    adjustedAlpha: number
  }
  assumptions?: {
    normality: {
      shapiroWilk: { statistic: number; pValue: number }
      passed: boolean
      interpretation: string
    }
    homogeneity: {
      levene: { statistic: number; pValue: number }
      passed: boolean
      interpretation: string
    }
  }
  anovaTable: {
    source: string
    ss: number
    df: number
    ms: number | null
    f: number | null
    p: number | null
  }[]

  // 다요인 ANOVA용 추가 필드
  multiFactorResults?: MultiFactorANOVAResults
}

const STEPS = [
  { id: 1, label: 'ANOVA 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '결과 확인' }
]

export default function ANOVAPage() {
  useEffect(() => {
    addToRecentStatistics('anova')
  }, [])

  const { state, actions } = useStatisticsPage<ANOVAResults, ANOVAVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const [anovaType, setAnovaType] = useState<'oneWay' | 'twoWay' | 'threeWay' | 'repeated' | ''>('')
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // Guide components - useAnalysisGuide hook 사용 (dynamic based on anovaType)
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    getMethodId: () => anovaType ? ANOVA_METHOD_MAP[anovaType] : null
  })

  const anovaTypeInfo = {
    oneWay: {
      title: '일원 분산분석',
      subtitle: 'One-way ANOVA',
      description: '하나의 독립변수(요인)가 종속변수에 미치는 영향 검정',
      icon: <GitBranch className="w-5 h-5" />,
      example: '서로 다른 사료(A, B, C)가 넙치 성장률에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 3
    },
    twoWay: {
      title: '이원 분산분석',
      subtitle: 'Two-way ANOVA',
      description: '두 개의 독립변수와 상호작용이 종속변수에 미치는 영향 검정',
      icon: <Network className="w-5 h-5" />,
      example: '사료 종류(A, B)와 수온(저온, 고온)이 전복 생존율에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 2
    },
    threeWay: {
      title: '삼원 분산분석',
      subtitle: 'Three-way ANOVA',
      description: '세 개의 독립변수와 상호작용이 종속변수에 미치는 영향 검정',
      icon: <Network className="w-5 h-5" />,
      example: '사료(A, B), 수온(저, 중, 고), 염분(낮음, 높음)이 새우 성장에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 2
    },
    repeated: {
      title: '반복측정 분산분석',
      subtitle: 'Repeated Measures ANOVA',
      description: '동일한 대상에서 반복 측정한 데이터의 평균 차이 검정',
      icon: <Layers className="w-5 h-5" />,
      example: '동일 양식장의 주간별(1주, 2주, 3주) 어류 체중 변화',
      assumptions: ['정규성', '구형성', '독립성'],
      minMeasures: 3
    }
  }

  const handleMethodSelect = useCallback((type: 'oneWay' | 'twoWay' | 'threeWay' | 'repeated') => {
    setAnovaType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((varName: 'dependent' | 'factor', header: string) => {
    const current = selectedVariables || {} as ANOVAVariables

    if (varName === 'dependent') {
      actions.setSelectedVariables?.({ ...current, dependent: header })
    } else if (varName === 'factor') {
      const currentFactors = current.factor || []
      const currentArray = Array.isArray(currentFactors) ? currentFactors : [currentFactors]

      const isSelected = currentArray.includes(header)
      const updated = isSelected
        ? currentArray.filter(h => h !== header)
        : [...currentArray, header]

      actions.setSelectedVariables?.({ ...current, factor: updated })
    }
  }, [actions, selectedVariables])

  /**
   * ANOVA 분석 실행
   * 일원/이원/삼원 분산분석을 헬퍼 함수를 사용하여 수행
   */
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables?.dependent || !selectedVariables?.factor) {
      actions.setError?.('종속변수와 요인을 선택해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 데이터 준비
      const depVar = selectedVariables.dependent
      const factors = Array.isArray(selectedVariables.factor)
        ? selectedVariables.factor
        : [selectedVariables.factor]

      let finalResult: ANOVAResults

      if (factors.length === 1) {
        // 일원 분산분석
        const result = await runOneWayANOVA(
          pyodideCore,
          uploadedData,
          depVar,
          factors[0]
        )
        finalResult = convertOneWayToPageResults(result) as ANOVAResults
      } else if (factors.length === 2) {
        // 이원 분산분석
        const result = await runTwoWayANOVA(
          pyodideCore,
          uploadedData,
          depVar,
          factors[0],
          factors[1]
        )
        finalResult = convertTwoWayToPageResults(result) as ANOVAResults
      } else if (factors.length === 3) {
        // 삼원 분산분석
        const result = await runThreeWayANOVA(
          pyodideCore,
          uploadedData,
          depVar,
          factors[0],
          factors[1],
          factors[2]
        )
        finalResult = convertThreeWayToPageResults(result) as ANOVAResults
      } else {
        actions.setError?.('현재는 일원/이원/삼원 분산분석만 지원됩니다.')
        return
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(finalResult, 4)
    } catch (err) {
      // 에러 메시지 처리
      const errorMessage = err instanceof Error
        ? err.message.includes('패키지') || err.message.includes('Worker')
          ? '분석 중 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.'
          : err.message
        : '분석 실패'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])


  const stepsWithCompleted = STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? !!anovaType :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables?.dependent && !!selectedVariables?.factor :
              step.id === 4 ? !!results : false
  }))

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '분산분석' }
  ]

  // 효과 크기 해석
  const interpretEffectSize = (eta: number) => {
    if (eta >= 0.14) return '큰 효과'
    if (eta >= 0.06) return '중간 효과'
    if (eta >= 0.01) return '작은 효과'
    return '효과 없음'
  }

  // 요인별 효과크기 표시 헬퍼 컴포넌트
  const FactorEffectDisplay = ({
    factor,
    dfWithin,
    borderColor
  }: {
    factor: FactorResult
    dfWithin: number
    borderColor: string
  }) => (
    <div className={`pl-3 border-l-2 ${borderColor}`}>
      <p className="text-sm font-medium">{factor.name}</p>
      <p className="text-xs">
        F({factor.df}, {dfWithin}) = <strong>{factor.fStatistic.toFixed(2)}</strong>,
        p = <strong>{factor.pValue < 0.001 ? '< 0.001' : factor.pValue.toFixed(3)}</strong>
      </p>
      <p className="text-xs">
        η² = <strong>{factor.etaSquared.toFixed(3)}</strong>,
        ω² = <strong>{factor.omegaSquared.toFixed(3)}</strong>
      </p>
      <p className="text-xs text-muted-foreground">
        {factor.pValue < 0.05 ? '✅ 유의함' : '❌ 비유의'}
        ({interpretEffectSize(factor.etaSquared)})
      </p>
    </div>
  )

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="분산분석"
      analysisSubtitle="ANOVA"
      analysisIcon={<BarChart3 className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: ANOVA 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">ANOVA 방법 선택</h2>
            <p className="text-sm text-muted-foreground">
              분석 목적과 독립변수 개수에 맞는 ANOVA 방법을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(anovaTypeInfo).map(([key, info]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  anovaType === key ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleMethodSelect(key as 'oneWay' | 'twoWay' | 'threeWay' | 'repeated')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                      {info.icon}
                    </div>
                    {anovaType === key && (
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
                    <p className="text-xs font-medium mb-1">수산과학 예시:</p>
                    <p className="text-xs text-muted-foreground">
                      {info.example}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {info.assumptions.map((assumption) => (
                      <Badge key={assumption} variant="secondary" className="text-xs">
                        {assumption}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analysis Guide Panel - anovaType 선택 시 표시 */}
          {methodMetadata && (
            <AnalysisGuidePanel
              method={methodMetadata}
              sections={['variables', 'assumptions', 'dataFormat', 'sampleData']}
              defaultExpanded={['variables']}
            />
          )}

          {/* Assumption Checklist - anovaType 선택 시 표시 */}
          {assumptionItems.length > 0 && (
            <AssumptionChecklist
              assumptions={assumptionItems}
              showProgress={true}
              collapsible={true}
              title="분석 전 가정 확인"
              description={`${methodMetadata?.name || 'ANOVA'}의 기본 가정을 확인해주세요.`}
            />
          )}
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              분산분석할 데이터 파일을 업로드하세요
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
              종속변수(연속형)와 요인(범주형)을 선택하세요
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">종속변수 (연속형)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const isSelected = selectedVariables?.dependent === header

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleVariableSelect('dependent', header)}
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
              <CardTitle className="text-base">
                요인 (범주형, {anovaType === 'oneWay' ? '1개' : anovaType === 'twoWay' ? '2개' : anovaType === 'threeWay' ? '3개' : '최소 1개'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const currentFactors = selectedVariables?.factor || []
                  const factorArray = Array.isArray(currentFactors) ? currentFactors : [currentFactors]
                  const isSelected = factorArray.includes(header)

                  // 최대 factor 수 제한
                  const maxFactors = anovaType === 'oneWay' ? 1 : anovaType === 'twoWay' ? 2 : anovaType === 'threeWay' ? 3 : 999
                  const canSelect = isSelected || factorArray.length < maxFactors

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer max-w-[200px] truncate ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={header}
                      onClick={() => canSelect && handleVariableSelect('factor', header)}
                    >
                      {header}
                      {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                    </Badge>
                  )
                })}
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleAnalysis}
                  disabled={(() => {
                    if (isAnalyzing || !selectedVariables?.dependent || !selectedVariables?.factor) return true
                    const factorArray = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

                    // ANOVA 타입별 필요한 factor 수 체크
                    if (anovaType === 'oneWay') return factorArray.length !== 1
                    if (anovaType === 'twoWay') return factorArray.length !== 2
                    if (anovaType === 'threeWay') return factorArray.length !== 3
                    return factorArray.length < 1
                  })()}
                  size="lg"
                >
                  {isAnalyzing ? '분석 중...' : 'ANOVA 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {currentStep === 4 && results && (
        <div className="space-y-6">
          <ResultContextHeader
            analysisType={anovaTypeInfo[anovaType as keyof typeof anovaTypeInfo]?.title || '분산분석'}
            analysisSubtitle={anovaTypeInfo[anovaType as keyof typeof anovaTypeInfo]?.subtitle || 'ANOVA'}
            fileName={uploadedData?.fileName}
            variables={[
              ...(selectedVariables?.dependent ? [selectedVariables.dependent] : []),
              ...(Array.isArray(selectedVariables?.factor) ? selectedVariables.factor : selectedVariables?.factor ? [selectedVariables.factor] : [])
            ]}
            sampleSize={results?.groups?.reduce((sum: number, g: { n: number }) => sum + g.n, 0)}
            timestamp={analysisTimestamp ?? undefined}
          />

          {/* Result Interpretation */}
          <ResultInterpretation
            result={{
              summary: results.pValue < 0.05
                ? `${results.multiFactorResults ? '다요인 분산분석' : '일원 분산분석'} 결과, 그룹 간 평균 차이가 통계적으로 유의합니다 (p = ${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}).`
                : `${results.multiFactorResults ? '다요인 분산분석' : '일원 분산분석'} 결과, 그룹 간 평균 차이가 통계적으로 유의하지 않습니다 (p = ${results.pValue.toFixed(3)}).`,
              details: `F(${results.dfBetween}, ${results.dfWithin}) = ${results.fStatistic.toFixed(2)}, p = ${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}, η² = ${results.etaSquared.toFixed(3)}, ω² = ${results.omegaSquared.toFixed(3)}`,
              recommendation: results.pValue < 0.05
                ? results.postHoc
                  ? '사후검정 결과를 확인하여 구체적으로 어떤 그룹 간에 차이가 있는지 파악하세요.'
                  : '사후검정을 수행하여 구체적인 그룹 간 차이를 확인하세요.'
                : '그룹 간 차이가 유의하지 않으므로, 표본 크기를 늘리거나 다른 변수를 검토하세요.',
              caution: !results.assumptions?.normality?.passed || !results.assumptions?.homogeneity?.passed
                ? '일부 가정이 충족되지 않았습니다. 비모수 검정(Kruskal-Wallis)을 고려하세요.'
                : undefined
            }}
            title="분산분석 결과 해석"
          />

          {/* 주요 결과 요약 */}
          {results.multiFactorResults ? (
            // 다요인 ANOVA 요약 (모든 요인 및 상호작용 표시)
            <div className="space-y-4">
              <Alert className="border-blue-500 bg-muted">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="mt-2 space-y-3">
                    <p className="font-semibold text-sm mb-2">주효과 (Main Effects)</p>

                    {/* Factor 1 */}
                    <FactorEffectDisplay
                      factor={results.multiFactorResults.factor1}
                      dfWithin={results.dfWithin}
                      borderColor="border-blue-500"
                    />

                    {/* Factor 2 */}
                    {results.multiFactorResults.factor2 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.factor2}
                        dfWithin={results.dfWithin}
                        borderColor="border-green-500"
                      />
                    )}

                    {/* Factor 3 */}
                    {results.multiFactorResults.factor3 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.factor3}
                        dfWithin={results.dfWithin}
                        borderColor="border-purple-500"
                      />
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* 상호작용 효과 */}
              <Alert className="border-orange-500 bg-muted">
                <Network className="h-4 w-4" />
                <AlertDescription>
                  <div className="mt-2 space-y-3">
                    <p className="font-semibold text-sm mb-2">상호작용 효과 (Interaction Effects)</p>

                    {/* Interaction 12 */}
                    {results.multiFactorResults.interaction12 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction12}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 13 */}
                    {results.multiFactorResults.interaction13 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction13}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 23 */}
                    {results.multiFactorResults.interaction23 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction23}
                        dfWithin={results.dfWithin}
                        borderColor="border-orange-500"
                      />
                    )}

                    {/* Interaction 123 */}
                    {results.multiFactorResults.interaction123 && (
                      <FactorEffectDisplay
                        factor={results.multiFactorResults.interaction123}
                        dfWithin={results.dfWithin}
                        borderColor="border-red-500"
                      />
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            // 일원 ANOVA 요약 - TestStatisticDisplay 사용
            <TestStatisticDisplay
              name="F"
              value={results.fStatistic}
              df={{ numerator: results.dfBetween, denominator: results.dfWithin }}
              pValue={results.pValue}
              alpha={0.05}
              size="default"
            />
          )}

          {/* ANOVA 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">분산분석표</CardTitle>
            </CardHeader>
            <CardContent>
              <StatisticsTable
                columns={[
                  { key: 'source', header: '변동 요인', type: 'text' },
                  { key: 'ss', header: '제곱합 (SS)', type: 'number' },
                  { key: 'df', header: '자유도 (df)', type: 'number' },
                  { key: 'ms', header: '평균제곱 (MS)', type: 'number' },
                  { key: 'f', header: 'F', type: 'number' },
                  { key: 'p', header: 'p-value', type: 'pvalue' }
                ]}
                data={results.anovaTable}
              />
            </CardContent>
          </Card>

          {/* 집단별 기술통계 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">집단별 기술통계</CardTitle>
            </CardHeader>
            <CardContent>
              <StatisticsTable
                columns={[
                  { key: 'name', header: '집단', type: 'text' },
                  { key: 'n', header: 'N', type: 'number' },
                  { key: 'mean', header: '평균', type: 'number' },
                  { key: 'std', header: '표준편차', type: 'number' },
                  { key: 'se', header: '표준오차', type: 'number' },
                  { key: 'ci', header: '95% CI', type: 'ci' }
                ]}
                data={results.groups}
              />

              {/* 막대 그래프 */}
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results.groups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="mean" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 사후검정 */}
          {results.postHoc && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  사후검정 ({results.postHoc.method})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.postHoc.comparisons.map((comp, idx) => (
                    <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{comp.group1} vs {comp.group2}</span>
                        <Badge variant={comp.significant ? 'default' : 'secondary'}>
                          {comp.significant ? '유의' : '비유의'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">평균 차이</p>
                          <p className="font-medium">{comp.meanDiff.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">p-value</p>
                          <p className="font-medium">
                            {comp.pValue < 0.001 ? '< 0.001' : comp.pValue.toFixed(3)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">95% CI</p>
                          <p className="font-medium text-xs">
                            {comp.ciLower !== undefined && comp.ciUpper !== undefined
                              ? `[${comp.ciLower.toFixed(2)}, ${comp.ciUpper.toFixed(2)}]`
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  보정된 유의수준 (α): {results.postHoc.adjustedAlpha.toFixed(4)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 가정 검정 */}
          {results.assumptions && (
            <AssumptionTestCard
              tests={[
                {
                  name: '정규성',
                  testName: 'Shapiro-Wilk',
                  statistic: results.assumptions.normality.shapiroWilk.statistic,
                  pValue: results.assumptions.normality.shapiroWilk.pValue,
                  passed: results.assumptions.normality.passed,
                  description: results.assumptions.normality.interpretation,
                  recommendation: !results.assumptions.normality.passed
                    ? '비모수 검정(Kruskal-Wallis)을 고려하세요.'
                    : undefined
                },
                {
                  name: '등분산성',
                  testName: "Levene's Test",
                  statistic: results.assumptions.homogeneity.levene.statistic,
                  pValue: results.assumptions.homogeneity.levene.pValue,
                  passed: results.assumptions.homogeneity.passed,
                  description: results.assumptions.homogeneity.interpretation,
                  recommendation: !results.assumptions.homogeneity.passed
                    ? 'Welch ANOVA 또는 비모수 검정을 고려하세요.'
                    : undefined
                }
              ]}
              testType="ANOVA"
              showRecommendations={true}
              showDetails={true}
            />
          )}

          {/* 효과 크기 및 검정력 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold">효과 크기 및 검정력</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectSizeCard
                title="Eta Squared"
                value={results.etaSquared}
                type="eta_squared"
                description="집단 간 분산이 전체 분산에서 차지하는 비율"
                showVisualScale={true}
              />
              <EffectSizeCard
                title="Omega Squared"
                value={results.omegaSquared}
                type="omega_squared"
                description="모집단 효과크기의 편향 보정 추정치"
                showVisualScale={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Cohen&apos;s f</p>
                    <p className="text-2xl font-bold">{results.powerAnalysis.cohensF.toFixed(3)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.powerAnalysis.cohensF >= 0.4 ? '큰 효과' :
                       results.powerAnalysis.cohensF >= 0.25 ? '중간 효과' :
                       results.powerAnalysis.cohensF >= 0.1 ? '작은 효과' : '무시할 만한 효과'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">통계적 검정력</p>
                    <p className="text-2xl font-bold">{(results.powerAnalysis.observedPower * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {results.powerAnalysis.observedPower >= 0.8 ? '충분함' :
                       results.powerAnalysis.observedPower >= 0.5 ? '보통' : '부족함'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </TwoPanelLayout>
  )
}

// ============================================================================
// Exported Helper Functions for Testing
// ============================================================================

/**
 * 이원 ANOVA Worker 결과를 ANOVA 테이블로 변환
 * @param workerResult - Worker의 two_way_anova 반환값
 * @param factor1Name - Factor 1 컬럼명
 * @param factor2Name - Factor 2 컬럼명
 * @returns ANOVA 테이블 배열
 */
function convertTwoWayWorkerResultToTable(
  workerResult: {
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  },
  factor1Name: string,
  factor2Name: string
): Array<{
  source: string
  ss: number
  df: number
  ms: number
  f: number | null
  p: number | null
}> {
  const getSS = (key: string) => workerResult.anovaTable.sum_sq[key] ?? 0
  const getDF = (key: string) => workerResult.anovaTable.df[key] ?? 1
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = getDF(key)
    return df > 0 ? ss / df : 0
  }

  return [
    {
      source: `요인 1 (${factor1Name})`,
      ss: getSS('C(factor1)'),
      df: workerResult.factor1.df,
      ms: getMS('C(factor1)'),
      f: workerResult.factor1.fStatistic,
      p: workerResult.factor1.pValue
    },
    {
      source: `요인 2 (${factor2Name})`,
      ss: getSS('C(factor2)'),
      df: workerResult.factor2.df,
      ms: getMS('C(factor2)'),
      f: workerResult.factor2.fStatistic,
      p: workerResult.factor2.pValue
    },
    {
      source: '상호작용',
      ss: getSS('C(factor1):C(factor2)'),
      df: workerResult.interaction.df,
      ms: getMS('C(factor1):C(factor2)'),
      f: workerResult.interaction.fStatistic,
      p: workerResult.interaction.pValue
    },
    {
      source: '잔차',
      ss: getSS('Residual'),
      df: workerResult.residual.df,
      ms: getMS('Residual'),
      f: null,
      p: null
    }
  ]
}

/**
 * 삼원 ANOVA Worker 결과를 ANOVA 테이블로 변환
 * @param workerResult - Worker의 three_way_anova 반환값
 * @param factor1Name - Factor 1 컬럼명
 * @param factor2Name - Factor 2 컬럼명
 * @param factor3Name - Factor 3 컬럼명
 * @returns ANOVA 테이블 배열
 */
function convertThreeWayWorkerResultToTable(
  workerResult: {
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    factor3: { fStatistic: number; pValue: number; df: number }
    interaction12: { fStatistic: number; pValue: number; df: number }
    interaction13: { fStatistic: number; pValue: number; df: number }
    interaction23: { fStatistic: number; pValue: number; df: number }
    interaction123: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: {
      sum_sq: Record<string, number>
      df: Record<string, number>
      F: Record<string, number>
      'PR(>F)': Record<string, number>
    }
  },
  factor1Name: string,
  factor2Name: string,
  factor3Name: string
): Array<{
  source: string
  ss: number
  df: number
  ms: number
  f: number | null
  p: number | null
}> {
  const getSS = (key: string) => workerResult.anovaTable.sum_sq[key] ?? 0
  const getDF = (key: string) => workerResult.anovaTable.df[key] ?? 1
  const getMS = (key: string) => {
    const ss = getSS(key)
    const df = getDF(key)
    return df > 0 ? ss / df : 0
  }

  return [
    {
      source: `요인 1 (${factor1Name})`,
      ss: getSS('C(factor1)'),
      df: workerResult.factor1.df,
      ms: getMS('C(factor1)'),
      f: workerResult.factor1.fStatistic,
      p: workerResult.factor1.pValue
    },
    {
      source: `요인 2 (${factor2Name})`,
      ss: getSS('C(factor2)'),
      df: workerResult.factor2.df,
      ms: getMS('C(factor2)'),
      f: workerResult.factor2.fStatistic,
      p: workerResult.factor2.pValue
    },
    {
      source: `요인 3 (${factor3Name})`,
      ss: getSS('C(factor3)'),
      df: workerResult.factor3.df,
      ms: getMS('C(factor3)'),
      f: workerResult.factor3.fStatistic,
      p: workerResult.factor3.pValue
    },
    {
      source: `${factor1Name} × ${factor2Name}`,
      ss: getSS('C(factor1):C(factor2)'),
      df: workerResult.interaction12.df,
      ms: getMS('C(factor1):C(factor2)'),
      f: workerResult.interaction12.fStatistic,
      p: workerResult.interaction12.pValue
    },
    {
      source: `${factor1Name} × ${factor3Name}`,
      ss: getSS('C(factor1):C(factor3)'),
      df: workerResult.interaction13.df,
      ms: getMS('C(factor1):C(factor3)'),
      f: workerResult.interaction13.fStatistic,
      p: workerResult.interaction13.pValue
    },
    {
      source: `${factor2Name} × ${factor3Name}`,
      ss: getSS('C(factor2):C(factor3)'),
      df: workerResult.interaction23.df,
      ms: getMS('C(factor2):C(factor3)'),
      f: workerResult.interaction23.fStatistic,
      p: workerResult.interaction23.pValue
    },
    {
      source: `${factor1Name} × ${factor2Name} × ${factor3Name}`,
      ss: getSS('C(factor1):C(factor2):C(factor3)'),
      df: workerResult.interaction123.df,
      ms: getMS('C(factor1):C(factor2):C(factor3)'),
      f: workerResult.interaction123.fStatistic,
      p: workerResult.interaction123.pValue
    },
    {
      source: '잔차',
      ss: getSS('Residual'),
      df: workerResult.residual.df,
      ms: getMS('Residual'),
      f: null,
      p: null
    }
  ]
}
