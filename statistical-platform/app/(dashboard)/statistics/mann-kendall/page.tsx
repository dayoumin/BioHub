'use client'

import React, { useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Activity, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { VariableMapping } from '@/components/variable-selection/types'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import type { PyodideInterface } from '@/types/pyodide'

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
  uploadedData: UploadedData | null
  onAnalysisStart: () => void
  onAnalysisComplete: (result: MannKendallResult) => void
  onError: (error: string) => void
}

const MANN_KENDALL_TESTS = {
  original: {
    name: '기본 Mann-Kendall 검정',
    description: '시계열 데이터의 단조 추세 검정',
    requirements: '연속적인 시간 순서 데이터'
  }
}

const MannKendallTest: React.FC<MannKendallTestProps> = ({
  selectedTest,
  uploadedData,
  onAnalysisStart,
  onAnalysisComplete,
  onError
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<MannKendallResult | null>(null)

  const handleAnalysis = useCallback(async (variableMapping: VariableMapping) => {
    // variable-requirements.ts에서 role='dependent'로 정의되어 있음
    const dependentVars = Array.isArray(variableMapping.dependent)
      ? variableMapping.dependent
      : variableMapping.dependent
        ? [variableMapping.dependent]
        : []

    if (!dependentVars || dependentVars.length === 0) {
      const errorMsg = '시계열 변수를 선택해주세요.'
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    if (!uploadedData) {
      const errorMsg = '데이터를 먼저 업로드해주세요.'
      setError(errorMsg)
      onError(errorMsg)
      return
    }

    setIsLoading(true)
    setError(null)
    onAnalysisStart()

    try {
      const targetVariable = dependentVars[0]
      const timeData = uploadedData.data.map(row => {
        const value = row[targetVariable]
        return typeof value === 'number' ? value : null
      }).filter((v): v is number => v !== null)

      // Pyodide 로드 및 실행
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])

      // Python 글로벌 스코프에 데이터 설정
      pyodide.globals.set('js_timeData', timeData)
      pyodide.globals.set('js_testType', selectedTest)

      const pythonCode = `
import numpy as np
from scipy import stats

# 데이터 준비
data = np.array(js_timeData)
data = np.array([x for x in data if x is not None and not np.isnan(x)])

if len(data) < 4:
    raise ValueError("Mann-Kendall 검정에는 최소 4개의 관측값이 필요합니다.")

n = len(data)

# Calculate S statistic
S = 0
for i in range(n-1):
    for j in range(i+1, n):
        S += np.sign(data[j] - data[i])

# Calculate variance of S
var_s = n * (n - 1) * (2 * n + 5) / 18

# Calculate standardized test statistic Z
if S > 0:
    z = (S - 1) / np.sqrt(var_s)
elif S < 0:
    z = (S + 1) / np.sqrt(var_s)
else:
    z = 0

# Calculate p-value (two-tailed test)
p = 2 * (1 - stats.norm.cdf(abs(z)))

# Calculate Kendall's tau
tau, _ = stats.kendalltau(range(n), data)

# Calculate slope (Sen's slope estimator)
slopes = []
for i in range(n-1):
    for j in range(i+1, n):
        if j != i:
            slope = (data[j] - data[i]) / (j - i)
            slopes.append(slope)
sen_slope = np.median(slopes) if slopes else 0

# Calculate intercept
intercept = np.median(data) - sen_slope * np.median(range(n))

# Determine trend
alpha = 0.05
if p < alpha:
    if z > 0:
        trend = 'increasing'
    else:
        trend = 'decreasing'
else:
    trend = 'no trend'

{
    'trend': trend,
    'h': bool(p < alpha),
    'p': float(p),
    'z': float(z),
    'tau': float(tau),
    's': int(S),
    'var_s': float(var_s),
    'slope': float(sen_slope),
    'intercept': float(intercept)
}
`

      const resultProxy = await pyodide.runPythonAsync(pythonCode)
      const analysisResult = resultProxy.toJs() as unknown

      // Type guard for result validation
      if (!analysisResult || typeof analysisResult !== 'object') {
        throw new Error('Invalid result format')
      }

      const typedResult = analysisResult as MannKendallResult
      setResult(typedResult)
      onAnalysisComplete(typedResult)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      setError(errorMsg)
      onError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTest, uploadedData, onAnalysisStart, onAnalysisComplete, onError])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-muted-foreground" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-muted-foreground" />
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
      case 'increasing': return 'bg-muted text-muted-foreground border'
      case 'decreasing': return 'bg-muted text-muted-foreground border'
      case 'no trend': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>변수 선택</AlertTitle>
        <AlertDescription>
          시간 순서대로 측정된 연속형 변수를 선택하고 분석을 시작하세요.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>시계열 변수 선택</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedData ? (
            <VariableSelector
              methodId="mann-kendall-test"
              data={uploadedData.data}
              onVariablesSelected={handleAnalysis}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              데이터를 먼저 업로드해주세요.
            </p>
          )}
        </CardContent>
      </Card>

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
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">증가 추세 감지</span>
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
                            <TrendingDown className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground">감소 추세 감지</span>
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
                      <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-semibold">비모수적 방법</h4>
                        <p className="text-sm text-muted-foreground">
                          정규분포 가정이 불필요하여 다양한 분포의 데이터에 적용 가능합니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-semibold">독립성 가정</h4>
                        <p className="text-sm text-muted-foreground">
                          관측값들이 상호 독립적이어야 합니다. 자기상관이 있는 경우
                          Hamed-Rao 또는 Pre-whitening 수정 방법을 사용하세요.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-semibold">최소 표본 크기</h4>
                        <p className="text-sm text-muted-foreground">
                          최소 4개의 관측값이 필요하며, 더 정확한 결과를 위해서는
                          10개 이상의 관측값을 권장합니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
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
  const [selectedTest, setSelectedTest] = React.useState('original')

  // Use the standard hook
  const { state, actions } = useStatisticsPage<MannKendallResult>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, results, isAnalyzing, error } = state

  const handleDataUploadComplete = useCallback((file: File, data: Record<string, unknown>[]) => {
    if (actions.setUploadedData) {
      actions.setUploadedData({
        data,
        fileName: file.name,
        columns: data.length > 0 ? Object.keys(data[0]) : []
      })
    }
    actions.setCurrentStep(2) // Move to next step
  }, [actions])

  // Build steps array dynamically based on currentStep
  const steps: StatisticsStep[] = useMemo(() => [
    {
      id: 'method',
      number: 1,
      title: '방법론 이해',
      description: 'Mann-Kendall 검정 선택',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: '시계열 데이터 업로드',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'analysis',
      number: 3,
      title: '변수 선택',
      description: '시계열 변수 선택 및 분석',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'results',
      number: 4,
      title: '결과 해석',
      description: 'Mann-Kendall 검정 결과',
      status: currentStep === 3 ? 'current' : 'pending'
    }
  ], [currentStep])

  // Render methods
  const renderMethodIntroduction = useCallback(() => (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StepCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="언제 사용하나요?"
                >
                  <ul className="space-y-2 text-sm">
                    <li>• 시계열 데이터의 증가/감소 추세 확인</li>
                    <li>• 기후 데이터, 수질 모니터링 분석</li>
                    <li>• 경제 지표의 장기 추세 분석</li>
                    <li>• 정규분포를 따르지 않는 시계열 데이터</li>
                  </ul>
                </StepCard>
                <StepCard
                  icon={<Activity className="w-5 h-5" />}
                  title="장점"
                >
                  <ul className="space-y-2 text-sm">
                    <li>• 정규분포 가정 불필요 (비모수적)</li>
                    <li>• 이상치에 강건함</li>
                    <li>• Sen&apos;s slope로 추세 크기 정량화</li>
                    <li>• 다양한 수정 방법 제공</li>
                  </ul>
                </StepCard>
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
  ), [selectedTest])

  const renderDataUpload = useCallback(() => (
    <DataUploadStep
      onUploadComplete={handleDataUploadComplete}
      onNext={() => actions.setCurrentStep(2)}
    />
  ), [handleDataUploadComplete, actions])

  const renderVariableSelection = useCallback(() => (
    <MannKendallTest
      selectedTest={selectedTest}
      uploadedData={uploadedData || null}
      onAnalysisStart={actions.startAnalysis}
      onAnalysisComplete={(result) => actions.completeAnalysis(result, 3)}
      onError={actions.setError}
    />
  ), [selectedTest, uploadedData, actions])

  const renderResults = useCallback(() => {
    if (!results) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>결과 없음</AlertTitle>
          <AlertDescription>
            분석 결과가 없습니다. 변수를 선택하고 분석을 실행해주세요.
          </AlertDescription>
        </Alert>
      )
    }

    const getTrendIcon = (trend: string) => {
      switch (trend) {
        case 'increasing': return <TrendingUp className="w-4 h-4 text-muted-foreground" />
        case 'decreasing': return <TrendingDown className="w-4 h-4 text-muted-foreground" />
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
        case 'increasing': return 'bg-muted text-muted-foreground border'
        case 'decreasing': return 'bg-muted text-muted-foreground border'
        case 'no trend': return 'bg-gray-50 text-gray-700 border-gray-200'
        default: return 'bg-gray-50 text-gray-700 border-gray-200'
      }
    }

    return (
      <div className="space-y-6">
        {/* 주요 결과 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">추세 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getTrendIcon(results.trend)}
                <div>
                  <div className="text-lg font-semibold">{getTrendLabel(results.trend)}</div>
                  <Badge className={getTrendColor(results.trend)}>
                    {results.h ? '유의함' : '유의하지 않음'}
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
                {results.p < 0.001 ? '< 0.001' : results.p.toFixed(4)}
              </div>
              <div className="text-sm text-muted-foreground">
                {results.p < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sen&apos;s Slope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.slope.toFixed(6)}
              </div>
              <div className="text-sm text-muted-foreground">
                단위 시간당 변화량
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 상세 통계량 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상세 통계량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Z-통계량</div>
                <div className="text-lg font-semibold">{results.z.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Kendall&apos;s Tau</div>
                <div className="text-lg font-semibold">{results.tau.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">S 통계량</div>
                <div className="text-lg font-semibold">{results.s}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">분산</div>
                <div className="text-lg font-semibold">{results.var_s.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 해석 가이드 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>결과 해석 가이드</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>• <strong>추세 결과</strong>: {getTrendLabel(results.trend)}</div>
            <div>• <strong>p-value</strong>: {results.p.toFixed(4)} ({results.p < 0.05 ? '유의함' : '유의하지 않음'})</div>
            <div>• <strong>Sen&apos;s slope</strong>: {results.slope.toFixed(6)} (단위 시간당 변화량)</div>
            <div>• <strong>Kendall&apos;s Tau</strong>: {results.tau.toFixed(4)} (추세 강도: -1 ~ 1)</div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }, [results])

  return (
    <StatisticsPageLayout
      title="Mann-Kendall 추세 검정"
      subtitle="시계열 데이터의 단조 증가/감소 추세 검정"
      icon={<Activity className="w-6 h-6" />}
      methodInfo={{
        formula: 'S = Σ sgn(xⱼ - xᵢ), τ = S / [n(n-1)/2]',
        assumptions: ['비모수적', '독립성', '시간 순서 데이터'],
        sampleSize: '최소 4개 (10개 이상 권장)',
        usage: '기후 추세, 수질 모니터링, 경제 지표 분석'
      }}
      steps={steps}
      currentStep={currentStep}
      onStepChange={actions.setCurrentStep}
      onRun={() => {}}
      onReset={actions.reset}
      isRunning={isAnalyzing}
      showProgress={true}
      showTips={true}
    >
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && renderDataUpload()}
      {currentStep === 2 && renderVariableSelection()}
      {currentStep === 3 && renderResults()}
    </StatisticsPageLayout>
  )
}