'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
  Calculator,
  Target,
  BarChart3,
  Download,
  Play,
  Info,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableSelector, VariableAssignment } from '@/components/variable-selection/VariableSelector'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface OneSampleTResults {
  variable: string
  sampleSize: number
  sampleMean: number
  sampleStd: number
  testValue: number
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  effectSize: number
  meanDifference: number
  seRror: number
  interpretation: string
  conclusion: string
  assumptions: {
    normality: boolean
    independence: boolean
    randomSample: boolean
  }
}

export default function OneSampleTPage() {
  const { state, actions } = useStatisticsPage<OneSampleTResults>({
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, variableMapping, results, isAnalyzing } = state
  const [activeTab, setActiveTab] = useState('summary')
  const [testValue, setTestValue] = useState('0')
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const [alternative, setAlternative] = useState('two-sided')
  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'upload-data',
      number: 0,
      title: '데이터 업로드',
      description: '분석할 데이터 파일 업로드',
      status: uploadedData ? 'completed' : 'current'
    },
    {
      id: 'select-variable',
      number: 1,
      title: '변수 선택',
      description: '검정할 수치형 변수 선택',
      status: Object.keys(variableMapping).length > 0 ? 'completed' : uploadedData ? 'current' : 'pending'
    },
    {
      id: 'set-hypothesis',
      number: 2,
      title: '가설 설정',
      description: '검정값 및 대립가설 설정',
      status: Object.keys(variableMapping).length > 0 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: '일표본 t-검정 수행',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 해석',
      description: '검정 결과 및 통계적 해석',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    try {
      actions.startAnalysis()

      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const mockResults: OneSampleTResults = {
        variable: '점수',
        sampleSize: 30,
        sampleMean: 75.8,
        sampleStd: 8.2,
        testValue: parseFloat(testValue),
        tStatistic: 3.47,
        degreesOfFreedom: 29,
        pValue: 0.002,
        confidenceLevel: parseFloat(confidenceLevel),
        ciLower: 72.7,
        ciUpper: 78.9,
        effectSize: 0.63,
        meanDifference: 75.8 - parseFloat(testValue),
        seRror: 1.50,
        interpretation: 'p < 0.05이므로 귀무가설을 기각합니다.',
        conclusion: `표본 평균 ${75.8}이 검정값 ${parseFloat(testValue)}과 통계적으로 유의한 차이가 있습니다.`,
        assumptions: {
          normality: true,
          independence: true,
          randomSample: true
        }
      }

      actions.completeAnalysis(mockResults, 4)
      setActiveTab('summary')
    } catch (error) {
      console.error('분석 중 오류:', error)
      actions.setError('분석 중 오류가 발생했습니다.')
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
    setTestValue('0')
    setActiveTab('summary')
  }

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = () => {
    if (!results) return null

    const data = [{
      statistic: 'T 통계량',
      value: results.tStatistic.toFixed(3),
      interpretation: 'H0에서 얼마나 벗어났는지 측정'
    }, {
      statistic: '자유도',
      value: results.degreesOfFreedom.toString(),
      interpretation: 'n - 1'
    }, {
      statistic: 'p-값',
      value: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
      interpretation: results.pValue < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'
    }, {
      statistic: '효과크기 (Cohen\'s d)',
      value: results.effectSize.toFixed(3),
      interpretation: results.effectSize < 0.2 ? '작은 효과' :
                      results.effectSize < 0.5 ? '중간 효과' :
                      results.effectSize < 0.8 ? '큰 효과' : '매우 큰 효과'
    }]

    const columns = [
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="일표본 t-검정 결과"
      />
    )
  }

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = () => {
    if (!results) return null

    const data = [{
      variable: results.variable,
      n: results.sampleSize,
      mean: results.sampleMean.toFixed(2),
      std: results.sampleStd.toFixed(2),
      se: results.seRror.toFixed(3),
      ciLower: results.ciLower.toFixed(2),
      ciUpper: results.ciUpper.toFixed(2)
    }]

    const columns = [
      { key: 'variable', header: '변수', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'text' as const },
      { key: 'std', header: '표준편차', type: 'text' as const },
      { key: 'se', header: '표준오차', type: 'text' as const },
      { key: 'ciLower', header: `CI 하한(${results.confidenceLevel}%)`, type: 'text' as const },
      { key: 'ciUpper', header: `CI 상한(${results.confidenceLevel}%)`, type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="기술통계"
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
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">{results.sampleSize}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">T 통계량</p>
                <p className="text-2xl font-bold">{results.tStatistic.toFixed(2)}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
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
              <TrendingUp className={`w-8 h-8 ${isSignificant ? 'text-green-500/50' : 'text-red-500/50'}`} />
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

  // 가정 검토 렌더링
  const renderAssumptions = () => {
    if (!results) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            가정 검토
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>정규성 가정</span>
              <Badge variant={results.assumptions.normality ? 'default' : 'destructive'}>
                {results.assumptions.normality ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>독립성 가정</span>
              <Badge variant={results.assumptions.independence ? 'default' : 'destructive'}>
                {results.assumptions.independence ? '충족' : '위반'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>무작위 표본</span>
              <Badge variant={results.assumptions.randomSample ? 'default' : 'destructive'}>
                {results.assumptions.randomSample ? '충족' : '위반'}
              </Badge>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-1" />
              표본크기가 30 이상이면 중심극한정리에 의해 정규성 가정을 완화할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="일표본 t-검정"
      subtitle="한 집단의 평균이 특정 값과 다른지 검정"
      icon={<Calculator className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "t = (x̄ - μ₀) / (s/√n)",
        assumptions: ["정규분포 또는 n≥30", "독립적인 관측값", "무작위 표본"],
        sampleSize: "최소 5개 (30개 이상 권장)",
        usage: "평균이 특정 기준값과 다른지 검정"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 변수 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                검정할 변수 선택
              </CardTitle>
              <CardDescription>
                일표본 t-검정을 수행할 수치형 변수를 하나 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedData && (
                <VariableSelector
                  methodId="one-sample-t"
                  data={uploadedData.data}
                  onVariablesSelected={(variables: VariableAssignment) => {
                    actions.setSelectedVariables?.(variables)
                    if (Object.keys(variables).length > 0) {
                      actions.setCurrentStep?.(1)
                    }
                  }}
                />
              )}
              {!uploadedData && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    데이터를 먼저 업로드해주세요.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2단계: 가설 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                가설 및 검정 옵션 설정
              </CardTitle>
              <CardDescription>
                귀무가설의 검정값과 대립가설을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-value">검정값 (μ₀)</Label>
                  <Input
                    id="test-value"
                    type="number"
                    step="any"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    placeholder="예: 0"
                  />
                  <p className="text-xs text-muted-foreground">
                    귀무가설: μ = μ₀
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>대립가설</Label>
                  <Select value={alternative} onValueChange={setAlternative}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">μ ≠ μ₀ (양측검정)</SelectItem>
                      <SelectItem value="greater">μ &gt; μ₀ (우측검정)</SelectItem>
                      <SelectItem value="less">μ &lt; μ₀ (좌측검정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>신뢰수준</Label>
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

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold mb-2">가설 요약</h4>
                <p className="text-sm">
                  <strong>H₀:</strong> μ = {testValue} (귀무가설)
                </p>
                <p className="text-sm">
                  <strong>H₁:</strong> μ {
                    alternative === 'two-sided' ? '≠' :
                    alternative === 'greater' ? '>' : '<'
                  } {testValue} (대립가설)
                </p>
                <p className="text-sm">
                  <strong>α:</strong> {(100 - parseFloat(confidenceLevel)) / 100} (유의수준)
                </p>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(3)}
                  disabled={Object.keys(variableMapping).length === 0 || !testValue}
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
                설정된 가설로 일표본 t-검정을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : 't-검정 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 4 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="results">검정결과</TabsTrigger>
              <TabsTrigger value="assumptions">가정검토</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
                {renderSummaryCards()}
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">결론</h4>
                <p className="text-green-700 dark:text-green-300">{results.conclusion}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">{results.interpretation}</p>
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
              {renderAssumptions()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    t-검정 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      APA 형식
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