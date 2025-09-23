'use client'

import React from 'react'
import { useState } from 'react'
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
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Users,
  Shuffle
} from 'lucide-react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { ProfessionalVariableSelector } from '@/components/variable-selection/ProfessionalVariableSelector'
import { StatisticalResultCard } from '@/components/statistics/common/StatisticalResultCard'
import { AssumptionTestCard } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'
import type { TableColumn } from '@/components/statistics/common/StatisticsTable'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'

type NonParametricTest =
  | 'mann-whitney'
  | 'wilcoxon'
  | 'kruskal-wallis'
  | 'friedman'

interface TestDescription {
  name: string
  description: string
  use_cases: string[]
  parametric_equivalent: string
  icon: React.ReactNode
  requiredVariables: {
    independent?: number
    dependent: number
    grouping?: number
    paired?: boolean
  }
}

const testDescriptions: Record<NonParametricTest, TestDescription> = {
  'mann-whitney': {
    name: 'Mann-Whitney U 검정',
    description: '두 독립 표본 간 중앙값 차이를 검정합니다.',
    use_cases: [
      '두 독립 그룹 간 비교',
      '정규성 가정 위반 시',
      '순서형 데이터 분석'
    ],
    parametric_equivalent: '독립표본 t-test',
    icon: <Users className="w-5 h-5" />,
    requiredVariables: {
      dependent: 1,
      grouping: 1
    }
  },
  'wilcoxon': {
    name: 'Wilcoxon 부호순위 검정',
    description: '대응 표본 간 중앙값 차이를 검정합니다.',
    use_cases: [
      '대응 표본 비교',
      '사전-사후 측정',
      '짝지어진 데이터'
    ],
    parametric_equivalent: '대응표본 t-test',
    icon: <Shuffle className="w-5 h-5" />,
    requiredVariables: {
      dependent: 2,
      paired: true
    }
  },
  'kruskal-wallis': {
    name: 'Kruskal-Wallis 검정',
    description: '세 개 이상 독립 표본 간 중앙값 차이를 검정합니다.',
    use_cases: [
      '다중 그룹 비교',
      '정규성/등분산성 위반',
      '순서형 데이터의 일원분산분석'
    ],
    parametric_equivalent: '일원분산분석 (One-way ANOVA)',
    icon: <BarChart3 className="w-5 h-5" />,
    requiredVariables: {
      dependent: 1,
      grouping: 1
    }
  },
  'friedman': {
    name: 'Friedman 검정',
    description: '반복측정 설계에서 세 개 이상 조건 간 차이를 검정합니다.',
    use_cases: [
      '반복측정 설계',
      '시간에 따른 변화',
      '블록 설계'
    ],
    parametric_equivalent: '반복측정 분산분석',
    icon: <TrendingUp className="w-5 h-5" />,
    requiredVariables: {
      dependent: 3,
      paired: true
    }
  }
}

