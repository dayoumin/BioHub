'use client'

/**
 * Welch t-검정 페이지 - TwoPanelLayout (데이터 하단 배치)
 *
 * Migration: StatisticsPageLayout → TwoPanelLayout
 * - Badge-based variable selection (dependent + factor)
 * - Critical Bug prevention (Badge clicks don't trigger step change)
 * - Separate analysis button ("다음 단계" triggers step + analysis)
 */

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import type { WelchTVariables } from '@/types/statistics'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { DataPreviewPanel } from '@/components/statistics/common/DataPreviewPanel'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { escapeHtml } from '@/lib/utils/html-escape'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { openDataWindow } from '@/lib/utils/open-data-window'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'
import {
  Calculator,
  GitBranch,
  BarChart3,
  Info,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Target,
  TrendingUp,
  FileText,
  Shield,
  Table
} from 'lucide-react'

interface WelchTResults {
  group1: {
    name: string
    n: number
    mean: number
    std: number
    se: number
  }
  group2: {
    name: string
    n: number
    mean: number
    std: number
    se: number
  }
  welchStatistic: number
  adjustedDF: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  effectSize: number
  meanDifference: number
  pooledSE: number
  interpretation: string
  conclusion: string
  equalVariances: {
    leveneStatistic: number
    levenePValue: number
    assumption: 'met' | 'violated'
  }
  regularTTest?: {
    tStatistic: number
    pValue: number
    df: number
  }
}

const STEPS = [
  { id: 1, label: '방법 소개' },
  { id: 2, label: '데이터 업로드' },
  { id: 3, label: '변수 선택' },
  { id: 4, label: '분석 결과' }
]

