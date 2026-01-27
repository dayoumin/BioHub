'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { CoxRegressionVariables } from '@/types/statistics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  CheckCircle2,
  Info,
  Heart,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Variable
,
  FileText,
  Table,
  MessageSquare
} from 'lucide-react'

import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { extractColumnData } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

interface CoxRegressionResults {
  coefficients: number[]
  hazardRatios: number[]
  pValues: number[]
  confidenceIntervals: Array<{ lower: number; upper: number }>
  concordance: number | null
  covariateNames: string[]
  sampleSize: number
  totalEvents: number
}

export default function CoxRegressionPage() {
  useEffect(() => {
    addToRecentStatistics('cox-regression')
  }, [])

  const { state, actions } = useStatisticsPage<CoxRegressionResults, CoxRegressionVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: false
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'cox-regression'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [activeTab, setActiveTab] = useState('summary')

  const breadcrumbs = useMemo(() => [
    { label: 'Statistics', href: '/statistics' },
    { label: 'Cox Regression', href: '/statistics/cox-regression' }
  ], [])

  const handleTimeSelect = useCallback((varName: string) => {
    const current = selectedVariables?.time
    const newTime = current === varName ? '' : varName
    actions.setSelectedVariables?.({
      time: newTime,
      event: selectedVariables?.event || '',
      covariates: selectedVariables?.covariates || []
    })
  }, [selectedVariables, actions])

  const handleEventSelect = useCallback((varName: string) => {
    const current = selectedVariables?.event
    const newEvent = current === varName ? '' : varName
    actions.setSelectedVariables?.({
      time: selectedVariables?.time || '',
      event: newEvent,
      covariates: selectedVariables?.covariates || []
    })
  }, [selectedVariables, actions])

  const handleCovariateToggle = useCallback((varName: string) => {
    const currentCovariates = selectedVariables?.covariates || []
    const newCovariates = currentCovariates.includes(varName)
      ? currentCovariates.filter(c => c !== varName)
      : [...currentCovariates, varName]
    actions.setSelectedVariables?.({
      time: selectedVariables?.time || '',
      event: selectedVariables?.event || '',
      covariates: newCovariates
    })
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (vars: CoxRegressionVariables) => {
    if (!uploadedData || !vars.time || !vars.event || vars.covariates.length === 0) {
      actions.setError?.('Please select time, event, and at least one covariate.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const times = extractColumnData(data, vars.time)
      const events = extractColumnData(data, vars.event)
      const covariateData = vars.covariates.map(cov => extractColumnData(data, cov))

      if (times.length < 30) {
        actions.setError?.('Cox regression requires at least 30 observations.')
        return
      }

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<Omit<CoxRegressionResults, 'covariateNames' | 'sampleSize' | 'totalEvents'>>(
        PyodideWorker.RegressionAdvanced,
        'cox_regression',
        {
          times,
          events,
          covariateData,
          covariateNames: vars.covariates
        }
      )

      const totalEvents = events.filter(e => e === 1).length

      const enrichedResult: CoxRegressionResults = {
        ...result,
        covariateNames: vars.covariates,
        sampleSize: times.length,
        totalEvents
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(enrichedResult, 3)
      setActiveTab('summary')
    } catch (error) {
      console.error('Cox regression error:', error)
      actions.setError?.(error instanceof Error ? error.message : 'Analysis failed.')
    }
  }, [uploadedData, actions])

  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.time && selectedVariables?.event && selectedVariables?.covariates?.length > 0) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: 'Method Info', completed: currentStep > 0 },
    { id: 1, label: 'Data Upload', completed: !!uploadedData },
    { id: 2, label: 'Select Variables', completed: !!(selectedVariables?.time && selectedVariables?.event && selectedVariables?.covariates?.length) },
    { id: 3, label: 'Results', completed: !!results }
  ], [currentStep, uploadedData, selectedVariables, results])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Cox Proportional Hazards Regression
        </CardTitle>
        <CardDescription>
          Analyze the effect of covariates on survival time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Overview</h4>
          <p className="text-sm text-muted-foreground">
            Cox proportional hazards regression is a semi-parametric model used to assess
            the relationship between covariates and survival time. It estimates hazard ratios
            that quantify the effect of each covariate on the risk of the event.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Key Concepts</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Hazard Ratio (HR):</strong> The relative risk of the event.
                HR &gt; 1 indicates increased risk, HR &lt; 1 indicates reduced risk.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Proportional Hazards:</strong> Assumes the hazard ratio is constant over time.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Concordance (C-index):</strong> Model discrimination ability (0.5 = random, 1.0 = perfect).
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Data Requirements</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li><strong>Time variable:</strong> Duration until event or censoring</li>
            <li><strong>Event variable:</strong> 1 = event, 0 = censored</li>
            <li><strong>Covariates:</strong> Numeric predictors (continuous or coded)</li>
            <li><strong>Sample size:</strong> At least 30 observations recommended</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Assumptions</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>Proportional hazards (HR constant over time)</li>
            <li>Independent censoring</li>
            <li>Linear relationship between log-hazard and covariates</li>
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
        () => actions.setCurrentStep?.(1),
        'cox-regression'
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

    const allColumns = uploadedData.data.length > 0
      ? Object.keys(uploadedData.data[0])
      : []

    const isReady = !!(
      selectedVariables?.time &&
      selectedVariables?.event &&
      selectedVariables?.covariates?.length > 0
    )

    const usedVars = [selectedVariables?.time, selectedVariables?.event].filter(Boolean)

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Select Time Variable
            </CardTitle>
            <CardDescription>
              Time to event or censoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Numeric Variables</Label>
              <div className="flex flex-wrap gap-2">
                {numericColumns.map((col) => {
                  const isSelected = selectedVariables?.time === col
                  const isEvent = selectedVariables?.event === col
                  return (
                    <Badge
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-primary/90 transition-colors ${isEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !isEvent && handleTimeSelect(col)}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Select Event Variable
            </CardTitle>
            <CardDescription>
              1 = event occurred, 0 = censored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="flex flex-wrap gap-2">
                {allColumns.map((col) => {
                  const isSelected = selectedVariables?.event === col
                  const isTime = selectedVariables?.time === col
                  return (
                    <Badge
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-primary/90 transition-colors ${isTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !isTime && handleEventSelect(col)}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Variable className="w-5 h-5" />
              Select Covariates
            </CardTitle>
            <CardDescription>
              Predictors to include in the model (at least one required)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select numeric variables that may influence survival. Categorical variables should be coded as 0/1.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Available Covariates</Label>
              <div className="flex flex-wrap gap-2">
                {numericColumns
                  .filter(col => !usedVars.includes(col))
                  .map((col) => {
                    const isSelected = selectedVariables?.covariates?.includes(col)
                    return (
                      <Badge
                        key={col}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/90 transition-colors"
                        onClick={() => handleCovariateToggle(col)}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {col}
                      </Badge>
                    )
                  })}
              </div>
            </div>

            {(selectedVariables?.covariates?.length ?? 0) > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedVariables?.covariates?.join(', ')}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleNextStep}
                disabled={!isReady || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [uploadedData, selectedVariables, isAnalyzing, handleTimeSelect, handleEventSelect, handleCovariateToggle, handleNextStep])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No results available. Please select variables and run the analysis.
            </div>
          </CardContent>
        </Card>
      )
    }

    const coefficientData = results.covariateNames.map((name, idx) => ({
      covariate: name,
      coefficient: results.coefficients[idx].toFixed(4),
      hazardRatio: results.hazardRatios[idx].toFixed(4),
      ci95: results.confidenceIntervals[idx]
        ? `[${Math.exp(results.confidenceIntervals[idx].lower).toFixed(3)}, ${Math.exp(results.confidenceIntervals[idx].upper).toFixed(3)}]`
        : '-',
      pValue: results.pValues[idx] < 0.001 ? '< 0.001' : results.pValues[idx].toFixed(4),
      significance: results.pValues[idx] < 0.05 ? 'Yes' : 'No'
    }))

    const coeffColumns = [
      { key: 'covariate', header: 'Covariate', type: 'text' as const },
      { key: 'coefficient', header: 'Coefficient (B)', type: 'text' as const },
      { key: 'hazardRatio', header: 'Hazard Ratio', type: 'text' as const },
      { key: 'ci95', header: '95% CI (HR)', type: 'text' as const },
      { key: 'pValue', header: 'p-value', type: 'text' as const },
      { key: 'significance', header: 'Significant', type: 'text' as const }
    ]

    const significantCovariates = results.covariateNames.filter((_, idx) => results.pValues[idx] < 0.05)

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Cox Proportional Hazards Regression"
          analysisSubtitle="Semi-parametric Survival Model"
          fileName={uploadedData?.fileName}
          variables={[selectedVariables?.time || '', selectedVariables?.event || '', ...results.covariateNames].filter(Boolean)}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'coefficients', label: 'Coefficients', icon: Table },
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
                  <div>
                    <p className="text-sm text-muted-foreground">Sample Size</p>
                    <p className="text-2xl font-bold">{results.sampleSize}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-bold">{results.totalEvents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Concordance</p>
                    <p className="text-2xl font-bold">
                      {results.concordance !== null ? results.concordance.toFixed(3) : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Covariates</p>
                    <p className="text-2xl font-bold">{results.covariateNames.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {significantCovariates.length > 0 ? (
              <Alert className="border-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Significant predictors (p &lt; 0.05):</strong> {significantCovariates.join(', ')}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No covariates reached statistical significance at p &lt; 0.05.
                </AlertDescription>
              </Alert>
            )}

            {results.concordance !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Model Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    <strong>Concordance Index (C-index):</strong> {results.concordance.toFixed(3)}
                    {results.concordance >= 0.7
                      ? ' - Good discrimination'
                      : results.concordance >= 0.6
                        ? ' - Moderate discrimination'
                        : ' - Poor discrimination'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    C-index ranges from 0.5 (no discrimination) to 1.0 (perfect discrimination).
                  </p>
                </CardContent>
              </Card>
            )}
          </ContentTabsContent>

          <ContentTabsContent tabId="coefficients" show={activeResultTab === 'coefficients'} className="space-y-6">
            <StatisticsTable
              columns={coeffColumns}
              data={coefficientData}
              title="Cox Regression Coefficients"
            />

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Hazard Ratio Interpretation:</strong>
                <ul className="mt-2 space-y-1">
                  <li>HR = 1: No effect on hazard</li>
                  <li>HR &gt; 1: Increased hazard (higher risk)</li>
                  <li>HR &lt; 1: Decreased hazard (lower risk)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-6">
            <ResultInterpretation
              result={{
                summary: (() => {
                  const sigCovs = results.covariateNames.filter((_, idx) => results.pValues[idx] < 0.05)
                  if (sigCovs.length === 0) {
                    return `No covariates reached statistical significance (p < 0.05). The model includes ${results.covariateNames.length} covariate(s) with ${results.totalEvents} events out of ${results.sampleSize} observations.`
                  }
                  return `${sigCovs.length} of ${results.covariateNames.length} covariate(s) are statistically significant (p < 0.05): ${sigCovs.join(', ')}. The model includes ${results.totalEvents} events out of ${results.sampleSize} observations.`
                })(),
                details: results.covariateNames.map((name, idx) => {
                  const hr = results.hazardRatios[idx]
                  const pVal = results.pValues[idx]
                  const ci = results.confidenceIntervals[idx]
                  return `${name}: HR = ${hr.toFixed(3)} (95% CI: ${ci ? `${Math.exp(ci.lower).toFixed(3)}-${Math.exp(ci.upper).toFixed(3)}` : 'N/A'}), p = ${pVal < 0.001 ? '< 0.001' : pVal.toFixed(4)}`
                }).join('\n'),
                recommendation: (() => {
                  const sigCovs = results.covariateNames.filter((_, idx) => results.pValues[idx] < 0.05)
                  const hrInterpretations = sigCovs.map((name) => {
                    const idx = results.covariateNames.indexOf(name)
                    const hr = results.hazardRatios[idx]
                    if (hr > 1) return `${name}: ${((hr - 1) * 100).toFixed(1)}% increased hazard per unit`
                    if (hr < 1) return `${name}: ${((1 - hr) * 100).toFixed(1)}% decreased hazard per unit`
                    return `${name}: no effect on hazard`
                  })
                  if (hrInterpretations.length === 0) return 'Consider alternative predictors or larger sample size.'
                  return `Significant effects: ${hrInterpretations.join('; ')}`
                })(),
                caution: 'Verify proportional hazards assumption using Schoenfeld residuals. Check for influential observations and consider time-varying covariates if assumption is violated.'
              }}
              title="Cox Regression Results"
            />
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [results, activeTab, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="Cox Proportional Hazards Regression"
      analysisSubtitle="Semi-parametric Survival Modeling"
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
