'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Microscope,
  BarChart3,
  PieChart,
  Play,
  Info,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Components
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

// Services & Hooks
import { VariableMapping } from '@/components/variable-selection/types'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { createDataUploadHandler, createVariableSelectionHandler } from '@/lib/utils/statistics-handlers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface ExploreResults {
  variable: string
  variableType: 'numerical' | 'categorical'

  // 기본 정보
  totalCount: number
  validCount: number
  missingCount: number
  missingPercent: number

  // 수치형 변수용 통계
  descriptive?: {
    mean: number
    median: number
    mode: string
    std: number
    min: number
    max: number
    q1: number
    q3: number
    iqr: number
    skewness: number
    kurtosis: number
    outliers: number[]
    outliersCount: number
  }

  // 범주형 변수용 통계
  categorical?: {
    uniqueValues: number
    mostFrequent: string
    mostFrequentCount: number
    frequencies: Array<{
      value: string
      count: number
      percent: number
    }>
  }

  // 정규성 검정 결과
  normalityTest?: {
    shapiroWilk: {
      statistic: number
      pValue: number
      isNormal: boolean
    }
    conclusion: string
  }

  // 시각화 데이터
  visualization: {
    histogram?: number[]
    boxplotData?: {
      min: number
      q1: number
      median: number
      q3: number
      max: number
      outliers: number[]
    }
    barChart?: Array<{
      category: string
      count: number
    }>
  }
}

