'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GitBranch,
  Calculator,
  PieChart,
  Download,
  Play,
  Info,
  BarChart3,
  Percent
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface CrossTabCell {
  rowCategory: string
  colCategory: string
  observed: number
  expected?: number
  rowPercent: number
  colPercent: number
  totalPercent: number
  standardizedResidual?: number
}

interface CrossTabResults {
  rowVariable: string
  colVariable: string
  data: CrossTabCell[]
  rowTotals: Array<{
    category: string
    count: number
    percent: number
  }>
  colTotals: Array<{
    category: string
    count: number
    percent: number
  }>
  grandTotal: number
  chiSquareTest?: {
    statistic: number
    pValue: number
    df: number
    criticalValue: number
    isSignificant: boolean
    cramersV: number
  }
  fishersExactTest?: {
    pValue: number
    oddsRatio: number
    ciLower: number
    ciUpper: number
  }
}

export default function CrossTabulationPage() {
  const { state, actions } = useStatisticsPage<CrossTabResults>({
    withUploadedData: false,
    withError: false
  })
  const { currentStep, variableMapping, results, isAnalyzing } = state
  const [activeTab, setActiveTab] = useState('summary')

  // 분석 옵션
  const [showExpected, setShowExpected] = useState(true)
  const [showResiduals, setShowResiduals] = useState(false)
  const [includeChiSquare, setIncludeChiSquare] = useState(true)
  const [includeFisher, setIncludeFisher] = useState(false)
  const [percentageType, setPercentageType] = useState('total')

  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'select-variables',
      number: 1,
      title: '변수 선택',
      description: '두 범주형 변수 선택',
      status: Object.keys(variableMapping).length >= 2 ? 'completed' : 'current'
    },
    {
      id: 'configure-options',
      number: 2,
      title: '분석 옵션',
      description: '교차표 형식 및 검정 설정',
      status: Object.keys(variableMapping).length >= 2 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: '교차표 생성 및 독립성 검정',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 확인',
      description: '교차표 및 통계 검정 결과',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    actions.startAnalysis()()

    // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
    setTimeout(() => {
      const mockResults: CrossTabResults = {
        rowVariable: '성별',
        colVariable: '선호도',
        data: [
          {
            rowCategory: '남성',
            colCategory: '좋음',
            observed: 25,
            expected: 22.5,
            rowPercent: 50.0,
            colPercent: 55.6,
            totalPercent: 25.0,
            standardizedResidual: 0.53
          },
          {
            rowCategory: '남성',
            colCategory: '보통',
            observed: 15,
            expected: 17.5,
            rowPercent: 30.0,
            colPercent: 42.9,
            totalPercent: 15.0,
            standardizedResidual: -0.60
          },
          {
            rowCategory: '남성',
            colCategory: '나쁨',
            observed: 10,
            expected: 10.0,
            rowPercent: 20.0,
            colPercent: 50.0,
            totalPercent: 10.0,
            standardizedResidual: 0.00
          },
          {
            rowCategory: '여성',
            colCategory: '좋음',
            observed: 20,
            expected: 22.5,
            rowPercent: 40.0,
            colPercent: 44.4,
            totalPercent: 20.0,
            standardizedResidual: -0.53
          },
          {
            rowCategory: '여성',
            colCategory: '보통',
            observed: 20,
            expected: 17.5,
            rowPercent: 40.0,
            colPercent: 57.1,
            totalPercent: 20.0,
            standardizedResidual: 0.60
          },
          {
            rowCategory: '여성',
            colCategory: '나쁨',
            observed: 10,
            expected: 10.0,
            rowPercent: 20.0,
            colPercent: 50.0,
            totalPercent: 10.0,
            standardizedResidual: 0.00
          }
        ],
        rowTotals: [
          { category: '남성', count: 50, percent: 50.0 },
          { category: '여성', count: 50, percent: 50.0 }
        ],
        colTotals: [
          { category: '좋음', count: 45, percent: 45.0 },
          { category: '보통', count: 35, percent: 35.0 },
          { category: '나쁨', count: 20, percent: 20.0 }
        ],
        grandTotal: 100,
        chiSquareTest: {
          statistic: 0.714,
          pValue: 0.700,
          df: 2,
          criticalValue: 5.991,
          isSignificant: false,
          cramersV: 0.085
        },
        fishersExactTest: {
          pValue: 0.731,
          oddsRatio: 1.33,
          ciLower: 0.65,
          ciUpper: 2.72
        }
      }

      actions.setResults(mockResults)
      setActiveTab('summary')
    }, 1500)
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

  // 교차표 렌더링
  const renderCrossTable = () => {
    if (!results) return null

    // 행과 열 카테고리 추출
    const rowCategories = [...new Set(results.data.map(d => d.rowCategory))]
    const colCategories = [...new Set(results.data.map(d => d.colCategory))]

    const tableData: Record<string, string | number>[] = rowCategories.map(rowCat => {
      const rowData: Record<string, string | number> = { category: rowCat }

      colCategories.forEach(colCat => {
        const cell = results.data.find(d => d.rowCategory === rowCat && d.colCategory === colCat)
        if (cell) {
          let cellValue = cell.observed.toString()
          if (showExpected) {
            cellValue += ` (${cell.expected?.toFixed(1)})`
          }
          if (showResiduals) {
            cellValue += `\n잔차: ${cell.standardizedResidual?.toFixed(2)}`
          }
          rowData[colCat] = cellValue
        }
      })

      // 행 합계
      const rowTotal = results.rowTotals.find(r => r.category === rowCat)
      rowData.total = `${rowTotal?.count} (${rowTotal?.percent.toFixed(1)}%)`

      return rowData
    })

    // 열 합계 행 추가
    const colTotalRow: Record<string, string | number> = { category: '합계' }
    colCategories.forEach(colCat => {
      const colTotal = results.colTotals.find(c => c.category === colCat)
      colTotalRow[colCat] = `${colTotal?.count} (${colTotal?.percent.toFixed(1)}%)`
    })
    colTotalRow.total = `${results.grandTotal} (100.0%)`
    tableData.push(colTotalRow)

    const columns = [
      { key: 'category', header: `${results.rowVariable} \\ ${results.colVariable}`, type: 'text' as const },
      ...colCategories.map(col => ({ key: col, header: col, type: 'text' as const })),
      { key: 'total', header: '합계', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={tableData}
        title={`교차표: ${results.rowVariable} × ${results.colVariable}`}
      />
    )
  }

  // 카이제곱 검정 결과 테이블
  const renderChiSquareTable = () => {
    if (!results?.chiSquareTest) return null

    const data = [{
      statistic: 'Pearson 카이제곱',
      value: results.chiSquareTest.statistic.toFixed(3),
      df: results.chiSquareTest.df,
      pValue: results.chiSquareTest.pValue < 0.001 ? '< 0.001' : results.chiSquareTest.pValue.toFixed(3),
      significance: results.chiSquareTest.isSignificant ? '유의함' : '유의하지 않음'
    }, {
      statistic: 'Cramer\'s V',
      value: results.chiSquareTest.cramersV.toFixed(3),
      df: '-',
      pValue: '-',
      significance: results.chiSquareTest.cramersV < 0.1 ? '작은 연관성' :
                   results.chiSquareTest.cramersV < 0.3 ? '중간 연관성' :
                   results.chiSquareTest.cramersV < 0.5 ? '큰 연관성' : '매우 큰 연관성'
    }]

    const columns = [
      { key: 'statistic', header: '검정통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'df', header: '자유도', type: 'text' as const },
      { key: 'pValue', header: 'p-값', type: 'text' as const },
      { key: 'significance', header: '결과', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="독립성 검정 결과"
      />
    )
  }

  // 요약 카드들
  const renderSummaryCards = () => {
    if (!results) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 사례 수</p>
                <p className="text-2xl font-bold">{results.grandTotal}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">행 범주 수</p>
                <p className="text-2xl font-bold">{results.rowTotals.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">열 범주 수</p>
                <p className="text-2xl font-bold">{results.colTotals.length}</p>
              </div>
              <PieChart className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">카이제곱 값</p>
                <p className="text-2xl font-bold">
                  {results.chiSquareTest?.statistic.toFixed(2) || 'N/A'}
                </p>
              </div>
              <GitBranch className={`w-8 h-8 ${results.chiSquareTest?.isSignificant ? 'text-green-500/50' : 'text-red-500/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 연관성 해석
  const renderAssociationInterpretation = () => {
    if (!results?.chiSquareTest) return null

    const { isSignificant, cramersV, pValue } = results.chiSquareTest

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            연관성 분석 결과
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 rounded-lg ${isSignificant ? 'bg-green-50 dark:bg-green-950/20' : 'bg-gray-50 dark:bg-gray-950/20'}`}>
            <h4 className="font-semibold mb-2">독립성 검정</h4>
            <p className="text-sm">
              {isSignificant ? (
                <>두 변수 간에 통계적으로 유의한 연관성이 있습니다 (p = {pValue.toFixed(3)})</>
              ) : (
                <>두 변수는 독립적입니다 (p = {pValue.toFixed(3)})</>
              )}
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-semibold mb-2">연관성 강도 (Cramer&apos;s V)</h4>
            <p className="text-sm">
              V = {cramersV.toFixed(3)} ({
                cramersV < 0.1 ? '매우 약한 연관성' :
                cramersV < 0.3 ? '약한 연관성' :
                cramersV < 0.5 ? '중간 연관성' : '강한 연관성'
              })
            </p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(cramersV * 200, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {results.fishersExactTest && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <h4 className="font-semibold mb-2">Fisher 정확검정</h4>
              <p className="text-sm">
                p = {results.fishersExactTest.pValue.toFixed(3)}<br />
                승산비 = {results.fishersExactTest.oddsRatio.toFixed(2)}
                (95% CI: {results.fishersExactTest.ciLower.toFixed(2)} - {results.fishersExactTest.ciUpper.toFixed(2)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="교차표"
      subtitle="두 범주형 변수 간의 교차 빈도 분석"
      icon={<GitBranch className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "χ² = Σ(O-E)²/E, Cramer's V = √(χ²/n×min(r-1,c-1))",
        assumptions: ["범주형 데이터", "독립적 관측값", "기대빈도 ≥ 5"],
        sampleSize: "각 셀 기대빈도 5개 이상",
        usage: "두 범주형 변수의 독립성 검정"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 변수 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                변수 선택
              </CardTitle>
              <CardDescription>
                교차표를 작성할 두 개의 범주형 변수를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                title="범주형 변수 선택"
                description="행 변수와 열 변수로 사용할 범주형 변수 2개를 선택하세요"
                onMappingChange={(mapping: Record<string, unknown>) => {
                  actions.setSelectedVariables(mapping)
                  if (Object.keys(mapping).length >= 2) {
                    actions.setCurrentStep(1)
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 분석 옵션 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                분석 옵션 설정
              </CardTitle>
              <CardDescription>
                교차표 표시 형식과 검정 방법을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="expected"
                      checked={showExpected}
                      onCheckedChange={setShowExpected}
                    />
                    <Label htmlFor="expected">기대빈도 표시</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="residuals"
                      checked={showResiduals}
                      onCheckedChange={setShowResiduals}
                    />
                    <Label htmlFor="residuals">표준화 잔차 표시</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="chi-square"
                      checked={includeChiSquare}
                      onCheckedChange={setIncludeChiSquare}
                    />
                    <Label htmlFor="chi-square">카이제곱 검정</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="fisher"
                      checked={includeFisher}
                      onCheckedChange={setIncludeFisher}
                    />
                    <Label htmlFor="fisher">Fisher 정확검정</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label>비율 계산 기준</Label>
                <Select value={percentageType} onValueChange={setPercentageType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">전체 기준</SelectItem>
                    <SelectItem value="row">행 기준</SelectItem>
                    <SelectItem value="column">열 기준</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">분석 설정 요약</h4>
                <ul className="text-sm space-y-1">
                  <li>• 교차표 형식: 관측빈도{showExpected && ' + 기대빈도'}{showResiduals && ' + 잔차'}</li>
                  <li>• 비율 계산: {percentageType === 'total' ? '전체 기준' : percentageType === 'row' ? '행 기준' : '열 기준'}</li>
                  <li>• 독립성 검정: {includeChiSquare && 'χ² 검정'}{includeChiSquare && includeFisher && ', '}
                      {includeFisher && 'Fisher 정확검정'}</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => actions.setCurrentStep(2)}
                  disabled={Object.keys(variableMapping).length < 2}
                >
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
                분석 실행
              </CardTitle>
              <CardDescription>
                교차표 작성 및 독립성 검정을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '교차표 분석 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 3 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="crosstab">교차표</TabsTrigger>
              <TabsTrigger value="tests">검정결과</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">분석 요약</h3>
                {renderSummaryCards()}
              </div>
              {renderAssociationInterpretation()}
            </TabsContent>

            <TabsContent value="crosstab" className="space-y-6">
              {renderCrossTable()}
            </TabsContent>

            <TabsContent value="tests" className="space-y-6">
              {includeChiSquare && renderChiSquareTable()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    교차표 분석 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      PDF 표
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      SPSS 형식
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