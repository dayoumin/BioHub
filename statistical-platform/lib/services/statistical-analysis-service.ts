/**
 * 통계 분석 서비스
 * Pyodide를 사용하여 실제 통계 분석을 수행
 */

import { loadPyodideRuntime, getPyodideInstance, isPyodideReady } from '@/lib/pyodide-runtime-loader'
import { StatisticalMethod, AnalysisResult } from '@/types/smart-flow'

export class StatisticalAnalysisService {
  private static instance: StatisticalAnalysisService | null = null

  private constructor() {}

  static getInstance(): StatisticalAnalysisService {
    if (!this.instance) {
      this.instance = new StatisticalAnalysisService()
    }
    return this.instance
  }

  /**
   * Pyodide 초기화
   */
  async initialize(): Promise<void> {
    if (!isPyodideReady()) {
      await loadPyodideRuntime()
    }
  }

  /**
   * t-검정 수행
   */
  async performTTest(
    data1: number[],
    data2: number[],
    type: 'independent' | 'paired' = 'independent'
  ): Promise<AnalysisResult> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

data1 = np.array(${JSON.stringify(data1)})
data2 = np.array(${JSON.stringify(data2)})

# t-검정 수행
if "${type}" == "independent":
    result = stats.ttest_ind(data1, data2)
    testName = "독립표본 t-검정"
else:
    result = stats.ttest_rel(data1, data2)
    testName = "대응표본 t-검정"

# 효과크기 계산 (Cohen's d)
pooled_std = np.sqrt((np.std(data1)**2 + np.std(data2)**2) / 2)
cohensD = (np.mean(data1) - np.mean(data2)) / pooled_std

# 95% 신뢰구간
mean_diff = np.mean(data1) - np.mean(data2)
se = pooled_std * np.sqrt(1/len(data1) + 1/len(data2))
ci_lower = mean_diff - 1.96 * se
ci_upper = mean_diff + 1.96 * se

# 결과 해석
if result.pvalue < 0.05:
    interpretation = f"두 그룹 간 평균 차이가 통계적으로 유의합니다 (p = {result.pvalue:.4f} < 0.05)"
else:
    interpretation = f"두 그룹 간 평균 차이가 통계적으로 유의하지 않습니다 (p = {result.pvalue:.4f} > 0.05)"

# 효과크기 해석
if abs(cohensD) < 0.2:
    effect_interpretation = "효과크기가 작습니다"
elif abs(cohensD) < 0.5:
    effect_interpretation = "효과크기가 중간입니다"
elif abs(cohensD) < 0.8:
    effect_interpretation = "효과크기가 큽니다"
else:
    effect_interpretation = "효과크기가 매우 큽니다"

interpretation += f". {effect_interpretation} (d = {abs(cohensD):.2f})."

output = {
    "method": testName,
    "statistic": float(result.statistic),
    "pValue": float(result.pvalue),
    "effectSize": float(cohensD),
    "confidence": {
        "lower": float(ci_lower),
        "upper": float(ci_upper)
    },
    "interpretation": interpretation
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 상관분석 수행
   */
  async performCorrelation(
    x: number[],
    y: number[]
  ): Promise<AnalysisResult> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

x = np.array(${JSON.stringify(x)})
y = np.array(${JSON.stringify(y)})

# Pearson 상관계수
r, pValue = stats.pearsonr(x, y)

# R-squared
rSquared = r ** 2

# 95% 신뢰구간 (Fisher z-transformation)
z = np.arctanh(r)
se = 1 / np.sqrt(len(x) - 3)
z_lower = z - 1.96 * se
z_upper = z + 1.96 * se
ci_lower = np.tanh(z_lower)
ci_upper = np.tanh(z_upper)

# 상관관계 강도 해석
if abs(r) < 0.3:
    strength = "약한"
elif abs(r) < 0.7:
    strength = "중간"
else:
    strength = "강한"

direction = "양의" if r > 0 else "음의"

# 결과 해석
if pValue < 0.05:
    interpretation = f"{strength} {direction} 상관관계가 있습니다 (r = {r:.3f}, p = {pValue:.4f})"
else:
    interpretation = f"통계적으로 유의한 상관관계가 없습니다 (r = {r:.3f}, p = {pValue:.4f})"

interpretation += f". 결정계수는 {rSquared:.3f}로, 변수 x가 y 변동의 {rSquared*100:.1f}%를 설명합니다."

output = {
    "method": "Pearson 상관분석",
    "statistic": float(r),
    "pValue": float(pValue),
    "effectSize": float(rSquared),
    "confidence": {
        "lower": float(ci_lower),
        "upper": float(ci_upper)
    },
    "interpretation": interpretation
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 회귀분석 수행
   */
  async performRegression(
    x: number[],
    y: number[]
  ): Promise<AnalysisResult> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

x = np.array(${JSON.stringify(x)})
y = np.array(${JSON.stringify(y)})

# 선형회귀
slope, intercept, r_value, pValue, std_err = stats.linregress(x, y)

# R-squared
rSquared = r_value ** 2

# 예측값
y_pred = slope * x + intercept

# 잔차
residuals = y - y_pred

# MSE, RMSE
mse = np.mean(residuals ** 2)
rmse = np.sqrt(mse)

# 회귀계수의 95% 신뢰구간
t_critical = stats.t.ppf(0.975, len(x) - 2)
slope_ci_lower = slope - t_critical * std_err
slope_ci_upper = slope + t_critical * std_err

# 결과 해석
if pValue < 0.05:
    interpretation = f"회귀모델이 통계적으로 유의합니다 (p = {pValue:.4f}). "
    interpretation += f"X가 1 증가할 때 Y는 {slope:.3f} 변화합니다. "
else:
    interpretation = f"회귀모델이 통계적으로 유의하지 않습니다 (p = {pValue:.4f}). "

interpretation += f"모델은 전체 변동의 {rSquared*100:.1f}%를 설명합니다 (R² = {rSquared:.3f})."

output = {
    "method": "단순선형회귀분석",
    "statistic": float(slope),
    "pValue": float(pValue),
    "effectSize": float(rSquared),
    "confidence": {
        "lower": float(slope_ci_lower),
        "upper": float(slope_ci_upper)
    },
    "interpretation": interpretation,
    "additional": {
        "intercept": float(intercept),
        "rmse": float(rmse)
    }
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 정규성 검정 (Shapiro-Wilk test)
   */
  async checkNormality(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
    interpretation: string
  }> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

data = np.array(${JSON.stringify(data)})

# Shapiro-Wilk 검정
statistic, pValue = stats.shapiro(data)

# 정규성 판단 (유의수준 0.05)
is_normal = pValue > 0.05

# 해석
if is_normal:
    interpretation = f"데이터가 정규분포를 따릅니다 (W = {statistic:.4f}, p = {pValue:.4f} > 0.05)"
else:
    interpretation = f"데이터가 정규분포를 따르지 않습니다 (W = {statistic:.4f}, p = {pValue:.4f} < 0.05)"

output = {
    "statistic": float(statistic),
    "pValue": float(pValue),
    "isNormal": is_normal,
    "interpretation": interpretation
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 등분산성 검정 (Levene's test)
   */
  async checkHomogeneity(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pValue: number
    isHomogeneous: boolean
    interpretation: string
  }> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

group1 = np.array(${JSON.stringify(group1)})
group2 = np.array(${JSON.stringify(group2)})

# Levene's test (center='median'이 더 robust)
statistic, pValue = stats.levene(group1, group2, center='median')

# 등분산성 판단 (유의수준 0.05)
is_homogeneous = pValue > 0.05

# 해석
if is_homogeneous:
    interpretation = f"두 그룹의 분산이 같습니다 (F = {statistic:.4f}, p = {pValue:.4f} > 0.05)"
else:
    interpretation = f"두 그룹의 분산이 다릅니다 (F = {statistic:.4f}, p = {pValue:.4f} < 0.05)"

output = {
    "statistic": float(statistic),
    "pValue": float(pValue),
    "isHomogeneous": is_homogeneous,
    "interpretation": interpretation
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 모든 가정 검정 수행 (자동)
   */
  async performAllAssumptionTests(
    data1: number[],
    data2: number[],
    testType: 'ttest' | 'anova' | 'regression' | 'correlation' = 'ttest',
    options: { alpha?: number; normalityRule?: 'any' | 'majority' | 'strict' } = {}
  ): Promise<{
    normality?: { group1: any, group2: any }
    homogeneity?: any
    independence?: any
    linearity?: any
    outliers?: any
    sampleSize?: any
    multicollinearity?: any
  }> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const alpha = options.alpha ?? 0.05
    const normality_rule = options.normalityRule ?? 'any'

    const pythonCode = `
import numpy as np
from scipy import stats
import json
import warnings
warnings.filterwarnings('ignore')

data1 = np.array(${JSON.stringify(data1)})
data2 = np.array(${JSON.stringify(data2)})
test_type = "${testType}"
alpha = ${alpha}
normality_rule = "${normality_rule}"

results = {}

# 1. 정규성 검정 (Shapiro-Wilk + Kolmogorov-Smirnov + D’Agostino)
def check_normality(data, group_name):
    n = len(data)
    
    # Shapiro-Wilk (n < 5000)
    if n < 5000:
        sw_stat, sw_p = stats.shapiro(data)
        method = "Shapiro-Wilk"
    else:
        # Kolmogorov-Smirnov for large samples
        ks_stat, ks_p = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
        sw_stat, sw_p = ks_stat, ks_p
        method = "Kolmogorov-Smirnov"
    
    # Anderson-Darling test 추가
    ad_result = stats.anderson(data, dist='norm')
    
    # D'Agostino-Pearson test 추가
    if n > 8:
        k2_stat, k2_p = stats.normaltest(data)
    else:
        k2_stat, k2_p = None, None
    
    # 정상성 판단 규칙
    pvals = [p for p in [sw_p, (ks_p if 'ks_p' in locals() else None), k2_p] if p is not None]
    passes = sum(1 for p in pvals if p > alpha)
    total = len(pvals)
    if total == 0:
        is_normal = False
    elif normality_rule == 'strict':
        is_normal = (passes == total)
    elif normality_rule == 'majority':
        is_normal = (passes >= max(1, int(round(total/2.0))))
    else:  # 'any'
        is_normal = (passes >= 1)
    
    return {
        "method": method,
        "statistic": float(sw_stat),
        "pValue": float(sw_p),
        "isNormal": is_normal,
        "andersonStat": float(ad_result.statistic),
        "dagostinoPValue": float(k2_p) if k2_p else None,
        "ksPValue": float(ks_p) if 'ks_p' in locals() else None,
        "skewness": float(stats.skew(data)),
        "kurtosis": float(stats.kurtosis(data)),
        "interpretation": f"정규분포 {'만족' if is_normal else '위반'} (rule={normality_rule}, alpha={alpha})",
        "notes": "KS는 모수 추정으로 Lilliefors 상황: 참고용"
    }

results["normality"] = {
    "group1": check_normality(data1, "Group 1"),
    "group2": check_normality(data2, "Group 2")
}

# 2. 등분산성 검정 (Levene 중심, Bartlett 보조, F-test 참고)
if test_type in ["ttest", "anova"]:
    # Levene's test (robust)
    lev_stat, lev_p = stats.levene(data1, data2, center='median')
    
    # Bartlett's test (정규성 가정)
    bart_stat, bart_p = stats.bartlett(data1, data2)
    
    # F-test
    var1, var2 = np.var(data1, ddof=1), np.var(data2, ddof=1)
    f_stat = var1 / var2 if var1 > var2 else var2 / var1
    df1, df2 = len(data1) - 1, len(data2) - 1
    f_p = 2 * min(stats.f.cdf(f_stat, df1, df2), 1 - stats.f.cdf(f_stat, df1, df2))
    
    is_homogeneous = lev_p > 0.05
    
    results["homogeneity"] = {
        "levene": {"statistic": float(lev_stat), "pValue": float(lev_p)},
        "bartlett": {"statistic": float(bart_stat), "pValue": float(bart_p)},
        "fTest": {"statistic": float(f_stat), "pValue": float(f_p), "caution": "정규성 민감, 참고용"},
        "isHomogeneous": is_homogeneous,
        "varianceRatio": float(var1/var2),
        "interpretation": f"등분산성 {'만족' if is_homogeneous else '위반'} (Levene 기준). Bartlett는 정규성 만족 시 보조지표로 참고"
    }

# 3. 독립성 검정 (Durbin-Watson for residuals)
if test_type in ["regression"]:
    # 간단한 선형회귀로 잔차 계산
    slope, intercept, _, _, _ = stats.linregress(data1, data2)
    predicted = slope * data1 + intercept
    residuals = data2 - predicted
    
    # Durbin-Watson statistic
    diff_resid = np.diff(residuals)
    dw_stat = np.sum(diff_resid**2) / np.sum(residuals**2)
    
    # 일반적으로 1.5 < DW < 2.5면 독립성 만족
    is_independent = 1.5 < dw_stat < 2.5
    
    results["independence"] = {
        "durbinWatson": float(dw_stat),
        "isIndependent": is_independent,
        "interpretation": f"잔차 독립성 {'만족' if is_independent else '위반'} (DW={dw_stat:.3f})"
    }

# 4. 선형성 검정 (회귀/상관분석)
if test_type in ["regression", "correlation"]:
    # 상관계수와 결정계수
    r, p = stats.pearsonr(data1, data2)
    rSquared = r**2
    
    # 스피어만 순위상관 (비선형 관계 감지)
    rho, rho_p = stats.spearmanr(data1, data2)
    
    # 선형성 판단: Pearson과 Spearman 상관계수 차이
    linearity_diff = abs(r - rho)
    is_linear = linearity_diff < 0.1 and rSquared > 0.1
    
    results["linearity"] = {
        "pearsonR": float(r),
        "spearmanRho": float(rho),
        "rSquared": float(rSquared),
        "difference": float(linearity_diff),
        "isLinear": is_linear,
        "interpretation": f"선형 관계 {'있음' if is_linear else '약함'} (R²={rSquared:.3f})"
    }

# 5. 이상치 검정 (IQR method + Z-score + Grubbs[정규성 만족 시])
def detect_outliers(data, use_grubbs=False):
    q1, q3 = np.percentile(data, [25, 75])
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    # IQR method
    outliers_iqr = np.where((data < lower_bound) | (data > upper_bound))[0]
    
    # Z-score method (|z| > 3)
    z_scores = np.abs(stats.zscore(data))
    outliers_zscore = np.where(z_scores > 3)[0]
    
    # Grubbs test for single outlier
    if use_grubbs and len(data) > 2:
        z_max = max(np.abs(data - np.mean(data))) / np.std(data)
        n = len(data)
        t_dist = stats.t.ppf(1 - 0.05/(2*n), n-2)
        g_critical = ((n-1)/np.sqrt(n)) * np.sqrt(t_dist**2 / (n-2 + t_dist**2))
        has_grubbs_outlier = z_max > g_critical
    else:
        has_grubbs_outlier = False
    
    return {
        "iqrMethod": len(outliers_iqr),
        "zScoreMethod": len(outliers_zscore),
        "grubbsTest": has_grubbs_outlier,
        "outlierIndices": outliers_iqr.tolist(),
        "hasOutliers": len(outliers_iqr) > 0
    }

# 정상성 결과 확인 후 Grubbs 사용 여부 결정
g1_norm = False
g2_norm = False
try:
    g1_norm = bool(results.get("normality",{}).get("group1",{}).get("isNormal", False))
    g2_norm = bool(results.get("normality",{}).get("group2",{}).get("isNormal", False))
except Exception:
    pass

results["outliers"] = {
    "group1": detect_outliers(data1, use_grubbs=(g1_norm and g2_norm)),
    "group2": detect_outliers(data2, use_grubbs=(g1_norm and g2_norm)),
    "interpretation": "이상치 탐지 완료 (Grubbs는 정규성 만족 시에만 수행)"
}

# 6. 표본 크기 적절성 
n1, n2 = len(data1), len(data2)
min_sample = 30  # 중심극한정리

# Cohen's d 계산 (효과크기)
pooled_std = np.sqrt(((n1-1)*np.var(data1, ddof=1) + (n2-1)*np.var(data2, ddof=1)) / (n1+n2-2))
cohensD = abs(np.mean(data1) - np.mean(data2)) / pooled_std if pooled_std > 0 else 0

# 검정력 계산 (근사)
from math import sqrt
if cohensD > 0 and n1 > 1 and n2 > 1:
    # 간단한 사후 검정력 계산
    delta = cohensD * sqrt(n1*n2/(n1+n2))
    # 근사 검정력 (정규분포 기반)
    power = 1 - stats.norm.cdf(1.96 - delta) if delta > 0 else 0.05
else:
    power = None

results["sampleSize"] = {
    "group1Size": n1,
    "group2Size": n2,
    "isAdequate": n1 >= min_sample and n2 >= min_sample,
    "cohensD": float(cohensD) if cohensD else 0,
    "estimatedPower": float(power) if power else None,
    "interpretation": f"표본 크기 {'적절' if n1 >= min_sample and n2 >= min_sample else '부족'} (n1={n1}, n2={n2})"
}

json.dumps(results)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * ANOVA 분석
   */
  async performANOVA(groups: number[][]): Promise<AnalysisResult> {
    await this.initialize()
    const pyodide = getPyodideInstance() as any

    const pythonCode = `
import numpy as np
from scipy import stats
import json

groups = ${JSON.stringify(groups)}
groups = [np.array(g) for g in groups]

# One-way ANOVA
fStatistic, pValue = stats.f_oneway(*groups)

# 효과크기 (eta-squared) 계산
all_data = np.concatenate(groups)
grand_mean = np.mean(all_data)

# SSB (between groups)
ssb = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups)

# SST (total)
sst = np.sum((all_data - grand_mean) ** 2)

# eta-squared
etaSquared = ssb / sst

# 결과 해석
if pValue < 0.05:
    interpretation = f"그룹 간 평균 차이가 통계적으로 유의합니다 (F = {fStatistic:.3f}, p = {pValue:.4f}). "
    interpretation += "사후검정을 통해 어느 그룹 간 차이가 있는지 확인이 필요합니다."
else:
    interpretation = f"그룹 간 평균 차이가 통계적으로 유의하지 않습니다 (F = {fStatistic:.3f}, p = {pValue:.4f})."

# 효과크기 해석
if etaSquared < 0.01:
    effect_interpretation = "효과크기가 작습니다"
elif etaSquared < 0.06:
    effect_interpretation = "효과크기가 중간입니다"
else:
    effect_interpretation = "효과크기가 큽니다"

interpretation += f" {effect_interpretation} (η² = {etaSquared:.3f})."

output = {
    "method": "일원분산분석 (One-way ANOVA)",
    "statistic": float(fStatistic),
    "pValue": float(pValue),
    "effectSize": float(etaSquared),
    "interpretation": interpretation
}

json.dumps(output)
`

    const resultJson = await pyodide.runPythonAsync(pythonCode)
    return JSON.parse(resultJson)
  }

  /**
   * 데이터 타입에 따른 자동 분석 추천
   */
  recommendAnalysis(data: any[]): StatisticalMethod[] {
    if (!data || data.length === 0) return []

    const columns = Object.keys(data[0])
    const columnTypes = this.detectColumnTypes(data)
    
    const recommendations: StatisticalMethod[] = []

    // 숫자형 변수가 2개 이상인 경우
    const numericColumns = columns.filter(col => columnTypes[col] === 'numeric')
    
    if (numericColumns.length >= 2) {
      recommendations.push({
        id: 'correlation',
        name: '상관분석',
        description: '두 변수 간의 관계를 분석합니다',
        category: 'regression'
      })
      
      recommendations.push({
        id: 'regression',
        name: '회귀분석',
        description: '한 변수가 다른 변수에 미치는 영향을 분석합니다',
        category: 'regression'
      })
    }

    // 그룹 변수가 있는 경우
    const categoricalColumns = columns.filter(col => columnTypes[col] === 'categorical')
    
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const uniqueValues = new Set(data.map(row => row[categoricalColumns[0]]))
      
      if (uniqueValues.size === 2) {
        recommendations.push({
          id: 'independent-t-test',
          name: '독립표본 t-검정',
          description: '두 그룹 간 평균 차이를 검정합니다',
          category: 't-test'
        })
      } else if (uniqueValues.size > 2) {
        recommendations.push({
          id: 'anova',
          name: '일원분산분석 (ANOVA)',
          description: '세 개 이상 그룹 간 평균 차이를 검정합니다',
          category: 'anova'
        })
      }
    }

    return recommendations
  }

  /**
   * 컬럼 타입 감지
   */
  private detectColumnTypes(data: any[]): Record<string, 'numeric' | 'categorical'> {
    const columns = Object.keys(data[0])
    const types: Record<string, 'numeric' | 'categorical'> = {}

    columns.forEach(col => {
      const values = data.map(row => row[col])
      const numericValues = values.filter(v => !isNaN(Number(v)))
      
      if (numericValues.length / values.length > 0.8) {
        types[col] = 'numeric'
      } else {
        types[col] = 'categorical'
      }
    })

    return types
  }
}

export const statisticalAnalysisService = StatisticalAnalysisService.getInstance()