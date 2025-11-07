'use client'

import React, { useState, useCallback } from 'react'
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

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'

// 데이터 인터페이스
interface VariableSelection {
  variables: string[]
}

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
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<McNemarTestResult, McNemarVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state

  // McNemar 검정 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: 'McNemar 검정 소개',
      description: '대응 이진 자료 분석 개념',
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
      description: '대응하는 이진 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'McNemar 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
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

  const runAnalysis = useCallback(async (variables: string[]) => {
    if (!uploadedData || variables.length < 2) return

    actions.startAnalysis()

    try {
      const variable1 = variables[0]
      const variable2 = variables[1]

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

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        statistic: number
        pValue: number
        continuityCorrection: boolean
        discordantPairs: { b: number; c: number }
      }>(
        3, // worker3-nonparametric-anova.py
        'mcnemar_test',
        {
          contingency_table: contingencyTable
        }
      )

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

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('McNemar 검정 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[mcnemar] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'McNemar 검정 분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, convertToBinary, actions])

  const handleVariableSelection = createVariableSelectionHandler<unknown>(
    actions.setSelectedVariables as ((mapping: unknown) => void) | undefined,
    (variables) => {
      if (!variables || typeof variables !== 'object') return

      // Extract variable names from the selection object
      const variableSelection = variables as { variables: string[] }
      const selectedVars = variableSelection.variables || []

      // 자동으로 분석 실행
      runAnalysis(selectedVars)
    },
    'mcnemar'
  )

  const renderMethodIntroduction = () => (
    <StepCard
      title="McNemar 검정"
      description="대응하는 이진 자료의 변화를 분석하는 비모수 검정"
      icon={<Info className="w-5 h-5 text-blue-500" />}
    >
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
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">치료 전후 효과 비교</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">두 진단 방법의 일치도</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">마케팅 캠페인 효과</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
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

        <div className="text-center">
          <Button
            onClick={() => actions.setCurrentStep(1)}
            className="w-full md:w-auto"
          >
            데이터 업로드하기
          </Button>
        </div>
      </div>
    </StepCard>
  )

  const renderDataUpload = () => (
    <StepCard
      title="데이터 업로드"
      description="McNemar 검정을 수행할 대응 이진 자료를 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onPrevious={() => {
          if (actions.setCurrentStep) {
            actions.setCurrentStep(0)
          }
        }}
      />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements('mcnemar')

    const columns = Object.keys(uploadedData.data[0] || {})
    const variables = columns.map(col => ({
      name: col,
      type: detectVariableType(
        uploadedData.data.map(row => row[col]),
        col
      ),
      stats: {
        missing: uploadedData.data.filter(row => !row[col]).length,
        unique: [...new Set(uploadedData.data.map(row => row[col]))].length,
        min: Math.min(...uploadedData.data.map(row => Number(row[col]) || 0)),
        max: Math.max(...uploadedData.data.map(row => Number(row[col]) || 0))
      }
    }))

    return (
      <StepCard
        title="변수 선택"
        description="대응하는 두 이진 변수를 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <Alert className="mb-4">
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
        <VariableSelector
          methodId="mcnemar"
          data={uploadedData.data}
          onVariablesSelected={handleVariableSelection}
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!results) return null

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
      <StepCard
        title="McNemar 검정 결과"
        description="대응 이진 자료의 변화 검정 결과"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className={significant ? "border-red-500 bg-muted" : "border-green-500 bg-muted"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>검정 결과</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="font-medium">
                  χ² = {mcnemarStatistic.toFixed(4)}, p = {pValue.toFixed(3)}
                </p>
                <p>
                  {significant
                    ? "❌ 두 처리간 유의한 차이가 있습니다 (p < 0.05)"
                    : "✅ 두 처리간 유의한 차이가 없습니다 (p ≥ 0.05)"}
                </p>
                <p className="text-sm text-muted-foreground">{interpretation}</p>
                {continuityCorrection && (
                  <p className="text-xs text-muted-foreground">연속성 수정이 적용되었습니다 (불일치 쌍 &lt; 25)</p>
                )}
              </div>
            </AlertDescription>
          </Alert>

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

          {/* 검정 통계량 */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">검정 통계량</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="font-medium">McNemar χ²</p>
                  <p className="text-2xl font-bold text-primary">{mcnemarStatistic.toFixed(4)}</p>
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
                    <span>자유도</span>
                    <Badge variant="outline">1</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>불일치 쌍</span>
                    <Badge variant="secondary">{discordantPairs}</Badge>
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
                    <span>총 표본수</span>
                    <Badge>{sampleSize}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>유효 쌍</span>
                    <Badge>{sampleSize}</Badge>
                  </div>
                  {effectSize && isFinite(effectSize) && (
                    <div className="flex justify-between">
                      <span>오즈비</span>
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

          {/* 해석 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">결과 해석 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>McNemar 검정 해석</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>귀무가설(H₀):</strong> 두 처리의 효과가 동일하다 (marginal probability가 같다)</p>
                    <p><strong>대립가설(H₁):</strong> 두 처리의 효과가 다르다</p>
                    <p><strong>판단기준:</strong> p-value &lt; 0.05이면 귀무가설 기각</p>
                  </div>
                </AlertDescription>
              </Alert>

              {effectSize && isFinite(effectSize) && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">오즈비 해석</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• <strong>1에 가까움</strong>: 처리 효과 차이 없음</p>
                    <p>• <strong>1보다 큼</strong>: 첫 번째 처리가 더 효과적</p>
                    <p>• <strong>1보다 작음</strong>: 두 번째 처리가 더 효과적</p>
                    <p className="mt-2 font-medium">현재 오즈비: {effectSize.toFixed(3)}</p>
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">주의사항</h4>
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
      title="McNemar 검정"
      subtitle="McNemar Test - 대응 이진 자료의 변화 검정"
      icon={<Calculator className="w-6 h-6" />}
      methodInfo={{
        formula: 'χ² = (b - c)² / (b + c), 자유도 = 1',
        assumptions: ['대응 이진 자료', '독립성', '불일치 쌍 ≥ 5개'],
        sampleSize: '불일치 쌍 5개 이상 권장',
        usage: '치료 전후 비교, 진단법 일치도, 마케팅 효과 측정'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => {
        if (selectedVariables && Array.isArray(selectedVariables)) {
          runAnalysis(selectedVariables)
        }
      }}
      onReset={() => {
        if (actions.setCurrentStep) {
          actions.setCurrentStep(0)
        }
        if (actions.setUploadedData) {
          actions.setUploadedData(null)
        }
        if (actions.setSelectedVariables) {
          actions.setSelectedVariables(null)
        }
        // Note: setResults accepts null in the hook implementation
        // but TypeScript requires the exact type. We'll skip this call.
      }}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}