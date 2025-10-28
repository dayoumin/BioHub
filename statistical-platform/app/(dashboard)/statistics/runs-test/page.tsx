'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Shuffle,
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

// 데이터 인터페이스
interface UploadedData {
  data: Record<string, unknown>[]
  fileName: string
  columns: string[]
}

interface VariableSelection {
  variables: string[]
}

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
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<RunsTestResult, string[]>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state

  // 런 검정 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'method',
      number: 1,
      title: '런 검정 소개',
      description: '데이터 무작위성 검정 개념',
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
      description: '무작위성을 검정할 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: '런 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ]

  const handleDataUpload = useCallback((data: UploadedData) => {
    actions.setUploadedData(data)
    actions.setCurrentStep(2)
  }, [])

  // 실제 런 검정 계산 로직 (간단 구현)
  const calculateRunsTest = useCallback((data: unknown[], variable: string): RunsTestResult => {
    const values = data.map(row => (row as Record<string, unknown>)[variable])
      .filter(val => val != null)

    // 중앙값 계산 (이분화를 위해)
    const numericValues = values.filter(val => typeof val === 'number') as number[]
    const median = numericValues.length > 0
      ? [...numericValues].sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]
      : 0

    // 이분화: 중앙값 이상/미만
    const binarySequence = numericValues.map(val => val >= median ? 'A' : 'B')

    // 런 계산
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

    // 통계량 계산
    const n1 = binarySequence.filter(v => v === 'A').length
    const n2 = binarySequence.filter(v => v === 'B').length
    const totalN = n1 + n2
    const totalRuns = runs.length

    // 기댓값과 분산 계산
    const expectedRuns = (2 * n1 * n2) / totalN + 1
    const variance = (2 * n1 * n2 * (2 * n1 * n2 - totalN)) / (totalN * totalN * (totalN - 1))

    // Z-통계량 계산 (연속성 보정 적용)
    const zStatistic = totalRuns > expectedRuns
      ? (totalRuns - 0.5 - expectedRuns) / Math.sqrt(variance)
      : (totalRuns + 0.5 - expectedRuns) / Math.sqrt(variance)

    // p-value 계산 (양측 검정)
    const pValue = 2 * (1 - normalCDF(Math.abs(zStatistic)))

    const significant = pValue < 0.05

    return {
      variable,
      totalRuns,
      expectedRuns,
      variance,
      zStatistic,
      pValue,
      significant,
      interpretation: significant
        ? '데이터가 무작위 패턴을 따르지 않는 것으로 보임'
        : '데이터가 무작위 패턴을 따르는 것으로 보임',
      runSequence: runs,
      statistics: {
        n1,
        n2,
        totalN,
        cutPoint: median
      }
    }
  }, [])

  // 표준정규분포 CDF 근사 (Abramowitz and Stegun approximation)
  const normalCDF = useCallback((z: number): number => {
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z))
    const d = 0.3989423 * Math.exp(-z * z / 2)
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    if (z > 0) prob = 1 - prob
    return prob
  }, [])

  const runAnalysis = useCallback(async (variables: VariableSelection) => {
    if (!uploadedData) return

    actions.startAnalysis()
    actions.setCurrentStep(3)

    try {
      // 실제 계산 사용 (시뮬레이션 지연 포함)
      setTimeout(() => {
        const result = calculateRunsTest(uploadedData.data, variables.variables[0])
        setresults(result)
        setIsAnalyzing(false)
      }, 1500)
    } catch (error) {
      console.error('런 검정 분석 중 오류:', error)
      setIsAnalyzing(false)
      // TODO: 에러 상태 UI 표시
    }
  }, [uploadedData, calculateRunsTest])

  const handleVariableSelection = useCallback((variables: VariableSelection) => {
    actions.setSelectedVariables(variables)
    // 자동으로 분석 실행
    runAnalysis(variables)
  }, [runAnalysis])

  const renderMethodIntroduction = () => (
    <StepCard
      title="런 검정 (Runs Test)"
      description="데이터 시퀀스의 무작위성을 검정하는 비모수 통계 테스트"
      icon={<Info className="w-5 h-5 text-blue-500" />}
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="w-5 h-5" />
                런 검정이란?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                연속된 데이터에서 <strong>런(run)</strong>의 개수를 이용하여
                데이터가 무작위로 배열되었는지를 검정합니다.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-medium mb-1">런(Run)이란?</p>
                <p className="text-xs text-blue-700">
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
      description="런 검정을 수행할 데이터를 업로드하세요"
      icon={<Upload className="w-5 h-5 text-primary" />}
    >
      <DataUploadStep onNext={handleDataUpload} />
    </StepCard>
  )

  const renderVariableSelection = () => {
    if (!uploadedData) return null

    const requirements = getVariableRequirements('runsTest')

    // 변수 타입 자동 감지
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
        description="무작위성을 검정할 변수를 선택하세요"
        icon={<Users className="w-5 h-5 text-primary" />}
      >
        <VariableSelector
          variables={variables}
          requirements={requirements}
          onSelectionChange={handleVariableSelection}
          methodName="런 검정"
        />
      </StepCard>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const { totalRuns, expectedRuns, zStatistic, pValue, significant, statistics, runSequence, interpretation } = results

    return (
      <StepCard
        title="런 검정 결과"
        description="데이터 무작위성 검정 결과"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
      >
        <div className="space-y-6">
          {/* 주요 결과 요약 */}
          <Alert className={significant ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}>
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
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium">관측된 런</p>
                    <p className="text-xl font-bold text-blue-600">{totalRuns}</p>
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
                      item.run % 2 === 1 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
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

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">주의사항</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 런 검정은 데이터의 순서가 중요합니다</li>
                  <li>• 중앙값을 기준으로 이분화할 때 동점 처리 방법을 고려하세요</li>
                  <li>• 작은 표본에서는 정확한 확률을 계산해야 할 수 있습니다</li>
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
      title="런 검정"
      subtitle="Runs Test - 데이터 시퀀스의 무작위성 검정"
      icon={<Shuffle className="w-6 h-6" />}
      methodInfo={{
        formula: 'E(R) = (2n₁n₂/N) + 1, Var(R) = 2n₁n₂(2n₁n₂-N)/[N²(N-1)]',
        assumptions: ['순차적 데이터', '독립성', '이분법적 분류'],
        sampleSize: '최소 20개 이상 권장 (정규근사)',
        usage: '시계열 무작위성, 품질관리, 패턴 검정'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => selectedVariables && runAnalysis(selectedVariables)}
      onReset={() => {
        actions.setCurrentStep(0)
        actions.setUploadedData(null)
        actions.setSelectedVariables(null)
        setresults(null)
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