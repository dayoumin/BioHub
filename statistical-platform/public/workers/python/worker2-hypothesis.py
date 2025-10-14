"""
Worker 2: Hypothesis Testing Python Module

가설검정 그룹 (8개 메서드)
- 패키지: NumPy, SciPy, Statsmodels
- 예상 메모리: 90MB
- 예상 로딩: 1.2초
"""

import numpy as np
from scipy import stats
from scipy.stats import binomtest
import math


def _safe_float(value):
    """Convert value to JSON-safe float (replace NaN/Infinity with None)"""
    if value is None:
        return None
    if math.isnan(value) or math.isinf(value):
        return None
    return float(value)


def t_test_two_sample(group1, group2, equal_var=True):
    """
    독립표본 t-검정 (Independent Samples t-test)
    """
    group1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
    group2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")

    statistic, p_value = stats.ttest_ind(group1, group2, equal_var=equal_var)

    # Cohen's d 효과크기
    pooled_std = np.sqrt(((len(group1) - 1) * np.var(group1, ddof=1) +
                          (len(group2) - 1) * np.var(group2, ddof=1)) /
                         (len(group1) + len(group2) - 2))
    cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'cohensD': float(cohens_d),
        'mean1': float(np.mean(group1)),
        'mean2': float(np.mean(group2)),
        'std1': float(np.std(group1, ddof=1)),
        'std2': float(np.std(group2, ddof=1)),
        'n1': int(len(group1)),
        'n2': int(len(group2))
    }


def t_test_paired(values1, values2):
    """
    대응표본 t-검정 (Paired Samples t-test)
    
    쌍(pair) 단위로 데이터 정제하여 통계적 정확성 보장
    """
    # 쌍 단위로 정제 (양쪽 모두 유효한 값만 선택)
    pairs = [(v1, v2) for v1, v2 in zip(values1, values2) 
             if v1 is not None and v2 is not None 
             and not np.isnan(v1) and not np.isnan(v2)]

    if len(pairs) < 2:
        raise ValueError("Paired test requires at least 2 valid pairs")

    values1 = np.array([p[0] for p in pairs])
    values2 = np.array([p[1] for p in pairs])

    statistic, p_value = stats.ttest_rel(values1, values2)
    mean_diff = np.mean(values1 - values2)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'meanDiff': _safe_float(mean_diff),
        'nPairs': int(len(pairs))
    }


def t_test_one_sample(data, popmean=0):
    """
    일표본 t-검정 (One-Sample t-test)
    """
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 2:
        raise ValueError("One-sample t-test requires at least 2 observations")

    statistic, p_value = stats.ttest_1samp(clean_data, popmean)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'sampleMean': float(np.mean(clean_data))
    }


def z_test(data, popmean, popstd):
    """
    Z-검정 (Z-test)
    """
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 30:
        raise ValueError("Z-test typically requires at least 30 observations")

    sample_mean = np.mean(clean_data)
    n = len(clean_data)

    z_statistic = (sample_mean - popmean) / (popstd / np.sqrt(n))
    p_value = 2 * (1 - stats.norm.cdf(abs(z_statistic)))

    return {
        'statistic': float(z_statistic),
        'pValue': _safe_float(p_value)
    }


def chi_square_test(observed_matrix, yates_correction=False):
    """
    카이제곱 검정 (Chi-Square Test)
    """
    observed = np.array(observed_matrix)

    if observed.size == 0:
        raise ValueError("Empty observed matrix")

    chi2, p_value, dof, expected = stats.chi2_contingency(observed, correction=yates_correction)

    return {
        'statistic': float(chi2),
        'pValue': _safe_float(p_value),
        'df': int(dof),
        'expectedMatrix': expected.tolist()
    }


def binomial_test(success_count, total_count, probability=0.5, alternative='two-sided'):
    """
    이항 검정 (Binomial Test)
    
    SciPy 1.12+ 호환 (binomtest 사용)
    """
    if total_count < 1:
        raise ValueError("Total count must be at least 1")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    # SciPy 1.12+ 호환
    binom_result = binomtest(success_count, total_count, probability, alternative=alternative)
    p_value = binom_result.pvalue

    return {
        'pValue': _safe_float(p_value),
        'successCount': int(success_count),
        'totalCount': int(total_count)
    }


