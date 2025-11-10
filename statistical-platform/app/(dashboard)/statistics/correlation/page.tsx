'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { CorrelationVariables } from '@/types/statistics'
import { toCorrelationVariables, type VariableAssignment } from '@/types/statistics-converters'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Binary,
  Upload,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Network,
  Sparkles,
  FileText,
  Download,
  Activity,
  BarChart3
} from 'lucide-react'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'

// Data interfaces
// 로컬 인터페이스 제거: types/statistics.ts의 CorrelationVariables 사용
// interface VariableSelection {
//   variables: string[]
//   controlVariables?: string[]
// }

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

export default function CorrelationPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('correlation')
  }, [])

  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<CorrelationResults, CorrelationVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [correlationType, setCorrelationType] = useState<'pearson' | 'spearman' | 'kendall' | 'partial' | ''>('')

  // 상관분석 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '상관분석 유형 선택',
      description: '데이터 특성에 맞는 상관 방법 선택',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '상관관계를 분석할 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 확인',
      description: '상관관계 분석 결과 및 해석',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    }
  ]

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
    actions.setCurrentStep?.(1)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep?.(2)
  }, [actions])

  const handleAnalysis = useCallback(async (_variables: CorrelationVariables) => {
    try {
      actions.startAnalysis?.()

      // 시뮬레이션된 분석 (실제로는 Pyodide 사용)
      // 상관 행렬 생성
      const variables = ['Variable1', 'Variable2', 'Variable3', 'Variable4']
      const correlationMatrix = [
        [1.000, 0.823, -0.456, 0.234],
        [0.823, 1.000, -0.312, 0.178],
        [-0.456, -0.312, 1.000, 0.567],
        [0.234, 0.178, 0.567, 1.000]
      ]

      const pValueMatrix = [
        [0.000, 0.001, 0.023, 0.145],
        [0.001, 0.000, 0.045, 0.234],
        [0.023, 0.045, 0.000, 0.008],
        [0.145, 0.234, 0.008, 0.000]
      ]

      const mockResults: CorrelationResults = {
        correlationMatrix: variables.map((v1, i) =>
          variables.map((v2, j) => ({
            var1: v1,
            var2: v2,
            r: correlationMatrix[i][j],
            pValue: pValueMatrix[i][j],
            significant: pValueMatrix[i][j] < 0.05,
            strength: (Math.abs(correlationMatrix[i][j]) > 0.7 ? 'strong' :
                     Math.abs(correlationMatrix[i][j]) > 0.4 ? 'moderate' : 'weak') as 'strong' | 'moderate' | 'weak'
          }))
        ).flat(),

        pairwiseCorrelations: [
          {
            pair: 'Variable1 - Variable2',
            r: 0.823,
            pValue: 0.001,
            n: 100,
            ci: [0.756, 0.878],
            interpretation: '매우 강한 양의 상관관계'
          },
          {
            pair: 'Variable1 - Variable3',
            r: -0.456,
            pValue: 0.023,
            n: 100,
            ci: [-0.592, -0.298],
            interpretation: '중간 정도의 음의 상관관계'
          },
          {
            pair: 'Variable2 - Variable3',
            r: -0.312,
            pValue: 0.045,
            n: 100,
            ci: [-0.478, -0.123],
            interpretation: '약한 음의 상관관계'
          }
        ],

        scatterPlots: [
          {
            name: 'Variable1 vs Variable2',
            data: Array.from({ length: 50 }, () => {
              const x = Math.random() * 100
              const y = 0.823 * x + (Math.random() - 0.5) * 20
              return { x, y }
            }),
            r: 0.823,
            equation: 'y = 0.823x + 12.34'
          }
        ],

        assumptions: {
          normality: {
            shapiroWilk: variables.map(v => ({
              variable: v,
              statistic: 0.95 + Math.random() * 0.04,
              pValue: 0.05 + Math.random() * 0.4,
              normal: true
            }))
          },
          linearityTest: {
            passed: true,
            interpretation: '변수 간 선형 관계가 확인됨'
          }
        },

        sampleSize: 100,
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

      actions.completeAnalysis?.(mockResults, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [actions, correlationType])

  const handleVariableSelection = useCallback((variables: CorrelationVariables) => {
    actions.setSelectedVariables?.(variables)
    // 자동으로 분석 실행
    void handleAnalysis(variables)
  }, [actions, handleAnalysis])

  const renderMethodSelection = () => (
    <StepCard
      title="상관분석 방법 선택"
      description="데이터 특성과 연구 목적에 맞는 상관분석 방법을 선택하세요"
      icon={<Binary className="w-5 h-5 text-primary" />}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(correlationTypeInfo).map(([key, info]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "cursor-pointer border-2 transition-all h-full",
                correlationType === key
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              )}
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
          </motion.div>
        ))}
      </div>

      {correlationType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo].title} 선택됨
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            다음 단계에서 데이터를 업로드해주세요.
          </p>
        </motion.div>
      )}
    </StepCard>
  )

  const renderDataUpload = () => (
    <StepCard
      title="데이터 업로드"
      description="상관분석할 데이터 파일을 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep
        onUploadComplete={handleDataUpload}
      />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    return (
      <StepCard
        title="변수 선택"
        description="상관관계를 분석할 변수들을 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <VariableSelector
          methodId="pearson-correlation"
          data={uploadedData.data}
          onVariablesSelected={(variables: VariableAssignment) => {
            const typedVars = toCorrelationVariables(variables)
            handleVariableSelection(typedVars)
          }}
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const { pairwiseCorrelations, scatterPlots, assumptions, partialCorrelation, sampleSize } = results

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
      <StepCard
        title="상관분석 결과"
        description={`${correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo].title} 분석이 완료되었습니다`}
        icon={<Binary className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className="border-blue-500 bg-muted">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>분석 요약</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm">
                  <strong>{correlationTypeInfo[correlationType as keyof typeof correlationTypeInfo].title}</strong> 방법으로
                  <strong> {sampleSize}개</strong>의 관측치를 분석했습니다.
                </p>
                <p className="text-sm">
                  가장 강한 상관관계: <strong>{pairwiseCorrelations[0].pair}</strong>
                  (r = {pairwiseCorrelations[0].r.toFixed(3)}, p {'<'} 0.05)
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* 주요 상관관계 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주요 상관관계 분석 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pairwiseCorrelations.map((corr: PairwiseCorrelation, idx: number) => (
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
          {partialCorrelation && (
            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="text-base">편상관분석 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">통제변수</span>
                    <Badge variant="outline">{partialCorrelation.controlVariable}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">원래 상관계수</span>
                    <Badge>{partialCorrelation.originalCorrelation.toFixed(3)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">편상관계수</span>
                    <Badge variant="default">{partialCorrelation.partialCorrelation.toFixed(3)}</Badge>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">
                    {partialCorrelation.interpretation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 산점도 */}
          {scatterPlots && scatterPlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">산점도 및 추세선</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="0">
                  <TabsList>
                    {scatterPlots.map((plot: ScatterPlotData, idx: number) => (
                      <TabsTrigger key={idx} value={idx.toString()}>
                        {plot.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {scatterPlots.map((plot: ScatterPlotData, idx: number) => (
                    <TabsContent key={idx} value={idx.toString()}>
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
                    </TabsContent>
                  ))}
                </Tabs>
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
                    {assumptions.normality.shapiroWilk.map((test: NormalityTest) => (
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
                    <span className="text-sm">{assumptions.linearityTest.interpretation}</span>
                    <Badge variant={assumptions.linearityTest.passed ? "default" : "destructive"}>
                      {assumptions.linearityTest.passed ? "만족" : "위반"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => {}}>
              <FileText className="w-4 h-4 mr-2" />
              보고서 생성
            </Button>
            <Button variant="outline" onClick={() => {}}>
              <Download className="w-4 h-4 mr-2" />
              결과 다운로드
            </Button>
          </div>
        </div>
      </StepCard>
    )
  }


  return (
    <StatisticsPageLayout
      title="상관분석"
      subtitle="Correlation Analysis - 변수 간 관계의 강도와 방향 측정"
      icon={<Binary className="w-6 h-6" />}
      methodInfo={{
        formula: correlationType === 'pearson' ? 'r = Σ[(xi-x̄)(yi-ȳ)] / √[Σ(xi-x̄)²Σ(yi-ȳ)²]' :
                 correlationType === 'spearman' ? 'ρ = 1 - (6Σdi²) / [n(n²-1)]' :
                 correlationType === 'kendall' ? 'τ = (C - D) / √[(C + D + Tx)(C + D + Ty)]' :
                 'r(xy.z) = [r(xy) - r(xz)r(yz)] / √[(1-r²(xz))(1-r²(yz))]',
        assumptions: correlationType === 'pearson' ? ['정규성', '선형성', '등분산성'] :
                     correlationType === 'spearman' ? ['단조성', '순서척도 이상'] :
                     correlationType === 'kendall' ? ['순서척도', '작은 표본 적합'] :
                     ['선형성', '정규성', '통제변수 필요'],
        sampleSize: correlationType === 'kendall' ? '소표본(n<30)도 가능' : '최소 30개 이상 권장',
        usage: correlationType === 'partial' ? '제3변수 영향 제거 후 순수 관계' :
               '두 변수 간 관계의 강도와 방향 파악'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      onRun={() => {
        if (selectedVariables) {
          void handleAnalysis(selectedVariables)
        }
      }}
      onReset={() => {
        actions.reset?.()
        setCorrelationType('')
      }}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {currentStep === 0 && renderMethodSelection()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}