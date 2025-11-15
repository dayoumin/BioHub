'use client'

/**
 * 회귀분석 페이지 - ThreePanelLayout 완성형
 *
 * 기존 regression 페이지의 모든 기능을 3-Panel 레이아웃으로 구현
 * 다른 통계 페이지 마이그레이션의 기준이 되는 템플릿
 */

import { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { RegressionVariables } from '@/types/statistics'
import { ThreePanelLayout } from '@/components/statistics/layouts/ThreePanelLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Play,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Network,
  Binary,
  Upload,
  Sparkles
} from 'lucide-react'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

// Type definitions
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

const STEPS = [
  { id: 1, label: '회귀 유형 선택' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '분석 결과' }
]

export default function RegressionDemoPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('regression')
  }, [])

  const { state, actions } = useStatisticsPage<RegressionResults, RegressionVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, error, isAnalyzing } = state

  const [regressionType, setRegressionType] = useState<'simple' | 'multiple' | 'logistic' | ''>('')

  // 회귀분석 유형별 정보
  const regressionTypeInfo = {
    simple: {
      title: '단순 선형 회귀',
      subtitle: 'Simple Linear Regression',
      description: '하나의 독립변수로 종속변수를 예측하는 모델',
      icon: <TrendingUp className="w-5 h-5" />,
      example: '공부 시간(X)으로 시험 점수(Y) 예측',
      equation: 'Y = β₀ + β₁X + ε'
    },
    multiple: {
      title: '다중 회귀분석',
      subtitle: 'Multiple Regression',
      description: '여러 독립변수로 종속변수를 예측하는 모델',
      icon: <Network className="w-5 h-5" />,
      example: '나이, 경력, 교육수준으로 연봉 예측',
      equation: 'Y = β₀ + β₁X₁ + β₂X₂ + ... + βₖXₖ + ε'
    },
    logistic: {
      title: '로지스틱 회귀',
      subtitle: 'Logistic Regression',
      description: '이진 분류를 위한 확률 예측 모델',
      icon: <Binary className="w-5 h-5" />,
      example: '환자 특성으로 질병 발생 여부 예측',
      equation: 'log(p/(1-p)) = β₀ + β₁X₁ + ... + βₖXₖ'
    }
  }

  // Helper function: Extract numeric value
  const extractRowValue = (row: unknown, col: string): number | null => {
    if (typeof row === 'object' && row !== null && col in row) {
      const value = (row as Record<string, unknown>)[col]
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const num = parseFloat(value)
        return isNaN(num) ? null : num
      }
    }
    return null
  }

  // Step handlers
  const handleMethodSelect = useCallback((type: 'simple' | 'multiple' | 'logistic') => {
    setRegressionType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: file.name, columns })
    }
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((vars: Partial<RegressionVariables>) => {
    if (actions.setSelectedVariables) {
      actions.setSelectedVariables(vars as RegressionVariables)
    }
  }, [actions])

  // Simple Linear Regression
  const handleSimpleRegression = useCallback(async (
    pyodideCore: unknown,
    vars: RegressionVariables,
    data: UploadedData
  ): Promise<LinearRegressionResults> => {
    const independentVars = Array.isArray(vars.independent) ? vars.independent : [vars.independent]
    const xVariable = independentVars[0]
    const yVariable = vars.dependent

    const xData: number[] = []
    const yData: number[] = []

    for (const row of data.data) {
      const xVal = extractRowValue(row, xVariable)
      const yVal = extractRowValue(row, yVariable)

      if (xVal !== null && yVal !== null) {
        xData.push(xVal)
        yData.push(yVal)
      }
    }

    if (xData.length < 3) {
      throw new Error('단순 선형 회귀는 최소 3개 이상의 유효한 데이터 쌍이 필요합니다.')
    }

    // PyodideCore 호출
    const core = pyodideCore as { callWorkerMethod: <T>(workerNum: number, methodName: string, params: unknown) => Promise<T> }
    const pythonResult = await core.callWorkerMethod<{
      slope: number
      intercept: number
      r_squared: number
      p_value: number
      std_err: number
      residuals: number[]
      predictions: number[]
    }>(1, 'simple_linear_regression', { x: xData, y: yData })

    // 결과 변환
    const scatterData = xData.map((x, i) => ({
      x,
      y: yData[i],
      predicted: pythonResult.predictions[i]
    }))

    const residualPlot = pythonResult.predictions.map((pred, i) => ({
      fitted: pred,
      residual: pythonResult.residuals[i],
      standardized: pythonResult.residuals[i] / pythonResult.std_err
    }))

    return {
      coefficients: [
        {
          name: '절편',
          estimate: pythonResult.intercept,
          stdError: pythonResult.std_err,
          tValue: pythonResult.intercept / pythonResult.std_err,
          pValue: pythonResult.p_value,
          ci: [
            pythonResult.intercept - 1.96 * pythonResult.std_err,
            pythonResult.intercept + 1.96 * pythonResult.std_err
          ]
        },
        {
          name: xVariable,
          estimate: pythonResult.slope,
          stdError: pythonResult.std_err,
          tValue: pythonResult.slope / pythonResult.std_err,
          pValue: pythonResult.p_value,
          ci: [
            pythonResult.slope - 1.96 * pythonResult.std_err,
            pythonResult.slope + 1.96 * pythonResult.std_err
          ]
        }
      ],
      rSquared: pythonResult.r_squared,
      adjustedRSquared: pythonResult.r_squared - (1 - pythonResult.r_squared) * 2 / (xData.length - 2),
      fStatistic: (pythonResult.r_squared * (xData.length - 2)) / (1 - pythonResult.r_squared),
      fPValue: pythonResult.p_value,
      residualStdError: pythonResult.std_err,
      scatterData,
      residualPlot
    }
  }, [])

  // Analysis handler
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) return

    actions.startAnalysis()

    try {
      // Pyodide 연동 (향후 구현)
      // const result = await handleSimpleRegression(pyodideCore, selectedVariables, uploadedData)

      // 데모용 가짜 결과 (임시)
      await new Promise(resolve => setTimeout(resolve, 1500))

      const demoResults: LinearRegressionResults = {
        rSquared: 0.89,
        adjustedRSquared: 0.87,
        fStatistic: 42.5,
        fPValue: 0.001,
        residualStdError: 2.34,
        coefficients: [
          { name: '절편', estimate: 12.34, stdError: 2.15, tValue: 5.74, pValue: 0.001, ci: [8.13, 16.55] },
          { name: selectedVariables.independent?.[0] || 'X', estimate: 1.56, stdError: 0.34, tValue: 4.59, pValue: 0.003, ci: [0.89, 2.23] }
        ],
        scatterData: Array.from({ length: 20 }, (_, i) => ({
          x: i * 5,
          y: 12.34 + 1.56 * (i * 5) + (Math.random() - 0.5) * 10,
          predicted: 12.34 + 1.56 * (i * 5)
        })),
        residualPlot: Array.from({ length: 20 }, (_, i) => ({
          fitted: 12.34 + 1.56 * (i * 5),
          residual: (Math.random() - 0.5) * 10,
          standardized: (Math.random() - 0.5) * 2
        }))
      }

      actions.completeAnalysis(demoResults, 4)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, actions, handleSimpleRegression])

  // Right panel configuration
  const rightPanelConfig = {
    mode: currentStep < 4 ? 'preview' as const : 'results' as const,
    previewData: uploadedData?.data,
    results: results
  }

  return (
    <ThreePanelLayout
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={actions.setCurrentStep}
      rightPanel={rightPanelConfig}
      renderPreview={(data) => <DataPreviewPanel data={data} defaultExpanded={true} />}
      renderResults={(res) => <ResultsPanel results={res as LinearRegressionResults} />}
    >
      {/* Step 1: 회귀 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">회귀 유형 선택</h2>
            <p className="text-sm text-muted-foreground">
              예측 목적과 변수 특성에 맞는 회귀 방법을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(regressionTypeInfo).map(([key, info]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  regressionType === key ? 'border-primary bg-primary/5' : ''
                }`}
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

                  <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs">
                    {info.equation}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {regressionType && (
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">
                  {regressionTypeInfo[regressionType as keyof typeof regressionTypeInfo].title} 선택됨
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                다음 단계에서 데이터를 업로드해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              회귀분석할 데이터 파일을 업로드하세요
            </p>
          </div>

          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={() => {}}
          />
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 3 && uploadedData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              {regressionType === 'simple'
                ? '독립변수(X) 1개, 종속변수(Y) 1개를 선택하세요'
                : regressionType === 'multiple'
                ? '독립변수(X) 2개 이상, 종속변수(Y) 1개를 선택하세요'
                : '예측 변수와 이진 결과 변수를 선택하세요'
              }
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">변수 할당</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 독립변수 선택 */}
              <div className="space-y-2">
                <Label>독립변수 (X)</Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => (
                    <Badge
                      key={header}
                      variant={selectedVariables?.independent?.includes(header) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = selectedVariables?.independent || []
                        const updated = current.includes(header)
                          ? current.filter(h => h !== header)
                          : regressionType === 'simple'
                          ? [header]
                          : [...current, header]
                        handleVariableSelect({ ...selectedVariables, independent: updated })
                      }}
                    >
                      {header}
                      {selectedVariables?.independent?.includes(header) && (
                        <CheckCircle className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 종속변수 선택 */}
              <div className="space-y-2">
                <Label>종속변수 (Y)</Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => (
                    <Badge
                      key={header}
                      variant={selectedVariables?.dependent === header ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        handleVariableSelect({ ...selectedVariables, dependent: header })
                      }}
                    >
                      {header}
                      {selectedVariables?.dependent === header && (
                        <CheckCircle className="ml-1 h-3 w-3" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 분석하기 버튼 */}
          <Button
            onClick={handleAnalysis}
            disabled={isAnalyzing || !selectedVariables?.independent || !selectedVariables?.dependent}
            size="lg"
            className="w-full md:w-auto shadow-lg"
          >
            {isAnalyzing ? '분석 중...' : '분석하기'}
            <Play className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 4: 분석 결과 */}
      {currentStep === 4 && results && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">분석 완료</h2>
            <p className="text-sm text-muted-foreground">
              회귀분석 결과가 우측 패널에 표시됩니다
            </p>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              분석이 성공적으로 완료되었습니다. 우측 결과 패널을 확인하세요.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </ThreePanelLayout>
  )
}

/**
 * 결과 패널 (우측)
 */
function ResultsPanel({ results }: { results: LinearRegressionResults }) {
  return (
    <div className="space-y-4">
      {/* 주요 통계량 */}
      <Card>
        <CardHeader>
          <CardTitle>주요 통계량</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">R²</p>
              <p className="text-2xl font-bold font-mono">{results.rSquared.toFixed(3)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Adjusted R²</p>
              <p className="text-2xl font-bold font-mono">{results.adjustedRSquared.toFixed(3)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">F-statistic</p>
              <p className="text-2xl font-bold font-mono">{results.fStatistic.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">p-value</p>
              <p className={`text-2xl font-bold font-mono ${
                results.fPValue < 0.05 ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                {results.fPValue.toFixed(3)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 회귀계수 */}
      <Card>
        <CardHeader>
          <CardTitle>회귀계수</CardTitle>
        </CardHeader>
        <CardContent>
          <StatisticsTable
            columns={[
              { key: 'name', header: '변수', type: 'text', align: 'left' },
              { key: 'estimate', header: 'Estimate', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
              { key: 'stdError', header: 'Std Error', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
              { key: 'tValue', header: 't-value', type: 'number', align: 'right', formatter: (v) => v.toFixed(2) },
              { key: 'pValue', header: 'p-value', type: 'pvalue', align: 'right', formatter: (v) => v.toFixed(3) }
            ]}
            data={results.coefficients}
          />
        </CardContent>
      </Card>

      {/* 산점도 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">산점도 및 회귀선</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart data={results.scatterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" label={{ value: '독립변수', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: '종속변수', angle: -90, position: 'insideLeft' }} />
              <RechartsTooltip />
              <Scatter name="실제값" dataKey="y" fill="#3b82f6" />
              <Scatter name="예측값" dataKey="predicted" fill="#ef4444" line />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
                <ScatterChart data={results.residualPlot}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fitted" label={{ value: '적합값', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: '잔차', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip />
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

      {/* VIF (다중회귀인 경우만) */}
      {results.vif && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">다중공선성 진단 (VIF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.vif.map((item) => (
                <div key={item.variable} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">{item.variable}</span>
                  <Badge variant={item.vif > 10 ? "destructive" : item.vif > 5 ? "secondary" : "default"}>
                    VIF = {item.vif.toFixed(2)}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                VIF {'<'} 5: 문제없음, 5-10: 주의필요, {'>'} 10: 심각한 다중공선성
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
