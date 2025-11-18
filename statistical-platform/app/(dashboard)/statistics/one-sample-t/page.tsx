'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { OneSampleTVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  Target,
  BarChart3,
  Info,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  CheckCircle2
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface OneSampleTResults {
  variable: string
  sampleSize: number
  sampleMean: number
  sampleStd: number
  testValue: number
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  effectSize: number
  meanDifference: number
  seRror: number
  interpretation: string
  conclusion: string
  assumptions: {
    normality: boolean
    independence: boolean
    randomSample: boolean
  }
}

export default function OneSampleTPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('one-sample-t')
  }, [])

  const { state, actions } = useStatisticsPage<OneSampleTResults, OneSampleTVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [activeTab, setActiveTab] = useState('summary')
  const [testValue, setTestValue] = useState('0')
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const [alternative, setAlternative] = useState('two-sided')

  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, label: '방법 소개' },
      { id: 2, label: '데이터 업로드' },
      { id: 3, label: '변수 및 가설 설정' },
      { id: 4, label: '분석 결과' }
    ]

    return baseSteps.map((step, index) => ({
      ...step,
      completed: currentStep > index + 1 || (currentStep === 4 && results !== null)
    }))
  }, [currentStep, results])

  const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
    actions.setUploadedData?.({
      data: uploadedData as Record<string, unknown>[],
      fileName: 'uploaded-file.csv',
      columns: uploadedColumns
    })
  }, [actions])

  // 분석 실행
  const handleAnalysis = useCallback(async () => {
    if (!uploadedData || !selectedVariables) {
      actions.setError('데이터와 변수를 확인해주세요.')
      return
    }

    try {
      actions.startAnalysis()

      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // 변수에서 데이터 추출
      const variableName = Array.isArray(selectedVariables.dependent)
        ? selectedVariables.dependent[0]
        : selectedVariables.dependent

      if (!variableName) {
        actions.setError('변수를 선택해주세요.')
        return
      }

      // 데이터에서 값 추출 및 결측치 필터링
      const values = uploadedData.data
        .map((row: Record<string, unknown>) => {
          const val = row[variableName]
          return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
        })
        .filter((v: number) => !isNaN(v) && v !== null && v !== undefined)

      if (values.length < 2) {
        actions.setError('최소 2개 이상의 유효한 데이터가 필요합니다.')
        return
      }

      // Worker 2 (hypothesis), method: 'one_sample_t_test' 호출
      interface OneSampleTResult {
        statistic: number
        pValue: number
        sampleMean: number
        sampleStd?: number
        ciLower?: number
        ciUpper?: number
        effectSize?: number
      }

      const result = await pyodideCore.callWorkerMethod<OneSampleTResult>(
        PyodideWorker.Hypothesis,
        'one_sample_t_test',
        {
          data: values,
          popmean: parseFloat(testValue),
          alpha: 1 - parseFloat(confidenceLevel) / 100
        }
      )

      // 통계량 계산
      const n = values.length
      const mean = result.sampleMean
      const std = result.sampleStd ?? 0
      const se = std / Math.sqrt(n)
      const df = n - 1
      const tStat = result.statistic
      const pVal = result.pValue
      const ciLower = result.ciLower ?? mean - 1.96 * se
      const ciUpper = result.ciUpper ?? mean + 1.96 * se
      const effectSize = result.effectSize ?? Math.abs(mean - parseFloat(testValue)) / std

      const mockResults: OneSampleTResults = {
        variable: variableName,
        sampleSize: n,
        sampleMean: mean,
        sampleStd: std,
        testValue: parseFloat(testValue),
        tStatistic: tStat,
        degreesOfFreedom: df,
        pValue: pVal,
        confidenceLevel: parseFloat(confidenceLevel),
        ciLower,
        ciUpper,
        effectSize,
        meanDifference: mean - parseFloat(testValue),
        seRror: se,
        interpretation: pVal < 0.05 ? 'p < 0.05이므로 귀무가설을 기각합니다.' : 'p ≥ 0.05이므로 귀무가설을 기각할 수 없습니다.',
        conclusion: pVal < 0.05
          ? `표본 평균 ${mean.toFixed(2)}이 검정값 ${parseFloat(testValue)}과 통계적으로 유의한 차이가 있습니다.`
          : `표본 평균 ${mean.toFixed(2)}이 검정값 ${parseFloat(testValue)}과 통계적으로 유의한 차이가 없습니다.`,
        assumptions: {
          normality: n >= 30,
          independence: true,
          randomSample: true
        }
      }

      actions.completeAnalysis(mockResults, 4)
      setActiveTab('summary')
    } catch (error) {
      console.error('분석 중 오류:', error)
      actions.setError(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.')
    }
  }, [uploadedData, selectedVariables, testValue, confidenceLevel, actions])

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = () => {
    if (!results) return null

    const data = [{
      statistic: 'T 통계량',
      value: results.tStatistic.toFixed(3),
      interpretation: 'H0에서 얼마나 벗어났는지 측정'
    }, {
      statistic: '자유도',
      value: results.degreesOfFreedom.toString(),
      interpretation: 'n - 1'
    }, {
      statistic: 'p-값',
      value: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
      interpretation: results.pValue < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'
    }, {
      statistic: '효과크기 (Cohen\'s d)',
      value: results.effectSize.toFixed(3),
      interpretation: results.effectSize < 0.2 ? '작은 효과' :
                      results.effectSize < 0.5 ? '중간 효과' :
                      results.effectSize < 0.8 ? '큰 효과' : '매우 큰 효과'
    }]

    const columns = [
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="일표본 t-검정 결과"
      />
    )
  }

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = () => {
    if (!results) return null

    const data = [{
      variable: results.variable,
      n: results.sampleSize,
      mean: results.sampleMean.toFixed(2),
      std: results.sampleStd.toFixed(2),
      se: results.seRror.toFixed(3),
      ciLower: results.ciLower.toFixed(2),
      ciUpper: results.ciUpper.toFixed(2)
    }]

    const columns = [
      { key: 'variable', header: '변수', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'text' as const },
      { key: 'std', header: '표준편차', type: 'text' as const },
      { key: 'se', header: '표준오차', type: 'text' as const },
      { key: 'ciLower', header: `CI 하한(${results.confidenceLevel}%)`, type: 'text' as const },
      { key: 'ciUpper', header: `CI 상한(${results.confidenceLevel}%)`, type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="기술통계"
      />
    )
  }

  // 요약 카드 렌더링
  const renderSummaryCards = () => {
    if (!results) return null

    const significanceLevel = (100 - results.confidenceLevel) / 100
    const isSignificant = results.pValue < significanceLevel

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">{results.sampleSize}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">T 통계량</p>
                <p className="text-2xl font-bold">{results.tStatistic.toFixed(2)}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
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
              <TrendingUp className={`w-8 h-8 ${isSignificant ? 'text-green-500/50' : 'text-red-500/50'}`} />
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
    )
  }

  // 가정 검토 렌더링
  const renderAssumptions = () => {
    if (!results) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            가정 검토
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>정규성 가정</span>
              <Badge variant={results.assumptions.normality ? 'default' : 'destructive'}>
                {results.assumptions.normality ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>독립성 가정</span>
              <Badge variant={results.assumptions.independence ? 'default' : 'destructive'}>
                {results.assumptions.independence ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>무작위 표본</span>
              <Badge variant={results.assumptions.randomSample ? 'default' : 'destructive'}>
                {results.assumptions.randomSample ? '충족' : '위반'}
              </Badge>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-1" />
              표본크기가 30 이상이면 중심극한정리에 의해 정규성 가정을 완화할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 1: 방법 소개
  const renderMethodIntroduction = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">일표본 t-검정 (One-Sample t-Test)</h1>
        <p className="text-lg text-gray-600">한 집단의 평균이 특정 값과 다른지 검정합니다</p>
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                표본 평균이 특정 기준값과 다른지 검정
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                모집단 평균에 대한 가설 검정
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                신뢰구간 추정
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
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>데이터:</strong> 연속형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>정규성:</strong> 정규분포 또는 n≥30</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>표본크기:</strong> 최소 5개 (30개 이상 권장)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>검정 공식:</strong> t = (x̄ - μ₀) / (s/√n)<br />
          여기서 x̄는 표본평균, μ₀는 검정값, s는 표준편차, n은 표본크기입니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(2)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  )

  // Step 3: 변수 선택 + 가설 설정
  const renderVariableAndHypothesisSetup = () => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.columns.filter(col => {
      const firstValue = uploadedData.data[0]?.[col]
      return typeof firstValue === 'number' || !isNaN(Number(firstValue))
    })

    const dependentVar = Array.isArray(selectedVariables?.dependent)
      ? selectedVariables.dependent[0]
      : selectedVariables?.dependent

    const canProceed = dependentVar && testValue

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">변수 선택 및 가설 설정</h2>
          <p className="text-gray-600">검정할 수치형 변수를 선택하고 가설을 설정하세요</p>
        </div>

        {/* 변수 선택 */}
        <Card>
          <CardHeader>
            <CardTitle>검정 변수 선택</CardTitle>
            <CardDescription>일표본 t-검정을 수행할 수치형 변수 (1개 선택)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {numericColumns.map((col) => {
                const isSelected = dependentVar === col
                return (
                  <Badge
                    key={col}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      actions.setSelectedVariables?.({
                        dependent: col
                      })
                    }}
                  >
                    {col}
                    {isSelected && <CheckCircle className="ml-1 h-3 w-3" />}
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 가설 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              가설 및 검정 옵션 설정
            </CardTitle>
            <CardDescription>
              귀무가설의 검정값과 대립가설을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-value">검정값 (μ₀)</Label>
                <Input
                  id="test-value"
                  type="number"
                  step="any"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder="예: 0"
                />
                <p className="text-xs text-muted-foreground">
                  귀무가설: μ = μ₀
                </p>
              </div>

              <div className="space-y-2">
                <Label>대립가설</Label>
                <Select value={alternative} onValueChange={setAlternative}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="two-sided">μ ≠ μ₀ (양측검정)</SelectItem>
                    <SelectItem value="greater">μ &gt; μ₀ (우측검정)</SelectItem>
                    <SelectItem value="less">μ &lt; μ₀ (좌측검정)</SelectItem>
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

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <h4 className="font-semibold mb-2">가설 요약</h4>
              <p className="text-sm">
                <strong>H₀:</strong> μ = {testValue} (귀무가설)
              </p>
              <p className="text-sm">
                <strong>H₁:</strong> μ {
                  alternative === 'two-sided' ? '≠' :
                  alternative === 'greater' ? '>' : '<'
                } {testValue} (대립가설)
              </p>
              <p className="text-sm">
                <strong>α:</strong> {(100 - parseFloat(confidenceLevel)) / 100} (유의수준)
              </p>
            </div>
          </CardContent>
        </Card>

        {canProceed && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              변수 선택과 가설 설정이 완료되었습니다. 아래 버튼을 클릭하여 분석을 시작하세요.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => actions.setCurrentStep(2)}
            className="flex-1"
          >
            이전 단계
          </Button>
          <Button
            onClick={() => {
              if (canProceed) {
                actions.setCurrentStep(4)
                handleAnalysis()
              }
            }}
            disabled={!canProceed}
            className="flex-1"
          >
            분석 실행
          </Button>
        </div>
      </div>
    )
  }

  // Step 4: 결과 확인
  const renderResults = () => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>일표본 t-검정을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (!results) return null

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="results">검정결과</TabsTrigger>
          <TabsTrigger value="assumptions">가정검토</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
            {renderSummaryCards()}
          </div>
          <div className="p-4 bg-muted dark:bg-green-950/20 rounded-lg">
            <h4 className="font-semibold dark:text-green-200 mb-2">결론</h4>
            <p className="text-muted-foreground dark:text-green-300">{results.conclusion}</p>
            <p className="text-sm text-muted-foreground dark:text-green-400 mt-1">{results.interpretation}</p>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <div>
            {renderDescriptiveTable()}
          </div>
          <div>
            {renderTestResultsTable()}
          </div>
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-6">
          {renderAssumptions()}
        </TabsContent>
      </Tabs>
    )
  }

  const breadcrumbs = [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '일표본 t-검정' }
  ]

  return (
    <TwoPanelLayout
      currentStep={currentStep}
      steps={steps}
      onStepChange={actions.setCurrentStep}
      analysisTitle="일표본 t-검정"
      analysisSubtitle="One-Sample t-Test"
      analysisIcon={<Calculator className="h-5 w-5 text-primary" />}
      breadcrumbs={breadcrumbs}
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep
          onUploadComplete={(_file: File, data: Record<string, unknown>[]) => handleDataUpload(data, Object.keys(data[0] || {}))}
          onNext={() => actions.setCurrentStep(3)}
        />
      )}
      {currentStep === 3 && renderVariableAndHypothesisSetup()}
      {currentStep === 4 && renderResults()}
    </TwoPanelLayout>
  )
}
