'use client'

import React, { useState, useCallback, useEffect } from 'react'
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
import { Activity, CheckCircle, AlertTriangle, TrendingUp, Zap, Info, Target } from 'lucide-react'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector, VariableAssignment } from '@/components/variable-selection/VariableSelector'
import { useStatisticsPage , type UploadedData } from '@/hooks/use-statistics-page'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

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
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'pandas', 'scipy'])

      const predictorData = (typedVariables.factor || typedVariables.independent).map((factorName: string) => {
        return uploadedData.data.map(row => row[factorName])
      })
      const responseData = uploadedData.data.map(row => row[typedVariables.dependent])

      const pythonCode = `
import numpy as np
import pandas as pd
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from scipy import stats
import itertools
import warnings
import { type UploadedData } from '@/hooks/use-statistics-page'
warnings.filterwarnings('ignore')

# 데이터 준비
predictor_data = ${JSON.stringify(predictorData)}
response_data = ${JSON.stringify(responseData)}

# 데이터 정리
n_predictors = len(predictor_data)
n_obs = len(response_data)

# 예측변수 배열 생성
X_arrays = []
for i in range(n_predictors):
    data = predictor_data[i]
    clean_data = [x for x in data if x is not None and not np.isnan(x)]
    X_arrays.append(clean_data[:n_obs])

# 길이 맞추기
min_length = min(len(arr) for arr in X_arrays + [response_data])
X_arrays = [arr[:min_length] for arr in X_arrays]
y_clean = [x for x in response_data[:min_length] if x is not None and not np.isnan(x)]

if len(y_clean) < min_length:
    min_length = len(y_clean)
    X_arrays = [arr[:min_length] for arr in X_arrays]

X = np.column_stack(X_arrays)
y = np.array(y_clean)

if X.shape[0] < 10:
    raise ValueError("반응표면 분석에는 최소 10개의 관측값이 필요합니다.")

# 모델 설정
model_type = "${selectedModel}"
include_interaction = ${includeInteraction}
include_quadratic = ${includeQuadratic}

# 설계 행렬 생성
if model_type == "first_order":
    poly_features = PolynomialFeatures(degree=1, include_bias=True, interaction_only=False)
elif model_type == "first_order_interaction":
    poly_features = PolynomialFeatures(degree=2, include_bias=True, interaction_only=True)
elif model_type == "second_order":
    poly_features = PolynomialFeatures(degree=2, include_bias=True, interaction_only=False)
else:  # custom
    if include_quadratic:
        poly_features = PolynomialFeatures(degree=2, include_bias=True, interaction_only=not include_interaction)
    elif include_interaction:
        poly_features = PolynomialFeatures(degree=2, include_bias=True, interaction_only=True)
    else:
        poly_features = PolynomialFeatures(degree=1, include_bias=True, interaction_only=False)

X_poly = poly_features.fit_transform(X)
feature_names = poly_features.get_feature_names_out([f'X{i+1}' for i in range(n_predictors)])

# 모델 적합
model = LinearRegression()
model.fit(X_poly, y)

# 예측 및 잔차
y_pred = model.predict(X_poly)
residuals = y - y_pred

# 통계량
r2 = r2_score(y, y_pred)
n, p = X_poly.shape
adjusted_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)

# ANOVA 분석
ss_total = np.sum((y - np.mean(y)) ** 2)
ss_regression = np.sum((y_pred - np.mean(y)) ** 2)
ss_residual = np.sum(residuals ** 2)

df_regression = p - 1
df_residual = n - p
df_total = n - 1

ms_regression = ss_regression / df_regression
ms_residual = ss_residual / df_residual

f_statistic = ms_regression / ms_residual
f_pvalue = 1 - stats.f.cdf(f_statistic, df_regression, df_residual)

# 계수 딕셔너리
coefficients = {}
coefficients['intercept'] = float(model.intercept_)
for i, name in enumerate(feature_names[1:], 1):  # Skip intercept
    coefficients[name] = float(model.coef_[i])

# 최적화 분석 (2차 모델인 경우에만)
optimization_result = {
    'stationary_point': [],
    'stationary_point_response': 0,
    'nature': 'not_applicable',
    'canonical_analysis': {
        'eigenvalues': []
    }
}

if model_type == "second_order" or (model_type == "custom" and include_quadratic):
    try:
        # 2차 모델의 경우 임계점 분석
        # 단순화된 2변수 케이스 처리
        if n_predictors == 2:
            # 계수 추출 (간단한 케이스)
            b1 = coefficients.get('X1', 0)
            b2 = coefficients.get('X2', 0)
            b11 = coefficients.get('X1^2', 0)
            b22 = coefficients.get('X2^2', 0)
            b12 = coefficients.get('X1 X2', 0)

            # 헤시안 행렬
            if abs(b11) > 1e-10 or abs(b22) > 1e-10:
                H = np.array([[2*b11, b12], [b12, 2*b22]])
                gradient = np.array([b1, b2])

                try:
                    stationary_point = -0.5 * np.linalg.solve(H, gradient)
                    eigenvals = np.linalg.eigvals(H)

                    optimization_result['stationary_point'] = stationary_point.tolist()
                    optimization_result['canonical_analysis']['eigenvalues'] = eigenvals.tolist()

                    # 임계점 성질 판단
                    if all(eig < -1e-10 for eig in eigenvals):
                        nature = 'maximum'
                    elif all(eig > 1e-10 for eig in eigenvals):
                        nature = 'minimum'
                    else:
                        nature = 'saddle_point'

                    optimization_result['nature'] = nature

                    # 임계점에서의 반응값 계산 (근사)
                    x1_stat, x2_stat = stationary_point
                    response_at_stationary = (coefficients['intercept'] +
                                            b1 * x1_stat + b2 * x2_stat +
                                            b11 * x1_stat**2 + b22 * x2_stat**2 +
                                            b12 * x1_stat * x2_stat)
                    optimization_result['stationary_point_response'] = float(response_at_stationary)

                except np.linalg.LinAlgError:
                    optimization_result['nature'] = 'singular_matrix'

    except Exception:
        optimization_result['nature'] = 'analysis_failed'

# 적합도 결여 검정 (간단한 버전)
lack_of_fit_result = {
    'lack_of_fit_f': 0.0,
    'lack_of_fit_p': 1.0,
    'pure_error_available': False
}

# ANOVA 테이블
anova_table = {
    'source': ['Regression', 'Residual', 'Total'],
    'df': [int(df_regression), int(df_residual), int(df_total)],
    'ss': [float(ss_regression), float(ss_residual), float(ss_total)],
    'ms': [float(ms_regression), float(ms_residual), float(ss_total/df_total)],
    'f_value': [float(f_statistic), 0.0, 0.0],
    'p_value': [float(f_pvalue), 0.0, 0.0]
}

{
    'model_type': model_type,
    'coefficients': coefficients,
    'fitted_values': y_pred.tolist(),
    'residuals': residuals.tolist(),
    'r_squared': float(r2),
    'adjusted_r_squared': float(adjusted_r2),
    'f_statistic': float(f_statistic),
    'f_pvalue': float(f_pvalue),
    'anova_table': anova_table,
    'optimization': optimization_result,
    'design_adequacy': lack_of_fit_result
}
`

      pyodide.globals.set('predictor_data', predictorData)
      pyodide.globals.set('response_data', responseData)
      pyodide.globals.set('selectedModel', selectedModel)
      pyodide.globals.set('includeInteraction', includeInteraction)
      pyodide.globals.set('includeQuadratic', includeQuadratic)

      const resultStr = pyodide.runPython(pythonCode)
      const analysisResult: ResponseSurfaceResult = JSON.parse(resultStr)
      setResult(analysisResult)

      if (actions.completeAnalysis) {
        actions.completeAnalysis(analysisResult, 3)
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
        <VariableSelector
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Source</th>
                          <th className="text-right p-2">DF</th>
                          <th className="text-right p-2">Sum of Squares</th>
                          <th className="text-right p-2">Mean Square</th>
                          <th className="text-right p-2">F Value</th>
                          <th className="text-right p-2">p-value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.anova_table.source.map((source, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-medium">{source}</td>
                            <td className="text-right p-2">{result.anova_table.df[index]}</td>
                            <td className="text-right p-2">{result.anova_table.ss[index].toFixed(4)}</td>
                            <td className="text-right p-2">{result.anova_table.ms[index].toFixed(4)}</td>
                            <td className="text-right p-2">
                              {result.anova_table.f_value[index] > 0 ? result.anova_table.f_value[index].toFixed(4) : '-'}
                            </td>
                            <td className="text-right p-2">
                              {result.anova_table.p_value[index] > 0 ?
                                (result.anova_table.p_value[index] < 0.001 ? '< 0.001' : result.anova_table.p_value[index].toFixed(4)) :
                                '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

  const steps = [
    {
      id: 'step-1',
      number: 1,
      title: "방법론 이해",
      description: "반응표면 분석은 여러 독립변수가 종속변수에 미치는 영향을 다항식으로 모델링하여 최적화를 수행하는 통계 기법입니다.",
      status: (currentStep === 1 ? 'current' : (currentStep > 1 ? 'completed' : 'pending')) as 'pending' | 'current' | 'completed' | 'error'
    },
    {
      id: 'step-2',
      number: 2,
      title: "데이터 업로드",
      description: "여러 요인(독립변수)과 해당하는 반응값(종속변수) 데이터를 업로드하세요.",
      status: (currentStep === 2 ? 'current' : (currentStep > 2 ? 'completed' : 'pending')) as 'pending' | 'current' | 'completed' | 'error'
    },
    {
      id: 'step-3',
      number: 3,
      title: "변수 선택 및 분석",
      description: "예측변수(요인)들과 반응변수를 선택하고 선택한 모델로 분석을 실행합니다.",
      status: (currentStep === 3 ? 'current' : (currentStep > 3 ? 'completed' : 'pending')) as 'pending' | 'current' | 'completed' | 'error'
    }
  ]

  const renderMethodIntroduction = () => (
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
        <Button onClick={() => actions.setCurrentStep(2)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  )

  return (
    <StatisticsPageLayout
      steps={steps}
      currentStep={currentStep}
      title="반응표면 분석"
      description="다변수 최적화를 통해 여러 요인이 반응에 미치는 영향을 분석하고 최적 조건을 찾습니다"
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep
          onUploadComplete={handleDataUploadComplete}
          onPrevious={() => actions.setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
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
    </StatisticsPageLayout>
  )
}
