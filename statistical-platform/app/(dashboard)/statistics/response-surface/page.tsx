'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { addToRecentStatistics } from '@/lib/utils/recent-statistics'
import type { ResponseSurfaceVariables } from '@/types/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Activity, CheckCircle, CheckCircle2, AlertTriangle, TrendingUp, Zap, Info, Target } from 'lucide-react'

// Components
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { PValueBadge } from '@/components/statistics/common/PValueBadge'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'
import type { Step as TwoPanelStep } from '@/components/statistics/layouts/TwoPanelLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelectorModern } from '@/components/variable-selection/VariableSelectorModern'

import type { VariableAssignment } from '@/types/statistics-converters'
import { useStatisticsPage , type UploadedData } from '@/hooks/use-statistics-page'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface ResponseSurfaceResult {
  model_type: string
  coefficients: {
    [key: string]: number
  }
  fitted_values: number[]
  residuals: number[]
  r_squared: number
  adjusted_r_squared: number
  f_statistic: number
  f_pvalue: number
  anova_table: {
    source: string[]
    df: number[]
    ss: number[]
    ms: number[]
    f_value: number[]
    p_value: number[]
  }
  optimization: {
    stationary_point: number[]
    stationary_point_response: number
    nature: string
    canonical_analysis: {
      eigenvalues: number[]
      ridge_analysis?: {
        distances: number[]
        responses: number[]
        optimal_distance: number
        optimal_response: number
      }
    }
  }
  design_adequacy: {
    lack_of_fit_f: number
    lack_of_fit_p: number
    pure_error_available: boolean
  }
}

// interface SelectedVariables {
//   dependent: string[]
//   factor: string[]
// }
// → types/statistics.ts의 ResponseSurfaceVariables 사용

interface ResponseSurfaceAnalysisProps {
  selectedModel: string
  includeInteraction: boolean
  includeQuadratic: boolean
  uploadedData: UploadedData | null | undefined
  actions: {
    setError: ((error: string) => void) | null
    startAnalysis: (() => void) | null
    completeAnalysis: ((results: ResponseSurfaceResult, step: number) => void) | null
  }
}

const RESPONSE_SURFACE_MODELS = {
  first_order: {
    name: '1차 모델 (선형)',
    description: '선형 주효과만 포함',
    equation: 'y = β₀ + β₁x₁ + β₂x₂ + ... + ε',
    applications: '초기 탐색, 선형 관계'
  },
  first_order_interaction: {
    name: '1차 + 교호작용 모델',
    description: '선형 주효과와 2차 교호작용',
    equation: 'y = β₀ + Σβᵢxᵢ + ΣΣβᵢⱼxᵢxⱼ + ε',
    applications: '요인간 상호작용이 중요한 경우'
  },
  second_order: {
    name: '2차 모델 (완전)',
    description: '선형, 교호작용, 2차항 모두 포함',
    equation: 'y = β₀ + Σβᵢxᵢ + ΣΣβᵢⱼxᵢxⱼ + Σβᵢᵢxᵢ² + ε',
    applications: '최적화, 곡면 분석'
  },
  custom: {
    name: '사용자 정의',
    description: '교호작용과 2차항을 선택적으로 포함',
    equation: '사용자가 선택한 항목에 따라 결정',
    applications: '특정 요구사항에 맞는 모델'
  }
}

