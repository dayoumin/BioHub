'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { RegressionVariables } from '@/types/statistics'
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
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar, ComposedChart } from 'recharts'
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'
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

// 로컬 타입 제거: types/statistics.ts의 RegressionVariables 사용

export default function RegressionPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('regression')
  }, [])

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

  // Helper function: Extract numeric value from unknown row object
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

  // Helper function: Simple Linear Regression
  const handleSimpleRegression = useCallback(async (
    pyodideCore: unknown,
    vars: RegressionVariables,
    data: UploadedData
  ): Promise<LinearRegressionResults> => {
    // 1️⃣ 데이터 추출
    const xVariable = vars.independent[0]
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

    // 2️⃣ PyodideCore 호출
    const core = pyodideCore as { callWorkerMethod: <T>(workerNum: number, methodName: string, params: unknown) => Promise<T> }
    const pythonResult = await core.callWorkerMethod<{
      slope: number
      intercept: number
      rSquared: number
      pValue: number
      stdErr: number
      nPairs: number
      slopeCi: number[]
      interceptCi: number[]
      slopeTValue: number
      interceptTValue: number
    }>(4, 'linear_regression', { x: xData, y: yData })

    // 3️⃣ 결과 매핑
    const df = pythonResult.nPairs - 2

    const coefficients = [
      {
        name: '(Intercept)',
        estimate: pythonResult.intercept,
        stdError: pythonResult.stdErr,
        tValue: pythonResult.interceptTValue,
        pValue: pythonResult.pValue,
        ci: pythonResult.interceptCi
      },
      {
        name: xVariable,
        estimate: pythonResult.slope,
        stdError: pythonResult.stdErr,
        tValue: pythonResult.slopeTValue,
        pValue: pythonResult.pValue,
        ci: pythonResult.slopeCi
      }
    ]

    // Scatter data 생성 (실제 데이터 + predicted line)
    const scatterData = xData.map((x, i) => ({
      x,
      y: yData[i],
      predicted: pythonResult.intercept + pythonResult.slope * x
    }))

    // Residual plot 생성
    const residualPlot = xData.map((x, i) => {
      const fitted = pythonResult.intercept + pythonResult.slope * x
      const residual = yData[i] - fitted
      const standardized = residual / pythonResult.stdErr // 간단한 근사
      return { fitted, residual, standardized }
    })

    // F-statistic 계산 (R² 기반)
    const fStatistic = (pythonResult.rSquared / (1 - pythonResult.rSquared)) * df
    const adjustedRSquared = 1 - (1 - pythonResult.rSquared) * ((pythonResult.nPairs - 1) / df)

    return {
      coefficients,
      rSquared: pythonResult.rSquared,
      adjustedRSquared,
      fStatistic,
      fPValue: pythonResult.pValue,
      residualStdError: pythonResult.stdErr,
      scatterData,
      residualPlot,
      vif: null
    }
  }, [extractRowValue])

  // Helper function: Multiple Regression
  const handleMultipleRegression = useCallback(async (
    pyodideCore: unknown,
    vars: RegressionVariables,
    data: UploadedData
  ): Promise<LinearRegressionResults> => {
    // 1️⃣ 데이터 추출
    const yVariable = vars.dependent
    const xVariables = vars.independent

    const yData: number[] = []
    const XData: number[][] = []

    for (const row of data.data) {
      const yVal = extractRowValue(row, yVariable)
      const xVals: number[] = []

      let validRow = true
      if (yVal === null || yVal === undefined || typeof yVal !== 'number' || isNaN(yVal)) {
        validRow = false
      }

      for (const xVar of xVariables) {
        const xVal = extractRowValue(row, xVar)
        if (xVal !== null && xVal !== undefined && typeof xVal === 'number' && !isNaN(xVal)) {
          xVals.push(xVal)
        } else {
          validRow = false
          break
        }
      }

      if (validRow && xVals.length === xVariables.length && typeof yVal === 'number') {
        yData.push(yVal)
        XData.push(xVals)
      }
    }

    const minRequired = xVariables.length + 1
    if (yData.length < minRequired) {
      throw new Error(`다중 회귀는 최소 ${minRequired}개 이상의 유효한 데이터가 필요합니다.`)
    }

    // 2️⃣ PyodideCore 호출
    const core = pyodideCore as { callWorkerMethod: <T>(workerNum: number, methodName: string, params: unknown) => Promise<T> }
    const pythonResult = await core.callWorkerMethod<{
      coefficients: number[]
      stdErrors: number[]
      tValues: number[]
      pValues: number[]
      ciLower: number[]
      ciUpper: number[]
      rSquared: number
      adjustedRSquared: number
      fStatistic: number
      fPValue: number
      residualStdError: number
      vif: number[]
      nObservations: number
      nPredictors: number
    }>(4, 'multiple_regression', { X: XData, y: yData })

    // 3️⃣ 결과 매핑
    const coefficientNames = ['(Intercept)', ...xVariables]

    const coefficients = pythonResult.coefficients.map((coef, i) => ({
      name: coefficientNames[i],
      estimate: coef,
      stdError: pythonResult.stdErrors[i],
      tValue: pythonResult.tValues[i],
      pValue: pythonResult.pValues[i],
      ci: [pythonResult.ciLower[i], pythonResult.ciUpper[i]]
    }))

    // Residual plot 생성 (첫 번째 독립변수 기준)
    const residualPlot = yData.map((y, i) => {
      // Predicted value 계산
      let predicted = pythonResult.coefficients[0] // intercept
      for (let j = 0; j < pythonResult.nPredictors; j++) {
        predicted += pythonResult.coefficients[j + 1] * XData[i][j]
      }
      const residual = y - predicted
      return {
        fitted: predicted,
        residual,
        standardized: residual / pythonResult.residualStdError
      }
    })

    // VIF 결과 매핑 (Intercept 제외)
    const vifResults = xVariables.map((varName, i) => ({
      variable: varName,
      vif: pythonResult.vif[i + 1] // Skip intercept (index 0)
    }))

    return {
      coefficients,
      rSquared: pythonResult.rSquared,
      adjustedRSquared: pythonResult.adjustedRSquared,
      fStatistic: pythonResult.fStatistic,
      fPValue: pythonResult.fPValue,
      residualStdError: pythonResult.residualStdError,
      scatterData: [],
      residualPlot,
      vif: vifResults
    }
  }, [extractRowValue])

  // Helper function: Logistic Regression
  const handleLogisticRegression = useCallback(async (
    pyodideCore: unknown,
    vars: RegressionVariables,
    data: UploadedData
  ): Promise<LogisticRegressionResults> => {
    // 1️⃣ 데이터 추출
    const yVariable = vars.dependent
    const xVariables = vars.independent

    const yData: number[] = []
    const XData: number[][] = []

    for (const row of data.data) {
      const yVal = extractRowValue(row, yVariable)
      const xVals: number[] = []

      let validRow = true
      if (yVal === null || yVal === undefined || typeof yVal !== 'number' || isNaN(yVal)) {
        validRow = false
      }

      for (const xVar of xVariables) {
        const xVal = extractRowValue(row, xVar)
        if (xVal !== null && xVal !== undefined && typeof xVal === 'number' && !isNaN(xVal)) {
          xVals.push(xVal)
        } else {
          validRow = false
          break
        }
      }

      if (validRow && xVals.length === xVariables.length && typeof yVal === 'number') {
        yData.push(yVal)
        XData.push(xVals)
      }
    }

    if (yData.length < 2) {
      throw new Error('로지스틱 회귀는 최소 2개 이상의 유효한 데이터가 필요합니다.')
    }

    // 2️⃣ PyodideCore 호출
    const core = pyodideCore as { callWorkerMethod: <T>(workerNum: number, methodName: string, params: unknown) => Promise<T> }
    const pythonResult = await core.callWorkerMethod<{
      coefficients: number[]
      stdErrors: number[]
      zValues: number[]
      pValues: number[]
      ciLower: number[]
      ciUpper: number[]
      predictions: number[]
      predictedClass: number[]
      accuracy: number
      confusionMatrix: {
        tp: number
        fp: number
        tn: number
        fn: number
        precision: number
        recall: number
        f1Score: number
      }
      sensitivity: number
      specificity: number
      rocCurve: Array<{ fpr: number; tpr: number }>
      auc: number
      aic: number
      bic: number
      pseudoRSquared: number
      nObservations: number
      nPredictors: number
    }>(4, 'logistic_regression', { X: XData, y: yData })

    // 3️⃣ 결과 매핑
    const coefficientNames = ['(Intercept)', ...xVariables]

    const coefficients = pythonResult.coefficients.map((coef, i) => ({
      name: coefficientNames[i],
      estimate: coef,
      stdError: pythonResult.stdErrors[i],
      zValue: pythonResult.zValues[i],
      pValue: pythonResult.pValues[i],
      oddsRatio: Math.exp(coef)
    }))

    return {
      coefficients,
      modelFit: {
        aic: pythonResult.aic,
        bic: pythonResult.bic,
        mcFaddenR2: pythonResult.pseudoRSquared,
        accuracy: pythonResult.accuracy,
        sensitivity: pythonResult.sensitivity,
        specificity: pythonResult.specificity,
        auc: pythonResult.auc
      },
      confusionMatrix: pythonResult.confusionMatrix,
      rocCurve: pythonResult.rocCurve
    }
  }, [extractRowValue])

  const handleMethodSelect = useCallback((type: 'simple' | 'multiple' | 'logistic') => {
    setRegressionType(type)
    actions.setCurrentStep?.(1)
  }, [actions, setRegressionType])

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

  const handleAnalysis = useCallback(async (variables: unknown) => {
    if (!uploadedData) {
      actions.setError?.('데이터를 먼저 업로드해주세요.')
      return
    }

    if (!regressionType) {
      actions.setError?.('회귀 유형을 선택해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      // Type guard for RegressionVariables
      if (!variables || typeof variables !== 'object') {
        throw new Error('변수 선택이 올바르지 않습니다.')
      }

      const vars = variables as RegressionVariables

      // PyodideCore 초기화
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      let result: RegressionResults

      if (regressionType === 'simple') {
        // Simple Linear Regression
        result = await handleSimpleRegression(pyodideCore, vars, uploadedData)
      } else if (regressionType === 'multiple') {
        // Multiple Regression
        result = await handleMultipleRegression(pyodideCore, vars, uploadedData)
      } else {
        // Logistic Regression
        result = await handleLogisticRegression(pyodideCore, vars, uploadedData)
      }

      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('Analysis error:', err)
      actions.setError?.(errorMessage)
    }
  }, [actions, uploadedData, regressionType])

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

    // regressionType 검증
    if (!regressionType) {
      return (
        <StepCard
          title="회귀 유형 미선택"
          description="먼저 회귀분석 유형을 선택해주세요"
          icon={<Users className="w-5 h-5 text-primary" />}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>회귀 유형을 선택해주세요</AlertTitle>
            <AlertDescription>
              Step 1에서 단순 회귀, 다중 회귀, 또는 로지스틱 회귀 중 하나를 선택해야 합니다.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-start">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(0)}>
              이전: 회귀 유형 선택
            </Button>
          </div>
        </StepCard>
      )
    }

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
        <VariableSelectorModern
          methodId={regressionType === 'simple' ? 'simple-regression' :
                    regressionType === 'multiple' ? 'multiple-regression' :
                    'logistic-regression'}
          data={uploadedData.data}
          onVariablesSelected={(vars) => handleVariableSelection(vars as unknown as RegressionVariables | null)}
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
        <StatisticsTable
          title="회귀계수 및 통계적 유의성"
          columns={[
            { key: 'name', header: '변수', type: 'text', align: 'left' },
            { key: 'estimate', header: '계수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            { key: 'stdError', header: '표준오차', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            { key: 'tValue', header: 't-value', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            {
              key: 'pValue',
              header: 'p-value',
              type: 'pvalue',
              align: 'right',
              formatter: (v) => (
                <Badge variant={v < 0.05 ? "default" : "secondary"}>
                  {v < 0.001 ? '< 0.001' : v.toFixed(4)}
                </Badge>
              )
            },
            {
              key: 'ci',
              header: '95% CI',
              type: 'custom',
              align: 'right',
              formatter: (v: number[]) => `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}]`
            }
          ]}
          data={coefficients}
          compactMode
        />

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
        <StatisticsTable
          title="로지스틱 회귀계수 및 오즈비"
          columns={[
            { key: 'name', header: '변수', type: 'text', align: 'left' },
            { key: 'estimate', header: '계수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            { key: 'stdError', header: '표준오차', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            { key: 'zValue', header: 'z-value', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
            {
              key: 'pValue',
              header: 'p-value',
              type: 'pvalue',
              align: 'right',
              formatter: (v) => (
                <Badge variant={v < 0.05 ? "default" : "secondary"}>
                  {v < 0.001 ? '< 0.001' : v.toFixed(4)}
                </Badge>
              )
            },
            { key: 'oddsRatio', header: '오즈비', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) }
          ]}
          data={coefficients}
          compactMode
        />

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
                      <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled>
                  <FileText className="w-4 h-4 mr-2" />
                  보고서 생성
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>향후 제공 예정입니다</p>
              </TooltipContent>
            </UITooltip>
                      <UITooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" disabled>
                  <Download className="w-4 h-4 mr-2" />
                  결과 다운로드
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>향후 제공 예정입니다</p>
              </TooltipContent>
            </UITooltip>
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
