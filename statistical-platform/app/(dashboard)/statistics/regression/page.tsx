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
  TrendingUp,
  Upload,
  ChevronRight,
  Play,
  Info,
  AlertCircle,
  CheckCircle,
  LineChart,
  Users,
  Layers,
  GitBranch,
  Network,
  Sparkles,
  FileText,
  Download,
  Target,
  Activity,
  Binary
} from 'lucide-react'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, ComposedChart } from 'recharts'
import { cn } from '@/lib/utils'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

type LinearRegressionResults = {
  coefficients: Array<{ name: string; estimate: number; stdError: number; tValue: number; pValue: number; ci: number[] }>
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  fPValue: number
  residualStdError: number
  scatterData: Array<{ x: number; y: number; predicted: number }>
  residualPlot: Array<{ fitted: number; residual: number; standardized: number }>
  vif?: Array<{ variable: string; vif: number }> | null
}

type LogisticRegressionResults = {
  coefficients: Array<{ name: string; estimate: number; stdError: number; zValue: number; pValue: number; oddsRatio: number }>
  modelFit: { aic: number; bic: number; mcFaddenR2: number; accuracy: number; sensitivity: number; specificity: number; auc: number }
  confusionMatrix: { tp: number; fp: number; tn: number; fn: number; precision: number; recall: number; f1Score: number }
  rocCurve: Array<{ fpr: number; tpr: number }>
}

type RegressionResults = LinearRegressionResults | LogisticRegressionResults

type RegressionVariables = {
  dependent: string
  independent: string[]
}

