# 📊 통계 분석 방법 참조 문서
## Statistical Methods Reference

**버전**: 2.0  
**업데이트**: 2025-09-12  
**목적**: Pyodide + SciPy/statsmodels 기반 통계 분석 완전 가이드

---

## 🎯 통계 처리 아키텍처

### 핵심 원칙
```
모든 통계 계산 = Pyodide (Python WebAssembly) + SciPy/statsmodels
❌ JavaScript/TypeScript로 통계 함수 직접 구현 금지
✅ 검증된 과학 라이브러리 사용 필수
```

### 기술 스택
- **Python 런타임**: Pyodide 0.28.2 (WebAssembly)
- **기본 통계**: SciPy 1.14.1 (scipy.stats)
- **고급 통계**: statsmodels 0.14.6
- **수치 계산**: NumPy 2.2.1
- **데이터 처리**: pandas 2.2.3

---

## 📈 기술통계 (Descriptive Statistics)

### SciPy 기반 구현
```python
import scipy.stats as stats
import numpy as np

def calculate_descriptive_stats(data):
    """기술통계량 계산 - SciPy 사용"""
    data = np.array(data)
    
    return {
        'count': len(data),
        'mean': np.mean(data),
        'median': np.median(data),
        'mode': stats.mode(data, keepdims=True).mode[0] if len(stats.mode(data).mode) > 0 else None,
        'std': np.std(data, ddof=1),  # 표본표준편차
        'var': np.var(data, ddof=1),  # 표본분산
        'min': np.min(data),
        'max': np.max(data),
        'range': np.ptp(data),  # peak to peak
        'q1': np.percentile(data, 25),
        'q3': np.percentile(data, 75),
        'iqr': stats.iqr(data),
        'skewness': stats.skew(data),
        'kurtosis': stats.kurtosis(data),
        'cv': stats.variation(data)  # 변동계수
    }
```

### JavaScript에서 호출
```javascript
const result = await pyodide.runPython(`
    import json
    result = calculate_descriptive_stats([1, 2, 3, 4, 5])
    json.dumps(result)
`)
```

---

## 📊 추론통계 (Inferential Statistics)

### 1. T-검정 (T-Tests)

#### 일표본 t-검정
```python
def one_sample_ttest(data, population_mean=0, alpha=0.05):
    """일표본 t-검정"""
    statistic, pvalue = stats.ttest_1samp(data, population_mean)
    
    n = len(data)
    df = n - 1
    sample_mean = np.mean(data)
    sample_std = np.std(data, ddof=1)
    se = sample_std / np.sqrt(n)
    
    # 신뢰구간 계산
    t_critical = stats.t.ppf(1 - alpha/2, df)
    margin_of_error = t_critical * se
    ci = [sample_mean - margin_of_error, sample_mean + margin_of_error]
    
    # Cohen's d (효과크기)
    cohens_d = (sample_mean - population_mean) / sample_std
    
    return {
        'test_name': 'One-Sample t-test',
        'statistic': float(statistic),
        'p_value': float(pvalue),
        'degrees_of_freedom': df,
        'sample_mean': float(sample_mean),
        'population_mean': population_mean,
        'confidence_interval': [float(ci[0]), float(ci[1])],
        'effect_size_cohens_d': float(cohens_d),
        'is_significant': pvalue < alpha
    }
```

#### 독립표본 t-검정
```python
def independent_ttest(group1, group2, equal_var=True, alpha=0.05):
    """독립표본 t-검정"""
    if equal_var:
        statistic, pvalue = stats.ttest_ind(group1, group2)
        test_name = 'Independent t-test (equal variances)'
    else:
        statistic, pvalue = stats.ttest_ind(group1, group2, equal_var=False)
        test_name = "Welch's t-test (unequal variances)"
    
    n1, n2 = len(group1), len(group2)
    df = n1 + n2 - 2
    
    # 효과크기 (Cohen's d)
    pooled_std = np.sqrt(((n1-1)*np.var(group1, ddof=1) + (n2-1)*np.var(group2, ddof=1)) / df)
    cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std
    
    return {
        'test_name': test_name,
        'statistic': float(statistic),
        'p_value': float(pvalue),
        'degrees_of_freedom': df,
        'group1_mean': float(np.mean(group1)),
        'group2_mean': float(np.mean(group2)),
        'mean_difference': float(np.mean(group1) - np.mean(group2)),
        'effect_size_cohens_d': float(cohens_d),
        'is_significant': pvalue < alpha
    }
```

