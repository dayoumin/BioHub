'use client'

import { useState } from 'react'
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/data-upload/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
import { loadPyodide } from 'pyodide'
import type { PyodideInterface } from 'pyodide'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, AlertCircle, GitBranch, Target, BarChart3, TrendingUp } from 'lucide-react'

interface SelectedVariables {
  dependent: string[]
  factor: string[]
  covariate?: string[]
}

interface TwoWayAnovaResults {
  anova_table: {
    factor_a: {
      df: number
      ss: number
      ms: number
      f_stat: number
      p_value: number
      eta_squared: number
    }
    factor_b: {
      df: number
      ss: number
      ms: number
      f_stat: number
      p_value: number
      eta_squared: number
    }
    interaction: {
      df: number
      ss: number
      ms: number
      f_stat: number
      p_value: number
      eta_squared: number
    }
    within_groups: {
      df: number
      ss: number
      ms: number
    }
    total: {
      df: number
      ss: number
    }
  }
  descriptives: {
    [key: string]: {
      n: number
      mean: number
      std: number
      se: number
      ci_lower: number
      ci_upper: number
    }
  }
  marginal_means: {
    factor_a: {
      [key: string]: {
        mean: number
        se: number
        n: number
      }
    }
    factor_b: {
      [key: string]: {
        mean: number
        se: number
        n: number
      }
    }
  }
  assumptions: {
    levene_test: {
      statistic: number
      p_value: number
      assumption_met: boolean
    }
    normality_test: {
      shapiro_stat: number
      shapiro_p: number
      assumption_met: boolean
    }
    sphericity_test?: {
      mauchly_stat: number
      mauchly_p: number
      assumption_met: boolean
    }
  }
  interpretation: {
    summary: string
    main_effects: string[]
    interaction_effect: string
    recommendations: string[]
  }
}

