'use client'

import React, { useCallback, useEffect } from 'react'
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

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import type { CochranQVariables } from '@/types/statistics'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Cochran Q Test 결과
 */
interface CochranQTestResult {
  /** Q 통계량 */
  qStatistic: number
  /** p-value */
  pValue: number
  /** 자유도 */
  df: number
  /** 유의성 여부 */
  significant: boolean
  /** 해석 */
  interpretation: string
  /** 피험자 수 */
  nSubjects: number
  /** 조건 수 */
  nConditions: number
  /** 조건별 성공률 */
  conditionSuccessRates: Array<{
    condition: string
    successRate: number
    successCount: number
  }>
  /** 분할표 (n × k) */
  contingencyTable: number[][]
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function CochranQTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('cochran-q')
  }, [])

  // useStatisticsPage hook
  const { state, actions } = useStatisticsPage<CochranQTestResult, CochranQVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'intro',
      number: 1,
      title: 'Cochran Q 검정 소개',
      description: '반복측정 이진 데이터 분석 개념',
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
      description: '피험자 및 조건 변수 선택 (3개 이상)',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Cochran Q 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  // ============================================================================
  // 핸들러 함수
  // ============================================================================

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(2)
    },
    'cochran-q'
  )

  /**
   * 이진값 변환 헬퍼
   */
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

  /**
   * 변수 선택 핸들러
   */
  const handleVariableSelection = useCallback((variables: unknown) => {
    if (!variables || typeof variables !== 'object') return

    const vars = variables as { independent?: string; dependent?: string[] }

    if (vars.independent && vars.dependent && vars.dependent.length >= 3) {
      const cochranVars: CochranQVariables = {
        independent: vars.independent,
        dependent: vars.dependent
      }

      actions.setSelectedVariables?.(cochranVars)
      actions.setCurrentStep?.(3)
    }
  }, [actions])

  /**
   * 분석 실행 핸들러
   */
  const runAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) return

    actions.startAnalysis?.()

    try {
      const { independent: subjectVar, dependent: conditionVars } = selectedVariables

      // 1️⃣ 데이터 추출 및 2D 행렬 생성
      // subjects를 기준으로 정렬하여 행 순서 보장
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
        3, // worker3-nonparametric-anova.py
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
        interpretation = `조건 간 성공률에 유의한 차이가 있습니다 (Q = ${pythonResult.qStatistic.toFixed(2)}, p = ${pythonResult.pValue.toFixed(3)}). 적어도 한 조건의 성공률이 다른 조건과 다릅니다.`
      } else {
        interpretation = `조건 간 성공률에 유의한 차이가 없습니다 (Q = ${pythonResult.qStatistic.toFixed(2)}, p = ${pythonResult.pValue.toFixed(3)}). 모든 조건의 성공률이 유사합니다.`
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
        contingencyTable: dataMatrix
      }

      if (!actions.completeAnalysis) {
        console.error('[cochran-q] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('Cochran Q 검정 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[cochran-q] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Cochran Q 검정 분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, selectedVariables, convertToBinary, actions])

  // ============================================================================
  // JSX 렌더링
  // ============================================================================

  return (
    <StatisticsPageLayout
      title="Cochran Q 검정"
      subtitle="Cochran Q Test - 반복측정 이진 자료 분석"
      icon={<Calculator className="w-6 h-6" />}
      methodInfo={{
        formula: 'Q = (k-1)[k∑R²ᵢ - (∑Rᵢ)²] / [k∑Cⱼ - ∑C²ⱼ]',
        assumptions: ['반복측정 설계', '이진 자료 (0/1)', '최소 2명 피험자, 3개 조건'],
        sampleSize: '피험자 2명 이상, 조건 3개 이상',
        usage: '임상시험 다중약물 비교, 교육 연구, 품질 관리'
      }}
      steps={steps}
      currentStep={currentStep}
    >
      {/* Step 0: 소개 */}
      {currentStep === 0 && (
        <StepCard
          icon={<Info className="w-6 h-6" />}
          title="Cochran Q 검정이란?"
          description="반복측정 이진 데이터 분석 방법"
        >
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>검정 개요</AlertTitle>
              <AlertDescription>
                Cochran Q 검정은 동일한 피험자가 3개 이상의 조건에서 반복 측정된 이진 데이터(0/1, 성공/실패)의 성공률을 비교하는 비모수 검정입니다.
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
                    <p className="font-medium">임상 시험</p>
                    <p className="text-sm text-muted-foreground">3가지 약물의 효과 비교 (효과 있음=1, 없음=0)</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">교육 연구</p>
                    <p className="text-sm text-muted-foreground">4가지 교수법에서 학생들의 정답률 비교</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">품질 관리</p>
                    <p className="text-sm text-muted-foreground">3가지 검사 방법의 합격률 비교</p>
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
                  <p className="text-sm"><strong>이진 데이터:</strong> 각 관측값은 0 또는 1 (성공/실패)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm"><strong>반복측정 설계:</strong> 동일 피험자가 모든 조건 경험</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm"><strong>최소 피험자:</strong> 2명 이상</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <p className="text-sm"><strong>최소 조건:</strong> 3개 이상</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button onClick={() => actions.setCurrentStep?.(1)} size="lg">
                다음 단계: 데이터 업로드
                <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </StepCard>
      )}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <StepCard
          icon={<Upload className="w-6 h-6" />}
          title="데이터 업로드"
          description="분석할 CSV 파일을 업로드하세요"
        >
          <DataUploadStep onUploadComplete={handleDataUpload} />
        </StepCard>
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          icon={<Users className="w-6 h-6" />}
          title="변수 선택"
          description="피험자 변수와 조건 변수를 선택하세요 (최소 3개 조건)"
        >
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 안내</AlertTitle>
            <AlertDescription>
              <strong>Independent (피험자 변수):</strong> 피험자를 구분하는 변수 (ID, 이름 등)<br />
              <strong>Dependent (조건 변수):</strong> 이진 변수(0/1) 3개 이상 선택 (예: 약물A, 약물B, 약물C)
            </AlertDescription>
          </Alert>

          <VariableSelectorModern
            methodId="cochran-q"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
          />
        </StepCard>
      )}

      {/* Step 3: 결과 */}
      {currentStep === 3 && (
        <StepCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="분석 실행"
          description="Cochran Q 검정을 실행하고 결과를 확인하세요"
        >
          {!results && (
            <div className="text-center py-8">
              <Button
                onClick={runAnalysis}
                size="lg"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Calculator className="mr-2 h-5 w-5 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-5 w-5" />
                    Cochran Q 검정 실행
                  </>
                )}
              </Button>
            </div>
          )}

          {results && (
            <div className="space-y-6">
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
                      <p className="text-sm text-muted-foreground">Q 통계량</p>
                      <p className="text-2xl font-bold">{results.qStatistic.toFixed(3)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">p-value</p>
                      <p className="text-2xl font-bold">{results.pValue.toFixed(4)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">자유도</p>
                      <p className="text-2xl font-bold">{results.df}</p>
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

              {/* 조건별 성공률 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    조건별 성공률
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.conditionSuccessRates.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{item.condition}</p>
                          <p className="text-sm text-muted-foreground">
                            성공: {item.successCount} / {results.nSubjects}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{(item.successRate * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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
                    <strong>피험자 수:</strong> {results.nSubjects}명
                  </p>
                  <p className="text-sm">
                    <strong>조건 수:</strong> {results.nConditions}개
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </StepCard>
      )}
    </StatisticsPageLayout>
  )
}
