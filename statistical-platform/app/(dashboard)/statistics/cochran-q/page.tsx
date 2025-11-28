'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
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
  BarChart3,
  Layers
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import type { CochranQVariables } from '@/types/statistics'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Post-hoc comparison for Cochran Q
interface CochranQPostHocComparison {
  condition1: number
  condition2: number
  b: number
  c: number
  chiSquare: number
  pValue: number
  pAdjusted: number
  rateDiff: number
  rate1: number
  rate2: number
  significant: boolean
}

// Cochran Q Test 결과
interface CochranQTestResult {
  qStatistic: number
  pValue: number
  df: number
  significant: boolean
  interpretation: string
  nSubjects: number
  nConditions: number
  conditionSuccessRates: Array<{
    condition: string
    successRate: number
    successCount: number
  }>
  contingencyTable: number[][]
  postHoc?: {
    method: string
    comparisons: CochranQPostHocComparison[]
    pAdjustMethod: string
    nComparisons: number
  }
}

export default function CochranQTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('cochran-q')
  }, [])

  // useStatisticsPage hook
  const { state, actions } = useStatisticsPage<CochranQTestResult, CochranQVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // Breadcrumbs (useMemo)
  const breadcrumbs = useMemo(() => [
    { label: '통계 분석', href: '/statistics' },
    { label: 'Cochran Q 검정', href: '/statistics/cochran-q' }
  ], [])

  // 단계 정의 (useMemo)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: 'Cochran Q 검정 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: !!uploadedData
    },
    {
      id: 2,
      label: '변수 선택',
      completed: !!selectedVariables?.independent && !!selectedVariables?.dependent && (selectedVariables?.dependent as string[])?.length >= 3
    },
    {
      id: 3,
      label: '결과 해석',
      completed: !!results
    }
  ], [currentStep, uploadedData, selectedVariables, results])

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'cochran-q'
  )

  // 이진값 변환 헬퍼
  const convertToBinary = useCallback((value: unknown): number | null => {
    if (value === null || value === undefined) return null

    // 숫자형
    if (typeof value === 'number') {
      if (value === 0) return 0
      if (value === 1) return 1
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

  // 분석 실행
  const runAnalysis = useCallback(async (variables: CochranQVariables) => {
    if (!uploadedData) return

    actions.startAnalysis?.()

    try {
      const { independent: subjectVar, dependent: conditionVars } = variables

      // 1️⃣ 데이터 추출 및 2D 행렬 생성
      const subjectData = new Map<string | number, number[]>()

      for (const row of uploadedData.data) {
        const subjectVal = (row as Record<string, unknown>)[subjectVar]

        if (subjectVal === null || subjectVal === undefined) continue

        const subjectKey = String(subjectVal)
        const conditionValues: number[] = []

        let validRow = true
        for (const condVar of conditionVars) {
          const condVal = (row as Record<string, unknown>)[condVar]
          const binaryVal = convertToBinary(condVal)

          if (binaryVal === null) {
            validRow = false
            break
          }

          conditionValues.push(binaryVal)
        }

        if (validRow && conditionValues.length === conditionVars.length) {
          subjectData.set(subjectKey, conditionValues)
        }
      }

      // 2D 행렬 구성: n subjects × k conditions
      const dataMatrix: number[][] = Array.from(subjectData.values())

      if (dataMatrix.length < 2) {
        throw new Error('Cochran Q 검정은 최소 2명 이상의 피험자가 필요합니다.')
      }

      if (conditionVars.length < 3) {
        throw new Error('Cochran Q 검정은 최소 3개 이상의 조건이 필요합니다.')
      }

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        qStatistic: number
        pValue: number
        df: number
      }>(
        PyodideWorker.NonparametricAnova, // worker3-nonparametric-anova.py
        'cochran_q_test',
        {
          data_matrix: dataMatrix
        }
      )

      // 3️⃣ 결과 매핑 및 추가 통계 계산
      const nSubjects = dataMatrix.length
      const nConditions = conditionVars.length

      // 조건별 성공률 계산
      const conditionSuccessRates = conditionVars.map((condVar, colIndex) => {
        const successCount = dataMatrix.reduce((sum, row) => sum + row[colIndex], 0)
        const successRate = successCount / nSubjects

        return {
          condition: condVar,
          successRate,
          successCount
        }
      })

      const significant = pythonResult.pValue < 0.05

      let interpretation: string
      if (significant) {
        interpretation = `조건 간 유의한 차이가 있습니다 (p = ${pythonResult.pValue.toFixed(3)})`
      } else {
        interpretation = `조건 간 유의한 차이가 없습니다 (p = ${pythonResult.pValue.toFixed(3)})`
      }

      // Post-hoc test (if significant)
      let postHocResult: CochranQTestResult['postHoc'] | undefined
      if (significant && nConditions >= 3) {
        try {
          const postHocWorkerResult = await pyodideCore.callWorkerMethod<{
            method: string
            comparisons: CochranQPostHocComparison[]
            pAdjustMethod: string
            nComparisons: number
          }>(PyodideWorker.NonparametricAnova, 'cochran_q_posthoc', {
            data_matrix: dataMatrix,
            p_adjust: 'holm'
          })
          postHocResult = postHocWorkerResult
        } catch (postHocErr) {
          console.warn('Cochran Q post-hoc test failed:', postHocErr)
          // Continue without post-hoc results
        }
      }

      const result: CochranQTestResult = {
        qStatistic: pythonResult.qStatistic,
        pValue: pythonResult.pValue,
        df: pythonResult.df,
        significant,
        interpretation,
        nSubjects,
        nConditions,
        conditionSuccessRates,
        contingencyTable: dataMatrix,
        postHoc: postHocResult
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(result, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cochran Q 검정 분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, convertToBinary, actions])

  // Badge 기반 변수 선택 핸들러 (Critical Bug 예방)
  const handleIndependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { independent: '', dependent: [] }
    const newIndependent = current.independent === varName ? '' : varName

    actions.setSelectedVariables?.({
      independent: newIndependent,
      dependent: current.dependent || []
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { independent: '', dependent: [] }
    const currentDependent = Array.isArray(current.dependent) ? current.dependent : []
    const isSelected = currentDependent.includes(varName)

    const newDependent = isSelected
      ? currentDependent.filter(v => v !== varName)
      : [...currentDependent, varName]

    actions.setSelectedVariables?.({
      independent: current.independent || '',
      dependent: newDependent
    })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // "다음 단계" 버튼: Step 변경 + 분석 실행
  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.independent &&
        selectedVariables?.dependent &&
        selectedVariables.dependent.length >= 3) {
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
              Cochran Q 검정이란?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              동일한 피험자에게 <strong>3개 이상의 조건</strong>에서 측정한
              <strong>이진 변수의 차이</strong>를 검정하는 비모수 방법입니다.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs font-medium mb-1">검정 통계량</p>
              <p className="text-xs text-muted-foreground">
                Q = (k-1) × [k×Σ(Cⱼ)² - (ΣCⱼ)²] / [k×ΣRᵢ - Σ(Rᵢ)²]<br/>
                k: 조건 수, Cⱼ: 조건별 성공 수, Rᵢ: 피험자별 성공 수
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
                <span className="text-sm">3번 이상 반복측정 효과 비교</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">다중 치료법 성공률 비교</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">시간대별 반응률 차이 검정</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">평가자 간 일치도 분석</span>
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
            <li>• 반복측정 이진 데이터 (repeated measures binary data)</li>
            <li>• 동일한 피험자에서 3개 이상의 조건 측정</li>
            <li>• 각 조건은 이진값 (0/1, Yes/No, Success/Failure)</li>
            <li>• 독립성 가정 (피험자 간 독립)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">McNemar vs Cochran Q</AlertTitle>
        <AlertDescription className="text-blue-800">
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>McNemar</strong>: 2개 조건 비교 (사전-사후)</li>
            <li>• <strong>Cochran Q</strong>: 3개 이상 조건 비교 (반복측정)</li>
            <li>• Cochran Q는 McNemar의 일반화된 형태입니다</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="text-center">
        <Button
          onClick={() => actions.setCurrentStep?.(1)}
          className="w-full md:w-auto"
        >
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions])

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
    const currentIndependent = selectedVariables?.independent || ''
    const currentDependent = Array.isArray(selectedVariables?.dependent) ? selectedVariables.dependent : []

    const isValid = currentIndependent && currentDependent.length >= 3

    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 text-sm">
              <p>• <strong>피험자 변수</strong>: 개체 ID (예: 환자번호, 참가자ID)</p>
              <p>• <strong>조건 변수</strong>: 3개 이상의 반복측정 이진 변수</p>
              <p>• 각 조건은 0/1, Yes/No, Success/Failure 등 이진값이어야 합니다</p>
            </div>
          </AlertDescription>
        </Alert>

        {/* 피험자 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              피험자 변수 (Subject ID)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map(header => {
                const isSelected = currentIndependent === header
                const isUsedInDependent = currentDependent.includes(header)
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isUsedInDependent ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    onClick={() => !isUsedInDependent && handleIndependentSelect(header)}
                    title={isUsedInDependent ? `${header} (조건 변수에서 사용 중)` : header}
                  >
                    {header}
                  </Badge>
                )
              })}
            </div>
            {currentIndependent && (
              <p className="mt-2 text-sm text-muted-foreground">
                선택됨: <strong>{currentIndependent}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* 조건 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4" />
              조건 변수 (3개 이상 선택)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map(header => {
                const isSelected = currentDependent.includes(header)
                const isSameAsIndependent = currentIndependent === header
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      isSameAsIndependent ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    onClick={() => !isSameAsIndependent && handleDependentSelect(header)}
                    title={isSameAsIndependent ? `${header} (피험자 변수와 동일)` : header}
                  >
                    {header}
                  </Badge>
                )
              })}
            </div>
            {currentDependent.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  선택됨 ({currentDependent.length}개): <strong>{currentDependent.join(', ')}</strong>
                </p>
                {currentDependent.length < 3 && (
                  <p className="text-xs text-orange-600">
                    ⚠️ 최소 3개 이상 선택해야 합니다 (현재: {currentDependent.length}개)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 검증 결과 */}
        {!isValid && (currentIndependent || currentDependent.length > 0) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>변수 선택 필요</AlertTitle>
            <AlertDescription>
              피험자 변수 1개와 조건 변수 3개 이상을 선택해주세요.
            </AlertDescription>
          </Alert>
        )}

        {isValid && (
          <Alert className="border-success-border bg-success-bg">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">변수 선택 완료</AlertTitle>
            <AlertDescription className="text-success">
              피험자 변수 1개와 조건 변수 {currentDependent.length}개가 선택되었습니다.
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
  }, [uploadedData, selectedVariables, handleIndependentSelect, handleDependentSelect, handleNextStep, isAnalyzing, actions])

  const renderResults = useCallback(() => {
    if (!results) return null

    // Build variable list for context header
    const dependentVars = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent
      : selectedVariables?.dependent ? [selectedVariables.dependent] : []
    const usedVariables = [
      ...(selectedVariables?.independent ? [selectedVariables.independent] : []),
      ...dependentVars
    ]

    const {
      qStatistic,
      pValue,
      df,
      significant,
      interpretation,
      nSubjects,
      nConditions,
      conditionSuccessRates
    } = results

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Cochran Q 검정"
          analysisSubtitle="Cochran Q Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={results.nSubjects}
          timestamp={analysisTimestamp ?? undefined}
        />
        {/* 주요 결과 요약 */}
        <Alert className={significant ? "border-error-border bg-muted" : "border-success-border bg-muted"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>검정 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p className="font-medium">
                Q = {qStatistic.toFixed(4)}, df = {df}, p = {pValue.toFixed(3)}
              </p>
              <p>
                {significant
                  ? "❌ 조건 간 유의한 차이가 있습니다 (p < 0.05)"
                  : "✅ 조건 간 유의한 차이가 없습니다 (p ≥ 0.05)"}
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
                <p className="font-medium">Cochran Q</p>
                <p className="text-2xl font-bold text-primary">{qStatistic.toFixed(4)}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>p-value</span>
                  <PValueBadge value={pValue} />
                </div>
                <div className="flex justify-between">
                  <span>자유도</span>
                  <Badge variant="outline">{df}</Badge>
                </div>
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
                  <span>피험자 수</span>
                  <Badge>{nSubjects}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>조건 수</span>
                  <Badge>{nConditions}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>총 관측치</span>
                  <Badge variant="secondary">{nSubjects * nConditions}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 조건별 성공률 */}
        <StatisticsTable
          title="조건별 성공률"
          columns={[
            { key: 'condition', header: '조건', type: 'text' },
            { key: 'successCount', header: '성공 수', type: 'number', align: 'center' },
            { key: 'successRate', header: '성공률', type: 'percentage', align: 'center' },
            { key: 'failureCount', header: '실패 수', type: 'number', align: 'center' }
          ]}
          data={conditionSuccessRates.map((cond) => ({
            condition: cond.condition,
            successCount: cond.successCount,
            successRate: cond.successRate,
            failureCount: nSubjects - cond.successCount
          }))}
          bordered
        />

        {/* 사후검정 결과 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              사후검정 (Post-hoc Analysis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.postHoc ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{results.postHoc.method}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({results.postHoc.nComparisons}개 비교)
                  </span>
                </div>
                <StatisticsTable
                  columns={[
                    { key: 'comparison', header: '비교', type: 'text' },
                    { key: 'rateDiff', header: '성공률 차이', type: 'percentage', align: 'center' },
                    { key: 'chiSquare', header: 'χ²', type: 'number', align: 'center' },
                    { key: 'pValue', header: 'p-값', type: 'custom', align: 'center', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                    { key: 'pAdjusted', header: '보정 p-값', type: 'custom', align: 'center', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                    { key: 'significant', header: '유의성', type: 'custom', align: 'center', formatter: (v: boolean) => (
                      <Badge variant={v ? 'default' : 'outline'}>{v ? '유의' : '비유의'}</Badge>
                    )}
                  ]}
                  data={results.postHoc.comparisons.map(comp => {
                    const cond1Name = conditionSuccessRates[comp.condition1]?.condition || `조건 ${comp.condition1 + 1}`
                    const cond2Name = conditionSuccessRates[comp.condition2]?.condition || `조건 ${comp.condition2 + 1}`
                    return {
                      comparison: `${cond1Name} vs ${cond2Name}`,
                      rateDiff: comp.rateDiff,
                      chiSquare: comp.chiSquare,
                      pValue: comp.pValue,
                      pAdjusted: comp.pAdjusted,
                      significant: comp.significant
                    }
                  })}
                  bordered
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>사후검정 해석:</strong> Holm 보정된 p-값이 0.05 미만인 경우 해당 조건 간 성공률 차이가 통계적으로 유의합니다.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {significant
                  ? '사후검정 실행에 실패했습니다.'
                  : '전체 검정이 유의하지 않아 사후검정이 필요하지 않습니다. (p ≥ 0.05)'}
              </div>
            )}
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
              <AlertTitle>Cochran Q 검정 해석</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2 text-sm">
                  <p><strong>귀무가설(H₀):</strong> 모든 조건의 성공률이 동일하다</p>
                  <p><strong>대립가설(H₁):</strong> 적어도 하나의 조건 성공률이 다르다</p>
                  <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">주의사항</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 최소 3개 이상의 조건이 필요합니다</li>
                <li>• 각 조건은 반드시 이진값이어야 합니다</li>
                <li>• 피험자 간 독립성이 가정됩니다</li>
                <li>• 표본 크기가 작으면 정확검정 고려 필요</li>
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
      analysisTitle="Cochran Q 검정"
      analysisSubtitle="Cochran Q Test - 반복측정 이진 데이터 분석"
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
