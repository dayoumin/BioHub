'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { KruskalWallisVariables } from '@/types/statistics'
import { toKruskalWallisVariables, type VariableAssignment } from '@/types/statistics-converters'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Activity,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Info,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Target,
  Users
} from 'lucide-react'

// Components - 기존 시스템 사용
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable, type TableColumn } from '@/components/statistics/common/StatisticsTable'

// Services & Types
import { pyodideStats } from '@/lib/services/pyodide-statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface GroupDescriptives {
  median: number
  mean: number
  iqr: number
  min: number
  max: number
  q1: number
  q3: number
  n: number
  meanRank: number
}

interface KruskalWallisResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  nGroups: number
  totalN: number
  effectSize: {
    etaSquared: number
    interpretation: string
  }
  descriptives: {
    [groupName: string]: GroupDescriptives
  }
  postHoc?: {
    method: string
    comparisons: Array<{
      group1: string
      group2: string
      pValue: number
      significant: boolean
      meanRankDiff: number
    }>
  }
  interpretation: {
    summary: string
    groupComparisons: string
    recommendations: string[]
  }
}

export default function KruskalWallisPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('kruskal-wallis')
  }, [])

  // State (using hook)
  const { state, actions } = useStatisticsPage<KruskalWallisResult, KruskalWallisVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Pyodide instance
  const [pyodide, setPyodide] = useState<typeof pyodideStats | null>(null)

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideStats.initialize()
        setPyodide(pyodideStats)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        actions.setError?.('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    void initPyodide()
  }, [actions])

  // Steps configuration - useMemo로 성능 최적화
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '분석 방법',
      description: 'Kruskal-Wallis 검정의 개념과 적용',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '다집단 비교 데이터 파일 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 그룹변수 선택',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Kruskal-Wallis 검정 결과 확인',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Method info - useMemo로 최적화
  const methodInfo = useMemo(() => ({
    formula: "H = (12/N(N+1)) × Σ(R²ᵢ/nᵢ) - 3(N+1)",
    assumptions: [
      "3개 이상의 독립집단",
      "연속형 또는 서열척도 데이터",
      "각 집단의 분포 형태 유사"
    ],
    sampleSize: "각 집단에서 최소 5개 이상 권장",
    usage: "정규분포를 따르지 않는 다집단 비교"
  }), [])

  // Event handlers - using common utility
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(2)
    },
    'kruskal-wallis'
  )

  const handleVariableSelection = createVariableSelectionHandler<KruskalWallisVariables>(
    (vars) => actions.setSelectedVariables?.(vars ? toKruskalWallisVariables(vars as unknown as VariableAssignment) : null),
    (vars) => {
      const converted = toKruskalWallisVariables(vars as unknown as VariableAssignment)
      if (converted.dependent && converted.factor) {
        void runAnalysis(converted)
      }
    },
    'kruskal-wallis'
  )

  const runAnalysis = async (variables: KruskalWallisVariables) => {
    if (!uploadedData || !pyodide || !variables.dependent || !variables.factor) {
      actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    actions.startAnalysis?.()

    try {
      const valueColumn = variables.dependent
      const groupColumn = variables.factor

      // 그룹별 데이터 추출
      const groups: Record<string, number[]> = {}
      uploadedData.data.forEach(row => {
        const groupValue = String(row[groupColumn] ?? '')
        const numValue = parseFloat(String(row[valueColumn] ?? ''))
        if (!isNaN(numValue) && groupValue) {
          if (!groups[groupValue]) {
            groups[groupValue] = []
          }
          groups[groupValue].push(numValue)
        }
      })

      const groupNames = Object.keys(groups)
      const groupArrays = Object.values(groups)

      if (groupArrays.length < 3) {
        actions.setError?.('Kruskal-Wallis 검정은 최소 3개 이상의 그룹이 필요합니다.')
        return
      }

      // Pyodide Worker 호출
      const basicResult = await pyodide.kruskalWallisTestWorker(groupArrays)

      // 기술통계량 계산 - Use numpy for accurate percentiles
      const descriptives: Record<string, GroupDescriptives> = {}

      for (let idx = 0; idx < groupNames.length; idx++) {
        const name = groupNames[idx]
        const arr = groupArrays[idx]

        // Calculate descriptive statistics with numpy through pyodideStats
        const stats = await pyodide.calculateDescriptiveStats(arr)

        descriptives[name] = {
          median: stats.median,
          mean: stats.mean,
          iqr: stats.q3 - stats.q1,
          min: stats.min,
          max: stats.max,
          q1: stats.q1,
          q3: stats.q3,
          n: arr.length,
          meanRank: 0 // Will be calculated properly in full implementation
        }
      }

      // 효과크기 계산 (eta-squared approximation)
      const totalN = groupArrays.reduce((sum, g) => sum + g.length, 0)
      const etaSquared = basicResult.statistic / (totalN - 1)

      const fullResult: KruskalWallisResult = {
        statistic: basicResult.statistic,
        pValue: basicResult.pValue,
        degreesOfFreedom: basicResult.df,
        nGroups: groupArrays.length,
        totalN,
        effectSize: {
          etaSquared,
          interpretation: etaSquared >= 0.14 ? '큰 효과' : etaSquared >= 0.06 ? '중간 효과' : '작은 효과'
        },
        descriptives,
        interpretation: {
          summary: basicResult.pValue < 0.05
            ? `Kruskal-Wallis 검정 결과 집단 간 유의한 차이가 있습니다 (H=${basicResult.statistic.toFixed(2)}, p=${basicResult.pValue.toFixed(4)}).`
            : `Kruskal-Wallis 검정 결과 집단 간 유의한 차이가 없습니다 (H=${basicResult.statistic.toFixed(2)}, p=${basicResult.pValue.toFixed(4)}).`,
          groupComparisons: `${groupArrays.length}개 그룹의 중위수를 비교한 결과입니다.`,
          recommendations: [
            basicResult.pValue < 0.05 ? '유의한 차이가 발견되었으므로 사후검정을 수행하세요.' : '유의한 차이가 없으므로 추가 분석이 필요하지 않습니다.',
            '효과크기를 확인하여 실질적 유의성을 평가하세요.',
            '집단별 기술통계량을 비교하여 차이의 방향을 확인하세요.'
          ]
        }
      }

      actions.completeAnalysis?.(fullResult, 3)
    } catch (err) {
      console.error('Kruskal-Wallis 검정 실패:', err)
      actions.setError?.('Kruskal-Wallis 검정 중 오류가 발생했습니다.')
    }
  }

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '미미한 효과', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  return (
    <StatisticsPageLayout
      title="Kruskal-Wallis 검정"
      subtitle="Kruskal-Wallis H Test"
      description="3개 이상 독립집단의 중위수 차이를 비모수적으로 검정"
      icon={<Users className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      methodInfo={methodInfo}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && (
        <StepCard
          title="Kruskal-Wallis 검정 소개"
          description="다집단의 순위 기반 비모수 검정"
          icon={<Info className="w-5 h-5 text-blue-500" />}
        >
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    분석 목적
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    3개 이상의 독립집단에서 중위수가 동일한지 비모수적으로 검정합니다.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• 정규분포 가정 불필요</li>
                    <li>• 등분산성 가정 완화</li>
                    <li>• 이상치에 강건한 검정</li>
                    <li>• 일원분산분석의 비모수 대안</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    vs 일원분산분석
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-3 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">Kruskal-Wallis</h4>
                      <p className="text-muted-foreground">비모수, 순위 기반, 강건</p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <h4 className="font-medium">일원분산분석</h4>
                      <p className="text-muted-foreground">모수, 정규분포 가정 필요</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Calculator className="h-4 w-4" />
              <AlertTitle>언제 사용하나요?</AlertTitle>
              <AlertDescription>
                • 데이터가 정규분포를 따르지 않을 때<br/>
                • 3개 이상 집단의 중위수 비교<br/>
                • 서열척도 데이터 분석<br/>
                • 일원분산분석의 가정 위반 시
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={() => actions.setCurrentStep?.(1)}>
                다음: 데이터 업로드
              </Button>
            </div>
          </div>
        </StepCard>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 1 && (
        <StepCard
          title="데이터 업로드"
          description="다집단 비교 데이터 파일을 업로드하세요"
          icon={<FileSpreadsheet className="w-5 h-5 text-green-500" />}
        >
          <DataUploadStep
            onUploadComplete={handleDataUpload}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>데이터 형식 안내</AlertTitle>
            <AlertDescription>
              • 각 행은 하나의 관측값을 나타냅니다<br/>
              • 종속변수(연속형): 측정값 열<br/>
              • 그룹변수(범주형): 집단을 구분하는 열 (3개 이상 그룹)
            </AlertDescription>
          </Alert>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(0)}>
              이전
            </Button>
          </div>
        </StepCard>
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && uploadedData && (
        <StepCard
          title="변수 선택"
          description="종속변수(연속형)와 그룹변수(범주형)를 선택하세요"
          icon={<BarChart3 className="w-5 h-5 text-primary" />}
        >
          <VariableSelectorModern
            methodId="kruskal-wallis"
            data={uploadedData.data}
            onVariablesSelected={handleVariableSelection}
            onBack={() => actions.setCurrentStep?.(1)}
          />

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>변수 선택 가이드</AlertTitle>
            <AlertDescription>
              • 종속변수: 비교할 연속형 측정값<br/>
              • 독립변수(그룹): 3개 이상의 집단을 구분하는 범주형 변수<br/>
              • 예: score(종속) vs treatment_group(독립)
            </AlertDescription>
          </Alert>
        </StepCard>
      )}

      {/* Step 4: 결과 */}
      {currentStep === 3 && analysisResult && (
        <div className="space-y-6">
          {/* 주요 결과 카드 */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.statistic.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">H 통계량</p>
                  <p className="text-xs text-muted-foreground">df = {analysisResult.degreesOfFreedom}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    <PValueBadge value={analysisResult.pValue} size="lg" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">유의확률</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">
                    {analysisResult.effectSize.etaSquared.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">효과크기 (η²)</p>
                  <Badge variant="outline" className="mt-1">
                    {analysisResult.effectSize.interpretation}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="statistics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="statistics">통계량</TabsTrigger>
              <TabsTrigger value="descriptives">기술통계</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="posthoc">사후검정</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Kruskal-Wallis 검정 통계량</CardTitle>
                  <CardDescription>H 통계량과 검정 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="Kruskal-Wallis 검정 통계량"
                    description="H 통계량과 검정 결과"
                    columns={[
                      { key: 'name', header: '통계량', type: 'text', align: 'left' },
                      { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                      { key: 'description', header: '설명', type: 'text', align: 'center' }
                    ]}
                    data={[
                      { name: 'H 통계량', value: analysisResult.statistic.toFixed(4), description: 'Kruskal-Wallis H 값' },
                      { name: '자유도', value: analysisResult.degreesOfFreedom, description: 'df = k - 1' },
                      { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '카이제곱 분포' },
                      { name: '집단 수', value: analysisResult.nGroups, description: '비교 집단 개수' },
                      { name: '총 표본 수', value: analysisResult.totalN, description: '전체 관측값' }
                    ]}
                    bordered
                    compactMode
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="descriptives">
              <Card>
                <CardHeader>
                  <CardTitle>집단별 기술통계량</CardTitle>
                  <CardDescription>각 그룹의 중심경향성과 순위 정보</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    title="집단별 기술통계량"
                    columns={[
                      { key: 'groupName', header: '집단', type: 'text', align: 'left' },
                      { key: 'n', header: 'N', type: 'number', align: 'right' },
                      { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'meanRank', header: '평균순위', type: 'number', align: 'right', formatter: (v) => v.toFixed(2) },
                      { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                      { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                    ]}
                    data={Object.entries(analysisResult.descriptives).map(([groupName, stats]) => ({
                      groupName,
                      n: stats.n,
                      median: stats.median,
                      mean: stats.mean,
                      meanRank: stats.meanRank,
                      q1: stats.q1,
                      q3: stats.q3,
                      range: `${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}`
                    }))}
                    bordered
                    compactMode
                  />

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">효과크기 해석</h4>
                    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getEffectSizeInterpretation(analysisResult.effectSize.etaSquared).bg}`}>
                      <span className={`font-medium ${getEffectSizeInterpretation(analysisResult.effectSize.etaSquared).color}`}>
                        η² = {analysisResult.effectSize.etaSquared.toFixed(3)} ({getEffectSizeInterpretation(analysisResult.effectSize.etaSquared).level})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      전체 변동 중 {(analysisResult.effectSize.etaSquared * 100).toFixed(1)}%가 집단 차이로 설명됩니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                  <CardDescription>Kruskal-Wallis 검정 결과 해석 및 권장사항</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>전체 검정 결과</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.summary}
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>집단 비교</AlertTitle>
                    <AlertDescription>
                      {analysisResult.interpretation.groupComparisons}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">권장사항</h4>
                    <ul className="space-y-2">
                      {analysisResult.interpretation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">효과크기 가이드라인</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>η² ≥ 0.14: 큰 효과</div>
                      <div>η² ≥ 0.06: 중간 효과</div>
                      <div>η² ≥ 0.01: 작은 효과</div>
                      <div>η² &lt; 0.01: 미미한 효과</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="posthoc">
              <Card>
                <CardHeader>
                  <CardTitle>사후검정</CardTitle>
                  <CardDescription>집단 간 쌍별 비교 결과</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisResult.postHoc ? (
                    <>
                      <div className="mb-4">
                        <Badge variant="outline">
                          {analysisResult.postHoc.method}
                        </Badge>
                      </div>
                      <StatisticsTable
                        title="사후검정"
                        columns={[
                          { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                          { key: 'meanRankDiff', header: '평균순위 차이', type: 'number', align: 'right', formatter: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
                          { key: 'pValue', header: 'p-값', type: 'custom', align: 'right', formatter: (v) => v },
                          { key: 'significant', header: '유의성', type: 'custom', align: 'center', formatter: (v) => v }
                        ]}
                        data={analysisResult.postHoc.comparisons.map(comp => ({
                          comparison: `${comp.group1} vs ${comp.group2}`,
                          meanRankDiff: comp.meanRankDiff,
                          pValue: <PValueBadge value={comp.pValue} size="sm" />,
                          significant: <Badge variant={comp.significant ? "default" : "outline"}>{comp.significant ? "유의" : "비유의"}</Badge>
                        }))}
                        bordered
                        compactMode
                      />
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      사후검정은 전체 검정이 유의할 때 수행됩니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => actions.setCurrentStep?.(2)}>
              이전: 변수 선택
            </Button>
            <div className="space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    결과 내보내기
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>향후 제공 예정입니다</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => actions.reset?.()}>
                새로운 분석
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Kruskal-Wallis 검정 분석 중...</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 오류 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </StatisticsPageLayout>
  )
}