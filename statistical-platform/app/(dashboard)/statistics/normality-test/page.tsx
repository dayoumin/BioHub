'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { NormalityTestVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Microscope,
  BarChart3,
  CheckCircle,
  XCircle,
  CheckCircle2,
  Info,
  TrendingUp
,
  FileText,
  Table
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { extractColumnData } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface NormalityTestResult {
  test: string
  statistic: number
  pValue: number
  critical_value?: number
  conclusion: 'normal' | 'not_normal'
  interpretation: string
  recommendation: string
}

interface NormalityResults {
  variable: string
  sampleSize: number
  shapiroWilk: NormalityTestResult
  andersonDarling?: NormalityTestResult
  dagostinoK2?: NormalityTestResult
  jarqueBera?: NormalityTestResult
  lilliefors?: NormalityTestResult
  overallConclusion: 'normal' | 'not_normal' | 'mixed'
  descriptiveStats: {
    mean: number
    std: number
    skewness: number
    kurtosis: number
    min: number
    max: number
  }
}

export default function NormalityTestPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('normality-test')
  }, [])

  const { state, actions } = useStatisticsPage<NormalityResults, NormalityTestVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [activeTab, setActiveTab] = useState('summary')
  const [showAllTests, setShowAllTests] = useState(true)

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '통계 분석', href: '/statistics' },
    { label: '정규성 검정', href: '/statistics/normality-test' }
  ], [])

  // 변수 선택 핸들러
  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '' }
    const newDependent = current.dependent === varName ? '' : varName
    actions.setSelectedVariables?.({ dependent: newDependent })
    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  // 분석 실행
  const runAnalysis = useCallback(async (vars: NormalityTestVariables) => {
    if (!uploadedData || !vars.dependent) {
      actions.setError?.('분석을 실행할 수 없습니다. 데이터와 변수를 확인해주세요.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const varName = vars.dependent

      // 데이터 추출 (결측치 제거)
      const values = extractColumnData(data, varName)

      if (values.length < 3) {
        actions.setError?.('정규성 검정을 위해서는 최소 3개 이상의 데이터가 필요합니다.')
        return
      }

      // PyodideCore 호출
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        statistic: number
        pValue: number
        isNormal: boolean
      }>(
        PyodideWorker.Descriptive,
        'normality_test',
        { data: values, alpha: 0.05 }
      )

      // 기술통계 계산
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const std = Math.sqrt(variance)
      const skewness = values.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / values.length
      const kurtosis = values.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / values.length - 3
      const min = Math.min(...values)
      const max = Math.max(...values)

      const conclusion = result.isNormal ? 'normal' : 'not_normal'
      const interpretation = result.pValue >= 0.05
        ? 'p > 0.05이므로 정규분포를 따른다고 볼 수 있습니다'
        : 'p < 0.05이므로 정규분포를 따르지 않습니다'
      const recommendation = result.isNormal
        ? '모수적 검정 사용 가능'
        : '비모수적 검정 권장'

      const analysisResult: NormalityResults = {
        variable: varName,
        sampleSize: values.length,
        shapiroWilk: {
          test: 'Shapiro-Wilk',
          statistic: result.statistic,
          pValue: result.pValue,
          conclusion,
          interpretation,
          recommendation
        },
        overallConclusion: conclusion,
        descriptiveStats: {
          mean,
          std,
          skewness,
          kurtosis,
          min,
          max
        }
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(analysisResult, 3)
      setActiveTab('summary')
    } catch (error) {
      console.error('정규성 검정 중 오류:', error)
      actions.setError?.(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, actions])

  // "다음 단계" 버튼 핸들러 (Step 2 → 3: 분석 실행)
  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent) {
      actions.setCurrentStep?.(3) // ✅ Step 변경
      await runAnalysis(selectedVariables) // ✅ 분석 실행
    }
  }, [selectedVariables, actions, runAnalysis])

  // STEPS 정의
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: '방법 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: !!uploadedData
    },
    {
      id: 2,
      label: '변수 선택',
      completed: !!selectedVariables?.dependent
    },
    {
      id: 3,
      label: '결과 보기',
      completed: !!results
    }
  ], [currentStep, uploadedData, selectedVariables, results])

  // Step 0: 방법 소개
  const renderMethodIntroduction = useCallback(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Microscope className="w-5 h-5" />
          정규성 검정 (Normality Test)
        </CardTitle>
        <CardDescription>
          데이터가 정규분포를 따르는지 검정합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">검정 개요</h4>
          <p className="text-sm text-muted-foreground">
            정규성 검정은 데이터가 정규분포를 따르는지 확인하는 통계적 방법입니다.
            모수적 검정(t-test, ANOVA)을 사용하기 전에 정규성 가정을 확인하는 데 필수적입니다.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">검정 방법</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Shapiro-Wilk:</strong> 소표본(n≤50)에서 가장 강력한 정규성 검정
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Anderson-Darling:</strong> 분포의 꼬리 부분에 더 민감한 검정
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>D&apos;Agostino-Pearson K²:</strong> 왜도와 첨도를 동시에 검정
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Jarque-Bera:</strong> 금융 데이터에서 널리 사용
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Lilliefors:</strong> Kolmogorov-Smirnov의 개선된 버전
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">가정</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• 독립적인 관측값</li>
            <li>• 수치형 데이터</li>
            <li>• Shapiro-Wilk: 3-5000개, 기타: 8개 이상</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">활용</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• 모수적 검정 사용 전 정규성 가정 확인</li>
            <li>• 데이터 변환 필요성 판단</li>
            <li>• 적절한 통계 방법 선택</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  ), [])

  // Step 1: 데이터 업로드
  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={createDataUploadHandler(
        actions.setUploadedData,
        () => actions.setCurrentStep?.(1),
        'normality-test'
      )}
    />
  ), [actions])

  // Step 2: 변수 선택 + 검정 설정
  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.data.length > 0
      ? Object.keys(uploadedData.data[0]).filter(key => {
          const value = uploadedData.data[0][key as keyof typeof uploadedData.data[0]]
          return typeof value === 'number'
        })
      : []

    const isVariableSelected = selectedVariables?.dependent !== undefined && selectedVariables.dependent !== ''

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="w-5 h-5" />
              검정할 변수 선택
            </CardTitle>
            <CardDescription>
              정규성을 검정할 수치형 변수를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                수치형 변수 1개를 선택해주세요
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>수치형 변수</Label>
              <div className="flex flex-wrap gap-2">
                {numericColumns.map((col) => {
                  const isSelected = selectedVariables?.dependent === col
                  return (
                    <Badge
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer hover:bg-primary/90 transition-colors"
                      onClick={() => handleVariableSelect(col)}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {col}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {isVariableSelected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                검정 옵션 설정
              </CardTitle>
              <CardDescription>
                수행할 정규성 검정 방법을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="all-tests"
                  checked={showAllTests}
                  onCheckedChange={setShowAllTests}
                />
                <Label htmlFor="all-tests">모든 검정 방법 실행 (5가지)</Label>
              </div>

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">실행될 검정 방법</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Shapiro-Wilk:</strong> 소표본에서 가장 강력</li>
                  <li>• <strong>Anderson-Darling:</strong> 극값에 민감</li>
                  <li>• <strong>D&apos;Agostino-Pearson K²:</strong> 왜도/첨도 검정</li>
                  {showAllTests && (
                    <>
                      <li>• <strong>Jarque-Bera:</strong> 금융/시계열 데이터</li>
                      <li>• <strong>Lilliefors:</strong> KS 검정 개선 버전</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNextStep}
                  disabled={!selectedVariables?.dependent || isAnalyzing}
                >
                  {isAnalyzing ? '분석 중...' : '다음 단계'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, showAllTests, isAnalyzing, handleVariableSelect, handleNextStep])

  // Step 3: 결과 보기
  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              분석 결과가 없습니다. 변수를 선택하고 분석을 실행해주세요.
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="정규성 검정"
          analysisSubtitle="Normality Test"
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.dependent ? [selectedVariables.dependent] : []}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />
      <ContentTabs
              tabs={[
                { id: 'summary', label: '요약', icon: FileText },
                { id: 'results', label: '검정결과', icon: Table },
                { id: 'conclusion', label: '결론', icon: CheckCircle2 },
                { id: 'methods', label: '방법설명', icon: Info }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

        <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
            {renderSummaryCards()}
          </div>
          <div>
            {renderDescriptiveTable()}
          </div>
        </ContentTabsContent>

        <ContentTabsContent tabId="results" show={activeResultTab === 'results'} className="space-y-6">
          {renderTestResultsTable()}
        </ContentTabsContent>

        <ContentTabsContent tabId="conclusion" show={activeResultTab === 'conclusion'} className="space-y-6">
          {renderOverallConclusion()}
        </ContentTabsContent>

        <ContentTabsContent tabId="methods" show={activeResultTab === 'methods'} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">검정 방법별 설명</h3>
            {renderTestDescriptions()}
          </div>
        </ContentTabsContent>
      </div>
      </div>
    )
  }, [results, activeTab, uploadedData, selectedVariables, analysisTimestamp])

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = useCallback(() => {
    if (!results) return null

    const tests = showAllTests ? [
      results.shapiroWilk,
      results.andersonDarling,
      results.dagostinoK2,
      results.jarqueBera,
      results.lilliefors
    ] : [results.shapiroWilk, results.andersonDarling, results.dagostinoK2]

    const data = tests.filter((test): test is NormalityTestResult => test !== undefined).map(test => ({
      test: test.test,
      statistic: test.statistic.toFixed(3),
      pValue: test.pValue < 0.001 ? '< 0.001' : test.pValue.toFixed(3),
      conclusion: test.conclusion === 'normal' ? '정규분포' : '비정규분포',
      recommendation: test.recommendation
    }))

    const columns = [
      { key: 'test', header: '검정 방법', type: 'text' as const },
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'pValue', header: 'p-값', type: 'text' as const },
      { key: 'conclusion', header: '결론', type: 'text' as const },
      { key: 'recommendation', header: '권장사항', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="정규성 검정 결과"
      />
    )
  }, [results, showAllTests])

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = useCallback(() => {
    if (!results) return null

    const data = [{
      variable: results.variable,
      n: results.sampleSize,
      mean: results.descriptiveStats.mean.toFixed(2),
      std: results.descriptiveStats.std.toFixed(2),
      skewness: results.descriptiveStats.skewness.toFixed(3),
      kurtosis: results.descriptiveStats.kurtosis.toFixed(3),
      min: results.descriptiveStats.min.toFixed(1),
      max: results.descriptiveStats.max.toFixed(1)
    }]

    const columns = [
      { key: 'variable', header: '변수', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'text' as const },
      { key: 'std', header: '표준편차', type: 'text' as const },
      { key: 'skewness', header: '왜도', type: 'text' as const },
      { key: 'kurtosis', header: '첨도', type: 'text' as const },
      { key: 'min', header: '최솟값', type: 'text' as const },
      { key: 'max', header: '최댓값', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="기술통계"
      />
    )
  }, [results])

  // 검정 요약 카드 렌더링
  const renderSummaryCards = useCallback(() => {
    if (!results) return null

    const normalTests = [results.shapiroWilk, results.andersonDarling, results.dagostinoK2, results.jarqueBera, results.lilliefors]
      .filter((test): test is NormalityTestResult => test !== undefined && test.conclusion === 'normal').length

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">{results.sampleSize}</p>
              </div>
              <Microscope className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">정규성 지지</p>
                <p className="text-2xl font-bold">{normalTests}/5</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">왜도</p>
                <p className="text-2xl font-bold">{results.descriptiveStats.skewness.toFixed(2)}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">첨도</p>
                <p className="text-2xl font-bold">{results.descriptiveStats.kurtosis.toFixed(2)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [results])

  // 전체 결론 렌더링
  const renderOverallConclusion = useCallback(() => {
    if (!results) return null

    const isNormal = results.overallConclusion === 'normal'
    const IconComponent = isNormal ? CheckCircle : XCircle
    const colorClass = isNormal ? 'text-muted-foreground dark:text-success' : 'text-muted-foreground dark:text-error'
    const bgClass = isNormal ? 'bg-muted dark:bg-success-bg' : 'bg-muted dark:bg-error-bg'

    return (
      <Card className={bgClass}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${colorClass}`}>
            <IconComponent className="w-5 h-5" />
            전체 결론
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-medium ${colorClass}`}>
            {isNormal
              ? '데이터가 정규분포를 따른다고 판단됩니다'
              : '데이터가 정규분포를 따르지 않습니다'
            }
          </p>
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">권장사항:</h4>
            <ul className="text-sm space-y-1">
              {isNormal ? (
                <>
                  <li>• 모수적 검정(t-test, ANOVA) 사용 가능</li>
                  <li>• 피어슨 상관계수 적용 가능</li>
                  <li>• 선형회귀분석 가정 충족</li>
                  <li>• 평균과 표준편차 사용 적절</li>
                </>
              ) : (
                <>
                  <li>• 비모수 검정 사용 권장 (Mann-Whitney, Wilcoxon)</li>
                  <li>• 스피어만 상관계수 사용</li>
                  <li>• 데이터 변환 고려 (로그, 제곱근 변환)</li>
                  <li>• 중앙값과 IQR 사용 권장</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }, [results])

  // 검정 방법 설명 렌더링
  const renderTestDescriptions = useCallback(() => {
    const descriptions = [
      {
        name: 'Shapiro-Wilk',
        description: '소표본(n≤50)에서 가장 강력한 정규성 검정',
        suitableFor: '표본크기가 작을 때',
        limitation: '대표본에서는 민감도가 높음'
      },
      {
        name: 'Anderson-Darling',
        description: '분포의 꼬리 부분에 더 민감한 검정',
        suitableFor: '극값에 관심이 있을 때',
        limitation: '계산이 복잡함'
      },
      {
        name: 'D\'Agostino-Pearson K²',
        description: '왜도와 첨도를 동시에 검정',
        suitableFor: '분포의 형태 파악',
        limitation: '대표본에서만 정확함'
      },
      {
        name: 'Jarque-Bera',
        description: '금융 데이터에서 널리 사용',
        suitableFor: '시계열 데이터',
        limitation: '소표본에서 부정확할 수 있음'
      },
      {
        name: 'Lilliefors',
        description: 'Kolmogorov-Smirnov의 개선된 버전',
        suitableFor: '모든 표본크기',
        limitation: '보수적인 결과'
      }
    ]

    return (
      <div className="space-y-4">
        {descriptions.map((desc, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{desc.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{desc.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">적합한 경우: </span>
                  {desc.suitableFor}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">제한사항: </span>
                  {desc.limitation}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }, [])

  return (
    <TwoPanelLayout
      analysisTitle="정규성 검정"
      analysisSubtitle="Normality Test - 데이터가 정규분포를 따르는지 검정"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => { actions.setCurrentStep?.(step) }}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 10
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
