'use client'

import React, { useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { RunsTestVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import {
  Shuffle,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Info,
  BarChart3
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// 런 검정 관련 타입 정의
type RunValue = string | number | boolean
type CutPoint = number | string | 'median' | 'mode'

interface RunSequenceItem {
  value: RunValue
  run: number
  runLength: number
}

interface RunsTestStatistics {
  n1: number  // 첫 번째 범주 개수
  n2: number  // 두 번째 범주 개수
  totalN: number
  cutPoint: CutPoint  // 중앙값 또는 모드
}

interface RunsTestResult {
  variable: string
  totalRuns: number
  expectedRuns: number
  variance: number
  zStatistic: number
  pValue: number
  significant: boolean
  interpretation: string
  runSequence: RunSequenceItem[]
  statistics: RunsTestStatistics
}

export default function RunsTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('runs-test')
  }, [])

  // Use statistics page hook (0-based indexing)
  const { state, actions } = useStatisticsPage<RunsTestResult, RunsTestVariables>({
    withUploadedData: true,
    withError: true
    // initialStep: 0 (기본값)
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '비모수 검정', href: '/statistics' },
    { label: '런 검정' }
  ], [])

  // Steps
  const STEPS = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: step.id === 1 ? currentStep > 0 :
                step.id === 2 ? !!uploadedData :
                step.id === 3 ? !!selectedVariables?.dependent :
                step.id === 4 ? !!results : false
    }))
  }, [currentStep, uploadedData, selectedVariables, results])

  // Available variables (numeric only)
  const numericColumns = useMemo(() => {
    if (!uploadedData || uploadedData.data.length === 0) return []

    const firstRow = uploadedData.data[0]
    if (!firstRow || typeof firstRow !== 'object') return []

    return Object.keys(firstRow).filter(key => {
      const value = (firstRow as Record<string, unknown>)[key]
      return typeof value === 'number'
    })
  }, [uploadedData])

  // Data upload handler
  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    const uploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }

    actions.setUploadedData?.(uploadedData)
    actions.setCurrentStep?.(2) // Move to step 3 (변수 선택)
  }, [actions])

  // Variable selection handler (Critical Bug Prevention)
  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '' }
    const newDependent = current.dependent === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: newDependent
    })
    // ❌ NO setCurrentStep here
  }, [selectedVariables, actions])

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!selectedVariables?.dependent || !uploadedData) {
      actions.setError?.('분석할 변수를 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      // 1️⃣ 데이터 추출 (숫자형 데이터만)
      const sequence: number[] = []
      for (const row of uploadedData.data) {
        const value = (row as Record<string, unknown>)[selectedVariables.dependent]
        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
          sequence.push(value)
        }
      }

      if (sequence.length < 10) {
        throw new Error('런 검정은 최소 10개 이상의 관측값이 필요합니다.')
      }

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        nRuns: number
        expectedRuns: number
        n1: number
        n2: number
        zStatistic: number
        pValue: number
      }>(
        3, // worker3-nonparametric-anova.py
        'runs_test',
        {
          sequence: sequence
        }
      )

      // 3️⃣ 결과 매핑 및 런 시퀀스 재구성 (UI 표시용)
      // 중앙값 계산 (Python np.median()과 동일하게)
      const sortedSequence = [...sequence].sort((a, b) => a - b)
      const median = sortedSequence.length % 2 === 0
        ? (sortedSequence[sortedSequence.length / 2 - 1] + sortedSequence[sortedSequence.length / 2]) / 2
        : sortedSequence[Math.floor(sortedSequence.length / 2)]
      const binarySequence = sequence.map(val => val >= median ? 'A' : 'B')

      // 런 시퀀스 생성
      const runs: RunSequenceItem[] = []
      let currentRun = 1
      let currentValue = binarySequence[0]
      let runLength = 1

      for (let i = 1; i < binarySequence.length; i++) {
        if (binarySequence[i] === currentValue) {
          runLength++
        } else {
          runs.push({ value: currentValue, run: currentRun, runLength })
          currentRun++
          currentValue = binarySequence[i]
          runLength = 1
        }
      }
      runs.push({ value: currentValue, run: currentRun, runLength })

      // 분산 계산 (UI 표시용)
      const totalN = pythonResult.n1 + pythonResult.n2
      const variance = (2 * pythonResult.n1 * pythonResult.n2 * (2 * pythonResult.n1 * pythonResult.n2 - totalN)) /
                      (totalN * totalN * (totalN - 1))

      const significant = pythonResult.pValue < 0.05

      const result: RunsTestResult = {
        variable: selectedVariables.dependent,
        totalRuns: pythonResult.nRuns,
        expectedRuns: pythonResult.expectedRuns,
        variance,
        zStatistic: pythonResult.zStatistic,
        pValue: pythonResult.pValue,
        significant,
        interpretation: significant
          ? '데이터가 무작위 패턴을 따르지 않는 것으로 보임'
          : '데이터가 무작위 패턴을 따르는 것으로 보임',
        runSequence: runs,
        statistics: {
          n1: pythonResult.n1,
          n2: pythonResult.n2,
          totalN,
          cutPoint: median
        }
      }

      actions.completeAnalysis?.(result, 3)
    } catch (error) {
      console.error('런 검정 분석 중 오류:', error)

      const errorMessage = error instanceof Error ? error.message : '런 검정 분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])

  // "다음 단계" button handler
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent) {
      actions.setError?.('분석할 변수를 선택해주세요.')
      return
    }

    actions.setCurrentStep?.(3)
    await runAnalysis()
  }, [selectedVariables, actions, runAnalysis])

  // Step change handler
  const handleStepChange = useCallback((step: number) => {
    actions.setCurrentStep?.(step - 1) // 1-based → 0-based
  }, [actions])

  // Open new window handler
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    // TODO: 구현 예정
    console.log('Open new window:', uploadedData.fileName)
  }, [uploadedData])

  // Render methods
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shuffle className="w-5 w-5" />
              런 검정이란?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              연속된 데이터에서 <strong>런(run)</strong>의 개수를 이용하여
              데이터가 무작위로 배열되었는지를 검정합니다.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs font-medium mb-1">런(Run)이란?</p>
              <p className="text-xs text-muted-foreground">
                동일한 특성을 가진 연속된 관측값들의 그룹<br/>
                예: A-A-B-B-B-A → 3개의 런
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
                <span className="text-sm">시계열 데이터의 패턴 검정</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">품질 관리 데이터 분석</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">게임 결과의 공정성 검정</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">생물학적 시퀀스 분석</span>
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
            <li>• 데이터가 순서대로 배열되어 있어야 함</li>
            <li>• 각 관측값이 독립적이어야 함</li>
            <li>• 이분법적 분류가 가능해야 함 (중앙값 기준 등)</li>
            <li>• 표본 크기가 충분해야 함 (n ≥ 20 권장)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep?.(1)} className="flex items-center space-x-2">
          <span>다음: 데이터 업로드</span>
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ), [actions])

  const renderVariableSelection = useCallback(() => {
    const selectedDependent = selectedVariables?.dependent || ''

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">시퀀스 변수 선택</h4>
          <p className="text-sm text-gray-500 mb-3">무작위성을 검정할 연속 데이터 변수를 선택하세요</p>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map((header: string) => {
              const isSelected = selectedDependent === header
              return (
                <Badge
                  key={header}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer max-w-[200px] truncate"
                  title={header}
                  onClick={() => handleVariableSelect(header)}
                >
                  {header}
                  {isSelected && (
                    <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />
                  )}
                </Badge>
              )
            })}
          </div>
        </div>

        {selectedDependent && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>선택 완료</AlertTitle>
            <AlertDescription>
              시퀀스 변수: <strong>{selectedDependent}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">분석 가이드</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>순차성</strong>: 데이터가 시간이나 순서에 따라 배열되어야 함</li>
            <li>• <strong>중앙값 분류</strong>: 중앙값을 기준으로 이분화 (≥ median, &lt; median)</li>
            <li>• <strong>런 개수</strong>: 너무 적으면 군집화, 너무 많으면 교대 패턴</li>
            <li>• <strong>최소 표본</strong>: 정규근사를 위해 n ≥ 20 권장</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => actions.setCurrentStep?.(1)}
          >
            이전: 데이터 업로드
          </Button>

          <Button
            onClick={handleNextStep}
            disabled={!selectedDependent || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                분석 중...
              </>
            ) : (
              '다음 단계: 분석 실행'
            )}
          </Button>
        </div>
      </div>
    )
  }, [selectedVariables, numericColumns, error, isAnalyzing, handleVariableSelect, handleNextStep, actions])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">분석 결과가 없습니다.</p>
          <Button onClick={() => actions.setCurrentStep?.(2)} variant="outline">
            변수 선택으로 돌아가기
          </Button>
        </div>
      )
    }

    const { totalRuns, expectedRuns, zStatistic, pValue, significant, statistics, runSequence, interpretation } = results

    return (
      <div className="space-y-6">
        {/* 주요 결과 요약 */}
        <Alert className={significant ? "border-red-500 bg-muted" : "border-green-500 bg-muted"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>검정 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p className="font-medium">
                Z = {zStatistic.toFixed(3)}, p = {pValue.toFixed(3)}
              </p>
              <p>
                {significant
                  ? "❌ 데이터가 무작위 패턴을 따르지 않습니다 (p < 0.05)"
                  : "✅ 데이터가 무작위 패턴을 따르는 것으로 보입니다 (p ≥ 0.05)"}
              </p>
              <p className="text-sm text-muted-foreground">{interpretation}</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* 런 통계량 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">런 통계량</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-medium">관측된 런</p>
                  <p className="text-xl font-bold text-muted-foreground">{totalRuns}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">기댓값</p>
                  <p className="text-xl font-bold text-gray-600">{expectedRuns.toFixed(1)}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>첫 번째 범주 (n₁)</span>
                  <Badge>{statistics.n1}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>두 번째 범주 (n₂)</span>
                  <Badge>{statistics.n2}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>전체 샘플 수</span>
                  <Badge>{statistics.totalN}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">검정 통계량</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="font-medium">Z-통계량</p>
                <p className="text-2xl font-bold text-primary">{zStatistic.toFixed(3)}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>p-value</span>
                  <Badge variant={significant ? "destructive" : "default"}>
                    {pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>유의수준 (α = 0.05)</span>
                  <Badge variant={significant ? "destructive" : "secondary"}>
                    {significant ? "기각" : "채택"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 런 시퀀스 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">런 시퀀스 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {runSequence.map((item, idx) => (
                  <div key={idx} className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    item.run % 2 === 1 ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    Run {item.run}: {String(item.value)} ({item.runLength})
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                * 괄호 안 숫자는 런의 길이를 나타냅니다.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 해석 가이드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">결과 해석 가이드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>런 검정 해석</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <p><strong>런이 너무 적은 경우:</strong> 데이터에 군집화 경향이 있음</p>
                  <p><strong>런이 너무 많은 경우:</strong> 데이터가 교대로 변화하는 패턴</p>
                  <p><strong>런이 적절한 경우:</strong> 데이터가 무작위 패턴을 따름</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 런 검정은 데이터의 순서가 중요합니다</li>
                <li>• 중앙값을 기준으로 이분화할 때 동점 처리 방법을 고려하세요</li>
                <li>• 작은 표본에서는 정확한 확률을 계산해야 할 수 있습니다</li>
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
  }, [results, actions])

  return (
    <TwoPanelLayout
      currentStep={currentStep + 1} // 0-based → 1-based
      steps={STEPS}
      onStepChange={handleStepChange}
      analysisTitle="런 검정"
      analysisSubtitle="Runs Test - 데이터 시퀀스의 무작위성 검정"
      analysisIcon={<Shuffle className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        onOpenNewWindow: handleOpenNewWindow
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onPrevious={() => actions.setCurrentStep?.(0)}
        />
      )}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
