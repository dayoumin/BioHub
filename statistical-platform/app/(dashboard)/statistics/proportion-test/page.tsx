'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  PieChart,
  Target,
  BarChart3,
  Download,
  Play,
  Info,
  Calculator,
  Percent
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface ProportionTestResults {
  variable: string
  successCount: number
  totalCount: number
  observedProportion: number
  testProportion: number
  zStatistic: number
  pValue: number
  confidenceLevel: number
  ciLower: number
  ciUpper: number
  method: string
  interpretation: string
  conclusion: string
  effectSize: number
  continuityCorrection: boolean
}

export default function ProportionTestPage() {
  const { state, actions } = useStatisticsPage<ProportionTestResults>({
    withUploadedData: false,
    withError: false
  })
  const { currentStep, variableMapping, results, isAnalyzing } = state
  const [activeTab, setActiveTab] = useState('summary')
  const [testProportion, setTestProportion] = useState('0.5')
  const [confidenceLevel, setConfidenceLevel] = useState('95')
  const [alternative, setAlternative] = useState('two-sided')
  const [method, setMethod] = useState('normal')
  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'select-variable',
      number: 1,
      title: '변수 선택',
      description: '검정할 이분 변수 선택',
      status: Object.keys(variableMapping).length > 0 ? 'completed' : 'current'
    },
    {
      id: 'set-hypothesis',
      number: 2,
      title: '가설 설정',
      description: '검정 비율 및 대립가설 설정',
      status: Object.keys(variableMapping).length > 0 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '분석 실행',
      description: '일표본 비율 검정 수행',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 해석',
      description: '검정 결과 및 신뢰구간',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    actions.startAnalysis()

    try {
      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const successCount = 67
      const totalCount = 120
      const observedProp = successCount / totalCount
      const testProp = parseFloat(testProportion)

      const mockResults: ProportionTestResults = {
        variable: '성공여부',
        successCount,
        totalCount,
        observedProportion: observedProp,
        testProportion: testProp,
        zStatistic: 1.89,
        pValue: 0.059,
        confidenceLevel: parseFloat(confidenceLevel),
        ciLower: 0.467,
        ciUpper: 0.641,
        method: method === 'normal' ? 'Normal approximation (Wilson Score)' : 'Exact binomial test',
        interpretation: 'p > 0.05이므로 귀무가설을 기각할 수 없습니다',
        conclusion: `표본 비율 ${(observedProp * 100).toFixed(1)}%가 검정 비율 ${(testProp * 100).toFixed(1)}%와 통계적으로 유의한 차이가 없습니다`,
        effectSize: Math.abs(observedProp - testProp) / Math.sqrt(testProp * (1 - testProp)),
        continuityCorrection: totalCount < 50
      }

      actions.completeAnalysis(mockResults, 3)
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
    setTestProportion('0.5')
    setActiveTab('summary')
  }

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = () => {
    if (!results) return null

    const data = [{
      statistic: 'Z 통계량',
      value: results.zStatistic.toFixed(3),
      interpretation: results.zStatistic > 1.96 || results.zStatistic < -1.96 ?
        '임계값 ±1.96을 초과' : '임계값 ±1.96 이내'
    }, {
      statistic: 'p-값',
      value: results.pValue < 0.001 ? '< 0.001' : results.pValue.toFixed(3),
      interpretation: results.pValue < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'
    }, {
      statistic: '효과크기 (h)',
      value: results.effectSize.toFixed(3),
      interpretation: results.effectSize < 0.2 ? '작은 효과' :
                      results.effectSize < 0.5 ? '중간 효과' :
                      results.effectSize < 0.8 ? '큰 효과' : '매우 큰 효과'
    }, {
      statistic: '검정 방법',
      value: results.method,
      interpretation: results.continuityCorrection ? '연속성 보정 적용됨' : '정규 근사 사용'
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
        title="일표본 비율 검정 결과"
      />
    )
  }

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = () => {
    if (!results) return null

    const data = [{
      category: '성공',
      count: results.successCount,
      proportion: (results.observedProportion * 100).toFixed(1) + '%',
      expected: (results.testProportion * results.totalCount).toFixed(0),
      expectedProp: (results.testProportion * 100).toFixed(1) + '%'
    }, {
      category: '실패',
      count: results.totalCount - results.successCount,
      proportion: ((1 - results.observedProportion) * 100).toFixed(1) + '%',
      expected: ((1 - results.testProportion) * results.totalCount).toFixed(0),
      expectedProp: ((1 - results.testProportion) * 100).toFixed(1) + '%'
    }]

    const columns = [
      { key: 'category', header: '범주', type: 'text' as const },
      { key: 'count', header: '관측빈도', type: 'number' as const },
      { key: 'proportion', header: '관측비율', type: 'text' as const },
      { key: 'expected', header: '기대빈도', type: 'text' as const },
      { key: 'expectedProp', header: '기대비율', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="관측값 vs 기댓값"
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
                <p className="text-2xl font-bold">{results.totalCount}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">성공 횟수</p>
                <p className="text-2xl font-bold">{results.successCount}</p>
              </div>
              <Calculator className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">관측 비율</p>
                <p className="text-2xl font-bold">{(results.observedProportion * 100).toFixed(1)}%</p>
              </div>
              <Percent className="w-8 h-8 text-muted-foreground/20" />
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
      </div>
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
            비율의 {results.confidenceLevel}% 신뢰구간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-2xl font-bold">
              [{(results.ciLower * 100).toFixed(1)}%, {(results.ciUpper * 100).toFixed(1)}%]
            </p>
            <p className="text-sm text-muted-foreground">
              Wilson Score Interval 사용
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>해석:</strong> {results.confidenceLevel}% 확률로 모집단의 실제 성공 비율은
              {(results.ciLower * 100).toFixed(1)}%과 {(results.ciUpper * 100).toFixed(1)}% 사이에 있습니다.
              {(results.testProportion >= results.ciLower && results.testProportion <= results.ciUpper)
                ? ' 신뢰구간이 검정값을 포함하므로 유의한 차이가 없습니다.'
                : ' 신뢰구간이 검정값을 포함하지 않으므로 유의한 차이가 있습니다.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 검정 방법 설명
  const renderMethodExplanation = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            검정 방법 설명
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Normal Approximation (정규근사)</h4>
              <p className="text-sm text-muted-foreground">
                표본크기가 클 때 (np ≥ 5, n(1-p) ≥ 5) 이항분포를 정규분포로 근사
              </p>
              <p className="text-sm">공식: Z = (p̂ - p₀) / √(p₀(1-p₀)/n)</p>
            </div>

            <div>
              <h4 className="font-semibold">Wilson Score Interval</h4>
              <p className="text-sm text-muted-foreground">
                Wald 신뢰구간보다 정확하며, 특히 비율이 0 또는 1에 가까울 때 안정적
              </p>
              <p className="text-sm">작은 표본에서도 우수한 성능을 보임</p>
            </div>

            <div>
              <h4 className="font-semibold">연속성 보정 (Continuity Correction)</h4>
              <p className="text-sm text-muted-foreground">
                이산분포를 연속분포로 근사할 때의 오차를 줄이는 보정
              </p>
              <p className="text-sm">표본크기가 작을 때 (n &lt; 50) 자동 적용</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="일표본 비율 검정"
      subtitle="한 집단의 성공 비율이 특정 값과 다른지 검정"
      icon={<PieChart className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "Z = (p̂ - p₀) / √(p₀(1-p₀)/n), Wilson Score CI",
        assumptions: ["이항분포", "독립적인 시행", "각 시행의 성공확률 동일"],
        sampleSize: "최소 5개 성공과 5개 실패",
        usage: "성공률, 불량률, 찬성률 검정"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 변수 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                검정할 변수 선택
              </CardTitle>
              <CardDescription>
                비율 검정을 수행할 이분 변수(성공/실패, 예/아니오)를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                title="이분 변수 선택"
                description="두 개의 범주(성공/실패)로 구성된 변수를 선택하세요"
                onMappingChange={(mapping) => {
                  actions.setSelectedVariables(mapping)
                  if (Object.keys(mapping).length > 0) {
                    actions.setCurrentStep(1)
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 가설 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                가설 및 검정 옵션 설정
              </CardTitle>
              <CardDescription>
                검정할 비율값과 대립가설을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-proportion">검정 비율 (p₀)</Label>
                  <Input
                    id="test-proportion"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={testProportion}
                    onChange={(e) => setTestProportion(e.target.value)}
                    placeholder="예: 0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    0과 1 사이의 값 (예: 50% = 0.5)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>검정 방법</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">정규 근사 (빠름)</SelectItem>
                      <SelectItem value="exact">정확 검정 (정확함)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>대립가설</Label>
                  <Select value={alternative} onValueChange={setAlternative}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="two-sided">p ≠ p₀ (양측검정)</SelectItem>
                      <SelectItem value="greater">p &gt; p₀ (우측검정)</SelectItem>
                      <SelectItem value="less">p &lt; p₀ (좌측검정)</SelectItem>
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
                  <strong>H₀:</strong> p = {testProportion} ({(parseFloat(testProportion) * 100).toFixed(0)}%)
                </p>
                <p className="text-sm">
                  <strong>H₁:</strong> p {
                    alternative === 'two-sided' ? '≠' :
                    alternative === 'greater' ? '\u003E' : '\u003C'
                  } {testProportion} ({(parseFloat(testProportion) * 100).toFixed(0)}%)
                </p>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(2)}
                  disabled={Object.keys(variableMapping).length === 0 || !testProportion}
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
                설정된 가설로 일표본 비율 검정을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '비율 검정 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results && currentStep === 3 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">요약</TabsTrigger>
              <TabsTrigger value="results">검정결과</TabsTrigger>
              <TabsTrigger value="confidence">신뢰구간</TabsTrigger>
              <TabsTrigger value="methods">방법설명</TabsTrigger>
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

            <TabsContent value="confidence" className="space-y-6">
              {renderConfidenceInterval()}
            </TabsContent>

            <TabsContent value="methods" className="space-y-6">
              {renderMethodExplanation()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    비율 검정 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      품질관리 보고서
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