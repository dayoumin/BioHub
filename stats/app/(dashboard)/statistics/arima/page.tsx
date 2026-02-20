'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ARIMAVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  Info,
  TrendingUp,
  Clock,
  FileText,
  Activity,
  AlertTriangle
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import type { Interpretation } from '@/types/statistics'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { extractColumnData } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

interface ARIMAResults {
  order: { p: number; d: number; q: number }
  forecast: number[]
  fitted: number[]
  residuals: number[]
  aic: number | null
  bic: number | null
  sampleSize: number
  statistics: {
    residualMean: number
    residualStd: number
    mse: number
  }
}

export default function ARIMAPage() {
  useEffect(() => {
    addToRecentStatistics('arima')
  }, [])

  const { state, actions } = useStatisticsPage<ARIMAResults, ARIMAVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: true
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'arima'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [orderP, setOrderP] = useState(1)
  const [orderD, setOrderD] = useState(1)
  const [orderQ, setOrderQ] = useState(1)
  const [nForecast, setNForecast] = useState(10)

  const breadcrumbs = useMemo(() => [
    { label: '통계 분석', href: '/statistics' },
    { label: 'ARIMA 모델', href: '/statistics/arima' }
  ], [])

  const handleVariableSelect = useCallback((varName: string) => {
    const current = selectedVariables?.dependent
    const newDependent = current === varName ? '' : varName
    actions.setSelectedVariables?.({ dependent: newDependent })
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (vars: ARIMAVariables) => {
    if (!uploadedData || !vars.dependent) {
      actions.setError?.('Please select a variable.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const values = extractColumnData(data, vars.dependent)

      if (values.length < 30) {
        actions.setError?.('ARIMA 분석은 최소 30개 이상의 관측치가 필요합니다.')
        actions.completeAnalysis?.(null as unknown as ARIMAResults)
        return
      }

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<{
        forecast: number[]
        fitted: number[]
        residuals: number[]
        aic: number | null
        bic: number | null
      }>(
        PyodideWorker.RegressionAdvanced,
        'arima_forecast',
        { values, order: [orderP, orderD, orderQ], n_forecast: nForecast }
      )

      // Calculate residual statistics
      const validResiduals = result.residuals.filter(v => v !== null && !isNaN(v))
      const residualMean = validResiduals.length > 0
        ? validResiduals.reduce((a, b) => a + b, 0) / validResiduals.length
        : 0
      const residualVariance = validResiduals.length > 0
        ? validResiduals.reduce((a, b) => a + Math.pow(b - residualMean, 2), 0) / validResiduals.length
        : 0
      const residualStd = Math.sqrt(residualVariance)
      const mse = validResiduals.length > 0
        ? validResiduals.reduce((a, b) => a + b * b, 0) / validResiduals.length
        : 0

      const analysisResult: ARIMAResults = {
        order: { p: orderP, d: orderD, q: orderQ },
        forecast: result.forecast,
        fitted: result.fitted,
        residuals: result.residuals,
        aic: result.aic,
        bic: result.bic,
        sampleSize: values.length,
        statistics: {
          residualMean,
          residualStd,
          mse
        }
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(analysisResult, 3)
      setActiveResultTab('summary')
    } catch (error) {
      console.error('ARIMA error:', error)
      actions.setError?.(error instanceof Error ? error.message : 'Analysis failed.')
    }
  }, [uploadedData, orderP, orderD, orderQ, nForecast, actions])

  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.dependent) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: 'Method Info', completed: currentStep > 0 },
    { id: 1, label: 'Data Upload', completed: !!uploadedData },
    { id: 2, label: 'Configure Model', completed: !!selectedVariables?.dependent },
    { id: 3, label: 'Results', completed: !!results }
  ], [currentStep, uploadedData, selectedVariables, results])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          ARIMA Model
        </CardTitle>
        <CardDescription>
          AutoRegressive Integrated Moving Average for time series forecasting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Overview</h4>
          <p className="text-sm text-muted-foreground">
            ARIMA combines autoregression (AR), differencing (I), and moving average (MA) components
            to model and forecast time series data.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Model Parameters (p, d, q)</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li><strong>p (AR order):</strong> Number of autoregressive terms</li>
            <li><strong>d (Differencing):</strong> Number of differences for stationarity</li>
            <li><strong>q (MA order):</strong> Number of moving average terms</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Common Models</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li><strong>ARIMA(1,1,1):</strong> Basic model for most data</li>
            <li><strong>ARIMA(0,1,1):</strong> Simple exponential smoothing</li>
            <li><strong>ARIMA(0,1,0):</strong> Random walk with drift</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Requirements</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>At least 30 observations (50+ recommended)</li>
            <li>Regular time intervals</li>
            <li>Check stationarity before modeling (d parameter)</li>
          </ul>
        </div>
      </CardContent>
      </Card>

      {methodMetadata && (
        <AnalysisGuidePanel
          method={methodMetadata}
          sections={['variables', 'assumptions', 'dataFormat', 'sampleData']}
          defaultExpanded={['variables']}
        />
      )}

      {assumptionItems.length > 0 && (
        <AssumptionChecklist
          assumptions={assumptionItems}
          title="분석 전 가정 확인"
        />
      )}
    </div>
  ), [methodMetadata, assumptionItems])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={createDataUploadHandler(
        actions.setUploadedData,
        () => actions.setCurrentStep?.(2),
        'arima'
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
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select the variable to forecast. Data should be in chronological order.
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
                ARIMA Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p">p (AR order)</Label>
                  <Input
                    id="p"
                    type="number"
                    value={orderP}
                    onChange={(e) => setOrderP(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    max={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d">d (Differencing)</Label>
                  <Input
                    id="d"
                    type="number"
                    value={orderD}
                    onChange={(e) => setOrderD(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    max={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q">q (MA order)</Label>
                  <Input
                    id="q"
                    type="number"
                    value={orderQ}
                    onChange={(e) => setOrderQ(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    max={5}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forecast">Forecast Periods</Label>
                <Input
                  id="forecast"
                  type="number"
                  value={nForecast}
                  onChange={(e) => setNForecast(Math.max(1, parseInt(e.target.value) || 10))}
                  min={1}
                  max={100}
                  className="w-32"
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Tip: Use Stationarity Test first to determine appropriate d value.
                  Examine ACF/PACF plots to select p and q.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNextStep}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Fitting Model...' : 'Fit ARIMA Model'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [uploadedData, selectedVariables, orderP, orderD, orderQ, nForecast, isAnalyzing, handleVariableSelect, handleNextStep])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No results available.
            </div>
          </CardContent>
        </Card>
      )
    }

    // Create forecast table
    const forecastData = results.forecast.map((val, i) => ({
      period: results.sampleSize + i + 1,
      forecast: val.toFixed(2)
    }))

    const forecastColumns = [
      { key: 'period', header: 'Period', type: 'number' as const },
      { key: 'forecast', header: 'Forecast', type: 'text' as const }
    ]

    // Create fitted values table (last 20)
    const fittedData = results.fitted.slice(-20).map((val, i) => ({
      index: results.sampleSize - 20 + i + 1,
      fitted: val !== null && !isNaN(val) ? val.toFixed(2) : 'N/A',
      residual: results.residuals[results.sampleSize - 20 + i] !== null
        ? results.residuals[results.sampleSize - 20 + i].toFixed(4)
        : 'N/A'
    }))

    const fittedColumns = [
      { key: 'index', header: '#', type: 'number' as const },
      { key: 'fitted', header: 'Fitted', type: 'text' as const },
      { key: 'residual', header: 'Residual', type: 'text' as const }
    ]

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="ARIMA Model"
          analysisSubtitle={`ARIMA(${results.order.p},${results.order.d},${results.order.q})`}
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.dependent ? [selectedVariables.dependent] : []}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ResultInterpretation
          title="ARIMA 모델 해석"
          result={{
            summary: `ARIMA(${results.order.p},${results.order.d},${results.order.q}) 모델이 ${results.sampleSize}개 관측치로 적합되었습니다. ${results.forecast.length}기간 예측이 생성되었습니다.`,
            details: `모델 적합도: AIC = ${results.aic !== null ? results.aic.toFixed(2) : 'N/A'}, BIC = ${results.bic !== null ? results.bic.toFixed(2) : 'N/A'}. MSE = ${results.statistics.mse.toFixed(4)}. 잔차 평균 = ${results.statistics.residualMean.toFixed(6)} (${Math.abs(results.statistics.residualMean) < 0.01 ? '0에 가까움 - 양호' : '편향 가능성'}).`,
            recommendation: `AIC/BIC 값이 낮을수록 모델 적합도가 좋습니다. ${Math.abs(results.statistics.residualMean) < 0.01 ? '잔차가 0 근처에 분포하여 편향 없는 예측을 시사합니다.' : ''} 다른 ARIMA 차수와 비교하여 최적 모델을 찾으세요.`,
            caution: Math.abs(results.statistics.residualMean) >= 0.01 ? '잔차 평균이 0에서 멀어 모델 파라미터 조정을 고려하세요.' : undefined
          } satisfies Interpretation}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'forecast', label: 'Forecast', icon: TrendingUp },
                { id: 'diagnostics', label: 'Diagnostics', icon: Activity }
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
                      <p className="text-lg font-bold">
                        ARIMA({results.order.p},{results.order.d},{results.order.q})
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">AIC</p>
                    <p className="text-2xl font-bold">
                      {results.aic !== null ? results.aic.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">BIC</p>
                    <p className="text-2xl font-bold">
                      {results.bic !== null ? results.bic.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">MSE</p>
                    <p className="text-2xl font-bold">{results.statistics.mse.toFixed(4)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>Sample Size: {results.sampleSize}</li>
                  <li>Forecast Periods: {results.forecast.length}</li>
                  <li>Residual Mean: {results.statistics.residualMean.toFixed(6)}</li>
                  <li>Residual Std: {results.statistics.residualStd.toFixed(4)}</li>
                </ul>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="forecast" show={activeResultTab === 'forecast'} className="space-y-6">
            <StatisticsTable
              columns={forecastColumns}
              data={forecastData}
              title={`${results.forecast.length}-Period Forecast`}
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                These are point forecasts. For prediction intervals, consider confidence bounds.
              </AlertDescription>
            </Alert>
          </ContentTabsContent>

          <ContentTabsContent tabId="diagnostics" show={activeResultTab === 'diagnostics'} className="space-y-6">
            <StatisticsTable
              columns={fittedColumns}
              data={fittedData}
              title="Fitted Values & Residuals (Last 20)"
            />

            <Card>
              <CardHeader>
                <CardTitle>Residual Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Residual Mean: {results.statistics.residualMean.toFixed(6)}
                  {Math.abs(results.statistics.residualMean) < 0.01 && ' (close to zero - good)'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Residual Std Dev: {results.statistics.residualStd.toFixed(4)}
                </p>
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    For a good model: residuals should have zero mean and no autocorrelation.
                    Consider Ljung-Box test for residual autocorrelation.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [results, activeResultTab, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="ARIMA Model"
      analysisSubtitle="AutoRegressive Integrated Moving Average Forecasting"
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

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </TwoPanelLayout>
  )
}
