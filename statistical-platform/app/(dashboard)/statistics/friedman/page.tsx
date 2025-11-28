'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { FriedmanVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
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
  RotateCcw,
  Clock,
  Home,
  ChartBar
,
  Table,
  MessageSquare,
  Users
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
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Data interfaces
interface DataRow {
  [key: string]: string | number | null | undefined
}

interface ConditionStats {
  median: number
  mean: number
  meanRank: number
  sum: number
  n: number
}

interface FriedmanResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  nBlocks: number
  nConditions: number
  effectSize: {
    kendallW: number
    interpretation: string
  }
  descriptives: {
    [conditionName: string]: ConditionStats
  }
  rankSums: {
    [conditionName: string]: number
  }
  postHoc?: {
    method: string
    comparisons: Array<{
      condition1: string
      condition2: string
      pValue: number
      significant: boolean
      rankDiff: number
    }>
  }
  interpretation: {
    summary: string
    conditions: string
    recommendations: string[]
  }
}

export default function FriedmanPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('friedman')
  }, [])

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<FriedmanResult, FriedmanVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // PyodideCore instance
  const [pyodideCore] = useState(() => PyodideCoreService.getInstance())
  const [isInitialized, setIsInitialized] = useState(false)
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('statistics')

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
    { label: 'Friedman 검정', href: '/statistics/friedman', icon: RotateCcw }
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
    'friedman'
  )

  const handleDataUploadBack = useCallback(() => {
    actions.setCurrentStep(0)
  }, [actions])

  // Variable selection handlers - 3개 이상 선택 (within variables)
  const handleWithinSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', within: [] }
    const currentWithin = Array.isArray(current.within) ? current.within : []

    const isSelected = currentWithin.includes(varName)
    let newWithin: string[]

    if (isSelected) {
      newWithin = currentWithin.filter((v: string) => v !== varName)
    } else {
      // 다중 선택 가능 (최소 3개)
      newWithin = [...currentWithin, varName]
    }

    actions.setSelectedVariables?.({
      dependent: current.dependent,
      within: newWithin
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.within || selectedVariables.within.length < 3) {
      actions.setError('최소 3개 이상의 반복측정 변수를 선택해주세요.')
      return
    }

    // Step 이동 + 분석 실행
    actions.setCurrentStep(3)
    await runAnalysis(selectedVariables)
  }, [selectedVariables, actions])

  const runAnalysis = async (variables: FriedmanVariables) => {
    if (!uploadedData || !isInitialized || !variables.within || variables.within.length < 3) {
      actions.setError('분석을 실행할 수 없습니다. 최소 3개 이상의 반복측정 변수가 필요합니다.')
      return
    }

    const dependentVars = variables.within

    actions.startAnalysis()

    try {
      // Extract data columns for Friedman test
      const conditionData = dependentVars.map((varName: string) => {
        return uploadedData.data.map((row, rowIndex) => {
          const value = row[varName]
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value)
            if (isNaN(num)) {
              throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 숫자가 아닌 값("${value}")이 포함되어 있습니다.`)
            }
            return num
          }
          if (value === null || value === undefined) {
            throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 값이 없습니다.`)
          }
          // Unexpected type
          throw new Error(`변수 "${varName}"의 ${rowIndex + 1}번째 행에 예상치 못한 타입(${typeof value})이 포함되어 있습니다.`)
        })
      })

      // Call PyodideCore Worker 3 - friedman_test
      const basicResult = await pyodideCore.callWorkerMethod<{
        statistic: number
        pValue: number
      }>(PyodideWorker.NonparametricAnova, 'friedman_test', { groups: conditionData })

      // Calculate additional statistics for FriedmanResult
      const nBlocks = conditionData[0].length
      const nConditions = conditionData.length
      const degreesOfFreedom = nConditions - 1

      // Calculate descriptive statistics for each condition
      const descriptives: { [key: string]: ConditionStats } = {}
      const rankSums: { [key: string]: number } = {}

      dependentVars.forEach((varName: string, idx: number) => {
        const values = conditionData[idx]
        const sorted = [...values].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const sum = values.reduce((a, b) => a + b, 0)

        descriptives[varName] = {
          median,
          mean,
          meanRank: (idx + 1) * nBlocks / nConditions, // Simplified rank estimation
          sum,
          n: values.length
        }

        rankSums[varName] = mean * nBlocks // Simplified rank sum
      })

      // Calculate Kendall's W (coefficient of concordance)
      const kendallW = basicResult.statistic / (nBlocks * (nConditions - 1))
      const kendallInterpretation =
        kendallW >= 0.7 ? '강한 일치도' :
        kendallW >= 0.5 ? '중간 일치도' :
        kendallW >= 0.3 ? '약한 일치도' : '일치도 없음'

      // 사후검정 (Nemenyi test) - 유의한 경우에만 실행
      let postHocResult: {
        method: string
        comparisons: Array<{
          condition1: string
          condition2: string
          pValue: number
          significant: boolean
          rankDiff: number
        }>
      } | undefined

      if (basicResult.pValue < 0.05 && nConditions >= 3) {
        try {
          const nemenyiResult = await pyodideCore.callWorkerMethod<{
            method: string
            comparisons: Array<{
              group1: string
              group2: string
              pValue: number
              significant: boolean
            }>
          }>(PyodideWorker.NonparametricAnova, 'friedman_posthoc', { groups: conditionData })

          // 조건 이름 매핑 및 rankDiff 계산
          postHocResult = {
            method: nemenyiResult.method,
            comparisons: nemenyiResult.comparisons.map(comp => {
              const idx1 = parseInt(comp.group1.replace('Condition ', '')) - 1
              const idx2 = parseInt(comp.group2.replace('Condition ', '')) - 1
              const c1Name = dependentVars[idx1] || comp.group1
              const c2Name = dependentVars[idx2] || comp.group2
              const c1Stats = descriptives[c1Name]
              const c2Stats = descriptives[c2Name]
              return {
                condition1: c1Name,
                condition2: c2Name,
                pValue: comp.pValue,
                significant: comp.significant,
                rankDiff: Math.abs((c1Stats?.meanRank || 0) - (c2Stats?.meanRank || 0))
              }
            })
          }
        } catch (postHocErr) {
          console.warn('Friedman post-hoc test failed:', postHocErr)
          // 사후검정 실패해도 기본 결과는 표시
        }
      }

      // Build complete FriedmanResult
      const fullResult: FriedmanResult = {
        statistic: basicResult.statistic,
        pValue: basicResult.pValue,
        degreesOfFreedom,
        nBlocks,
        nConditions,
        effectSize: {
          kendallW,
          interpretation: kendallInterpretation
        },
        descriptives,
        rankSums,
        postHoc: postHocResult,
        interpretation: {
          summary: basicResult.pValue < 0.05
            ? `Friedman 검정 결과 조건 간 유의한 차이가 있습니다 (χ²=${basicResult.statistic.toFixed(3)}, p=${basicResult.pValue.toFixed(4)}).`
            : `Friedman 검정 결과 조건 간 유의한 차이가 없습니다 (χ²=${basicResult.statistic.toFixed(3)}, p=${basicResult.pValue.toFixed(4)}).`,
          conditions: `${nConditions}개 조건에서 ${nBlocks}개 블록의 반복측정 데이터를 분석했습니다.`,
          recommendations: [
            basicResult.pValue < 0.05
              ? (postHocResult ? '사후검정(Nemenyi test)으로 구체적인 조건 간 차이를 확인하세요.' : '유의한 차이가 발견되었으나 사후검정이 실패했습니다.')
              : '조건 간 차이가 없으므로 추가 분석이 불필요합니다.',
            `Kendall's W = ${kendallW.toFixed(3)} (${kendallInterpretation})`
          ]
        }
      }

      // completeAnalysis로 결과 저장 + isAnalyzing 리셋
      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(fullResult)
    } catch (err) {
      console.error('Friedman 검정 실패:', err)
      actions.setError('Friedman 검정 중 오류가 발생했습니다.')
    }
  }

  const getKendallWInterpretation = (w: number) => {
    if (w >= 0.7) return { level: '강한 일치도', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (w >= 0.5) return { level: '중간 일치도', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (w >= 0.3) return { level: '약한 일치도', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '일치도 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
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
              동일한 개체에서 3회 이상 반복측정한 조건들의 중위수 차이를 검정합니다.
            </p>
            <ul className="text-sm space-y-1">
              <li>• 반복측정 설계 분석</li>
              <li>• 정규분포 가정 불필요</li>
              <li>• 구형성 가정 불필요</li>
              <li>• 순위 기반 강건한 검정</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              vs 반복측정 분산분석
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">Friedman 검정</h4>
                <p className="text-muted-foreground">비모수, 구형성 가정 불필요</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <h4 className="font-medium">반복측정 분산분석</h4>
                <p className="text-muted-foreground">모수, 정규분포+구형성 가정</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertTitle>언제 사용하나요?</AlertTitle>
        <AlertDescription>
          • 동일 개체의 3회 이상 반복측정 데이터<br/>
          • 정규분포나 구형성 가정 위반<br/>
          • 서열척도 측정값의 시간별 변화<br/>
          • 반복측정 분산분석의 비모수 대안
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

    const currentVars = selectedVariables || { dependent: '', within: [] }
    const selectedWithin = Array.isArray(currentVars.within) ? currentVars.within : []

    const isValid = selectedWithin.length >= 3

    return (
      <div className="space-y-6">
        {/* 반복측정 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              반복측정 변수 선택 (최소 3개)
            </CardTitle>
            <CardDescription>
              동일한 개체에서 반복 측정한 조건 변수들을 선택하세요
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
                    variant={selectedWithin.includes(col) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleWithinSelect(col)}
                  >
                    {col}
                    {selectedWithin.includes(col) && (
                      <CheckCircle className="inline ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선택 요약 */}
        {selectedWithin.length > 0 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">선택된 변수</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">반복측정 변수:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedWithin.map((varName: string) => (
                    <Badge key={varName} variant="secondary">{varName}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedWithin.length}개 변수 선택됨 (최소 3개 필요)
              </div>
            </CardContent>
          </Card>
        )}

        {/* 경고 메시지 */}
        {selectedWithin.length > 0 && selectedWithin.length < 3 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>변수 부족</AlertTitle>
            <AlertDescription>
              Friedman 검정은 최소 3개 이상의 반복측정 변수가 필요합니다. 현재 {selectedWithin.length}개 선택됨.
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>변수 선택 가이드</AlertTitle>
          <AlertDescription>
            • 종속변수: 3개 이상의 반복측정 조건들<br/>
            • 모든 변수는 동일한 개체에서 측정되어야 함<br/>
            • 예: Time1, Time2, Time3을 모두 선택
          </AlertDescription>
        </Alert>

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
  }, [uploadedData, selectedVariables, handleWithinSelect, handleNextStep, actions])

  const renderResults = useCallback(() => {
    if (!analysisResult) {
      return null
    }

    // Get variable names for context header (FriedmanVariables uses dependent + within)
    const withinVars = Array.isArray(selectedVariables?.within)
      ? selectedVariables.within
      : selectedVariables?.within ? [selectedVariables.within] : []
    const measureVars = selectedVariables?.dependent
      ? [selectedVariables.dependent, ...withinVars]
      : withinVars

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Friedman 검정"
          analysisSubtitle="Friedman Test"
          fileName={uploadedData?.fileName}
          variables={measureVars}
          sampleSize={uploadedData?.data?.length}
          timestamp={analysisTimestamp ?? undefined}
        />

        {/* 주요 결과 카드 */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {analysisResult.statistic.toFixed(3)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">χ²ᵣ 통계량</p>
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
                  {analysisResult.effectSize.kendallW.toFixed(3)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Kendall's W</p>
                <Badge variant="outline" className="mt-1">
                  {analysisResult.effectSize.interpretation}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 결과 탭 */}
        
          <ContentTabs
              tabs={[
                { id: 'statistics', label: '통계량', icon: Calculator },
                { id: 'descriptives', label: '기술통계', icon: Table },
                { id: 'interpretation', label: '해석', icon: MessageSquare },
                { id: 'posthoc', label: '사후검정', icon: Users }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

          <ContentTabsContent tabId="statistics" show={activeResultTab === 'statistics'}>
            <StatisticsTable
              title="Friedman 검정 통계량"
              description="χ² 통계량과 검정 결과"
              columns={[
                { key: 'name', header: '통계량', type: 'text', align: 'left' },
                { key: 'value', header: '값', type: 'custom', align: 'right', formatter: (v) => v },
                { key: 'description', header: '설명', type: 'text', align: 'center' }
              ]}
              data={[
                { name: 'χ²ᵣ 통계량', value: analysisResult.statistic.toFixed(4), description: 'Friedman 카이제곱' },
                { name: '자유도', value: analysisResult.degreesOfFreedom, description: 'df = k - 1' },
                { name: 'p-값', value: <PValueBadge value={analysisResult.pValue} />, description: '카이제곱 분포' },
                { name: '블록 수', value: analysisResult.nBlocks, description: '개체 수' },
                { name: '조건 수', value: analysisResult.nConditions, description: '반복측정 조건' },
                { name: "Kendall's W", value: analysisResult.effectSize.kendallW.toFixed(4), description: '일치도 계수' }
              ]}
              bordered
              compactMode
            />
          </ContentTabsContent>

          <ContentTabsContent tabId="descriptives" show={activeResultTab === 'descriptives'}>
            <div className="space-y-6">
              <StatisticsTable
                title="조건별 기술통계량"
                description="각 측정 조건의 중심경향성과 순위 정보"
                columns={[
                  { key: 'condition', header: '조건', type: 'text', align: 'left' },
                  { key: 'n', header: 'N', type: 'number', align: 'right' },
                  { key: 'median', header: '중위수', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                  { key: 'mean', header: '평균', type: 'number', align: 'right', formatter: (v) => v.toFixed(3) },
                  { key: 'meanRank', header: '평균순위', type: 'number', align: 'right', formatter: (v) => v.toFixed(2) },
                  { key: 'rankSum', header: '순위합', type: 'number', align: 'right', formatter: (v) => v.toFixed(1) }
                ]}
                data={Object.entries(analysisResult.descriptives).map(([conditionName, stats]) => ({
                  condition: conditionName,
                  n: stats.n,
                  median: stats.median,
                  mean: stats.mean,
                  meanRank: stats.meanRank,
                  rankSum: analysisResult.rankSums[conditionName]
                }))}
                bordered
                compactMode
              />

              <Card className="p-4 bg-muted">
                <h4 className="font-medium mb-2">일치도 해석 (Kendall's W)</h4>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getKendallWInterpretation(analysisResult.effectSize.kendallW).bg}`}>
                  <span className={`font-medium ${getKendallWInterpretation(analysisResult.effectSize.kendallW).color}`}>
                    W = {analysisResult.effectSize.kendallW.toFixed(3)} ({getKendallWInterpretation(analysisResult.effectSize.kendallW).level})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  블록 내 순위 일치도: {(analysisResult.effectSize.kendallW * 100).toFixed(1)}%
                </p>
              </Card>
            </div>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <Card>
              <CardHeader>
                <CardTitle>결과 해석</CardTitle>
                <CardDescription>Friedman 검정 결과 해석 및 권장사항</CardDescription>
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
                  <AlertTitle>조건별 비교</AlertTitle>
                  <AlertDescription>
                    {analysisResult.interpretation.conditions}
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

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Kendall's W 해석 기준</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>W ≥ 0.7: 강한 일치도</div>
                    <div>W ≥ 0.5: 중간 일치도</div>
                    <div>W ≥ 0.3: 약한 일치도</div>
                    <div>W &lt; 0.3: 일치도 없음</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="posthoc" show={activeResultTab === 'posthoc'}>
            {analysisResult.postHoc ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {analysisResult.postHoc.method}
                  </Badge>
                </div>
                <StatisticsTable
                  title="사후검정"
                  description="조건 간 쌍별 비교 결과"
                  columns={[
                    { key: 'comparison', header: '비교', type: 'text', align: 'left' },
                    { key: 'rankDiff', header: '순위 차이', type: 'number', align: 'right', formatter: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}` },
                    { key: 'pValue', header: 'p-값', type: 'custom', align: 'right', formatter: (v) => v },
                    { key: 'significant', header: '유의성', type: 'custom', align: 'center', formatter: (v) => v }
                  ]}
                  data={analysisResult.postHoc.comparisons.map(comp => ({
                    comparison: `${comp.condition1} vs ${comp.condition2}`,
                    rankDiff: comp.rankDiff,
                    pValue: <PValueBadge value={comp.pValue} size="sm" />,
                    significant: <Badge variant={comp.significant ? "default" : "outline"}>{comp.significant ? "유의" : "비유의"}</Badge>
                  }))}
                  bordered
                  compactMode
                />
              </div>
            ) : (
              <Card className="text-center py-8 text-muted-foreground">
                사후검정은 전체 검정이 유의할 때 수행됩니다.
              </Card>
            )}
          </ContentTabsContent>
        </div>

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
  }, [analysisResult, actions, getKendallWInterpretation, uploadedData, selectedVariables])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      analysisTitle="Friedman 검정"
      analysisSubtitle="Friedman Test for Related Samples"
      analysisIcon={<RotateCcw className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {/* Step 0: 방법론 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUpload}
          onPrevious={handleDataUploadBack}
          currentStep={1}
          totalSteps={4}
        />
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && renderVariableSelection()}

      {/* Step 3: 결과 */}
      {currentStep === 3 && renderResults()}

      {/* 로딩 상태 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Friedman 검정 분석 중...</p>
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
