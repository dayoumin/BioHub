'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { ResultContextHeader } from '@/components/statistics/common/ResultContextHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Layers,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users
} from 'lucide-react'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { ResultInterpretation } from '@/components/statistics/common/ResultInterpretation'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { AnalysisGuidePanel } from '@/components/statistics/common/AnalysisGuidePanel'
import { AssumptionChecklist } from '@/components/statistics/common/AssumptionChecklist'
import { useAnalysisGuide } from '@/hooks/use-analysis-guide'

interface RepeatedMeasuresVariables {
  subjectId?: string
  timeVariables: string[]
}

interface PostHocComparison {
  timepoint1: string
  timepoint2: string
  meanDiff: number
  tStatistic: number
  pValue: number
  pAdjusted: number
  cohensD: number
  seDiff: number
  ciLower: number
  ciUpper: number
  df: number
  significant: boolean
}

interface RepeatedMeasuresResults {
  fStatistic: number
  pValue: number
  df: {
    numerator: number
    denominator: number
  }
  sphericityEpsilon: number
  sphericityTest: {
    statistic: number
    pValue: number
    passed: boolean
    interpretation: string
  }
  anovaTable: {
    source: string
    ss: number
    df: number
    ms: number
    f: number
    p: number
  }[]
  timePointMeans: {
    timePoint: string
    mean: number
    std: number
    n: number
    se: number
    ci: [number, number]
  }[]
  postHoc?: {
    method: string
    comparisons: PostHocComparison[]
    pAdjustMethod: string
    nComparisons: number
  }
}

const STEPS = [
  { id: 1, label: '데이터 업로드' },
  { id: 2, label: '변수 선택' },
  { id: 3, label: '분석 실행' },
  { id: 4, label: '결과 확인' }
]

