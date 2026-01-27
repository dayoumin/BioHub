'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { KruskalWallisVariables } from '@/types/statistics'
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
  Users,
  Home,
  ChartBar
,
  Table,
  MessageSquare
} from 'lucide-react'

// Components - TwoPanelLayout 사용
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Guide Components
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

// Services & Types
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

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

  // Use statistics page hook
  const { state, actions } = useStatisticsPage<KruskalWallisResult, KruskalWallisVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state

  // Guide components - useAnalysisGuide hook 사용
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'kruskal-wallis'
  })

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
    { label: 'Kruskal-Wallis 검정', href: '/statistics/kruskal-wallis', icon: Users }
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
    'kruskal-wallis'
  )

  const handleDataUploadBack = useCallback(() => {
    actions.setCurrentStep(0)
  }, [actions])

  // Variable selection handlers
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: '' }
    const newDependent = current.dependent === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: newDependent,
      factor: current.factor || ''
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleFactorSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: '' }
    const newFactor = current.factor === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: current.dependent || '',
      factor: newFactor
    })
    // ❌ setCurrentStep 제거: "다음 단계" 버튼이 Step 변경을 담당
  }, [selectedVariables, actions])

  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || !selectedVariables?.factor) {
      actions.setError('종속변수와 그룹변수를 선택해주세요.')
      return
    }

    // Step 이동 + 분석 실행
    actions.setCurrentStep(3)
    await runAnalysis(selectedVariables)
  }, [selectedVariables, actions])

  const runAnalysis = async (variables: KruskalWallisVariables) => {
    if (!uploadedData || !isInitialized || !variables.dependent || !variables.factor) {
      actions.setError('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    actions.startAnalysis()

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
        actions.setError('Kruskal-Wallis 검정은 최소 3개 이상의 그룹이 필요합니다.')
        return
      }

      // Pyodide Worker 3 호출 - kruskal_wallis_test
      const basicResult = await pyodideCore.callWorkerMethod<{
        statistic: number
        pValue: number
        df: number
      }>(PyodideWorker.NonparametricAnova, 'kruskal_wallis_test', { groups: groupArrays })

      // 기술통계량 계산 - Worker 1 호출
      const descriptives: Record<string, GroupDescriptives> = {}

      for (let idx = 0; idx < groupNames.length; idx++) {
        const name = groupNames[idx]
        const arr = groupArrays[idx]

        // Calculate descriptive statistics with Worker 1
        const stats = await pyodideCore.callWorkerMethod<{
          mean: number
          median: number
          min: number
          max: number
          q1: number
          q3: number
        }>(1, 'descriptive_stats', { data: arr })

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

      // 사후검정 (Dunn test) - 유의한 경우에만 실행
      let postHocResult: {
        method: string
        comparisons: Array<{
          group1: string
          group2: string
          pValue: number
          significant: boolean
          meanRankDiff: number
        }>
      } | undefined

      if (basicResult.pValue < 0.05 && groupArrays.length >= 3) {
        try {
          const dunnResult = await pyodideCore.callWorkerMethod<{
            comparisons: Array<{
              group1: number
              group2: number
              pValue: number
              significant: boolean
            }>
          }>(PyodideWorker.NonparametricAnova, 'dunn_test', { groups: groupArrays })

          // 그룹 이름 매핑 및 meanRankDiff 계산
          postHocResult = {
            method: "Dunn's Test (Holm 보정)",
            comparisons: dunnResult.comparisons.map(comp => {
              const g1Name = groupNames[comp.group1] || `Group ${comp.group1 + 1}`
              const g2Name = groupNames[comp.group2] || `Group ${comp.group2 + 1}`
              const g1Stats = descriptives[g1Name]
              const g2Stats = descriptives[g2Name]
              return {
                group1: g1Name,
                group2: g2Name,
                pValue: comp.pValue,
                significant: comp.significant,
                meanRankDiff: Math.abs((g1Stats?.meanRank || 0) - (g2Stats?.meanRank || 0))
              }
            })
          }
        } catch (postHocErr) {
          console.warn('Dunn test failed:', postHocErr)
          // 사후검정 실패해도 기본 결과는 표시
        }
      }

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
        postHoc: postHocResult,
        interpretation: {
          summary: basicResult.pValue < 0.05
            ? `Kruskal-Wallis 검정 결과 집단 간 유의한 차이가 있습니다 (H=${basicResult.statistic.toFixed(2)}, p=${basicResult.pValue.toFixed(4)}).`
            : `Kruskal-Wallis 검정 결과 집단 간 유의한 차이가 없습니다 (H=${basicResult.statistic.toFixed(2)}, p=${basicResult.pValue.toFixed(4)}).`,
          groupComparisons: `${groupArrays.length}개 그룹의 중위수를 비교한 결과입니다.`,
          recommendations: [
            basicResult.pValue < 0.05
              ? (postHocResult ? '사후검정(Dunn test)으로 구체적인 집단 간 차이를 확인하세요.' : '유의한 차이가 발견되었으나 사후검정이 실패했습니다.')
              : '유의한 차이가 없으므로 추가 분석이 필요하지 않습니다.',
            '효과크기를 확인하여 실질적 유의성을 평가하세요.',
            '집단별 기술통계량을 비교하여 차이의 방향을 확인하세요.'
          ]
        }
      }

      // completeAnalysis로 결과 저장 + isAnalyzing 리셋
      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(fullResult)
    } catch (err) {
      console.error('Kruskal-Wallis 검정 실패:', err)
      actions.setError('Kruskal-Wallis 검정 중 오류가 발생했습니다.')
    }
  }

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '미미한 효과', color: 'text-gray-600', bg: 'bg-gray-50' }
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

      {/* Analysis Guide Panel */}
      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {/* Assumption Checklist */}
      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="분석 전 가정 확인"
          description="Kruskal-Wallis 검정의 기본 가정을 확인해주세요."
        />
      )}

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep(1)}>
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions, methodMetadata, assumptionItems])

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

    const currentVars = selectedVariables || { dependent: '', factor: '' }
    const selectedDependent = currentVars.dependent || ''
    const selectedFactor = currentVars.factor || ''

    const isValid = selectedDependent && selectedFactor

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
              3개 이상의 집단을 구분하는 범주형 변수를 선택하세요
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
                    variant={selectedFactor === col ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleFactorSelect(col)}
                  >
                    {col}
                    {selectedFactor === col && (
                      <CheckCircle className="inline ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선택 요약 */}
        {(selectedDependent || selectedFactor) && (
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
              {selectedFactor && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">그룹변수:</span>
                  <Badge>{selectedFactor}</Badge>
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
          analysisType="Kruskal-Wallis H 검정"
          analysisSubtitle="Kruskal-Wallis H Test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
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

          <EffectSizeCard
            title="효과크기 (η²)"
            value={analysisResult.effectSize.etaSquared}
            type="eta_squared"
            description="전체 변동 중 집단 간 차이로 설명되는 비율"
            showVisualScale={true}
            showInterpretation={true}
          />
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
          </ContentTabsContent>

          <ContentTabsContent tabId="descriptives" show={activeResultTab === 'descriptives'}>
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
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'}>
            <div className="space-y-4">
              {/* 결과 해석 공통 컴포넌트 */}
              <ResultInterpretation
                title="Kruskal-Wallis 검정 결과 해석"
                result={{
                  summary: analysisResult.interpretation.summary,
                  details: `H(${analysisResult.degreesOfFreedom}) = ${analysisResult.statistic.toFixed(3)}, p = ${analysisResult.pValue.toFixed(4)}, η² = ${analysisResult.effectSize.etaSquared.toFixed(3)} (${analysisResult.effectSize.interpretation})`,
                  recommendation: analysisResult.pValue < 0.05
                    ? '집단 간 유의한 차이가 있습니다. Dunn 사후검정으로 어떤 집단 간 차이가 있는지 확인하세요.'
                    : '집단 간 유의한 차이가 없습니다. 추가 분석이 필요하지 않습니다.',
                  caution: 'Kruskal-Wallis 검정은 3개 이상 독립집단의 비모수 검정입니다. 정규분포 가정이 위반될 때 일원분산분석의 대안입니다.'
                }}
              />

              {/* 효과크기 가이드라인 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">효과크기 가이드라인</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>η² ≥ 0.14: 큰 효과</div>
                    <div>η² ≥ 0.06: 중간 효과</div>
                    <div>η² ≥ 0.01: 작은 효과</div>
                    <div>η² &lt; 0.01: 미미한 효과</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ContentTabsContent>

          <ContentTabsContent tabId="posthoc" show={activeResultTab === 'posthoc'}>
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
  }, [analysisResult, actions, uploadedData, selectedVariables])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      analysisTitle="Kruskal-Wallis 검정"
      analysisSubtitle="Kruskal-Wallis H Test"
      analysisIcon={<Users className="h-5 w-5 text-primary" />}
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
    </TwoPanelLayout>
  )
}
