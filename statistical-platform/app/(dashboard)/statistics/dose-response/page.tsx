'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { DoseResponseVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Activity, CheckCircle, AlertTriangle, TrendingUp, Zap, Info, Target } from 'lucide-react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { createDataUploadHandler } from '@/lib/utils/statistics-handlers'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface DoseResponseResult {
  model: string
  parameters: {
    [key: string]: number
  }
  fitted_values: number[]
  residuals: number[]
  r_squared: number
  aic: number
  bic: number
  ec50?: number
  hill_slope?: number
  top?: number
  bottom?: number
  ic50?: number
  ed50?: number
  confidence_intervals: {
    [key: string]: [number, number]
  }
  goodness_of_fit: {
    chi_square: number
    p_value: number
    degrees_freedom: number
  }
}

interface DoseResponseAnalysisProps {
  selectedModel: string
  uploadedData: UploadedData | null
  actions: ReturnType<typeof useStatisticsPage<DoseResponseResult, DoseResponseVariables>>['actions']
}

const DOSE_RESPONSE_MODELS = {
  logistic4: {
    name: '4-매개변수 로지스틱',
    description: '고전적인 S자형 용량-반응 곡선 (4PL)',
    equation: 'y = D + (A-D)/(1+(x/C)^B)',
    parameters: ['A (최대값)', 'B (힐 기울기)', 'C (EC50)', 'D (최소값)'],
    applications: '대부분의 용량-반응 실험'
  },
  logistic3: {
    name: '3-매개변수 로지스틱',
    description: '최소값이 0으로 고정된 로지스틱 모델 (3PL)',
    equation: 'y = A/(1+(x/C)^B)',
    parameters: ['A (최대값)', 'B (힐 기울기)', 'C (EC50)'],
    applications: '최소값이 0인 억제/활성화 실험'
  },
  weibull: {
    name: 'Weibull 모델',
    description: '비대칭 S자형 곡선 모델',
    equation: 'y = D + (A-D) * exp(-exp(B*(log(x)-log(C))))',
    parameters: ['A (최대값)', 'B (기울기)', 'C (변곡점)', 'D (최소값)'],
    applications: '독성학, 생존 분석'
  },
  gompertz: {
    name: 'Gompertz 모델',
    description: '성장 곡선 모델',
    equation: 'y = A * exp(-exp(B*(C-x)))',
    parameters: ['A (최대값)', 'B (성장률)', 'C (변곡점)'],
    applications: '세포 성장, 종양 성장'
  },
  biphasic: {
    name: 'Biphasic 모델',
    description: '이중 용량-반응 곡선',
    equation: 'y = D + (A1-D)/(1+(x/C1)^B1) + (A2-D)/(1+(x/C2)^B2)',
    parameters: ['A1, A2 (최대값들)', 'B1, B2 (기울기들)', 'C1, C2 (EC50들)', 'D (최소값)'],
    applications: '복합 수용체, 다중 작용점'
  }
}