const ResponseSurfaceAnalysis: React.FC<ResponseSurfaceAnalysisProps> = ({
  selectedModel,
  includeInteraction,
  includeQuadratic,
  uploadedData,
  actions
}) => {
  const [result, setResult] = useState<ResponseSurfaceResult | null>(null)

  const handleAnalysis = useCallback(async (variables: VariableAssignment) => {
    const typedVariables: ResponseSurfaceVariables = {
      dependent: Array.isArray(variables.dependent) ? variables.dependent[0] : variables.dependent as string,
      independent: Array.isArray(variables.factor) ? variables.factor : [variables.factor as string],
      factor: Array.isArray(variables.factor) ? variables.factor : [variables.factor as string]
    }
    if (!uploadedData) {
      if (actions.setError) {
        actions.setError('업로드된 데이터가 없습니다.')
      }
      return
    }

    if (!typedVariables.factor || typedVariables.factor.length < 2) {
      if (actions.setError) {
        actions.setError('반응표면 분석에는 최소 2개의 예측변수가 필요합니다.')
      }
      return
    }

    if (!typedVariables.dependent) {
      if (actions.setError) {
        actions.setError('반응변수를 선택해주세요.')
      }
      return
    }

    if (actions.startAnalysis) {
      actions.startAnalysis()
    }

    try {
      const pyodideCore = PyodideCoreService.getInstance()
      await pyodideCore.initialize()

      const predictorVars = typedVariables.factor || typedVariables.independent

      const result = await pyodideCore.callWorkerMethod<{
        modelType: string
        coefficients: { [key: string]: number }
        fittedValues: number[]
        residuals: number[]
        rSquared: number
        adjustedRSquared: number
        fStatistic: number
        fPvalue: number
        anovaTable: {
          source: string[]
          df: number[]
          ss: number[]
          ms: number[]
          fValue: number[]
          pValue: number[]
        }
        optimization: {
          stationaryPoint: number[]
          stationaryPointResponse: number
          nature: string
          canonicalAnalysis: {
            eigenvalues: number[]
          }
        }
        designAdequacy: {
          lackOfFitF: number
          lackOfFitP: number
          pureErrorAvailable: boolean
        }
      }>(PyodideWorker.Hypothesis, 'response_surface_analysis', {
        data: uploadedData.data as never,
        dependent_var: typedVariables.dependent,
        predictor_vars: predictorVars as never,
        model_type: selectedModel,
        include_interaction: includeInteraction,
        include_quadratic: includeQuadratic
      })

      // Convert camelCase to snake_case for ResponseSurfaceResult interface
      const analysisResult: ResponseSurfaceResult = {
        model_type: result.modelType,
        coefficients: result.coefficients,
        fitted_values: result.fittedValues,
        residuals: result.residuals,
        r_squared: result.rSquared,
        adjusted_r_squared: result.adjustedRSquared,
        f_statistic: result.fStatistic,
        f_pvalue: result.fPvalue,
        anova_table: {
          source: result.anovaTable.source,
          df: result.anovaTable.df,
          ss: result.anovaTable.ss,
          ms: result.anovaTable.ms,
          f_value: result.anovaTable.fValue,
          p_value: result.anovaTable.pValue
        },
        optimization: {
          stationary_point: result.optimization.stationaryPoint,
          stationary_point_response: result.optimization.stationaryPointResponse,
          nature: result.optimization.nature,
          canonical_analysis: {
            eigenvalues: result.optimization.canonicalAnalysis.eigenvalues
          }
        },
        design_adequacy: {
          lack_of_fit_f: result.designAdequacy.lackOfFitF,
          lack_of_fit_p: result.designAdequacy.lackOfFitP,
          pure_error_available: result.designAdequacy.pureErrorAvailable
        }
      }

      setResult(analysisResult)

      if (actions.completeAnalysis) {
        actions.completeAnalysis(analysisResult, 2)  // Stay on step 2 (results shown here)
      }
    } catch (err) {
      if (actions.setError) {
        actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
      }
    }
  }, [selectedModel, includeInteraction, includeQuadratic, uploadedData, actions])

  const getNatureLabel = (nature: string) => {
    switch (nature) {
      case 'maximum': return { label: '최대점', color: 'bg-muted text-muted-foreground border' }
      case 'minimum': return { label: '최소점', color: 'bg-muted text-muted-foreground border' }
      case 'saddle_point': return { label: '안장점', color: 'bg-muted text-muted-foreground border' }
      default: return { label: '분석 불가', color: 'bg-gray-50 text-gray-700 border-gray-200' }
    }
  }

  return (
    <div className="space-y-6">
      {uploadedData && (
        <VariableSelectorModern
          methodId="response-surface"
          data={uploadedData.data}
          onVariablesSelected={handleAnalysis}
        />
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
                <div className="text-sm text-muted-foreground">
                  수정 R² = {result.adjusted_r_squared.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">F-검정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  F = {result.f_statistic.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  p-value = {result.f_pvalue < 0.001 ? '< 0.001' : result.f_pvalue.toFixed(4)}
                </div>
              </CardContent>
            </Card>

            {result.optimization.nature !== 'not_applicable' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">임계점</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getNatureLabel(result.optimization.nature).color}>
                    {getNatureLabel(result.optimization.nature).label}
                  </Badge>
                  {result.optimization.stationary_point.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      예측 반응값: {result.optimization.stationary_point_response.toFixed(4)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 상세 결과 탭 */}
          <Tabs defaultValue="coefficients" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="coefficients">계수</TabsTrigger>
              <TabsTrigger value="anova">ANOVA</TabsTrigger>
              <TabsTrigger value="optimization">최적화</TabsTrigger>
              <TabsTrigger value="diagnostics">진단</TabsTrigger>
            </TabsList>

            <TabsContent value="coefficients">
              <Card>
                <CardHeader>
                  <CardTitle>모델 계수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(result.coefficients).map(([term, coefficient]) => (
                      <div key={term} className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">{term}</span>
                        <span className="font-mono text-lg">
                          {coefficient.toFixed(6)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anova">
              <Card>
                <CardHeader>
                  <CardTitle>분산분석표</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatisticsTable
                    columns={[
                      { key: 'source', header: 'Source', type: 'text' },
                      { key: 'df', header: 'DF', type: 'number', align: 'right' },
                      { key: 'ss', header: 'Sum of Squares', type: 'number', align: 'right' },
                      { key: 'ms', header: 'Mean Square', type: 'number', align: 'right' },
                      { key: 'fValue', header: 'F Value', type: 'number', align: 'right' },
                      { key: 'pValue', header: 'p-value', type: 'custom', align: 'right' }
                    ]}
                    data={result.anova_table.source.map((source, index) => ({
                      source,
                      df: result.anova_table.df[index],
                      ss: result.anova_table.ss[index].toFixed(4),
                      ms: result.anova_table.ms[index].toFixed(4),
                      fValue: result.anova_table.f_value[index] > 0 ? result.anova_table.f_value[index].toFixed(4) : '-',
                      pValue: result.anova_table.p_value[index] > 0 ? (
                        <PValueBadge value={result.anova_table.p_value[index]} />
                      ) : '-',
                      _highlighted: result.anova_table.p_value[index] > 0 && result.anova_table.p_value[index] < 0.05
                    }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimization">
              <Card>
                <CardHeader>
                  <CardTitle>최적화 분석</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.optimization.nature === 'not_applicable' ? (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>2차 항이 필요합니다</AlertTitle>
                      <AlertDescription>
                        최적화 분석을 위해서는 2차 모델 또는 2차 항을 포함한 사용자 정의 모델이 필요합니다.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">임계점 분석</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">성질: </span>
                            <Badge className={getNatureLabel(result.optimization.nature).color}>
                              {getNatureLabel(result.optimization.nature).label}
                            </Badge>
                          </div>
                          {result.optimization.stationary_point.length > 0 && (
                            <>
                              <div className="text-sm">
                                <span className="text-muted-foreground">임계점 좌표: </span>
                                ({result.optimization.stationary_point.map(x => x.toFixed(4)).join(', ')})
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">예측 반응값: </span>
                                {result.optimization.stationary_point_response.toFixed(4)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {result.optimization.canonical_analysis.eigenvalues.length > 0 && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">표준형 분석</h4>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-muted-foreground">고유값: </span>
                              {result.optimization.canonical_analysis.eigenvalues.map(x => x.toFixed(4)).join(', ')}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              • 모든 고유값이 음수면 최대점, 양수면 최소점, 혼재하면 안장점
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">모델 적합도</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">R²: </span>
                          {result.r_squared.toFixed(4)} ({(result.r_squared * 100).toFixed(1)}% 설명)
                        </div>
                        <div>
                          <span className="text-muted-foreground">수정 R²: </span>
                          {result.adjusted_r_squared.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>진단 권장사항</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <div>• 잔차의 정규성과 등분산성을 확인하세요</div>
                        <div>• 잔차 플롯에서 패턴이 없어야 합니다</div>
                        <div>• 이상치와 영향점을 확인하세요</div>
                        <div>• 실험 설계의 적절성을 검토하세요</div>
                      </AlertDescription>
                    </Alert>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">모델 선택 지침</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• 1차 모델: 선형 관계만 있는 경우</li>
                        <li>• 1차+교호작용: 요인간 상호작용이 중요한 경우</li>
                        <li>• 2차 모델: 최적점 근처에서 곡면 분석 시</li>
                        <li>• R² &gt; 0.8 이상 권장, 수정 R²도 고려</li>
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

export default function ResponseSurfacePage() {
  // 최근 사용 통계 자동 추가
  useEffect(() => {
    addToRecentStatistics('response-surface')
  }, [])

  const { state, actions } = useStatisticsPage<ResponseSurfaceResult, ResponseSurfaceVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, error } = state

  const [selectedModel, setSelectedModel] = useState('second_order')
  const [includeInteraction, setIncludeInteraction] = useState(true)
  const [includeQuadratic, setIncludeQuadratic] = useState(true)

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: '홈', href: '/' },
    { label: '통계 분석', href: '/statistics' },
    { label: '반응표면 분석', href: '/statistics/response-surface' }
  ], [])

  // Steps configuration (0-based indexing)
  const STEPS: TwoPanelStep[] = useMemo(() => [
    {
      id: 0,
      label: '방법 소개',
      completed: currentStep > 0
    },
    {
      id: 1,
      label: '데이터 업로드',
      completed: currentStep > 1
    },
    {
      id: 2,
      label: '변수 선택 및 분석',
      completed: currentStep > 2
    }
  ], [currentStep])

  const handleDataUploadComplete = useCallback((file: File, data: unknown[]) => {
    const uploadedData: UploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }

    if (!actions.setUploadedData) {
      console.error('[response-surface] setUploadedData not available')
      return
    }

    actions.setUploadedData(uploadedData)
    actions.setCurrentStep(2)
  }, [actions])

  const renderMethodIntroduction = useCallback(() => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              언제 사용하나요?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>• 다변수 공정 최적화</li>
              <li>• 실험계획법 (DOE) 결과 분석</li>
              <li>• 제품 품질 개선</li>
              <li>• 최적 조건 탐색</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              주요 특징
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>• 다항 회귀 모델링</li>
              <li>• 임계점 및 최적점 분석</li>
              <li>• 교호작용 효과 평가</li>
              <li>• 3D 반응표면 시각화</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>모델 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">반응표면 모델</Label>
              <p className="text-sm text-muted-foreground mb-3">
                실험 단계와 데이터 특성에 따라 적절한 모델을 선택하세요.
              </p>
            </div>
            <RadioGroup
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="space-y-3"
            >
              {Object.entries(RESPONSE_SURFACE_MODELS).map(([key, model]) => (
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
                      적용: {model.applications}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {selectedModel === 'custom' && (
              <Card className="bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">사용자 정의 옵션</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="interaction"
                      checked={includeInteraction}
                      onCheckedChange={(checked) => setIncludeInteraction(checked === true)}
                    />
                    <Label htmlFor="interaction" className="text-sm">
                      교호작용 항 포함 (Xi × Xj)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quadratic"
                      checked={includeQuadratic}
                      onCheckedChange={(checked) => setIncludeQuadratic(checked === true)}
                    />
                    <Label htmlFor="quadratic" className="text-sm">
                      2차 항 포함 (Xi²)
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(1)} size="lg">
          다음: 데이터 업로드
        </Button>
      </div>
    </div>
  ), [actions, selectedModel, setSelectedModel, includeInteraction, setIncludeInteraction, includeQuadratic, setIncludeQuadratic])

  return (
    <TwoPanelLayout
      analysisTitle="반응표면 분석"
      analysisSubtitle="Response Surface Methodology"
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
      {currentStep === 0 && renderMethodIntroduction()}
      {currentStep === 1 && (
        <DataUploadStep
          onUploadComplete={handleDataUploadComplete}
          currentStep={1}
          totalSteps={3}
        />
      )}
      {currentStep === 2 && (
        <ResponseSurfaceAnalysis
          selectedModel={selectedModel}
          includeInteraction={includeInteraction}
          includeQuadratic={includeQuadratic}
          uploadedData={uploadedData}
          actions={{
            setError: actions.setError || null,
            startAnalysis: actions.startAnalysis || null,
            completeAnalysis: actions.completeAnalysis || null
          }}
        />
      )}
    </TwoPanelLayout>
  )
}