export default function RegressionPage() {
  // Custom hook: common state management
  const { state, actions } = useStatisticsPage<RegressionResults, RegressionVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, error, isAnalyzing } = state

  // Page-specific state
  const [regressionType, setRegressionType] = useState<'simple' | 'multiple' | 'logistic' | ''>('')

  // 회귀분석 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '회귀 유형 선택',
      description: '분석 목적에 맞는 회귀 방법 선택',
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
      description: '종속변수와 독립변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 확인',
      description: '분석 결과 및 모델 평가',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    }
  ]

  // 회귀분석 유형별 정보
  const regressionTypeInfo = {
    simple: {
      title: '단순 선형 회귀',
      subtitle: 'Simple Linear Regression',
      description: '하나의 독립변수로 종속변수를 예측하는 모델',
      icon: <TrendingUp className="w-5 h-5" />,
      example: '공부 시간(X)으로 시험 점수(Y) 예측',
      assumptions: ['선형성', '정규성', '등분산성', '독립성'],
      equation: 'Y = β₀ + β₁X + ε'
    },
    multiple: {
      title: '다중 회귀분석',
      subtitle: 'Multiple Regression',
      description: '여러 독립변수로 종속변수를 예측하는 모델',
      icon: <Network className="w-5 h-5" />,
      example: '나이, 경력, 교육수준으로 연봉 예측',
      assumptions: ['선형성', '정규성', '등분산성', '독립성', '다중공선성 없음'],
      equation: 'Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε'
    },
    logistic: {
      title: '로지스틱 회귀',
      subtitle: 'Logistic Regression',
      description: '이진 분류를 위한 확률 예측 모델',
      icon: <Binary className="w-5 h-5" />,
      example: '환자 특성으로 질병 발생 여부 예측',
      assumptions: ['독립성', '선형성(로짓)', '큰 표본'],
      equation: 'log(p/(1-p)) = β₀ + β₁X₁ + ... + βₖXₖ'
    }
  }

  // Helper function: Extract value from unknown row object
  const extractRowValue = (row: unknown, col: string): unknown => {
    if (typeof row === 'object' && row !== null && col in row) {
      return (row as Record<string, unknown>)[col]
    }
    return undefined
  }

  const handleMethodSelect = (type: 'simple' | 'multiple' | 'logistic') => {
    setRegressionType(type)
    actions.setCurrentStep?.(1)
  }

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(2)
    },
    'regression'
  )

  const handleVariableSelection = createVariableSelectionHandler<RegressionVariables | null>(
    actions.setSelectedVariables,
    (variables) => {
      // 자동으로 분석 실행
      handleAnalysis(variables)
    },
    'regression'
  )

  const handleAnalysis = async (variables: unknown) => {
    if (!uploadedData) {
      actions.setError?.('데이터를 먼저 업로드해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      // 시뮬레이션된 분석 (실제로는 Pyodide 사용)
      const mockResults = regressionType === 'logistic' ? {
        // 로지스틱 회귀 결과
        coefficients: [
          { name: '(Intercept)', estimate: -3.45, stdError: 0.87, zValue: -3.97, pValue: 0.00007, oddsRatio: 0.032 },
          { name: 'Age', estimate: 0.042, stdError: 0.012, zValue: 3.50, pValue: 0.0005, oddsRatio: 1.043 },
          { name: 'BMI', estimate: 0.089, stdError: 0.025, zValue: 3.56, pValue: 0.0004, oddsRatio: 1.093 }
        ],
        modelFit: {
          aic: 234.5,
          bic: 245.7,
          mcFaddenR2: 0.342,
          accuracy: 0.843,
          sensitivity: 0.812,
          specificity: 0.871,
          auc: 0.892
        },
        confusionMatrix: {
          tp: 65, fp: 10, tn: 68, fn: 15,
          precision: 0.867,
          recall: 0.812,
          f1Score: 0.838
        },
        rocCurve: [
          { fpr: 0, tpr: 0 },
          { fpr: 0.1, tpr: 0.65 },
          { fpr: 0.2, tpr: 0.78 },
          { fpr: 0.3, tpr: 0.85 },
          { fpr: 0.5, tpr: 0.92 },
          { fpr: 0.7, tpr: 0.96 },
          { fpr: 1, tpr: 1 }
        ]
      } : {
        // 선형 회귀 결과
        coefficients: regressionType === 'simple' ? [
          { name: '(Intercept)', estimate: 12.34, stdError: 2.45, tValue: 5.04, pValue: 0.00001, ci: [7.5, 17.2] },
          { name: 'StudyHours', estimate: 8.75, stdError: 1.23, tValue: 7.11, pValue: 0.000001, ci: [6.3, 11.2] }
        ] : [
          { name: '(Intercept)', estimate: 5.67, stdError: 3.21, tValue: 1.77, pValue: 0.082, ci: [-0.7, 12.0] },
          { name: 'Experience', estimate: 2.34, stdError: 0.45, tValue: 5.20, pValue: 0.00001, ci: [1.5, 3.2] },
          { name: 'Education', estimate: 4.56, stdError: 0.78, tValue: 5.85, pValue: 0.000001, ci: [3.0, 6.1] },
          { name: 'Age', estimate: 0.89, stdError: 0.32, tValue: 2.78, pValue: 0.007, ci: [0.3, 1.5] }
        ],
        rSquared: regressionType === 'simple' ? 0.623 : 0.784,
        adjustedRSquared: regressionType === 'simple' ? 0.619 : 0.773,
        fStatistic: regressionType === 'simple' ? 50.52 : 36.78,
        fPValue: 0.000001,
        residualStdError: 8.92,
        durbinWatson: 1.98,
        vif: regressionType === 'multiple' ? [
          { variable: 'Experience', vif: 1.23 },
          { variable: 'Education', vif: 1.45 },
          { variable: 'Age', vif: 2.01 }
        ] : null,
        scatterData: Array.from({ length: 50 }, (_, i) => {
          const x = Math.random() * 10
          const y = 12.34 + 8.75 * x + (Math.random() - 0.5) * 10
          return { x, y, predicted: 12.34 + 8.75 * x }
        }),
        residualPlot: Array.from({ length: 50 }, (_, i) => ({
          fitted: i * 2,
          residual: (Math.random() - 0.5) * 10,
          standardized: (Math.random() - 0.5) * 3
        }))
      }

      actions.completeAnalysis?.(mockResults, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('Analysis error:', err)
      actions.setError?.(errorMessage)
    }
  }

  const renderMethodSelection = () => (
    <StepCard
      title="회귀분석 방법 선택"
      description="예측 목적과 변수 특성에 맞는 회귀 방법을 선택하세요"
      icon={<TrendingUp className="w-5 h-5 text-primary" />}
    >
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(regressionTypeInfo).map(([key, info]) => (
          <motion.div
            key={key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "cursor-pointer border-2 transition-all",
                regressionType === key
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border hover:border-primary/50 hover:shadow-md"
              )}
              onClick={() => handleMethodSelect(key as 'simple' | 'multiple' | 'logistic')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                    {info.icon}
                  </div>
                  {regressionType === key && (
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

                <div className="bg-primary/5 p-2 rounded text-center">
                  <code className="text-xs font-mono">{info.equation}</code>
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

      {regressionType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {regressionType && regressionTypeInfo[regressionType as 'simple' | 'multiple' | 'logistic']?.title} 선택됨
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
      description="회귀분석할 데이터 파일을 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onNext={() => {}}
      />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    // 변수 타입 자동 감지 (Helper 함수 사용)
    const columns = Object.keys(uploadedData.data[0] || {})
    const variables = columns.map(col => ({
      name: col,
      type: detectVariableType(
        uploadedData.data.map((row: unknown) => extractRowValue(row, col)),
        col
      ),
      stats: {
        missing: 0,
        unique: [...new Set(uploadedData.data.map((row: unknown) => extractRowValue(row, col)))].length,
        min: Math.min(...uploadedData.data.map((row: unknown) => Number(extractRowValue(row, col)) || 0)),
        max: Math.max(...uploadedData.data.map((row: unknown) => Number(extractRowValue(row, col)) || 0))
      }
    }))

    return (
      <StepCard
        title="변수 선택"
        description="회귀분석에 사용할 종속변수와 독립변수를 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <VariableSelector
          methodId={regressionType === 'simple' ? 'simple-regression' :
                    regressionType === 'multiple' ? 'multiple-regression' :
                    'logistic-regression'}
          data={uploadedData.data}
          onVariablesSelected={(vars) => handleVariableSelection(vars as RegressionVariables | null)}
        />
      </StepCard>
    )
  }

  const renderLinearResults = () => {
    if (!results) return null

    const linearResults = results as LinearRegressionResults
    const { coefficients, rSquared, adjustedRSquared, fStatistic, fPValue, residualStdError, scatterData, residualPlot, vif } = linearResults

    return (
      <div className="space-y-6">
        {/* 모델 요약 */}
        <Alert className="border-green-500 bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>모델 요약</AlertTitle>
          <AlertDescription>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">R² = {rSquared.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">모델이 데이터의 {(rSquared * 100).toFixed(1)}%를 설명합니다</p>
              </div>
              <div>
                <p className="text-sm font-medium">Adjusted R² = {adjustedRSquared.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">변수 수를 고려한 설명력</p>
              </div>
              <div>
                <p className="text-sm font-medium">F = {fStatistic.toFixed(2)}, p {fPValue < 0.001 ? '< 0.001' : `= ${fPValue.toFixed(4)}`}</p>
                <p className="text-xs text-muted-foreground">모델 전체 유의성 검정</p>
              </div>
              <div>
                <p className="text-sm font-medium">잔차 표준오차 = {residualStdError.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">예측 오차의 표준편차</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* 회귀계수 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">회귀계수 및 통계적 유의성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">변수</th>
                    <th className="text-right py-2">계수</th>
                    <th className="text-right py-2">표준오차</th>
                    <th className="text-right py-2">t-value</th>
                    <th className="text-right py-2">p-value</th>
                    <th className="text-right py-2">95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {coefficients.map((coef: unknown) => {
                    if (typeof coef !== 'object' || coef === null) return null
                    const c = coef as { name: string; estimate: number; stdError: number; tValue: number; pValue: number; ci: number[] }
                    return (
                      <tr key={c.name} className="border-b">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="text-right">{c.estimate.toFixed(3)}</td>
                        <td className="text-right">{c.stdError.toFixed(3)}</td>
                        <td className="text-right">{c.tValue.toFixed(3)}</td>
                        <td className="text-right">
                          <Badge variant={c.pValue < 0.05 ? "default" : "secondary"}>
                            {c.pValue < 0.001 ? '< 0.001' : c.pValue.toFixed(4)}
                          </Badge>
                        </td>
                        <td className="text-right text-xs">
                          [{c.ci[0].toFixed(2)}, {c.ci[1].toFixed(2)}]
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 산점도 및 회귀선 */}
        {regressionType === 'simple' && scatterData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">산점도 및 회귀선</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" label={{ value: '독립변수', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: '종속변수', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Scatter name="실제값" dataKey="y" fill="#3b82f6" />
                  <Line type="monotone" dataKey="predicted" name="회귀선" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 다중공선성 진단 (다중회귀) */}
        {vif && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">다중공선성 진단 (VIF)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {vif.map((item: unknown) => {
                  if (typeof item !== 'object' || item === null) return null
                  const v = item as { variable: string; vif: number }
                  return (
                    <div key={v.variable} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <span className="text-sm">{v.variable}</span>
                      <Badge variant={v.vif > 10 ? "destructive" : v.vif > 5 ? "secondary" : "default"}>
                        VIF = {v.vif.toFixed(2)}
                      </Badge>
                    </div>
                  )
                })}
                <p className="text-xs text-muted-foreground mt-2">
                  VIF {'<'} 5: 문제없음, 5-10: 주의필요, {'>'} 10: 심각한 다중공선성
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 잔차 플롯 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">잔차 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="residual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="residual">잔차 플롯</TabsTrigger>
                <TabsTrigger value="qq">Q-Q 플롯</TabsTrigger>
              </TabsList>
              <TabsContent value="residual">
                <ResponsiveContainer width="100%" height={250}>
                  <ScatterChart data={residualPlot}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fitted" label={{ value: '적합값', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: '잔차', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Scatter name="잔차" dataKey="residual" fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="qq">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Q-Q 플롯은 잔차의 정규성을 확인합니다
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLogisticResults = () => {
    if (!results) return null

    const { coefficients, modelFit, confusionMatrix, rocCurve } = results as LogisticRegressionResults

    return (
      <div className="space-y-6">
        {/* 모델 성능 요약 */}
        <Alert className="border-green-500 bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>모델 성능</AlertTitle>
          <AlertDescription>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">정확도: {(modelFit.accuracy * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">전체 예측 정확도</p>
              </div>
              <div>
                <p className="text-sm font-medium">AUC: {modelFit.auc.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">ROC 곡선 아래 면적</p>
              </div>
              <div>
                <p className="text-sm font-medium">McFadden R²: {modelFit.mcFaddenR2.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">모델 설명력</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* 회귀계수 및 오즈비 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">로지스틱 회귀계수 및 오즈비</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">변수</th>
                    <th className="text-right py-2">계수</th>
                    <th className="text-right py-2">표준오차</th>
                    <th className="text-right py-2">z-value</th>
                    <th className="text-right py-2">p-value</th>
                    <th className="text-right py-2">오즈비</th>
                  </tr>
                </thead>
                <tbody>
                  {coefficients.map((coef: unknown) => {
                    if (typeof coef !== 'object' || coef === null) return null
                    const c = coef as { name: string; estimate: number; stdError: number; zValue: number; pValue: number; oddsRatio: number }
                    return (
                      <tr key={c.name} className="border-b">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="text-right">{c.estimate.toFixed(3)}</td>
                        <td className="text-right">{c.stdError.toFixed(3)}</td>
                        <td className="text-right">{c.zValue.toFixed(3)}</td>
                        <td className="text-right">
                          <Badge variant={c.pValue < 0.05 ? "default" : "secondary"}>
                            {c.pValue < 0.001 ? '< 0.001' : c.pValue.toFixed(4)}
                          </Badge>
                        </td>
                        <td className="text-right">{c.oddsRatio.toFixed(3)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 혼동 행렬 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">혼동 행렬</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-4 bg-muted rounded">
                  <p className="text-2xl font-bold">{confusionMatrix.tp}</p>
                  <p className="text-xs">True Positive</p>
                </div>
                <div className="text-center p-4 bg-muted rounded">
                  <p className="text-2xl font-bold">{confusionMatrix.fp}</p>
                  <p className="text-xs">False Positive</p>
                </div>
                <div className="text-center p-4 bg-muted rounded">
                  <p className="text-2xl font-bold">{confusionMatrix.fn}</p>
                  <p className="text-xs">False Negative</p>
                </div>
                <div className="text-center p-4 bg-muted rounded">
                  <p className="text-2xl font-bold">{confusionMatrix.tn}</p>
                  <p className="text-xs">True Negative</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">분류 성능 지표</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">정밀도 (Precision)</span>
                <Badge>{(confusionMatrix.precision * 100).toFixed(1)}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">재현율 (Recall)</span>
                <Badge>{(confusionMatrix.recall * 100).toFixed(1)}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">F1 Score</span>
                <Badge>{confusionMatrix.f1Score.toFixed(3)}</Badge>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-sm">민감도 (Sensitivity)</span>
                <Badge>{(modelFit.sensitivity * 100).toFixed(1)}%</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">특이도 (Specificity)</span>
                <Badge>{(modelFit.specificity * 100).toFixed(1)}%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROC 곡선 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ROC 곡선</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={rocCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="tpr" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="fpr" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" />
              </RechartsLineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AUC = {modelFit.auc.toFixed(3)} (면적이 1에 가까울수록 좋은 모델)
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const currentTypeInfo = regressionType ? regressionTypeInfo[regressionType as 'simple' | 'multiple' | 'logistic'] : null
    if (!currentTypeInfo) return null

    return (
      <StepCard
        title="회귀분석 결과"
        description={`${currentTypeInfo.title} 분석이 완료되었습니다`}
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        {regressionType === 'logistic' ? renderLogisticResults() : renderLinearResults()}

        {/* 액션 버튼 */}
        <div className="flex gap-3 justify-center pt-6">
          <Button variant="outline" onClick={() => {}}>
            <FileText className="w-4 h-4 mr-2" />
            보고서 생성
          </Button>
          <Button variant="outline" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            결과 다운로드
          </Button>
        </div>
      </StepCard>
    )
  }


  return (
    <StatisticsPageLayout
      title="회귀분석"
      subtitle="Regression Analysis - 변수 간 관계 모델링 및 예측"
      icon={<TrendingUp className="w-6 h-6" />}
      methodInfo={{
        formula: regressionType === 'logistic'
          ? 'log(p/(1-p)) = β₀ + β₁X₁ + ... + βₖXₖ'
          : 'Y = β₀ + β₁X₁ + ... + βₖXₖ + ε',
        assumptions: regressionType === 'logistic'
          ? ['독립성', '선형성(로짓)', '큰 표본']
          : ['선형성', '정규성', '등분산성', '독립성'],
        sampleSize: regressionType === 'logistic'
          ? '변수당 최소 10-20개 이벤트'
          : '변수당 최소 20개 관측치',
        usage: regressionType === 'logistic'
          ? '이진 분류 및 확률 예측'
          : '연속형 종속변수 예측 및 영향력 분석'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => handleAnalysis(selectedVariables)}
      onReset={() => {
        actions.reset()
        setRegressionType('')
      }}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>분석 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {currentStep === 0 && renderMethodSelection()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}