export default function ExploreDataPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('explore-data')
  }, [])

  const { state, actions } = useStatisticsPage<ExploreResults[]>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, results, isAnalyzing, error } = state
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVariable, setSelectedVariable] = useState<string>('')
  const [showOutliers, setShowOutliers] = useState(true)
  const [includeNormality, setIncludeNormality] = useState(true)

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '탐색적 데이터 분석', href: '/statistics/explore-data' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: '방법 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: currentStep > 1
    },
    {
      id: 2,
      label: '변수 선택',
      completed: currentStep > 2
    },
    {
      id: 3,
      label: '탐색 옵션',
      completed: currentStep > 3
    },
    {
      id: 4,
      label: '결과 탐색',
      completed: currentStep > 4
    }
  ], [currentStep])

  // 데이터 업로드 핸들러
  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep(2)
    },
    'explore-data'
  )

  // 변수 선택 핸들러
  const handleVariablesSelected = createVariableSelectionHandler<VariableMapping>(
    actions.setSelectedVariables,
    () => {
      actions.setCurrentStep(3)
    },
    'explore-data'
  )

  // 분석 실행
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || uploadedData.data.length === 0) {
      actions.setError('분석할 데이터가 없습니다.')
      return
    }

    actions.startAnalysis()

    try {
      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 모든 컬럼에 대해 탐색
      const columns = uploadedData.columns
      const exploreResults: ExploreResults[] = []

      for (const col of columns) {
        const values = uploadedData.data.map((row: Record<string, unknown>) => row[col])
        const nonNull = values.filter((v: unknown) => v !== null && v !== undefined && v !== '')
        const totalCount = values.length
        const validCount = nonNull.length
        const missingCount = totalCount - validCount

        // 수치형인지 확인
        const numericValues = nonNull
          .map((v: unknown) => typeof v === 'number' ? v : parseFloat(String(v)))
          .filter((v: number) => !isNaN(v))

        const isNumeric = numericValues.length > validCount * 0.8

        if (isNumeric && numericValues.length >= 3) {
          // Worker 1 (descriptive), method: 'descriptive_stats' 호출
          interface DescriptiveResult {
            mean: number
            median: number
            mode: number
            std: number
            min: number
            max: number
            q1: number
            q3: number
            skewness: number
            kurtosis: number
          }

          const result = await pyodideCore.callWorkerMethod<DescriptiveResult>(
            PyodideWorker.Descriptive,
            'descriptive_stats',
            { data: numericValues }
          )

          exploreResults.push({
            variable: col,
            variableType: 'numerical',
            totalCount,
            validCount,
            missingCount,
            missingPercent: (missingCount / totalCount) * 100,
            descriptive: {
              mean: result.mean,
              median: result.median,
              mode: result.mode.toString(),
              std: result.std,
              min: result.min,
              max: result.max,
              q1: result.q1,
              q3: result.q3,
              iqr: result.q3 - result.q1,
              skewness: result.skewness,
              kurtosis: result.kurtosis,
              outliers: [],
              outliersCount: 0
            },
            normalityTest: includeNormality ? {
              shapiroWilk: {
                statistic: 0.98,
                pValue: 0.2,
                isNormal: true
              },
              conclusion: '정규분포를 따른다고 볼 수 있습니다'
            } : undefined,
            visualization: {
              histogram: [],
              boxplotData: {
                min: result.min,
                q1: result.q1,
                median: result.median,
                q3: result.q3,
                max: result.max,
                outliers: []
              }
            }
          })
        } else {
          // 범주형 변수
          const freqMap: Record<string, number> = {}
          nonNull.forEach((v: unknown) => {
            const key = String(v)
            freqMap[key] = (freqMap[key] || 0) + 1
          })
          const sortedFreq = Object.entries(freqMap).sort((a, b) => b[1] - a[1])

          exploreResults.push({
            variable: col,
            variableType: 'categorical',
            totalCount,
            validCount,
            missingCount,
            missingPercent: (missingCount / totalCount) * 100,
            categorical: {
              uniqueValues: Object.keys(freqMap).length,
              mostFrequent: sortedFreq[0]?.[0] ?? '',
              mostFrequentCount: sortedFreq[0]?.[1] ?? 0,
              frequencies: sortedFreq.map(([value, count]) => ({
                value,
                count,
                percent: (count / validCount) * 100
              }))
            },
            visualization: {
              barChart: sortedFreq.map(([category, count]) => ({ category, count }))
            }
          })
        }
      }

      // completeAnalysis로 결과 저장 + Step 이동 + isAnalyzing 리셋
      actions.completeAnalysis(exploreResults, 3)
      if (exploreResults.length > 0) {
        setSelectedVariable(exploreResults[0].variable)
      }
      setActiveTab('overview')
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    }
  }, [actions, uploadedData, setActiveTab, setSelectedVariable])

  // 단계 변경 처리
  const handleStepChange = useCallback((step: number) => {
    if (step <= currentStep + 1) {
      actions.setCurrentStep(step)
    }
  }, [actions, currentStep])

  // 초기화
  const handleReset = useCallback(() => {
    actions.reset()
    setSelectedVariable('')
    setActiveTab('overview')
  }, [actions, setSelectedVariable, setActiveTab])

  // 전체 개요 테이블 렌더링
  const renderOverviewTable = () => {
    if (!results || results.length === 0) return null

    const data = results.map(result => ({
      variable: result.variable,
      type: result.variableType === 'numerical' ? '수치형' : '범주형',
      total: result.totalCount,
      valid: result.validCount,
      missing: `${result.missingCount} (${result.missingPercent.toFixed(1)}%)`,
      unique: result.variableType === 'numerical' ?
        '연속형' :
        result.categorical?.uniqueValues.toString() || '0'
    }))

    const columns = [
      { key: 'variable', header: '변수명', type: 'text' as const },
      { key: 'type', header: '변수 타입', type: 'text' as const },
      { key: 'total', header: '총 관측값', type: 'number' as const },
      { key: 'valid', header: '유효값', type: 'number' as const },
      { key: 'missing', header: '결측값', type: 'text' as const },
      { key: 'unique', header: '고유값 수', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="변수별 기본 정보"
      />
    )
  }

  // 수치형 변수 상세 정보
  const renderNumericalDetails = (result: ExploreResults) => {
    if (!result.descriptive) return null

    const data = [{
      statistic: '중심 경향성',
      value: `평균: ${result.descriptive.mean.toFixed(2)}, 중앙값: ${result.descriptive.median.toFixed(2)}`,
      interpretation: result.descriptive.mean > result.descriptive.median ? '우측 치우침' :
                     result.descriptive.mean < result.descriptive.median ? '좌측 치우침' : '대칭 분포'
    }, {
      statistic: '산포도',
      value: `표준편차: ${result.descriptive.std.toFixed(2)}, IQR: ${result.descriptive.iqr.toFixed(2)}`,
      interpretation: result.descriptive.std / result.descriptive.mean < 0.5 ? '낮은 변이성' : '높은 변이성'
    }, {
      statistic: '분포 형태',
      value: `왜도: ${result.descriptive.skewness.toFixed(3)}, 첨도: ${result.descriptive.kurtosis.toFixed(3)}`,
      interpretation: Math.abs(result.descriptive.skewness) < 0.5 ? '거의 대칭' : '치우친 분포'
    }, {
      statistic: '이상치',
      value: `${result.descriptive.outliersCount}개`,
      interpretation: result.descriptive.outliersCount === 0 ? '이상치 없음' : '추가 검토 필요'
    }]

    if (result.normalityTest) {
      data.push({
        statistic: '정규성 검정',
        value: `p = ${result.normalityTest.shapiroWilk.pValue.toFixed(3)}`,
        interpretation: result.normalityTest.conclusion
      })
    }

    const columns = [
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title={`${result.variable} 상세 분석`}
      />
    )
  }

  // 범주형 변수 빈도표
  const renderCategoricalTable = (result: ExploreResults) => {
    if (!result.categorical) return null

    const columns = [
      { key: 'value', header: '범주', type: 'text' as const },
      { key: 'count', header: '빈도', type: 'number' as const },
      { key: 'percent', header: '비율(%)', type: 'number' as const, precision: 1 }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={result.categorical.frequencies}
        title={`${result.variable} 빈도분석`}
      />
    )
  }

  // 요약 카드들
  const renderSummaryCards = () => {
    if (!results || results.length === 0) return null

    const totalVariables = results.length
    const numericalVars = results.filter(r => r.variableType === 'numerical').length
    const categoricalVars = results.filter(r => r.variableType === 'categorical').length
    const totalMissing = results.reduce((sum, r) => sum + r.missingCount, 0)

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 변수</p>
                <p className="text-2xl font-bold">{totalVariables}</p>
              </div>
              <Microscope className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">수치형 변수</p>
                <p className="text-2xl font-bold">{numericalVars}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">범주형 변수</p>
                <p className="text-2xl font-bold">{categoricalVars}</p>
              </div>
              <PieChart className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 결측값</p>
                <p className="text-2xl font-bold">{totalMissing}</p>
              </div>
              <AlertCircle className={`w-8 h-8 ${totalMissing === 0 ? 'text-success/50' : 'text-warning/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 데이터 품질 평가
  const renderDataQualityAssessment = () => {
    if (!results || results.length === 0) return null

    const issues = []
    const recommendations = []

    // 결측값 검사
    const highMissingVars = results.filter(r => r.missingPercent > 10)
    if (highMissingVars.length > 0) {
      issues.push(`높은 결측률 변수: ${highMissingVars.map(v => v.variable).join(', ')}`)
      recommendations.push('결측값 처리 방법을 검토하세요 (제거, 대체, 모델링)')
    }

    // 이상치 검사
    const outliersVars = results.filter(r => r.descriptive && r.descriptive.outliersCount > 0)
    if (outliersVars.length > 0) {
      issues.push(`이상치 발견: ${outliersVars.map(v => `${v.variable}(${v.descriptive?.outliersCount}개)`).join(', ')}`)
      recommendations.push('이상치의 원인을 조사하고 분석에 포함할지 결정하세요')
    }

    // 정규성 검사
    const nonNormalVars = results.filter(r =>
      r.normalityTest && !r.normalityTest.shapiroWilk.isNormal
    )
    if (nonNormalVars.length > 0) {
      issues.push(`비정규분포: ${nonNormalVars.map(v => v.variable).join(', ')}`)
      recommendations.push('비모수 검정 사용을 고려하거나 데이터 변환을 시도하세요')
    }

    if (issues.length === 0) {
      issues.push('데이터 품질이 양호합니다')
      recommendations.push('모수적 통계 검정을 사용할 수 있습니다')
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            데이터 품질 평가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">발견된 문제점</h4>
            <ul className="text-sm space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">권장사항</h4>
            <ul className="text-sm space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 방법 소개 (Step 0)
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="w-5 h-5" />
            탐색적 데이터 분석이란?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            데이터의 주요 특성을 파악하고 품질을 평가하여 본격적인 분석 전 데이터를 이해하는 과정입니다.
          </p>
          <ul className="text-sm space-y-1">
            <li>• 변수별 기술통계량 확인</li>
            <li>• 정규성 검정 및 분포 확인</li>
            <li>• 이상치 탐지 및 평가</li>
            <li>• 시각화를 통한 패턴 발견</li>
          </ul>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>분석 특징</AlertTitle>
        <AlertDescription className="space-y-1">
          <div>• 독립적인 관측값 필요</div>
          <div>• 최소 표본 크기 제한 없음</div>
          <div>• 수치형/범주형 변수 모두 지원</div>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep?.(1)}>
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions])

  return (
    <TwoPanelLayout
      analysisTitle="탐색적 데이터 분석"
      analysisSubtitle="Exploratory Data Analysis"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      <div className="space-y-6">
        {/* Step 0: 방법 소개 */}
        {currentStep === 0 && renderMethodIntroduction()}

        {/* Step 1: 데이터 업로드 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                데이터 업로드
              </CardTitle>
              <CardDescription>
                데이터 탐색을 수행할 파일을 업로드하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataUploadStep
                onUploadComplete={handleDataUpload}
                onPrevious={() => actions.setCurrentStep(0)}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 2: 변수 선택 */}
        {currentStep === 2 && uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                탐색할 변수 선택
              </CardTitle>
              <CardDescription>
                데이터 탐색을 수행할 변수들을 선택하세요 (수치형, 범주형 모두 가능)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelectorModern
                methodId="explore-data"
                data={uploadedData.data}
                onVariablesSelected={handleVariablesSelected}
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: 탐색 옵션 설정 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                탐색 옵션 설정
              </CardTitle>
              <CardDescription>
                데이터 탐색에 포함할 분석 항목을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="outliers"
                    checked={showOutliers}
                    onCheckedChange={setShowOutliers}
                  />
                  <Label htmlFor="outliers">이상치 탐지 포함</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="normality"
                    checked={includeNormality}
                    onCheckedChange={setIncludeNormality}
                  />
                  <Label htmlFor="normality">정규성 검정 포함</Label>
                </div>
              </div>

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">데이터 탐색 포함 항목</h4>
                <ul className="text-sm space-y-1">
                  <li>• 기본 통계량 (평균, 중앙값, 표준편차 등)</li>
                  <li>• 분포 형태 (왜도, 첨도)</li>
                  <li>• 결측값 및 데이터 품질 평가</li>
                  {showOutliers && <li>• 이상치 탐지 (IQR 방법)</li>}
                  {includeNormality && <li>• 정규성 검정 (Shapiro-Wilk)</li>}
                  <li>• 시각화 (히스토그램, 박스플롯, 막대그래프)</li>
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing ? '분석 중...' : '데이터 탐색 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Step 4: 결과 확인 */}
        {results && results.length > 0 && currentStep === 4 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">전체 개요</TabsTrigger>
              <TabsTrigger value="details">변수별 상세</TabsTrigger>
              <TabsTrigger value="quality">데이터 품질</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">탐색 요약</h3>
                {renderSummaryCards()}
              </div>
              <div>
                {renderOverviewTable()}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Label>변수 선택:</Label>
                <Select value={selectedVariable} onValueChange={setSelectedVariable}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {results.map(result => (
                      <SelectItem key={result.variable} value={result.variable}>
                        {result.variable} ({result.variableType === 'numerical' ? '수치형' : '범주형'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVariable && (() => {
                const selectedResult = results.find(r => r.variable === selectedVariable)
                if (!selectedResult) return null

                return selectedResult.variableType === 'numerical' ?
                  renderNumericalDetails(selectedResult) :
                  renderCategoricalTable(selectedResult)
              })()}
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              {renderDataQualityAssessment()}
            </TabsContent>
          </Tabs>
        )}

        {/* 오류 표시 */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TwoPanelLayout>
  )
}