#### 대응표본 t-검정
```python
def paired_ttest(before, after, alpha=0.05):
    """대응표본 t-검정"""
    statistic, pvalue = stats.ttest_rel(before, after)
    
    differences = np.array(after) - np.array(before)
    n = len(differences)
    df = n - 1
    mean_diff = np.mean(differences)
    
    # 효과크기
    cohens_d = mean_diff / np.std(differences, ddof=1)
    
    return {
        'test_name': 'Paired t-test',
        'statistic': float(statistic),
        'p_value': float(pvalue),
        'degrees_of_freedom': df,
        'mean_difference': float(mean_diff),
        'effect_size_cohens_d': float(cohens_d),
        'is_significant': pvalue < alpha
    }
```

### 2. 분산분석 (ANOVA)

#### 일원분산분석
```python
def one_way_anova(*groups, alpha=0.05):
    """일원분산분석"""
    # F-검정
    f_statistic, p_value = stats.f_oneway(*groups)
    
    # 자유도
    k = len(groups)  # 그룹 수
    n_total = sum(len(group) for group in groups)
    df_between = k - 1
    df_within = n_total - k
    
    # 제곱합 계산
    grand_mean = np.mean(np.concatenate(groups))
    
    ss_between = sum(len(group) * (np.mean(group) - grand_mean)**2 for group in groups)
    ss_within = sum(np.sum((group - np.mean(group))**2) for group in groups)
    ss_total = ss_between + ss_within
    
    # 평균제곱
    ms_between = ss_between / df_between
    ms_within = ss_within / df_within
    
    # 효과크기 (eta-squared)
    eta_squared = ss_between / ss_total
    
    return {
        'test_name': 'One-Way ANOVA',
        'f_statistic': float(f_statistic),
        'p_value': float(p_value),
        'df_between': df_between,
        'df_within': df_within,
        'ss_between': float(ss_between),
        'ss_within': float(ss_within),
        'ss_total': float(ss_total),
        'ms_between': float(ms_between),
        'ms_within': float(ms_within),
        'eta_squared': float(eta_squared),
        'is_significant': p_value < alpha
    }
```

#### 이원분산분석 (statsmodels 사용)
```python
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm

def two_way_anova(data, dependent_var, factor1, factor2, interaction=True):
    """이원분산분석 - statsmodels 사용"""
    import pandas as pd
    
    df = pd.DataFrame(data)
    
    if interaction:
        formula = f"{dependent_var} ~ C({factor1}) + C({factor2}) + C({factor1}):C({factor2})"
    else:
        formula = f"{dependent_var} ~ C({factor1}) + C({factor2})"
    
    model = ols(formula, data=df).fit()
    anova_results = anova_lm(model, typ=2)
    
    return {
        'test_name': 'Two-Way ANOVA',
        'anova_table': anova_results.to_dict(),
        'model_summary': str(model.summary())
    }
```

### 3. 사후검정 (Post-hoc Tests)

#### Tukey HSD
```python
from statsmodels.stats.multicomp import pairwise_tukeyhsd

def tukey_hsd_test(data, groups, alpha=0.05):
    """Tukey HSD 사후검정"""
    tukey_result = pairwise_tukeyhsd(data, groups, alpha=alpha)
    
    return {
        'test_name': 'Tukey HSD',
        'summary': str(tukey_result.summary()),
        'pairwise_comparisons': tukey_result.summary().data[1:]  # 헤더 제외
    }
```

#### Games-Howell (불균등 분산)
```python
def games_howell_test(*groups, alpha=0.05):
    """Games-Howell 사후검정 (불균등분산)"""
    from itertools import combinations
    
    results = []
    group_names = [f'Group_{i+1}' for i in range(len(groups))]
    
    for i, (g1, g2) in enumerate(combinations(range(len(groups)), 2)):
        group1, group2 = groups[g1], groups[g2]
        
        # Welch's t-test
        stat, pval = stats.ttest_ind(group1, group2, equal_var=False)
        
        # 자유도 (Welch-Satterthwaite)
        n1, n2 = len(group1), len(group2)
        s1, s2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
        
        df = (s1/n1 + s2/n2)**2 / ((s1/n1)**2/(n1-1) + (s2/n2)**2/(n2-1))
        
        results.append({
            'comparison': f'{group_names[g1]} vs {group_names[g2]}',
            'mean_diff': float(np.mean(group1) - np.mean(group2)),
            'statistic': float(stat),
            'p_value': float(pval),
            'degrees_of_freedom': float(df)
        })
    
    return {
        'test_name': 'Games-Howell',
        'comparisons': results
    }
```

