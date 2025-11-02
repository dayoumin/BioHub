'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  GitBranch,
  BarChart3,
  Download,
  Play,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'

interface WelchTResults {
  group1: {
    name: string
    n: number
    mean: number
    std: number
    se: number
  }
  group2: {
    name: string
    n: number
    mean: number
    std: number
    se: number
  }
  welchStatistic: number
  adjustedDF: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  effectSize: number
  meanDifference: number
  pooledSE: number
  interpretation: string
  conclusion: string
  equalVariances: {
    leveneStatistic: number
    levenePValue: number
    assumption: 'met' | 'violated'
  }
  regularTTest?: {
    tStatistic: number
    pValue: number
    df: number
  }
}

export default function WelchTPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<WelchTResults, VariableMapping>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, results, isAnalyzing, error, selectedVariables } = state
  const variableMapping = selectedVariables || {}

  const [activeTab, setActiveTab] = useState('summary')
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const [alternative, setAlternative] = useState('two-sided')
  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'upload-data',
      number: 0,
      title: '데이터 업로드',
      description: '분석할 CSV/Excel 파일 업로드',
      status: uploadedData ? 'completed' : 'current'
    },
    {
      id: 'select-variables',
      number: 1,
      title: '변수 선택',
      description: '그룹 변수와 검정 변수 선택',
      status: uploadedData && Object.keys(variableMapping).length >= 2 ? 'completed' : (uploadedData ? 'current' : 'pending')
    },
    {
      id: 'set-hypothesis',
      number: 2,
      title: '가설 설정',
      description: '대립가설 및 신뢰수준 설정',
      status: Object.keys(variableMapping).length >= 2 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: 'Welch t-검정 수행',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 해석',
      description: '검정 결과 및 등분산 가정 확인',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    actions.startAnalysis()

    try {
      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const mockResults: WelchTResults = {
        group1: {
          name: '그룹 A',
          n: 25,
          mean: 78.4,
          std: 12.3,
          se: 2.46
        },
        group2: {
          name: '그룹 B',
          n: 30,
          mean: 72.1,
          std: 8.7,
          se: 1.59
        },
        welchStatistic: 2.14,
        adjustedDF: 42.7,
        pValue: 0.038,
        confidenceLevel: parseFloat(confidenceLevel),
        ciLower: 0.3,
        ciUpper: 12.3,
        effectSize: 0.61,
        meanDifference: 6.3,
        pooledSE: 2.94,
        interpretation: 'p < 0.05이므로 두 그룹 간 유의한 차이가 있습니다',
        conclusion: '등분산 가정을 하지 않더라도 그룹 A와 그룹 B의 평균에 통계적으로 유의한 차이가 있습니다',
        equalVariances: {
          leveneStatistic: 3.84,
          levenePValue: 0.055,
          assumption: 'violated'
        },
        regularTTest: {
          tStatistic: 2.08,
          pValue: 0.042,
          df: 53
        }
      }

      actions.completeAnalysis(mockResults, 4)
      setActiveTab('summary')
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    }
  }

  // 단계 변경 처리
  const handleStepChange = (step: number) => {
    if (step <= currentStep + 1) {
      actions.setCurrentStep(step)
    }
  }

  // 초기화
  const handleReset = () => {
    actions.reset()
    setActiveTab('summary')
  }

  // 변수 선택 핸들러
  const handleVariablesSelected = useCallback((mapping: unknown) => {
    if (!mapping || typeof mapping !== 'object') return

    if (!actions.setSelectedVariables) {
      console.error('[WelchT] setSelectedVariables not available')
      return
    }

    actions.setSelectedVariables(mapping as VariableMapping)
    if (Object.keys(mapping as Record<string, unknown>).length >= 2) {
      actions.setCurrentStep(1)
    }
  }, [actions])

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = () => {
    if (!results) return null

    const data = [{
      test: 'Welch t-검정',
      statistic: results.welchStatistic.toFixed(3),
      df: results.adjustedDF.toFixed(1),
      pValue: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
      effectSize: results.effectSize.toFixed(3),
      interpretation: results.interpretation
    }]

    // 일반 t-검정과 비교
    if (results.regularTTest) {
      data.push({
        test: '일반 t-검정 (참고)',
        statistic: results.regularTTest.tStatistic.toFixed(3),
        df: results.regularTTest.df.toString(),
        pValue: results.regularTTest.pValue < 0.001 ? '< 0.001' : results.regularTTest.pValue.toFixed(3),
        effectSize: results.effectSize.toFixed(3),
        interpretation: '등분산 가정 시의 결과'
      })
    }

    const columns = [
      { key: 'test', header: '검정 방법', type: 'text' as const },
      { key: 'statistic', header: 't 통계량', type: 'text' as const },
      { key: 'df', header: '자유도', type: 'text' as const },
      { key: 'pValue', header: 'p-값', type: 'text' as const },
      { key: 'effectSize', header: 'Cohen\'s d', type: 'text' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="Welch t-검정 결과"
      />
    )
  }

  // 그룹별 기술통계 테이블
  const renderDescriptiveTable = () => {
    if (!results) return null

    const data = [
      {
        group: results.group1.name,
        n: results.group1.n,
        mean: results.group1.mean.toFixed(2),
        std: results.group1.std.toFixed(2),
        se: results.group1.se.toFixed(3)
      },
      {
        group: results.group2.name,
        n: results.group2.n,
        mean: results.group2.mean.toFixed(2),
        std: results.group2.std.toFixed(2),
        se: results.group2.se.toFixed(3)
      }
    ]

    const columns = [
      { key: 'group', header: '그룹', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'text' as const },
      { key: 'std', header: '표준편차', type: 'text' as const },
      { key: 'se', header: '표준오차', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="그룹별 기술통계"
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
                <p className="text-sm text-muted-foreground">Welch t 통계량</p>
                <p className="text-2xl font-bold">{results.welchStatistic.toFixed(2)}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">조정된 자유도</p>
                <p className="text-2xl font-bold">{results.adjustedDF.toFixed(1)}</p>
              </div>
              <GitBranch className="w-8 h-8 text-muted-foreground/20" />
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
              <BarChart3 className={`w-8 h-8 ${isSignificant ? 'text-green-500/50' : 'text-red-500/50'}`} />
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

  // 등분산 가정 검토
  const renderVarianceAssumption = () => {
    if (!results) return null

    const isViolated = results.equalVariances.assumption === 'violated'

    return (
      <Card className={isViolated ? 'border bg-muted dark:bg-orange-950/20' : 'border bg-muted dark:bg-green-950/20'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isViolated ? (
              <XCircle className="w-5 h-5 text-muted-foreground" />
            ) : (
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            )}
            등분산 가정 검토 (Levene 검정)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Levene 통계량</p>
              <p className="text-lg font-semibold">{results.equalVariances.leveneStatistic.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">p-값</p>
              <p className="text-lg font-semibold">
                {results.equalVariances.levenePValue.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">가정 상태</p>
              <Badge variant={isViolated ? 'destructive' : 'default'}>
                {isViolated ? '위반' : '충족'}
              </Badge>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${isViolated ? 'bg-muted dark:bg-orange-950/40' : 'bg-muted dark:bg-green-950/40'}`}>
            <p className={`text-sm ${isViolated ? ' dark:text-orange-200' : ' dark:text-green-200'}`}>
              {isViolated ? (
                <>
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  등분산 가정이 위반되었습니다. Welch t-검정이 적절한 선택입니다.
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  등분산 가정이 충족되지만, Welch t-검정도 유효한 결과를 제공합니다.
                </>
              )}
            </p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold mb-2">Welch t-검정의 장점:</h4>
            <ul className="text-sm space-y-1">
              <li>• 등분산 가정을 하지 않음</li>
              <li>• 표본크기가 다를 때 더욱 안정적</li>
              <li>• Type I 오류율을 더 잘 통제</li>
              <li>• 분산이 크게 다를 때 더 정확함</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 신뢰구간 정보
  const renderConfidenceInterval = () => {
    if (!results) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            평균 차이의 {results.confidenceLevel}% 신뢰구간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-2xl font-bold">
              [{results.ciLower.toFixed(2)}, {results.ciUpper.toFixed(2)}]
            </p>
            <p className="text-sm text-muted-foreground">
              평균 차이: {results.meanDifference.toFixed(2)}
            </p>
          </div>

          <div className="p-3 bg-muted dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-muted-foreground dark:text-blue-300">
              <strong>해석:</strong> {results.confidenceLevel}% 확률로 두 그룹의 실제 평균 차이는
              {results.ciLower.toFixed(2)}과 {results.ciUpper.toFixed(2)} 사이에 있습니다.
              {results.ciLower * results.ciUpper > 0
                ? ' 신뢰구간이 0을 포함하지 않으므로 유의한 차이가 있습니다.'
                : ' 신뢰구간이 0을 포함하므로 유의한 차이가 없습니다.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="Welch t-검정"
      subtitle="등분산 가정 없이 두 독립집단의 평균 비교"
      icon={<Calculator className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "t = (x̄₁ - x̄₂) / √(s₁²/n₁ + s₂²/n₂), df = Welch-Satterthwaite",
        assumptions: ["정규분포 또는 n≥30", "독립적인 관측값", "등분산 가정 불필요"],
        sampleSize: "각 그룹 최소 5개 (30개 이상 권장)",
        usage: "분산이 다른 두 그룹의 평균 비교"
      }}
    >
      <div className="space-y-6">
        {/* 0단계: 데이터 업로드 */}
        {currentStep === 0 && !uploadedData && (
          <DataUploadStep
            onUploadComplete={(file: File, data: Record<string, unknown>[]) => {
              if (actions.setUploadedData) {
                actions.setUploadedData({
                  data,
                  fileName: file.name,
                  columns: data.length > 0 ? Object.keys(data[0]) : []
                } as UploadedData)
                actions.setCurrentStep(1)
              }
            }}
          />
        )}

        {/* 1단계: 변수 선택 */}
        {currentStep === 1 && uploadedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                변수 선택
              </CardTitle>
              <CardDescription>
                그룹을 구분할 범주형 변수와 비교할 수치형 변수를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                methodId="welch-t"
                data={uploadedData.data}
                onVariablesSelected={handleVariablesSelected}
                onBack={() => actions.reset()}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 가설 설정 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                가설 설정 및 옵션
              </CardTitle>
              <CardDescription>
                대립가설과 신뢰수준을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">대립가설</label>
                  <Select value={alternative} onValueChange={setAlternative}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">μ₁ ≠ μ₂ (양측검정)</SelectItem>
                      <SelectItem value="greater">μ₁ &gt; μ₂ (우측검정)</SelectItem>
                      <SelectItem value="less">μ₁ &lt; μ₂ (좌측검정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">신뢰수준</label>
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

              <div className="p-4 bg-muted dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">Welch t-검정의 특징</h4>
                <ul className="text-sm space-y-1">
                  <li>• 등분산 가정을 하지 않음 (Unequal variance t-test)</li>
                  <li>• Welch-Satterthwaite 공식으로 자유도 조정</li>
                  <li>• 일반 t-검정보다 보수적이지만 더 정확함</li>
                  <li>• 표본크기가 다르거나 분산이 다를 때 권장</li>
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(3)}
                  disabled={Object.keys(variableMapping).length < 2}
                >
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3단계: 분석 실행 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                분석 실행
              </CardTitle>
              <CardDescription>
                Welch t-검정을 실행하고 등분산 가정을 함께 확인합니다
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
                  {isAnalyzing ? '분석 중...' : 'Welch t-검정 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 4 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="results">검정결과</TabsTrigger>
              <TabsTrigger value="assumptions">가정검토</TabsTrigger>
              <TabsTrigger value="confidence">신뢰구간</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
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
              {renderVarianceAssumption()}
            </TabsContent>

            <TabsContent value="confidence" className="space-y-6">
              {renderConfidenceInterval()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    Welch t-검정 결과를 다양한 형식으로 내보낼 수 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      PDF 보고서
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      통계 보고서
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StatisticsPageLayout>
  )
}