def correlation_test(x, y, method='pearson'):
    """
    상관분석 (Correlation Test)
    """
    x = np.array([val for val in x if val is not None and not np.isnan(val)])
    y = np.array([val for val in y if val is not None and not np.isnan(val)])

    if len(x) != len(y):
        raise ValueError("x and y must have the same length")

    if len(x) < 3:
        raise ValueError("Correlation requires at least 3 paired observations")

    if method == 'pearson':
        r, p_value = stats.pearsonr(x, y)
    elif method == 'spearman':
        r, p_value = stats.spearmanr(x, y)
    elif method == 'kendall':
        r, p_value = stats.kendalltau(x, y)
    else:
        raise ValueError(f"Unknown correlation method: {method}")

    return {
        'correlation': float(r),
        'pValue': _safe_float(p_value),
        'method': method
    }


def partial_correlation(data_matrix, x_idx, y_idx, control_indices):
    """
    부분상관분석 (Partial Correlation)

    statsmodels와 SciPy를 사용하여 pingouin 라이선스 문제 해결

    원리: 통제 변수의 영향을 제거한 두 변수 간의 순수한 상관관계
    1. 각 변수(X, Y)를 통제 변수들로 선형 회귀하여 잔차(residuals) 계산
    2. 두 잔차 간의 피어슨 상관계수 계산
    """
    try:
        import statsmodels.api as sm
    except ImportError:
        raise ImportError("statsmodels library is required for partial correlation. Install with: pip install statsmodels")

    import pandas as pd

    data_matrix = np.array(data_matrix)

    if data_matrix.shape[0] < 3:
        raise ValueError("Partial correlation requires at least 3 complete cases")

    # None/NaN 필터링 (행 단위 - 필요한 열만 체크)
    required_cols = [x_idx, y_idx] + list(control_indices)
    valid_rows = []

    for i in range(data_matrix.shape[0]):
        row_values = [data_matrix[i, col] for col in required_cols]
        if all(val is not None and not np.isnan(val) for val in row_values):
            valid_rows.append(i)

    if len(valid_rows) < 3:
        raise ValueError(f"Partial correlation requires at least 3 valid observations, got {len(valid_rows)}")

    # 유효한 데이터만 선택
    data_clean = data_matrix[valid_rows]

    # DataFrame 생성
    df_data = {
        'x': data_clean[:, x_idx],
        'y': data_clean[:, y_idx]
    }
    for i, ctrl_idx in enumerate(control_indices):
        df_data[f'control{i}'] = data_clean[:, ctrl_idx]

    df = pd.DataFrame(df_data)

    # 통제 변수가 충분한지 확인
    n = len(df)
    k = len(control_indices)

    if n < k + 3:
        raise ValueError(f"Sample size ({n}) must be greater than number of control variables ({k}) + 2")

    # 통제 변수 행렬 (상수항 포함)
    control_cols = [f'control{i}' for i in range(k)]
    controls = sm.add_constant(df[control_cols])

    # 1. Y에서 통제 변수의 영향 제거 (잔차 계산)
    y_model = sm.OLS(df['y'], controls).fit()
    y_residuals = y_model.resid

    # 2. X에서 통제 변수의 영향 제거 (잔차 계산)
    x_model = sm.OLS(df['x'], controls).fit()
    x_residuals = x_model.resid

    # 3. 두 잔차 간의 피어슨 상관계수 계산
    corr_result = stats.pearsonr(x_residuals, y_residuals)

    # 자유도 계산 (n - k - 2)
    df_residual = n - k - 2

    # 신뢰구간 계산 (Fisher's z-transformation)
    r = corr_result.statistic
    z = np.arctanh(r)
    se = 1 / np.sqrt(df_residual - 1)
    z_crit = stats.norm.ppf(1 - 0.05 / 2)  # 95% 신뢰구간
    lower_z = z - z_crit * se
    upper_z = z + z_crit * se

    lower_corr = np.tanh(lower_z)
    upper_corr = np.tanh(upper_z)

    return {
        'correlation': float(r),
        'pValue': _safe_float(corr_result.pvalue),
        'df': int(df_residual),
        'nObservations': int(n),
        'confidenceInterval': {
            'lower': float(lower_corr),
            'upper': float(upper_corr)
        }
    }


