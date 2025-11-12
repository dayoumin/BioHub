'use client'

/**
 * Binomial Test (이항 검정) 페이지
 *
 * **목적**: 이진 결과의 성공 확률이 특정 값과 다른지 검정
 *
 * **핵심 기능**:
 * - 단일 이진 변수 선택 (0/1 또는 categorical)
 * - 성공 기준값 선택 (categorical인 경우)
 * - 귀무가설 확률 설정 (기본값: 0.5)
 * - 대립가설 선택 (양측/단측)
 *
 * **Architecture**:
 * - PyodideCore 직접 연결 (worker2:binomial_test)
 * - useStatisticsPage hook (useState 금지)
 * - useCallback (모든 이벤트 핸들러)
 *
 * **Data Flow**:
 * 1. 사용자 → 이진 변수 선택
 * 2. 프론트엔드 → 성공/실패 카운트 계산
 * 3. PyodideCore → worker2:binomial_test 호출
 * 4. 결과 표시 (p-value, 해석)
 *
 * **Type Safety**:
 * - ✅ unknown + 타입 가드 (any 금지)
 * - ✅ null/undefined 체크
 * - ✅ 명시적 타입 지정
 */

import React, { useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, Upload, Settings, BarChart3, Info } from 'lucide-react'

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'

import type { BinomialTestVariables } from '@/types/statistics'
import { toBinomialTestVariables, type VariableAssignment } from '@/types/statistics-converters'

// ============================================================================
// 타입 정의
// ============================================================================

interface BinomialTestResult {
  pValue: number
  successCount: number
  totalCount: number
  observedProportion: number
  expectedProbability: number
  alternative: 'two-sided' | 'less' | 'greater'
  significant: boolean
  interpretation: string
  confidenceInterval?: {
    lower: number
    upper: number
  }
}

