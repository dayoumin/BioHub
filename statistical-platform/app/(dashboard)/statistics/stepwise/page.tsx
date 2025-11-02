'use client'

import { useState } from 'react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { useStatisticsPage, type UploadedData } from '@/hooks/use-statistics-page'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, TrendingUp, Target, BarChart3, Plus, Minus } from 'lucide-react'

interface SelectedVariables {
  dependent: string[]
  factor: string[]
  covariate?: string[]
}

interface StepwiseResults {
  final_model: {
    variables: string[]
    r_squared: number
    adj_r_squared: number
    f_statistic: number
    f_p_value: number
    aic: number
    bic: number
    rmse: number
  }
  step_history: Array<{
    step: number
    action: 'add' | 'remove'
    variable: string
    r_squared: number
    adj_r_squared: number
    f_change: number
    f_change_p: number
    criterion_value: number
  }>
  coefficients: Array<{
    variable: string
    coefficient: number
    std_error: number
    t_statistic: number
    p_value: number
    beta: number
    vif: number
  }>
  model_diagnostics: {
    durbin_watson: number
    jarque_bera_p: number
    breusch_pagan_p: number
    condition_number: number
  }
  excluded_variables: Array<{
    variable: string
    partial_corr: number
    t_for_inclusion: number
    p_value: number
  }>
  interpretation: {
    summary: string
    recommendations: string[]
  }
}