def levene_test(groups):
    """
    Levene 등분산성 검정 (Levene's Test)

    정규성 가정에 강건한 등분산성 검정
    """
    # 각 그룹에서 결측값 제거
    clean_groups = []
    for group in groups:
        clean_group = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean_group) > 0:
            clean_groups.append(clean_group)

    if len(clean_groups) < 2:
        raise ValueError("Levene test requires at least 2 groups")

    # Levene 검정
    statistic, p_value = stats.levene(*clean_groups)

    return {
        'statistic': float(statistic),
        'pValue': _safe_float(p_value),
        'equalVariance': p_value > 0.05
    }


def bartlett_test(groups):
    """
    Bartlett 등분산성 검정 (Bartlett's Test)

    정규성 가정에 민감하지만 더 강력한 검정
    """
    # 각 그룹에서 결측값 제거
    clean_groups = []
    for group in groups:
        clean_group = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean_group) > 0:
            clean_groups.append(clean_group)

    if len(clean_groups) < 2:
        raise ValueError("Bartlett test requires at least 2 groups")

    # Bartlett 검정
    statistic, p_value = stats.bartlett(*clean_groups)

    return {
        'statistic': float(statistic),
        'pValue': _safe_float(p_value),
        'equalVariance': p_value > 0.05
    }


def chi_square_goodness_test(observed, expected=None, alpha=0.05):
    """
    카이제곱 적합도 검정 (Chi-Square Goodness of Fit Test)
    
    단일 범주형 변수가 예상 분포를 따르는지 검정
    """
    observed = np.array(observed, dtype=float)
    
    # None/NaN 제거
    observed = observed[~np.isnan(observed)]
    
    if len(observed) < 2:
        raise ValueError("Observed frequencies must have at least 2 values")
    
    if expected is None:
        # 균등 분포 가정
        expected = np.full_like(observed, np.sum(observed) / len(observed))
    else:
        expected = np.array(expected, dtype=float)
        expected = expected[~np.isnan(expected)]
        
        if len(observed) != len(expected):
            raise ValueError("Observed and expected must have same length")
    
    # SciPy chisquare 사용
    chi2_stat, p_value = stats.chisquare(f_obs=observed, f_exp=expected)
    
    df = len(observed) - 1
    critical_value = stats.chi2.ppf(1 - alpha, df)
    
    return {
        'chiSquare': float(chi2_stat),
        'pValue': _safe_float(p_value),
        'degreesOfFreedom': int(df),
        'criticalValue': float(critical_value),
        'reject': bool(p_value < alpha),
        'observed': observed.tolist(),
        'expected': expected.tolist()
    }


def chi_square_independence_test(observed_matrix, yates_correction=False, alpha=0.05):
    """
    카이제곱 독립성 검정 (Chi-Square Test of Independence)
    
    두 범주형 변수 간 독립성 검정 (분할표)
    """
    observed = np.array(observed_matrix, dtype=float)
    
    if observed.size == 0:
        raise ValueError("Empty observed matrix")
    
    if observed.ndim != 2:
        raise ValueError("Observed matrix must be 2-dimensional")
    
    # SciPy chi2_contingency 사용
    chi2_stat, p_value, dof, expected = stats.chi2_contingency(
        observed, 
        correction=yates_correction
    )
    
    critical_value = stats.chi2.ppf(1 - alpha, dof)
    
    # Cramér's V (효과 크기)
    n = np.sum(observed)
    min_dim = min(observed.shape[0], observed.shape[1])
    cramers_v = np.sqrt(chi2_stat / (n * (min_dim - 1))) if min_dim > 1 else 0.0
    
    return {
        'chiSquare': float(chi2_stat),
        'pValue': _safe_float(p_value),
        'degreesOfFreedom': int(dof),
        'criticalValue': float(critical_value),
        'reject': bool(p_value < alpha),
        'cramersV': float(cramers_v),
        'observedMatrix': observed.tolist(),
        'expectedMatrix': expected.tolist()
    }
