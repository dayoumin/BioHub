'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap,
  Calculator,
  Target,
  Play,
  Info,
  TrendingUp,
  BarChart3
,
  FileText,
  Table,
  HelpCircle
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface PowerAnalysisResult {
  testType: string
  analysisType: 'post-hoc' | 'a-priori' | 'compromise' | 'criterion'
  inputParameters: {
    alpha: number
    power?: number
    effectSize?: number
    sampleSize?: number
  }
  results: {
    power?: number
    effectSize?: number
    sampleSize?: number
    criticalEffect?: number
  }
  interpretation: string
  recommendations: string[]
  powerCurve?: Array<{
    sampleSize: number
    power: number
  }>
}

interface PowerAnalysisConfig {
  testType: string
  analysisType: 'post-hoc' | 'a-priori' | 'compromise' | 'criterion'
  alpha: string
  power: string
  effectSize: string
  sampleSize: string
  sides: string
}

export default function PowerAnalysisPage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('power-analysis')
  }, [])

  // Hook for state management
  const { state, actions } = useStatisticsPage<PowerAnalysisResult, never>({
    withUploadedData: false,
    withError: true,
    initialStep: 0
  })
  const { currentStep, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '검정력 분석' }
  ], [])

  // STEPS 정의 (Batch 3 표준)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개' },
    { id: 1, label: '파라미터 설정' },
    { id: 2, label: '분석 결과' }
  ], [])

  // Page-specific state
  const [activeTab, setActiveTab] = useState<string>('summary')
  const [config, setConfig] = useState<PowerAnalysisConfig>({
    testType: 't-test',
    analysisType: 'a-priori',
    alpha: '0.05',
    power: '0.80',
    effectSize: '0.5',
    sampleSize: '30',
    sides: 'two-sided'
  })

  // Config update handlers with useCallback
  const updateConfig = useCallback(<K extends keyof PowerAnalysisConfig>(
    key: K,
    value: PowerAnalysisConfig[K]
  ): void => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }, [])

  // 분석 실행 (PyodideCore 사용)
  const handleAnalysis = useCallback(async (): Promise<void> => {
    if (!actions) {
      return
    }

    try {
      actions.startAnalysis()

      // PyodideCore 초기화
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const alphaValue = parseFloat(config.alpha)
      const powerValue = parseFloat(config.power)
      const effectValue = parseFloat(config.effectSize)
      const sampleValue = parseInt(config.sampleSize, 10)

      // Worker 2 power_analysis 메서드 호출
      const result = await pyodideCore.callWorkerMethod<PowerAnalysisResult>(
        PyodideWorker.Hypothesis,
        'power_analysis',
        {
          test_type: config.testType,
          analysis_type: config.analysisType,
          alpha: alphaValue,
          power: powerValue,
          effect_size: effectValue,
          sample_size: sampleValue,
          sides: config.sides
        }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis(result, 2)
      actions.setCurrentStep?.(2)
      setActiveTab('summary')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
      console.error('[power-analysis] Analysis error:', errorMessage)
      if (actions) {
        actions.setError(errorMessage)
      }
    }
  }, [config, actions, setActiveTab])

  // 검정력 분석 결과 테이블
  const renderResultsTable = useCallback((): React.ReactNode => {
    if (!results) return null

    interface ResultRow {
      parameter: string
      input: string
      result: string
    }

    const data: ResultRow[] = [
      {
        parameter: '검정 유형',
        input: results.testType,
        result: results.analysisType === 'a-priori' ? '사전 분석' :
               results.analysisType === 'post-hoc' ? '사후 분석' : '절충 분석'
      },
      {
        parameter: '유의수준 (α)',
        input: results.inputParameters.alpha.toString(),
        result: `${(results.inputParameters.alpha * 100).toFixed(0)}% Type I 오류율`
      }
    ]

    if (results.inputParameters.power) {
      data.push({
        parameter: '목표 검정력',
        input: results.inputParameters.power.toString(),
        result: `${(results.inputParameters.power * 100).toFixed(0)}%`
      })
    }

    if (results.inputParameters.effectSize) {
      const es = results.inputParameters.effectSize
      data.push({
        parameter: '효과크기',
        input: es.toString(),
        result: es < 0.2 ? '작은 효과' :
               es < 0.5 ? '중간 효과' :
               es < 0.8 ? '큰 효과' : '매우 큰 효과'
      })
    }

    if (results.results.sampleSize) {
      data.push({
        parameter: '필요 표본크기',
        input: '-',
        result: `각 그룹당 ${results.results.sampleSize}개`
      })
    }

    if (results.results.power) {
      data.push({
        parameter: '계산된 검정력',
        input: '-',
        result: `${(results.results.power * 100).toFixed(1)}%`
      })
    }

    const columns = [
      { key: 'parameter', header: '모수', type: 'text' as const },
      { key: 'input', header: '입력값', type: 'text' as const },
      { key: 'result', header: '결과/해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="검정력 분석 결과"
      />
    )
  }, [results])

  // 검정력 곡선 테이블
  const renderPowerCurveTable = useCallback((): React.ReactNode => {
    if (!results?.powerCurve) return null

    const columns = [
      { key: 'sampleSize', header: '표본크기 (각 그룹)', type: 'number' as const },
      { key: 'power', header: '검정력', type: 'number' as const, precision: 3 }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={results.powerCurve}
        title="표본크기별 검정력"
      />
    )
  }, [results])

  // 요약 카드들
  const renderSummaryCards = useCallback((): React.ReactNode => {
    if (!results) return null

    const powerDisplay = results.results.power
      ? `${(results.results.power * 100).toFixed(0)}%`
      : results.inputParameters.power
      ? `${(results.inputParameters.power * 100).toFixed(0)}%`
      : 'N/A'

    const sampleDisplay = results.results.sampleSize
      ? results.results.sampleSize.toString()
      : results.inputParameters.sampleSize
      ? results.inputParameters.sampleSize.toString()
      : 'N/A'

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">유의수준</p>
                <p className="text-2xl font-bold">{(results.inputParameters.alpha * 100).toFixed(0)}%</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">효과크기</p>
                <p className="text-2xl font-bold">
                  {results.inputParameters.effectSize?.toFixed(2) ?? 'N/A'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">검정력</p>
                <p className="text-2xl font-bold">{powerDisplay}</p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">{sampleDisplay}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [results])

  // 효과크기 가이드
  const renderEffectSizeGuide = useCallback((): React.ReactNode => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            효과크기 참고 가이드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Cohen&apos;s d (t-검정, ANOVA)</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.2 (실질적으로 감지하기 어려운 차이)</li>
                <li>• <strong>중간 효과:</strong> 0.5 (육안으로 인지 가능한 차이)</li>
                <li>• <strong>큰 효과:</strong> 0.8 (명확히 구분되는 차이)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">상관계수 (r)</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.1 (약한 관계)</li>
                <li>• <strong>중간 효과:</strong> 0.3 (보통 관계)</li>
                <li>• <strong>큰 효과:</strong> 0.5 (강한 관계)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">비율 차이</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>작은 효과:</strong> 0.05 (5%p 차이)</li>
                <li>• <strong>중간 효과:</strong> 0.15 (15%p 차이)</li>
                <li>• <strong>큰 효과:</strong> 0.25 (25%p 차이)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }, [])

  return (
    <TwoPanelLayout
      analysisTitle="검정력 분석"
      analysisSubtitle="표본크기 결정 및 검정력 계산"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
    >
      <div className="space-y-6">
        {/* 1단계: 검정 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                통계 검정 선택
              </CardTitle>
              <CardDescription>
                검정력 분석을 수행할 통계 검정을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>검정 유형</Label>
                <Select
                  value={config.testType}
                  onValueChange={(value) => updateConfig('testType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-test">t-검정 (평균 비교)</SelectItem>
                    <SelectItem value="anova">ANOVA (분산분석)</SelectItem>
                    <SelectItem value="correlation">상관분석</SelectItem>
                    <SelectItem value="chi-square">카이제곱 검정</SelectItem>
                    <SelectItem value="regression">회귀분석</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>분석 유형</Label>
                <Select
                  value={config.analysisType}
                  onValueChange={(value) => {
                    // Type guard: only allow valid analysis types
                    if (value === 'a-priori' || value === 'post-hoc' ||
                        value === 'compromise' || value === 'criterion') {
                      updateConfig('analysisType', value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a-priori">사전 분석 (표본크기 계산)</SelectItem>
                    <SelectItem value="post-hoc">사후 분석 (검정력 계산)</SelectItem>
                    <SelectItem value="compromise">절충 분석 (균형점 찾기)</SelectItem>
                    <SelectItem value="criterion">기준 분석 (임계 효과크기)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => actions?.setCurrentStep(1)}>
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2단계: 모수 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                분석 모수 설정
              </CardTitle>
              <CardDescription>
                검정력 분석에 필요한 모수들을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alpha">유의수준 (α)</Label>
                  <Select
                    value={config.alpha}
                    onValueChange={(value) => updateConfig('alpha', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01 (1%)</SelectItem>
                      <SelectItem value="0.05">0.05 (5%)</SelectItem>
                      <SelectItem value="0.10">0.10 (10%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>검정 방향</Label>
                  <Select
                    value={config.sides}
                    onValueChange={(value) => updateConfig('sides', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">양측 검정</SelectItem>
                      <SelectItem value="one-sided">단측 검정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.analysisType !== 'criterion' && (
                <div>
                  <Label htmlFor="effect-size">효과크기</Label>
                  <Input
                    id="effect-size"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2.0"
                    value={config.effectSize}
                    onChange={(e) => updateConfig('effectSize', e.target.value)}
                    placeholder="예: 0.5"
                  />
                </div>
              )}

              {config.analysisType === 'a-priori' && (
                <div>
                  <Label htmlFor="power">목표 검정력 (1-β)</Label>
                  <Select
                    value={config.power}
                    onValueChange={(value) => updateConfig('power', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.70">0.70 (70%)</SelectItem>
                      <SelectItem value="0.80">0.80 (80%) - 권장</SelectItem>
                      <SelectItem value="0.90">0.90 (90%)</SelectItem>
                      <SelectItem value="0.95">0.95 (95%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config.analysisType === 'post-hoc' && (
                <div>
                  <Label htmlFor="sample-size">표본크기 (각 그룹)</Label>
                  <Input
                    id="sample-size"
                    type="number"
                    min="5"
                    max="1000"
                    value={config.sampleSize}
                    onChange={(e) => updateConfig('sampleSize', e.target.value)}
                    placeholder="예: 30"
                  />
                </div>
              )}

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">분석 설정 요약</h4>
                <p className="text-sm">
                  <strong>검정:</strong> {config.testType}<br />
                  <strong>유형:</strong> {config.analysisType === 'a-priori' ? '사전 분석' :
                                      config.analysisType === 'post-hoc' ? '사후 분석' : '절충 분석'}<br />
                  <strong>유의수준:</strong> {config.alpha}<br />
                  {config.analysisType !== 'criterion' && <><strong>효과크기:</strong> {config.effectSize}<br /></>}
                  {config.analysisType === 'a-priori' && <><strong>목표 검정력:</strong> {config.power}</>}
                  {config.analysisType === 'post-hoc' && <><strong>표본크기:</strong> {config.sampleSize}</>}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => actions?.setCurrentStep(2)}>
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3단계: 분석 실행 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                검정력 분석 실행
              </CardTitle>
              <CardDescription>
                설정된 모수로 검정력 분석을 실행합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button
                  size="lg"
                  onClick={handleAnalysis}
                  disabled={isAnalyzing}
                  className="px-8"
                >
                  {isAnalyzing ? '분석 중...' : '검정력 분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 3 && (
          <>
          <ResultContextHeader
            analysisType="검정력 분석"
            analysisSubtitle="Power Analysis"
            variables={[config.testType]}
            timestamp={analysisTimestamp ?? undefined}
          />
          <ContentTabs
              tabs={[
                { id: 'summary', label: '요약', icon: FileText },
                { id: 'results', label: '분석결과', icon: Table },
                { id: 'guide', label: '효과크기 가이드', icon: HelpCircle }
              ]}
              activeTab={activeResultTab}
              onTabChange={setActiveResultTab}
              className="mb-4"
            />
            <div className="space-y-4">

            <ContentTabsContent tabId="summary" show={activeResultTab === 'summary'} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">분석 요약</h3>
                {renderSummaryCards()}
              </div>
              <div className="p-4 bg-muted dark:bg-success-bg rounded-lg">
                <h4 className="font-semibold dark:text-success mb-2">결과 해석</h4>
                <p className="text-muted-foreground dark:text-success-muted">{results.interpretation}</p>
                <div className="mt-3">
                  <h5 className="font-semibold dark:text-success">권장사항</h5>
                  <ul className="text-sm text-muted-foreground dark:text-success-muted space-y-1">
                    {results.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </ContentTabsContent>

            <ContentTabsContent tabId="results" show={activeResultTab === 'results'} className="space-y-6">
              <div>
                {renderResultsTable()}
              </div>
              {results.powerCurve && (
                <div>
                  {renderPowerCurveTable()}
                </div>
              )}
            </ContentTabsContent>

            <ContentTabsContent tabId="guide" show={activeResultTab === 'guide'} className="space-y-6">
              {renderEffectSizeGuide()}
            </ContentTabsContent>
          </div>
          </>
        )}
      </div>
    </TwoPanelLayout>
  )
}