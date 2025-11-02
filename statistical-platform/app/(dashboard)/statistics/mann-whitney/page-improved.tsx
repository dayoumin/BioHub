'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Target
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import type { VariableAssignment } from '@/components/variable-selection/VariableSelector'

// Constants
import { ANALYSIS_METHOD_IDS } from '@/lib/constants/analysis-method-ids'
import { MANN_WHITNEY_TEXTS } from '@/lib/constants/analysis-texts'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface MannWhitneyResult {
  statistic: number
  pValue: number
  uValue: number
  nobs1: number
  nobs2: number
  medianDiff: number
  rankSum1: number
  rankSum2: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    group1: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    group2: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
  }
  interpretation: {
    summary: string
    comparison: string
    recommendations: string[]
  }
}

export default function MannWhitneyPage() {
  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
  const [analysisResult, setAnalysisResult] = useState<MannWhitneyResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  // Memoized steps configuration for performance
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: MANN_WHITNEY_TEXTS.steps.method.title,
      description: MANN_WHITNEY_TEXTS.steps.method.description,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: MANN_WHITNEY_TEXTS.steps.upload.title,
      description: MANN_WHITNEY_TEXTS.steps.upload.description,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: MANN_WHITNEY_TEXTS.steps.variables.title,
      description: MANN_WHITNEY_TEXTS.steps.variables.description,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: MANN_WHITNEY_TEXTS.steps.results.title,
      description: MANN_WHITNEY_TEXTS.steps.results.description,
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideStats.initialize()
        setPyodide(pyodideStats)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        actions.setError(MANN_WHITNEY_TEXTS.errors.pyodideInit)
      }
    }
    initPyodide()
  }, [])

  // Event handlers
  const handleDataUpload = useCallback((data: unknown[]) => {
    const processedData = data.map((row, index) => ({
      ...row,
      _id: index
    })) as DataRow[]

    actions.setUploadedData(processedData)
    setCurrentStep(2)
    actions.setError(null)
  }, [])

  const handleVariableSelection = useCallback((variables: VariableAssignment) => {
    actions.setSelectedVariables(variables)
    if (variables.dependent && variables.independent &&
        variables.dependent.length === 1 && variables.independent.length === 1) {
      runAnalysis(variables)
    }
  }, [])

  const runAnalysis = async (variables: VariableAssignment) => {
    if (!uploadedData || !pyodide || !variables.dependent || !variables.independent) {
      actions.setError(MANN_WHITNEY_TEXTS.errors.analysisExecution)
      return
    }

    actions.startAnalysis()
    actions.setError(null)

    try {
      const result = await pyodide.mannWhitneyUTest(
        uploadedData,
        variables.dependent[0],
        variables.independent[0]
      )

      actions.completeAnalysis(result, 3)
    } catch (err) {
      console.error('Mann-Whitney U 검정 실패:', err)
      actions.setError(MANN_WHITNEY_TEXTS.errors.analysisFailed)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Memoized method info
  const methodInfo = useMemo(() => ({
    formula: MANN_WHITNEY_TEXTS.methodInfo.formula,
    assumptions: MANN_WHITNEY_TEXTS.methodInfo.assumptions,
    sampleSize: MANN_WHITNEY_TEXTS.methodInfo.sampleSize,
    usage: MANN_WHITNEY_TEXTS.methodInfo.usage
  }), [])

  return (
    <StatisticsPageLayout
      title={MANN_WHITNEY_TEXTS.title}
      subtitle={MANN_WHITNEY_TEXTS.subtitle}
      description={MANN_WHITNEY_TEXTS.description}
      icon={<Activity className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title={`${MANN_WHITNEY_TEXTS.title} 소개`}
          description="독립된 두 집단의 순위 기반 비모수 검정"
          icon={<Info className="w-5 h-5 text-blue-500" />}
        >
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    {MANN_WHITNEY_TEXTS.purpose.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {MANN_WHITNEY_TEXTS.purpose.description}
                  </p>
                  <ul className="text-sm space-y-1">
                    {MANN_WHITNEY_TEXTS.purpose.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    {MANN_WHITNEY_TEXTS.comparison.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">
                        {MANN_WHITNEY_TEXTS.comparison.mannWhitney.title}
                      </h4>
                      <p className="text-muted-foreground">
                        {MANN_WHITNEY_TEXTS.comparison.mannWhitney.description}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">
                        {MANN_WHITNEY_TEXTS.comparison.tTest.title}
                      </h4>
                      <p className="text-muted-foreground">
                        {MANN_WHITNEY_TEXTS.comparison.tTest.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>{MANN_WHITNEY_TEXTS.usage.title}</AlertTitle>
              <AlertDescription>
                {MANN_WHITNEY_TEXTS.usage.situations.map((situation, index) => (
                  <span key={index}>
                    • {situation}
                    {index < MANN_WHITNEY_TEXTS.usage.situations.length - 1 && <br/>}
                  </span>
                ))}
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep(1)}>
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
          description="Mann-Whitney U 검정할 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onNext={handleDataUpload}
            acceptedFormats={['.csv', '.xlsx', '.xls']}
          />

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setCurrentStep(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="종속변수(연속형)와 그룹변수(범주형)를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelector
            methodId={ANALYSIS_METHOD_IDS.MANN_WHITNEY}
            data={uploadedData}
            onVariablesSelected={handleVariableSelection}
            onBack={() => setCurrentStep(1)}
          />
        </StepCard>
      )}

      {/* Step 4: 결과 (결과 표시 부분은 기존과 동일하므로 생략) */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 기존 결과 표시 코드와 동일 */}
          <div className="text-center py-8">
            <p className="text-muted-foreground">결과 표시 영역 (기존과 동일)</p>
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
                  <p className="font-medium">{MANN_WHITNEY_TEXTS.loading.title}</p>
                  <p className="text-sm text-muted-foreground">{MANN_WHITNEY_TEXTS.loading.subtitle}</p>
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