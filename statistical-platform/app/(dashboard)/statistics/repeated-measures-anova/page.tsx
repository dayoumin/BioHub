'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Layers,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { pyodideCore } from '@/lib/services/pyodide-core'

interface RepeatedMeasuresVariables {
  subjectId?: string
  timeVariables: string[]
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
}

const STEPS = [
  { id: 1, label: '데이터 업로드' },
  { id: 2, label: '변수 선택' },
  { id: 3, label: '결과 확인' }
]

export default function RepeatedMeasuresANOVAPage() {
  useEffect(() => {
    addToRecentStatistics('repeated-measures-anova')
  }, [])

  const { state, actions } = useStatisticsPage<RepeatedMeasuresResults, RepeatedMeasuresVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1,
    initialVariables: { timeVariables: [] }
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  const handleDataUpload = useCallback((file: File, data: Record<string, unknown>[]) => {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    actions.setUploadedData?.({ fileName: file.name, data, columns })
    actions.setCurrentStep(2)
  }, [actions])

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

    actions.setIsAnalyzing?.(true)
    actions.setError?.(null)

    try {
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
      }>(3, 'repeated_measures_anova', {
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
        timePointMeans
      }

      actions.setResults?.(finalResult)
      actions.setCurrentStep(3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      actions.setError?.(errorMessage)
    } finally {
      actions.setIsAnalyzing?.(false)
    }
  }, [uploadedData, selectedVariables, actions])

  const handleReset = useCallback(() => {
    actions.setCurrentStep(1)
    actions.setUploadedData?.(null)
    actions.setSelectedVariables?.({ timeVariables: [] })
    actions.setResults?.(null)
    actions.setError?.(null)
  }, [actions])

  // Step 1: Data Upload
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          데이터 업로드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataUploadStep onDataUpload={handleDataUpload} />

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
            onClick={handleAnalyze}
            disabled={!subjectId || timeVars.length < 2 || isAnalyzing}
          >
            {isAnalyzing ? '분석 중...' : '분석 실행'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // Step 3: Results
  const renderStep3 = () => {
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
        {/* Main Results Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.pValue < 0.05 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
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

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{interpretation}</AlertDescription>
            </Alert>
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
                { header: '변동 요인', accessor: 'source' },
                { header: '제곱합 (SS)', accessor: 'ss', format: (v) => v.toFixed(3) },
                { header: '자유도 (df)', accessor: 'df', format: (v) => v.toFixed(0) },
                { header: '평균제곱 (MS)', accessor: 'ms', format: (v) => v.toFixed(3) },
                { header: 'F', accessor: 'f', format: (v) => v === 0 ? '-' : v.toFixed(3) },
                { header: 'p-value', accessor: 'p', format: (v) => v === 0 ? '-' : v.toFixed(4) }
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
                { header: '시간대', accessor: 'timePoint' },
                { header: '평균', accessor: 'mean', format: (v) => v.toFixed(3) },
                { header: '표준편차', accessor: 'std', format: (v) => v.toFixed(3) },
                { header: '표본 크기', accessor: 'n', format: (v) => v.toFixed(0) },
                { header: '95% CI', accessor: 'ci', format: (v) => `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}]` }
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
    status: currentStep > step.id ? 'completed' : currentStep === step.id ? 'current' : 'upcoming'
  }))

  return (
    <TwoPanelLayout
      title="반복측정 분산분석"
      subtitle="Repeated Measures ANOVA"
      description="동일한 피험자에서 여러 시점에 걸쳐 반복 측정한 데이터의 평균 차이를 검정합니다."
      steps={steps}
      currentStep={currentStep}
      exampleSection={{
        title: '분석 예시',
        items: [
          '어류 성장 실험: 동일한 개체의 주간별 체중 변화 (Week1, Week2, Week3)',
          '약물 효과 평가: 투약 전/후/추적 시점의 혈압 변화',
          '학습 효과 검증: 동일 학생의 월별 시험 점수 변화'
        ]
      }}
      assumptionsSection={{
        title: '분석 가정',
        items: [
          '정규성: 각 시간대의 측정값이 정규분포를 따름',
          '구형성: 차이 점수들의 분산이 동일함 (Mauchly\'s test)',
          '독립성: 피험자 간 측정값이 독립적임'
        ]
      }}
      interpretationSection={{
        title: '결과 해석',
        items: [
          'p < 0.05: 시간에 따른 유의한 변화가 있음',
          '구형성 위배 시: Greenhouse-Geisser 또는 Huynh-Feldt 보정 사용',
          '유의한 결과 시: 사후검정으로 어느 시점 간 차이가 있는지 확인'
        ]
      }}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </TwoPanelLayout>
  )
}
