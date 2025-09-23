'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Info,
  PlayCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Activity
} from 'lucide-react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { ProfessionalVariableSelector } from '@/components/variable-selection/ProfessionalVariableSelector'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { VariableMapping } from '@/components/variable-selection/types'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import { BoxPlot } from '@/components/charts/BoxPlot'
import { usePyodideService } from '@/hooks/use-pyodide-service'

type NormalityTest = 'shapiro-wilk' | 'anderson-darling' | 'kolmogorov-smirnov' | 'dagostino-pearson' | 'jarque-bera'

interface TestDescription {
  name: string
  description: string
  advantages: string[]
  limitations: string[]
  icon: React.ReactNode
}

const testDescriptions: Record<NormalityTest, TestDescription> = {
  'shapiro-wilk': {
    name: 'Shapiro-Wilk 검정',
    description: '가장 강력한 정규성 검정 방법 중 하나',
    advantages: [
      '작은 표본(n < 50)에서 우수',
      '높은 검정력',
      '가장 많이 사용됨'
    ],
    limitations: [
      '표본 크기 5000 이하 권장',
      '이상치에 민감'
    ],
    icon: <CheckCircle2 className="w-5 h-5" />
  },
  'anderson-darling': {
    name: 'Anderson-Darling 검정',
    description: '분포의 꼬리 부분에 더 많은 가중치를 부여',
    advantages: [
      '분포 양 끝단 민감도 높음',
      '특정 분포 검정 가능',
      '모든 표본 크기 사용 가능'
    ],
    limitations: [
      '계산이 복잡',
      'p-value 계산이 근사적'
    ],
    icon: <TrendingUp className="w-5 h-5" />
  },
  'kolmogorov-smirnov': {
    name: 'Kolmogorov-Smirnov 검정',
    description: '경험적 분포함수와 이론적 분포함수를 비교',
    advantages: [
      '분포 무관 검정 가능',
      '시각적 해석 용이',
      '비모수적 방법'
    ],
    limitations: [
      '작은 표본에서 검정력 낮음',
      '연속 분포에만 적합'
    ],
    icon: <BarChart3 className="w-5 h-5" />
  },
  'dagostino-pearson': {
    name: "D'Agostino-Pearson 검정",
    description: '왜도와 첨도를 기반으로 정규성 검정',
    advantages: [
      '왜도와 첨도 동시 검정',
      '표본 크기 20 이상',
      'Omnibus 검정'
    ],
    limitations: [
      '매우 작은 표본 부적합',
      '극단적 이상치 영향'
    ],
    icon: <Activity className="w-5 h-5" />
  },
  'jarque-bera': {
    name: 'Jarque-Bera 검정',
    description: '왜도와 첨도가 정규분포와 일치하는지 검정',
    advantages: [
      '계산이 간단',
      '큰 표본에서 우수',
      '회귀분석 잔차 검정'
    ],
    limitations: [
      '작은 표본 부적합 (n < 30)',
      '점근적 검정'
    ],
    icon: <Activity className="w-5 h-5" />
  }
}

