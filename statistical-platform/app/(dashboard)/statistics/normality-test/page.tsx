'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Activity,
  Microscope,
  BarChart3,
  Download,
  Play,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { VariableSelector, VariableAssignment } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

interface NormalityTestResult {
  test: string
  statistic: number
  pValue: number
  critical_value?: number
  conclusion: 'normal' | 'not_normal'
  interpretation: string
  recommendation: string
}

interface NormalityResults {
  variable: string
  sampleSize: number
  shapiroWilk: NormalityTestResult
  andersonDarling: NormalityTestResult
  dagostinoK2: NormalityTestResult
  jarqueBera: NormalityTestResult
  lilliefors: NormalityTestResult
  overallConclusion: 'normal' | 'not_normal' | 'mixed'
  descriptiveStats: {
    mean: number
    std: number
    skewness: number
    kurtosis: number
    min: number
    max: number
  }
}

export default function NormalityTestPage() {
  const { state, actions } = useStatisticsPage<NormalityResults>({
    withUploadedData: true,
    withError: false
  })
  const { currentStep, uploadedData, variableMapping, results, isAnalyzing } = state
  const [activeTab, setActiveTab] = useState('summary')
  const [showAllTests, setShowAllTests] = useState(true)
  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'select-variable',
      number: 1,
      title: '변수 선택',
      description: '정규성을 검정할 수치형 변수 선택',
      status: Object.keys(variableMapping).length > 0 ? 'completed' : 'current'
    },
    {
      id: 'configure-tests',
      number: 2,
      title: '검정 설정',
      description: '정규성 검정 방법 및 옵션 설정',
      status: Object.keys(variableMapping).length > 0 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '검정 실행',
      description: '정규성 검정 수행',
      status: results ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 해석',
      description: '정규성 검정 결과 및 권장사항',
      status: results ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    try {
      actions.startAnalysis()

      // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
      const mockResults: NormalityResults = {
        variable: '점수',
        sampleSize: 50,
        shapiroWilk: {
          test: 'Shapiro-Wilk',
          statistic: 0.962,
          pValue: 0.123,
          conclusion: 'normal',
          interpretation: 'p > 0.05이므로 정규분포를 따른다고 볼 수 있습니다',
          recommendation: '모수적 검정 사용 가능'
        },
        andersonDarling: {
          test: 'Anderson-Darling',
          statistic: 0.445,
          pValue: 0.287,
          critical_value: 0.787,
          conclusion: 'normal',
          interpretation: '통계량이 임계값보다 작으므로 정규분포를 따릅니다',
          recommendation: '정규성 가정 충족'
        },
        dagostinoK2: {
          test: 'D\'Agostino-Pearson K²',
          statistic: 2.142,
          pValue: 0.343,
          conclusion: 'normal',
          interpretation: '왜도와 첨도가 정상 범위 내에 있습니다',
          recommendation: '정규분포로 간주 가능'
        },
        jarqueBera: {
          test: 'Jarque-Bera',
          statistic: 1.876,
          pValue: 0.391,
          conclusion: 'normal',
          interpretation: '잔차가 정규분포를 따른다고 볼 수 있습니다',
          recommendation: '회귀분석 적용 가능'
        },
        lilliefors: {
          test: 'Lilliefors',
          statistic: 0.089,
          pValue: 0.156,
          conclusion: 'normal',
          interpretation: '표준화된 분포가 정규분포와 유사합니다',
          recommendation: 'Kolmogorov-Smirnov 대안으로 적합'
        },
        overallConclusion: 'normal',
        descriptiveStats: {
          mean: 75.2,
          std: 8.9,
          skewness: 0.14,
          kurtosis: -0.23,
          min: 58.1,
          max: 94.7
        }
      }

      actions.completeAnalysis(mockResults, 3)
      setActiveTab('summary')
    } catch (error) {
      console.error('정규성 검정 중 오류:', error)
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
    setActiveTab('summary')
  }

  // 검정 결과 테이블 렌더링
  const renderTestResultsTable = () => {
    if (!results) return null

    const tests = showAllTests ? [
      results.shapiroWilk,
      results.andersonDarling,
      results.dagostinoK2,
      results.jarqueBera,
      results.lilliefors
    ] : [results.shapiroWilk, results.andersonDarling, results.dagostinoK2]

    const data = tests.map(test => ({
      test: test.test,
      statistic: test.statistic.toFixed(3),
      pValue: test.pValue < 0.001 ? '< 0.001' : test.pValue.toFixed(3),
      conclusion: test.conclusion === 'normal' ? '정규분포' : '비정규분포',
      recommendation: test.recommendation
    }))

    const columns = [
      { key: 'test', header: '검정 방법', type: 'text' as const },
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'pValue', header: 'p-값', type: 'text' as const },
      { key: 'conclusion', header: '결론', type: 'text' as const },
      { key: 'recommendation', header: '권장사항', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="정규성 검정 결과"
      />
    )
  }

  // 기술통계 테이블 렌더링
  const renderDescriptiveTable = () => {
    if (!results) return null

    const data = [{
      variable: results.variable,
      n: results.sampleSize,
      mean: results.descriptiveStats.mean.toFixed(2),
      std: results.descriptiveStats.std.toFixed(2),
      skewness: results.descriptiveStats.skewness.toFixed(3),
      kurtosis: results.descriptiveStats.kurtosis.toFixed(3),
      min: results.descriptiveStats.min.toFixed(1),
      max: results.descriptiveStats.max.toFixed(1)
    }]

    const columns = [
      { key: 'variable', header: '변수', type: 'text' as const },
      { key: 'n', header: 'N', type: 'number' as const },
      { key: 'mean', header: '평균', type: 'text' as const },
      { key: 'std', header: '표준편차', type: 'text' as const },
      { key: 'skewness', header: '왜도', type: 'text' as const },
      { key: 'kurtosis', header: '첨도', type: 'text' as const },
      { key: 'min', header: '최솟값', type: 'text' as const },
      { key: 'max', header: '최댓값', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="기술통계"
      />
    )
  }

  // 검정 요약 카드 렌더링
  const renderSummaryCards = () => {
    if (!results) return null

    const normalTests = [results.shapiroWilk, results.andersonDarling, results.dagostinoK2, results.jarqueBera, results.lilliefors]
      .filter(test => test.conclusion === 'normal').length

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">표본크기</p>
                <p className="text-2xl font-bold">{results.sampleSize}</p>
              </div>
              <Microscope className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">정규성 지지</p>
                <p className="text-2xl font-bold">{normalTests}/5</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">왜도</p>
                <p className="text-2xl font-bold">{results.descriptiveStats.skewness.toFixed(2)}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">첨도</p>
                <p className="text-2xl font-bold">{results.descriptiveStats.kurtosis.toFixed(2)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 전체 결론 렌더링
  const renderOverallConclusion = () => {
    if (!results) return null

    const isNormal = results.overallConclusion === 'normal'
    const IconComponent = isNormal ? CheckCircle : XCircle
    const colorClass = isNormal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    const bgClass = isNormal ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'

    return (
      <Card className={bgClass}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${colorClass}`}>
            <IconComponent className="w-5 h-5" />
            전체 결론
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-medium ${colorClass}`}>
            {isNormal
              ? '데이터가 정규분포를 따른다고 판단됩니다'
              : '데이터가 정규분포를 따르지 않습니다'
            }
          </p>
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">권장사항:</h4>
            <ul className="text-sm space-y-1">
              {isNormal ? (
                <>
                  <li>• 모수적 검정(t-test, ANOVA) 사용 가능</li>
                  <li>• 피어슨 상관계수 적용 가능</li>
                  <li>• 선형회귀분석 가정 충족</li>
                  <li>• 평균과 표준편차 사용 적절</li>
                </>
              ) : (
                <>
                  <li>• 비모수 검정 사용 권장 (Mann-Whitney, Wilcoxon)</li>
                  <li>• 스피어만 상관계수 사용</li>
                  <li>• 데이터 변환 고려 (로그, 제곱근 변환)</li>
                  <li>• 중앙값과 IQR 사용 권장</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 검정 방법 설명 렌더링
  const renderTestDescriptions = () => {
    const descriptions = [
      {
        name: 'Shapiro-Wilk',
        description: '소표본(n≤50)에서 가장 강력한 정규성 검정',
        suitableFor: '표본크기가 작을 때',
        limitation: '대표본에서는 민감도가 높음'
      },
      {
        name: 'Anderson-Darling',
        description: '분포의 꼬리 부분에 더 민감한 검정',
        suitableFor: '극값에 관심이 있을 때',
        limitation: '계산이 복잡함'
      },
      {
        name: 'D\'Agostino-Pearson K²',
        description: '왜도와 첨도를 동시에 검정',
        suitableFor: '분포의 형태 파악',
        limitation: '대표본에서만 정확함'
      },
      {
        name: 'Jarque-Bera',
        description: '금융 데이터에서 널리 사용',
        suitableFor: '시계열 데이터',
        limitation: '소표본에서 부정확할 수 있음'
      },
      {
        name: 'Lilliefors',
        description: 'Kolmogorov-Smirnov의 개선된 버전',
        suitableFor: '모든 표본크기',
        limitation: '보수적인 결과'
      }
    ]

    return (
      <div className="space-y-4">
        {descriptions.map((desc, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{desc.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{desc.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-green-600">적합한 경우: </span>
                  {desc.suitableFor}
                </div>
                <div>
                  <span className="font-medium text-orange-600">제한사항: </span>
                  {desc.limitation}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <StatisticsPageLayout
      title="정규성 검정"
      subtitle="데이터가 정규분포를 따르는지 검정"
      icon={<Microscope className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "다양한 검정통계량 (Shapiro-Wilk: W, Anderson-Darling: A²)",
        assumptions: ["독립적인 관측값", "수치형 데이터"],
        sampleSize: "Shapiro-Wilk: 3-5000, 기타: 8 이상",
        usage: "모수적 검정 사용 전 정규성 가정 확인"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 변수 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                검정할 변수 선택
              </CardTitle>
              <CardDescription>
                정규성을 검정할 수치형 변수를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedData && (
                <VariableSelector
                  methodId="normality-test"
                  data={uploadedData.data}
                  onVariablesSelected={(variables: VariableAssignment) => {
                    actions.setSelectedVariables?.(variables)
                    if (Object.keys(variables).length > 0) {
                      actions.setCurrentStep(1)
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* 2단계: 검정 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                검정 옵션 설정
              </CardTitle>
              <CardDescription>
                수행할 정규성 검정 방법을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="all-tests"
                  checked={showAllTests}
                  onCheckedChange={setShowAllTests}
                />
                <Label htmlFor="all-tests">모든 검정 방법 실행 (5가지)</Label>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">실행될 검정 방법</h4>
                <ul className="text-sm space-y-1">
                  <li>• <strong>Shapiro-Wilk:</strong> 소표본에서 가장 강력</li>
                  <li>• <strong>Anderson-Darling:</strong> 극값에 민감</li>
                  <li>• <strong>D&apos;Agostino-Pearson K²:</strong> 왜도/첨도 검정</li>
                  {showAllTests && (
                    <>
                      <li>• <strong>Jarque-Bera:</strong> 금융/시계열 데이터</li>
                      <li>• <strong>Lilliefors:</strong> KS 검정 개선 버전</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => actions.setCurrentStep(2)}
                  disabled={Object.keys(variableMapping).length === 0}
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
                선택된 방법으로 정규성 검정을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '정규성 검정 실행'}
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
              <TabsTrigger value="conclusion">결론</TabsTrigger>
              <TabsTrigger value="methods">방법설명</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">검정 요약</h3>
                {renderSummaryCards()}
              </div>
              <div>
                {renderDescriptiveTable()}
              </div>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {renderTestResultsTable()}
            </TabsContent>

            <TabsContent value="conclusion" className="space-y-6">
              {renderOverallConclusion()}
            </TabsContent>

            <TabsContent value="methods" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">검정 방법별 설명</h3>
                {renderTestDescriptions()}
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    정규성 검정 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      검정 요약
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