---

## 📈 상관분석 (Correlation Analysis)

### Pearson 상관계수
```python
def pearson_correlation(x, y, alpha=0.05):
    """Pearson 상관분석"""
    correlation, p_value = stats.pearsonr(x, y)
    
    n = len(x)
    df = n - 2
    
    # 신뢰구간 (Fisher's r-to-z transformation)
    z = np.arctanh(correlation)
    se_z = 1 / np.sqrt(n - 3)
    z_critical = stats.norm.ppf(1 - alpha/2)
    
    z_lower = z - z_critical * se_z
    z_upper = z + z_critical * se_z
    
    ci_lower = np.tanh(z_lower)
    ci_upper = np.tanh(z_upper)
    
    return {
        'correlation_type': 'Pearson',
        'correlation': float(correlation),
        'p_value': float(p_value),
        'confidence_interval': [float(ci_lower), float(ci_upper)],
        'sample_size': n,
        'degrees_of_freedom': df,
        'is_significant': p_value < alpha
    }
```

### Spearman 순위상관
```python
def spearman_correlation(x, y, alpha=0.05):
    """Spearman 순위상관분석"""
    correlation, p_value = stats.spearmanr(x, y)
    
    return {
        'correlation_type': 'Spearman',
        'correlation': float(correlation),
        'p_value': float(p_value),
        'sample_size': len(x),
        'is_significant': p_value < alpha
    }
```

---

## 📊 회귀분석 (Regression Analysis)

### 단순선형회귀
```python
def simple_linear_regression(x, y, alpha=0.05):
    """단순선형회귀 - SciPy 사용"""
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    n = len(x)
    df = n - 2
    
    # 예측값과 잔차
    y_pred = slope * np.array(x) + intercept
    residuals = np.array(y) - y_pred
    
    # R-squared
    r_squared = r_value ** 2
    
    # 표준오차들
    mse = np.sum(residuals**2) / df
    se_slope = std_err
    se_intercept = np.sqrt(mse * (1/n + np.mean(x)**2 / np.sum((x - np.mean(x))**2)))
    
    return {
        'regression_type': 'Simple Linear',
        'slope': float(slope),
        'intercept': float(intercept),
        'r_value': float(r_value),
        'r_squared': float(r_squared),
        'p_value': float(p_value),
        'std_err_slope': float(se_slope),
        'std_err_intercept': float(se_intercept),
        'residuals': residuals.tolist(),
        'fitted_values': y_pred.tolist(),
        'is_significant': p_value < alpha
    }
```

### 다중선형회귀 (statsmodels)
```python
import statsmodels.api as sm

def multiple_linear_regression(X, y):
    """다중선형회귀 - statsmodels 사용"""
    # 상수항 추가
    X_with_const = sm.add_constant(X)
    
    # 모형 적합
    model = sm.OLS(y, X_with_const).fit()
    
    return {
        'regression_type': 'Multiple Linear',
        'coefficients': model.params.to_dict(),
        'r_squared': float(model.rsquared),
        'adjusted_r_squared': float(model.rsquared_adj),
        'f_statistic': float(model.fvalue),
        'f_pvalue': float(model.f_pvalue),
        'p_values': model.pvalues.to_dict(),
        'confidence_intervals': model.conf_int().to_dict(),
        'residuals': model.resid.tolist(),
        'fitted_values': model.fittedvalues.tolist(),
        'summary': str(model.summary())
    }
```

---

## 🔍 비모수 검정 (Non-parametric Tests)

### Mann-Whitney U 검정
```python
def mann_whitney_u_test(group1, group2, alpha=0.05):
    """Mann-Whitney U 검정 (독립표본)"""
    statistic, p_value = stats.mannwhitneyu(group1, group2, alternative='two-sided')
    
    n1, n2 = len(group1), len(group2)
    
    # 효과크기 (r = Z / sqrt(N))
    z_score = (statistic - n1*n2/2) / np.sqrt(n1*n2*(n1+n2+1)/12)
    effect_size_r = abs(z_score) / np.sqrt(n1 + n2)
    
    return {
        'test_name': 'Mann-Whitney U',
        'u_statistic': float(statistic),
        'p_value': float(p_value),
        'z_score': float(z_score),
        'effect_size_r': float(effect_size_r),
        'sample_sizes': [n1, n2],
        'is_significant': p_value < alpha
    }
```

