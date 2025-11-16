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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface GroupResult {
  name: string
  mean: number
  std: number
  n: number
  se: number
  ci: [number, number]
}

interface ANOVAResults {
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
      const factors = Array.isArray(selectedVariables.factor) ? selectedVariables.factor : [selectedVariables.factor]

      // Worker 호출 (임시 데모 데이터)
      await new Promise(resolve => setTimeout(resolve, 1500))

      const demoResults: ANOVAResults = {
        fStatistic: 12.45,
        pValue: 0.001,
        dfBetween: 2,
        dfWithin: 27,
        msBetween: 235.6,
        msWithin: 18.9,
        etaSquared: 0.48,
        omegaSquared: 0.45,
        powerAnalysis: {
          observedPower: 0.95,
          effectSize: 'large',
          cohensF: 0.94
        },
        groups: [
          { name: '그룹 A', mean: 45.3, std: 4.2, n: 10, se: 1.33, ci: [42.3, 48.3] },
          { name: '그룹 B', mean: 52.8, std: 5.1, n: 10, se: 1.61, ci: [49.2, 56.4] },
          { name: '그룹 C', mean: 38.5, std: 3.8, n: 10, se: 1.20, ci: [35.8, 41.2] }
        ],
        postHoc: {
          method: 'Tukey HSD',
          comparisons: [
            { group1: '그룹 A', group2: '그룹 B', meanDiff: -7.5, pValue: 0.012, significant: true, ciLower: -13.2, ciUpper: -1.8 },
            { group1: '그룹 A', group2: '그룹 C', meanDiff: 6.8, pValue: 0.023, significant: true, ciLower: 1.1, ciUpper: 12.5 },
            { group1: '그룹 B', group2: '그룹 C', meanDiff: 14.3, pValue: 0.001, significant: true, ciLower: 8.6, ciUpper: 20.0 }
          ],
          adjustedAlpha: 0.0167
        },
        assumptions: {
          normality: {
            shapiroWilk: { statistic: 0.976, pValue: 0.234 },
            passed: true,
            interpretation: '정규성 가정이 만족됩니다 (p > 0.05)'
          },
          homogeneity: {
            levene: { statistic: 1.234, pValue: 0.305 },
            passed: true,
            interpretation: '등분산성 가정이 만족됩니다 (p > 0.05)'
          }
        },
        anovaTable: [
          { source: '그룹 간', ss: 471.2, df: 2, ms: 235.6, f: 12.45, p: 0.001 },
          { source: '그룹 내', ss: 510.3, df: 27, ms: 18.9, f: null, p: null },
          { source: '전체', ss: 981.5, df: 29, ms: null, f: null, p: null }
        ]
      }

      actions.completeAnalysis?.(demoResults, 4)
    } catch (err) {
      actions.setError?.(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, anovaType, actions])

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
              <CardTitle className="text-base">요인 (범주형, 최소 1개)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const currentFactors = selectedVariables?.factor || []
                  const factorArray = Array.isArray(currentFactors) ? currentFactors : [currentFactors]
                  const isSelected = factorArray.includes(header)

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleVariableSelect('factor', header)}
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
                  disabled={isAnalyzing || !selectedVariables?.dependent || !selectedVariables?.factor}
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
          <div>
            <h2 className="text-xl font-semibold mb-2">분산분석 결과</h2>
            <p className="text-sm text-muted-foreground">
              {anovaTypeInfo[anovaType as keyof typeof anovaTypeInfo]?.title} 분석이 완료되었습니다
            </p>
          </div>

          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  F({results.dfBetween}, {results.dfWithin}) = <strong>{results.fStatistic.toFixed(2)}</strong>,
                  p = <strong>{results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}</strong>
                </p>
                <p className="text-sm">
                  효과 크기 (η²) = <strong>{results.etaSquared.toFixed(3)}</strong>
                  ({interpretEffectSize(results.etaSquared)})
                </p>
                <p className="text-sm">
                  {results.pValue < 0.05 ? '✅ 그룹 간 평균 차이가 통계적으로 유의합니다.' : '❌ 그룹 간 평균 차이가 유의하지 않습니다.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>

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
                    <p className="text-sm text-muted-foreground mb-2">
                      W = {results.assumptions.normality.shapiroWilk.statistic.toFixed(3)},
                      p = {results.assumptions.normality.shapiroWilk.pValue.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {results.assumptions.normality.interpretation}
                    </p>
                  </div>

                  {/* 등분산성 */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">등분산성 검정 (Levene)</span>
                      <Badge variant={results.assumptions.homogeneity.passed ? 'default' : 'destructive'}>
                        {results.assumptions.homogeneity.passed ? '만족' : '위반'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      F = {results.assumptions.homogeneity.levene.statistic.toFixed(3)},
                      p = {results.assumptions.homogeneity.levene.pValue.toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {results.assumptions.homogeneity.interpretation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 효과 크기 및 검정력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">효과 크기 및 검정력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">η² (Eta Squared)</p>
                  <p className="text-lg font-semibold">{results.etaSquared.toFixed(3)}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">ω² (Omega Squared)</p>
                  <p className="text-lg font-semibold">{results.omegaSquared.toFixed(3)}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Cohen's f</p>
                  <p className="text-lg font-semibold">{results.powerAnalysis.cohensF.toFixed(3)}</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">검정력</p>
                  <p className="text-lg font-semibold">{(results.powerAnalysis.observedPower * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </TwoPanelLayout>
  )
}