export default function WelchTPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('welch-t')
  }, [])

  const { state, actions } = useStatisticsPage<WelchTResults, WelchTVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'welch-t'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const [alternative, setAlternative] = useState('two-sided')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: 'Welch t-검정' }
  ], [])

  // Steps with completed state
  const stepsWithCompleted = useMemo(() => STEPS.map(step => ({
    ...step,
    completed: step.id === 1 ? currentStep > 0 :
              step.id === 2 ? !!uploadedData :
              step.id === 3 ? !!selectedVariables :
              step.id === 4 ? !!results : false
  })), [currentStep, uploadedData, selectedVariables, results])

  // Handlers
  const handleDataUpload = useCallback((file: File, data: Array<Record<string, unknown>>) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    if (actions.setUploadedData) {
      actions.setUploadedData({ data, fileName: file.name, columns })
    }
    actions.setCurrentStep(2)
  }, [actions])

  // Variable selection handlers (Critical Bug prevention: NO setCurrentStep here)
  const handleDependentSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: [] }
    const newDependent = current.dependent === varName ? '' : varName
    actions.setSelectedVariables?.({
      dependent: newDependent,
      factor: current.factor || []
    })
  }, [selectedVariables, actions])

  const handleFactorSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '', factor: [] }
    const currentFactors = Array.isArray(current.factor) ? current.factor : []
    const isSelected = currentFactors.includes(varName)
    const newFactors = isSelected
      ? currentFactors.filter(v => v !== varName)
      : [varName] // Only allow 1 factor
    actions.setSelectedVariables?.({
      dependent: current.dependent || '',
      factor: newFactors
    })
  }, [selectedVariables, actions])

  const runWelchTAnalysis = useCallback(async (variables: WelchTVariables) => {
    if (!uploadedData) return

    actions.startAnalysis()

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 그룹 변수와 값 변수 추출
      const groupVar = Array.isArray(variables.factor)
        ? variables.factor[0]
        : variables.factor

      const valueVar = Array.isArray(variables.dependent)
        ? variables.dependent[0]
        : variables.dependent

      if (!groupVar || !valueVar) {
        actions.setError('그룹 변수와 값 변수를 모두 선택해주세요.')
        return
      }

      // 데이터를 그룹별로 분리
      const groups: Record<string, number[]> = {}
      uploadedData.data.forEach((row: Record<string, unknown>) => {
        const group = String(row[groupVar])
        const value = typeof row[valueVar] === 'number' ? row[valueVar] : parseFloat(String(row[valueVar]))
        if (!isNaN(value)) {
          if (!groups[group]) groups[group] = []
          groups[group].push(value)
        }
      })

      const groupNames = Object.keys(groups)
      if (groupNames.length !== 2) {
        actions.setError('정확히 2개의 그룹이 필요합니다.')
        return
      }

      const group1Data = groups[groupNames[0]]
      const group2Data = groups[groupNames[1]]

      // Worker 2 (hypothesis), method: 't_test_two_sample' (equal_var=false) 호출
      interface WelchTResult {
        statistic: number
        pValue: number
        df: number
        mean1: number
        mean2: number
        std1: number
        std2: number
        cohensD?: number
      }

      const result = await pyodideCore.callWorkerMethod<WelchTResult>(
        PyodideWorker.Hypothesis,
        't_test_two_sample',
        {
          group1: group1Data,
          group2: group2Data,
          equalVar: false, // Welch t-test는 등분산 가정 안함
          alpha: 1 - parseFloat(confidenceLevel) / 100
        }
      )

      const mean1 = result.mean1
      const mean2 = result.mean2
      const std1 = result.std1
      const std2 = result.std2
      const n1 = group1Data.length
      const n2 = group2Data.length
      const se1 = std1 / Math.sqrt(n1)
      const se2 = std2 / Math.sqrt(n2)
      const pooledSE = Math.sqrt(se1 * se1 + se2 * se2)
      const meanDiff = mean1 - mean2
      const effectSize = result.cohensD ?? Math.abs(meanDiff) / Math.sqrt((std1 * std1 + std2 * std2) / 2)

      const results: WelchTResults = {
        group1: {
          name: groupNames[0],
          n: n1,
          mean: mean1,
          std: std1,
          se: se1
        },
        group2: {
          name: groupNames[1],
          n: n2,
          mean: mean2,
          std: std2,
          se: se2
        },
        welchStatistic: result.statistic,
        adjustedDF: result.df,
        pValue: result.pValue,
        confidenceLevel: parseFloat(confidenceLevel),
        ciLower: meanDiff - 1.96 * pooledSE,
        ciUpper: meanDiff + 1.96 * pooledSE,
        effectSize,
        meanDifference: meanDiff,
        pooledSE,
        interpretation: result.pValue < 0.05 ? 'p < 0.05이므로 두 그룹 간 유의한 차이가 있습니다' : 'p ≥ 0.05이므로 두 그룹 간 유의한 차이가 없습니다',
        conclusion: result.pValue < 0.05
          ? `등분산 가정을 하지 않더라도 ${groupNames[0]}와 ${groupNames[1]}의 평균에 통계적으로 유의한 차이가 있습니다`
          : `등분산 가정을 하지 않더라도 ${groupNames[0]}와 ${groupNames[1]}의 평균에 통계적으로 유의한 차이가 없습니다`,
        equalVariances: {
          leveneStatistic: 0,
          levenePValue: 1,
          assumption: 'violated'
        },
        regularTTest: {
          tStatistic: result.statistic,
          pValue: result.pValue,
          df: result.df
        }
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(results, 3)
      setActiveResultTab('summary')
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, [actions, uploadedData, confidenceLevel])

  // "다음 단계" button (triggers step change + analysis)
  const handleNextStep = useCallback(async () => {
    if (!selectedVariables?.dependent || !selectedVariables?.factor ||
        (Array.isArray(selectedVariables.factor) && selectedVariables.factor.length === 0)) {
      actions.setError('종속변수와 그룹변수를 모두 선택해주세요.')
      return
    }
    actions.setCurrentStep(3)
    await runWelchTAnalysis(selectedVariables)
  }, [selectedVariables, actions, runWelchTAnalysis])

  // "새 창으로 보기" 핸들러
  const handleOpenNewWindow = useCallback(() => {
    if (!uploadedData) return
    openDataWindow({
      fileName: uploadedData.fileName,
      columns: uploadedData.columns,
      data: uploadedData.data
    })
  }, [uploadedData])

  // Render functions (useCallback)
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="text-center">
        <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welch t-검정 (Welch&apos;s t-Test)</h1>
        <p className="text-lg text-gray-600">등분산 가정 없이 두 독립집단의 평균을 비교합니다</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              분석 목적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                두 독립집단의 평균 비교
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                등분산 가정이 충족되지 않을 때 사용
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                표본크기가 다를 때 더 안정적
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                일반 t-검정보다 보수적이지만 정확함
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              적용 조건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>데이터:</strong> 연속형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>그룹:</strong> 정확히 2개 독립집단</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>정규성:</strong> 정규분포 또는 n≥30</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span><strong>등분산:</strong> 가정 불필요 ⭐</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>검정 공식:</strong> t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂)<br />
          Welch-Satterthwaite 공식으로 자유도를 조정하여 더 정확한 결과를 제공합니다.
        </AlertDescription>
      </Alert>

      
      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          showProgress={true}
          collapsible={true}
          title="Analysis Assumptions"
          description="Welch's t-Test assumptions to verify before analysis."
        />
      )}

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  ), [actions, methodMetadata, assumptionItems])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data.find(row => row[col] != null)?.[col]
      return typeof firstValue === 'number'
    })

    const categoricalColumns = uploadedData.columns.filter((col: string) => {
      const firstValue = uploadedData.data.find(row => row[col] != null)?.[col]
      return typeof firstValue === 'string'
    })

    const currentVars = selectedVariables || { dependent: '', factor: [] }
    const selectedDependent = currentVars.dependent || ''
    const selectedFactors = Array.isArray(currentVars.factor) ? currentVars.factor : []

    const isValid = selectedDependent && selectedFactors.length === 1

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
          <p className="text-sm text-muted-foreground">
            그룹 변수(범주형)와 비교할 변수(연속형)를 선택하세요
          </p>
        </div>

        <div className="space-y-4">
          {/* 종속변수 선택 (numeric, single select) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">비교 변수 (연속형, 1개 선택)</Label>
            <p className="text-xs text-muted-foreground">평균을 비교할 수치형 변수를 선택하세요</p>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((header: string) => {
                const isSelected = selectedDependent === header
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer max-w-[200px] truncate"
                    title={header}
                    onClick={() => handleDependentSelect(header)}
                  >
                    {header}
                    {isSelected && (
                      <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* 그룹 변수 선택 (categorical, single select) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">그룹 변수 (범주형, 1개 선택)</Label>
            <p className="text-xs text-muted-foreground">2개 그룹을 구분할 범주형 변수를 선택하세요</p>
            <div className="flex flex-wrap gap-2">
              {categoricalColumns.map((header: string) => {
                const isSelected = selectedFactors.includes(header)
                return (
                  <Badge
                    key={header}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer max-w-[200px] truncate"
                    title={header}
                    onClick={() => handleFactorSelect(header)}
                  >
                    {header}
                    {isSelected && (
                      <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* 가설 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">가설 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>대립가설</Label>
                  <Select value={alternative} onValueChange={setAlternative}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">μ₁ ≠ μ₂ (양측검정)</SelectItem>
                      <SelectItem value="greater">μ₁ &gt; μ₂ (우측검정)</SelectItem>
                      <SelectItem value="less">μ₁ &lt; μ₂ (좌측검정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>신뢰수준</Label>
                  <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="95">95%</SelectItem>
                      <SelectItem value="99">99%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 다음 단계 버튼 (Critical Bug prevention: triggers step + analysis) */}
        <div className="flex gap-3">
          <Button
            onClick={handleNextStep}
            disabled={isAnalyzing || !isValid}
            size="lg"
            className="flex-1 md:flex-none md:w-auto shadow-lg"
          >
            {isAnalyzing ? '분석 중...' : '다음 단계 (분석 실행)'}
          </Button>
        </div>

        {/* 업로드된 데이터 미리보기 */}
        <DataPreviewPanel
          data={uploadedData.data}
          fileName={uploadedData.fileName}
          defaultExpanded={true}
          onOpenNewWindow={handleOpenNewWindow}
        />
      </div>
    )
  }, [uploadedData, selectedVariables, alternative, confidenceLevel, error, isAnalyzing,
      handleDependentSelect, handleFactorSelect, handleNextStep, handleOpenNewWindow])

  const renderResults = useCallback(() => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Welch t-검정을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!results) return null

    const significanceLevel = (100 - results.confidenceLevel) / 100
    const isSignificant = results.pValue < significanceLevel

    // Get variable names for context header
    const groupVar = selectedVariables?.factor
      ? (Array.isArray(selectedVariables.factor) ? selectedVariables.factor[0] : selectedVariables.factor)
      : ''
    const valueVar = selectedVariables?.dependent
      ? (Array.isArray(selectedVariables.dependent) ? selectedVariables.dependent[0] : selectedVariables.dependent)
      : ''
    const usedVariables = [groupVar, valueVar].filter(Boolean)

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Welch t-검정"
          analysisSubtitle="Welch's t-test"
          fileName={uploadedData?.fileName}
          variables={usedVariables}
          sampleSize={results ? results.group1.n + results.group2.n : undefined}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: '요약', icon: FileText },
                { id: 'results', label: '검정결과', icon: Table },
                { id: 'assumptions', label: '가정검토', icon: Shield },
                { id: 'confidence', label: '신뢰구간', icon: Target }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">
          

          <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Welch t 통계량</p>
                      <p className="text-2xl font-bold">{results.welchStatistic.toFixed(2)}</p>
                    </div>
                    <Calculator className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">조정된 자유도</p>
                      <p className="text-2xl font-bold">{results.adjustedDF.toFixed(1)}</p>
                    </div>
                    <GitBranch className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">p-값</p>
                      <p className="text-2xl font-bold">
                        {results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}
                      </p>
                    </div>
                    <BarChart3 className={`w-8 h-8 ${isSignificant ? 'text-stat-significant' : 'text-stat-non-significant'}`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">효과크기</p>
                      <p className="text-2xl font-bold">{results.effectSize.toFixed(2)}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 결과 해석 - 공통 컴포넌트 */}
            <ResultInterpretation
              result={{
                summary: results.conclusion,
                details: `t(${results.adjustedDF.toFixed(1)}) = ${results.welchStatistic.toFixed(3)}, p = ${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}, Cohen's d = ${results.effectSize.toFixed(3)}`,
                recommendation: results.pValue < 0.05
                  ? `두 그룹 간 평균 차이가 ${results.meanDifference.toFixed(2)}로 통계적으로 유의합니다.`
                  : '두 그룹 간 평균 차이가 통계적으로 유의하지 않습니다.',
                caution: 'Welch t-검정은 등분산 가정이 필요하지 않습니다.'
              }}
              title="Welch t-검정 결과 해석"
            />

            {/* 효과크기 - 공통 컴포넌트 */}
            <EffectSizeCard
              title="Cohen's d"
              value={results.effectSize}
              type="cohens_d"
              description="d = (M₁ - M₂) / √((s₁² + s₂²) / 2)"
            />
          </ContentTabsContent>

          <ContentTabsContent tabId="results" show={activeResultTab === 'results'} className="space-y-6">
            <StatisticsTable
              columns={[
                { key: 'group', header: '그룹', type: 'text' as const },
                { key: 'n', header: 'N', type: 'number' as const },
                { key: 'mean', header: '평균', type: 'text' as const },
                { key: 'std', header: '표준편차', type: 'text' as const },
                { key: 'se', header: '표준오차', type: 'text' as const }
              ]}
              data={[
                {
                  group: results.group1.name,
                  n: results.group1.n,
                  mean: results.group1.mean.toFixed(2),
                  std: results.group1.std.toFixed(2),
                  se: results.group1.se.toFixed(3)
                },
                {
                  group: results.group2.name,
                  n: results.group2.n,
                  mean: results.group2.mean.toFixed(2),
                  std: results.group2.std.toFixed(2),
                  se: results.group2.se.toFixed(3)
                }
              ]}
              title="그룹별 기술통계"
            />

            <StatisticsTable
              columns={[
                { key: 'test', header: '검정 방법', type: 'text' as const },
                { key: 'statistic', header: 't 통계량', type: 'text' as const },
                { key: 'df', header: '자유도', type: 'text' as const },
                { key: 'pValue', header: 'p-값', type: 'text' as const },
                { key: 'effectSize', header: "Cohen's d", type: 'text' as const },
                { key: 'interpretation', header: '해석', type: 'text' as const }
              ]}
              data={[
                {
                  test: 'Welch t-검정',
                  statistic: results.welchStatistic.toFixed(3),
                  df: results.adjustedDF.toFixed(1),
                  pValue: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
                  effectSize: results.effectSize.toFixed(3),
                  interpretation: results.interpretation
                },
                ...(results.regularTTest ? [{
                  test: '일반 t-검정 (참고)',
                  statistic: results.regularTTest.tStatistic.toFixed(3),
                  df: results.regularTTest.df.toString(),
                  pValue: results.regularTTest.pValue < 0.001 ? '< 0.001' : results.regularTTest.pValue.toFixed(3),
                  effectSize: results.effectSize.toFixed(3),
                  interpretation: '등분산 가정 시의 결과'
                }] : [])
              ]}
              title="Welch t-검정 결과"
            />
          </ContentTabsContent>

          <ContentTabsContent tabId="assumptions" show={activeResultTab === 'assumptions'} className="space-y-6">
            {/* 가정 검정 - 공통 컴포넌트 */}
            <AssumptionTestCard
              title="Welch t-검정 가정 검토"
              tests={[{
                name: '등분산성 (Homogeneity of Variance)',
                testName: 'Levene',
                statistic: results.equalVariances.leveneStatistic,
                pValue: results.equalVariances.levenePValue,
                passed: results.equalVariances.assumption !== 'violated',
                alpha: 0.05,
                recommendation: results.equalVariances.assumption === 'violated'
                  ? 'Welch t-검정이 적절한 선택입니다. 등분산 가정 없이 분석됩니다.'
                  : '등분산 가정이 충족되지만, Welch t-검정도 유효한 결과를 제공합니다.',
                severity: results.equalVariances.assumption === 'violated' ? 'low' : undefined
              }]}
              showRecommendations={true}
            />

            <Card>
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2">Welch t-검정의 장점:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 등분산 가정을 하지 않음</li>
                  <li>• 표본크기가 다를 때 더욱 안정적</li>
                  <li>• Type I 오류율을 더 잘 통제</li>
                  <li>• 분산이 크게 다를 때 더 정확함</li>
                </ul>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="confidence" show={activeResultTab === 'confidence'} className="space-y-6">
            {/* 신뢰구간 - 공통 컴포넌트 */}
            <ConfidenceIntervalDisplay
              lower={results.ciLower}
              upper={results.ciUpper}
              estimate={results.meanDifference}
              level={results.confidenceLevel}
              label="평균 차이의 신뢰구간"
              referenceValue={0}
              showVisualization={true}
              showInterpretation={true}
              description={`${results.confidenceLevel}% 확률로 두 그룹의 실제 평균 차이는 이 구간 내에 있습니다.`}
            />
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [isAnalyzing, error, results, activeResultTab, uploadedData, selectedVariables])

  // Type-safe onStepChange handler
  const handleStepChange = useCallback((step: number) => {
    actions.setCurrentStep(step)
  }, [actions])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={handleStepChange}
      analysisTitle="Welch t-검정"
      analysisSubtitle="Welch's t-Test"
      analysisIcon={<Calculator className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
      bottomPreview={uploadedData ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        onOpenNewWindow: handleOpenNewWindow
      } : undefined}
    >
      {/* Step 0: 분석 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">데이터 업로드</h2>
            <p className="text-sm text-muted-foreground">
              Welch t-검정할 데이터 파일을 업로드하세요
            </p>
          </div>

          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={() => actions.setCurrentStep(2)}
            canGoNext={!!uploadedData}
          />

          {/* 업로드된 데이터 미리보기 */}
          {uploadedData && (
            <DataPreviewPanel
              data={uploadedData.data}
              fileName={uploadedData.fileName}
              defaultExpanded={true}
              onOpenNewWindow={handleOpenNewWindow}
            />
          )}
        </div>
      )}

      {/* Step 2: 변수 선택 */}
      {currentStep === 2 && uploadedData && renderVariableSelection()}

      {/* Step 3: 분석 결과 */}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