### Wilcoxon 부호순위 검정
```python
def wilcoxon_signed_rank_test(before, after, alpha=0.05):
    """Wilcoxon 부호순위 검정 (대응표본)"""
    statistic, p_value = stats.wilcoxon(before, after)
    
    differences = np.array(after) - np.array(before)
    n = len(differences[differences != 0])  # 0이 아닌 차이의 개수
    
    # 효과크기
    z_score = (statistic - n*(n+1)/4) / np.sqrt(n*(n+1)*(2*n+1)/24)
    effect_size_r = abs(z_score) / np.sqrt(n)
    
    return {
        'test_name': 'Wilcoxon Signed-Rank',
        'w_statistic': float(statistic),
        'p_value': float(p_value),
        'z_score': float(z_score),
        'effect_size_r': float(effect_size_r),
        'sample_size': n,
        'is_significant': p_value < alpha
    }
```

### Kruskal-Wallis 검정
```python
def kruskal_wallis_test(*groups, alpha=0.05):
    """Kruskal-Wallis 검정 (비모수 일원분산분석)"""
    statistic, p_value = stats.kruskal(*groups)
    
    n_total = sum(len(group) for group in groups)
    k = len(groups)
    df = k - 1
    
    # 효과크기 (eta-squared)
    eta_squared = (statistic - k + 1) / (n_total - k)
    
    return {
        'test_name': 'Kruskal-Wallis',
        'h_statistic': float(statistic),
        'p_value': float(p_value),
        'degrees_of_freedom': df,
        'eta_squared': float(eta_squared),
        'group_count': k,
        'total_sample_size': n_total,
        'is_significant': p_value < alpha
    }
```

---

## ✅ 가정 검정 (Assumption Tests)

### 정규성 검정
```python
def normality_tests(data, alpha=0.05):
    """정규성 검정 배터리"""
    n = len(data)
    
    results = {}
    
    # Shapiro-Wilk (n ≤ 5000)
    if n <= 5000:
        sw_stat, sw_p = stats.shapiro(data)
        results['shapiro_wilk'] = {
            'statistic': float(sw_stat),
            'p_value': float(sw_p),
            'is_normal': sw_p > alpha
        }
    
    # Kolmogorov-Smirnov
    ks_stat, ks_p = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
    results['kolmogorov_smirnov'] = {
        'statistic': float(ks_stat),
        'p_value': float(ks_p),
        'is_normal': ks_p > alpha
    }
    
    # D'Agostino-Pearson
    dp_stat, dp_p = stats.normaltest(data)
    results['dagostino_pearson'] = {
        'statistic': float(dp_stat),
        'p_value': float(dp_p),
        'is_normal': dp_p > alpha
    }
    
    return results
```

### 등분산성 검정
```python
def homogeneity_tests(*groups, alpha=0.05):
    """등분산성 검정"""
    results = {}
    
    # Levene's test (robust)
    levene_stat, levene_p = stats.levene(*groups)
    results['levene'] = {
        'statistic': float(levene_stat),
        'p_value': float(levene_p),
        'homogeneous': levene_p > alpha
    }
    
    # Bartlett's test (assumes normality)
    bartlett_stat, bartlett_p = stats.bartlett(*groups)
    results['bartlett'] = {
        'statistic': float(bartlett_stat),
        'p_value': float(bartlett_p),
        'homogeneous': bartlett_p > alpha
    }
    
    return results
```

---

## 🎯 수산과학 특화 분석

### CPUE 분석
```python
def cpue_analysis(catch_data, effort_data):
    """단위노력당어획량(CPUE) 분석"""
    cpue = np.array(catch_data) / np.array(effort_data)
    
    # 기본 통계
    basic_stats = calculate_descriptive_stats(cpue)
    
    # 트렌드 분석 (선형회귀)
    time_points = np.arange(len(cpue))
    slope, intercept, r_value, p_value, std_err = stats.linregress(time_points, cpue)
    
    return {
        'cpue_values': cpue.tolist(),
        'basic_statistics': basic_stats,
        'trend_analysis': {
            'slope': float(slope),
            'intercept': float(intercept),
            'r_squared': float(r_value**2),
            'p_value': float(p_value),
            'trend_direction': 'increasing' if slope > 0 else 'decreasing',
            'is_significant_trend': p_value < 0.05
        }
    }
```