export default function TwoWayAnovaPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [selectedVariables, setSelectedVariables] = useState<SelectedVariables>({
    dependent: [],
    factor: []
  })
  const [results, setResults] = useState<TwoWayAnovaResults | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    {
      id: 1,
      number: 1,
      title: '이원분산분석',
      description: '두 개의 독립변수가 종속변수에 미치는 주효과와 상호작용효과를 분석합니다.',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'upcoming'
    },
    {
      id: 2,
      number: 2,
      title: '데이터 업로드',
      description: 'CSV 파일을 업로드하고 데이터를 확인합니다.',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'complete' : 'upcoming'
    },
    {
      id: 3,
      number: 3,
      title: '변수 선택',
      description: '종속변수와 두 개의 독립변수(요인)를 선택합니다.',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'complete' : 'upcoming'
    },
    {
      id: 4,
      number: 4,
      title: '분석 결과',
      description: '주효과, 상호작용효과 및 분산분석표를 확인합니다.',
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'complete' : 'upcoming'
    }
  ]

  const handleDataUpload = (uploadedData: any[], uploadedColumns: string[]) => {
    setData(uploadedData)
    setColumns(uploadedColumns)
    setCurrentStep(3)
  }

  const handleVariablesSelected = (variables: any) => {
    setSelectedVariables(variables)
    setCurrentStep(4)
    runTwoWayAnovaAnalysis(variables)
  }

  const runTwoWayAnovaAnalysis = async (variables: SelectedVariables) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const pyodide: PyodideInterface = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
      })

      await pyodide.loadPackage(['numpy', 'pandas', 'scipy', 'statsmodels'])

      pyodide.globals.set('data', data)
      pyodide.globals.set('dependent_var', variables.dependent[0])
      pyodide.globals.set('factor_a', variables.factor[0])
      pyodide.globals.set('factor_b', variables.factor[1] || variables.factor[0])

      const pythonCode = `
import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats.anova import anova_lm
from statsmodels.formula.api import ols
from statsmodels.stats.diagnostic import het_white
from itertools import combinations
import json
import warnings
warnings.filterwarnings('ignore')

df = pd.DataFrame(data)

# 변수 정의
dependent = dependent_var
factor_a_var = factor_a
factor_b_var = factor_b

# 결측값 제거
df_clean = df[[dependent, factor_a_var, factor_b_var]].dropna()

# 요인을 범주형으로 변환
df_clean[factor_a_var] = df_clean[factor_a_var].astype('category')
df_clean[factor_b_var] = df_clean[factor_b_var].astype('category')

# 이원분산분석 수행
formula = f'{dependent} ~ C({factor_a_var}) + C({factor_b_var}) + C({factor_a_var}):C({factor_b_var})'
model = ols(formula, data=df_clean).fit()
anova_results = anova_lm(model, typ=2)

# ANOVA 표 구성
def extract_anova_stats(row):
    return {
        'df': int(row['df']),
        'ss': float(row['sum_sq']),
        'ms': float(row['sum_sq'] / row['df']) if row['df'] > 0 else 0,
        'f_stat': float(row['F']) if not np.isnan(row['F']) else 0,
        'p_value': float(row['PR(>F)']) if not np.isnan(row['PR(>F)']) else 1,
        'eta_squared': float(row['sum_sq'] / anova_results['sum_sq'].sum())
    }

# ANOVA 테이블 추출
factor_a_key = f'C({factor_a_var})'
factor_b_key = f'C({factor_b_var})'
interaction_key = f'C({factor_a_var}):C({factor_b_var})'

anova_table = {
    'factor_a': extract_anova_stats(anova_results.loc[factor_a_key]),
    'factor_b': extract_anova_stats(anova_results.loc[factor_b_key]),
    'interaction': extract_anova_stats(anova_results.loc[interaction_key]),
    'within_groups': {
        'df': int(anova_results.loc['Residual']['df']),
        'ss': float(anova_results.loc['Residual']['sum_sq']),
        'ms': float(anova_results.loc['Residual']['sum_sq'] / anova_results.loc['Residual']['df'])
    },
    'total': {
        'df': int(anova_results['df'].sum()),
        'ss': float(anova_results['sum_sq'].sum())
    }
}

# 기술통계량
descriptives = {}
for (a_level, b_level), group in df_clean.groupby([factor_a_var, factor_b_var]):
    key = f'{a_level}_{b_level}'
    values = group[dependent]
    n = len(values)
    mean = float(values.mean())
    std = float(values.std())
    se = float(std / np.sqrt(n))

    # 95% 신뢰구간
    t_critical = stats.t.ppf(0.975, n-1)
    ci_lower = mean - (t_critical * se)
    ci_upper = mean + (t_critical * se)

    descriptives[key] = {
        'n': n,
        'mean': mean,
        'std': std,
        'se': se,
        'ci_lower': float(ci_lower),
        'ci_upper': float(ci_upper)
    }

# 주변 평균 (Marginal means)
marginal_means = {
    'factor_a': {},
    'factor_b': {}
}

# Factor A 주변 평균
for level, group in df_clean.groupby(factor_a_var):
    values = group[dependent]
    marginal_means['factor_a'][str(level)] = {
        'mean': float(values.mean()),
        'se': float(values.std() / np.sqrt(len(values))),
        'n': len(values)
    }

# Factor B 주변 평균
for level, group in df_clean.groupby(factor_b_var):
    values = group[dependent]
    marginal_means['factor_b'][str(level)] = {
        'mean': float(values.mean()),
        'se': float(values.std() / np.sqrt(len(values))),
        'n': len(values)
    }

# 가정 검정
# 1. 등분산성 (Levene's test)
from scipy.stats import levene
groups = [group[dependent].values for name, group in df_clean.groupby([factor_a_var, factor_b_var])]
levene_stat, levene_p = levene(*groups)

# 2. 정규성 (Shapiro-Wilk test on residuals)
residuals = model.resid
shapiro_stat, shapiro_p = stats.shapiro(residuals)

assumptions = {
    'levene_test': {
        'statistic': float(levene_stat),
        'p_value': float(levene_p),
        'assumption_met': levene_p > 0.05
    },
    'normality_test': {
        'shapiro_stat': float(shapiro_stat),
        'shapiro_p': float(shapiro_p),
        'assumption_met': shapiro_p > 0.05
    }
}

# 해석 생성
def interpret_effect_size(eta_squared):
    if eta_squared >= 0.14:
        return "큰 효과크기"
    elif eta_squared >= 0.06:
        return "중간 효과크기"
    elif eta_squared >= 0.01:
        return "작은 효과크기"
    else:
        return "매우 작은 효과크기"

main_effects = []
if anova_table['factor_a']['p_value'] < 0.05:
    effect_size = interpret_effect_size(anova_table['factor_a']['eta_squared'])
    main_effects.append(f"{factor_a_var}의 주효과가 유의합니다 (η² = {anova_table['factor_a']['eta_squared']:.3f}, {effect_size})")
else:
    main_effects.append(f"{factor_a_var}의 주효과는 유의하지 않습니다")

if anova_table['factor_b']['p_value'] < 0.05:
    effect_size = interpret_effect_size(anova_table['factor_b']['eta_squared'])
    main_effects.append(f"{factor_b_var}의 주효과가 유의합니다 (η² = {anova_table['factor_b']['eta_squared']:.3f}, {effect_size})")
else:
    main_effects.append(f"{factor_b_var}의 주효과는 유의하지 않습니다")

if anova_table['interaction']['p_value'] < 0.05:
    effect_size = interpret_effect_size(anova_table['interaction']['eta_squared'])
    interaction_effect = f"{factor_a_var}와 {factor_b_var}의 상호작용효과가 유의합니다 (η² = {anova_table['interaction']['eta_squared']:.3f}, {effect_size})"
else:
    interaction_effect = f"{factor_a_var}와 {factor_b_var}의 상호작용효과는 유의하지 않습니다"

interpretation = {
    'summary': f'이원분산분석 결과, 두 요인의 주효과와 상호작용효과를 분석했습니다.',
    'main_effects': main_effects,
    'interaction_effect': interaction_effect,
    'recommendations': [
        '유의한 주효과가 있다면 해당 요인의 수준 간 차이를 확인하세요.',
        '상호작용효과가 유의하다면 단순주효과 분석을 실시하세요.',
        '등분산성과 정규성 가정을 확인하고 위반 시 대안을 고려하세요.',
        '효과크기(η²)를 통해 실무적 의미를 판단하세요.',
        '사후검정을 통해 구체적인 집단 간 차이를 확인하세요.'
    ]
}

results = {
    'anova_table': anova_table,
    'descriptives': descriptives,
    'marginal_means': marginal_means,
    'assumptions': assumptions,
    'interpretation': interpretation
}

json.dumps(results)
`

      const result = pyodide.runPython(pythonCode)
      const analysisResults: TwoWayAnovaResults = JSON.parse(result)

      setResults(analysisResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-red-600', bg: 'bg-red-50' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: '미미한 효과', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const renderMethodIntroduction = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GitBranch className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">이원분산분석 (Two-Way ANOVA)</h1>
        <p className="text-lg text-gray-600">두 개의 독립변수가 종속변수에 미치는 주효과와 상호작용효과를 분석합니다</p>
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
                두 독립변수의 주효과 검정
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                두 독립변수 간 상호작용효과 검정
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                각 변수의 효과크기 추정
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                복합적인 실험설계 분석
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
                <span><strong>종속변수:</strong> 연속형 변수 (정규분포)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>독립변수:</strong> 범주형 변수 2개 (각각 2수준 이상)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>등분산성:</strong> 각 집단의 분산이 동일</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>독립성:</strong> 관측값들이 서로 독립</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          이원분산분석은 두 요인의 개별적인 영향(주효과)과 두 요인이 함께 작용할 때의 영향(상호작용효과)을 동시에 분석할 수 있어,
          복잡한 실험설계에서 매우 유용합니다. 상호작용이 유의하다면 주효과 해석 시 주의가 필요합니다.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => setCurrentStep(2)} size="lg">
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
            <p>이원분산분석을 진행하고 있습니다...</p>
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

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">이원분산분석 결과</h2>
          <p className="text-gray-600">주효과와 상호작용효과를 확인하세요</p>
        </div>

        <Tabs defaultValue="anova" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="anova">분산분석표</TabsTrigger>
            <TabsTrigger value="descriptives">기술통계</TabsTrigger>
            <TabsTrigger value="marginal">주변평균</TabsTrigger>
            <TabsTrigger value="assumptions">가정검정</TabsTrigger>
            <TabsTrigger value="interpretation">해석</TabsTrigger>
          </TabsList>

          <TabsContent value="anova" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분산분석표 (ANOVA Table)</CardTitle>
                <CardDescription>
                  주효과와 상호작용효과의 통계적 유의성 검정
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">변동원</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">자유도</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">제곱합</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">평균제곱</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">F</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">p값</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">η²</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">효과크기</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">요인 A</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_a.df}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_a.ss.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_a.ms.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_a.f_stat.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          <span className={results.anova_table.factor_a.p_value < 0.05 ? 'text-red-600 font-medium' : ''}>
                            {results.anova_table.factor_a.p_value.toFixed(4)}
                            {results.anova_table.factor_a.p_value < 0.05 && <span className="ml-1">*</span>}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_a.eta_squared.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <Badge className={`${getEffectSizeInterpretation(results.anova_table.factor_a.eta_squared).bg} ${getEffectSizeInterpretation(results.anova_table.factor_a.eta_squared).color} border-0`}>
                            {getEffectSizeInterpretation(results.anova_table.factor_a.eta_squared).level}
                          </Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">요인 B</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_b.df}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_b.ss.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_b.ms.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_b.f_stat.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          <span className={results.anova_table.factor_b.p_value < 0.05 ? 'text-red-600 font-medium' : ''}>
                            {results.anova_table.factor_b.p_value.toFixed(4)}
                            {results.anova_table.factor_b.p_value < 0.05 && <span className="ml-1">*</span>}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.factor_b.eta_squared.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <Badge className={`${getEffectSizeInterpretation(results.anova_table.factor_b.eta_squared).bg} ${getEffectSizeInterpretation(results.anova_table.factor_b.eta_squared).color} border-0`}>
                            {getEffectSizeInterpretation(results.anova_table.factor_b.eta_squared).level}
                          </Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 bg-yellow-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">A × B 상호작용</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.interaction.df}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.interaction.ss.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.interaction.ms.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.interaction.f_stat.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          <span className={results.anova_table.interaction.p_value < 0.05 ? 'text-red-600 font-medium' : ''}>
                            {results.anova_table.interaction.p_value.toFixed(4)}
                            {results.anova_table.interaction.p_value < 0.05 && <span className="ml-1">*</span>}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.interaction.eta_squared.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">
                          <Badge className={`${getEffectSizeInterpretation(results.anova_table.interaction.eta_squared).bg} ${getEffectSizeInterpretation(results.anova_table.interaction.eta_squared).color} border-0`}>
                            {getEffectSizeInterpretation(results.anova_table.interaction.eta_squared).level}
                          </Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">집단 내 (오차)</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.within_groups.df}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.within_groups.ss.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.within_groups.ms.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                      </tr>
                      <tr className="hover:bg-gray-50 font-medium">
                        <td className="border border-gray-300 px-4 py-2">전체</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.total.df}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{results.anova_table.total.ss.toFixed(3)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                        <td className="border border-gray-300 px-4 py-2 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">* p &lt; 0.05에서 통계적으로 유의</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="descriptives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>집단별 기술통계량</CardTitle>
                <CardDescription>
                  각 조건별 평균, 표준편차, 표본크기 및 95% 신뢰구간
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">조건</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">N</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">평균</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">표준편차</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">95% CI 하한</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">95% CI 상한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(results.descriptives).map(([condition, stats], index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{condition.replace('_', ' × ')}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.n}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.mean.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.std.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.se.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.ci_lower.toFixed(3)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{stats.ci_upper.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marginal" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>요인 A 주변평균</CardTitle>
                  <CardDescription>
                    요인 B를 통제한 요인 A의 평균값
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">수준</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">N</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">평균</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.marginal_means.factor_a).map(([level, stats], index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{level}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.n}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.mean.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.se.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>요인 B 주변평균</CardTitle>
                  <CardDescription>
                    요인 A를 통제한 요인 B의 평균값
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">수준</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">N</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">평균</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">표준오차</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.marginal_means.factor_b).map(([level, stats], index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">{level}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.n}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.mean.toFixed(3)}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{stats.se.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assumptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>가정 검정</CardTitle>
                <CardDescription>
                  이원분산분석의 전제조건 확인
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">등분산성 검정 (Levene Test)</h4>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Levene 통계량</span>
                        <span className="font-semibold">{results.assumptions.levene_test.statistic.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">p값</span>
                        <span className="font-semibold">{results.assumptions.levene_test.p_value.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">가정 만족</span>
                        <Badge className={results.assumptions.levene_test.assumption_met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {results.assumptions.levene_test.assumption_met ? '만족' : '위반'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">정규성 검정 (Shapiro-Wilk)</h4>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Shapiro 통계량</span>
                        <span className="font-semibold">{results.assumptions.normality_test.shapiro_stat.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">p값</span>
                        <span className="font-semibold">{results.assumptions.normality_test.shapiro_p.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm">가정 만족</span>
                        <Badge className={results.assumptions.normality_test.assumption_met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {results.assumptions.normality_test.assumption_met ? '만족' : '위반'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {(!results.assumptions.levene_test.assumption_met || !results.assumptions.normality_test.assumption_met) && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      가정 위반이 감지되었습니다. 비모수 검정(Kruskal-Wallis test) 또는 변환된 데이터 사용을 고려하세요.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interpretation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>분석 결과 해석</CardTitle>
                <CardDescription>
                  이원분산분석 결과에 대한 해석과 권장사항
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">요약</h4>
                  <p className="text-gray-700">{results.interpretation.summary}</p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">주효과</h4>
                  <ul className="space-y-2">
                    {results.interpretation.main_effects.map((effect, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{effect}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">상호작용효과</h4>
                  <div className="flex items-start">
                    <BarChart3 className="mr-2 h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{results.interpretation.interaction_effect}</span>
                  </div>
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
                  <h4 className="font-semibold mb-2">효과크기 해석 기준</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">η² ≥ 0.14: 큰 효과</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm">0.06 ≤ η² &lt; 0.14: 중간 효과</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm">0.01 ≤ η² &lt; 0.06: 작은 효과</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                        <span className="text-sm">η² &lt; 0.01: 미미한 효과</span>
                      </div>
                    </div>
                  </div>
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
      title="이원분산분석"
      description="두 독립변수의 주효과와 상호작용효과 분석"
    >
      {currentStep === 1 && renderMethodIntroduction()}
      {currentStep === 2 && (
        <DataUploadStep onDataUploaded={handleDataUpload} onBack={() => setCurrentStep(1)} />
      )}
      {currentStep === 3 && (
        <VariableSelector
          methodId="two-way-anova"
          data={data}
          onVariablesSelected={handleVariablesSelected}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && renderResults()}
    </StatisticsPageLayout>
  )
}