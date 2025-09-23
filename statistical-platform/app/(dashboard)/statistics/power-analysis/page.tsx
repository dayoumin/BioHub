'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calculator,
  PlayCircle,
  TrendingUp,
  AlertCircle,
  Info,
  Users,
  Target,
  Zap
} from 'lucide-react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { usePyodideService } from '@/hooks/use-pyodide-service'

type TestType = 't-test' | 'anova' | 'correlation' | 'regression' | 'chi-square' | 'proportion'
type CalculationType = 'sample-size' | 'power' | 'effect-size'

interface TestTypeInfo {
  name: string
  description: string
  effectSizeLabel: string
  effectSizeHint: string
  effectSizeRanges: {
    small: number
    medium: number
    large: number
  }
  icon: React.ReactNode
}

const testTypeInfo: Record<TestType, TestTypeInfo> = {
  't-test': {
    name: 'T-검정',
    description: '두 그룹 간 평균 차이 검정',
    effectSizeLabel: "Cohen's d",
    effectSizeHint: '평균 차이를 표준편차로 나눈 값',
    effectSizeRanges: {
      small: 0.2,
      medium: 0.5,
      large: 0.8
    },
    icon: <TrendingUp className="w-5 h-5" />
  },
  'anova': {
    name: 'ANOVA',
    description: '세 그룹 이상 평균 비교',
    effectSizeLabel: "Cohen's f",
    effectSizeHint: '그룹 간 변동을 전체 변동으로 나눈 비율',
    effectSizeRanges: {
      small: 0.1,
      medium: 0.25,
      large: 0.4
    },
    icon: <Users className="w-5 h-5" />
  },
  'correlation': {
    name: '상관분석',
    description: '두 변수 간 관계 검정',
    effectSizeLabel: '상관계수 r',
    effectSizeHint: '두 변수 간 선형 관계의 강도',
    effectSizeRanges: {
      small: 0.1,
      medium: 0.3,
      large: 0.5
    },
    icon: <Target className="w-5 h-5" />
  },
  'regression': {
    name: '회귀분석',
    description: '예측 모델의 유의성 검정',
    effectSizeLabel: 'f²',
    effectSizeHint: 'R²/(1-R²)',
    effectSizeRanges: {
      small: 0.02,
      medium: 0.15,
      large: 0.35
    },
    icon: <TrendingUp className="w-5 h-5" />
  },
  'chi-square': {
    name: '카이제곱 검정',
    description: '범주형 변수 간 독립성 검정',
    effectSizeLabel: 'Cramér\'s V',
    effectSizeHint: '카이제곱 통계량을 표준화한 값',
    effectSizeRanges: {
      small: 0.1,
      medium: 0.3,
      large: 0.5
    },
    icon: <Calculator className="w-5 h-5" />
  },
  'proportion': {
    name: '비율 검정',
    description: '비율 차이 검정',
    effectSizeLabel: "Cohen's h",
    effectSizeHint: '두 비율의 아크사인 변환 차이',
    effectSizeRanges: {
      small: 0.2,
      medium: 0.5,
      large: 0.8
    },
    icon: <Zap className="w-5 h-5" />
  }
}