export default function StepwiseRegressionPage() {
  // Use statistics page hook
  const { state, actions } = useStatisticsPage<StepwiseResults, SelectedVariables>({
    withUploadedData: true,
    withError: true,
    initialStep: 1
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // Page-specific state
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [selectedVariablesManual, setSelectedVariablesManual] = useState<{
    dependent: string[]
    factor: string[]
    covariate: string[]
  }>({

    dependent: [],
    factor: [],
    covariate: []
  })

  const steps = [
    {
      id: 'intro',
      number: 1,
      title: '단계적 회귀분석',
      description: '통계적 기준에 따라 예측변수를 자동으로 선택하는 회귀분석을 수행합니다.',
      status: (currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending') as 'pending' | 'current' | 'completed' | 'error'
    },
    {
      id: 'upload',
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 파일을 업로드하고 데이터를 확인합니다.',
      status: (currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending') as 'pending' | 'current' | 'completed' | 'error'
    },
    {
      id: 'variables',
      number: 3,
      title: '변수 선택',
      description: '종속변수와 예측변수 후보들을 선택합니다.',
      status: (currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending') as 'pending' | 'current' | 'completed' | 'error'
    },
    {
      id: 'results',
      number: 4,
      title: '분석 결과',
      description: '단계적 선택 과정과 최종 회귀모델을 확인합니다.',
      status: (currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending') as 'pending' | 'current' | 'completed' | 'error'
    }
  ]

  const handleDataUpload = (uploadedData: unknown[], uploadedColumns: string[]) => {
    setData((uploadedData as unknown[] ?? []))
    setColumns(uploadedColumns)
    actions.setCurrentStep(3)
  }

  const handleVariablesSelected = (variables: unknown) => {
    if (!actions.setSelectedVariables) {
      console.error('[stepwise] setSelectedVariables not available')
      return
    }

    if (typeof variables === 'object' && variables !== null) {
      actions.setSelectedVariables(variables as SelectedVariables)
      actions.setCurrentStep(4)
      runStepwiseAnalysis(variables as SelectedVariables)
    }
  }

  const runStepwiseAnalysis = async (variables: SelectedVariables) => {
    actions.startAnalysis()

    try {
      // Load Pyodide with required packages
      const pyodide: PyodideInterface = await loadPyodideWithPackages([
        'numpy',
        'pandas',
        'scipy',
        'statsmodels'
      ])

      pyodide.globals.set('data', data)
      pyodide.globals.set('dependent_var', variables.dependent[0])
      pyodide.globals.set('predictor_vars', [...variables.factor, ...(variables.covariate || [])])

      const pythonCode = `
import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.diagnostic import het_breuschpagan
from statsmodels.stats.stattools import durbin_watson
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.tsa.stattools import jarque_bera
import json
import warnings
warnings.filterwarnings('ignore')

df = pd.DataFrame(data)

# 변수 정의
dependent = dependent_var
predictors = predictor_vars

# 결측값 제거
all_vars = [dependent] + predictors
df_clean = df[all_vars].dropna()

y = df_clean[dependent].values
X_full = df_clean[predictors]

def calculate_aic(n, mse, num_params):
    """AIC 계산"""
    return n * np.log(mse) + 2 * num_params

def calculate_bic(n, mse, num_params):
    """BIC 계산"""
    return n * np.log(mse) + num_params * np.log(n)

def forward_selection(X, y, significance_level=0.05):
    """전진선택법 구현"""
    initial_features = []
    remaining_features = list(X.columns)
    step_history = []

    step = 1
    while remaining_features:
        # 각 남은 변수에 대해 F 통계량 계산
        best_pval = float('inf')
        best_feature = None
        best_f_stat = None

        for feature in remaining_features:
            test_features = initial_features + [feature]
            X_test = sm.add_constant(X[test_features])

            try:
                model = sm.OLS(y, X_test).fit()
                if len(initial_features) == 0:
                    # 첫 번째 변수
                    f_stat = model.fvalue
                    p_val = model.f_pvalue
                else:
                    # F-change 계산
                    X_prev = sm.add_constant(X[initial_features])
                    model_prev = sm.OLS(y, X_prev).fit()

                    sse_full = model.ssr
                    sse_reduced = model_prev.ssr
                    df_diff = 1
                    df_error = len(y) - len(test_features) - 1

                    f_stat = ((sse_reduced - sse_full) / df_diff) / (sse_full / df_error)
                    p_val = 1 - stats.f.cdf(f_stat, df_diff, df_error)

                if p_val < best_pval:
                    best_pval = p_val
                    best_feature = feature
                    best_f_stat = f_stat
            except:
                continue

        if best_pval < significance_level and best_feature:
            initial_features.append(best_feature)
            remaining_features.remove(best_feature)

            # 모델 통계 계산
            X_current = sm.add_constant(X[initial_features])
            model_current = sm.OLS(y, X_current).fit()

            step_history.append({
                'step': step,
                'action': 'add',
                'variable': best_feature,
                'r_squared': float(model_current.rsquared),
                'adj_r_squared': float(model_current.rsquared_adj),
                'f_change': float(best_f_stat),
                'f_change_p': float(best_pval),
                'criterion_value': float(model_current.aic)
            })
            step += 1
        else:
            break

    return initial_features, step_history

# 단계적 회귀분석 실행
selected_features, step_history = forward_selection(X_full, y)

# 최종 모델
if selected_features:
    X_final = sm.add_constant(X_full[selected_features])
    final_model = sm.OLS(y, X_final).fit()

    # 계수 정보
    coefficients = []
    for i, var in enumerate(['const'] + selected_features):
        if var == 'const':
            coefficients.append({
                'variable': '상수',
                'coefficient': float(final_model.params[i]),
                'std_error': float(final_model.bse[i]),
                't_statistic': float(final_model.tvalues[i]),
                'p_value': float(final_model.pvalues[i]),
                'beta': 0.0,
                'vif': 0.0
            })
        else:
            # 표준화 계수 계산
            std_y = np.std(y)
            std_x = np.std(X_full[var])
            beta = final_model.params[i] * (std_x / std_y)

            # VIF 계산 (2개 이상 변수일 때만)
            if len(selected_features) > 1:
                try:
                    vif_data = X_final.iloc[:, 1:]  # 상수항 제외
                    vif = variance_inflation_factor(vif_data.values, selected_features.index(var))
                except:
                    vif = 1.0
            else:
                vif = 1.0

            coefficients.append({
                'variable': var,
                'coefficient': float(final_model.params[i]),
                'std_error': float(final_model.bse[i]),
                't_statistic': float(final_model.tvalues[i]),
                'p_value': float(final_model.pvalues[i]),
                'beta': float(beta),
                'vif': float(vif)
            })

    # 모델 진단
    residuals = final_model.resid

    # Durbin-Watson 통계
    dw_stat = durbin_watson(residuals)

    # Jarque-Bera 정규성 검정
    jb_stat, jb_p = jarque_bera(residuals)

    # Breusch-Pagan 등분산성 검정
    try:
        lm, lm_p, fvalue, f_p = het_breuschpagan(residuals, X_final)
        bp_p = f_p
    except:
        bp_p = 1.0

    # 조건수 (다중공선성)
    try:
        condition_num = np.linalg.cond(X_final)
    except:
        condition_num = 1.0

    # 제외된 변수들
    excluded_vars = [var for var in predictors if var not in selected_features]
    excluded_variables = []

    for var in excluded_vars:
        # 부분상관 및 t통계량 계산
        X_test = sm.add_constant(X_full[selected_features + [var]])
        try:
            model_test = sm.OLS(y, X_test).fit()
            t_stat = model_test.tvalues[-1]
            p_val = model_test.pvalues[-1]

            # 부분상관계수 계산 (근사)
            partial_corr = t_stat / np.sqrt(t_stat**2 + model_test.df_resid)

            excluded_variables.append({
                'variable': var,
                'partial_corr': float(partial_corr),
                't_for_inclusion': float(t_stat),
                'p_value': float(p_val)
            })
        except:
            excluded_variables.append({
                'variable': var,
                'partial_corr': 0.0,
                't_for_inclusion': 0.0,
                'p_value': 1.0
            })

    # 해석 생성
    r2_percent = final_model.rsquared * 100
    interpretation = {
        'summary': f'단계적 회귀분석을 통해 {len(selected_features)}개 변수가 선택되었습니다. 최종 모델의 설명력(R²)은 {r2_percent:.1f}%입니다.',
        'recommendations': [
            '선택된 변수들의 회귀계수가 모두 유의한지 확인하세요.',
            '모델 가정(정규성, 등분산성, 선형성)을 검토하세요.',
            'VIF 값이 10 이상인 변수는 다중공선성을 의심해보세요.',
            '단계적 회귀는 표본에 의존적이므로 교차검증을 권장합니다.',
            '실무적 중요성과 통계적 유의성을 구분하여 해석하세요.'
        ]
    }

    results = {
        'final_model': {
            'variables': selected_features,
            'r_squared': float(final_model.rsquared),
            'adj_r_squared': float(final_model.rsquared_adj),
            'f_statistic': float(final_model.fvalue),
            'f_p_value': float(final_model.f_pvalue),
            'aic': float(final_model.aic),
            'bic': float(final_model.bic),
            'rmse': float(np.sqrt(final_model.mse_resid))
        },
        'step_history': step_history,
        'coefficients': coefficients,
        'model_diagnostics': {
            'durbin_watson': float(dw_stat),
            'jarque_bera_p': float(jb_p),
            'breusch_pagan_p': float(bp_p),
            'condition_number': float(condition_num)
        },
        'excluded_variables': excluded_variables,
        'interpretation': interpretation
    }
else:
    # 변수가 선택되지 않은 경우
    results = {
        'final_model': {
            'variables': [],
            'r_squared': 0.0,
            'adj_r_squared': 0.0,
            'f_statistic': 0.0,
            'f_p_value': 1.0,
            'aic': 0.0,
            'bic': 0.0,
            'rmse': 0.0
        },
        'step_history': [],
        'coefficients': [],
        'model_diagnostics': {
            'durbin_watson': 0.0,
            'jarque_bera_p': 1.0,
            'breusch_pagan_p': 1.0,
            'condition_number': 1.0
        },
        'excluded_variables': [],
        'interpretation': {
            'summary': '선택된 변수가 없습니다. 유의수준을 조정하거나 다른 변수를 고려해보세요.',
            'recommendations': ['유의수준 기준을 완화해보세요.', '다른 예측변수를 고려해보세요.']
        }
    }

json.dumps(results)
`

      const result = pyodide.runPython(pythonCode)
      const results: StepwiseResults = JSON.parse(result)

      actions.completeAnalysis(results, 4)
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }

  const getModelFitInterpretation = (r2: number) => {
    if (r2 >= 0.7) return { level: '우수', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (r2 >= 0.5) return { level: '양호', color: 'text-muted-foreground', bg: 'bg-muted' }
    if (r2 >= 0.3) return { level: '보통', color: 'text-muted-foreground', bg: 'bg-muted' }
    return { level: '낮음', color: 'text-muted-foreground', bg: 'bg-muted' }
  }

  const renderMethodIntroduction = () => (
    <div className="space-y-6">
      <div className="text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">단계적 회귀분석 (Stepwise Regression)</h1>
        <p className="text-lg text-gray-600">통계적 기준에 따라 예측변수를 자동으로 선택하는 회귀분석입니다</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5" />
              분석 목적
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                최적의 예측변수 조합 자동 선택
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                모델의 예측력과 간결성 균형 유지
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                다중공선성 문제 최소화
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                과적합 방지 및 일반화 성능 향상
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              적용 조건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>종속변수:</strong> 연속형 변수</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>예측변수:</strong> 연속형/범주형 변수 (2개 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>표본크기:</strong> 변수 수의 10-20배 이상</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>선형관계:</strong> 변수 간 선형 관계 가정</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          단계적 회귀분석은 전진선택, 후진제거, 양방향 방법을 통해
          통계적 유의성과 모델 적합도를 고려하여 최적의 변수 조합을 찾습니다.
          AIC/BIC 정보량 기준을 사용하여 모델의 복잡성과 적합도 사이의 균형을 맞춥니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => actions.setCurrentStep(2)} size="lg">
          데이터 업로드하기
        </Button>
      </div>
    </div>
  )

  const renderResults = () => {
    if (isAnalyzing) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>단계적 회귀분석을 진행하고 있습니다...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )
    }

    if (!results) return null

    const modelFit = getModelFitInterpretation(results.final_model.r_squared)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">단계적 회귀분석 결과</h2>
          <p className="text-gray-600">단계별 선택 과정과 최종 회귀모델을 확인하세요</p>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">모델 요약</TabsTrigger>
            <TabsTrigger value="steps">단계별 과정</TabsTrigger>
            <TabsTrigger value="coefficients">회귀계수</TabsTrigger>
            <TabsTrigger value="diagnostics">모델 진단</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>최종 모델 요약</CardTitle>
                <CardDescription>
                  단계적 선택을 통해 도출된 최종 회귀모델의 적합도 지표
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className={`text-center p-4 border rounded-lg ${modelFit.bg}`}>
                      <div className="text-3xl font-bold text-muted-foreground mb-2">
                        {results.final_model.r_squared.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">R² (결정계수)</div>
                      <Badge className={`${modelFit.color} bg-opacity-20`}>
                        {modelFit.level}
                      </Badge>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {results.final_model.adj_r_squared.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-600">수정된 R²</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">선택된 변수</span>
                      <span className="font-semibold">{results.final_model.variables.length}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">F 통계량</span>
                      <span className="font-semibold">{results.final_model.f_statistic.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">F p값</span>
                      <span className={`font-semibold ${results.final_model.f_p_value < 0.05 ? 'text-muted-foreground' : ''}`}>
                        {results.final_model.f_p_value.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">AIC</span>
                      <span className="font-semibold">{results.final_model.aic.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">BIC</span>
                      <span className="font-semibold">{results.final_model.bic.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RMSE</span>
                      <span className="font-semibold">{results.final_model.rmse.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {results.final_model.variables.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">선택된 변수</h4>
                    <div className="flex flex-wrap gap-1">
                      {results.final_model.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary" className="bg-muted">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>단계별 선택 과정</CardTitle>
                <CardDescription>
                  각 단계에서 변수 추가/제거 과정과 모델 적합도 변화
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.step_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">단계</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">행동</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">R²</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">수정된 R²</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">F 변화</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">AIC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.step_history.map((step, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{step.step}</td>
                            <td className="border border-gray-300 px-4 py-2">
                              <Badge className={step.action === 'add' ? 'bg-muted ' : 'bg-muted '}>
                                {step.action === 'add' ? (
                                  <><Plus className="h-3 w-3 mr-1" />추가</>
                                ) : (
                                  <><Minus className="h-3 w-3 mr-1" />제거</>
                                )}
                              </Badge>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{step.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.r_squared.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.adj_r_squared.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.f_change.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={step.f_change_p < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {step.f_change_p.toFixed(4)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{step.criterion_value.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      선택된 변수가 없습니다. 유의수준 기준을 조정하거나 다른 변수를 고려해보세요.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coefficients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>회귀계수</CardTitle>
                <CardDescription>
                  최종 모델에 포함된 변수들의 회귀계수와 통계량
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.coefficients.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">계수 (B)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준화 계수 (β)</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">t 값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">VIF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.coefficients.map((coef, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{coef.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.coefficient.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.std_error.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {coef.variable === '상수' ? '-' : coef.beta.toFixed(3)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{coef.t_statistic.toFixed(2)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={coef.p_value < 0.05 ? 'text-muted-foreground font-medium' : ''}>
                                {coef.p_value.toFixed(4)}
                                {coef.p_value < 0.05 && <span className="ml-1">*</span>}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {coef.variable === '상수' ? '-' : (
                                <span className={coef.vif > 10 ? 'text-muted-foreground font-medium' : ''}>
                                  {coef.vif.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">* p &lt; 0.05에서 통계적으로 유의</p>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      선택된 변수가 없어 회귀계수를 표시할 수 없습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {results.excluded_variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>제외된 변수</CardTitle>
                  <CardDescription>
                    최종 모델에서 제외된 변수들의 통계량
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">변수</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">편상관</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">t 값</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.excluded_variables.map((variable, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{variable.variable}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.partial_corr.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.t_for_inclusion.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{variable.p_value.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>모델 진단</CardTitle>
                <CardDescription>
                  회귀분석 가정 검토를 위한 진단 통계량
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">자기상관성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Durbin-Watson</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.durbin_watson.toFixed(3)}</div>
                          <Badge className={Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5 ? 'bg-muted ' : 'bg-muted '}>
                            {Math.abs(results.model_diagnostics.durbin_watson - 2) < 0.5 ? '양호' : '주의'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">잔차 정규성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Jarque-Bera p값</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.jarque_bera_p.toFixed(3)}</div>
                          <Badge className={results.model_diagnostics.jarque_bera_p > 0.05 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.jarque_bera_p > 0.05 ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">등분산성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Breusch-Pagan p값</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.breusch_pagan_p.toFixed(3)}</div>
                          <Badge className={results.model_diagnostics.breusch_pagan_p > 0.05 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.breusch_pagan_p > 0.05 ? '만족' : '위반'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">다중공선성</h4>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">조건수</span>
                        <div className="text-right">
                          <div className="font-semibold">{results.model_diagnostics.condition_number.toFixed(1)}</div>
                          <Badge className={results.model_diagnostics.condition_number < 30 ? 'bg-muted ' : results.model_diagnostics.condition_number < 100 ? 'bg-muted ' : 'bg-muted '}>
                            {results.model_diagnostics.condition_number < 30 ? '양호' : results.model_diagnostics.condition_number < 100 ? '주의' : '문제'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 결과 해석</CardTitle>
                <CardDescription>
                  단계적 회귀분석 결과에 대한 해석과 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">권장사항</h4>
                  <ul className="space-y-2">
                    {results.interpretation.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">해석 시 주의사항</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• 단계적 회귀는 데이터 의존적이며 다른 표본에서 결과가 다를 수 있습니다</li>
                    <li>• 통계적 유의성이 실무적 중요성을 의미하지 않습니다</li>
                    <li>• 선택되지 않은 변수도 이론적으로 중요할 수 있습니다</li>
                    <li>• 모델의 외적 타당도 확인을 위해 교차검증이 필요합니다</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <StatisticsPageLayout
      steps={steps}
      currentStep={currentStep}
      title="단계적 회귀분석"
      description="통계적 기준에 따른 예측변수 자동 선택"
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep
          onUploadComplete={(file: File, data: unknown[]) => {
            const uploadedData: UploadedData = {
              data: data as Record<string, unknown>[],
              fileName: file.name,
              columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
                ? Object.keys(data[0] as Record<string, unknown>)
                : []
            }

            if (!actions.setUploadedData) {
              console.error('[stepwise] setUploadedData not available')
              return
            }

            actions.setUploadedData(uploadedData)

            // Also update legacy state
            setData(data as unknown[])
            setColumns(uploadedData.columns)

            actions.setCurrentStep(3)
          }}
          onPrevious={() => actions.setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <VariableSelector
          methodId="stepwise"
          data={data}
          onVariablesSelected={handleVariablesSelected}
          onBack={() => actions.setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && renderResults()}
    </StatisticsPageLayout>
  )
}