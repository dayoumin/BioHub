'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Activity, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { StatisticsPageLayout, StepCard } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'

interface MannKendallResult {
  trend: 'increasing' | 'decreasing' | 'no trend'
  h: boolean
  p: number
  z: number
  tau: number
  s: number
  var_s: number
  slope: number
  intercept: number
}

interface MannKendallTestProps {
  selectedTest: string
}

const MANN_KENDALL_TESTS = {
  original: {
    name: '기본 Mann-Kendall 검정',
    description: '시계열 데이터의 단조 추세 검정',
    requirements: '연속적인 시간 순서 데이터'
  },
  hamed_rao: {
    name: 'Hamed-Rao 수정 MK 검정',
    description: '자기상관 보정된 Mann-Kendall 검정',
    requirements: '자기상관이 있는 시계열 데이터'
  },
  yue_wang: {
    name: 'Yue-Wang 수정 MK 검정',
    description: '분산 보정된 Mann-Kendall 검정',
    requirements: '분산이 불균등한 시계열 데이터'
  },
  prewhitening: {
    name: 'Pre-whitening MK 검정',
    description: '사전 백색화 처리된 Mann-Kendall 검정',
    requirements: '강한 자기상관이 있는 데이터'
  }
}

const MannKendallTest: React.FC<MannKendallTestProps> = ({ selectedTest }) => {
  const [result, setResult] = useState<MannKendallResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pyodideService = usePyodideService()

  const handleAnalysis = useCallback(async (variableMapping: VariableMapping) => {
    if (!variableMapping.target || variableMapping.target.length === 0) {
      setError('시계열 변수를 선택해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const timeData = variableMapping.target[0].data

      const pythonCode = `
import numpy as np
import pymannkendall as mk

# 데이터 준비
data = ${JSON.stringify(timeData)}
data = np.array([x for x in data if x is not None and not np.isnan(x)])

if len(data) < 4:
    raise ValueError("Mann-Kendall 검정에는 최소 4개의 관측값이 필요합니다.")

# Mann-Kendall 검정 실행
test_type = "${selectedTest}"

if test_type == "original":
    result = mk.original_test(data, alpha=0.05)
elif test_type == "hamed_rao":
    result = mk.hamed_rao_modification_test(data, alpha=0.05)
elif test_type == "yue_wang":
    result = mk.yue_wang_modification_test(data, alpha=0.05)
elif test_type == "prewhitening":
    result = mk.pre_whitening_modification_test(data, alpha=0.05)
else:
    result = mk.original_test(data, alpha=0.05)

{
    'trend': result.trend,
    'h': bool(result.h),
    'p': float(result.p),
    'z': float(result.z),
    'tau': float(result.Tau),
    's': float(result.s),
    'var_s': float(result.var_s),
    'slope': float(result.slope),
    'intercept': float(result.intercept)
}
`

      const analysisResult = await pyodideService.runPython(pythonCode)
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedTest, pyodideService])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'no trend': return <Minus className="w-4 h-4 text-gray-600" />
      default: return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing': return '증가 추세'
      case 'decreasing': return '감소 추세'
      case 'no trend': return '추세 없음'
      default: return '알 수 없음'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'bg-green-50 text-green-700 border-green-200'
      case 'decreasing': return 'bg-red-50 text-red-700 border-red-200'
      case 'no trend': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <VariableSelector
        data={null}
        onVariableSelect={handleAnalysis}
        isLoading={isLoading}
        requirements={{
          target: {
            min: 1,
            max: 1,
            label: '시계열 변수',
            description: '시간 순서대로 측정된 연속형 변수를 선택하세요'
          }
        }}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>분석 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-6">
          {/* 주요 결과 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">추세 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getTrendIcon(result.trend)}
                  <div>
                    <div className="text-lg font-semibold">{getTrendLabel(result.trend)}</div>
                    <Badge className={getTrendColor(result.trend)}>
                      {result.h ? '유의함' : '유의하지 않음'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">p-value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.p < 0.001 ? '< 0.001' : result.p.toFixed(4)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.p < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sen&apos;s Slope</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.slope.toFixed(6)}
                </div>
                <div className="text-sm text-muted-foreground">
                  단위 시간당 변화량
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="statistics" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="statistics">통계량</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="assumptions">가정</TabsTrigger>
              <TabsTrigger value="visualization">시각화</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Mann-Kendall 통계량</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">검정통계량 (Z)</span>
                        <span className="font-mono">{result.z.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Kendall&apos;s Tau</span>
                        <span className="font-mono">{result.tau.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">S 통계량</span>
                        <span className="font-mono">{result.s.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">분산 (Var(S))</span>
                        <span className="font-mono">{result.var_s.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">절편</span>
                        <span className="font-mono">{result.intercept.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">p-value</span>
                        <span className="font-mono">{result.p < 0.001 ? '< 0.001' : result.p.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interpretation">
              <Card>
                <CardHeader>
                  <CardTitle>결과 해석</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">추세 해석</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      {result.trend === 'increasing' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-700">증가 추세 감지</span>
                          </div>
                          <p className="text-sm">
                            시계열 데이터에서 통계적으로 유의한 증가 추세가 발견되었습니다.
                            Sen&apos;s slope ({result.slope.toFixed(6)})는 단위 시간당 평균 증가량을 나타냅니다.
                          </p>
                        </div>
                      )}
                      {result.trend === 'decreasing' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-700">감소 추세 감지</span>
                          </div>
                          <p className="text-sm">
                            시계열 데이터에서 통계적으로 유의한 감소 추세가 발견되었습니다.
                            Sen&apos;s slope ({result.slope.toFixed(6)})는 단위 시간당 평균 감소량을 나타냅니다.
                          </p>
                        </div>
                      )}
                      {result.trend === 'no trend' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Minus className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-700">추세 없음</span>
                          </div>
                          <p className="text-sm">
                            시계열 데이터에서 통계적으로 유의한 추세가 발견되지 않았습니다.
                            데이터는 시간에 따라 일정한 패턴을 보이지 않습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">통계적 유의성</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        p-value = {result.p < 0.001 ? '< 0.001' : result.p.toFixed(6)}
                        {result.p < 0.01 && ', 매우 강한 증거'}
                        {result.p >= 0.01 && result.p < 0.05 && ', 중간 정도의 증거'}
                        {result.p >= 0.05 && ', 약한 증거 또는 증거 없음'}
                      </p>
                      <p className="text-sm mt-2">
                        Kendall&apos;s Tau = {result.tau.toFixed(4)}
                        (상관의 강도: {Math.abs(result.tau) < 0.3 ? '약함' : Math.abs(result.tau) < 0.7 ? '중간' : '강함'})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assumptions">
              <Card>
                <CardHeader>
                  <CardTitle>Mann-Kendall 검정 가정</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">비모수적 방법</h4>
                        <p className="text-sm text-muted-foreground">
                          정규분포 가정이 불필요하여 다양한 분포의 데이터에 적용 가능합니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">독립성 가정</h4>
                        <p className="text-sm text-muted-foreground">
                          관측값들이 상호 독립적이어야 합니다. 자기상관이 있는 경우
                          Hamed-Rao 또는 Pre-whitening 수정 방법을 사용하세요.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">최소 표본 크기</h4>
                        <p className="text-sm text-muted-foreground">
                          최소 4개의 관측값이 필요하며, 더 정확한 결과를 위해서는
                          10개 이상의 관측값을 권장합니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">단조성 가정</h4>
                        <p className="text-sm text-muted-foreground">
                          이 검정은 단조 증가 또는 단조 감소 추세만 감지할 수 있으며,
                          계절성이나 주기적 패턴은 감지하지 못합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visualization">
              <Card>
                <CardHeader>
                  <CardTitle>시각화 가이드</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>추천 시각화</AlertTitle>
                      <AlertDescription>
                        시계열 플롯과 Sen&apos;s slope 추세선을 함께 표시하여 결과를 시각적으로 확인하세요.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">해석 가이드</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• 추세선의 기울기 = Sen&apos;s slope ({result.slope.toFixed(6)})</li>
                        <li>• 추세선이 위로 향하면 증가 추세, 아래로 향하면 감소 추세</li>
                        <li>• p-value가 0.05 미만이면 추세가 통계적으로 유의함</li>
                        <li>• Kendall&apos;s Tau는 추세의 강도를 나타냄 (-1 ~ 1)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

export default function MannKendallPage() {
  const [selectedTest, setSelectedTest] = useState('original')

  return (
    <StatisticsPageLayout
      title="Mann-Kendall 추세 검정"
      description="시계열 데이터에서 단조 증가/감소 추세를 검정하는 비모수적 방법"
      steps={[
        {
          title: "방법론 이해",
          description: "Mann-Kendall 검정은 시계열 데이터에서 단조 추세를 감지하는 강력한 비모수적 방법입니다. 정규분포 가정 없이 증가/감소 추세를 검정할 수 있습니다.",
          content: (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StepCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="언제 사용하나요?"
                  items={[
                    "시계열 데이터의 증가/감소 추세 확인",
                    "기후 데이터, 수질 모니터링 분석",
                    "경제 지표의 장기 추세 분석",
                    "정규분포를 따르지 않는 시계열 데이터"
                  ]}
                />
                <StepCard
                  icon={<Activity className="w-5 h-5" />}
                  title="장점"
                  items={[
                    "정규분포 가정 불필요 (비모수적)",
                    "이상치에 강건함",
                    "Sen's slope로 추세 크기 정량화",
                    "다양한 수정 방법 제공"
                  ]}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>검정 방법 선택</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Mann-Kendall 검정 유형</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        데이터의 특성에 따라 적절한 검정 방법을 선택하세요.
                      </p>
                    </div>
                    <RadioGroup
                      value={selectedTest}
                      onValueChange={setSelectedTest}
                      className="space-y-3"
                    >
                      {Object.entries(MANN_KENDALL_TESTS).map(([key, test]) => (
                        <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <RadioGroupItem value={key} id={key} className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor={key} className="font-medium cursor-pointer">
                              {test.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {test.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              적용: {test.requirements}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        },
        {
          title: "데이터 업로드",
          description: "시계열 데이터를 업로드하세요. 시간 순서대로 정렬된 연속형 변수가 필요합니다.",
          content: <DataUploadStep />
        },
        {
          title: "변수 선택 및 분석",
          description: "추세를 검정할 시계열 변수를 선택하고 분석을 실행합니다.",
          content: <MannKendallTest selectedTest={selectedTest} />
        },
        {
          title: "결과 해석",
          description: "Mann-Kendall 검정 결과를 해석하고 추세의 통계적 유의성을 확인합니다.",
          content: (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>결과 해석 가이드</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>• <strong>추세 결과</strong>: increasing(증가), decreasing(감소), no trend(추세없음)</div>
                  <div>• <strong>p-value</strong>: 0.05 미만이면 통계적으로 유의한 추세</div>
                  <div>• <strong>Sen&apos;s slope</strong>: 단위 시간당 변화량 (기울기)</div>
                  <div>• <strong>Kendall&apos;s Tau</strong>: 추세의 강도 (-1 ~ 1)</div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sen&apos;s Slope 해석</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="space-y-1">
                      <li>• 양수: 증가 추세의 크기</li>
                      <li>• 음수: 감소 추세의 크기</li>
                      <li>• 0에 가까움: 추세가 거의 없음</li>
                      <li>• 단위: (종속변수 단위)/(시간 단위)</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">활용 분야</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="space-y-1">
                      <li>• 기후변화 모니터링</li>
                      <li>• 수질/대기질 추세 분석</li>
                      <li>• 경제 지표 장기 분석</li>
                      <li>• 의료 데이터 추세 감지</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        }
      ]}
    />
  )
}