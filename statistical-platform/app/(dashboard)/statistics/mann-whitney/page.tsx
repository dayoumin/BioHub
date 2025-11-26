'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { MannWhitneyVariables } from '@/types/statistics'
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
  Home,
  ChartBar
} from 'lucide-react'

// Components - TwoPanelLayout 사용
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { extractRowValue } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface MannWhitneyResult {
  statistic: number
  pValue: number
  uValue: number
  nobs1: number
  nobs2: number
  medianDiff: number
  rankSum1: number
  rankSum2: number
  effectSize: {
    value: number
    interpretation: string
  }
  descriptives: {
    group1: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
    group2: {
      median: number
      mean: number
      iqr: number
      min: number
      max: number
      q1: number
      q3: number
    }
  }
  interpretation: {
    summary: string
    comparison: string
    recommendations: string[]
  }
}

export default function MannWhitneyPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('mann-whitney')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<MannWhitneyResult, MannWhitneyVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // PyodideCore instance
  const [pyodideCore] = useState(() => PyodideCoreService.getInstance())
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize PyodideCore
  useEffect(() => {
    const initPyodide = async () => {
      try {
        await pyodideCore.initialize()
        setIsInitialized(true)
      } catch (err) {
        console.error('Pyodide 초기화 실패:', err)
        actions.setError('통계 엔진을 초기화할 수 없습니다.')
      }
    }
    initPyodide()
  }, [actions, pyodideCore])

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/', icon: Home },
    { label: '통계 분석', href: '/statistics', icon: ChartBar },
    { label: 'Mann-Whitney U 검정', href: '/statistics/mann-whitney', icon: Activity }
  ], [])

  // Steps configuration
  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: currentStep > index || (currentStep === 3 && analysisResult !== null)
    }))
  }, [currentStep, analysisResult])

  // Event handlers
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
      actions.setError('')
    },
    'mann-whitney'
  )

  const handleDataUploadBack = useCallback(() => {
    actions.setCurrentStep(0)
  }, [actions])

  // Variable selection handlers
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: [] }
    const newDependent = current.dependent === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: newDependent,
      factor: current.factor || []
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleFactorSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: [] }
    const currentFactors = Array.isArray(current.factor) ? current.factor : []

    const isSelected = currentFactors.includes(varName)
    let newFactors: string[]

    if (isSelected) {
      newFactors = currentFactors.filter((v: string) => v !== varName)
    } else {
      // 정확히 1개만 선택 가능
      newFactors = [varName]
    }

    actions.setSelectedVariables?.({
      dependent: current.dependent || '',
      factor: newFactors
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || !selectedVariables?.factor || selectedVariables.factor.length === 0) {
      actions.setError('종속변수와 그룹변수를 선택해주세요.')
      return
    }

    // Step 이동 + 분석 실행
    actions.setCurrentStep(3)
    await runAnalysis(selectedVariables)
  }, [selectedVariables, actions])

  const runAnalysis = async (variables: MannWhitneyVariables) => {
    if (!uploadedData || !uploadedData.data || !isInitialized || !variables.dependent || !variables.factor || variables.factor.length === 0) {
      actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    actions.startAnalysis()

    try {
      // 배열 정규화: string | string[] → string[]
      const factorVars = Array.isArray(variables.factor)
        ? variables.factor
        : [variables.factor]

      if (factorVars.length === 0) {
        actions.setError('최소 1개의 그룹 변수가 필요합니다.')
        return
      }

      const data = uploadedData.data
      const dependentVar = variables.dependent
      const groupVar = factorVars[0]

      // 그룹별로 데이터 분리
      const groups = new Map<string | number, number[]>()
      for (const row of data) {
        const groupValue = row[groupVar]
        const depValue = extractRowValue(row, dependentVar)

        if (groupValue !== null && groupValue !== undefined && depValue !== null) {
          const key = String(groupValue)
          if (!groups.has(key)) {
            groups.set(key, [])
          }
          groups.get(key)!.push(depValue)
        }
      }

      const groupValues = Array.from(groups.keys())
      if (groupValues.length !== 2) {
        actions.setError(`그룹 변수는 정확히 2개 범주를 가져야 합니다. 현재: ${groupValues.length}개`)
        return
      }

      const group1 = groups.get(groupValues[0])!
      const group2 = groups.get(groupValues[1])!

      // Mann-Whitney U 검정 실행 (PyodideCoreService 사용)
      const result = await pyodideCore.callWorkerMethod<{
        statistic: number
        pvalue: number
      }>(
        PyodideWorker.NonparametricAnova, // Worker 3 (Nonparametric)
        'mann_whitney_test',
        {
          group1,
          group2
        }
      )

      // 효과크기 계산: r = Z / sqrt(N)
      // Z는 정규 근사에서 계산, U 통계량을 이용
      const n1 = group1.length
      const n2 = group2.length
      const N = n1 + n2
      const U = result.statistic

      // U의 기대값과 표준편차
      const meanU = (n1 * n2) / 2
      const stdU = Math.sqrt((n1 * n2 * (N + 1)) / 12)

      // Z 점수 계산
      const Z = (U - meanU) / stdU

      // 효과크기 r = |Z| / sqrt(N)
      const effectSizeR = Math.abs(Z) / Math.sqrt(N)

      // 효과크기 해석
      const getEffectSizeInterpretation = (r: number): string => {
        if (r >= 0.5) return '큰 효과 (Large)'
        if (r >= 0.3) return '중간 효과 (Medium)'
        if (r >= 0.1) return '작은 효과 (Small)'
        return '무시할 수 있는 효과 (Negligible)'
      }

      // 사분위수 계산 함수
      const calculateQuartiles = (arr: number[]) => {
        const sorted = [...arr].sort((a, b) => a - b)
        const n = sorted.length
        const q1Index = Math.floor(n * 0.25)
        const q3Index = Math.floor(n * 0.75)
        const medianIndex = Math.floor(n * 0.5)
        return {
          q1: sorted[q1Index],
          median: sorted[medianIndex],
          q3: sorted[q3Index],
          iqr: sorted[q3Index] - sorted[q1Index]
        }
      }

      const q1 = calculateQuartiles(group1)
      const q2 = calculateQuartiles(group2)

      // 결과를 MannWhitneyResult 형식으로 변환
      const formattedResult: MannWhitneyResult = {
        statistic: result.statistic,
        pValue: result.pvalue,
        uValue: result.statistic,
        nobs1: n1,
        nobs2: n2,
        medianDiff: q1.median - q2.median,
        rankSum1: U + (n1 * (n1 + 1)) / 2, // R1 = U1 + n1(n1+1)/2
        rankSum2: (n1 * n2) - U + (n2 * (n2 + 1)) / 2, // R2 = U2 + n2(n2+1)/2
        effectSize: {
          value: Number(effectSizeR.toFixed(3)),
          interpretation: getEffectSizeInterpretation(effectSizeR)
        },
        descriptives: {
          group1: {
            median: q1.median,
            mean: group1.reduce((a, b) => a + b, 0) / n1,
            iqr: q1.iqr,
            min: Math.min(...group1),
            max: Math.max(...group1),
            q1: q1.q1,
            q3: q1.q3
          },
          group2: {
            median: q2.median,
            mean: group2.reduce((a, b) => a + b, 0) / n2,
            iqr: q2.iqr,
            min: Math.min(...group2),
            max: Math.max(...group2),
            q1: q2.q1,
            q3: q2.q3
          }
        },
        interpretation: {
          summary: `Mann-Whitney U 검정 결과 (U = ${result.statistic.toFixed(2)}, p = ${result.pvalue.toFixed(3)})`,
          comparison: `두 그룹 간 ${result.pvalue < 0.05 ? '유의한' : '유의하지 않은'} 차이가 있습니다.`,
          recommendations: [
            result.pvalue < 0.05 ? '귀무가설을 기각합니다.' : '귀무가설을 기각할 수 없습니다.',
            '효과크기를 확인하여 실질적 의미를 평가하세요.',
            '데이터 시각화를 통해 분포를 확인하세요.'
          ]
        }
      }

      // completeAnalysis로 결과 저장 + isAnalyzing 리셋 (Step 이동은 이미 완료)
      actions.completeAnalysis(formattedResult)
    } catch (err) {
      console.error('Mann-Whitney U 검정 실패:', err)
      actions.setError('Mann-Whitney U 검정 중 오류가 발생했습니다.')
    }
  }

  // Render functions
  const renderMethodIntroduction = useCallback(() => (
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
              두 독립집단의 분포가 동일한지 검정하며, 중위수 차이를 비교합니다.
            </p>
            <ul className="text-sm space-y-1">
              <li>• 정규분포 가정 불필요</li>
              <li>• 등분산성 가정 불필요</li>
              <li>• 이상치에 강건한 검정</li>
              <li>• 소표본에도 적용 가능</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              vs 독립표본 t-검정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">Mann-Whitney U</h4>
                <p className="text-muted-foreground">비모수 검정, 정규분포 불필요</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">독립표본 t-검정</h4>
                <p className="text-muted-foreground">모수 검정, 정규분포 가정 필요</p>
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
          • 이상치가 많이 포함된 데이터<br/>
          • 서열척도(순위) 데이터 분석<br/>
          • 소표본 크기에서 두 집단 비교
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep(1)}>
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData?.data || !uploadedData.columns) {
      return null
    }

    const numericColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data.find((row) => row[col] != null)?.[col]
      return typeof firstValue === 'number'
    })

    const categoricalColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data.find((row) => row[col] != null)?.[col]
      return typeof firstValue === 'string'
    })

    const currentVars = selectedVariables || { dependent: '', factor: [] }
    const selectedDependent = currentVars.dependent || ''
    const selectedFactors = Array.isArray(currentVars.factor) ? currentVars.factor : []

    const isValid = selectedDependent && selectedFactors.length === 1

    return (
      <div className="space-y-6">
        {/* 종속변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              종속변수 선택 (연속형)
            </CardTitle>
            <CardDescription>
              비교할 수치형 변수를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {numericColumns.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  수치형 변수가 없습니다. 데이터를 확인해주세요.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-2">
                {numericColumns.map((col: string) => (
                  <Badge
                    key={col}
                    variant={selectedDependent === col ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleDependentSelect(col)}
                  >
                    {col}
                    {selectedDependent === col && (
                      <CheckCircle className="inline ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 그룹변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              그룹변수 선택 (범주형)
            </CardTitle>
            <CardDescription>
              두 집단을 구분하는 범주형 변수를 선택하세요 (정확히 2개 범주 필요)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoricalColumns.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  범주형 변수가 없습니다. 데이터를 확인해주세요.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoricalColumns.map((col: string) => (
                  <Badge
                    key={col}
                    variant={selectedFactors.includes(col) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleFactorSelect(col)}
                  >
                    {col}
                    {selectedFactors.includes(col) && (
                      <CheckCircle className="inline ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선택 요약 */}
        {(selectedDependent || selectedFactors.length > 0) && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">선택된 변수</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedDependent && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">종속변수:</span>
                  <Badge>{selectedDependent}</Badge>
                </div>
              )}
              {selectedFactors.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">그룹변수:</span>
                  <Badge>{selectedFactors[0]}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep(1)}>
            이전
          </Button>
          <Button
            onClick={handleNextStep}
            disabled={!isValid}
          >
            다음 단계
          </Button>
        </div>
      </div>
    )
  }, [uploadedData, selectedVariables, handleDependentSelect, handleFactorSelect, handleNextStep, actions])

  const renderResults = useCallback(() => {
    if (!analysisResult) {
      return null
    }

    // Get variable names for context header
    const dependentVar = selectedVariables?.dependent || ''
    const factorVar = Array.isArray(selectedVariables?.factor)
      ? selectedVariables.factor[0] || ''
      : selectedVariables?.factor || ''
    const usedVariables = [dependentVar, factorVar].filter(Boolean)

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Mann-Whitney U 검정"
          analysisSubtitle="Wilcoxon Rank-Sum Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={uploadedData?.data?.length}
          timestamp={new Date()}
        />

        {/* 주요 결과 카드 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {analysisResult.uValue}
                </div>
                <p className="text-sm text-muted-foreground mt-1">U 통계량</p>
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
                  {analysisResult.effectSize.value.toFixed(3)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">효과크기 (r)</p>
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
            <TabsTrigger value="visualization">시각화</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Mann-Whitney U 검정 통계량</CardTitle>
                <CardDescription>순위합과 U 통계량 결과</CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="Mann-Whitney U 검정 통계량"
                  description="순위합과 U 통계량 결과"
                  columns={[
                    { key: 'name', header: '통계량', type: 'text', align: 'left' },
                    { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'description', header: '설명', type: 'text', align: 'center' }
                  ] as const}
                  data={[
                    { name: 'U 통계량', value: analysisResult.uValue, description: 'Mann-Whitney U 값' },
                    { name: '검정통계량', value: analysisResult.statistic.toFixed(4), description: '표준화된 검정통계량' },
                    { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '양측 검정' },
                    { name: '그룹 1 순위합', value: analysisResult.rankSum1.toFixed(1), description: '첫 번째 그룹 순위합' },
                    { name: '그룹 2 순위합', value: analysisResult.rankSum2.toFixed(1), description: '두 번째 그룹 순위합' }
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
                <CardDescription>각 그룹의 중심경향성과 분산 지표</CardDescription>
              </CardHeader>
              <CardContent>
                <StatisticsTable
                  title="집단별 기술통계량"
                  columns={[
                    { key: 'group', header: '집단', type: 'text', align: 'left' },
                    { key: 'n', header: 'N', type: 'number', align: 'right' },
                    { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'q1', header: 'Q1', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'q3', header: 'Q3', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'iqr', header: 'IQR', type: 'number', align: 'right', formatter: (v: number) => v.toFixed(3) },
                    { key: 'range', header: '범위', type: 'custom', align: 'right', formatter: (v: string) => v }
                  ]}
                  data={[
                    {
                      group: '그룹 1',
                      n: analysisResult.nobs1,
                      median: analysisResult.descriptives.group1.median,
                      mean: analysisResult.descriptives.group1.mean,
                      q1: analysisResult.descriptives.group1.q1,
                      q3: analysisResult.descriptives.group1.q3,
                      iqr: analysisResult.descriptives.group1.iqr,
                      range: `${analysisResult.descriptives.group1.min.toFixed(2)} - ${analysisResult.descriptives.group1.max.toFixed(2)}`
                    },
                    {
                      group: '그룹 2',
                      n: analysisResult.nobs2,
                      median: analysisResult.descriptives.group2.median,
                      mean: analysisResult.descriptives.group2.mean,
                      q1: analysisResult.descriptives.group2.q1,
                      q3: analysisResult.descriptives.group2.q3,
                      iqr: analysisResult.descriptives.group2.iqr,
                      range: `${analysisResult.descriptives.group2.min.toFixed(2)} - ${analysisResult.descriptives.group2.max.toFixed(2)}`
                    }
                  ]}
                  bordered
                  compactMode
                />

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">중위수 차이</h4>
                  <div className="text-2xl font-bold text-primary">
                    {analysisResult.medianDiff > 0 ? '+' : ''}{analysisResult.medianDiff.toFixed(3)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    그룹 1 중위수 - 그룹 2 중위수
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation">
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
                <CardDescription>Mann-Whitney U 검정 결과 해석 및 권장사항</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>분석 결과 요약</AlertTitle>
                  <AlertDescription>
                    {analysisResult.interpretation.summary}
                  </AlertDescription>
                </Alert>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>집단 비교</AlertTitle>
                  <AlertDescription>
                    {analysisResult.interpretation.comparison}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">권장사항</h4>
                  <ul className="space-y-2">
                    {analysisResult.interpretation.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visualization">
            <Card>
              <CardHeader>
                <CardTitle>데이터 시각화</CardTitle>
                <CardDescription>집단별 분포 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  📊 박스플롯 및 히스토그램은 추후 구현 예정입니다
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
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
            <Button onClick={() => actions.setCurrentStep(0)}>
              새로운 분석
            </Button>
          </div>
        </div>
      </div>
    )
  }, [analysisResult, actions, uploadedData, selectedVariables])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      analysisTitle="Mann-Whitney U 검정"
      analysisSubtitle="Wilcoxon Rank-Sum Test"
      analysisIcon={<Activity className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {/* Step 1: 방법론 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onPrevious={handleDataUploadBack}
          currentStep={1}
          totalSteps={4}
        />
      )}

      {/* Step 3: 변수 선택 */}
      {currentStep === 2 && renderVariableSelection()}

      {/* Step 4: 결과 */}
      {currentStep === 3 && renderResults()}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Mann-Whitney U 검정 분석 중...</p>
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
    </TwoPanelLayout>
  )
}
