'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { KaplanMeierVariables } from '@/types/statistics'
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
  TrendingDown,
  CheckCircle,
  Users
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
import { extractColumnData } from '@/lib/utils/data-extraction'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface KaplanMeierResults {
  survivalFunction: number[]
  times: number[]
  events: number[]
  nRisk: number[]
  medianSurvival: number | null
  sampleSize: number
  totalEvents: number
  totalCensored: number
}

export default function KaplanMeierPage() {
  useEffect(() => {
    addToRecentStatistics('kaplan-meier')
  }, [])

  const { state, actions } = useStatisticsPage<KaplanMeierResults, KaplanMeierVariables>({
    initialStep: 0,
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)
  const [activeResultTab, setActiveResultTab] = useState('summary')
  const [activeTab, setActiveTab] = useState('summary')

  const breadcrumbs = useMemo(() => [
    { label: 'Statistics', href: '/statistics' },
    { label: 'Kaplan-Meier', href: '/statistics/kaplan-meier' }
  ], [])

  const handleTimeSelect = useCallback((varName: string) => {
    const current = selectedVariables?.time
    const newTime = current === varName ? '' : varName
    actions.setSelectedVariables?.({
      time: newTime,
      event: selectedVariables?.event || '',
      group: selectedVariables?.group
    })
  }, [selectedVariables, actions])

  const handleEventSelect = useCallback((varName: string) => {
    const current = selectedVariables?.event
    const newEvent = current === varName ? '' : varName
    actions.setSelectedVariables?.({
      time: selectedVariables?.time || '',
      event: newEvent,
      group: selectedVariables?.group
    })
  }, [selectedVariables, actions])

  const handleGroupSelect = useCallback((varName: string) => {
    const current = selectedVariables?.group
    const newGroup = current === varName ? undefined : varName
    actions.setSelectedVariables?.({
      time: selectedVariables?.time || '',
      event: selectedVariables?.event || '',
      group: newGroup
    })
  }, [selectedVariables, actions])

  const runAnalysis = useCallback(async (vars: KaplanMeierVariables) => {
    if (!uploadedData || !vars.time || !vars.event) {
      actions.setError?.('Please select time and event variables.')
      return
    }

    try {
      actions.startAnalysis?.()

      const data = uploadedData.data
      const times = extractColumnData(data, vars.time)
      const events = extractColumnData(data, vars.event)

      if (times.length < 2) {
        actions.setError?.('Kaplan-Meier requires at least 2 observations.')
        return
      }

      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const result = await pyodideCore.callWorkerMethod<KaplanMeierResults>(
        PyodideWorker.RegressionAdvanced,
        'kaplan_meier_survival',
        { times, events }
      )

      const totalEvents = events.filter(e => e === 1).length
      const totalCensored = events.filter(e => e === 0).length

      const enrichedResult: KaplanMeierResults = {
        ...result,
        sampleSize: times.length,
        totalEvents,
        totalCensored
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(enrichedResult, 3)
      setActiveTab('summary')
    } catch (error) {
      console.error('Kaplan-Meier error:', error)
      actions.setError?.(error instanceof Error ? error.message : 'Analysis failed.')
    }
  }, [uploadedData, actions])

  const handleNextStep = useCallback(async () => {
    if (selectedVariables?.time && selectedVariables?.event) {
      actions.setCurrentStep?.(3)
      await runAnalysis(selectedVariables)
    }
  }, [selectedVariables, actions, runAnalysis])

  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: 'Method Info', completed: currentStep > 0 },
    { id: 1, label: 'Data Upload', completed: !!uploadedData },
    { id: 2, label: 'Select Variables', completed: !!(selectedVariables?.time && selectedVariables?.event) },
    { id: 3, label: 'Results', completed: !!results }
  ], [currentStep, uploadedData, selectedVariables, results])

  const renderMethodIntroduction = useCallback(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Kaplan-Meier Survival Analysis
        </CardTitle>
        <CardDescription>
          Estimate survival function from time-to-event data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-2">Overview</h4>
          <p className="text-sm text-muted-foreground">
            The Kaplan-Meier estimator is a non-parametric statistic used to estimate
            the survival function from lifetime data. It is widely used in medical research
            and reliability engineering.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Key Concepts</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Survival Function S(t):</strong> Probability of surviving beyond time t.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Censoring:</strong> When the event is not observed (patient lost to follow-up).
              </div>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Median Survival:</strong> Time at which S(t) = 0.5.
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Data Requirements</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li><strong>Time variable:</strong> Duration until event or censoring (numeric)</li>
            <li><strong>Event variable:</strong> 1 = event occurred, 0 = censored</li>
            <li><strong>Group variable:</strong> Optional, for comparing survival curves</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Applications</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>Medical: Time to death, relapse, or recovery</li>
            <li>Engineering: Time to equipment failure</li>
            <li>Business: Customer churn analysis</li>
            <li>Ecology: Animal mortality studies</li>
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
        'kaplan-meier'
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

    const isReady = !!(selectedVariables?.time && selectedVariables?.event)

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Select Time Variable
            </CardTitle>
            <CardDescription>
              Select the variable representing time to event or censoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Time should be a positive numeric variable (days, months, years, etc.)
              </AlertDescription>
            </Alert>

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
              Select the variable indicating event occurrence (1) or censoring (0)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Event indicator: 1 = event occurred (death, failure), 0 = censored (lost to follow-up)
              </AlertDescription>
            </Alert>

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
              <Users className="w-5 h-5" />
              Select Group Variable (Optional)
            </CardTitle>
            <CardDescription>
              Compare survival curves between groups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Categorical Variables</Label>
              <div className="flex flex-wrap gap-2">
                {allColumns.map((col) => {
                  const isSelected = selectedVariables?.group === col
                  const isTime = selectedVariables?.time === col
                  const isEvent = selectedVariables?.event === col
                  const isUsed = isTime || isEvent
                  return (
                    <Badge
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-primary/90 transition-colors ${isUsed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !isUsed && handleGroupSelect(col)}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {col}
                    </Badge>
                  )
                })}
              </div>
            </div>

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
  }, [uploadedData, selectedVariables, isAnalyzing, handleTimeSelect, handleEventSelect, handleGroupSelect, handleNextStep])

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

    const survivalTableData = results.times.map((time, idx) => ({
      time: time.toFixed(2),
      survival: (results.survivalFunction[idx] * 100).toFixed(1) + '%',
      nRisk: results.nRisk[idx] || '-'
    }))

    const survivalColumns = [
      { key: 'time', header: 'Time', type: 'text' as const },
      { key: 'survival', header: 'Survival Probability', type: 'text' as const },
      { key: 'nRisk', header: 'At Risk', type: 'text' as const }
    ]

    const eventRate = ((results.totalEvents / results.sampleSize) * 100).toFixed(1)
    const censorRate = ((results.totalCensored / results.sampleSize) * 100).toFixed(1)

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="Kaplan-Meier Survival Analysis"
          analysisSubtitle="Non-parametric Survival Estimation"
          fileName={uploadedData?.fileName}
          variables={[selectedVariables?.time || '', selectedVariables?.event || ''].filter(Boolean)}
          sampleSize={results.sampleSize}
          timestamp={analysisTimestamp ?? undefined}
        />

        <ContentTabs
              tabs={[
                { id: 'summary', label: 'Summary', icon: FileText },
                { id: 'table', label: 'Survival Table', icon: Table },
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
                    <p className="text-xs text-muted-foreground">{eventRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Censored</p>
                    <p className="text-2xl font-bold">{results.totalCensored}</p>
                    <p className="text-xs text-muted-foreground">{censorRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Median Survival</p>
                    <p className="text-2xl font-bold">
                      {results.medianSurvival !== null
                        ? results.medianSurvival.toFixed(2)
                        : 'Not reached'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Median Survival Time:</strong>{' '}
                {results.medianSurvival !== null
                  ? `50% of subjects survived beyond ${results.medianSurvival.toFixed(2)} time units.`
                  : 'Median survival time was not reached during the observation period.'}
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Survival Curve Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Initial survival:</strong> 100% at time 0
                  </p>
                  <p>
                    <strong>Final survival:</strong>{' '}
                    {(results.survivalFunction[results.survivalFunction.length - 1] * 100).toFixed(1)}%
                    at time {results.times[results.times.length - 1].toFixed(2)}
                  </p>
                  <p>
                    <strong>Number of time points:</strong> {results.times.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>

          <ContentTabsContent tabId="table" show={activeResultTab === 'table'} className="space-y-6">
            <StatisticsTable
              columns={survivalColumns}
              data={survivalTableData}
              title="Survival Function Table"
            />
          </ContentTabsContent>

          <ContentTabsContent tabId="interpretation" show={activeResultTab === 'interpretation'} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How to Interpret</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Survival Function S(t)</h4>
                  <p className="text-sm text-muted-foreground">
                    The survival function represents the probability that a subject survives
                    longer than time t. At each event time, the survival probability decreases.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Censoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Censored observations (event=0) occur when subjects are lost to follow-up
                    or the study ends before the event occurs. The Kaplan-Meier estimator
                    properly handles censored data.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Median Survival</h4>
                  <p className="text-sm text-muted-foreground">
                    {results.medianSurvival !== null
                      ? `The median survival time of ${results.medianSurvival.toFixed(2)} indicates that half of the subjects experienced the event by this time.`
                      : 'The median survival was not reached, meaning more than 50% of subjects survived throughout the observation period.'}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Next Steps</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>Compare groups using Log-rank test (if group variable specified)</li>
                    <li>Use Cox regression to identify risk factors</li>
                    <li>Plot survival curves for visualization</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </ContentTabsContent>
        </div>
      </div>
    )
  }, [results, activeTab, uploadedData, selectedVariables, analysisTimestamp])

  return (
    <TwoPanelLayout
      analysisTitle="Kaplan-Meier Survival Analysis"
      analysisSubtitle="Non-parametric Survival Function Estimation"
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