export default function NonParametricTestPage() {
  const [selectedTest, setSelectedTest] = useState<NonParametricTest>('mann-whitney')
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({})
  const [result, setResult] = useState<StatisticalResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('setup')
  const [alpha, setAlpha] = useState('0.05')
  const [alternativeHypothesis, setAlternativeHypothesis] = useState('two-sided')

  const { pyodideService, isLoading: isPyodideLoading, error: pyodideError } = usePyodideService()

  const currentTest = testDescriptions[selectedTest]

  // Mock 분석 실행
  const runAnalysis = async () => {
    setIsAnalyzing(true)

    // Mock 결과 생성
    setTimeout(() => {
      const mockResult: StatisticalResult = {
        testName: currentTest.name,
        testType: '비모수 검정',
        description: currentTest.description,
        statistic: selectedTest === 'mann-whitney' ? 234.5 :
                   selectedTest === 'wilcoxon' ? 45.0 :
                   selectedTest === 'kruskal-wallis' ? 12.345 : 8.765,
        statisticName: selectedTest === 'mann-whitney' ? 'U' :
                       selectedTest === 'wilcoxon' ? 'W' :
                       selectedTest === 'kruskal-wallis' ? 'H' : 'χ²',
        df: selectedTest === 'kruskal-wallis' ? 2 :
            selectedTest === 'friedman' ? 3 : undefined,
        pValue: 0.023,
        alpha: parseFloat(alpha),
        effectSize: {
          value: 0.35,
          type: 'r',
          ci: [0.15, 0.52]
        },
        assumptions: [
          {
            name: '독립성',
            description: '관측치가 서로 독립적이어야 합니다',
            pValue: null,
            passed: true,
            details: '연구 설계상 독립성이 보장됨'
          },
          {
            name: '측정 수준',
            description: '최소한 순서형 변수여야 합니다',
            pValue: null,
            passed: true,
            details: '연속형 변수로 조건 충족'
          }
        ],
        additionalResults: {
          title: '그룹별 순위 통계',
          columns: [
            { key: 'group', header: '그룹', type: 'text' },
            { key: 'n', header: 'N', type: 'number' },
            { key: 'median', header: '중앙값', type: 'number' },
            { key: 'meanRank', header: '평균 순위', type: 'number' },
            { key: 'sumRank', header: '순위 합', type: 'number' }
          ],
          data: [
            { group: '그룹 A', n: 25, median: 45.2, meanRank: 23.4, sumRank: 585 },
            { group: '그룹 B', n: 28, median: 52.1, meanRank: 30.1, sumRank: 843 }
          ]
        },
        interpretation: `${currentTest.name} 결과, 그룹 간 통계적으로 유의한 차이가 발견되었습니다 (p = 0.023). 효과크기 r = 0.35로 중간 정도의 효과를 나타냅니다.`,
        recommendations: [
          '사후검정으로 Dunn test 수행을 권장합니다',
          '효과크기와 함께 결과를 해석하세요',
          '박스플롯으로 분포를 시각화하세요'
        ],
        sampleSize: 53,
        groups: 2,
        variables: ['Variable1', 'GroupVar']
      }

      setResult(mockResult)
      setActiveTab('results')
      setIsAnalyzing(false)
    }, 1500)
  }

  // 변수 요구사항 생성
  const getVariableRequirements = () => {
    const test = testDescriptions[selectedTest]
    const requirements = []

    if (test.requiredVariables.dependent) {
      if (test.requiredVariables.paired) {
        for (let i = 1; i <= test.requiredVariables.dependent; i++) {
          requirements.push({
            role: `measure${i}`,
            name: `측정 ${i}`,
            description: `${i}번째 측정값 또는 조건`,
            required: true,
            multiple: false,
            allowedTypes: ['continuous', 'ordinal'] as any
          })
        }
      } else {
        requirements.push({
          role: 'dependent',
          name: '종속변수',
          description: '분석할 연속형 또는 순서형 변수',
          required: true,
          multiple: false,
          allowedTypes: ['continuous', 'ordinal'] as any
        })
      }
    }

    if (test.requiredVariables.grouping) {
      requirements.push({
        role: 'grouping',
        name: '그룹 변수',
        description: '그룹을 구분하는 범주형 변수',
        required: true,
        multiple: false,
        allowedTypes: ['categorical', 'binary'] as any
      })
    }

    return requirements
  }

  return (
    <StatisticsPageLayout
      title="비모수 검정"
      description="정규성 가정이 필요 없는 순위 기반 통계 검정"
      icon={<BarChart3 className="w-8 h-8" />}
    >
      <div className="space-y-6">
        {/* 검정 방법 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              비모수 검정 방법 선택
            </CardTitle>
            <CardDescription>
              데이터 특성과 연구 설계에 맞는 검정 방법을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedTest}
              onValueChange={(value) => setSelectedTest(value as NonParametricTest)}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(testDescriptions).map(([key, desc]) => (
                  <label
                    key={key}
                    htmlFor={key}
                    className={`
                      flex items-start p-4 rounded-lg border cursor-pointer
                      transition-all duration-200
                      ${selectedTest === key
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    <RadioGroupItem value={key} id={key} className="mt-1" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {desc.icon}
                        <span className="font-semibold">{desc.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {desc.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          모수 대응: {desc.parametric_equivalent}
                        </Badge>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 분석 설정 및 결과 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">분석 설정</TabsTrigger>
            <TabsTrigger value="assumptions">가정 확인</TabsTrigger>
            <TabsTrigger value="results" disabled={!result}>결과</TabsTrigger>
          </TabsList>

          {/* 분석 설정 탭 */}
          <TabsContent value="setup" className="space-y-6">
            {/* 변수 선택 */}
            <ProfessionalVariableSelector
              requirements={getVariableRequirements()}
              onMappingChange={setVariableMapping}
              title="변수 선택"
              description={`${currentTest.name}에 필요한 변수를 선택하세요`}
            />

            {/* 분석 옵션 */}
            <Card>
              <CardHeader>
                <CardTitle>분석 옵션</CardTitle>
                <CardDescription>
                  검정 설정을 조정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alpha">유의수준 (α)</Label>
                    <Select value={alpha} onValueChange={setAlpha}>
                      <SelectTrigger id="alpha">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.01">0.01</SelectItem>
                        <SelectItem value="0.05">0.05</SelectItem>
                        <SelectItem value="0.10">0.10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alternative">대립가설</Label>
                    <Select value={alternativeHypothesis} onValueChange={setAlternativeHypothesis}>
                      <SelectTrigger id="alternative">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two-sided">양측검정</SelectItem>
                        <SelectItem value="greater">단측검정 (크다)</SelectItem>
                        <SelectItem value="less">단측검정 (작다)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 추가 옵션 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>비모수 검정 특징</AlertTitle>
                  <AlertDescription>
                    • 정규성 가정이 필요 없음<br />
                    • 순위 기반 분석으로 이상치에 강건함<br />
                    • 순서형 데이터 분석 가능<br />
                    • 일반적으로 모수 검정보다 검정력이 낮음
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* 실행 버튼 */}
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={runAnalysis}
                disabled={isAnalyzing || !variableMapping || Object.keys(variableMapping).length === 0}
                className="px-8"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-5 h-5 mr-2" />
                    분석 실행
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* 가정 확인 탭 */}
          <TabsContent value="assumptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>비모수 검정 가정</CardTitle>
                <CardDescription>
                  비모수 검정은 모수 검정보다 가정이 적지만 여전히 확인이 필요합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AssumptionTestCard
                  title="기본 가정"
                  tests={[
                    {
                      name: '독립성',
                      description: '관측치가 서로 독립적이어야 합니다',
                      pValue: null,
                      passed: true,
                      details: '연구 설계를 통해 확인'
                    },
                    {
                      name: '측정 수준',
                      description: '최소한 순서형 변수여야 합니다',
                      pValue: null,
                      passed: true,
                      details: '변수 타입 확인 필요'
                    },
                    {
                      name: '동일 분포 형태',
                      description: '그룹 간 분포 형태가 유사해야 합니다 (위치만 다름)',
                      pValue: null,
                      passed: null,
                      details: '박스플롯으로 시각적 확인 권장'
                    }
                  ]}
                  showRecommendations={true}
                />

                {/* 검정별 특별 고려사항 */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{currentTest.name} 고려사항</AlertTitle>
                  <AlertDescription>
                    {selectedTest === 'mann-whitney' && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>두 그룹이 독립적이어야 함</li>
                        <li>동순위(tie)가 많으면 정확한 p-value 계산 필요</li>
                        <li>표본 크기가 매우 작으면 정확검정 고려</li>
                      </ul>
                    )}
                    {selectedTest === 'wilcoxon' && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>대응 표본이어야 함</li>
                        <li>차이값이 대칭 분포를 가정</li>
                        <li>영가설 하에서 차이의 중앙값이 0</li>
                      </ul>
                    )}
                    {selectedTest === 'kruskal-wallis' && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>세 개 이상의 독립 그룹</li>
                        <li>유의한 결과 시 사후검정 필요 (Dunn test)</li>
                        <li>그룹 간 분산이 매우 다르면 해석 주의</li>
                      </ul>
                    )}
                    {selectedTest === 'friedman' && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>블록 내 순위 매김</li>
                        <li>완전 블록 설계 필요</li>
                        <li>유의한 결과 시 Nemenyi 사후검정</li>
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결과 탭 */}
          <TabsContent value="results" className="space-y-6">
            {result && (
              <>
                <StatisticalResultCard
                  result={result}
                  showAssumptions={true}
                  showEffectSize={true}
                  showInterpretation={true}
                  showActions={true}
                />

                {/* 추가 시각화 및 사후검정 옵션 */}
                <Card>
                  <CardHeader>
                    <CardTitle>추가 분석 옵션</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="w-full">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        박스플롯 생성
                      </Button>
                      <Button variant="outline" className="w-full">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        순위 플롯 생성
                      </Button>
                      {(selectedTest === 'kruskal-wallis' || selectedTest === 'friedman') && (
                        <Button variant="outline" className="w-full">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          사후검정 수행
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        <FileText className="w-4 h-4 mr-2" />
                        보고서 생성
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StatisticsPageLayout>
  )
}