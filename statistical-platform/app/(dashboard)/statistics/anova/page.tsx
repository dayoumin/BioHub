'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  BarChart3,
  Upload,
  ChevronRight,
  Play,
  Info,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Layers,
  GitBranch,
  Network,
  Sparkles,
  FileText,
  Download
} from 'lucide-react'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { ProfessionalVariableSelector } from '@/components/variable-selection/ProfessionalVariableSelector'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BoxPlot, LineChart, Line, Dot } from 'recharts'
import { cn } from '@/lib/utils'

export default function ANOVAPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [anovaType, setAnovaType] = useState<'oneWay' | 'twoWay' | 'repeated' | ''>('')
  const [uploadedData, setUploadedData] = useState<any>(null)
  const [selectedVariables, setSelectedVariables] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)

  // ANOVA 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: 'ANOVA 유형 선택',
      description: '분석 목적에 맞는 ANOVA 방법 선택',
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
      description: '종속변수와 요인 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 확인',
      description: '분석 결과 및 해석',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    }
  ]

  // ANOVA 유형별 정보
  const anovaTypeInfo = {
    oneWay: {
      title: '일원 분산분석',
      subtitle: 'One-way ANOVA',
      description: '하나의 독립변수(요인)가 종속변수에 미치는 영향 검정',
      icon: <GitBranch className="w-5 h-5" />,
      example: '서로 다른 교육 방법(A, B, C)이 시험 성적에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 3
    },
    twoWay: {
      title: '이원 분산분석',
      subtitle: 'Two-way ANOVA',
      description: '두 개의 독립변수와 상호작용이 종속변수에 미치는 영향 검정',
      icon: <Network className="w-5 h-5" />,
      example: '교육 방법(A, B)과 성별(남, 여)이 시험 성적에 미치는 영향',
      assumptions: ['정규성', '등분산성', '독립성'],
      minGroups: 2
    },
    repeated: {
      title: '반복측정 분산분석',
      subtitle: 'Repeated Measures ANOVA',
      description: '동일한 대상에서 반복 측정한 데이터의 평균 차이 검정',
      icon: <Layers className="w-5 h-5" />,
      example: '동일한 환자의 치료 전, 1주 후, 1개월 후 혈압 변화',
      assumptions: ['정규성', '구형성', '독립성'],
      minMeasures: 3
    }
  }

  const handleMethodSelect = (type: 'oneWay' | 'twoWay' | 'repeated') => {
    setAnovaType(type)
    setCurrentStep(1)
  }

  const handleDataUpload = (data: any) => {
    setUploadedData(data)
    setCurrentStep(2)
  }

  const handleVariableSelection = (variables: any) => {
    setSelectedVariables(variables)
    // 자동으로 분석 실행
    handleAnalysis(variables)
  }

  const handleAnalysis = async (variables: any) => {
    setIsAnalyzing(true)

    // 시뮬레이션된 분석 (실제로는 Pyodide 사용)
    setTimeout(() => {
      const mockResults = {
        fStatistic: 15.234,
        pValue: 0.00012,
        dfBetween: 2,
        dfWithin: 27,
        msBetween: 124.5,
        msWithin: 8.17,
        etaSquared: 0.531,
        omegaSquared: 0.512,
        powerAnalysis: {
          observedPower: 0.998,
          effectSize: 'large',
          cohensF: 0.87
        },
        groups: [
          { name: 'Group A', mean: 75.2, std: 8.3, n: 10, se: 2.62, ci: [69.8, 80.6] },
          { name: 'Group B', mean: 82.7, std: 7.1, n: 10, se: 2.24, ci: [77.9, 87.5] },
          { name: 'Group C', mean: 91.3, std: 6.8, n: 10, se: 2.15, ci: [86.8, 95.8] }
        ],
        postHoc: {
          method: 'Tukey HSD',
          comparisons: [
            { group1: 'Group A', group2: 'Group B', diff: -7.5, pValue: 0.042, ci: [-14.2, -0.8], significant: true },
            { group1: 'Group A', group2: 'Group C', diff: -16.1, pValue: 0.0001, ci: [-22.8, -9.4], significant: true },
            { group1: 'Group B', group2: 'Group C', diff: -8.6, pValue: 0.018, ci: [-15.3, -1.9], significant: true }
          ],
          adjustedAlpha: 0.05
        },
        assumptions: {
          normality: {
            shapiroWilk: { statistic: 0.965, pValue: 0.421 },
            passed: true,
            interpretation: '정규성 가정을 만족합니다'
          },
          homogeneity: {
            levene: { statistic: 1.234, pValue: 0.307 },
            passed: true,
            interpretation: '등분산성 가정을 만족합니다'
          }
        },
        anovaTable: [
          { source: 'Between Groups', ss: 249, df: 2, ms: 124.5, f: 15.234, p: 0.00012 },
          { source: 'Within Groups', ss: 220.6, df: 27, ms: 8.17, f: null, p: null },
          { source: 'Total', ss: 469.6, df: 29, ms: null, f: null, p: null }
        ]
      }

      setAnalysisResults(mockResults)
      setCurrentStep(3)
      setIsAnalyzing(false)
    }, 2000)
  }

  const renderMethodSelection = () => (
    <StepCard
      title="ANOVA 분석 방법 선택"
      description="데이터 구조와 연구 목적에 맞는 ANOVA 방법을 선택하세요"
      icon={<BarChart3 className="w-5 h-5 text-primary" />}
    >
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(anovaTypeInfo).map(([key, info]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "cursor-pointer border-2 transition-all",
                anovaType === key
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              )}
              onClick={() => handleMethodSelect(key as 'oneWay' | 'twoWay' | 'repeated')}
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
                  <p className="text-xs font-medium mb-1">예시:</p>
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
          </motion.div>
        ))}
      </div>

      {anovaType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {anovaTypeInfo[anovaType].title} 선택됨
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
      description="분산 분석할 데이터 파일을 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep onNext={handleDataUpload} />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements(
      anovaType === 'oneWay' ? 'oneWayANOVA' :
      anovaType === 'twoWay' ? 'twoWayANOVA' :
      'repeatedMeasuresANOVA'
    )

    // 변수 타입 자동 감지
    const columns = Object.keys(uploadedData.data[0] || {})
    const variables = columns.map(col => ({
      name: col,
      type: detectVariableType(
        uploadedData.data.map((row: any) => row[col]),
        col
      ),
      stats: {
        missing: 0,
        unique: [...new Set(uploadedData.data.map((row: any) => row[col]))].length,
        min: Math.min(...uploadedData.data.map((row: any) => Number(row[col]) || 0)),
        max: Math.max(...uploadedData.data.map((row: any) => Number(row[col]) || 0))
      }
    }))

    return (
      <StepCard
        title="변수 선택"
        description="분산분석에 사용할 종속변수와 요인을 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <ProfessionalVariableSelector
          variables={variables}
          requirements={requirements}
          onSelectionChange={handleVariableSelection}
          methodName={anovaTypeInfo[anovaType].title}
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!analysisResults) return null

    const { groups, postHoc, assumptions, anovaTable, powerAnalysis } = analysisResults

    // 그룹 평균 비교 차트 데이터
    const groupMeansData = groups.map((g: any) => ({
      name: g.name,
      mean: g.mean,
      ci_lower: g.ci[0],
      ci_upper: g.ci[1]
    }))

    // 사후검정 히트맵 데이터
    const postHocMatrix = postHoc.comparisons.map((c: any) => ({
      comparison: `${c.group1} vs ${c.group2}`,
      difference: c.diff,
      pValue: c.pValue,
      significant: c.significant ? '유의함' : '유의하지 않음'
    }))

    return (
      <StepCard
        title="분산분석 결과"
        description="ANOVA 분석이 완료되었습니다"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className={analysisResults.pValue < 0.05 ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>분석 결과</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  F({analysisResults.dfBetween}, {analysisResults.dfWithin}) = {analysisResults.fStatistic.toFixed(3)},
                  p = {analysisResults.pValue.toFixed(4)}
                </p>
                <p>
                  {analysisResults.pValue < 0.05
                    ? "✅ 그룹 간 평균에 통계적으로 유의한 차이가 있습니다 (p < 0.05)"
                    : "❌ 그룹 간 평균에 통계적으로 유의한 차이가 없습니다 (p ≥ 0.05)"}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* ANOVA 표 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ANOVA Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Source</th>
                      <th className="text-right py-2">SS</th>
                      <th className="text-right py-2">df</th>
                      <th className="text-right py-2">MS</th>
                      <th className="text-right py-2">F</th>
                      <th className="text-right py-2">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anovaTable.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{row.source}</td>
                        <td className="text-right">{row.ss.toFixed(2)}</td>
                        <td className="text-right">{row.df}</td>
                        <td className="text-right">{row.ms ? row.ms.toFixed(2) : '-'}</td>
                        <td className="text-right">{row.f ? row.f.toFixed(3) : '-'}</td>
                        <td className="text-right">
                          {row.p !== null ? (
                            <Badge variant={row.p < 0.05 ? "default" : "secondary"}>
                              {row.p < 0.001 ? '< 0.001' : row.p.toFixed(4)}
                            </Badge>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 그룹 평균 시각화 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">그룹별 평균 및 95% 신뢰구간</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupMeansData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="mean" fill="#3b82f6" />
                  {/* 에러바는 커스텀 렌더링 필요 */}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 사후검정 결과 */}
          {analysisResults.pValue < 0.05 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">사후검정 결과 (Tukey HSD)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {postHoc.comparisons.map((comp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {comp.group1} vs {comp.group2}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          평균 차이: {comp.diff.toFixed(2)} [{comp.ci[0].toFixed(2)}, {comp.ci[1].toFixed(2)}]
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={comp.significant ? "default" : "secondary"}>
                          p = {comp.pValue.toFixed(4)}
                        </Badge>
                        <p className="text-xs mt-1">
                          {comp.significant ? "유의함 ✓" : "유의하지 않음"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 효과크기 및 검정력 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">효과크기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Eta-squared (η²)</span>
                  <Badge>{analysisResults.etaSquared.toFixed(3)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Omega-squared (ω²)</span>
                  <Badge>{analysisResults.omegaSquared.toFixed(3)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cohen's f</span>
                  <Badge>{powerAnalysis.cohensF.toFixed(3)}</Badge>
                </div>
                <Separator className="my-2" />
                <p className="text-xs text-muted-foreground">
                  효과크기: <strong>{powerAnalysis.effectSize}</strong>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">가정 검정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">정규성 (Shapiro-Wilk)</span>
                    <Badge variant={assumptions.normality.passed ? "default" : "destructive"}>
                      {assumptions.normality.passed ? "만족" : "위반"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    W = {assumptions.normality.shapiroWilk.statistic.toFixed(3)},
                    p = {assumptions.normality.shapiroWilk.pValue.toFixed(3)}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">등분산성 (Levene)</span>
                    <Badge variant={assumptions.homogeneity.passed ? "default" : "destructive"}>
                      {assumptions.homogeneity.passed ? "만족" : "위반"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    F = {assumptions.homogeneity.levene.statistic.toFixed(3)},
                    p = {assumptions.homogeneity.levene.pValue.toFixed(3)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

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
      title="ANOVA 분산분석"
      subtitle="Analysis of Variance - 세 개 이상 그룹의 평균 비교"
      icon={<BarChart3 className="w-6 h-6" />}
      methodInfo={{
        formula: 'F = MS_between / MS_within',
        assumptions: ['정규성', '등분산성', '독립성', '무작위 표집'],
        sampleSize: '각 그룹 최소 20개 이상 권장',
        usage: '여러 그룹 간 평균 차이 검정'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onRun={() => handleAnalysis(selectedVariables)}
      onReset={() => {
        setCurrentStep(0)
        setAnovaType('')
        setUploadedData(null)
        setSelectedVariables(null)
        setAnalysisResults(null)
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