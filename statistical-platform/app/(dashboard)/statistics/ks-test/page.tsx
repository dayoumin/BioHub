'use client'

import React, { useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { KSTestVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  Upload,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  Info,
  BarChart3
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// K-S 검정 타입 정의
interface KSTestResult {
  testType: 'one-sample' | 'two-sample'
  variable1: string
  variable2?: string
  statisticKS: number
  pValue: number
  criticalValue?: number
  significant: boolean
  interpretation: string
  effectSize?: number
  sampleSizes: {
    n1: number
    n2?: number
  }
  distributionInfo?: {
    expectedDistribution: string
    observedMean: number
    observedStd: number
    expectedMean?: number
    expectedStd?: number
  }
}

export default function KolmogorovSmirnovTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('kolmogorov-smirnov')
  }, [])

  // Hook for state management
  const { state, actions } = useStatisticsPage<KSTestResult, KSTestVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state

  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: currentStep > index || (currentStep === 3 && results !== null)
    }))
  }, [currentStep, results])

  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: 'K-S 검정' }
  ], [])

  // 일표본 K-S 검정 (정규분포 가정) - PyodideCore Worker 1
  const calculateOneSampleKS = useCallback(async (
    values: number[],
    variable: string
  ): Promise<KSTestResult> => {
    const pyodideCore = PyodideCoreService.getInstance()
    const result = await pyodideCore.callWorkerMethod<{
      testType: string
      statisticKS: number
      pValue: number
      criticalValue: number
      significant: boolean
      sampleSizes: { n1: number }
      distributionInfo: {
        expectedDistribution: string
        observedMean: number
        observedStd: number
        expectedMean: number
        expectedStd: number
      }
    }>(PyodideWorker.Descriptive, 'ks_test_one_sample', { values })

    return {
      testType: 'one-sample',
      variable1: variable,
      statisticKS: result.statisticKS,
      pValue: result.pValue,
      criticalValue: result.criticalValue,
      significant: result.significant,
      interpretation: result.significant
        ? '데이터가 정규분포를 따르지 않는 것으로 보임'
        : '데이터가 정규분포를 따르는 것으로 보임',
      sampleSizes: result.sampleSizes,
      distributionInfo: result.distributionInfo
    }
  }, [])

  // 이표본 K-S 검정 - PyodideCore Worker 1
  const calculateTwoSampleKS = useCallback(async (
    values1: number[],
    values2: number[],
    variable1: string,
    variable2: string
  ): Promise<KSTestResult> => {
    const pyodideCore = PyodideCoreService.getInstance()
    const result = await pyodideCore.callWorkerMethod<{
      testType: string
      statisticKS: number
      pValue: number
      criticalValue: number
      significant: boolean
      effectSize: number
      sampleSizes: { n1: number; n2: number }
    }>(PyodideWorker.Descriptive, 'ks_test_two_sample', { values1, values2 })

    return {
      testType: 'two-sample',
      variable1,
      variable2,
      statisticKS: result.statisticKS,
      pValue: result.pValue,
      criticalValue: result.criticalValue,
      significant: result.significant,
      interpretation: result.significant
        ? '두 집단의 분포가 유의하게 다름'
        : '두 집단의 분포가 유의하게 다르지 않음',
      effectSize: result.effectSize,
      sampleSizes: result.sampleSizes
    }
  }, [])

  // 실제 K-S 검정 계산 로직 - PyodideCore
  const calculateKSTest = useCallback(async (
    data: unknown[],
    variable1: string,
    variable2: string | undefined
  ): Promise<KSTestResult> => {
    const values1 = data.map(row => (row as Record<string, unknown>)[variable1])
      .filter(val => val != null && typeof val === 'number') as number[]

    if (variable2) {
      // 이표본 K-S 검정
      const values2 = data.map(row => (row as Record<string, unknown>)[variable2])
        .filter(val => val != null && typeof val === 'number') as number[]

      return await calculateTwoSampleKS(values1, values2, variable1, variable2)
    } else {
      // 일표본 K-S 검정 (정규분포와 비교)
      return await calculateOneSampleKS(values1, variable1)
    }
  }, [calculateOneSampleKS, calculateTwoSampleKS])

  const runAnalysis = useCallback(async (variables: KSTestVariables) => {
    if (!uploadedData) return

    try {
      actions.startAnalysis()

      const variable2 = variables.variables.length > 1 ? variables.variables[1] : undefined
      const result = await calculateKSTest(uploadedData.data, variables.variables[0], variable2)

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('K-S 검정 분석 중 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, calculateKSTest, actions])

  const handleDataUpload = useCallback(
    createDataUploadHandler(
      actions?.setUploadedData,
      () => {
        if (!actions) return
        actions.setCurrentStep(1)
      },
      'kolmogorov-smirnov'
    ),
    [actions]
  )

  const handleAnalysis = useCallback(() => {
    if (!selectedVariables || !actions) return
    actions.setCurrentStep(3)
    runAnalysis(selectedVariables)
  }, [selectedVariables, actions, runAnalysis])

  // Badge 기반 변수 선택 핸들러
  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { variables: [] }
    const currentVars = Array.isArray(current.variables) ? current.variables : []

    const isSelected = currentVars.includes(varName)
    let newVars: string[]

    if (isSelected) {
      // 선택 해제
      newVars = currentVars.filter((v: string) => v !== varName)
    } else {
      // 최대 2개까지만 선택 가능
      if (currentVars.length >= 2) {
        newVars = [currentVars[1], varName] // 첫 번째 제거, 새 변수 추가
      } else {
        newVars = [...currentVars, varName]
      }
    }

    actions.setSelectedVariables?.({ variables: newVars })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleDataUploadBack = useCallback(() => {
    if (!actions) return
    actions.setCurrentStep(0)
  }, [actions])

  const handleVariablesBack = useCallback(() => {
    if (!actions) return
    actions.setCurrentStep(1)
  }, [actions])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="text-center">
        <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kolmogorov-Smirnov 검정</h1>
        <p className="text-lg text-gray-600">분포의 동일성을 검정하는 비모수 통계 테스트</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              K-S 검정이란?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              두 분포의 <strong>누적분포함수(CDF)</strong> 간의 최대 차이를 이용하여
              분포의 동일성을 검정하는 비모수 방법입니다.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs font-medium mb-1">검정 통계량</p>
              <p className="text-xs text-muted-foreground">
                D = max|F₁(x) - F₂(x)|<br/>
                F₁, F₂: 각각의 경험적 분포함수
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              사용 사례
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">정규성 검정 (일표본)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">두 집단 분포 비교 (이표본)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">모델 적합도 검정</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">분포 가정 확인</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>가정 및 조건</AlertTitle>
        <AlertDescription>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 연속형 변수 (이산형도 가능하나 정확도 떨어짐)</li>
            <li>• 관측값들이 독립적이어야 함</li>
            <li>• 분포에 대한 가정이 필요하지 않음 (비모수)</li>
            <li>• 표본 크기가 클수록 검정력 증가</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'number'
    })

    const selectedVars = Array.isArray(selectedVariables?.variables)
      ? selectedVariables.variables
      : []

    const canProceed = selectedVars.length >= 1 && selectedVars.length <= 2

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">변수 선택</h2>
          <p className="text-gray-600">분포를 비교할 변수를 선택하세요 (1개 또는 2개)</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>검정 유형</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>1개 변수 선택</strong>: 일표본 K-S 검정 (정규분포 가정 검정)</p>
              <p>• <strong>2개 변수 선택</strong>: 이표본 K-S 검정 (두 집단 분포 비교)</p>
            </div>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>검정 변수 선택</CardTitle>
            <CardDescription>
              분포를 비교할 연속형 변수를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col: string) => {
                const isSelected = selectedVars.includes(col)
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleVariableSelect(col)}
                  >
                    {col}
                    {isSelected && <CheckCircle className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
            {selectedVars.length > 0 && (
              <div className="mt-3 p-2 bg-muted rounded text-sm">
                <span className="font-medium">선택된 변수: </span>
                {selectedVars.join(', ')}
                {selectedVars.length === 1 && ' (일표본 검정)'}
                {selectedVars.length === 2 && ' (이표본 검정)'}
              </div>
            )}
          </CardContent>
        </Card>

        {!canProceed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              변수를 1개 이상 선택해야 합니다 (최대 2개).
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleVariablesBack}>
            이전 단계
          </Button>
          <Button
            onClick={handleAnalysis}
            disabled={!canProceed}
          >
            다음 단계
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, handleVariableSelect, handleVariablesBack, handleAnalysis])

  const renderResults = useCallback(() => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>K-S 검정을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!results) return null

    const {
      testType,
      variable1,
      variable2,
      statisticKS,
      pValue,
      criticalValue,
      significant,
      interpretation,
      effectSize,
      sampleSizes,
      distributionInfo
    } = results

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">K-S 검정 결과</h2>
          <p className="text-gray-600">{testType === 'one-sample' ? '일표본' : '이표본'} 분포 검정 결과</p>
        </div>

        {/* 주요 결과 요약 */}
        <Alert className={significant ? "border-red-500 bg-muted" : "border-green-500 bg-muted"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>검정 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p className="font-medium">
                D = {statisticKS.toFixed(4)}, p = {pValue.toFixed(3)}
              </p>
              <p>
                {significant
                  ? "❌ 분포가 유의하게 다릅니다 (p < 0.05)"
                  : "✅ 분포가 유의하게 다르지 않습니다 (p ≥ 0.05)"}
              </p>
              <p className="text-sm text-muted-foreground">{interpretation}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* 검정 통계량 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">검정 통계량</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="font-medium">K-S 통계량 (D)</p>
                <p className="text-2xl font-bold text-primary">{statisticKS.toFixed(4)}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>p-value</span>
                  <Badge variant={significant ? "destructive" : "default"}>
                    {pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}
                  </Badge>
                </div>
                {criticalValue && (
                  <div className="flex justify-between">
                    <span>임계값 (α = 0.05)</span>
                    <Badge variant="outline">{criticalValue.toFixed(4)}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">표본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{variable1} 표본수</span>
                  <Badge>{sampleSizes.n1}</Badge>
                </div>
                {sampleSizes.n2 && variable2 && (
                  <div className="flex justify-between">
                    <span>{variable2} 표본수</span>
                    <Badge>{sampleSizes.n2}</Badge>
                  </div>
                )}
                {effectSize && (
                  <div className="flex justify-between">
                    <span>효과크기</span>
                    <Badge variant={effectSize > 0.8 ? "default" : effectSize > 0.5 ? "secondary" : "outline"}>
                      {effectSize.toFixed(3)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 분포 정보 (일표본인 경우) */}
        {distributionInfo && testType === 'one-sample' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">분포 적합도 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-medium">관측 평균</p>
                  <p className="text-lg font-bold text-muted-foreground">{distributionInfo.observedMean.toFixed(3)}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">관측 표준편차</p>
                  <p className="text-lg font-bold text-gray-600">{distributionInfo.observedStd.toFixed(3)}</p>
                </div>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>분포 비교</AlertTitle>
                <AlertDescription>
                  <p className="text-sm mt-2">
                    관측된 데이터와 {distributionInfo.expectedDistribution} 간의 최대 차이를 측정합니다.
                    D 값이 클수록 분포의 차이가 큼을 의미합니다.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* 해석 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결과 해석 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>K-S 검정 해석</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <p><strong>귀무가설(H₀):</strong> 두 분포가 동일하다</p>
                  <p><strong>대립가설(H₁):</strong> 두 분포가 다르다</p>
                  <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                </div>
              </AlertDescription>
            </Alert>

            {testType === 'two-sample' && effectSize && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">효과크기 해석</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>작은 효과</strong>: 0.2 ~ 0.5</p>
                  <p>• <strong>중간 효과</strong>: 0.5 ~ 0.8</p>
                  <p>• <strong>큰 효과</strong>: 0.8 이상</p>
                  <p className="mt-2 font-medium">현재 효과크기: {effectSize.toFixed(3)}
                    ({effectSize < 0.5 ? '작음' : effectSize < 0.8 ? '중간' : '큼'})
                  </p>
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• K-S 검정은 분포의 모든 측면(위치, 척도, 모양)을 고려합니다</li>
                <li>• 표본 크기가 클수록 작은 차이도 유의하게 검출될 수 있습니다</li>
                <li>• 이산형 데이터에서는 보수적인 결과를 보일 수 있습니다</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex gap-3 justify-center pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" disabled>
                <FileText className="w-4 h-4 mr-2" />
                보고서 생성
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>향후 제공 예정입니다</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" disabled>
                <Download className="w-4 h-4 mr-2" />
                결과 다운로드
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>향후 제공 예정입니다</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    )
  }, [isAnalyzing, error, results])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step) => actions.setCurrentStep(step - 1)}
      analysisTitle="K-S 검정"
      analysisSubtitle="Kolmogorov-Smirnov Test"
      analysisIcon={<Activity className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onPrevious={handleDataUploadBack}
          currentStep={1}
          totalSteps={4}
        />
      )}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
