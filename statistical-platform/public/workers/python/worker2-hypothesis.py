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

    pingouin.partial_corr 사용
    """
    try:
        import pingouin as pg
    except ImportError:
        raise ImportError("pingouin library is required for partial correlation. Install with: pip install pingouin")

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
    col_names = ['x', 'y'] + [f'control{i}' for i in range(len(control_indices))]
    df_data = {
        'x': data_clean[:, x_idx],
        'y': data_clean[:, y_idx]
    }
    for i, ctrl_idx in enumerate(control_indices):
        df_data[f'control{i}'] = data_clean[:, ctrl_idx]

    df = pd.DataFrame(df_data)

    # pingouin partial_corr
    covar_cols = [f'control{i}' for i in range(len(control_indices))]
    result = pg.partial_corr(data=df, x='x', y='y', covar=covar_cols)

    return {
        'correlation': float(result['r'].iloc[0]),
        'pValue': _safe_float(result['p-val'].iloc[0]),
        'nObservations': int(len(valid_rows))
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