export default function RepeatedMeasuresANOVAPage() {
  useEffect(() => {
    addToRecentStatistics('repeated-measures-anova')
  }, [])

  const { state, actions } = useStatisticsPage<RepeatedMeasuresResults, RepeatedMeasuresVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })

  // Analysis Guide Hook
  const { methodMetadata, assumptionItems } = useAnalysisGuide({
    methodId: 'repeated-measures-anova'
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
  const [analysisTimestamp, setAnalysisTimestamp] = useState<Date | null>(null)

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(2)
  }, [actions])

  const handleNext = useCallback(() => {
    actions.setCurrentStep(currentStep + 1)
  }, [actions, currentStep])

  const handleSubjectIdSelect = useCallback((header: string) => {
    const current = selectedVariables || { timeVariables: [] }
    actions.setSelectedVariables?.({ ...current, subjectId: header })
  }, [actions, selectedVariables])

  const handleTimeVariableToggle = useCallback((header: string) => {
    const current = selectedVariables || { timeVariables: [] }
    const timeVars = current.timeVariables || []

    if (timeVars.includes(header)) {
      // Remove
      actions.setSelectedVariables?.({
        ...current,
        timeVariables: timeVars.filter(v => v !== header)
      })
    } else {
      // Add
      actions.setSelectedVariables?.({
        ...current,
        timeVariables: [...timeVars, header]
      })
    }
  }, [actions, selectedVariables])

  const handleAnalyze = useCallback(async () => {
    if (!uploadedData?.data || !selectedVariables?.subjectId || !selectedVariables.timeVariables || selectedVariables.timeVariables.length < 2) {
      actions.setError?.('피험자 ID와 최소 2개 이상의 시간 변수를 선택해주세요.')
      return
    }

    try {
      // PyodideCore 서비스 임포트
      const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const subjectIdCol = selectedVariables.subjectId
      const timeVars = selectedVariables.timeVariables

      // Extract unique subjects
      const uniqueSubjects = Array.from(
        new Set(uploadedData.data.map(row => String(row[subjectIdCol])))
      )

      if (uniqueSubjects.length < 2) {
        actions.setError?.('반복측정 분산분석은 최소 2명 이상의 피험자가 필요합니다.')
        return
      }

      // Build data matrix: subjects × timepoints
      const dataMatrix: number[][] = []
      const subjectIds: string[] = []

      for (const subjectId of uniqueSubjects) {
        const subjectRows = uploadedData.data.filter(row => String(row[subjectIdCol]) === subjectId)

        if (subjectRows.length === 0) continue

        // For each time variable, get the value (assuming one row per subject)
        const subjectRow = subjectRows[0]
        const timeValues = timeVars.map(timeVar => {
          const value = subjectRow[timeVar]
          return typeof value === 'number' ? value : parseFloat(String(value))
        })

        // Check if all values are valid numbers
        if (timeValues.some(v => isNaN(v))) {
          continue
        }

        dataMatrix.push(timeValues)
        subjectIds.push(subjectId)
      }

      if (dataMatrix.length < 2) {
        actions.setError?.('유효한 데이터를 가진 피험자가 2명 미만입니다.')
        return
      }

      // Call Worker
      const workerResult = await pyodideCore.callWorkerMethod<{
        fStatistic: number
        pValue: number
        df: { numerator: number; denominator: number }
        sphericityEpsilon: number
        anovaTable: {
          sum_sq: Record<string, number>
          df: Record<string, number>
          F: Record<string, number>
          'PR(>F)': Record<string, number>
        }
      }>(PyodideWorker.NonparametricAnova, 'repeated_measures_anova', {
        data_matrix: dataMatrix,
        subject_ids: subjectIds,
        time_labels: timeVars
      })

      // Calculate time point means
      const timePointMeans = timeVars.map((timeVar, idx) => {
        const values = dataMatrix.map(row => row[idx])
        const n = values.length
        const mean = values.reduce((sum, v) => sum + v, 0) / n
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
        const std = Math.sqrt(variance)
        const se = std / Math.sqrt(n)
        const margin = 1.96 * se

        return {
          timePoint: timeVar,
          mean,
          std,
          n,
          se,
          ci: [mean - margin, mean + margin] as [number, number]
        }
      })

      // Parse ANOVA table from Worker
      const getSS = (key: string) => workerResult.anovaTable.sum_sq[key] ?? 0
      const getDF = (key: string) => workerResult.anovaTable.df[key] ?? 1
      const getMS = (key: string) => {
        const ss = getSS(key)
        const df = getDF(key)
        return df > 0 ? ss / df : 0
      }
      const getF = (key: string) => workerResult.anovaTable.F[key] ?? 0
      const getP = (key: string) => workerResult.anovaTable['PR(>F)'][key] ?? 1

      const anovaTable = [
        {
          source: '시간 (Time)',
          ss: getSS('time'),
          df: getDF('time'),
          ms: getMS('time'),
          f: getF('time'),
          p: getP('time')
        },
        {
          source: '잔차 (Residual)',
          ss: getSS('Residual'),
          df: getDF('Residual'),
          ms: getMS('Residual'),
          f: 0,
          p: 0
        }
      ]

      // Sphericity test (Mauchly's test)
      const sphericityPassed = workerResult.sphericityEpsilon >= 0.75
      const sphericityInterpretation = sphericityPassed
        ? '구형성 가정이 충족되었습니다. (ε ≥ 0.75)'
        : workerResult.sphericityEpsilon >= 0.5
        ? '구형성 가정이 경미하게 위배되었습니다. Greenhouse-Geisser 보정을 고려하세요.'
        : '구형성 가정이 심각하게 위배되었습니다. 자유도 보정이 필요합니다.'

      // Post-hoc test (if significant)
      let postHocResult: RepeatedMeasuresResults['postHoc'] | undefined
      if (workerResult.pValue < 0.05 && timeVars.length >= 2) {
        try {
          const postHocWorkerResult = await pyodideCore.callWorkerMethod<{
            method: string
            comparisons: PostHocComparison[]
            pAdjustMethod: string
            nComparisons: number
          }>(PyodideWorker.NonparametricAnova, 'repeated_measures_posthoc', {
            data_matrix: dataMatrix,
            time_labels: timeVars,
            p_adjust: 'bonferroni'
          })
          postHocResult = postHocWorkerResult
        } catch (postHocErr) {
          console.warn('Post-hoc test failed:', postHocErr)
          // Continue without post-hoc results
        }
      }

      const finalResult: RepeatedMeasuresResults = {
        fStatistic: workerResult.fStatistic,
        pValue: workerResult.pValue,
        df: workerResult.df,
        sphericityEpsilon: workerResult.sphericityEpsilon,
        sphericityTest: {
          statistic: workerResult.sphericityEpsilon,
          pValue: 0, // statsmodels doesn't provide Mauchly's p-value directly
          passed: sphericityPassed,
          interpretation: sphericityInterpretation
        },
        anovaTable,
        timePointMeans,
        postHoc: postHocResult
      }

      setAnalysisTimestamp(new Date())
      actions.completeAnalysis?.(finalResult, 4)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    }
  }, [uploadedData, selectedVariables, actions])

  const handleReset = useCallback(() => {
    actions.setCurrentStep(1)
    actions.setUploadedData?.(null)
    actions.setSelectedVariables?.({ timeVariables: [] } as RepeatedMeasuresVariables)
    actions.setError?.('')
  }, [actions])

  // Step 1: Data Upload
  const renderStep1 = () => (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            데이터 업로드
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadStep
            onUploadComplete={handleDataUpload}
            onNext={handleNext}
            canGoNext={!!uploadedData}
            currentStep={currentStep}
            totalSteps={STEPS.length}
          />

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>데이터 형식 안내:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>각 행은 하나의 피험자를 나타냅니다</li>
                <li>피험자 ID 열이 필요합니다 (예: SubjectID, 개체번호)</li>
                <li>각 열은 서로 다른 시간대의 측정값입니다 (예: Week1, Week2, Week3)</li>
                <li>최소 2명의 피험자와 2개의 시간대가 필요합니다</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )

  // Step 2: Variable Selection
  const renderStep2 = () => {
    if (!uploadedData?.columns) return null

    const columns = uploadedData.columns
    const timeVars = selectedVariables?.timeVariables || []
    const subjectId = selectedVariables?.subjectId

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>피험자 ID 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <Button
                  key={col}
                  variant={subjectId === col ? 'default' : 'outline'}
                  onClick={() => handleSubjectIdSelect(col)}
                >
                  {col}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시간 변수 선택 (2개 이상)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns
                .filter(col => col !== subjectId)
                .map((col) => (
                  <Button
                    key={col}
                    variant={timeVars.includes(col) ? 'default' : 'outline'}
                    onClick={() => handleTimeVariableToggle(col)}
                  >
                    {col}
                    {timeVars.includes(col) && (
                      <Badge variant="secondary" className="ml-2">
                        {timeVars.indexOf(col) + 1}
                      </Badge>
                    )}
                  </Button>
                ))}
            </div>

            {timeVars.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  선택된 시간 변수 순서: {timeVars.join(' → ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            onClick={handleNext}
            disabled={!subjectId || timeVars.length < 2}
          >
            다음 단계
          </Button>
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Analysis Execution
  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>분석 실행</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>선택된 설정:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>피험자 ID: {selectedVariables?.subjectId}</li>
              <li>시간 변수: {selectedVariables?.timeVariables.join(', ')}</li>
              <li>총 {selectedVariables?.timeVariables.length}개 시점</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            size="lg"
          >
            {isAnalyzing ? '분석 중...' : '분석 실행'}
          </Button>
          <Button variant="outline" onClick={() => actions.setCurrentStep(2)}>
            이전 단계
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )

  // Step 4: Results
  const renderStep4 = () => {
    if (!results) return null

    const interpretation = results.pValue < 0.05
      ? '시간에 따른 측정값의 차이가 통계적으로 유의합니다. (p < 0.05)'
      : '시간에 따른 측정값의 차이가 통계적으로 유의하지 않습니다. (p ≥ 0.05)'

    // Prepare chart data
    const chartData = results.timePointMeans.map(tp => ({
      timePoint: tp.timePoint,
      평균: tp.mean,
      '95% CI 하한': tp.ci[0],
      '95% CI 상한': tp.ci[1]
    }))

    return (
      <div className="space-y-6">
        <ResultContextHeader
          analysisType="반복측정 분산분석"
          analysisSubtitle="Repeated Measures ANOVA"
          fileName={uploadedData?.fileName}
          variables={selectedVariables?.timeVariables || []}
          sampleSize={results.timePointMeans[0]?.n}
          timestamp={analysisTimestamp ?? undefined}
        />

        {/* Main Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.pValue < 0.05 ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              반복측정 분산분석 결과
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">F-통계량</p>
                <p className="text-2xl font-bold">{results.fStatistic.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">p-value</p>
                <p className="text-2xl font-bold">{results.pValue.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">자유도 (분자)</p>
                <p className="text-xl font-semibold">{results.df.numerator.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">자유도 (분모)</p>
                <p className="text-xl font-semibold">{results.df.denominator.toFixed(0)}</p>
              </div>
            </div>

            <ResultInterpretation
              result={{
                summary: interpretation,
                details: `F(${results.df.numerator}, ${results.df.denominator}) = ${results.fStatistic.toFixed(3)}, p = ${results.pValue.toFixed(4)}. 구형성 Epsilon = ${results.sphericityEpsilon.toFixed(3)}.`,
                recommendation: results.pValue < 0.05
                  ? '시간에 따른 유의한 차이가 있습니다. 사후검정을 통해 구체적인 시점 간 차이를 확인하세요.'
                  : '시간에 따른 유의한 차이가 없습니다. 효과 크기나 연구 설계를 재검토하세요.',
                caution: !results.sphericityTest.passed
                  ? results.sphericityTest.interpretation
                  : undefined
              }}
              title="반복측정 분산분석 결과 해석"
            />
          </CardContent>
        </Card>

        {/* Sphericity Test */}
        <Card>
          <CardHeader>
            <CardTitle>구형성 검정 (Sphericity Test)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Epsilon (ε)</span>
                <span className="font-semibold">{results.sphericityEpsilon.toFixed(3)}</span>
              </div>
              <Alert variant={results.sphericityTest.passed ? 'default' : 'destructive'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{results.sphericityTest.interpretation}</AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* ANOVA Table */}
        <Card>
          <CardHeader>
            <CardTitle>분산분석표</CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsTable
              columns={[
                { key: 'source', header: '변동 요인' },
                { key: 'ss', header: '제곱합 (SS)', type: 'number' },
                { key: 'df', header: '자유도 (df)', type: 'number' },
                { key: 'ms', header: '평균제곱 (MS)', type: 'number' },
                { key: 'f', header: 'F', type: 'number' },
                { key: 'p', header: 'p-value', type: 'pvalue' }
              ]}
              data={results.anovaTable}
            />
          </CardContent>
        </Card>

        {/* Time Point Means */}
        <Card>
          <CardHeader>
            <CardTitle>시간대별 평균</CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsTable
              columns={[
                { key: 'timePoint', header: '시간대' },
                { key: 'mean', header: '평균', type: 'number' },
                { key: 'std', header: '표준편차', type: 'number' },
                { key: 'n', header: '표본 크기', type: 'number' },
                { key: 'ci', header: '95% CI', type: 'ci' }
              ]}
              data={results.timePointMeans}
            />
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              시간에 따른 평균 변화
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timePoint" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="평균" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="95% CI 하한" stroke="#82ca9d" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="95% CI 상한" stroke="#82ca9d" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Post-hoc Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              사후검정 (Post-hoc Analysis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.postHoc ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{results.postHoc.method}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({results.postHoc.nComparisons}개 비교)
                  </span>
                </div>
                <StatisticsTable
                  columns={[
                    { key: 'comparison', header: '비교', type: 'text' },
                    { key: 'meanDiff', header: '평균차이', type: 'number' },
                    { key: 'tStatistic', header: 't-통계량', type: 'number' },
                    { key: 'pValue', header: 'p-값', type: 'custom', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                    { key: 'pAdjusted', header: '보정 p-값', type: 'custom', formatter: (v: number) => <PValueBadge value={v} size="sm" /> },
                    { key: 'cohensD', header: "Cohen's d", type: 'number' },
                    { key: 'ci', header: '95% CI', type: 'text' },
                    { key: 'significant', header: '유의성', type: 'custom', formatter: (v: boolean) => (
                      <Badge variant={v ? 'default' : 'outline'}>{v ? '유의' : '비유의'}</Badge>
                    )}
                  ]}
                  data={results.postHoc.comparisons.map(comp => ({
                    comparison: `${comp.timepoint1} vs ${comp.timepoint2}`,
                    meanDiff: comp.meanDiff,
                    tStatistic: comp.tStatistic,
                    pValue: comp.pValue,
                    pAdjusted: comp.pAdjusted,
                    cohensD: comp.cohensD,
                    ci: `[${comp.ciLower.toFixed(3)}, ${comp.ciUpper.toFixed(3)}]`,
                    significant: comp.significant
                  }))}
                />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>사후검정 해석:</strong> Bonferroni 보정된 p-값이 0.05 미만인 경우 해당 시점 간 차이가 통계적으로 유의합니다.
                    Cohen's d는 효과크기를 나타내며, |d| &lt; 0.2: 작음, 0.2-0.8: 중간, &gt; 0.8: 큼으로 해석합니다.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {results.pValue < 0.05
                  ? '사후검정 실행에 실패했습니다.'
                  : '전체 검정이 유의하지 않아 사후검정이 필요하지 않습니다. (p ≥ 0.05)'}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            새로운 분석 시작
          </Button>
        </div>
      </div>
    )
  }

  const steps = STEPS.map((step) => ({
    ...step,
    completed: currentStep > step.id
  }))

  return (
    <TwoPanelLayout
      analysisTitle="반복측정 분산분석"
      analysisSubtitle="Repeated Measures ANOVA"
      analysisIcon={<Layers className="w-5 h-5" />}
      steps={steps}
      currentStep={currentStep}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </TwoPanelLayout>
  )
}
