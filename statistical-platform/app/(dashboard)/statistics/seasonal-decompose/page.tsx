'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { SeasonalDecomposeVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  Info,
  Activity,
  TrendingUp,
  BarChart3
,
  FileText,
  Layers,
  MessageSquare
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { extractColumnData } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface SeasonalDecomposeResults {
  trend: number[]
  seasonal: number[]
  residual: number[]
  observed: number[]
  period: number
  model: string
  seasonalStrength: number
  trendStrength: number
  statistics: {
    trendMean: number
    seasonalRange: number
    residualStd: number
  }
}

export default function SeasonalDecomposePage() {
  useEffect(() => {
    addToRecentStatistics('seasonal-decompose')
  }, [])

  const { state, actions } = useStatisticsPage<SeasonalDecomposeResults, SeasonalDecomposeVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [model, setModel] = useState<'additive' | 'multiplicative'>('additive')
  const [period, setPeriod] = useState(12)

  const breadcrumbs = useMemo(() => [
    { label: 'Statistics', href: '/statistics' },
    { label: 'Seasonal Decomposition', href: '/statistics/seasonal-decompose' }
  ], [])

  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables?.dependent
    const newDependent = current === varName ? '' : varName
    actions.setSelectedVariables?.({ dependent: newDependent })
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (vars: SeasonalDecomposeVariables) => {
    if (!uploadedData || !vars.dependent) {
      actions.setError?.('Please select a variable.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const values = extractColumnData(data, vars.dependent)

      if (values.length < period * 2) {
        actions.setError?.(`Seasonal decomposition requires at least ${period * 2} observations for period=${period}.`)
        return
      }

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        trend: number[]
        seasonal: number[]
        residual: number[]
      }>(
        PyodideWorker.RegressionAdvanced,
        'time_series_decomposition',
        { values, period, model }
      )

      // Calculate statistics
      const validTrend = result.trend.filter(v => v !== null && !isNaN(v))
      const trendMean = validTrend.length > 0 ? validTrend.reduce((a, b) => a + b, 0) / validTrend.length : 0

      const seasonalRange = Math.max(...result.seasonal) - Math.min(...result.seasonal)

      const validResidual = result.residual.filter(v => v !== null && !isNaN(v))
      const residualMean = validResidual.length > 0 ? validResidual.reduce((a, b) => a + b, 0) / validResidual.length : 0
      const residualVariance = validResidual.length > 0
        ? validResidual.reduce((a, b) => a + Math.pow(b - residualMean, 2), 0) / validResidual.length
        : 0
      const residualStd = Math.sqrt(residualVariance)

      // Calculate strength metrics
      const observedVariance = values.reduce((a, b) => a + Math.pow(b - values.reduce((x, y) => x + y, 0) / values.length, 2), 0) / values.length
      const seasonalStrength = seasonalRange > 0 ? Math.min(1, seasonalRange / Math.sqrt(observedVariance)) : 0
      const trendStrength = validTrend.length > 0 && observedVariance > 0
        ? Math.min(1, Math.sqrt(validTrend.reduce((a, b) => a + Math.pow(b - trendMean, 2), 0) / validTrend.length) / Math.sqrt(observedVariance))
        : 0

      const analysisResult: SeasonalDecomposeResults = {
        trend: result.trend,
        seasonal: result.seasonal,
        residual: result.residual,
        observed: values,
        period,
        model,
        seasonalStrength,
        trendStrength,
        statistics: {
          trendMean,
          seasonalRange,
          residualStd
        }
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(analysisResult, 3)
      setActiveResultTab('summary')
    } catch (error) {
      console.error('Seasonal decomposition error:', error)
      actions.setError?.(error instanceof Error ? error.message : 'Analysis failed.')
    }
  }, [uploadedData, period, model, actions])

  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: 'Method Info', completed: currentStep > 0 },
    { id: 1, label: 'Data Upload', completed: !!uploadedData },
    { id: 2, label: 'Select Variable', completed: !!selectedVariables?.dependent },
    { id: 3, label: 'Results', completed: !!results }
  ], [currentStep, uploadedData, selectedVariables, results])

  const renderMethodIntroduction = useCallback(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Seasonal Decomposition
        </CardTitle>
        <CardDescription>
          Decompose time series into trend, seasonal, and residual components
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Overview</h4>
          <p className="text-sm text-muted-foreground">
            Seasonal decomposition separates a time series into three components:
            the underlying trend, seasonal patterns, and random residuals.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Components</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li><strong>Trend:</strong> Long-term direction of the data</li>
            <li><strong>Seasonal:</strong> Regular periodic fluctuations</li>
            <li><strong>Residual:</strong> Random variation after removing trend and seasonality</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Models</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li><strong>Additive:</strong> Y = Trend + Seasonal + Residual (constant seasonality)</li>
            <li><strong>Multiplicative:</strong> Y = Trend x Seasonal x Residual (proportional seasonality)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Requirements</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>At least 2 complete seasonal cycles</li>
            <li>Regular time intervals</li>
            <li>For multiplicative: positive values only</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  ), [])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={createDataUploadHandler(
        actions.setUploadedData,
        () => actions.setCurrentStep?.(1),
        'seasonal-decompose'
      )}
    />
  ), [actions])

  const renderVariableSelection = useCallback(() => {
    if (!uploadedData) return null

    const numericColumns = uploadedData.data.length > 0
      ? Object.keys(uploadedData.data[0]).filter(key => {
          const value = uploadedData.data[0][key as keyof typeof uploadedData.data[0]]
          return typeof value === 'number'
        })
      : []

    const isVariableSelected = !!selectedVariables?.dependent

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Select Time Series Variable
            </CardTitle>
            <CardDescription>
              Select the variable to decompose
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select one numeric variable. Data should be in chronological order.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Numeric Variables</Label>
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
                Decomposition Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Model Type</Label>
                <RadioGroup value={model} onValueChange={(v) => setModel(v as 'additive' | 'multiplicative')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="additive" id="additive" />
                    <Label htmlFor="additive">Additive (Y = T + S + R)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiplicative" id="multiplicative" />
                    <Label htmlFor="multiplicative">Multiplicative (Y = T x S x R)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Seasonal Period</Label>
                <Input
                  id="period"
                  type="number"
                  value={period}
                  onChange={(e) => setPeriod(Math.max(2, parseInt(e.target.value) || 12))}
                  min={2}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Common values: 12 (monthly), 4 (quarterly), 7 (daily with weekly pattern)
                </p>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNextStep}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Run Decomposition'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, model, period, isAnalyzing, handleVariableSelect, handleNextStep])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No results available. Please select a variable and run the decomposition.
            </div>
          </CardContent>
        </Card>
      )
    }

    // Create table data for components preview
    const componentData = results.observed.slice(0, 20).map((obs, i) => ({
      index: i + 1,
      observed: obs.toFixed(2),
      trend: results.trend[i] !== null && !isNaN(results.trend[i]) ? results.trend[i].toFixed(2) : 'N/A',
      seasonal: results.seasonal[i].toFixed(4),
      residual: results.residual[i] !== null && !isNaN(results.residual[i]) ? results.residual[i].toFixed(4) : 'N/A'
    }))

    const componentColumns = [
      { key: 'index', header: '#', type: 'number' as const },
      { key: 'observed', header: 'Observed', type: 'text' as const },
      { key: 'trend', header: 'Trend', type: 'text' as const },
      { key: 'seasonal', header: 'Seasonal', type: 'text' as const },
      { key: 'residual', header: 'Residual', type: 'text' as const }
    ]

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Seasonal Decomposition"
          analysisSubtitle={`${results.model} model, period=${results.period}`}
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.dependent ? [selectedVariables.dependent] : []}
          sampleSize={results.observed.length}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'components', label: 'Components', icon: Layers },
                { id: 'interpretation', label: 'Interpretation', icon: MessageSquare }
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
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="text-lg font-bold capitalize">{results.model}</p>
                    </div>
                    <Activity className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="text-2xl font-bold">{results.period}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Trend Strength</p>
                    <p className="text-2xl font-bold">{(results.trendStrength * 100).toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Seasonal Strength</p>
                    <p className="text-2xl font-bold">{(results.seasonalStrength * 100).toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Trend Mean</p>
                  <p className="text-xl font-bold">{results.statistics.trendMean.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Seasonal Range</p>
                  <p className="text-xl font-bold">{results.statistics.seasonalRange.toFixed(4)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Residual Std Dev</p>
                  <p className="text-xl font-bold">{results.statistics.residualStd.toFixed(4)}</p>
                </CardContent>
              </Card>
            </div>
          </ContentTabsContent>

          <ContentTabsContent tabId="components" show={activeResultTab === 'components'} className="space-y-6">
            <StatisticsTable
              columns={componentColumns}
              data={componentData}
              title="Decomposition Components (First 20 Observations)"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                N/A values in trend and residual columns are due to edge effects in the moving average calculation.
              </AlertDescription>
            </Alert>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-6">
            {/* 결과 해석 - 공통 컴포넌트 */}
            <ResultInterpretation
              result={{
                summary: `시계열 데이터를 ${results.model} 모델로 분해했습니다 (주기: ${results.period}). ` +
                  (results.trendStrength > 0.5 ? '강한 추세 성분이 감지되었습니다. ' : '') +
                  (results.seasonalStrength > 0.3 ? '유의한 계절 패턴이 존재합니다.' : ''),
                details: `추세 평균: ${results.statistics.trendMean.toFixed(2)}, 계절 범위: ${results.statistics.seasonalRange.toFixed(4)}, 잔차 표준편차: ${results.statistics.residualStd.toFixed(4)}, 추세 강도: ${(results.trendStrength * 100).toFixed(1)}%, 계절 강도: ${(results.seasonalStrength * 100).toFixed(1)}%`,
                recommendation: '장기 예측에는 추세 성분을, 기간 간 비교에는 계절 조정을 적용하세요. 잔차 표준편차가 높으면 다른 모델을 시도해보세요.',
                caution: results.model === 'multiplicative'
                  ? '계절 값은 곱셈 인자를 나타냅니다. 모든 값이 양수여야 합니다.'
                  : '계절 값은 가산 조정을 나타냅니다.'
              }}
              title="Seasonal Decomposition 결과 해석"
            />
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [results, activeResultTab, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="Seasonal Decomposition"
      analysisSubtitle="Decompose Time Series into Trend, Seasonal, and Residual"
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