interface AnalysisOptions {
  successValue: string | number | null
  probability: number
  alternative: 'two-sided' | 'less' | 'greater'
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function BinomialTestPage(): React.ReactElement {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { state, actions } = useStatisticsPage<BinomialTestResult, BinomialTestVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('binomial-test')
  }, [])

  // ============================================================================
  // State (Analysis Options)
  // ============================================================================

  const [analysisOptions, setAnalysisOptions] = React.useState<AnalysisOptions>({
    successValue: null,
    probability: 0.5,
    alternative: 'two-sided'
  })

  const [uniqueValues, setUniqueValues] = React.useState<Array<string | number>>([])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(2)
    },
    'binomial-test'
  )

  const handleVariableChange = useCallback(
    createVariableSelectionHandler<BinomialTestVariables>(
      (vars) => {
        // First callback: state update with converter
        const converted = vars ? toBinomialTestVariables(vars as unknown as VariableAssignment) : null
        actions.setSelectedVariables?.(converted)

        // Extract unique values for the selected variable
        if (converted?.dependent && uploadedData) {
          const values = new Set<string | number>()
          for (const row of uploadedData.data) {
            const value = (row as Record<string, unknown>)[converted.dependent]
            if (value !== null && value !== undefined) {
              if (typeof value === 'number' || typeof value === 'string') {
                values.add(value)
              }
            }
          }

          const uniqueArr = Array.from(values)
          setUniqueValues(uniqueArr)

          // 이진 변수인 경우 자동으로 첫 번째 값을 성공값으로 설정
          if (uniqueArr.length === 2) {
            setAnalysisOptions(prev => ({
              ...prev,
              successValue: uniqueArr[0]
            }))
          } else {
            setAnalysisOptions(prev => ({
              ...prev,
              successValue: null
            }))
          }
        }
      },
      (vars) => {
        // Second callback: no auto-run for binomial-test (user needs to set options first)
        // We don't auto-run because the user needs to configure successValue and other options
      },
      'binomial-test'
    ),
    [uploadedData, actions]
  )

  const runAnalysis = useCallback(async (variables: BinomialTestVariables) => {
    if (!uploadedData) return
    if (!variables.dependent) return
    if (analysisOptions.successValue === null) {
      actions.setError('성공 기준값을 선택해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      // 1️⃣ 데이터 추출 및 성공/실패 카운트
      let successCount = 0
      let totalCount = 0

      for (const row of uploadedData.data) {
        const value = (row as Record<string, unknown>)[variables.dependent]

        if (value === null || value === undefined) {
          continue
        }

        totalCount++

        // 성공 판정
        if (value === analysisOptions.successValue) {
          successCount++
        }
      }

      if (totalCount < 1) {
        throw new Error('이항 검정은 최소 1개 이상의 관측값이 필요합니다.')
      }

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        pValue: number
        successCount: number
        totalCount: number
      }>(
        2, // worker2-hypothesis.py
        'binomial_test',
        {
          success_count: successCount,
          total_count: totalCount,
          probability: analysisOptions.probability,
          alternative: analysisOptions.alternative
        }
      )

      // 3️⃣ 결과 매핑
      const observedProportion = successCount / totalCount
      const significant = pythonResult.pValue < 0.05

      // Wilson Score Confidence Interval (정규근사 신뢰구간)
      const alpha = 0.05
      const z = 1.96 // 95% 신뢰구간 (z-score)
      const n = totalCount
      const p = observedProportion

      const denominator = 1 + (z * z) / n
      const center = (p + (z * z) / (2 * n)) / denominator
      const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))

      const lower = Math.max(0, center - margin)
      const upper = Math.min(1, center + margin)

      const result: BinomialTestResult = {
        pValue: pythonResult.pValue,
        successCount,
        totalCount,
        observedProportion,
        expectedProbability: analysisOptions.probability,
        alternative: analysisOptions.alternative,
        significant,
        interpretation: generateInterpretation(
          significant,
          observedProportion,
          analysisOptions.probability,
          analysisOptions.alternative
        ),
        confidenceInterval: {
          lower,
          upper
        }
      }

      if (!actions.completeAnalysis) {
        console.error('[binomial-test] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('이항 검정 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[binomial-test] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : '이항 검정 분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, analysisOptions, actions])

  const handleAnalyze = useCallback(() => {
    // VariableSelector에서 전달된 variables 처리
    if (!uploadedData) return

    // 현재 선택된 변수 확인 (uniqueValues가 설정되었다면 변수가 선택된 상태)
    if (uniqueValues.length === 0) {
      actions.setError('변수를 선택해주세요.')
      return
    }

    // uniqueValues의 첫 번째 변수명 추출 (VariableSelector에서 설정됨)
    const selectedVariable = uploadedData.columns.find((col: string) => {
      const values = new Set()
      for (const row of uploadedData.data) {
        const value = (row as Record<string, unknown>)[col]
        if (value !== null && value !== undefined) {
          values.add(value)
        }
      }
      return values.size === uniqueValues.length
    })

    if (!selectedVariable) {
      actions.setError('선택된 변수를 찾을 수 없습니다.')
      return
    }

    const variables: BinomialTestVariables = {
      dependent: selectedVariable
    }

    void runAnalysis(variables)
  }, [uploadedData, uniqueValues, runAnalysis, actions])

  // ============================================================================
  // Steps 정의
  // ============================================================================

  const steps: StatisticsStep[] = [
    {
      id: 'intro',
      number: 1,
      title: '이항 검정 소개',
      description: 'Binomial Test 개요',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '이진 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과',
      description: '검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  // ============================================================================
  // JSX 렌더링
  // ============================================================================

  return (
    <StatisticsPageLayout
      title="이항 검정"
      subtitle="Binomial Test - 이진 결과 확률 검정"
      icon={<Calculator className="w-6 h-6" />}
      methodInfo={{
        formula: 'P(X = k) = C(n,k) × p^k × (1-p)^(n-k)',
        assumptions: ['독립 시행', '이진 결과 (성공/실패)', '일정한 성공 확률'],
        sampleSize: '관측값 1개 이상 (권장: 30개 이상)',
        usage: '품질 관리, 의학 연구, 설문조사 비율 검정'
      }}
      steps={steps}
      currentStep={currentStep}
    >
      {/* Step 0: 소개 */}
      {currentStep === 0 && (
        <StepCard
          icon={<Info className="w-6 h-6" />}
          title="이항 검정이란?"
          description="이진 결과의 성공 확률 검정"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              이항 검정(Binomial Test)은 이진 결과(성공/실패)의 성공 확률이
              특정 값과 다른지 검정하는 방법입니다.
            </p>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">주요 특징</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>이진 데이터 (0/1, 성공/실패, 예/아니오)</li>
                <li>귀무가설 확률(p₀) 설정 가능</li>
                <li>양측/단측 검정 지원</li>
                <li>정확한 p-value 계산 (이산분포)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">사용 예시</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>불량률이 5%를 초과하는지 검정</li>
                <li>동전 던지기가 공정한지 검정 (p₀ = 0.5)</li>
                <li>신약 치료 성공률이 기존 약물(60%)보다 높은지 검정</li>
              </ul>
            </div>

            <Button onClick={() => { actions.setCurrentStep(1) }} className="w-full">
              다음 단계로
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <DataUploadStep onUploadComplete={handleDataUpload} />
      )}

      {/* Step 2: 변수 선택 + 분석 옵션 */}
      {currentStep === 2 && uploadedData && (
        <div className="space-y-6">
          <StepCard
            icon={<Settings className="w-6 h-6" />}
            title="변수 선택"
            description="이진 변수를 선택하세요"
          >
            <VariableSelectorModern
              methodId="binomial-test"
              data={uploadedData.data}
              onVariablesSelected={handleVariableChange}
            />
          </StepCard>

          {uniqueValues.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">분석 옵션</h3>

              <div className="space-y-4">
                {/* 성공 기준값 선택 */}
                <div className="space-y-2">
                  <Label htmlFor="success-value">성공 기준값</Label>
                  <Select
                    value={analysisOptions.successValue?.toString() ?? ''}
                    onValueChange={(value) => {
                      const parsedValue = isNaN(Number(value)) ? value : Number(value)
                      setAnalysisOptions(prev => ({
                        ...prev,
                        successValue: parsedValue
                      }))
                    }}
                  >
                    <SelectTrigger id="success-value">
                      <SelectValue placeholder="성공으로 간주할 값 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueValues.map((value, idx) => (
                        <SelectItem key={idx} value={value.toString()}>
                          {value.toString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {uniqueValues.length === 2
                      ? '이진 변수: 자동으로 첫 번째 값이 선택되었습니다.'
                      : '여러 범주 중 성공으로 간주할 값을 선택하세요.'}
                  </p>
                </div>

                {/* 귀무가설 확률 */}
                <div className="space-y-2">
                  <Label htmlFor="probability">귀무가설 확률 (p₀)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={analysisOptions.probability}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setAnalysisOptions(prev => ({
                          ...prev,
                          probability: value
                        }))
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    귀무가설에서 가정하는 성공 확률 (기본값: 0.5)
                  </p>
                </div>

                {/* 대립가설 */}
                <div className="space-y-2">
                  <Label htmlFor="alternative">대립가설</Label>
                  <Select
                    value={analysisOptions.alternative}
                    onValueChange={(value) => {
                      setAnalysisOptions(prev => ({
                        ...prev,
                        alternative: value as 'two-sided' | 'less' | 'greater'
                      }))
                    }}
                  >
                    <SelectTrigger id="alternative">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">양측 검정 (p ≠ p₀)</SelectItem>
                      <SelectItem value="less">단측 검정 (p &lt; p₀)</SelectItem>
                      <SelectItem value="greater">단측 검정 (p &gt; p₀)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {analysisOptions.alternative === 'two-sided'
                      ? '성공 확률이 p₀과 다른지 검정'
                      : analysisOptions.alternative === 'less'
                      ? '성공 확률이 p₀보다 낮은지 검정'
                      : '성공 확률이 p₀보다 높은지 검정'}
                  </p>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || analysisOptions.successValue === null}
                  className="w-full"
                >
                  {isAnalyzing ? '분석 중...' : '분석 실행'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: 결과 */}
      {currentStep === 3 && results && (
        <StepCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="분석 결과"
          description="이항 검정 결과"
        >
          <div className="space-y-6">
            {/* 기본 통계 */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">기본 통계</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">성공 횟수</p>
                  <p className="font-mono">{results.successCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">전체 시행 횟수</p>
                  <p className="font-mono">{results.totalCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">관측 비율</p>
                  <p className="font-mono">{results.observedProportion.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">귀무가설 확률</p>
                  <p className="font-mono">{results.expectedProbability.toFixed(4)}</p>
                </div>
              </div>
            </Card>

            {/* 검정 결과 */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">검정 결과</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">p-value</span>
                  <span className="font-mono">{results.pValue.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">유의수준 (α)</span>
                  <span className="font-mono">0.05</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">결과</span>
                  <span className={results.significant ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    {results.significant ? '유의함' : '유의하지 않음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">대립가설</span>
                  <span className="font-mono">
                    {results.alternative === 'two-sided'
                      ? 'p ≠ p₀'
                      : results.alternative === 'less'
                      ? 'p < p₀'
                      : 'p > p₀'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 신뢰구간 */}
            {results.confidenceInterval && (
              <Card className="p-4">
                <h4 className="font-semibold mb-3">95% 신뢰구간 (Wilson Score)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">하한</span>
                    <span className="font-mono">{results.confidenceInterval.lower.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">상한</span>
                    <span className="font-mono">{results.confidenceInterval.upper.toFixed(4)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    실제 성공 확률이 이 구간에 포함될 확률이 95%입니다.
                  </p>
                </div>
              </Card>
            )}

            {/* 해석 */}
            <Card className="p-4 bg-blue-50 dark:bg-blue-950">
              <h4 className="font-semibold mb-2">결과 해석</h4>
              <p className="text-sm">{results.interpretation}</p>
            </Card>

            <Button onClick={() => { actions.setCurrentStep(2) }} variant="outline" className="w-full">
              다시 분석하기
            </Button>
          </div>
        </StepCard>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}
    </StatisticsPageLayout>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateInterpretation(
  significant: boolean,
  observedProportion: number,
  expectedProbability: number,
  alternative: 'two-sided' | 'less' | 'greater'
): string {
  const diffPercent = ((observedProportion - expectedProbability) * 100).toFixed(1)

  if (!significant) {
    return `관측된 성공 비율(${(observedProportion * 100).toFixed(1)}%)은 귀무가설 확률(${(expectedProbability * 100).toFixed(1)}%)과 통계적으로 유의한 차이가 없습니다. (p ≥ 0.05)`
  }

  if (alternative === 'two-sided') {
    return `관측된 성공 비율(${(observedProportion * 100).toFixed(1)}%)은 귀무가설 확률(${(expectedProbability * 100).toFixed(1)}%)과 통계적으로 유의한 차이가 있습니다. (차이: ${diffPercent}%p, p < 0.05)`
  }

  if (alternative === 'less') {
    return `관측된 성공 비율(${(observedProportion * 100).toFixed(1)}%)은 귀무가설 확률(${(expectedProbability * 100).toFixed(1)}%)보다 통계적으로 유의하게 낮습니다. (차이: ${diffPercent}%p, p < 0.05)`
  }

  // alternative === 'greater'
  return `관측된 성공 비율(${(observedProportion * 100).toFixed(1)}%)은 귀무가설 확률(${(expectedProbability * 100).toFixed(1)}%)보다 통계적으로 유의하게 높습니다. (차이: ${diffPercent}%p, p < 0.05)`
}