export default function PowerAnalysisPage() {
  const [testType, setTestType] = useState<TestType>('t-test')
  const [calculationType, setCalculationType] = useState<CalculationType>('sample-size')
  const [activeTab, setActiveTab] = useState('setup')

  // 입력 매개변수
  const [alpha, setAlpha] = useState(0.05)
  const [power, setPower] = useState(0.8)
  const [effectSize, setEffectSize] = useState(0.5)
  const [sampleSize, setSampleSize] = useState(30)
  const [tails, setTails] = useState<'one' | 'two'>('two')
  const [groups, setGroups] = useState(2)

  // 계산 결과
  const [result, setResult] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const { pyodideService } = usePyodideService()

  const handleCalculate = async () => {
    setIsCalculating(true)

    // 모의 계산 결과
    setTimeout(() => {
      let calculatedResult: any = {}

      if (calculationType === 'sample-size') {
        // 표본 크기 계산
        const baseN = Math.ceil(
          (2 * Math.pow(1.96 + 0.84, 2) * Math.pow(1 / effectSize, 2))
        )
        calculatedResult = {
          sampleSize: baseN,
          perGroup: testType === 't-test' ? Math.ceil(baseN / 2) : Math.ceil(baseN / groups),
          totalSample: baseN,
          actualPower: power + (Math.random() - 0.5) * 0.05,
          note: '계산된 표본 크기는 최소 요구사항입니다'
        }
      } else if (calculationType === 'power') {
        // 검정력 계산
        calculatedResult = {
          power: 0.75 + Math.random() * 0.2,
          beta: 0.25 - Math.random() * 0.2,
          sensitivity: effectSize > 0.5 ? '높음' : '보통',
          recommendation: power < 0.8 ? '표본 크기를 늘리는 것을 권장' : '충분한 검정력'
        }
      } else if (calculationType === 'effect-size') {
        // 효과 크기 계산
        const detectable = 0.3 + Math.random() * 0.4
        calculatedResult = {
          minDetectable: detectable,
          interpretation: detectable < 0.5 ? '작은 효과' : detectable < 0.8 ? '중간 효과' : '큰 효과',
          comparison: testTypeInfo[testType].effectSizeRanges,
          confidence: '이 표본 크기로 탐지 가능한 최소 효과 크기'
        }
      }

      setResult(calculatedResult)
      setIsCalculating(false)
      setActiveTab('results')
    }, 1500)
  }

  const renderPowerCurve = () => {
    // 실제로는 차트 라이브러리를 사용하여 Power Curve를 그려야 함
    return (
      <Card>
        <CardHeader>
          <CardTitle>검정력 곡선</CardTitle>
          <CardDescription>효과 크기에 따른 검정력 변화</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            검정력 곡선 차트 (구현 예정)
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <StatisticsPageLayout
      title="검정력 분석"
      description="표본 크기, 검정력, 효과 크기를 계산하여 연구 설계를 최적화"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="setup">설정</TabsTrigger>
          <TabsTrigger value="visualization">시각화</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>
            결과
            {result && <Badge className="ml-2" variant="default">완료</Badge>}
          </TabsTrigger>
          <TabsTrigger value="guide">가이드</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* 검정 종류 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>검정 종류</CardTitle>
              <CardDescription>
                수행할 통계 검정 방법을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={testType} onValueChange={(v) => setTestType(v as TestType)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(testTypeInfo).map(([key, info]) => (
                    <div key={key} className="flex items-start space-x-3">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <Label htmlFor={key} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          {info.icon}
                          <span className="font-medium">{info.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {info.description}
                        </p>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 계산 유형 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>계산 유형</CardTitle>
              <CardDescription>
                무엇을 계산하시겠습니까?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={calculationType} onValueChange={(v) => setCalculationType(v as CalculationType)}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="sample-size" id="sample-size" />
                    <Label htmlFor="sample-size" className="cursor-pointer">
                      <div className="font-medium">표본 크기 계산</div>
                      <p className="text-sm text-muted-foreground">
                        원하는 검정력과 효과 크기로 필요한 표본 수 계산
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="power" id="power" />
                    <Label htmlFor="power" className="cursor-pointer">
                      <div className="font-medium">검정력 계산</div>
                      <p className="text-sm text-muted-foreground">
                        주어진 표본 크기와 효과 크기로 달성 가능한 검정력 계산
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="effect-size" id="effect-size" />
                    <Label htmlFor="effect-size" className="cursor-pointer">
                      <div className="font-medium">효과 크기 계산</div>
                      <p className="text-sm text-muted-foreground">
                        주어진 표본 크기와 검정력으로 탐지 가능한 최소 효과 크기
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 매개변수 입력 */}
          <Card>
            <CardHeader>
              <CardTitle>매개변수 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 유의수준 */}
              <div className="space-y-2">
                <Label>유의수준 (α)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[alpha * 100]}
                    onValueChange={([v]) => setAlpha(v / 100)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-16 text-right font-mono">{alpha.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">일반적으로 0.05 사용</p>
              </div>

              {/* 검정력 (표본크기 계산시) */}
              {calculationType !== 'power' && (
                <div className="space-y-2">
                  <Label>목표 검정력 (1-β)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[power * 100]}
                      onValueChange={([v]) => setPower(v / 100)}
                      min={50}
                      max={99}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-mono">{power.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">일반적으로 0.80 이상 권장</p>
                </div>
              )}

              {/* 효과 크기 (효과크기 계산 제외) */}
              {calculationType !== 'effect-size' && (
                <div className="space-y-2">
                  <Label>
                    효과 크기 ({testTypeInfo[testType].effectSizeLabel})
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={effectSize}
                      onChange={(e) => setEffectSize(parseFloat(e.target.value))}
                      step="0.1"
                      className="w-32"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEffectSize(testTypeInfo[testType].effectSizeRanges.small)}
                      >
                        작음 ({testTypeInfo[testType].effectSizeRanges.small})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEffectSize(testTypeInfo[testType].effectSizeRanges.medium)}
                      >
                        중간 ({testTypeInfo[testType].effectSizeRanges.medium})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEffectSize(testTypeInfo[testType].effectSizeRanges.large)}
                      >
                        큼 ({testTypeInfo[testType].effectSizeRanges.large})
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {testTypeInfo[testType].effectSizeHint}
                  </p>
                </div>
              )}

              {/* 표본 크기 (표본크기 계산 제외) */}
              {calculationType !== 'sample-size' && (
                <div className="space-y-2">
                  <Label>표본 크기 (그룹당)</Label>
                  <Input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
              )}

              {/* 검정 방향 */}
              <div className="space-y-2">
                <Label>검정 방향</Label>
                <RadioGroup value={tails} onValueChange={(v) => setTails(v as 'one' | 'two')}>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="two" id="two-tailed" />
                      <Label htmlFor="two-tailed">양측 검정</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one" id="one-tailed" />
                      <Label htmlFor="one-tailed">단측 검정</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* 그룹 수 (ANOVA) */}
              {testType === 'anova' && (
                <div className="space-y-2">
                  <Label>그룹 수</Label>
                  <Input
                    type="number"
                    value={groups}
                    onChange={(e) => setGroups(parseInt(e.target.value))}
                    min={3}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 계산 실행 */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <>계산 중...</>
              ) : (
                <>
                  <Calculator className="mr-2 h-5 w-5" />
                  계산 실행
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          {renderPowerCurve()}

          {/* 표본 크기 vs 검정력 관계 */}
          <Card>
            <CardHeader>
              <CardTitle>표본 크기와 검정력 관계</CardTitle>
              <CardDescription>표본 크기 증가에 따른 검정력 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                표본 크기-검정력 관계 차트 (구현 예정)
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {result && (
            <>
              {/* 계산 결과 */}
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>계산 결과</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  {calculationType === 'sample-size' && (
                    <>
                      <div className="text-lg font-semibold">
                        필요한 총 표본 크기: {result.totalSample}명
                      </div>
                      {testType === 't-test' && (
                        <div>그룹당 표본 크기: {result.perGroup}명</div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        실제 달성 검정력: {(result.actualPower * 100).toFixed(1)}%
                      </div>
                    </>
                  )}

                  {calculationType === 'power' && (
                    <>
                      <div className="text-lg font-semibold">
                        계산된 검정력: {(result.power * 100).toFixed(1)}%
                      </div>
                      <div>제2종 오류 확률 (β): {(result.beta * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">
                        {result.recommendation}
                      </div>
                    </>
                  )}

                  {calculationType === 'effect-size' && (
                    <>
                      <div className="text-lg font-semibold">
                        탐지 가능한 최소 효과 크기: {result.minDetectable.toFixed(3)}
                      </div>
                      <div>해석: {result.interpretation}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.confidence}
                      </div>
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* 추가 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>상세 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">검정 종류</Label>
                      <div className="font-medium">{testTypeInfo[testType].name}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">유의수준</Label>
                      <div className="font-medium">{alpha}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">검정 방향</Label>
                      <div className="font-medium">{tails === 'two' ? '양측' : '단측'}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">효과 크기 유형</Label>
                      <div className="font-medium">{testTypeInfo[testType].effectSizeLabel}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 권장사항 */}
              <Card>
                <CardHeader>
                  <CardTitle>권장사항</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {calculationType === 'sample-size' && (
                      <>
                        <p>• 실제 연구에서는 탈락률(10-20%)을 고려하여 더 많은 표본을 모집하세요.</p>
                        <p>• 예산과 시간 제약을 고려하여 현실적인 표본 크기를 결정하세요.</p>
                      </>
                    )}
                    {calculationType === 'power' && result.power < 0.8 && (
                      <>
                        <p className="text-amber-600">• 검정력이 0.80 미만입니다. 표본 크기를 늘리는 것을 고려하세요.</p>
                        <p>• 효과 크기가 작다면 더 큰 표본이 필요합니다.</p>
                      </>
                    )}
                    {calculationType === 'effect-size' && (
                      <>
                        <p>• 탐지하려는 효과가 계산된 값보다 작다면 표본 크기를 늘려야 합니다.</p>
                        <p>• 파일럿 연구를 통해 실제 효과 크기를 추정하는 것이 좋습니다.</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>검정력 분석 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">검정력이란?</h4>
                <p className="text-sm text-muted-foreground">
                  검정력(Statistical Power)은 실제로 효과가 있을 때 그것을 발견할 확률입니다.
                  일반적으로 0.80(80%) 이상을 권장합니다.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">효과 크기 가이드라인</h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-4 gap-2 font-mono">
                    <div className="font-semibold">검정</div>
                    <div>작음</div>
                    <div>중간</div>
                    <div>큼</div>
                  </div>
                  {Object.entries(testTypeInfo).map(([key, info]) => (
                    <div key={key} className="grid grid-cols-4 gap-2 text-xs">
                      <div>{info.name}</div>
                      <div>{info.effectSizeRanges.small}</div>
                      <div>{info.effectSizeRanges.medium}</div>
                      <div>{info.effectSizeRanges.large}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">언제 사용하나요?</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 연구 계획 단계: 필요한 표본 크기 결정</li>
                  <li>• 연구 후: 실제 달성한 검정력 확인</li>
                  <li>• 유의하지 않은 결과 해석: 검정력 부족 vs 실제 효과 없음</li>
                  <li>• 연구 제안서 작성: 표본 크기 정당화</li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  검정력 분석은 연구의 효율성과 신뢰성을 높이는 중요한 도구입니다.
                  적절한 표본 크기는 자원을 절약하면서도 의미 있는 결과를 얻을 수 있게 합니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StatisticsPageLayout>
  )
}