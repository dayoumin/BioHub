'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import type { MoodMedianVariables } from '@/types/statistics'
import {
  Calculator,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Info,
  BarChart3,
  Target,
  TrendingUp
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideWorker } from "@/lib/services/pyodide/core/pyodide-worker.enum"
import { StatisticsTable, TableColumn } from "@/components/statistics/common/StatisticsTable"
import { openDataWindow } from '@/lib/utils/open-data-window'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Mood Median Test 결과
 */
interface MoodMedianTestResult {
  /** Chi-square 통계량 */
  statistic: number
  /** p-value */
  pValue: number
  /** 전체 중앙값 */
  grandMedian: number
  /** 분할표 (2 × k) */
  contingencyTable: number[][]
  /** 유의성 여부 */
  significant: boolean
  /** 해석 */
  interpretation: string
  /** 그룹 수 */
  nGroups: number
  /** 총 관측값 수 */
  nTotal: number
  /** 그룹별 통계 */
  groupStats: Array<{
    group: string
    n: number
    median: number
    aboveMedian: number
    belowMedian: number
  }>
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function MoodMedianTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('mood-median')
  }, [])

  // Use statistics page hook (0-based indexing)
  const { state, actions } = useStatisticsPage<MoodMedianTestResult, MoodMedianVariables>({
    withUploadedData: true,
    withError: true
    // initialStep: 0 (기본값)
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '비모수 검정', href: '/statistics' },
    { label: 'Mood Median Test' }
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
                step.id === 3 ? !!selectedVariables?.dependent && !!selectedVariables?.factor :
                step.id === 4 ? !!results : false
    }))
  }, [currentStep, uploadedData, selectedVariables, results])

  // Available variables
  const numericColumns = useMemo(() => {
    if (!uploadedData || uploadedData.data.length === 0) return []

    const firstRow = uploadedData.data[0]
    if (!firstRow || typeof firstRow !== 'object') return []

    return Object.keys(firstRow).filter(key => {
      const value = (firstRow as Record<string, unknown>)[key]
      return typeof value === 'number'
    })
  }, [uploadedData])

  const categoricalColumns = useMemo(() => {
    if (!uploadedData || uploadedData.data.length === 0) return []

    const firstRow = uploadedData.data[0]
    if (!firstRow || typeof firstRow !== 'object') return []

    return Object.keys(firstRow).filter(key => {
      const value = (firstRow as Record<string, unknown>)[key]
      return typeof value === 'string' || typeof value === 'number'
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

  // Variable selection handlers (Critical Bug Prevention)
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: '' }
    const newDependent = current.dependent === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: newDependent,
      factor: current.factor || ''
    })
    // ❌ NO setCurrentStep here
  }, [selectedVariables, actions])

  const handleFactorSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: '' }
    const newFactor = current.factor === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: current.dependent || '',
      factor: newFactor
    })
    // ❌ NO setCurrentStep here
  }, [selectedVariables, actions])

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables?.dependent || !selectedVariables?.factor) {
      actions.setError?.('종속변수와 그룹변수를 모두 선택해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const { factor: groupVar, dependent: testVar } = selectedVariables

      // 1️⃣ 데이터 추출 및 그룹별 분리
      const groupsMap = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const groupVal = (row as Record<string, unknown>)[groupVar]
        const testVal = (row as Record<string, unknown>)[testVar]

        if (
          groupVal === null || groupVal === undefined ||
          testVal === null || testVal === undefined ||
          typeof testVal !== 'number' || isNaN(testVal)
        ) {
          continue
        }

        const groupKey = String(groupVal)

        if (!groupsMap.has(groupKey)) {
          groupsMap.set(groupKey, [])
        }

        groupsMap.get(groupKey)!.push(testVal)
      }

      // 그룹 배열 생성 (최소 2개 그룹)
      const groups: number[][] = Array.from(groupsMap.values())
      const groupNames = Array.from(groupsMap.keys()).map(String)

      if (groups.length < 2) {
        throw new Error('Mood Median Test는 최소 2개 이상의 그룹이 필요합니다.')
      }

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        statistic: number
        pValue: number
        grandMedian: number
        contingencyTable: number[][]
      }>(
        PyodideWorker.NonparametricAnova, // worker3-nonparametric-anova.py
        'mood_median_test',
        {
          groups: groups
        }
      )

      // 3️⃣ 결과 매핑 및 추가 통계 계산
      const nGroups = groups.length
      const nTotal = groups.reduce((sum, g) => sum + g.length, 0)

      // 그룹별 통계 계산
      const groupStats = groups.map((groupData, index) => {
        const groupName = groupNames[index]
        const n = groupData.length

        // 중앙값 계산
        const sorted = [...groupData].sort((a, b) => a - b)
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]

        // Grand median 기준 above/below 카운트
        const aboveMedian = groupData.filter(v => v > pythonResult.grandMedian).length
        const belowMedian = groupData.filter(v => v <= pythonResult.grandMedian).length

        return {
          group: groupName,
          n,
          median,
          aboveMedian,
          belowMedian
        }
      })

      const significant = pythonResult.pValue < 0.05

      let interpretation: string
      if (significant) {
        interpretation = `그룹 간 중앙값에 유의한 차이가 있습니다 (χ² = ${pythonResult.statistic.toFixed(2)}, p = ${pythonResult.pValue.toFixed(3)}). 적어도 한 그룹의 중앙값이 다른 그룹과 다릅니다.`
      } else {
        interpretation = `그룹 간 중앙값에 유의한 차이가 없습니다 (χ² = ${pythonResult.statistic.toFixed(2)}, p = ${pythonResult.pValue.toFixed(3)}). 모든 그룹의 중앙값이 유사합니다.`
      }

      const result: MoodMedianTestResult = {
        statistic: pythonResult.statistic,
        pValue: pythonResult.pValue,
        grandMedian: pythonResult.grandMedian,
        contingencyTable: pythonResult.contingencyTable,
        significant,
        interpretation,
        nGroups,
        nTotal,
        groupStats
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(result, 3)
    } catch (error) {
      console.error('Mood Median Test 분석 중 오류:', error)

      const errorMessage = error instanceof Error ? error.message : 'Mood Median Test 분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])

  // "다음 단계" button handler
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || !selectedVariables?.factor) {
      actions.setError?.('종속변수와 그룹변수를 모두 선택해주세요.')
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
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])

  // Render methods
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>검정 개요</AlertTitle>
        <AlertDescription>
          Mood's Median Test는 2개 이상 그룹의 중앙값을 비교하는 비모수 검정입니다. 정규성 가정이 필요 없으며, 이상치에 강건합니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">사용 예시</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">의학 연구</p>
              <p className="text-sm text-muted-foreground">3가지 치료법의 회복 시간 비교 (이상치 많음)</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">환경 연구</p>
              <p className="text-sm text-muted-foreground">여러 지역의 오염도 중앙값 비교</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium">경제학</p>
              <p className="text-sm text-muted-foreground">국가별 소득 중앙값 비교 (분포 왜곡)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">가정 및 요구사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-sm"><strong>독립 표본:</strong> 각 관측값은 독립적</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-sm"><strong>순서형 이상:</strong> 데이터의 순서가 의미 있어야 함</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-sm"><strong>정규성 불필요:</strong> 정규분포 가정 없음</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <p className="text-sm"><strong>최소 그룹:</strong> 2개 이상</p>
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-muted">
        <Info className="h-4 w-4" />
        <AlertTitle>Kruskal-Wallis vs Mood Median</AlertTitle>
        <AlertDescription>
          <strong>Kruskal-Wallis:</strong> 순위 기반, 분포 차이에 민감<br />
          <strong>Mood Median:</strong> 중앙값 기반, 이상치에 강건, 해석 직관적
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
    const selectedFactor = selectedVariables?.factor || ''

    return (
      <div className="space-y-6">
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 안내</AlertTitle>
          <AlertDescription>
            <strong>Grouping Variable:</strong> 그룹을 구분하는 범주형 변수 (예: 치료법, 지역)<br />
            <strong>Test Variable:</strong> 비교할 연속형 변수 (예: 회복 시간, 오염도)
          </AlertDescription>
        </Alert>

        <div>
          <h4 className="font-medium mb-3">종속변수 (Test Variable) 선택</h4>
          <p className="text-sm text-gray-500 mb-3">비교할 연속형 변수를 선택하세요</p>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map((header: string) => {
              const isSelected = selectedDependent === header
              return (
                <Badge
                  key={header}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer max-w-[200px] truncate"
                  title={header}
                  onClick={() => handleDependentSelect(header)}
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

        <Separator />

        <div>
          <h4 className="font-medium mb-3">그룹변수 (Grouping Variable) 선택</h4>
          <p className="text-sm text-gray-500 mb-3">그룹을 구분하는 범주형 변수를 선택하세요</p>
          <div className="flex flex-wrap gap-2">
            {categoricalColumns.map((header: string) => {
              const isSelected = selectedFactor === header
              const isSameAsDependent = header === selectedDependent
              return (
                <Badge
                  key={header}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer max-w-[200px] truncate ${isSameAsDependent ? 'opacity-50' : ''}`}
                  title={isSameAsDependent ? `${header} (종속변수와 동일 - 선택 불가)` : header}
                  onClick={() => !isSameAsDependent && handleFactorSelect(header)}
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

        {selectedDependent && selectedFactor && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>선택 완료</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p>종속변수 (Test): <strong>{selectedDependent}</strong></p>
                <p>그룹변수 (Grouping): <strong>{selectedFactor}</strong></p>
              </div>
            </AlertDescription>
          </Alert>
        )}

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
            disabled={!selectedDependent || !selectedFactor || selectedDependent === selectedFactor || isAnalyzing}
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
  }, [selectedVariables, numericColumns, categoricalColumns, error, isAnalyzing, handleDependentSelect, handleFactorSelect, handleNextStep, actions])

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

    // 분할표 컬럼 정의 (동적으로 그룹명 기반)
    const contingencyTableColumns: TableColumn[] = [
      { key: 'position', header: 'Position', type: 'text', align: 'left' },
      ...results.groupStats.map((item) => ({
        key: item.group,
        header: item.group,
        type: 'number' as const,
        align: 'center' as const
      }))
    ]

    // 분할표 데이터 변환
    const contingencyTableData = [
      {
        position: 'Above Grand Median',
        ...results.groupStats.reduce((acc, item, idx) => {
          acc[item.group] = results.contingencyTable[0]?.[idx] ?? 0
          return acc
        }, {} as Record<string, number>)
      },
      {
        position: 'Below/Equal Grand Median',
        ...results.groupStats.reduce((acc, item, idx) => {
          acc[item.group] = results.contingencyTable[1]?.[idx] ?? 0
          return acc
        }, {} as Record<string, number>)
      }
    ]
    const usedVariables = [
      ...(selectedVariables?.dependent ? [selectedVariables.dependent] : []),
      ...(selectedVariables?.factor ? [selectedVariables.factor] : [])
    ]

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Mood Median Test"
          analysisSubtitle="Mood's Median Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={results.nTotal}
          timestamp={analysisTimestamp ?? undefined}
        />
        {/* 검정 통계량 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              검정 통계량
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Chi-square 통계량</p>
                <p className="text-2xl font-bold">{results.statistic.toFixed(3)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">p-value</p>
                <p className="text-2xl font-bold">{results.pValue.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">전체 중앙값 (Grand Median)</p>
                <p className="text-2xl font-bold">{results.grandMedian.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">유의성 (α=0.05)</p>
                <p className="text-2xl font-bold">
                  {results.significant ? (
                    <Badge variant="destructive">유의함</Badge>
                  ) : (
                    <Badge variant="secondary">유의하지 않음</Badge>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 그룹별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              그룹별 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.groupStats.map((item, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-lg">{item.group}</p>
                    <Badge variant="outline">n = {item.n}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">중앙값</p>
                      <p className="font-bold">{item.median.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Grand Median 이상</p>
                      <p className="font-bold">{item.aboveMedian}개</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Grand Median 이하</p>
                      <p className="font-bold">{item.belowMedian}개</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>        {/* 분할표 */}
        <StatisticsTable
          title="분할표 (2 x k)"
          columns={contingencyTableColumns}
          data={contingencyTableData}
          sortable={false}
          compactMode={true}
          bordered={true}
        />

        {/* 해석 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>결과 해석</AlertTitle>
          <AlertDescription>{results.interpretation}</AlertDescription>
        </Alert>

        {/* 표본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">표본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <strong>그룹 수:</strong> {results.nGroups}개
            </p>
            <p className="text-sm">
              <strong>총 관측값 수:</strong> {results.nTotal}개
            </p>
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
  }, [results, actions, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      currentStep={currentStep} // 0-based → 1-based
      steps={STEPS}
      onStepChange={handleStepChange}
      analysisTitle="Mood Median Test"
      analysisSubtitle="Mood's Median Test - 중앙값 기반 비모수 검정"
      analysisIcon={<Target className="h-5 w-5 text-primary" />}
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