const DoseResponseAnalysis: React.FC<DoseResponseAnalysisProps> = ({ selectedModel, uploadedData, actions }) => {
  const [result, setResult] = useState<DoseResponseResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constraintsEnabled, setConstraintsEnabled] = useState(false)
  const [bottomConstraint, setBottomConstraint] = useState('')
  const [topConstraint, setTopConstraint] = useState('')
  const [doseColumn, setDoseColumn] = useState('')
  const [responseColumn, setResponseColumn] = useState('')

  const handleAnalysis = useCallback(async () => {
    if (!uploadedData) {
      setError('데이터를 먼저 업로드해주세요.')
      return
    }

    if (!doseColumn) {
      setError('용량(농도) 변수를 선택해주세요.')
      return
    }

    if (!responseColumn) {
      setError('반응 변수를 선택해주세요.')
      return
    }

    // Start analysis (set isAnalyzing = true)
    actions.startAnalysis?.()
    setIsLoading(true)
    setError(null)

    try {
      // PyodideCore 초기화
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      // Extract column data
      const doseData = uploadedData.data.map(row => {
        const value = (row as Record<string, unknown>)[doseColumn]
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })
      const responseData = uploadedData.data.map(row => {
        const value = (row as Record<string, unknown>)[responseColumn]
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })

      // Prepare parameters
      const params: Record<string, number[] | string | Record<string, number>> = {
        dose_data: doseData,
        response_data: responseData,
        model_type: selectedModel
      }

      if (constraintsEnabled && (bottomConstraint || topConstraint)) {
        const constraintsObj: Record<string, number> = {}
        if (bottomConstraint) {
          constraintsObj.bottom = parseFloat(bottomConstraint)
        }
        if (topConstraint) {
          constraintsObj.top = parseFloat(topConstraint)
        }
        params.constraints = constraintsObj
      }

      // Call Worker 4 dose_response_analysis method
      const analysisResult = await pyodideCore.callWorkerMethod<DoseResponseResult>(
        PyodideWorker.RegressionAdvanced,
        'dose_response_analysis',
        params
      )

      setResult(analysisResult)
      // Complete analysis (set results in store, advance to step 3)
      actions.completeAnalysis?.(analysisResult, 3)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      console.error('[dose-response] Analysis error:', errorMessage)
      setError(errorMessage)
      actions.setError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [uploadedData, doseColumn, responseColumn, selectedModel, constraintsEnabled, bottomConstraint, topConstraint, actions])

  const getModelQuality = (rSquared: number) => {
    if (rSquared >= 0.95) return { label: '매우 우수', color: 'bg-muted text-muted-foreground border' }
    if (rSquared >= 0.90) return { label: '우수', color: 'bg-muted text-muted-foreground border' }
    if (rSquared >= 0.80) return { label: '양호', color: 'bg-muted text-muted-foreground border' }
    return { label: '개선 필요', color: 'bg-muted text-muted-foreground border' }
  }

  return (
    <div className="space-y-6">
      {/* Variable Selection */}
      {uploadedData ? (
        <Card>
          <CardHeader>
            <CardTitle>변수 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dose-column">용량/농도 변수</Label>
              <select
                id="dose-column"
                value={doseColumn}
                onChange={(e) => setDoseColumn(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">선택하세요</option>
                {uploadedData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-1">
                독립변수: 용량, 농도, 시간 등
              </p>
            </div>

            <div>
              <Label htmlFor="response-column">반응 변수</Label>
              <select
                id="response-column"
                value={responseColumn}
                onChange={(e) => setResponseColumn(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">선택하세요</option>
                {uploadedData.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-1">
                종속변수: 생물학적 반응, 억제율, 활성도 등
              </p>
            </div>

            <Button
              onClick={handleAnalysis}
              disabled={isLoading || !doseColumn || !responseColumn}
              className="w-full"
            >
              {isLoading ? '분석 중...' : '분석 실행'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            변수를 선택하려면 먼저 데이터를 업로드해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 모델 제약조건 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>모델 제약조건 (선택사항)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable-constraints"
                checked={constraintsEnabled}
                onChange={(e) => setConstraintsEnabled(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="enable-constraints">매개변수 제약조건 사용</Label>
            </div>

            {constraintsEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bottom-constraint">최소값 고정</Label>
                  <Input
                    id="bottom-constraint"
                    type="number"
                    placeholder="예: 0"
                    value={bottomConstraint}
                    onChange={(e) => setBottomConstraint(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="top-constraint">최대값 고정</Label>
                  <Input
                    id="top-constraint"
                    type="number"
                    placeholder="예: 100"
                    value={topConstraint}
                    onChange={(e) => setTopConstraint(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">모델 적합도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R² = {result.r_squared.toFixed(4)}
                </div>
                <Badge className={getModelQuality(result.r_squared).color}>
                  {getModelQuality(result.r_squared).label}
                </Badge>
              </CardContent>
            </Card>

            {result.ec50 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">EC50/ED50</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {result.ec50.toFixed(4)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    50% 효과 농도
                  </div>
                </CardContent>
              </Card>
            )}

            {result.hill_slope && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Hill 기울기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {result.hill_slope.toFixed(4)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    곡선의 가파른 정도
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="parameters" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="parameters">매개변수</TabsTrigger>
              <TabsTrigger value="statistics">통계량</TabsTrigger>
              <TabsTrigger value="interpretation">해석</TabsTrigger>
              <TabsTrigger value="diagnostics">진단</TabsTrigger>
            </TabsList>

            <TabsContent value="parameters">
              <Card>
                <CardHeader>
                  <CardTitle>모델 매개변수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(result.parameters).map(([param, value]) => (
                      <div key={param} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <span className="font-semibold">{param}</span>
                          {result.confidence_intervals[param] && (
                            <div className="text-xs text-muted-foreground">
                              95% CI: [{result.confidence_intervals[param][0].toFixed(4)}, {result.confidence_intervals[param][1].toFixed(4)}]
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-lg">{value.toFixed(6)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>통계 지표</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">R-squared</span>
                        <span className="font-mono">{result.r_squared.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">AIC</span>
                        <span className="font-mono">{result.aic.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">BIC</span>
                        <span className="font-mono">{result.bic.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">χ² 통계량</span>
                        <span className="font-mono">{result.goodness_of_fit.chi_square.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">p-value</span>
                        <span className="font-mono">{result.goodness_of_fit.p_value.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">자유도</span>
                        <span className="font-mono">{result.goodness_of_fit.degrees_freedom}</span>
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
                    <h4 className="font-semibold">모델 적합도</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        R² = {result.r_squared.toFixed(4)} - {getModelQuality(result.r_squared).label}한 적합도를 보입니다.
                        {result.r_squared >= 0.95 && ' 매우 정확한 예측이 가능합니다.'}
                        {result.r_squared >= 0.90 && result.r_squared < 0.95 && ' 신뢰할 만한 예측이 가능합니다.'}
                        {result.r_squared >= 0.80 && result.r_squared < 0.90 && ' 적절한 예측 성능을 보입니다.'}
                        {result.r_squared < 0.80 && ' 모델 개선이나 다른 모델 검토가 필요할 수 있습니다.'}
                      </p>
                    </div>
                  </div>

                  {result.ec50 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">핵심 매개변수</h4>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm">
                          <strong>EC50 = {result.ec50.toFixed(4)}</strong>: 50% 효과를 나타내는 농도입니다.
                          {result.hill_slope && (
                            <>
                              <br />
                              <strong>Hill 기울기 = {result.hill_slope.toFixed(4)}</strong>:
                              {result.hill_slope > 1 ? ' 가파른 S자 곡선' : result.hill_slope < 1 ? ' 완만한 S자 곡선' : ' 표준적인 S자 곡선'}을 나타냅니다.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="font-semibold">적합도 검정</h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        카이제곱 검정: χ² = {result.goodness_of_fit.chi_square.toFixed(4)},
                        p-value = {result.goodness_of_fit.p_value.toFixed(4)}
                        {result.goodness_of_fit.p_value > 0.05 ?
                          ' - 모델이 데이터에 적절히 적합됩니다.' :
                          ' - 모델 적합도에 문제가 있을 수 있습니다.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostics">
              <Card>
                <CardHeader>
                  <CardTitle>모델 진단</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>잔차 분석 권장</AlertTitle>
                      <AlertDescription>
                        잔차의 정규성과 등분산성을 확인하여 모델의 가정을 검토하세요.
                        극단적인 이상치가 있다면 데이터 전처리를 고려하세요.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">모델 선택 지침</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• AIC/BIC가 낮을수록 더 좋은 모델</li>
                        <li>• R²이 높을수록 설명력이 좋음</li>
                        <li>• 잔차가 무작위로 분포해야 함</li>
                        <li>• 생물학적 의미가 타당해야 함</li>
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

export default function DoseResponsePage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('dose-response')
  }, [])

  // Hook for state management
  const { state, actions } = useStatisticsPage<DoseResponseResult, DoseResponseVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, error, results } = state

  const [selectedModel, setSelectedModel] = useState('logistic4')

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '용량-반응 분석', href: '/statistics/dose-response' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    { id: 0, label: '방법 소개', completed: currentStep > 0 },
    { id: 1, label: '데이터 업로드', completed: currentStep > 1 },
    { id: 2, label: '모델 선택 및 분석', completed: currentStep > 2 },
    { id: 3, label: '결과 해석', completed: currentStep > 3 }
  ], [currentStep])

  // Render Method Introduction (Step 0)
  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>방법론 이해</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            용량-반응 분석은 약물, 독소, 또는 기타 화학물질의 용량과 생물학적 반응 간의 관계를 정량적으로 분석하는 방법입니다.
          </p>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    언제 사용하나요?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 약물의 효력 및 독성 평가</li>
                    <li>• EC50, IC50, ED50 값 결정</li>
                    <li>• 용량-반응 곡선 모델링</li>
                    <li>• 생물학적 활성 비교 연구</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    주요 특징
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• S자형(시그모이드) 곡선 분석</li>
                    <li>• 다양한 수학적 모델 지원</li>
                    <li>• 신뢰구간 및 통계 검정</li>
                    <li>• 매개변수 제약조건 설정 가능</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>모델 선택</CardTitle>
                <CardDescription>
                  데이터의 특성과 연구 목적에 따라 적절한 모델을 선택하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  className="space-y-3"
                >
                  {Object.entries(DOSE_RESPONSE_MODELS).map(([key, model]) => (
                    <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor={key} className="font-medium cursor-pointer">
                          {model.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {model.description}
                        </p>
                        <p className="text-xs font-mono bg-muted/50 p-1 rounded">
                          {model.equation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          매개변수: {model.parameters.join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          적용: {model.applications}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => actions.setCurrentStep(1)}>
          다음 단계
          <CheckCircle className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  ), [selectedModel, actions])

  // Event handlers
  // 데이터 업로드 핸들러 (공통 유틸 사용 + 커스텀 에러 처리)
  const handleDataUploadComplete = createDataUploadHandler(
    actions.setUploadedData,
    (uploadedData) => {
      actions.setCurrentStep(2)
      if (actions.setError) {
        actions.setError('')
      }
    },
    'dose-response'
  )

  return (
    <TwoPanelLayout
      analysisTitle="용량-반응 분석"
      analysisSubtitle="Dose-Response Analysis"
      breadcrumbs={breadcrumbs}
      currentStep={currentStep}
      steps={STEPS}
      onStepChange={(step: number) => actions.setCurrentStep?.(step)}
      bottomPreview={uploadedData && currentStep >= 1 ? {
        data: uploadedData.data,
        fileName: uploadedData.fileName,
        maxRows: 5
      } : undefined}
    >
      {/* Step 0: 방법 소개 */}
      {currentStep === 0 && renderMethodIntroduction()}

      {/* Step 1: 데이터 업로드 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>데이터 업로드</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                용량(농도) 데이터와 해당하는 생물학적 반응 데이터를 업로드하세요.
              </p>
              <DataUploadStep
                onUploadComplete={handleDataUploadComplete}
                onNext={() => actions.setCurrentStep(2)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: 모델 선택 및 분석 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>변수 선택 및 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                용량 변수와 반응 변수를 선택하고 선택한 모델로 분석을 실행합니다.
              </p>
              <DoseResponseAnalysis
                selectedModel={selectedModel}
                uploadedData={uploadedData || null}
                actions={actions}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: 결과 해석 */}
      {currentStep === 3 && results && (
        <div className="space-y-6">
          {/* 주요 결과 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">모델 적합도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.r_squared?.toFixed(4) || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">R² (결정계수)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">EC50</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.ec50?.toFixed(6) || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">50% 효과 농도</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">모델</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.model || 'N/A'}</div>
                <p className="text-xs text-muted-foreground">선택된 모델</p>
              </CardContent>
            </Card>
          </div>

          {/* 모델 매개변수 */}
          <Card>
            <CardHeader>
              <CardTitle>모델 매개변수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.parameters && Object.entries(results.parameters).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{key}</p>
                    <p className="text-lg font-semibold">
                      {typeof value === 'number' ? value.toFixed(6) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 모델 평가 지표 */}
          <Card>
            <CardHeader>
              <CardTitle>모델 평가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">AIC</p>
                  <p className="text-lg font-semibold">{results.aic?.toFixed(4) || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">낮을수록 좋음</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">BIC</p>
                  <p className="text-lg font-semibold">{results.bic?.toFixed(4) || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">낮을수록 좋음</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Residuals</p>
                  <p className="text-lg font-semibold">{results.residuals?.length || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">잔차 개수</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 신뢰구간 */}
          {results.confidence_intervals && (
            <Card>
              <CardHeader>
                <CardTitle>신뢰구간 (95%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(results.confidence_intervals).map(([param, ci]) => (
                    <div key={param} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">{param}</span>
                      <span className="text-sm">
                        [{Array.isArray(ci) ? `${ci[0]?.toFixed(6)} ~ ${ci[1]?.toFixed(6)}` : 'N/A'}]
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 결과 해석 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle>결과 해석 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>주요 지표 해석</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>• <strong>EC50/IC50</strong>: 50% 효과를 나타내는 농도 (효력 지표)</div>
                  <div>• <strong>Hill 기울기</strong>: 곡선의 가파른 정도 (협력성 지표)</div>
                  <div>• <strong>R²</strong>: 모델의 설명력 (0.9 이상 권장)</div>
                  <div>• <strong>AIC/BIC</strong>: 모델 선택 지표 (낮을수록 좋음)</div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">모델 적합도 평가</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="space-y-1">
                      <li>• R² ≥ 0.95: 매우 우수</li>
                      <li>• R² ≥ 0.90: 우수</li>
                      <li>• R² ≥ 0.80: 양호</li>
                      <li>• R² &lt; 0.80: 개선 필요</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">주요 매개변수</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="space-y-1">
                      <li>• <strong>Top</strong>: 최대 반응값</li>
                      <li>• <strong>Bottom</strong>: 최소 반응값 (기저선)</li>
                      <li>• <strong>EC50</strong>: 50% 효과 농도</li>
                      <li>• <strong>Hill 기울기</strong>: 곡선 기울기</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </TwoPanelLayout>
  )
}