### von Bertalanffy 성장모델
```python
from scipy.optimize import curve_fit

def von_bertalanffy_growth(ages, lengths):
    """von Bertalanffy 성장모델 적합"""
    
    def vb_function(t, Linf, K, t0):
        """von Bertalanffy 함수"""
        return Linf * (1 - np.exp(-K * (t - t0)))
    
    # 초기값 추정
    Linf_initial = max(lengths) * 1.2
    K_initial = 0.1
    t0_initial = 0
    
    # 모델 적합
    popt, pcov = curve_fit(vb_function, ages, lengths, 
                          p0=[Linf_initial, K_initial, t0_initial])
    
    Linf, K, t0 = popt
    
    # 신뢰구간
    param_std = np.sqrt(np.diag(pcov))
    
    # 적합도
    predicted = vb_function(np.array(ages), *popt)
    r_squared = 1 - np.sum((lengths - predicted)**2) / np.sum((lengths - np.mean(lengths))**2)
    
    return {
        'parameters': {
            'Linf': float(Linf),
            'K': float(K),
            't0': float(t0)
        },
        'parameter_std_errors': {
            'Linf_se': float(param_std[0]),
            'K_se': float(param_std[1]),
            't0_se': float(param_std[2])
        },
        'fitted_values': predicted.tolist(),
        'r_squared': float(r_squared),
        'equation': f'Lt = {Linf:.2f} * (1 - exp(-{K:.3f} * (t - {t0:.2f})))'
    }
```

---

## 🔧 검정력 분석 (Power Analysis)

### t-검정 검정력
```python
from statsmodels.stats.power import ttest_power, tt_solve_power

def t_test_power_analysis(effect_size, sample_size=None, power=None, alpha=0.05):
    """t-검정 검정력 분석"""
    
    if power is None:
        # 검정력 계산
        power = ttest_power(effect_size, sample_size, alpha)
        return {
            'analysis_type': 'Power Calculation',
            'effect_size': float(effect_size),
            'sample_size': sample_size,
            'alpha': alpha,
            'power': float(power)
        }
    elif sample_size is None:
        # 표본 크기 계산
        sample_size = tt_solve_power(effect_size=effect_size, power=power, alpha=alpha)
        return {
            'analysis_type': 'Sample Size Calculation',
            'effect_size': float(effect_size),
            'required_sample_size': int(np.ceil(sample_size)),
            'alpha': alpha,
            'power': power
        }
```

---

## 📊 JavaScript 통합 예제

### 완전한 분석 워크플로우
```javascript
// Pyodide 로드 및 분석 실행
async function runCompleteAnalysis(data, testType) {
    // Python 분석 코드 실행
    const analysisCode = `
import json
import numpy as np

# 데이터 준비
data = ${JSON.stringify(data)}

# 분석 실행
if test_type == 'ttest':
    result = independent_ttest(data['group1'], data['group2'])
elif test_type == 'anova':
    result = one_way_anova(*data['groups'])
elif test_type == 'correlation':
    result = pearson_correlation(data['x'], data['y'])

# 가정 검정도 함께 실행
assumptions = {
    'normality': normality_tests(data['group1']) if 'group1' in data else None,
    'homogeneity': homogeneity_tests(*data['groups']) if 'groups' in data else None
}

final_result = {
    'main_analysis': result,
    'assumptions': assumptions,
    'timestamp': str(datetime.now())
}

json.dumps(final_result, indent=2)
    `;
    
    const result = await pyodide.runPython(analysisCode);
    return JSON.parse(result);
}
```

---

## 📋 체크리스트

### 구현 시 필수 확인사항
- [ ] SciPy/statsmodels 함수만 사용
- [ ] JavaScript로 통계 공식 직접 구현 금지
- [ ] 모든 가정 검정 포함
- [ ] 효과크기 계산 포함
- [ ] 신뢰구간 제공
- [ ] p-값 해석 포함
- [ ] 에러 처리 구현
- [ ] 타입 안전성 보장

---

*최종 업데이트: 2025-09-12*  
*다음 검토: Phase 2 완료 시*