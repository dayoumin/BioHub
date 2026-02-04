'use client'

import React, { useState, useCallback, useEffect } from 'react'

import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VariableSelectorBadges } from '@/components/variable-selection'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  GitBranch,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  Activity
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticalResultCard, StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { runTTest, type TTestResult } from '@/lib/statistics/t-test-helpers'

// Guide Components
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide, INTEGRATED_PAGE_METHOD_MAPS } from '@/hooks/use-analysis-guide'

interface TTestVariables {
  group?: string | string[]
  value?: string | string[]
  [key: string]: string | string[] | undefined
}

export default function TTestPage() {
  useEffect(() => {
    addToRecentStatistics('t-test')
  }, [])

  const { state, actions } = useStatisticsPage<TTestResult, TTestVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const [testType, setTestType] = useState<'one-sample' | 'two-sample' | 'paired' | ''>('')
  const [inputMode, setInputMode] = useState<'raw' | 'summary'>('raw')
  const [testValue, setTestValue] = useState<string>('0')
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  // 요약통계 입력값
  const [summaryOne, setSummaryOne] = useState({ mean: '', std: '', n: '' })
  const [summaryTwo, setSummaryTwo] = useState({ mean1: '', std1: '', n1: '', mean2: '', std2: '', n2: '', equalVar: true })
  const [summaryPaired, setSummaryPaired] = useState({ meanDiff: '', stdDiff: '', nPairs: '' })

  // testValue 유효성 검사
  const parsedTestValue = parseFloat(testValue)
  const isTestValueValid = !isNaN(parsedTestValue) && testValue.trim() !== ''

  const parsedSummary = (() => {
    const one = {
      mean: parseFloat(summaryOne.mean),
      std: parseFloat(summaryOne.std),
      n: parseInt(summaryOne.n, 10)
    }
    const two = {
      mean1: parseFloat(summaryTwo.mean1),
      std1: parseFloat(summaryTwo.std1),
      n1: parseInt(summaryTwo.n1, 10),
      mean2: parseFloat(summaryTwo.mean2),
      std2: parseFloat(summaryTwo.std2),
      n2: parseInt(summaryTwo.n2, 10),
      equalVar: summaryTwo.equalVar
    }
    const paired = {
      meanDiff: parseFloat(summaryPaired.meanDiff),
      stdDiff: parseFloat(summaryPaired.stdDiff),
      nPairs: parseInt(summaryPaired.nPairs, 10)
    }
    return { one, two, paired }
  })()

  const isSummaryValid = (() => {
    if (inputMode !== 'summary') return false
    if (testType === 'one-sample') {
      const { mean, std, n } = parsedSummary.one
      return Number.isFinite(mean) && Number.isFinite(std) && Number.isFinite(n) && n >= 2 && std >= 0 && isTestValueValid
    }
    if (testType === 'two-sample') {
      const { mean1, std1, n1, mean2, std2, n2 } = parsedSummary.two
      return (
        Number.isFinite(mean1) &&
        Number.isFinite(std1) &&
        Number.isFinite(n1) &&
        Number.isFinite(mean2) &&
        Number.isFinite(std2) &&
        Number.isFinite(n2) &&
        n1 >= 2 &&
        n2 >= 2 &&
        std1 >= 0 &&
        std2 >= 0
      )
    }
    if (testType === 'paired') {
      const { meanDiff, stdDiff, nPairs } = parsedSummary.paired
      return Number.isFinite(meanDiff) && Number.isFinite(stdDiff) && Number.isFinite(nPairs) && nPairs >= 2 && stdDiff >= 0
    }
    return false
  })()

  const steps = inputMode === 'raw'
    ? [
      { id: 1, label: '검정 유형 선택' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 선택' },
      { id: 4, label: '결과 확인' }
    ]
    : [
      { id: 1, label: '검정 유형 선택' },
      { id: 2, label: '요약통계 입력' },
      { id: 3, label: '결과 확인' }
    ]

  const testTypeInfo = {
    'one-sample': {
      title: '일표본 t-검정',
      subtitle: 'One-Sample t-test',
      description: '하나의 표본 평균이 특정 값과 같은지 검정',
      icon: <Activity className="w-5 h-5" />,
      example: '넙치의 평균 체중이 500g인지 검정',
      variables: ['value']
    },
    'two-sample': {
      title: '독립표본 t-검정',
      subtitle: 'Independent Samples t-test',
      description: '두 독립 집단의 평균이 같은지 검정',
      icon: <GitBranch className="w-5 h-5" />,
      example: '사료 A와 B의 성장률 비교',
      variables: ['group', 'value']
    },
    'paired': {
      title: '대응표본 t-검정',
      subtitle: 'Paired Samples t-test',
      description: '동일 대상의 전후 측정값 평균 차이 검정',
      icon: <ArrowUpDown className="w-5 h-5" />,
      example: '사료 교체 전후 체중 변화',
      variables: ['before', 'after']
    }
  }

  const handleMethodSelect = useCallback((type: 'one-sample' | 'two-sample' | 'paired') => {
    setTestType(type)
    actions.setCurrentStep(2)
  }, [actions])

  const handleInputModeChange = useCallback((mode: 'raw' | 'summary') => {
    setInputMode(mode)
    actions.reset()
    setAnalysisTimestamp(null)
    actions.setCurrentStep(2)
  }, [actions])

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(3)
  }, [actions])

  const handleVariableSelect = useCallback((varName: string, header: string) => {
    const current = selectedVariables || {} as TTestVariables
    actions.setSelectedVariables?.({ ...current, [varName]: header })
  }, [actions, selectedVariables])

  const handleAnalysis = useCallback(async () => {
    try {
      if (!actions.startAnalysis || !actions.completeAnalysis || !actions.setError) return
      actions.startAnalysis()

      // 검정 유형 검증
      if (!testType) throw new Error('검정 유형을 선택해주세요.')
      if (inputMode === 'summary' && !isSummaryValid) {
        throw new Error('요약통계 입력값을 확인해주세요.')
      }

      // PyodideCore 초기화
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 헬퍼 함수로 t-검정 실행
      const result = await runTTest(pyodideCore, {
        testType,
        inputMode,
        data: uploadedData?.data,
        valueColumn: selectedVariables?.value as string | undefined,
        groupColumn: selectedVariables?.group as string | undefined,
        beforeColumn: selectedVariables?.before as string | undefined,
        afterColumn: selectedVariables?.after as string | undefined,
        testValue: parsedTestValue,
        equalVar: inputMode === 'summary' ? parsedSummary.two.equalVar : true,
        summaryOne: testType === 'one-sample' ? {
          mean: parsedSummary.one.mean,
          std: parsedSummary.one.std,
          n: parsedSummary.one.n,
          popmean: parsedTestValue
        } : undefined,
        summaryTwo: testType === 'two-sample' ? {
          mean1: parsedSummary.two.mean1,
          std1: parsedSummary.two.std1,
          n1: parsedSummary.two.n1,
          mean2: parsedSummary.two.mean2,
          std2: parsedSummary.two.std2,
          n2: parsedSummary.two.n2,
          equalVar: parsedSummary.two.equalVar
        } : undefined,
        summaryPaired: testType === 'paired' ? {
          meanDiff: parsedSummary.paired.meanDiff,
          stdDiff: parsedSummary.paired.stdDiff,
          nPairs: parsedSummary.paired.nPairs
        } : undefined
      })

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(result, inputMode === 'raw' ? 4 : 3)
    } catch (err) {
      actions.setError?.(err instanceof Error ? err.message : '분석 실패')
    }
  }, [uploadedData, selectedVariables, testType, actions, inputMode, isSummaryValid, parsedSummary, parsedTestValue])

  const stepsWithCompleted = steps.map(step => ({
    ...step,
    completed: inputMode === 'raw'
      ? (step.id === 1 ? !!testType :
        step.id === 2 ? !!uploadedData :
        step.id === 3 ? !!selectedVariables :
        step.id === 4 ? !!results : false)
      : (step.id === 1 ? !!testType :
        step.id === 2 ? isSummaryValid || !!results :
        step.id === 3 ? !!results : false)
  }))

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: 't-검정' }
  ]

  // Guide components - useAnalysisGuide hook 사용 (dynamic based on testType)
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    getMethodId: () => testType ? INTEGRATED_PAGE_METHOD_MAPS.tTest[testType] : null
  })

  // TTestResult -> StatisticalResult 변환
  const convertToStatisticalResult = useCallback((testResult: TTestResult): StatisticalResult => {
    const testTypeLabels: Record<string, string> = {
      'one-sample': '일표본 t-검정',
      'two-sample': '독립표본 t-검정',
      'paired': '대응표본 t-검정'
    }

    const testTypeSubtitles: Record<string, string> = {
      'one-sample': 'One-Sample t-test',
      'two-sample': 'Independent Samples t-test',
      'paired': 'Paired Samples t-test'
    }

    const testTypeDescriptions: Record<string, string> = {
      'one-sample': '하나의 표본 평균이 특정 값과 같은지 검정',
      'two-sample': '두 독립 집단의 평균이 같은지 검정',
      'paired': '동일 대상의 전후 측정값 평균 차이 검정'
    }

    const assumptions = testResult.assumptions ? [
      {
        name: '정규성',
        description: 'Shapiro-Wilk 검정',
        pValue: testResult.assumptions.normality.pvalue,
        passed: testResult.assumptions.normality.passed,
        recommendation: !testResult.assumptions.normality.passed
          ? '비모수 검정(Mann-Whitney U 또는 Wilcoxon)을 고려하세요'
          : undefined
      },
      ...(testResult.assumptions.equal_variance ? [{
        name: '등분산성',
        description: "Levene's 검정",
        pValue: testResult.assumptions.equal_variance.pvalue,
        passed: testResult.assumptions.equal_variance.passed,
        recommendation: !testResult.assumptions.equal_variance.passed
          ? 'Welch t-검정을 사용하세요'
          : undefined
      }] : [])
    ] : undefined

    return {
      testName: testTypeLabels[testResult.type] || 't-검정',
      testType: testTypeSubtitles[testResult.type],
      description: testTypeDescriptions[testResult.type],
      statistic: testResult.statistic,
      statisticName: 't',
      df: testResult.df,
      pValue: testResult.pvalue,
      alpha: 0.05,
      effectSize: testResult.effect_size ? {
        value: testResult.effect_size.cohensD,
        type: 'cohensD'
      } : undefined,
      confidenceInterval: testResult.ciLower !== undefined && testResult.ciUpper !== undefined && testResult.mean_diff !== undefined ? {
        estimate: testResult.mean_diff,
        lower: testResult.ciLower,
        upper: testResult.ciUpper,
        level: 0.95
      } : undefined,
      assumptions,
      interpretation: testResult.pvalue < 0.05
        ? `검정 결과 p-value(${testResult.pvalue.toFixed(4)})가 유의수준 0.05보다 작아 귀무가설을 기각합니다. 두 집단(또는 조건) 간에 통계적으로 유의한 차이가 있습니다.${testResult.effect_size ? ` Cohen's d = ${testResult.effect_size.cohensD.toFixed(3)}로 ${testResult.effect_size.interpretation}를 나타냅니다.` : ''}`
        : `검정 결과 p-value(${testResult.pvalue.toFixed(4)})가 유의수준 0.05보다 커서 귀무가설을 기각할 수 없습니다. 두 집단(또는 조건) 간에 통계적으로 유의한 차이가 없습니다.`,
      recommendations: testResult.pvalue < 0.05 ? [
        '효과크기를 함께 보고하여 실질적 유의성을 평가하세요',
        '신뢰구간을 확인하여 추정치의 정밀도를 파악하세요'
      ] : [
        '표본 크기가 충분한지 검토하세요 (통계적 검정력 분석)',
        '효과크기가 작은 경우 더 큰 표본이 필요할 수 있습니다'
      ],
      sampleSize: testResult.sample_stats
        ? (testResult.sample_stats.group1?.n || 0) + (testResult.sample_stats.group2?.n || 0)
        : uploadedData?.data.length,
      groups: testResult.type === 'two-sample' ? 2 : undefined,
      variables: selectedVariables ? Object.values(selectedVariables).filter(Boolean) as string[] : undefined,
      timestamp: new Date()
    }
  }, [uploadedData, selectedVariables])

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={stepsWithCompleted}
      onStepChange={actions.setCurrentStep}
      analysisTitle="t-검정"
      analysisSubtitle="t-test"
      analysisIcon={<Activity className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {/* Step 1: 검정 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">t-검정 방법 선택</h2>
            <p className="text-sm text-muted-foreground">
              연구 설계와 데이터 특성에 맞는 t-검정 방법을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(testTypeInfo).map(([key, info]) => (
              <PurposeCard
                key={key}
                icon={info.icon}
                title={info.title}
                subtitle={info.subtitle}
                description={info.description}
                examples={info.example}
                selected={testType === key}
                onClick={() => handleMethodSelect(key as 'one-sample' | 'two-sample' | 'paired')}
              />
            ))}
          </div>

          {testType === 'one-sample' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">검정 값 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="testValue">비교할 기준 값</Label>
                <Input
                  id="testValue"
                  type="number"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="예: 500"
                  className="mt-2"
                />
              </CardContent>
            </Card>
          )}

          {/* Analysis Guide Panel - testType 선택 시 표시 */}
          {methodMetadata && (
            <AnalysisGuidePanel
              method={methodMetadata}
              sections={['variables', 'assumptions', 'dataFormat', 'sampleData']}
              defaultExpanded={['variables']}
            />
          )}

          {/* Assumption Checklist - testType 선택 시 표시 */}
          {assumptionItems.length > 0 && (
            <AssumptionChecklist
              assumptions={assumptionItems}
              showProgress={true}
              collapsible={true}
              title="분석 전 가정 확인"
              description={`${methodMetadata?.name || 't-검정'}의 기본 가정을 확인해주세요.`}
            />
          )}
        </div>
      )}

      {/* Step 2: 데이터 업로드 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">{inputMode === 'raw' ? '데이터 업로드' : '요약통계 입력'}</h2>
            <p className="text-sm text-muted-foreground">
              {inputMode === 'raw'
                ? 't-검정할 데이터 파일을 업로드하세요'
                : '평균/표준편차/N만으로 t-검정을 수행합니다'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">입력 방식</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={inputMode} onValueChange={(v) => handleInputModeChange(v as 'raw' | 'summary')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="raw">원시데이터</TabsTrigger>
                  <TabsTrigger value="summary">요약통계</TabsTrigger>
                </TabsList>

                <TabsContent value="raw" className="mt-4">
                  <DataUploadStep onUploadComplete={handleDataUpload} />
                </TabsContent>

                <TabsContent value="summary" className="mt-4 space-y-4">
                  {testType === 'one-sample' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">일표본 요약통계</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>평균 (Mean)</Label>
                          <Input
                            value={summaryOne.mean}
                            onChange={(e) => setSummaryOne(prev => ({ ...prev, mean: e.target.value }))}
                            placeholder="예: 50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>표준편차 (SD)</Label>
                          <Input
                            value={summaryOne.std}
                            onChange={(e) => setSummaryOne(prev => ({ ...prev, std: e.target.value }))}
                            placeholder="예: 10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>표본수 (N)</Label>
                          <Input
                            value={summaryOne.n}
                            onChange={(e) => setSummaryOne(prev => ({ ...prev, n: e.target.value }))}
                            placeholder="예: 30"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {testType === 'two-sample' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">독립표본 요약통계</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>집단 1 평균</Label>
                            <Input value={summaryTwo.mean1} onChange={(e) => setSummaryTwo(prev => ({ ...prev, mean1: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>집단 1 SD</Label>
                            <Input value={summaryTwo.std1} onChange={(e) => setSummaryTwo(prev => ({ ...prev, std1: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>집단 1 N</Label>
                            <Input value={summaryTwo.n1} onChange={(e) => setSummaryTwo(prev => ({ ...prev, n1: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>집단 2 평균</Label>
                            <Input value={summaryTwo.mean2} onChange={(e) => setSummaryTwo(prev => ({ ...prev, mean2: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>집단 2 SD</Label>
                            <Input value={summaryTwo.std2} onChange={(e) => setSummaryTwo(prev => ({ ...prev, std2: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>집단 2 N</Label>
                            <Input value={summaryTwo.n2} onChange={(e) => setSummaryTwo(prev => ({ ...prev, n2: e.target.value }))} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="equalVar"
                            checked={summaryTwo.equalVar}
                            onCheckedChange={(checked) => setSummaryTwo(prev => ({ ...prev, equalVar: checked }))}
                          />
                          <Label htmlFor="equalVar">등분산 가정 (Student t)</Label>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {testType === 'paired' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">대응표본 요약통계 (차이값 기반)</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>평균 차이 (Mean diff)</Label>
                          <Input value={summaryPaired.meanDiff} onChange={(e) => setSummaryPaired(prev => ({ ...prev, meanDiff: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>차이의 SD</Label>
                          <Input value={summaryPaired.stdDiff} onChange={(e) => setSummaryPaired(prev => ({ ...prev, stdDiff: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>쌍의 수 (N)</Label>
                          <Input value={summaryPaired.nPairs} onChange={(e) => setSummaryPaired(prev => ({ ...prev, nPairs: e.target.value }))} />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-center">
                    <Button onClick={handleAnalysis} disabled={isAnalyzing || !isSummaryValid} size="lg">
                      {isAnalyzing ? '분석 중...' : 't-검정 실행'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: 변수 선택 */}
      {inputMode === 'raw' && currentStep === 3 && uploadedData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">변수 선택</h2>
            <p className="text-sm text-muted-foreground">
              분석에 사용할 변수를 선택하세요
            </p>
          </div>

          {testType === 'one-sample' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">측정 변수 (연속형)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {uploadedData.columns.map((header: string) => {
                    const isSelected = selectedVariables?.value === header

                    return (
                      <Badge
                        key={header}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer max-w-[200px] truncate"
                        title={header}
                        onClick={() => handleVariableSelect('value', header)}
                      >
                        {header}
                        {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {testType === 'two-sample' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">집단 변수 (범주형)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.group === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('group', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">측정 변수 (연속형)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.value === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('value', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {testType === 'paired' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">전 측정값 (Before)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.before === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('before', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">후 측정값 (After)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {uploadedData.columns.map((header: string) => {
                      const isSelected = selectedVariables?.after === header

                      return (
                        <Badge
                          key={header}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer max-w-[200px] truncate"
                          title={header}
                          onClick={() => handleVariableSelect('after', header)}
                        >
                          {header}
                          {isSelected && <CheckCircle className="ml-1 h-3 w-3 flex-shrink-0" />}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <Button
              onClick={handleAnalysis}
              disabled={
                isAnalyzing ||
                (testType === 'one-sample' && (!selectedVariables?.value || !isTestValueValid)) ||
                (testType === 'two-sample' && (!selectedVariables?.group || !selectedVariables?.value)) ||
                (testType === 'paired' && (!selectedVariables?.before || !selectedVariables?.after))
              }
              size="lg"
            >
              {isAnalyzing ? '분석 중...' : 't-검정 실행'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 결과 확인 */}
      {((inputMode === 'raw' && currentStep === 4) || (inputMode === 'summary' && currentStep === 3)) && results && (
        <div className="space-y-6">
          <ResultContextHeader
            analysisType={testType === 'one-sample' ? '일표본 t-검정' : testType === 'two-sample' ? '독립표본 t-검정' : '대응표본 t-검정'}
            analysisSubtitle={testType === 'one-sample' ? 'One-Sample t-test' : testType === 'two-sample' ? 'Independent Samples t-test' : 'Paired Samples t-test'}
            fileName={inputMode === 'raw' ? uploadedData?.fileName : '요약통계 입력'}
            variables={inputMode === 'raw'
              ? (testType === 'one-sample'
                ? [selectedVariables?.value as string].filter(Boolean)
                : testType === 'two-sample'
                  ? [selectedVariables?.group as string, selectedVariables?.value as string].filter(Boolean)
                  : [selectedVariables?.before as string, selectedVariables?.after as string].filter(Boolean))
              : (testType === 'one-sample'
                ? ['mean', 'sd', 'n']
                : testType === 'two-sample'
                  ? ['mean1', 'sd1', 'n1', 'mean2', 'sd2', 'n2']
                  : ['meanDiff', 'sdDiff', 'n'])
            }
            sampleSize={inputMode === 'raw' ? uploadedData?.data?.length : undefined}
            timestamp={analysisTimestamp ?? undefined}
          />
          <StatisticalResultCard
            result={convertToStatisticalResult(results)}
            showAssumptions={!!results.assumptions}
            showEffectSize={!!results.effect_size}
            showConfidenceInterval={results.ciLower !== undefined && results.ciUpper !== undefined}
            showInterpretation={true}
            showActions={true}
            expandable={false}
            onRerun={() => actions.setCurrentStep(inputMode === 'raw' ? 3 : 2)}
          />
        </div>
      )}
    </TwoPanelLayout>
  )
}
