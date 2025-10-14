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
  Microscope,
  BarChart3,
  PieChart,
  Download,
  Play,
  Info,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'

interface ExploreResults {
  variable: string
  variableType: 'numerical' | 'categorical'

  // 기본 정보
  totalCount: number
  validCount: number
  missingCount: number
  missingPercent: number

  // 수치형 변수용 통계
  descriptive?: {
    mean: number
    median: number
    mode: string
    std: number
    min: number
    max: number
    q1: number
    q3: number
    iqr: number
    skewness: number
    kurtosis: number
    outliers: number[]
    outliersCount: number
  }

  // 범주형 변수용 통계
  categorical?: {
    uniqueValues: number
    mostFrequent: string
    mostFrequentCount: number
    frequencies: Array<{
      value: string
      count: number
      percent: number
    }>
  }

  // 정규성 검정 결과
  normalityTest?: {
    shapiroWilk: {
      statistic: number
      pValue: number
      isNormal: boolean
    }
    conclusion: string
  }

  // 시각화 데이터
  visualization: {
    histogram?: number[]
    boxplotData?: {
      min: number
      q1: number
      median: number
      q3: number
      max: number
      outliers: number[]
    }
    barChart?: Array<{
      category: string
      count: number
    }>
  }
}

export default function ExploreDataPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({})
  const [results, setResults] = useState<ExploreResults[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedVariable, setSelectedVariable] = useState<string>('')
  const [showOutliers, setShowOutliers] = useState(true)
  const [includeNormality, setIncludeNormality] = useState(true)
  const { pyodideService: _pyodideService } = usePyodideService()

  // 단계 정의
  const steps: StatisticsStep[] = [
    {
      id: 'select-variables',
      number: 1,
      title: '변수 선택',
      description: '탐색할 변수들 선택',
      status: Object.keys(variableMapping).length > 0 ? 'completed' : 'current'
    },
    {
      id: 'configure-options',
      number: 2,
      title: '탐색 옵션',
      description: '이상치 탐지 및 정규성 검정 설정',
      status: Object.keys(variableMapping).length > 0 ? 'current' : 'pending'
    },
    {
      id: 'run-analysis',
      number: 3,
      title: '탐색 실행',
      description: '탐색적 데이터 분석 수행',
      status: results.length > 0 ? 'completed' : 'pending'
    },
    {
      id: 'view-results',
      number: 4,
      title: '결과 탐색',
      description: '변수별 특성 및 시각화 확인',
      status: results.length > 0 ? 'current' : 'pending'
    }
  ]

  // 분석 실행
  const handleAnalysis = async () => {
    setIsAnalyzing(true)

    // 모의 데이터 생성 (실제로는 Pyodide 서비스 사용)
    setTimeout(() => {
      const mockResults: ExploreResults[] = [
        {
          variable: '점수',
          variableType: 'numerical',
          totalCount: 100,
          validCount: 98,
          missingCount: 2,
          missingPercent: 2.0,
          descriptive: {
            mean: 78.5,
            median: 79.0,
            mode: '80',
            std: 12.3,
            min: 45.0,
            max: 98.0,
            q1: 69.5,
            q3: 86.0,
            iqr: 16.5,
            skewness: -0.23,
            kurtosis: 0.15,
            outliers: [45, 46, 97, 98],
            outliersCount: 4
          },
          normalityTest: {
            shapiroWilk: {
              statistic: 0.987,
              pValue: 0.234,
              isNormal: true
            },
            conclusion: '정규분포를 따른다고 볼 수 있습니다 (p = 0.234)'
          },
          visualization: {
            histogram: [2, 5, 8, 12, 18, 22, 15, 10, 4, 2],
            boxplotData: {
              min: 50.0,
              q1: 69.5,
              median: 79.0,
              q3: 86.0,
              max: 95.0,
              outliers: [45, 46, 97, 98]
            }
          }
        },
        {
          variable: '성별',
          variableType: 'categorical',
          totalCount: 100,
          validCount: 100,
          missingCount: 0,
          missingPercent: 0.0,
          categorical: {
            uniqueValues: 2,
            mostFrequent: '여성',
            mostFrequentCount: 58,
            frequencies: [
              { value: '여성', count: 58, percent: 58.0 },
              { value: '남성', count: 42, percent: 42.0 }
            ]
          },
          visualization: {
            barChart: [
              { category: '여성', count: 58 },
              { category: '남성', count: 42 }
            ]
          }
        }
      ]

      setResults(mockResults)
      if (mockResults.length > 0) {
        setSelectedVariable(mockResults[0].variable)
      }
      setIsAnalyzing(false)
      setCurrentStep(3)
      setActiveTab('overview')
    }, 2000)
  }

  // 단계 변경 처리
  const handleStepChange = (step: number) => {
    if (step <= currentStep + 1) {
      setCurrentStep(step)
    }
  }

  // 초기화
  const handleReset = () => {
    setVariableMapping({})
    setResults([])
    setSelectedVariable('')
    setCurrentStep(0)
    setActiveTab('overview')
  }

  // 전체 개요 테이블 렌더링
  const renderOverviewTable = () => {
    if (results.length === 0) return null

    const data = results.map(result => ({
      variable: result.variable,
      type: result.variableType === 'numerical' ? '수치형' : '범주형',
      total: result.totalCount,
      valid: result.validCount,
      missing: `${result.missingCount} (${result.missingPercent.toFixed(1)}%)`,
      unique: result.variableType === 'numerical' ?
        '연속형' :
        result.categorical?.uniqueValues.toString() || '0'
    }))

    const columns = [
      { key: 'variable', header: '변수명', type: 'text' as const },
      { key: 'type', header: '변수 타입', type: 'text' as const },
      { key: 'total', header: '총 관측값', type: 'number' as const },
      { key: 'valid', header: '유효값', type: 'number' as const },
      { key: 'missing', header: '결측값', type: 'text' as const },
      { key: 'unique', header: '고유값 수', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title="변수별 기본 정보"
      />
    )
  }

  // 수치형 변수 상세 정보
  const renderNumericalDetails = (result: ExploreResults) => {
    if (!result.descriptive) return null

    const data = [{
      statistic: '중심 경향성',
      value: `평균: ${result.descriptive.mean.toFixed(2)}, 중앙값: ${result.descriptive.median.toFixed(2)}`,
      interpretation: result.descriptive.mean > result.descriptive.median ? '우측 치우침' :
                     result.descriptive.mean < result.descriptive.median ? '좌측 치우침' : '대칭 분포'
    }, {
      statistic: '산포도',
      value: `표준편차: ${result.descriptive.std.toFixed(2)}, IQR: ${result.descriptive.iqr.toFixed(2)}`,
      interpretation: result.descriptive.std / result.descriptive.mean < 0.5 ? '낮은 변이성' : '높은 변이성'
    }, {
      statistic: '분포 형태',
      value: `왜도: ${result.descriptive.skewness.toFixed(3)}, 첨도: ${result.descriptive.kurtosis.toFixed(3)}`,
      interpretation: Math.abs(result.descriptive.skewness) < 0.5 ? '거의 대칭' : '치우친 분포'
    }, {
      statistic: '이상치',
      value: `${result.descriptive.outliersCount}개`,
      interpretation: result.descriptive.outliersCount === 0 ? '이상치 없음' : '추가 검토 필요'
    }]

    if (result.normalityTest) {
      data.push({
        statistic: '정규성 검정',
        value: `p = ${result.normalityTest.shapiroWilk.pValue.toFixed(3)}`,
        interpretation: result.normalityTest.conclusion
      })
    }

    const columns = [
      { key: 'statistic', header: '통계량', type: 'text' as const },
      { key: 'value', header: '값', type: 'text' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={data}
        title={`${result.variable} 상세 분석`}
      />
    )
  }

  // 범주형 변수 빈도표
  const renderCategoricalTable = (result: ExploreResults) => {
    if (!result.categorical) return null

    const columns = [
      { key: 'value', header: '범주', type: 'text' as const },
      { key: 'count', header: '빈도', type: 'number' as const },
      { key: 'percent', header: '비율(%)', type: 'number' as const, precision: 1 }
    ]

    return (
      <StatisticsTable
        columns={columns}
        data={result.categorical.frequencies}
        title={`${result.variable} 빈도분석`}
      />
    )
  }

  // 요약 카드들
  const renderSummaryCards = () => {
    if (results.length === 0) return null

    const totalVariables = results.length
    const numericalVars = results.filter(r => r.variableType === 'numerical').length
    const categoricalVars = results.filter(r => r.variableType === 'categorical').length
    const totalMissing = results.reduce((sum, r) => sum + r.missingCount, 0)

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 변수</p>
                <p className="text-2xl font-bold">{totalVariables}</p>
              </div>
              <Microscope className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">수치형 변수</p>
                <p className="text-2xl font-bold">{numericalVars}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">범주형 변수</p>
                <p className="text-2xl font-bold">{categoricalVars}</p>
              </div>
              <PieChart className="w-8 h-8 text-muted-foreground/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 결측값</p>
                <p className="text-2xl font-bold">{totalMissing}</p>
              </div>
              <AlertCircle className={`w-8 h-8 ${totalMissing === 0 ? 'text-green-500/50' : 'text-orange-500/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 데이터 품질 평가
  const renderDataQualityAssessment = () => {
    if (results.length === 0) return null

    const issues = []
    const recommendations = []

    // 결측값 검사
    const highMissingVars = results.filter(r => r.missingPercent > 10)
    if (highMissingVars.length > 0) {
      issues.push(`높은 결측률 변수: ${highMissingVars.map(v => v.variable).join(', ')}`)
      recommendations.push('결측값 처리 방법을 검토하세요 (제거, 대체, 모델링)')
    }

    // 이상치 검사
    const outliersVars = results.filter(r => r.descriptive && r.descriptive.outliersCount > 0)
    if (outliersVars.length > 0) {
      issues.push(`이상치 발견: ${outliersVars.map(v => `${v.variable}(${v.descriptive?.outliersCount}개)`).join(', ')}`)
      recommendations.push('이상치의 원인을 조사하고 분석에 포함할지 결정하세요')
    }

    // 정규성 검사
    const nonNormalVars = results.filter(r =>
      r.normalityTest && !r.normalityTest.shapiroWilk.isNormal
    )
    if (nonNormalVars.length > 0) {
      issues.push(`비정규분포: ${nonNormalVars.map(v => v.variable).join(', ')}`)
      recommendations.push('비모수 검정 사용을 고려하거나 데이터 변환을 시도하세요')
    }

    if (issues.length === 0) {
      issues.push('데이터 품질이 양호합니다')
      recommendations.push('모수적 통계 검정을 사용할 수 있습니다')
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            데이터 품질 평가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">발견된 문제점</h4>
            <ul className="text-sm space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">권장사항</h4>
            <ul className="text-sm space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="데이터 탐색"
      subtitle="변수별 특성 파악 및 데이터 품질 평가"
      icon={<Microscope className="w-6 h-6" />}
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onRun={handleAnalysis}
      onReset={handleReset}
      isRunning={isAnalyzing}
      methodInfo={{
        formula: "기술통계, 정규성 검정, 이상치 탐지, 시각화",
        assumptions: ["독립적인 관측값"],
        sampleSize: "최소 제한 없음",
        usage: "분석 전 데이터 특성 파악 및 품질 평가"
      }}
    >
      <div className="space-y-6">
        {/* 1단계: 변수 선택 */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Microscope className="w-5 h-5" />
                탐색할 변수 선택
              </CardTitle>
              <CardDescription>
                데이터 탐색을 수행할 변수들을 선택하세요 (수치형, 범주형 모두 가능)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VariableSelector
                title="변수 선택"
                description="탐색할 모든 변수를 선택하세요"
                onMappingChange={(mapping) => {
                  setVariableMapping(mapping)
                  if (Object.keys(mapping).length > 0) {
                    setCurrentStep(1)
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* 2단계: 탐색 옵션 설정 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                탐색 옵션 설정
              </CardTitle>
              <CardDescription>
                데이터 탐색에 포함할 분석 항목을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="outliers"
                    checked={showOutliers}
                    onCheckedChange={setShowOutliers}
                  />
                  <Label htmlFor="outliers">이상치 탐지 포함</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="normality"
                    checked={includeNormality}
                    onCheckedChange={setIncludeNormality}
                  />
                  <Label htmlFor="normality">정규성 검정 포함</Label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-semibold mb-2">데이터 탐색 포함 항목</h4>
                <ul className="text-sm space-y-1">
                  <li>• 기본 통계량 (평균, 중앙값, 표준편차 등)</li>
                  <li>• 분포 형태 (왜도, 첨도)</li>
                  <li>• 결측값 및 데이터 품질 평가</li>
                  {showOutliers && <li>• 이상치 탐지 (IQR 방법)</li>}
                  {includeNormality && <li>• 정규성 검정 (Shapiro-Wilk)</li>}
                  <li>• 시각화 (히스토그램, 박스플롯, 막대그래프)</li>
                </ul>
              </div>

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setCurrentStep(2)}
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
                데이터 탐색 실행
              </CardTitle>
              <CardDescription>
                선택된 변수들에 대해 탐색적 데이터 분석을 실행합니다
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
                  {isAnalyzing ? '분석 중...' : '데이터 탐색 실행'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4단계: 결과 확인 */}
        {results.length > 0 && currentStep === 3 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">전체 개요</TabsTrigger>
              <TabsTrigger value="details">변수별 상세</TabsTrigger>
              <TabsTrigger value="quality">데이터 품질</TabsTrigger>
              <TabsTrigger value="export">내보내기</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">탐색 요약</h3>
                {renderSummaryCards()}
              </div>
              <div>
                {renderOverviewTable()}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Label>변수 선택:</Label>
                <Select value={selectedVariable} onValueChange={setSelectedVariable}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {results.map(result => (
                      <SelectItem key={result.variable} value={result.variable}>
                        {result.variable} ({result.variableType === 'numerical' ? '수치형' : '범주형'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVariable && (() => {
                const selectedResult = results.find(r => r.variable === selectedVariable)
                if (!selectedResult) return null

                return selectedResult.variableType === 'numerical' ?
                  renderNumericalDetails(selectedResult) :
                  renderCategoricalTable(selectedResult)
              })()}
            </TabsContent>

            <TabsContent value="quality" className="space-y-6">
              {renderDataQualityAssessment()}
            </TabsContent>

            <TabsContent value="export" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>결과 내보내기</CardTitle>
                  <CardDescription>
                    데이터 탐색 결과를 다양한 형식으로 내보낼 수 있습니다
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
                      EDA 보고서
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      시각화
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