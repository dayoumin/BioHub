'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { McNemarVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Calculator,
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
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'

// Guide Components
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { TestStatisticDisplay } from '@/components/statistics/common/TestStatisticDisplay'
import type { InterpretationResult } from '@/lib/interpretation/engine'

// McNemar 검정 결과 타입
interface McNemarTestResult {
  variable1: string
  variable2: string
  contingencyTable: {
    both_positive: number
    first_positive_second_negative: number
    first_negative_second_positive: number
    both_negative: number
  }
  mcnemarStatistic: number
  pValue: number
  significant: boolean
  interpretation: string
  sampleSize: number
  discordantPairs: number
  effectSize?: number
  continuityCorrection: boolean
}

export default function McNemarTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('mcnemar')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<McNemarTestResult, McNemarVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Guide components - useAnalysisGuide hook 사용
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'mcnemar'
  })
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // Breadcrumbs (useMemo)
  const breadcrumbs = useMemo(() => [
    { label: '통계 분석', href: '/statistics' },
    { label: 'McNemar 검정', href: '/statistics/mcnemar' }
  ], [])

  // McNemar 검정 단계 정의 (useMemo)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 1,
      label: 'McNemar 검정 소개',
      completed: currentStep > 0
    },
    {
      id: 2,
      label: '데이터 업로드',
      completed: !!uploadedData
    },
    {
      id: 3,
      label: '변수 선택',
      completed: !!(selectedVariables?.dependent && selectedVariables.dependent.length === 2)
    },
    {
      id: 4,
      label: '결과 해석',
      completed: !!results
    }
  ], [currentStep, uploadedData, selectedVariables, results])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'mcnemar'
  )

  // 다양한 형태의 값을 이진값으로 변환
  const convertToBinary = useCallback((value: unknown): number | null => {
    if (value === null || value === undefined) return null

    // 숫자형
    if (typeof value === 'number') {
      return value > 0 ? 1 : 0
    }

    // 문자열형
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      if (['1', 'yes', 'y', 'true', 'positive', '+', 'success'].includes(lower)) return 1
      if (['0', 'no', 'n', 'false', 'negative', '-', 'failure'].includes(lower)) return 0
    }

    // 불린형
    if (typeof value === 'boolean') {
      return value ? 1 : 0
    }

    return null
  }, [])

  const runAnalysis = useCallback(async (variables: McNemarVariables) => {
    // 배열 경계 검사
    if (!uploadedData || !Array.isArray(variables.dependent) || variables.dependent.length < 2) {
      actions.setError?.('McNemar 검정은 2개의 이진 변수가 필요합니다.')
      return
    }

    actions.startAnalysis?.()

    try {
      const variable1 = variables.dependent[0]
      const variable2 = variables.dependent[1]

      // 1️⃣ 이진 데이터 추출 및 2x2 분할표 생성
      const pairs = uploadedData.data.map(row => {
        const val1 = (row as Record<string, unknown>)[variable1]
        const val2 = (row as Record<string, unknown>)[variable2]

        const binary1 = convertToBinary(val1)
        const binary2 = convertToBinary(val2)

        return { val1: binary1, val2: binary2 }
      }).filter(pair => pair.val1 !== null && pair.val2 !== null) as Array<{val1: number, val2: number}>

      // 2x2 contingency table
      const both_positive = pairs.filter(p => p.val1 === 1 && p.val2 === 1).length
      const first_positive_second_negative = pairs.filter(p => p.val1 === 1 && p.val2 === 0).length
      const first_negative_second_positive = pairs.filter(p => p.val1 === 0 && p.val2 === 1).length
      const both_negative = pairs.filter(p => p.val1 === 0 && p.val2 === 0).length

      const contingencyTable = [
        [both_positive, first_positive_second_negative],
        [first_negative_second_positive, both_negative]
      ]

      // 2️⃣ pyodideStats 래퍼 호출
      const pythonResult = await pyodideStats.mcnemarTestWorker(contingencyTable)

      // 3️⃣ 결과 매핑 (Python → TypeScript)
      const b = pythonResult.discordantPairs.b
      const c = pythonResult.discordantPairs.c
      const discordantPairs = b + c
      const significant = pythonResult.pValue < 0.05

      // 효과크기 계산 (Odds Ratio)
      const effectSize = c === 0 ? (b === 0 ? 1 : Infinity) : b / c

      // 해석
      let interpretation: string
      if (discordantPairs === 0) {
        interpretation = '불일치 쌍이 없어 두 처리간 차이를 평가할 수 없습니다.'
      } else if (significant) {
        interpretation = `두 처리 간 유의한 차이가 있습니다 (p = ${pythonResult.pValue.toFixed(3)})`
      } else {
        interpretation = `두 처리 간 유의한 차이가 없습니다 (p = ${pythonResult.pValue.toFixed(3)})`
      }

      const result: McNemarTestResult = {
        variable1,
        variable2,
        contingencyTable: {
          both_positive,
          first_positive_second_negative,
          first_negative_second_positive,
          both_negative
        },
        mcnemarStatistic: pythonResult.statistic,
        pValue: pythonResult.pValue,
        significant,
        interpretation,
        sampleSize: pairs.length,
        discordantPairs,
        effectSize: isFinite(effectSize) ? effectSize : undefined,
        continuityCorrection: pythonResult.continuityCorrection
      }

      if (!actions.completeAnalysis) {
        console.error('[mcnemar] completeAnalysis not available')
        return
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(result, 2)
    } catch (error) {
      console.error('McNemar 검정 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[mcnemar] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'McNemar 검정 분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, convertToBinary, actions])

  // Badge 기반 변수 선택 핸들러 (Critical Bug 예방)
  const handleFirstVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [] }
    const currentDependent = Array.isArray(current.dependent) ? current.dependent : []

    // 첫 번째 변수 선택/해제
    const newFirst = currentDependent[0] === varName ? '' : varName
    const newDependent = newFirst
      ? [newFirst, currentDependent[1] || ''].filter(v => v !== '')
      : [currentDependent[1] || ''].filter(v => v !== '')

    actions.setSelectedVariables?.({
      dependent: newDependent
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  const handleSecondVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: [] }
    const currentDependent = Array.isArray(current.dependent) ? current.dependent : []

    // 두 번째 변수 선택/해제
    const newSecond = currentDependent[1] === varName ? '' : varName
    const newDependent = newSecond
      ? [currentDependent[0] || '', newSecond].filter(v => v !== '')
      : [currentDependent[0] || ''].filter(v => v !== '')

    actions.setSelectedVariables?.({
      dependent: newDependent
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // "다음 단계" 버튼: Step 변경 + 분석 실행
  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent && selectedVariables.dependent.length === 2) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              McNemar 검정이란?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              동일한 대상에서 두 시점 또는 두 처리에서 측정한
              <strong>이진 변수의 변화</strong>를 검정하는 방법입니다.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs font-medium mb-1">검정 통계량</p>
              <p className="text-xs text-muted-foreground">
                χ² = (b - c)² / (b + c)<br/>
                b, c: 불일치 쌍의 개수
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
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">치료 전후 효과 비교</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">두 진단 방법의 일치도</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">마케팅 캠페인 효과</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">의사결정 변화 분석</span>
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
            <li>• 대응하는 이진 자료 (paired binary data)</li>
            <li>• 동일한 개체에서 두 번의 측정</li>
            <li>• 불일치 쌍 수가 5개 이상 권장</li>
            <li>• 독립성 가정 (각 쌍이 독립적)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">2×2 분할표 구조</h4>
        <div className="text-xs">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2 text-center" colSpan={2}>두 번째 측정</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 p-2">첫 번째 측정</td>
                <td className="border border-gray-300 p-2">Positive</td>
                <td className="border border-gray-300 p-2">Negative</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">Positive</td>
                <td className="border border-gray-300 p-2 bg-muted">a (일치)</td>
                <td className="border border-gray-300 p-2 bg-muted">b (불일치)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Negative</td>
                <td className="border border-gray-300 p-2 bg-muted">c (불일치)</td>
                <td className="border border-gray-300 p-2 bg-muted">d (일치)</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-gray-600">McNemar 검정은 불일치 쌍 (b, c)만을 사용합니다.</p>
        </div>
      </div>

      {/* Analysis Guide Panel */}
      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {/* Assumption Checklist */}
      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="분석 전 가정 확인"
          description="McNemar 검정의 기본 가정을 확인해주세요."
        />
      )}

      <div className="text-center">
        <Button
          onClick={() => actions.setCurrentStep?.(1)}
          className="w-full md:w-auto"
        >
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions, methodMetadata, assumptionItems])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={handleDataUpload}
      onPrevious={() => {
        if (actions.setCurrentStep) {
          actions.setCurrentStep(0)
        }
      }}
    />
  ), [handleDataUpload, actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const columns = Object.keys(uploadedData.data[0] || {})
    const currentDependent = Array.isArray(selectedVariables?.dependent) ? selectedVariables.dependent : []
    const firstVariable = currentDependent[0] || ''
    const secondVariable = currentDependent[1] || ''

    const isValid = currentDependent.length === 2

    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>첫 번째 변수</strong>: 처리 전 또는 첫 번째 측정값</p>
              <p>• <strong>두 번째 변수</strong>: 처리 후 또는 두 번째 측정값</p>
              <p>• 각 변수는 이진값(0/1, Yes/No, True/False 등)이어야 합니다</p>
              <p>• 동일한 개체에서 측정한 대응 자료여야 합니다</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* 첫 번째 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">첫 번째 변수 (처리 전 / 첫 번째 측정)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map(header => {
                const isSelected = firstVariable === header
                const isSameAsSecond = secondVariable === header
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSameAsSecond ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    onClick={() => !isSameAsSecond && handleFirstVariableSelect(header)}
                    title={isSameAsSecond ? `${header} (두 번째 변수와 동일 - 선택 불가)` : header}
                  >
                    {header}
                  </Badge>
                )
              })}
            </div>
            {firstVariable && (
              <p className="mt-2 text-sm text-muted-foreground">
                선택됨: <strong>{firstVariable}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* 두 번째 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">두 번째 변수 (처리 후 / 두 번째 측정)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map(header => {
                const isSelected = secondVariable === header
                const isSameAsFirst = firstVariable === header
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSameAsFirst ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    onClick={() => !isSameAsFirst && handleSecondVariableSelect(header)}
                    title={isSameAsFirst ? `${header} (첫 번째 변수와 동일 - 선택 불가)` : header}
                  >
                    {header}
                  </Badge>
                )
              })}
            </div>
            {secondVariable && (
              <p className="mt-2 text-sm text-muted-foreground">
                선택됨: <strong>{secondVariable}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* 검증 결과 */}
        {!isValid && (currentDependent.length > 0) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>변수 선택 필요</AlertTitle>
            <AlertDescription>
              McNemar 검정은 정확히 2개의 이진 변수가 필요합니다.
            </AlertDescription>
          </Alert>
        )}

        {isValid && (
          <Alert className="border-success-border bg-success-bg">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">변수 선택 완료</AlertTitle>
            <AlertDescription className="text-success">
              2개의 변수가 선택되었습니다. 다음 단계로 진행하세요.
            </AlertDescription>
          </Alert>
        )}

        {/* 다음 단계 버튼 */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => actions.setCurrentStep?.(1)}
          >
            이전 단계
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!isValid || isAnalyzing}
          >
            {isAnalyzing ? '분석 중...' : '다음 단계'}
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, handleFirstVariableSelect, handleSecondVariableSelect, handleNextStep, isAnalyzing, actions])

  const renderResults = useCallback(() => {
    if (!results) return null

    // Build variable list for context header
    const usedVariables = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent
      : selectedVariables?.dependent ? [selectedVariables.dependent] : []

    const {
      variable1,
      variable2,
      contingencyTable,
      mcnemarStatistic,
      pValue,
      significant,
      interpretation,
      sampleSize,
      discordantPairs,
      effectSize,
      continuityCorrection
    } = results

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="McNemar 검정"
          analysisSubtitle="McNemar Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />
        {/* 2x2 분할표 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2×2 분할표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-medium" colSpan={2}>
                      {variable2}
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">합계</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-3 font-medium">{variable1}</td>
                    <td className="border border-gray-300 p-3 text-center">Positive</td>
                    <td className="border border-gray-300 p-3 text-center">Negative</td>
                    <td className="border border-gray-300 p-3 text-center"></td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">Positive</td>
                    <td className="border border-gray-300 p-3 text-center bg-muted">
                      <div className="font-bold">{contingencyTable.both_positive}</div>
                      <div className="text-xs text-gray-500">(a)</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center bg-muted">
                      <div className="font-bold">{contingencyTable.first_positive_second_negative}</div>
                      <div className="text-xs text-gray-500">(b)</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      {contingencyTable.both_positive + contingencyTable.first_positive_second_negative}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Negative</td>
                    <td className="border border-gray-300 p-3 text-center bg-muted">
                      <div className="font-bold">{contingencyTable.first_negative_second_positive}</div>
                      <div className="text-xs text-gray-500">(c)</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center bg-muted">
                      <div className="font-bold">{contingencyTable.both_negative}</div>
                      <div className="text-xs text-gray-500">(d)</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      {contingencyTable.first_negative_second_positive + contingencyTable.both_negative}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 font-medium">
                    <td className="border border-gray-300 p-3">합계</td>
                    <td className="border border-gray-300 p-3 text-center">
                      {contingencyTable.both_positive + contingencyTable.first_negative_second_positive}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      {contingencyTable.first_positive_second_negative + contingencyTable.both_negative}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">{sampleSize}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              <p>• 불일치 쌍 (b + c): {discordantPairs}개</p>
              <p>• 일치 쌍 (a + d): {contingencyTable.both_positive + contingencyTable.both_negative}개</p>
            </div>
          </CardContent>
        </Card>

        {/* 검정 통계량 - TestStatisticDisplay + 표본 정보 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* TestStatisticDisplay: χ²(1) + p-value + APA 복사 */}
          <TestStatisticDisplay
            name="χ²"
            value={mcnemarStatistic}
            df={1}
            pValue={pValue}
            showFormatted={true}
            showCopyButton={true}
            size="default"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">표본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>총 표본수</span>
                  <Badge>{sampleSize}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>유효 쌍</span>
                  <Badge>{sampleSize}</Badge>
                </div>
                {effectSize && isFinite(effectSize) && (
                  <div className="flex justify-between">
                    <span>오즈비 (Odds Ratio)</span>
                    <Badge variant={effectSize > 2 ? "default" : effectSize > 1.5 ? "secondary" : "outline"}>
                      {effectSize.toFixed(3)}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>연속성 수정</span>
                  <Badge variant={continuityCorrection ? "default" : "outline"}>
                    {continuityCorrection ? "적용" : "미적용"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 효과크기 카드 */}
        {effectSize && isFinite(effectSize) && (
          <EffectSizeCard
            title="효과크기 (Odds Ratio)"
            value={effectSize}
            type="r"
            showInterpretation={true}
            showVisualScale={true}
          />
        )}

        {/* 결과 해석 */}
        <ResultInterpretation
          result={{
            title: 'McNemar 검정 결과 해석',
            summary: significant
              ? `두 처리 간에 통계적으로 유의한 차이가 있습니다 (χ² = ${mcnemarStatistic.toFixed(3)}, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(3)}). 불일치 쌍 수 = ${discordantPairs}개로, ${contingencyTable.first_positive_second_negative > contingencyTable.first_negative_second_positive ? '첫 번째 처리에서 양성 → 음성 전환이 더 많았습니다' : '두 번째 처리에서 양성 → 음성 전환이 더 많았습니다'}.`
              : `두 처리 간에 통계적으로 유의한 차이가 없습니다 (χ² = ${mcnemarStatistic.toFixed(3)}, p = ${pValue.toFixed(3)}). 불일치 쌍 수 = ${discordantPairs}개로, 두 처리의 효과가 유사합니다.`,
            statistical: `McNemar χ² = ${mcnemarStatistic.toFixed(4)}, df = 1, p = ${pValue < 0.001 ? '< 0.001' : pValue.toFixed(4)}, n = ${sampleSize}, 불일치 쌍 = ${discordantPairs}${effectSize && isFinite(effectSize) ? `, Odds Ratio = ${effectSize.toFixed(3)}` : ''}${continuityCorrection ? ' (연속성 수정 적용)' : ''}`,
            practical: effectSize && isFinite(effectSize)
              ? effectSize > 2 || effectSize < 0.5
                ? `Odds Ratio = ${effectSize.toFixed(3)}로 큰 효과를 보입니다. ${effectSize > 1 ? '첫 번째 처리가 양성 반응을 유도하는 경향이 더 강합니다.' : '두 번째 처리가 양성 반응을 유도하는 경향이 더 강합니다.'}`
                : effectSize > 1.5 || effectSize < 0.67
                  ? `Odds Ratio = ${effectSize.toFixed(3)}로 중간 정도의 효과를 보입니다.`
                  : `Odds Ratio = ${effectSize.toFixed(3)}로 효과가 작거나 차이가 없습니다.`
              : '효과크기를 계산할 수 없습니다 (불일치 쌍 부족).'
          } satisfies InterpretationResult}
        />

        {/* 주의사항 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">주의사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 불일치 쌍이 5개 미만일 때는 정확검정 사용 권장</li>
                <li>• 대응성이 중요: 동일한 개체의 전후 비교여야 함</li>
                <li>• 일치하는 쌍은 검정에 기여하지 않음</li>
                <li>• 표본 크기가 작을 때 연속성 수정 자동 적용</li>
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
  }, [results, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="McNemar 검정"
      analysisSubtitle="McNemar Test - 대응 이진 자료의 변화 검정"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </TwoPanelLayout>
  )
}
