'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Activity, CheckCircle, AlertTriangle, TrendingUp, Zap, Info } from 'lucide-react'
import { StatisticsPageLayout, StepCard } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { VariableMapping } from '@/components/variable-selection/types'
import { usePyodideService } from '@/hooks/use-pyodide-service'

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

const DoseResponseAnalysis: React.FC<DoseResponseAnalysisProps> = ({ selectedModel }) => {
  const [result, setResult] = useState<DoseResponseResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [constraintsEnabled, setConstraintsEnabled] = useState(false)
  const [bottomConstraint, setBottomConstraint] = useState('')
  const [topConstraint, setTopConstraint] = useState('')
  const pyodideService = usePyodideService()

  const handleAnalysis = useCallback(async (variableMapping: VariableMapping) => {
    if (!variableMapping.predictor || variableMapping.predictor.length === 0) {
      setError('용량(농도) 변수를 선택해주세요.')
      return
    }

    if (!variableMapping.target || variableMapping.target.length === 0) {
      setError('반응 변수를 선택해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const doseData = variableMapping.predictor[0].data
      const responseData = variableMapping.target[0].data

      const pythonCode = `
import numpy as np
import scipy.optimize as opt
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# 데이터 준비
dose_data = ${JSON.stringify(doseData)}
response_data = ${JSON.stringify(responseData)}

# 결측값 제거
dose_array = np.array([x for x in dose_data if x is not None and not np.isnan(x)])
response_array = np.array([x for x in response_data if x is not None and not np.isnan(x)])

if len(dose_array) != len(response_array):
    min_len = min(len(dose_array), len(response_array))
    dose_array = dose_array[:min_len]
    response_array = response_array[:min_len]

if len(dose_array) < 5:
    raise ValueError("용량-반응 분석에는 최소 5개의 데이터 포인트가 필요합니다.")

# 용량 데이터 로그 변환 (0 값 처리)
log_dose = np.log10(dose_array + np.min(dose_array[dose_array > 0]) / 1000)

model_type = "${selectedModel}"

def logistic4_model(x, a, b, c, d):
    return d + (a - d) / (1 + (x / c) ** b)

def logistic3_model(x, a, b, c):
    return a / (1 + (x / c) ** b)

def weibull_model(x, a, b, c, d):
    return d + (a - d) * np.exp(-np.exp(b * (np.log(x) - np.log(c))))

def gompertz_model(x, a, b, c):
    return a * np.exp(-np.exp(b * (c - x)))

def biphasic_model(x, a1, b1, c1, a2, b2, c2, d):
    return d + (a1 - d) / (1 + (x / c1) ** b1) + (a2 - d) / (1 + (x / c2) ** b2)

# 모델 선택 및 초기 추정값
y_max = np.max(response_array)
y_min = np.min(response_array)
x_mid = np.median(dose_array)

try:
    if model_type == "logistic4":
        model_func = logistic4_model
        initial_guess = [y_max, 1.0, x_mid, y_min]
        bounds = ([0, 0.1, np.min(dose_array), 0],
                 [2*y_max, 10, np.max(dose_array), y_max])
        param_names = ['top', 'hill_slope', 'ec50', 'bottom']

    elif model_type == "logistic3":
        model_func = logistic3_model
        initial_guess = [y_max, 1.0, x_mid]
        bounds = ([0, 0.1, np.min(dose_array)],
                 [2*y_max, 10, np.max(dose_array)])
        param_names = ['top', 'hill_slope', 'ec50']

    elif model_type == "weibull":
        model_func = weibull_model
        initial_guess = [y_max, 1.0, x_mid, y_min]
        bounds = ([0, 0.1, np.min(dose_array), 0],
                 [2*y_max, 5, np.max(dose_array), y_max])
        param_names = ['top', 'slope', 'inflection', 'bottom']

    elif model_type == "gompertz":
        model_func = gompertz_model
        initial_guess = [y_max, 1.0, x_mid]
        bounds = ([0, 0.1, np.min(dose_array)],
                 [2*y_max, 5, np.max(dose_array)])
        param_names = ['asymptote', 'growth_rate', 'inflection']

    else:  # biphasic
        model_func = biphasic_model
        initial_guess = [y_max*0.6, 1.0, x_mid*0.5, y_max*0.4, 1.0, x_mid*2, y_min]
        bounds = ([0, 0.1, np.min(dose_array), 0, 0.1, np.min(dose_array), 0],
                 [y_max, 10, np.max(dose_array), y_max, 10, np.max(dose_array), y_max])
        param_names = ['top1', 'hill1', 'ec50_1', 'top2', 'hill2', 'ec50_2', 'bottom']

    # 제약 조건 적용
    constraints_enabled = ${constraintsEnabled}
    if constraints_enabled:
        bottom_constraint = ${bottomConstraint ? parseFloat(bottomConstraint) : 'None'}
        top_constraint = ${topConstraint ? parseFloat(topConstraint) : 'None'}

        if bottom_constraint is not None and len(bounds[0]) > 3:
            bounds[0][3] = bottom_constraint  # bottom 최소값
            bounds[1][3] = bottom_constraint  # bottom 최대값
        if top_constraint is not None:
            bounds[0][0] = top_constraint    # top 최소값
            bounds[1][0] = top_constraint    # top 최대값

    # 모델 피팅
    popt, pcov = opt.curve_fit(model_func, dose_array, response_array,
                               p0=initial_guess, bounds=bounds, maxfev=5000)

    # 예측값 및 잔차
    fitted_values = model_func(dose_array, *popt)
    residuals = response_array - fitted_values

    # 통계량 계산
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((response_array - np.mean(response_array)) ** 2)
    r_squared = 1 - (ss_res / ss_tot)

    n = len(response_array)
    k = len(popt)
    aic = n * np.log(ss_res / n) + 2 * k
    bic = n * np.log(ss_res / n) + k * np.log(n)

    # 신뢰구간
    param_errors = np.sqrt(np.diag(pcov))
    confidence_intervals = {}
    for i, name in enumerate(param_names):
        ci_lower = popt[i] - 1.96 * param_errors[i]
        ci_upper = popt[i] + 1.96 * param_errors[i]
        confidence_intervals[name] = [float(ci_lower), float(ci_upper)]

    # 적합도 검정 (카이제곱)
    expected = fitted_values
    observed = response_array
    chi_square = np.sum((observed - expected) ** 2 / (expected + 1e-10))
    df = n - k
    p_value = 1 - stats.chi2.cdf(chi_square, df) if df > 0 else 1.0

    # 매개변수 딕셔너리
    parameters = {}
    for i, name in enumerate(param_names):
        parameters[name] = float(popt[i])

    # 특별한 매개변수들 (EC50, IC50 등)
    special_params = {}
    if 'ec50' in parameters:
        special_params['ec50'] = parameters['ec50']
        special_params['ed50'] = parameters['ec50']
    if 'hill_slope' in parameters:
        special_params['hill_slope'] = parameters['hill_slope']
    if 'top' in parameters:
        special_params['top'] = parameters['top']
    if 'bottom' in parameters:
        special_params['bottom'] = parameters['bottom']

    # IC50 계산 (억제 곡선인 경우)
    if 'top' in parameters and 'bottom' in parameters and 'ec50' in parameters:
        ic50_response = (parameters['top'] + parameters['bottom']) / 2
        special_params['ic50'] = parameters['ec50']  # 간단한 근사

except Exception as e:
    raise ValueError(f"모델 피팅 실패: {str(e)}")

{
    'model': model_type,
    'parameters': parameters,
    'fitted_values': fitted_values.tolist(),
    'residuals': residuals.tolist(),
    'r_squared': float(r_squared),
    'aic': float(aic),
    'bic': float(bic),
    **special_params,
    'confidence_intervals': confidence_intervals,
    'goodness_of_fit': {
        'chi_square': float(chi_square),
        'p_value': float(p_value),
        'degrees_freedom': int(df)
    }
}
`

      const analysisResult = await pyodideService.runPython(pythonCode)
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedModel, constraintsEnabled, bottomConstraint, topConstraint, pyodideService])

  const getModelQuality = (rSquared: number) => {
    if (rSquared >= 0.95) return { label: '매우 우수', color: 'bg-green-50 text-green-700 border-green-200' }
    if (rSquared >= 0.90) return { label: '우수', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (rSquared >= 0.80) return { label: '양호', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
    return { label: '개선 필요', color: 'bg-red-50 text-red-700 border-red-200' }
  }

  return (
    <div className="space-y-6">
      <VariableSelector
        data={null}
        onVariableSelect={handleAnalysis}
        isLoading={isLoading}
        requirements={{
          predictor: {
            min: 1,
            max: 1,
            label: '용량/농도 변수',
            description: '독립변수: 용량, 농도, 시간 등'
          },
          target: {
            min: 1,
            max: 1,
            label: '반응 변수',
            description: '종속변수: 생물학적 반응, 억제율, 활성도 등'
          }
        }}
      />

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
  const [selectedModel, setSelectedModel] = useState('logistic4')

  return (
    <StatisticsPageLayout
      title="용량-반응 분석"
      description="용량과 생물학적 반응 간의 관계를 수학적 모델로 분석하여 EC50, IC50 등 핵심 매개변수를 추정합니다"
      steps={[
        {
          title: "방법론 이해",
          description: "용량-반응 분석은 약물, 독소, 또는 기타 화학물질의 용량과 생물학적 반응 간의 관계를 정량적으로 분석하는 방법입니다.",
          content: (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StepCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="언제 사용하나요?"
                  items={[
                    "약물의 효력 및 독성 평가",
                    "EC50, IC50, ED50 값 결정",
                    "용량-반응 곡선 모델링",
                    "생물학적 활성 비교 연구"
                  ]}
                />
                <StepCard
                  icon={<Activity className="w-5 h-5" />}
                  title="주요 특징"
                  items={[
                    "S자형(시그모이드) 곡선 분석",
                    "다양한 수학적 모델 지원",
                    "신뢰구간 및 통계 검정",
                    "매개변수 제약조건 설정 가능"
                  ]}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>모델 선택</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">용량-반응 모델</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        데이터의 특성과 연구 목적에 따라 적절한 모델을 선택하세요.
                      </p>
                    </div>
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
                            <p className="text-xs text-blue-600">
                              적용: {model.applications}
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
          description: "용량(농도) 데이터와 해당하는 생물학적 반응 데이터를 업로드하세요.",
          content: <DataUploadStep />
        },
        {
          title: "변수 선택 및 분석",
          description: "용량 변수와 반응 변수를 선택하고 선택한 모델로 분석을 실행합니다.",
          content: <DoseResponseAnalysis selectedModel={selectedModel} />
        },
        {
          title: "결과 해석",
          description: "용량-반응 분석 결과를 해석하고 EC50, IC50 등 핵심 매개변수의 의미를 이해합니다.",
          content: (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>결과 해석 가이드</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>• <strong>EC50/IC50</strong>: 50% 효과를 나타내는 농도 (효력 지표)</div>
                  <div>• <strong>Hill 기울기</strong>: 곡선의 가파른 정도 (협력성 지표)</div>
                  <div>• <strong>R²</strong>: 모델의 설명력 (0.9 이상 권장)</div>
                  <div>• <strong>AIC/BIC</strong>: 모델 선택 지표 (낮을수록 좋음)</div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">모델 평가</CardTitle>
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
              </div>
            </div>
          )
        }
      ]}
    />
  )
}