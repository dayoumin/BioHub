'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { StationarityTestVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  Info,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle
,
  FileText,
  Table,
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

interface StationarityResults {
  adf: {
    statistic: number
    pValue: number
    lags: number
    nobs: number
    criticalValues: { '1%': number; '5%': number; '10%': number }
    isStationary: boolean
  }
  kpss: {
    statistic: number
    pValue: number
    lags: number
    criticalValues: { '1%': number; '2.5%': number; '5%': number; '10%': number }
    isStationary: boolean
  }
  conclusion: 'stationary' | 'non_stationary' | 'trend_stationary' | 'difference_stationary'
  interpretation: string
  recommendation: string
  sampleSize: number
  descriptives: {
    mean: number
    std: number
  }
}

export default function StationarityTestPage() {
  useEffect(() => {
    addToRecentStatistics('stationarity-test')
  }, [])

  const { state, actions } = useStatisticsPage<StationarityResults, StationarityTestVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [regression, setRegression] = useState<'c' | 'ct'>('c')

  const breadcrumbs = useMemo(() => [
    { label: 'Statistics', href: '/statistics' },
    { label: 'Stationarity Test', href: '/statistics/stationarity-test' }
  ], [])

  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables?.dependent
    const newDependent = current === varName ? '' : varName
    actions.setSelectedVariables?.({ dependent: newDependent })
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (vars: StationarityTestVariables) => {
    if (!uploadedData || !vars.dependent) {
      actions.setError?.('Please select a variable.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const values = extractColumnData(data, vars.dependent)

      if (values.length < 20) {
        actions.setError?.('Stationarity test requires at least 20 observations.')
        return
      }

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<StationarityResults>(
        PyodideWorker.RegressionAdvanced,
        'stationarity_test',
        { values, regression }
      )

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(result, 3)
      setActiveResultTab('summary')
    } catch (error) {
      console.error('Stationarity test error:', error)
      actions.setError?.(error instanceof Error ? error.message : 'Analysis failed.')
    }
  }, [uploadedData, regression, actions])

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
          <Clock className="w-5 h-5" />
          Stationarity Test (ADF & KPSS)
        </CardTitle>
        <CardDescription>
          Test whether a time series is stationary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Overview</h4>
          <p className="text-sm text-muted-foreground">
            Stationarity testing determines if a time series has constant statistical properties over time.
            Non-stationary series need to be transformed (differencing) before ARIMA modeling.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Tests Performed</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>ADF (Augmented Dickey-Fuller):</strong> Tests for unit root.
                H0: Non-stationary. Reject if p &lt; 0.05.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>KPSS:</strong> Tests for stationarity.
                H0: Stationary. Reject if p &lt; 0.05.
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Interpretation Guide</h4>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><strong>ADF rejects + KPSS does not reject:</strong> Stationary</p>
            <p><strong>ADF does not reject + KPSS rejects:</strong> Non-stationary</p>
            <p><strong>Both reject:</strong> Trend-stationary</p>
            <p><strong>Neither rejects:</strong> Difference-stationary</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Requirements</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>At least 20 observations</li>
            <li>Time series data (ordered)</li>
            <li>No missing values in sequence</li>
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
        'stationarity-test'
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
              Select the variable to test for stationarity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select one numeric variable that represents your time series data.
                Data should be in chronological order.
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
                <Clock className="w-5 h-5" />
                Test Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Regression Type</Label>
                <RadioGroup value={regression} onValueChange={(v) => setRegression(v as 'c' | 'ct')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="c" id="constant" />
                    <Label htmlFor="constant">Constant only (default)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ct" id="constant-trend" />
                    <Label htmlFor="constant-trend">Constant + Trend</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNextStep}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Run Test'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, regression, isAnalyzing, handleVariableSelect, handleNextStep])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No results available. Please select a variable and run the test.
            </div>
          </CardContent>
        </Card>
      )
    }

    const getConclusionColor = (conclusion: StationarityResults['conclusion']) => {
      switch (conclusion) {
        case 'stationary': return 'text-green-600'
        case 'non_stationary': return 'text-red-600'
        case 'trend_stationary': return 'text-yellow-600'
        case 'difference_stationary': return 'text-orange-600'
      }
    }

    const getConclusionLabel = (conclusion: StationarityResults['conclusion']) => {
      switch (conclusion) {
        case 'stationary': return 'Stationary'
        case 'non_stationary': return 'Non-Stationary'
        case 'trend_stationary': return 'Trend-Stationary'
        case 'difference_stationary': return 'Difference-Stationary'
      }
    }

    const adfData = [{
      test: 'ADF (Augmented Dickey-Fuller)',
      statistic: results.adf.statistic.toFixed(4),
      pValue: results.adf.pValue < 0.001 ? '< 0.001' : results.adf.pValue.toFixed(4),
      critical1: results.adf.criticalValues['1%'].toFixed(4),
      critical5: results.adf.criticalValues['5%'].toFixed(4),
      critical10: results.adf.criticalValues['10%'].toFixed(4),
      conclusion: results.adf.isStationary ? 'Stationary' : 'Non-Stationary'
    }]

    const kpssData = [{
      test: 'KPSS',
      statistic: results.kpss.statistic.toFixed(4),
      pValue: results.kpss.pValue < 0.01 ? '< 0.01' : (results.kpss.pValue > 0.1 ? '> 0.10' : results.kpss.pValue.toFixed(4)),
      critical1: results.kpss.criticalValues['1%'].toFixed(4),
      critical5: results.kpss.criticalValues['5%'].toFixed(4),
      critical10: results.kpss.criticalValues['10%'].toFixed(4),
      conclusion: results.kpss.isStationary ? 'Stationary' : 'Non-Stationary'
    }]

    const testColumns = [
      { key: 'test', header: 'Test', type: 'text' as const },
      { key: 'statistic', header: 'Statistic', type: 'text' as const },
      { key: 'pValue', header: 'p-value', type: 'text' as const },
      { key: 'critical1', header: '1% CV', type: 'text' as const },
      { key: 'critical5', header: '5% CV', type: 'text' as const },
      { key: 'critical10', header: '10% CV', type: 'text' as const },
      { key: 'conclusion', header: 'Conclusion', type: 'text' as const }
    ]

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Stationarity Test"
          analysisSubtitle="ADF & KPSS Unit Root Tests"
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.dependent ? [selectedVariables.dependent] : []}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'details', label: 'Test Details', icon: Table },
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
                      <p className="text-sm text-muted-foreground">Conclusion</p>
                      <p className={`text-lg font-bold ${getConclusionColor(results.conclusion)}`}>
                        {getConclusionLabel(results.conclusion)}
                      </p>
                    </div>
                    {results.conclusion === 'stationary' ? (
                      <CheckCircle className="w-8 h-8 text-green-500/50" />
                    ) : results.conclusion === 'non_stationary' ? (
                      <XCircle className="w-8 h-8 text-red-500/50" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-yellow-500/50" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sample Size</p>
                    <p className="text-2xl font-bold">{results.sampleSize}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mean</p>
                    <p className="text-2xl font-bold">{results.descriptives.mean.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Std Dev</p>
                    <p className="text-2xl font-bold">{results.descriptives.std.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className={results.conclusion === 'stationary' ? 'border-green-500' : 'border-yellow-500'}>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendation:</strong> {results.recommendation}
              </AlertDescription>
            </Alert>
          </ContentTabsContent>

          <ContentTabsContent tabId="details" show={activeResultTab === 'details'} className="space-y-6">
            <StatisticsTable
              columns={testColumns}
              data={adfData}
              title="ADF Test Results"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>ADF Test:</strong> H0: Unit root exists (non-stationary).
                Reject H0 if test statistic &lt; critical value or p &lt; 0.05.
                Lags used: {results.adf.lags}
              </AlertDescription>
            </Alert>

            <StatisticsTable
              columns={testColumns}
              data={kpssData}
              title="KPSS Test Results"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>KPSS Test:</strong> H0: Series is stationary.
                Reject H0 if test statistic &gt; critical value or p &lt; 0.05.
                Lags used: {results.kpss.lags}
              </AlertDescription>
            </Alert>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-6">
            {/* 결과 해석 - 공통 컴포넌트 */}
            <ResultInterpretation
              result={{
                summary: results.interpretation,
                details: `ADF: statistic=${results.adf.statistic.toFixed(4)}, p=${results.adf.pValue < 0.001 ? '< 0.001' : results.adf.pValue.toFixed(4)} | KPSS: statistic=${results.kpss.statistic.toFixed(4)}, p=${results.kpss.pValue < 0.01 ? '< 0.01' : results.kpss.pValue > 0.1 ? '> 0.10' : results.kpss.pValue.toFixed(4)}`,
                recommendation: results.recommendation + (
                  results.conclusion === 'stationary'
                    ? ' ARMA/ARIMA 모델링 (d=0)을 진행하세요. ACF/PACF 플롯으로 AR, MA 차수를 결정하세요.'
                    : results.conclusion === 'non_stationary'
                      ? ' 1차 차분(d=1)을 적용한 후 다시 정상성 검정을 수행하세요.'
                      : results.conclusion === 'trend_stationary'
                        ? ' 결정적 추세를 제거하거나, 회귀를 통해 추세를 모델링하세요.'
                        : ' 결과가 결정적이지 않습니다. 차분을 시도하고 구조적 변화를 확인하세요.'
                ),
                caution: 'ADF는 단위근 존재를 귀무가설로, KPSS는 정상성을 귀무가설로 검정합니다. 두 검정의 결과를 종합적으로 해석하세요.'
              }}
              title="정상성 검정 결과 해석"
            />
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [results, activeResultTab, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="Stationarity Test"
      analysisSubtitle="ADF & KPSS - Unit Root Testing for Time Series"
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
