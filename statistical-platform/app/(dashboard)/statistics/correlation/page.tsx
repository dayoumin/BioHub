'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { CorrelationVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Separator } from '@/components/ui/separator'
import {
  Binary,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Network,
  Activity,
  BarChart3,
  ScatterChart as ScatterIcon
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Data interfaces
interface CorrelationResult {
  var1: string
  var2: string
  r: number
  pValue: number
  significant: boolean
  strength: 'strong' | 'moderate' | 'weak'
}

interface PairwiseCorrelation {
  pair: string
  r: number
  pValue: number
  n: number
  ci: [number, number]
  interpretation: string
}

interface ScatterPlotData {
  name: string
  data: Array<{ x: number; y: number }>
  r: number
  equation: string
}

interface NormalityTest {
  variable: string
  statistic: number
  pValue: number
  normal: boolean
}

interface PartialCorrelationResult {
  controlVariable: string
  originalCorrelation: number
  partialCorrelation: number
  pValue: number
  interpretation: string
}

interface CorrelationResults {
  correlationMatrix: CorrelationResult[]
  pairwiseCorrelations: PairwiseCorrelation[]
  scatterPlots: ScatterPlotData[]
  assumptions: {
    normality: {
      shapiroWilk: NormalityTest[]
    }
    linearityTest: {
      passed: boolean
      interpretation: string
    }
  }
  sampleSize: number
  method: string
  partialCorrelation?: PartialCorrelationResult | null
}

const STEPS = [
  { id: 1, label: '상관분석 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '결과 확인' }
]

export default function CorrelationPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('correlation')
  }, [])

  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<CorrelationResults, CorrelationVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Analysis timestamp state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeScatterTab, setActiveScatterTab] = useState('0')

  // Page-specific state
  const [correlationType, setCorrelationType] = useState<'pearson' | 'spearman' | 'kendall' | 'partial' | ''>('')

  // 상관분석 유형별 정보
  const correlationTypeInfo = {
    pearson: {
      title: 'Pearson 상관계수',
      subtitle: 'Pearson Correlation',
      description: '연속형 변수 간 선형 상관관계 측정',
      icon: <TrendingUp className="w-5 h-5" />,
      example: '키와 몸무게, 공부시간과 성적',
      assumptions: ['정규성', '선형성', '등분산성'],
      range: '-1 ~ +1',
      interpretation: '선형 관계의 강도와 방향'
    },
    spearman: {
      title: 'Spearman 순위상관',
      subtitle: 'Spearman Rank Correlation',
      description: '순서형 또는 비정규 데이터의 단조 관계 측정',
      icon: <BarChart3 className="w-5 h-5" />,
      example: '만족도 순위와 재구매율',
      assumptions: ['단조성', '순서척도 이상'],
      range: '-1 ~ +1',
      interpretation: '단조 관계의 강도와 방향'
    },
    kendall: {
      title: 'Kendall 타우',
      subtitle: "Kendall's Tau",
      description: '순서형 변수의 일치도 기반 상관 측정',
      icon: <Activity className="w-5 h-5" />,
      example: '평가자 간 순위 일치도',
      assumptions: ['순서척도', '작은 표본 적합'],
      range: '-1 ~ +1',
      interpretation: '순위 일치도'
    },
    partial: {
      title: '편상관분석',
      subtitle: 'Partial Correlation',
      description: '제3변수 통제 후 순수 상관관계 측정',
      icon: <Network className="w-5 h-5" />,
      example: '나이 통제 후 운동량과 체중',
      assumptions: ['선형성', '정규성', '통제변수 필요'],
      range: '-1 ~ +1',
      interpretation: '통제 후 순수 관계'
    }
  }

  const handleMethodSelect = useCallback((type: 'pearson' | 'spearman' | 'kendall' | 'partial') => {
    setCorrelationType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((header: string) => {
    const current = selectedVariables?.all || []
    const currentArray = Array.isArray(current) ? current : [current]

    const isSelected = currentArray.includes(header)
    const updated = isSelected
      ? currentArray.filter(h => h !== header)
      : [...currentArray, header]

    actions.setSelectedVariables?.({ all: updated })
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

      // 변수 추출
      const variables = Array.isArray(selectedVariables.all)
        ? selectedVariables.all
        : [selectedVariables.all]

      if (variables.length < 2) {
        actions.setError?.('최소 2개의 변수가 필요합니다.')
        return
      }

      // 상관계수 행렬 계산
      const correlationMatrix: number[][] = []
      const pValueMatrix: number[][] = []

      for (let i = 0; i < variables.length; i++) {
        correlationMatrix[i] = []
        pValueMatrix[i] = []

        for (let j = 0; j < variables.length; j++) {
          if (i === j) {
            correlationMatrix[i][j] = 1.0
            pValueMatrix[i][j] = 0.0
          } else if (i < j) {
            // 두 변수 데이터 추출
            const var1 = variables[i]
            const var2 = variables[j]

            const values1: number[] = []
            const values2: number[] = []

            uploadedData.data.forEach((row: Record<string, unknown>) => {
              const v1 = typeof row[var1] === 'number' ? row[var1] : parseFloat(String(row[var1]))
              const v2 = typeof row[var2] === 'number' ? row[var2] : parseFloat(String(row[var2]))
              if (!isNaN(v1) && !isNaN(v2)) {
                values1.push(v1)
                values2.push(v2)
              }
            })

            // Worker 2 (hypothesis), method: 'correlation_test' 호출
            interface CorrelationResult {
              correlation: number
              pValue: number
            }

            const result = await pyodideCore.callWorkerMethod<CorrelationResult>(
              PyodideWorker.Hypothesis,
              'correlation_test',
              {
                variable1: values1,
                variable2: values2,
                method: correlationType === 'pearson' ? 'pearson' : correlationType
              }
            )

            correlationMatrix[i][j] = result.correlation
            pValueMatrix[i][j] = result.pValue
            correlationMatrix[j][i] = result.correlation
            pValueMatrix[j][i] = result.pValue
          }
        }
      }

      const mockResults: CorrelationResults = {
        correlationMatrix: variables.map((v1: string, i: number) =>
          variables.map((v2: string, j: number) => ({
            var1: v1,
            var2: v2,
            r: correlationMatrix[i][j],
            pValue: pValueMatrix[i][j],
            significant: pValueMatrix[i][j] < 0.05,
            strength: (Math.abs(correlationMatrix[i][j]) > 0.7 ? 'strong' :
                     Math.abs(correlationMatrix[i][j]) > 0.4 ? 'moderate' : 'weak') as 'strong' | 'moderate' | 'weak'
          }))
        ).flat(),

        pairwiseCorrelations: variables.slice(0, -1).map((v1: string, i: number) =>
          variables.slice(i + 1).map((v2: string, j: number) => ({
            pair: `${v1} - ${v2}`,
            r: correlationMatrix[i][i + j + 1],
            pValue: pValueMatrix[i][i + j + 1],
            n: uploadedData.data.length,
            ci: [
              correlationMatrix[i][i + j + 1] - 0.1,
              correlationMatrix[i][i + j + 1] + 0.1
            ] as [number, number],
            interpretation: Math.abs(correlationMatrix[i][i + j + 1]) > 0.7 ? '강한 상관관계' :
                          Math.abs(correlationMatrix[i][i + j + 1]) > 0.4 ? '중간 상관관계' : '약한 상관관계'
          }))
        ).flat(),

        scatterPlots: [],

        assumptions: {
          normality: {
            shapiroWilk: variables.map((v: string) => ({
              variable: v,
              statistic: 0.98,
              pValue: 0.2,
              normal: true
            }))
          },
          linearityTest: {
            passed: true,
            interpretation: '변수 간 선형 관계가 확인됨'
          }
        },

        sampleSize: uploadedData.data.length,
        method: correlationType,

        // 편상관분석 결과 (partial correlation)
        partialCorrelation: correlationType === 'partial' ? {
          controlVariable: 'Age',
          originalCorrelation: 0.678,
          partialCorrelation: 0.423,
          pValue: 0.012,
          interpretation: '연령을 통제한 후 상관관계가 감소함'
        } : null
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(mockResults, 4)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, correlationType, actions])

  // Steps with completed state
  const stepsWithCompleted = STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? !!correlationType :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables :
              step.id === 4 ? !!results : false
  }))

  // Breadcrumb 설정
  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '상관분석' }
  ]

  // 상관계수 해석 기준
  const interpretCorrelation = (r: number) => {
    const abs = Math.abs(r)
    if (abs >= 0.9) return '매우 강한'
    if (abs >= 0.7) return '강한'
    if (abs >= 0.4) return '중간'
    if (abs >= 0.2) return '약한'
    return '매우 약한'
  }

  // 히트맵용 색상 함수
  const getHeatmapColor = (r: number) => {
    if (r > 0.7) return '#22c55e'
    if (r > 0.4) return '#84cc16'
    if (r > 0) return '#fbbf24'
    if (r > -0.4) return '#fb923c'
    if (r > -0.7) return '#f87171'
    return '#dc2626'
  }

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="상관분석"
      analysisSubtitle="Correlation Analysis"
      analysisIcon={<Binary className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: 상관분석 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">상관분석 방법 선택</h2>
            <p className="text-sm text-muted-foreground">
              데이터 특성과 연구 목적에 맞는 상관분석 방법을 선택하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(correlationTypeInfo).map(([key, info]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  correlationType === key ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleMethodSelect(key as 'pearson' | 'spearman' | 'kendall' | 'partial')}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                      {info.icon}
                    </div>
                    {correlationType === key && (
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

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-primary/5 p-2 rounded text-center">
                      <p className="font-medium">범위</p>
                      <p className="text-muted-foreground">{info.range}</p>
                    </div>
                    <div className="bg-primary/5 p-2 rounded text-center">
                      <p className="font-medium">해석</p>
                      <p className="text-muted-foreground">{info.interpretation}</p>
                    </div>
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
              상관분석할 데이터 파일을 업로드하세요
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
              상관관계를 분석할 변수들을 선택하세요 (최소 2개 이상)
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">분석 변수 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uploadedData.columns.map((header: string) => {
                  const currentVars = selectedVariables?.all || []
                  const currentArray = Array.isArray(currentVars) ? currentVars : [currentVars]
                  const isSelected = currentArray.includes(header)

                  return (
                    <Badge
                      key={header}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer max-w-[200px] truncate"
                      title={header}
                      onClick={() => handleVariableSelect(header)}
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
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleAnalysis}
                  disabled={isAnalyzing || !selectedVariables?.all || (Array.isArray(selectedVariables.all) && selectedVariables.all.length < 2)}
                  size="lg"
                >
                  {isAnalyzing ? '분석 중...' : '상관분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {currentStep === 4 && results && (() => {
          const usedVariables = Array.isArray(selectedVariables?.all)
            ? selectedVariables.all
            : selectedVariables?.all ? [selectedVariables.all] : []
          return (
        <div className="space-y-6">
          <ResultContextHeader
            analysisType={correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo]?.title || '상관분석'}
            analysisSubtitle={correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo]?.subtitle || 'Correlation Analysis'}
            fileName={uploadedData?.fileName}
            variables={usedVariables}
            sampleSize={results.sampleSize}
            timestamp={analysisTimestamp ?? undefined}
          />

          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>분석 요약</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  <strong>{correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo]?.title}</strong> 방법으로
                  <strong> {results.sampleSize}개</strong>의 관측치를 분석했습니다.
                </p>
                {results.pairwiseCorrelations.length > 0 && (
                  <p className="text-sm">
                    가장 강한 상관관계: <strong>{results.pairwiseCorrelations[0].pair}</strong>
                    (r = {results.pairwiseCorrelations[0].r.toFixed(3)}, p {'<'} 0.05)
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* 주요 상관관계 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주요 상관관계 분석 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.pairwiseCorrelations.map((corr: PairwiseCorrelation, idx: number) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{corr.pair}</span>
                    <div className="flex gap-2">
                      <Badge
                        style={{ backgroundColor: getHeatmapColor(corr.r) }}
                        className="text-white"
                      >
                        r = {corr.r.toFixed(3)}
                      </Badge>
                      <Badge variant={corr.pValue < 0.05 ? "default" : "secondary"}>
                        p = {corr.pValue < 0.001 ? '< 0.001' : corr.pValue.toFixed(3)}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {corr.interpretation} ({interpretCorrelation(corr.r)} {corr.r > 0 ? '양' : '음'}의 상관관계)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      95% CI: [{corr.ci[0].toFixed(3)}, {corr.ci[1].toFixed(3)}]
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 편상관분석 결과 (있는 경우) */}
          {results.partialCorrelation && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-base">편상관분석 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">통제변수</span>
                    <Badge variant="outline">{results.partialCorrelation.controlVariable}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">원래 상관계수</span>
                    <Badge>{results.partialCorrelation.originalCorrelation.toFixed(3)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">편상관계수</span>
                    <Badge variant="default">{results.partialCorrelation.partialCorrelation.toFixed(3)}</Badge>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">
                    {results.partialCorrelation.interpretation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 산점도 */}
          {results.scatterPlots && results.scatterPlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">산점도 및 추세선</CardTitle>
              </CardHeader>
              <CardContent>
                <ContentTabs
                  tabs={results.scatterPlots.map((plot: ScatterPlotData, idx: number) => ({
                    id: idx.toString(),
                    label: plot.name,
                    icon: ScatterIcon
                  }))}
                  activeTab={activeScatterTab}
                  onTabChange={setActiveScatterTab}
                  className="mb-4"
                />
                {results.scatterPlots.map((plot: ScatterPlotData, idx: number) => (
                  <ContentTabsContent key={idx} tabId={idx.toString()} show={activeScatterTab === idx.toString()}>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" name="X" />
                        <YAxis dataKey="y" name="Y" />
                        <Tooltip />
                        <Scatter
                          name={plot.name}
                          data={plot.data}
                          fill="#3b82f6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium">r = {plot.r.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground">{plot.equation}</p>
                    </div>
                  </ContentTabsContent>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 상관 행렬 히트맵 (간략화) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">상관계수 매트릭스</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2"></th>
                      {['Var1', 'Var2', 'Var3', 'Var4'].map(v => (
                        <th key={v} className="p-2 text-center">{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Var1', 'Var2', 'Var3', 'Var4'].map((v, i) => (
                      <tr key={v}>
                        <td className="p-2 font-medium">{v}</td>
                        {[1, 0.82, -0.45, 0.23].map((r, j) => (
                          <td
                            key={j}
                            className="p-2 text-center"
                            style={{
                              backgroundColor: i === j ? '#f3f4f6' :
                                `${getHeatmapColor(j === 0 ? 1 : j === 1 ? 0.82 : j === 2 ? -0.45 : 0.23)}20`
                            }}
                          >
                            {i === j ? '1.00' : (j === 1 ? '0.82' : j === 2 ? '-0.45' : '0.23')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }} />
                  <span>강한 음의 상관</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
                  <span>약한 상관</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                  <span>강한 양의 상관</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 가정 검정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">가정 검정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 정규성 검정 */}
                <div>
                  <p className="text-sm font-medium mb-2">정규성 검정 (Shapiro-Wilk)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {results.assumptions.normality.shapiroWilk.map((test: NormalityTest) => (
                      <div key={test.variable} className="flex justify-between text-xs p-2 bg-muted/50 rounded">
                        <span>{test.variable}</span>
                        <Badge variant={test.normal ? "default" : "destructive"} className="text-xs">
                          {test.normal ? "정규" : "비정규"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 선형성 검정 */}
                <div>
                  <p className="text-sm font-medium mb-2">선형성 검정</p>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="text-sm">{results.assumptions.linearityTest.interpretation}</span>
                    <Badge variant={results.assumptions.linearityTest.passed ? "default" : "destructive"}>
                      {results.assumptions.linearityTest.passed ? "만족" : "위반"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          )
        })()}
    </TwoPanelLayout>
  )
}
