'use client'

import React, { useState, useCallback, useMemo } from 'react'
import type { SignTestVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { getVariableRequirements } from '@/lib/statistics/variable-requirements'
import { detectVariableType } from '@/lib/services/variable-type-detector'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Calculator,
  CheckCircle2,
  Info,
  FileText,
  Download,
  Plus,
  Scale
} from 'lucide-react'

interface DataRow {
  [key: string]: string | number
}

interface SignTestResult {
  beforeVariable: string
  afterVariable: string
  nPositive: number
  nNegative: number
  nTies: number
  nTotal: number
  pValue: number
  significant: boolean
  interpretation: string
  testType: 'two-tailed' | 'greater' | 'less'
}

export default function SignTestPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<SignTestResult>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [selectedBefore, setSelectedBefore] = useState<string>('')
  const [selectedAfter, setSelectedAfter] = useState<string>('')
  const [testType, setTestType] = useState<'two-tailed' | 'greater' | 'less'>('two-tailed')

  const availableVariables = useMemo(() => {
    if (!uploadedData || uploadedData.data.length === 0) return []

    const firstRow = uploadedData.data[0]
    if (!firstRow || typeof firstRow !== 'object') return []

    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof (firstRow as Record<string, unknown>)[key] === 'number' ? 'numeric' : 'categorical'
    }))
  }, [uploadedData])

  const numericVariables = useMemo(() =>
    availableVariables.filter(v => v.type === 'numeric').map(v => v.name),
    [availableVariables]
  )

  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    const uploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }

    if (!actions.setUploadedData) {
      console.error('[sign-test] setUploadedData not available')
      return
    }

    actions.setUploadedData(uploadedData)

    if (!actions.setCurrentStep) {
      console.error('[sign-test] setCurrentStep not available')
      return
    }

    actions.setCurrentStep(1)
  }, [actions])

  const canProceedToAnalysis = useMemo(() => {
    return selectedBefore && selectedAfter && selectedBefore !== selectedAfter
  }, [selectedBefore, selectedAfter])

  const runSignTest = useCallback(async () => {
    if (!canProceedToAnalysis || !uploadedData) return

    actions.startAnalysis()

    try {
      // 1️⃣ before/after 데이터 추출
      const beforeData: number[] = []
      const afterData: number[] = []

      for (const row of uploadedData.data) {
        const beforeValue = (row as Record<string, unknown>)[selectedBefore]
        const afterValue = (row as Record<string, unknown>)[selectedAfter]

        if (
          beforeValue !== null &&
          beforeValue !== undefined &&
          typeof beforeValue === 'number' &&
          !isNaN(beforeValue) &&
          afterValue !== null &&
          afterValue !== undefined &&
          typeof afterValue === 'number' &&
          !isNaN(afterValue)
        ) {
          beforeData.push(beforeValue)
          afterData.push(afterValue)
        }
      }

      if (beforeData.length < 5) {
        throw new Error('부호 검정은 최소 5개 이상의 쌍이 필요합니다.')
      }

      // 2️⃣ PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const pythonResult = await pyodideCore.callWorkerMethod<{
        nPositive: number
        nNegative: number
        nTies: number
        pValue: number
      }>(
        3, // worker3-nonparametric-anova.py
        'sign_test',
        {
          before: beforeData,
          after: afterData
        }
      )

      // 3️⃣ 결과 매핑 (Python → TypeScript)
      const nTotal = pythonResult.nPositive + pythonResult.nNegative
      const significant = pythonResult.pValue < 0.05

      let interpretation: string
      if (nTotal === 0) {
        interpretation = '모든 쌍이 동점이어서 검정을 수행할 수 없습니다.'
      } else if (significant) {
        if (pythonResult.nPositive > pythonResult.nNegative) {
          interpretation = `사후 측정값이 사전 측정값보다 유의하게 높습니다 (p = ${pythonResult.pValue.toFixed(3)})`
        } else {
          interpretation = `사후 측정값이 사전 측정값보다 유의하게 낮습니다 (p = ${pythonResult.pValue.toFixed(3)})`
        }
      } else {
        interpretation = `사전-사후 측정값 간 유의한 차이가 없습니다 (p = ${pythonResult.pValue.toFixed(3)})`
      }

      const result: SignTestResult = {
        beforeVariable: selectedBefore,
        afterVariable: selectedAfter,
        nPositive: pythonResult.nPositive,
        nNegative: pythonResult.nNegative,
        nTies: pythonResult.nTies,
        nTotal,
        pValue: pythonResult.pValue,
        significant,
        interpretation,
        testType
      }

      if (!actions.completeAnalysis) {
        console.error('[sign-test] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('부호 검정 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[sign-test] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : '부호 검정 분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [canProceedToAnalysis, uploadedData, selectedBefore, selectedAfter, testType, actions])

  const handleVariableSelection = useCallback(() => {
    if (canProceedToAnalysis) {
      if (!actions.setCurrentStep) {
        console.error('[sign-test] setCurrentStep not available')
        return
      }

      actions.setCurrentStep(2)
    }
  }, [canProceedToAnalysis, actions])

  const renderIntroductionStep = useCallback(() => (
    <StepCard title="부호 검정 소개">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-3">부호 검정(Sign Test)이란?</h3>
          <p className="text-gray-600 mb-4">
            대응 표본에서 중앙값의 차이를 검정하는 비모수 방법입니다.
            차이값의 부호(+, -)만을 사용하여 분석하므로 분포의 가정이 필요하지 않습니다.
            데이터의 정규성이나 대칭성에 대한 가정 없이 사용할 수 있는 강건한 검정법입니다.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                주요 장점
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 분포 가정 불필요</li>
                <li>• 이상치에 강건함</li>
                <li>• 계산이 간단함</li>
                <li>• 소표본에도 적용 가능</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Scale className="w-4 h-4 mr-2" />
                적용 상황
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 사전-사후 비교</li>
                <li>• 치료 전후 효과</li>
                <li>• 교육 프로그램 효과</li>
                <li>• 제품 개선 효과</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Wilcoxon 부호순위 검정과의 비교</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">부호 검정</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 차이의 부호만 사용</li>
                  <li>• 크기 정보 무시</li>
                  <li>• 검정력 낮음</li>
                  <li>• 가정 최소</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">부호순위 검정</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 차이의 크기와 부호 사용</li>
                  <li>• 크기 정보 활용</li>
                  <li>• 검정력 높음</li>
                  <li>• 대칭 분포 가정</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">부호 검정의 원리</h3>
          <div className="space-y-3">
            {[
              '각 대응 쌍의 차이값(After - Before) 계산',
              '차이값이 0인 경우는 분석에서 제외',
              '양수(+)와 음수(-) 차이의 개수 계산',
              '이항분포를 이용하여 확률 계산',
              '귀무가설 하에서 양수와 음수의 비율이 같음을 검정'
            ].map((principle, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm">{principle}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">적용 예시</h3>
          <div className="bg-white p-4 rounded-lg border">
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <Plus className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <h4 className="font-medium">의학</h4>
                <p className="text-xs text-gray-600">치료 전후 증상 점수, 혈압 변화, 체중 감소</p>
              </div>
              <div>
                <Scale className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <h4 className="font-medium">교육</h4>
                <p className="text-xs text-gray-600">교육 전후 성적, 만족도, 이해도 변화</p>
              </div>
              <div>
                <Calculator className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <h4 className="font-medium">마케팅</h4>
                <p className="text-xs text-gray-600">캠페인 전후 판매량, 인지도, 선호도</p>
              </div>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            부호 검정은 <strong>중앙값</strong>의 차이를 검정합니다.
            평균의 차이를 검정하려면 t-검정이나 Wilcoxon 부호순위 검정을 고려하세요.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={() => {
            if (!actions.setCurrentStep) {
              console.error('[sign-test] setCurrentStep not available')
              return
            }
            actions.setCurrentStep(1)
          }} className="flex items-center space-x-2">
            <span>다음: 데이터 업로드</span>
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </StepCard>
  ), [])

  const renderDataUploadStep = useCallback(() => (
    <StepCard title="데이터 업로드">
      <DataUploadStep
        onUploadComplete={handleDataUpload}
        onPrevious={() => {
          if (!actions.setCurrentStep) {
            console.error('[sign-test] setCurrentStep not available')
            return
          }
          actions.setCurrentStep(0)
        }}
      />

      <div className="mt-6">
        <h4 className="font-medium mb-3">부호 검정 데이터 요구사항</h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">대응 표본 구조 (필수)</h5>
              <div className="bg-white p-3 rounded border text-xs font-mono">
                <div>ID | Before_Score | After_Score | Gender | Age</div>
                <div>1  | 75          | 82         | M      | 25</div>
                <div>2  | 68          | 71         | F      | 30</div>
                <div>3  | 80          | 85         | M      | 28</div>
                <div>4  | 72          | 69         | F      | 35</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                각 행은 동일한 개체의 사전-사후 측정값을 포함해야 함
              </p>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">측정값 특성</h5>
              <div className="bg-white p-3 rounded border text-xs">
                <ul className="space-y-1">
                  <li>• <strong>순서형</strong>: 순서가 있는 척도 (예: 만족도 1-5점)</li>
                  <li>• <strong>구간형</strong>: 등간격 척도 (예: 점수, 온도)</li>
                  <li>• <strong>비율형</strong>: 절대영점이 있는 척도 (예: 체중, 시간)</li>
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">데이터 품질 요구사항</h5>
              <div className="bg-white p-3 rounded border text-xs">
                <ul className="space-y-1">
                  <li>• <strong>대응성</strong>: 동일 개체의 사전-사후 측정</li>
                  <li>• <strong>독립성</strong>: 각 개체는 서로 독립적</li>
                  <li>• <strong>표본크기</strong>: 최소 10개 이상의 대응 쌍</li>
                  <li>• <strong>결측값</strong>: 한 쪽만 결측인 경우 해당 쌍 제외</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  ), [handleDataUpload])

  const handleVariablesSelected = useCallback((mapping: unknown) => {
    // 1. Type guard
    if (!mapping || typeof mapping !== 'object') {
      console.error('[sign-test] Invalid mapping')
      return
    }

    // 2. Extract variables array
    let variables: string[] = []

    if ('variables' in mapping) {
      const vars = (mapping as { variables: unknown }).variables
      if (Array.isArray(vars)) {
        variables = vars.filter((v): v is string => typeof v === 'string')
      }
    }

    // 3. Expect 2 variables: before and after
    if (variables.length < 2) {
      console.error('[sign-test] Need 2 variables (before, after)')
      return
    }

    // 4. Update state
    setSelectedBefore(variables[0])
    setSelectedAfter(variables[1])

    // 5. Move to next step
    if (!actions.setCurrentStep) {
      console.error('[sign-test] setCurrentStep not available')
      return
    }
    actions.setCurrentStep(2)
  }, [actions])

  const renderVariableSelectionStep = useCallback(() => (
    <StepCard title="변수 선택">
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3">변수 선택 (2개 필요: Before, After)</h4>
          {uploadedData && (
            <VariableSelector
              methodId="sign-test"
              data={uploadedData.data}
              onVariablesSelected={handleVariablesSelected}
            />
          )}
          <p className="text-xs text-gray-500 mt-2">
            첫 번째: 사전 측정값 (개입 이전), 두 번째: 사후 측정값 (개입 이후)
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">분석 가이드</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>대응 표본</strong>: 동일한 개체에서 두 번 측정된 데이터</li>
            <li>• <strong>차이값 계산</strong>: 사후값 - 사전값으로 계산됨</li>
            <li>• <strong>가정</strong>: 독립성만 만족하면 됨 (정규성 불필요)</li>
            <li>• <strong>검정력</strong>: Wilcoxon 부호순위 검정보다 낮음</li>
          </ul>
        </div>

        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={() => {
              if (!actions.setCurrentStep) {
                console.error('[sign-test] setCurrentStep not available')
                return
              }
              actions.setCurrentStep(0)
            }}
          >
            이전: 소개
          </Button>
        </div>
      </div>
    </StepCard>
  ), [uploadedData, handleVariablesSelected, actions])

  const renderresults = useCallback(() => {
    if (!results) {
      return (
        <StepCard title="분석 실행">
          <div className="text-center py-8">
            <Button
              onClick={runSignTest}
              disabled={isAnalyzing}
              size="lg"
              className="flex items-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>분석 중...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>부호 검정 실행</span>
                </>
              )}
            </Button>
          </div>
        </StepCard>
      )
    }

    const pieData = [
      { name: '양의 차이', value: results.nPositive, color: '#10b981' },
      { name: '음의 차이', value: results.nNegative, color: '#ef4444' },
      { name: '차이 없음', value: results.nTies, color: '#6b7280' }
    ]

    return (
      <div className="space-y-6">
        <StepCard title="부호 검정 결과">
          <div className="space-y-6">
            {/* 주요 결과 요약 */}
            <Alert className={results.significant ? "border-red-500 bg-muted" : "border-green-500 bg-muted"}>
              {results.significant ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertTitle>검정 결과</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p className="font-medium">
                    p = {results.pValue.toFixed(3)}
                  </p>
                  <p>
                    {results.significant
                      ? "✅ 사전-사후 측정값 간 유의한 차이가 있습니다 (p < 0.05)"
                      : "❌ 사전-사후 측정값 간 유의한 차이가 없습니다 (p ≥ 0.05)"}
                  </p>
                  <p className="text-sm text-muted-foreground">{results.interpretation}</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* 통계량 */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">부호별 빈도</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          label={({name, value}) => `${name}: ${value}`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">기술통계량</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>양의 차이 (사후 &gt; 사전)</span>
                      <Badge variant="default">{results.nPositive}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>음의 차이 (사후 &lt; 사전)</span>
                      <Badge variant="default">{results.nNegative}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>동점 (차이 없음)</span>
                      <Badge variant="secondary">{results.nTies}</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>유효 쌍 수</span>
                      <Badge>{results.nTotal}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>p-value</span>
                      <Badge variant={results.significant ? "destructive" : "secondary"}>
                        {results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}
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
                  <AlertTitle>부호 검정이란?</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2 text-sm">
                      <p>대응 표본 간 차이의 부호(+/-)만을 사용하여 중앙값 차이를 검정하는 비모수 방법입니다.</p>
                      <p><strong>귀무가설:</strong> 양의 차이와 음의 차이의 비율이 같다 (중앙값 차이 = 0)</p>
                      <p><strong>대립가설:</strong> 양의 차이와 음의 차이의 비율이 다르다 (중앙값 차이 ≠ 0)</p>
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">주의사항</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 차이가 0인 쌍(동점)은 분석에서 제외됩니다</li>
                    <li>• 최소 5개 이상의 유효 쌍이 필요합니다</li>
                    <li>• Wilcoxon 부호순위 검정이 더 높은 검정력을 제공할 수 있습니다</li>
                    <li>• 비모수 검정으로 정규성 가정이 필요하지 않습니다</li>
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
      </div>
    )
  }, [results, isAnalyzing, runSignTest])

  const stepComponents = [
    { id: 'upload', title: '소개', component: renderIntroductionStep },
    { id: 'variables', title: '데이터 업로드', component: renderDataUploadStep },
    { id: 'analysis', title: '변수 선택', component: renderVariableSelectionStep },
    { id: 'results', title: '분석 결과', component: renderresults }
  ]

  // StatisticsPageLayout용 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'introduction',
      number: 1,
      title: '소개',
      description: '부호 검정 소개',
      status: currentStep >= 1 ? 'completed' : 'current'
    },
    {
      id: 'upload-data',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 또는 Excel 파일 업로드',
      status: uploadedData ? 'completed' : currentStep >= 1 ? 'current' : 'pending'
    },
    {
      id: 'select-variables',
      number: 3,
      title: '변수 선택',
      description: '대응 표본 변수 선택',
      status: selectedVariables && Object.keys(selectedVariables).length > 0 ? 'completed'
              : currentStep >= 2 ? 'current' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 확인',
      description: '부호 검정 결과',
      status: results ? 'completed' : currentStep >= 3 ? 'current' : 'pending'
    }
  ]

  return (
    <StatisticsPageLayout
      title="부호 검정"
      subtitle="Sign Test"
      steps={steps}
      currentStep={currentStep + 1}
    >
      {stepComponents[currentStep].component()}
    </StatisticsPageLayout>
  )
}