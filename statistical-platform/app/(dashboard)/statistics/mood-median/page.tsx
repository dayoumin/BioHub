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
  Target
} from 'lucide-react'

import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * Mood Median Test 변수 선택
 * - grouping: 그룹 변수 (범주형)
 * - test: 검정 변수 (연속형)
 */
interface MoodMedianVariables {
  grouping: string
  test: string
}

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

  // useStatisticsPage hook
  const { state, actions } = useStatisticsPage<MoodMedianTestResult, MoodMedianVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'intro',
      number: 1,
      title: 'Mood Median Test 소개',
      description: '중앙값 기반 비모수 검정 개념',
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
      description: '그룹 변수와 검정 변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Mood Median Test 결과 확인',
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
    'mood-median'
  )

  /**
   * 변수 선택 핸들러
   */
  const handleVariableSelection = useCallback((variables: unknown) => {
    if (!variables || typeof variables !== 'object') return

    const vars = variables as { grouping?: string; test?: string }

    if (vars.grouping && vars.test) {
      const moodVars: MoodMedianVariables = {
        grouping: vars.grouping,
        test: vars.test
      }

      actions.setSelectedVariables?.(moodVars)
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
      const { grouping: groupVar, test: testVar } = selectedVariables

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
        3, // worker3-nonparametric-anova.py
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

      if (!actions.completeAnalysis) {
        console.error('[mood-median] completeAnalysis not available')
        return
      }

      actions.completeAnalysis(result, 3)
    } catch (error) {
      console.error('Mood Median Test 분석 중 오류:', error)

      if (!actions.setError) {
        console.error('[mood-median] setError not available')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Mood Median Test 분석 중 오류가 발생했습니다.'
      actions.setError(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])

  // ============================================================================
  // JSX 렌더링
  // ============================================================================

  return (
    <StatisticsPageLayout
      title="Mood Median Test"
      subtitle="Mood's Median Test - 중앙값 기반 비모수 검정"
      icon={<Target className="w-6 h-6" />}
      methodInfo={{
        formula: 'χ² = ∑∑(Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ, df = k - 1',
        assumptions: ['독립 표본', '순서형 이상 데이터', '정규성 가정 불필요'],
        sampleSize: '각 그룹 최소 1개 이상',
        usage: '이상치에 강건한 그룹 비교, Kruskal-Wallis 대안'
      }}
      steps={steps}
      currentStep={currentStep}
    >
      {/* Step 0: 소개 */}
      {currentStep === 0 && (
        <StepCard
          icon={<Info className="w-6 h-6" />}
          title="Mood Median Test란?"
          description="중앙값 기반 비모수 검정 방법"
        >
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
          description="그룹 변수와 검정 변수를 선택하세요"
        >
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 안내</AlertTitle>
            <AlertDescription>
              <strong>Grouping Variable:</strong> 그룹을 구분하는 범주형 변수 (예: 치료법, 지역)<br />
              <strong>Test Variable:</strong> 비교할 연속형 변수 (예: 회복 시간, 오염도)
            </AlertDescription>
          </Alert>

          <VariableSelector
            methodId="mood-median"
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
          description="Mood Median Test를 실행하고 결과를 확인하세요"
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
                    Mood Median Test 실행
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
                    <Users className="w-5 h-5" />
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
              </Card>

              {/* 분할표 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">분할표 (2 × k)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left">Position</th>
                          {results.groupStats.map((item, idx) => (
                            <th key={idx} className="p-2 text-center">{item.group}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 font-medium">Above Grand Median</td>
                          {results.contingencyTable[0]?.map((count, idx) => (
                            <td key={idx} className="p-2 text-center">{count}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Below/Equal Grand Median</td>
                          {results.contingencyTable[1]?.map((count, idx) => (
                            <td key={idx} className="p-2 text-center">{count}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
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
                    <strong>그룹 수:</strong> {results.nGroups}개
                  </p>
                  <p className="text-sm">
                    <strong>총 관측값 수:</strong> {results.nTotal}개
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