export default function NormalityTestPage() {
  const [selectedTests, setSelectedTests] = useState<NormalityTest[]>(['shapiro-wilk'])
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({})
  const [result, setResult] = useState<StatisticalResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('setup')
  const [alpha, setAlpha] = useState('0.05')
  const { pyodideService } = usePyodideService()

  const handleTestToggle = (test: NormalityTest) => {
    setSelectedTests(prev =>
      prev.includes(test)
        ? prev.filter(t => t !== test)
        : [...prev, test]
    )
  }

  const handleAnalysis = async () => {
    setIsAnalyzing(true)

    // 1.5초 후 모의 결과 생성
    setTimeout(() => {
      const mockResult: StatisticalResult = {
        testName: '정규성 검정',
        statistic: 0.985,
        pValue: 0.234,
        degreesOfFreedom: undefined,
        effectSize: undefined,
        confidenceInterval: undefined,
        sampleSize: 150,
        additionalInfo: {
          tests: selectedTests.map(test => ({
            name: testDescriptions[test].name,
            statistic: Math.random() * 2,
            pValue: Math.random(),
            passed: Math.random() > 0.3
          })),
          skewness: -0.123,
          kurtosis: 0.456,
          mean: 25.3,
          std: 5.8,
          median: 24.8,
          qqPlotData: Array.from({ length: 50 }, (_, i) => ({
            theoretical: -2 + (i / 12.5),
            sample: -2 + (i / 12.5) + (Math.random() - 0.5) * 0.3
          }))
        }
      }

      setResult(mockResult)
      setIsAnalyzing(false)
      setActiveTab('results')
    }, 1500)
  }

  const renderTestResults = () => {
    if (!result?.additionalInfo?.tests) return null

    const columns = [
      { key: 'name', header: '검정 방법', type: 'text' as const },
      { key: 'statistic', header: '통계량', type: 'number' as const },
      { key: 'pValue', header: 'p-value', type: 'pvalue' as const },
      { key: 'interpretation', header: '해석', type: 'text' as const },
    ]

    const data = result.additionalInfo.tests.map((test: any) => ({
      name: test.name,
      statistic: test.statistic,
      pValue: test.pValue,
      interpretation: test.pValue > parseFloat(alpha) ? '정규분포 따름' : '정규분포 따르지 않음'
    }))

    return <StatisticsTable columns={columns} data={data} title="정규성 검정 결과" />
  }

  return (
    <StatisticsPageLayout
      title="정규성 검정"
      description="데이터가 정규분포를 따르는지 검정하는 통계적 방법"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="setup">검정 설정</TabsTrigger>
          <TabsTrigger value="visualization">데이터 시각화</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>
            결과
            {result && <Badge className="ml-2" variant="default">완료</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* 검정 방법 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>검정 방법 선택</CardTitle>
              <CardDescription>
                하나 이상의 정규성 검정 방법을 선택하세요 (다중 선택 가능)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(testDescriptions).map(([key, desc]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedTests.includes(key as NormalityTest)
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleTestToggle(key as NormalityTest)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">{desc.icon}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{desc.name}</h4>
                            {selectedTests.includes(key as NormalityTest) && (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {desc.description}
                          </p>
                          <div className="space-y-1">
                            <div className="text-xs text-green-600">
                              장점: {desc.advantages[0]}
                            </div>
                            <div className="text-xs text-amber-600">
                              주의: {desc.limitations[0]}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 변수 선택 */}
          <ProfessionalVariableSelector
            title="검정할 변수 선택"
            description="정규성을 검정할 연속형 변수를 선택하세요"
            onMappingChange={setVariableMapping}
          />

          {/* 분석 옵션 */}
          <Card>
            <CardHeader>
              <CardTitle>분석 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>유의수준 (α)</Label>
                <Select value={alpha} onValueChange={setAlpha}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.01">0.01</SelectItem>
                    <SelectItem value="0.05">0.05</SelectItem>
                    <SelectItem value="0.10">0.10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 분석 실행 */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleAnalysis}
              disabled={selectedTests.length === 0 || Object.keys(variableMapping).length === 0 || isAnalyzing}
            >
              {isAnalyzing ? (
                <>분석 중...</>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  분석 실행
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Q-Q Plot */}
            <Card>
              <CardHeader>
                <CardTitle>Q-Q Plot</CardTitle>
                <CardDescription>
                  이론적 정규분포와 실제 데이터 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터를 선택하면 Q-Q Plot이 표시됩니다
                </div>
              </CardContent>
            </Card>

            {/* Histogram */}
            <Card>
              <CardHeader>
                <CardTitle>히스토그램</CardTitle>
                <CardDescription>
                  데이터 분포와 정규 곡선 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터를 선택하면 히스토그램이 표시됩니다
                </div>
              </CardContent>
            </Card>

            {/* Box Plot */}
            <Card>
              <CardHeader>
                <CardTitle>박스플롯</CardTitle>
                <CardDescription>
                  분포의 대칭성과 이상치 확인
                </CardDescription>
              </CardHeader>
              <CardContent>
                {variableMapping.dependent ? (
                  <BoxPlot
                    data={[
                      {
                        name: '데이터',
                        min: 10,
                        q1: 20,
                        median: 30,
                        q3: 40,
                        max: 50,
                        mean: 31,
                        outliers: [5, 55]
                      }
                    ]}
                    height={250}
                    showMean={true}
                    showOutliers={true}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    데이터를 선택하면 박스플롯이 표시됩니다
                  </div>
                )}
              </CardContent>
            </Card>

            {/* P-P Plot */}
            <Card>
              <CardHeader>
                <CardTitle>P-P Plot</CardTitle>
                <CardDescription>
                  누적 확률 비교
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터를 선택하면 P-P Plot이 표시됩니다
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 기술통계 요약 */}
          <Card>
            <CardHeader>
              <CardTitle>기술통계 요약</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">평균</Label>
                    <div className="text-2xl font-bold">{result.additionalInfo?.mean?.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">중앙값</Label>
                    <div className="text-2xl font-bold">{result.additionalInfo?.median?.toFixed(2)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">왜도</Label>
                    <div className="text-2xl font-bold">{result.additionalInfo?.skewness?.toFixed(3)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">첨도</Label>
                    <div className="text-2xl font-bold">{result.additionalInfo?.kurtosis?.toFixed(3)}</div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">분석을 실행하면 기술통계가 표시됩니다</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {result && (
            <>
              {/* 종합 결과 */}
              <Alert className={result.pValue > parseFloat(alpha) ? '' : 'border-amber-500'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>정규성 검정 결과</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <div>
                    {result.additionalInfo?.tests?.filter((t: any) => t.pValue > parseFloat(alpha)).length} / {result.additionalInfo?.tests?.length} 개 검정에서 정규성 가정을 만족합니다.
                  </div>
                  {result.pValue > parseFloat(alpha) ? (
                    <div className="text-green-600 font-medium">
                      ✅ 데이터가 정규분포를 따른다고 볼 수 있습니다 (α = {alpha})
                    </div>
                  ) : (
                    <div className="text-amber-600 font-medium">
                      ⚠️ 데이터가 정규분포를 따르지 않을 가능성이 있습니다. 비모수 검정을 고려하세요.
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* 검정별 결과 */}
              {renderTestResults()}

              {/* 대안 제시 */}
              {result.pValue <= parseFloat(alpha) && (
                <Card>
                  <CardHeader>
                    <CardTitle>권장 대안</CardTitle>
                    <CardDescription>
                      정규성 가정을 만족하지 않을 때 사용할 수 있는 방법
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">비모수 검정 사용</div>
                          <div className="text-sm text-muted-foreground">
                            Mann-Whitney U, Wilcoxon, Kruskal-Wallis 등
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">데이터 변환</div>
                          <div className="text-sm text-muted-foreground">
                            로그 변환, 제곱근 변환, Box-Cox 변환
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium">강건한 방법 사용</div>
                          <div className="text-sm text-muted-foreground">
                            Robust regression, Bootstrap methods
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </StatisticsPageLayout>
  )
}