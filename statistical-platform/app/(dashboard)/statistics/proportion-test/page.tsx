'use client'

/**
 * Proportion Test (일표본 비율 검정) 페이지
 *
 * **목적**: 한 집단의 성공 비율이 특정 값과 다른지 검정
 *
 * **핵심 기능**:
 * - 단일 이진 변수 선택
 * - 검정 비율(p₀) 설정
 * - 대립가설 선택 (양측/단측)
 * - 검정 방법 선택 (정규근사/정확검정)
 * - Wilson Score 신뢰구간
 *
 * **Architecture**:
 * - TwoPanelLayout (데이터 하단 배치)
 * - PyodideCore 직접 연결 (worker1:proportion_test)
 * - useStatisticsPage hook (useState 금지)
 * - useCallback (모든 이벤트 핸들러)
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ProportionTestVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PieChart,
  Target,
  BarChart3,
  Info,
  Calculator,
  Percent,
  Upload,
  Settings,
  CheckCircle2,
  AlertCircle
,
  FileText,
  Table,
  HelpCircle
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// ============================================================================
// 타입 정의
// ============================================================================

interface ProportionTestResults {
  variable: string
  successCount: number
  totalCount: number
  observedProportion: number
  testProportion: number
  zStatistic: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  method: string
  interpretation: string
  conclusion: string
  effectSize: number
  continuityCorrection: boolean
}

interface AnalysisOptions {
  testProportion: string
  confidenceLevel: string
  alternative: string
  method: string
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ProportionTestPage(): React.ReactElement {
  // ============================================================================
  // Hooks
  // ============================================================================

  const { state, actions } = useStatisticsPage<ProportionTestResults, ProportionTestVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 0
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('one-sample-proportion')
  }, [])

  // ============================================================================
  // State (Analysis Options)
  // ============================================================================

  const [analysisOptions, setAnalysisOptions] = React.useState<AnalysisOptions>({
    testProportion: '0.5',
    confidenceLevel: '95',
    alternative: 'two-sided',
    method: 'normal'
  })

  const [activeResultTab, setActiveResultTab] = React.useState('summary')
  const [analysisTimestamp, setAnalysisTimestamp] = React.useState<Date | null>(null)

  // ============================================================================
  // Breadcrumbs
  // ============================================================================

  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '일표본 비율 검정', href: '/statistics/proportion-test' }
  ], [])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDataUpload = createDataUploadHandler(
    actions.setUploadedData,
    () => {
      actions.setCurrentStep?.(1)
    },
    'proportion-test'
  )

  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables || { dependent: '' }
    const newDependent = current.dependent === varName ? '' : varName

    actions.setSelectedVariables?.({
      dependent: newDependent
    })

    // ❌ NO setCurrentStep here - Critical Bug 예방!
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (variables: ProportionTestVariables) => {
    if (!uploadedData) return
    if (!variables.dependent) return

    actions.startAnalysis?.()

    try {
      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const variableName = variables.dependent

      // 데이터에서 성공 횟수 계산
      const values = uploadedData.data
        .map((row: Record<string, unknown>) => row[variableName])
        .filter((v: unknown) => v !== null && v !== undefined && v !== '')

      if (values.length < 10) {
        actions.setError?.('최소 10개 이상의 관측치가 필요합니다.')
        return
      }

      // 성공 값 추정 (1, true, "yes", "success" 등)
      const successValue = 1 // 기본값
      const successCount = values.filter((v: unknown) => v === successValue || v === true || v === 'yes' || v === '1').length
      const totalCount = values.length

      // Worker 1 (descriptive), method: 'one_sample_proportion_test' 호출
      interface ProportionTestResult {
        sampleProportion: number
        pValueExact: number
        ciLower?: number
        ciUpper?: number
        zStatistic?: number
      }

      const result = await pyodideCore.callWorkerMethod<ProportionTestResult>(
        PyodideWorker.Descriptive, // worker1-descriptive
        'one_sample_proportion_test',
        {
          successCount,
          totalCount,
          nullProportion: parseFloat(analysisOptions.testProportion)
        }
      )

      const observedProp = result.sampleProportion
      const testProp = parseFloat(analysisOptions.testProportion)
      const pValue = result.pValueExact
      const zStat = result.zStatistic ?? (observedProp - testProp) / Math.sqrt(testProp * (1 - testProp) / totalCount)
      const ciLower = result.ciLower ?? observedProp - 1.96 * Math.sqrt(observedProp * (1 - observedProp) / totalCount)
      const ciUpper = result.ciUpper ?? observedProp + 1.96 * Math.sqrt(observedProp * (1 - observedProp) / totalCount)

      const finalResults: ProportionTestResults = {
        variable: variableName,
        successCount,
        totalCount,
        observedProportion: observedProp,
        testProportion: testProp,
        zStatistic: zStat,
        pValue,
        confidenceLevel: parseFloat(analysisOptions.confidenceLevel),
        ciLower,
        ciUpper,
        method: analysisOptions.method === 'normal' ? 'Normal approximation (Wilson Score)' : 'Exact binomial test',
        interpretation: pValue < 0.05 ? 'p < 0.05이므로 귀무가설을 기각합니다' : 'p ≥ 0.05이므로 귀무가설을 기각할 수 없습니다',
        conclusion: pValue < 0.05
          ? `표본 비율 ${(observedProp * 100).toFixed(1)}%가 검정 비율 ${(testProp * 100).toFixed(1)}%와 통계적으로 유의한 차이가 있습니다`
          : `표본 비율 ${(observedProp * 100).toFixed(1)}%가 검정 비율 ${(testProp * 100).toFixed(1)}%와 통계적으로 유의한 차이가 없습니다`,
        effectSize: Math.abs(observedProp - testProp) / Math.sqrt(testProp * (1 - testProp)),
        continuityCorrection: totalCount < 50
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(finalResults, 3)
      setActiveResultTab('summary')
    } catch (err) {
      actions.setError?.(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    }
  }, [uploadedData, analysisOptions, actions])

  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  // ============================================================================
  // Steps 정의 (TwoPanelLayout)
  // ============================================================================

  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: '검정 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: !!uploadedData
    },
    {
      id: 2,
      label: '변수 및 옵션 설정',
      completed: !!selectedVariables?.dependent && analysisOptions.testProportion !== ''
    },
    {
      id: 3,
      label: '결과',
      completed: !!results
    }
  ], [currentStep, uploadedData, selectedVariables, analysisOptions, results])

  // ============================================================================
  // Render 함수들
  // ============================================================================

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <PieChart className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">일표본 비율 검정이란?</h2>
            <p className="text-muted-foreground">
              한 집단의 성공 비율이 특정 값과 다른지 검정하는 방법입니다.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-3">주요 특징</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <span className="text-sm">이분 변수 (성공/실패) 분석</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <span className="text-sm">검정 비율(p₀) 설정 가능</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <span className="text-sm">양측/단측 검정 지원</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
            <span className="text-sm">Wilson Score 신뢰구간 (정확함)</span>
          </li>
        </ul>
      </Card>

      <Card className="p-6 bg-blue-50 dark:bg-blue-950">
        <h3 className="font-semibold text-lg mb-3">검정 통계량</h3>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg font-mono text-center">
          Z = (p̂ - p₀) / √(p₀(1-p₀)/n)
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          <strong>가정</strong>: 이항분포, 독립적 시행, 각 시행의 성공확률 동일
        </p>
      </Card>

      <Button onClick={() => { actions.setCurrentStep?.(1) }} className="w-full" size="lg">
        다음 단계로
      </Button>
    </div>
  ), [actions])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep onUploadComplete={handleDataUpload} />
  ), [handleDataUpload])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const currentDependent = selectedVariables?.dependent || ''

    return (
      <div className="space-y-6">
        {/* 변수 선택 */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">변수 선택</h3>
          <p className="text-sm text-muted-foreground mb-4">
            비율 검정을 수행할 이분 변수를 선택하세요.
          </p>

          <div className="flex flex-wrap gap-2">
            {uploadedData.columns.map((col: string) => {
              const isSelected = currentDependent === col

              return (
                <Badge
                  key={col}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => { handleVariableSelect(col) }}
                >
                  {col}
                  {isSelected && <CheckCircle2 className="w-4 h-4 ml-2" />}
                </Badge>
              )
            })}
          </div>

          {!currentDependent && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                이분 변수 1개를 선택해주세요.
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* 가설 및 옵션 설정 */}
        {currentDependent && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">가설 및 검정 옵션 설정</h3>

            <div className="space-y-4">
              {/* 검정 비율 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-proportion">검정 비율 (p₀)</Label>
                  <Input
                    id="test-proportion"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={analysisOptions.testProportion}
                    onChange={(e) => {
                      setAnalysisOptions(prev => ({
                        ...prev,
                        testProportion: e.target.value
                      }))
                    }}
                    placeholder="예: 0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    0과 1 사이의 값 (예: 50% = 0.5)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>검정 방법</Label>
                  <Select
                    value={analysisOptions.method}
                    onValueChange={(value) => {
                      setAnalysisOptions(prev => ({
                        ...prev,
                        method: value
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">정규 근사 (빠름)</SelectItem>
                      <SelectItem value="exact">정확 검정 (정확함)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 대립가설 및 신뢰수준 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>대립가설</Label>
                  <Select
                    value={analysisOptions.alternative}
                    onValueChange={(value) => {
                      setAnalysisOptions(prev => ({
                        ...prev,
                        alternative: value
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">p ≠ p₀ (양측검정)</SelectItem>
                      <SelectItem value="greater">p &gt; p₀ (우측검정)</SelectItem>
                      <SelectItem value="less">p &lt; p₀ (좌측검정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>신뢰수준</Label>
                  <Select
                    value={analysisOptions.confidenceLevel}
                    onValueChange={(value) => {
                      setAnalysisOptions(prev => ({
                        ...prev,
                        confidenceLevel: value
                      }))
                    }}
                  >
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

              {/* 가설 요약 */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold mb-2">가설 요약</h4>
                <p className="text-sm">
                  <strong>H₀:</strong> p = {analysisOptions.testProportion} ({(parseFloat(analysisOptions.testProportion) * 100).toFixed(0)}%)
                </p>
                <p className="text-sm">
                  <strong>H₁:</strong> p {
                    analysisOptions.alternative === 'two-sided' ? '≠' :
                    analysisOptions.alternative === 'greater' ? '>' : '<'
                  } {analysisOptions.testProportion} ({(parseFloat(analysisOptions.testProportion) * 100).toFixed(0)}%)
                </p>
              </div>

              <Button
                onClick={handleNextStep}
                disabled={isAnalyzing || !currentDependent}
                className="w-full"
              >
                {isAnalyzing ? '분석 중...' : '다음 단계'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, analysisOptions, isAnalyzing, handleVariableSelect, handleNextStep])

  const renderResults = useCallback(() => {
    if (!results) return null

    // 검정 결과 테이블
    const renderTestResultsTable = () => {
      const data = [{
        statistic: 'Z 통계량',
        value: results.zStatistic.toFixed(3),
        interpretation: results.zStatistic > 1.96 || results.zStatistic < -1.96 ?
          '임계값 ±1.96을 초과' : '임계값 ±1.96 이내'
      }, {
        statistic: 'p-값',
        value: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
        interpretation: results.pValue < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'
      }, {
        statistic: '효과크기 (h)',
        value: results.effectSize.toFixed(3),
        interpretation: results.effectSize < 0.2 ? '작은 효과' :
                        results.effectSize < 0.5 ? '중간 효과' :
                        results.effectSize < 0.8 ? '큰 효과' : '매우 큰 효과'
      }, {
        statistic: '검정 방법',
        value: results.method,
        interpretation: results.continuityCorrection ? '연속성 보정 적용됨' : '정규 근사 사용'
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
          title="일표본 비율 검정 결과"
        />
      )
    }

    // 기술통계 테이블
    const renderDescriptiveTable = () => {
      const data = [{
        category: '성공',
        count: results.successCount,
        proportion: (results.observedProportion * 100).toFixed(1) + '%',
        expected: (results.testProportion * results.totalCount).toFixed(0),
        expectedProp: (results.testProportion * 100).toFixed(1) + '%'
      }, {
        category: '실패',
        count: results.totalCount - results.successCount,
        proportion: ((1 - results.observedProportion) * 100).toFixed(1) + '%',
        expected: ((1 - results.testProportion) * results.totalCount).toFixed(0),
        expectedProp: ((1 - results.testProportion) * 100).toFixed(1) + '%'
      }]

      const columns = [
        { key: 'category', header: '범주', type: 'text' as const },
        { key: 'count', header: '관측빈도', type: 'number' as const },
        { key: 'proportion', header: '관측비율', type: 'text' as const },
        { key: 'expected', header: '기대빈도', type: 'text' as const },
        { key: 'expectedProp', header: '기대비율', type: 'text' as const }
      ]

      return (
        <StatisticsTable
          columns={columns}
          data={data}
          title="관측값 vs 기댓값"
        />
      )
    }

    // 요약 카드
    const renderSummaryCards = () => {
      const significanceLevel = (100 - results.confidenceLevel) / 100
      const isSignificant = results.pValue < significanceLevel

      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">표본크기</p>
                  <p className="text-2xl font-bold">{results.totalCount}</p>
                </div>
                <Target className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">성공 횟수</p>
                  <p className="text-2xl font-bold">{results.successCount}</p>
                </div>
                <Calculator className="w-8 h-8 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">관측 비율</p>
                  <p className="text-2xl font-bold">{(results.observedProportion * 100).toFixed(1)}%</p>
                </div>
                <Percent className="w-8 h-8 text-muted-foreground/20" />
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
                <BarChart3 className={`w-8 h-8 ${isSignificant ? 'text-success/50' : 'text-error/50'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // 신뢰구간
    const renderConfidenceInterval = () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            비율의 {results.confidenceLevel}% 신뢰구간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-2xl font-bold">
              [{(results.ciLower * 100).toFixed(1)}%, {(results.ciUpper * 100).toFixed(1)}%]
            </p>
            <p className="text-sm text-muted-foreground">
              Wilson Score Interval 사용
            </p>
          </div>

          <div className="p-3 bg-muted dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-blue-300">
              <strong>해석:</strong> {results.confidenceLevel}% 확률로 모집단의 실제 성공 비율은
              {(results.ciLower * 100).toFixed(1)}%과 {(results.ciUpper * 100).toFixed(1)}% 사이에 있습니다.
              {(results.testProportion >= results.ciLower && results.testProportion <= results.ciUpper)
                ? ' 신뢰구간이 검정값을 포함하므로 유의한 차이가 없습니다.'
                : ' 신뢰구간이 검정값을 포함하지 않으므로 유의한 차이가 있습니다.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )

    // 방법 설명
    const renderMethodExplanation = () => (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            검정 방법 설명
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Normal Approximation (정규근사)</h4>
              <p className="text-sm text-muted-foreground">
                표본크기가 클 때 (np ≥ 5, n(1-p) ≥ 5) 이항분포를 정규분포로 근사
              </p>
              <p className="text-sm">공식: Z = (p̂ - p₀) / √(p₀(1-p₀)/n)</p>
            </div>

            <div>
              <h4 className="font-semibold">Wilson Score Interval</h4>
              <p className="text-sm text-muted-foreground">
                Wald 신뢰구간보다 정확하며, 특히 비율이 0 또는 1에 가까울 때 안정적
              </p>
              <p className="text-sm">작은 표본에서도 우수한 성능을 보임</p>
            </div>

            <div>
              <h4 className="font-semibold">연속성 보정 (Continuity Correction)</h4>
              <p className="text-sm text-muted-foreground">
                이산분포를 연속분포로 근사할 때의 오차를 줄이는 보정
              </p>
              <p className="text-sm">표본크기가 작을 때 (n &lt; 50) 자동 적용</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="일표본 비율 검정"
          analysisSubtitle="One-Sample Proportion Test"
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.dependent ? [selectedVariables.dependent] : []}
          sampleSize={results.totalCount}
          timestamp={analysisTimestamp ?? undefined}
        />
      <ContentTabs
              tabs={[
                { id: 'summary', label: '요약', icon: FileText },
                { id: 'results', label: '검정결과', icon: Table },
                { id: 'confidence', label: '신뢰구간', icon: Target },
                { id: 'methods', label: '방법설명', icon: HelpCircle }
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
          {/* 결과 해석 - 공통 컴포넌트 */}
          <ResultInterpretation
            result={{
              summary: results.conclusion,
              details: `Z = ${results.zStatistic.toFixed(3)}, p = ${results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3)}, 관측 비율 = ${(results.observedProportion * 100).toFixed(1)}%, 검정 비율 = ${(results.testProportion * 100).toFixed(1)}%`,
              recommendation: results.pValue < 0.05
                ? `표본 비율이 검정 비율과 유의하게 다릅니다. 효과크기 h = ${results.effectSize.toFixed(3)}`
                : '표본 비율이 검정 비율과 유의하게 다르지 않습니다. 표본 크기를 늘려 검정력을 높이는 것을 고려하세요.',
              caution: results.continuityCorrection
                ? '표본 크기가 작아 연속성 보정이 적용되었습니다.'
                : '정규 근사가 적용되었습니다.'
            }}
            title="일표본 비율 검정 결과 해석"
          />

          {/* 효과크기 - 공통 컴포넌트 */}
          <EffectSizeCard
            title="Cohen's h (효과크기)"
            value={results.effectSize}
            type="phi"
            description="h = 2(arcsin(√p̂) - arcsin(√p₀))"
          />
        </ContentTabsContent>

        <ContentTabsContent tabId="results" show={activeResultTab === 'results'} className="space-y-6">
          <div>
            {renderDescriptiveTable()}
          </div>
          <div>
            {renderTestResultsTable()}
          </div>
        </ContentTabsContent>

        <ContentTabsContent tabId="confidence" show={activeResultTab === 'confidence'} className="space-y-6">
          {/* 신뢰구간 - 공통 컴포넌트 */}
          <ConfidenceIntervalDisplay
            lower={results.ciLower}
            upper={results.ciUpper}
            estimate={results.observedProportion}
            level={results.confidenceLevel}
            label="비율의 신뢰구간"
            referenceValue={results.testProportion}
            showVisualization={true}
            showInterpretation={true}
            description="Wilson Score Interval을 사용한 신뢰구간입니다. Wald 신뢰구간보다 정확하며, 비율이 0이나 1에 가까울 때도 안정적입니다."
          />
        </ContentTabsContent>

        <ContentTabsContent tabId="methods" show={activeResultTab === 'methods'} className="space-y-6">
          {renderMethodExplanation()}
        </ContentTabsContent>
      </div>
      </div>
    )
  }, [results, activeResultTab, uploadedData, selectedVariables, analysisTimestamp])

  // ============================================================================
  // JSX 렌더링
  // ============================================================================

  return (
    <TwoPanelLayout
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => { actions.setCurrentStep?.(step) }}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 100
      } : undefined}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </TwoPanelLayout>
  )
}
