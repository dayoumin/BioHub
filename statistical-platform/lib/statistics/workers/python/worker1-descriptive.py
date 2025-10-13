"""
Worker 1: Descriptive Statistics Python Module

기술통계 그룹 (10개 메서드)
- 패키지: NumPy, SciPy
- 예상 메모리: 80MB
- 예상 로딩: 0.8초
"""

import numpy as np
from scipy import stats
from scipy.stats import binomtest


def descriptive_stats(data):
    """
    기술통계 계산 (Descriptive Statistics)

    평균, 중앙값, 최빈값, 표준편차, 분산, 범위, 사분위수, 왜도, 첨도 등
    """
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) == 0:
        raise ValueError("No valid data")

    # SciPy stats.mode 계산
    mode_result = stats.mode(clean_data, keepdims=True)
    mode_value = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else float(np.median(clean_data))

    # 사분위수 계산 (중복 방지)
    q1 = np.percentile(clean_data, 25)
    q3 = np.percentile(clean_data, 75)

    return {
        'mean': float(np.mean(clean_data)),
        'median': float(np.median(clean_data)),
        'mode': mode_value,
        'std': float(np.std(clean_data, ddof=1)),
        'variance': float(np.var(clean_data, ddof=1)),
        'min': float(np.min(clean_data)),
        'max': float(np.max(clean_data)),
        'q1': float(q1),
        'q3': float(q3),
        'iqr': float(q3 - q1),
        'skewness': float(stats.skew(clean_data)),
        'kurtosis': float(stats.kurtosis(clean_data)),
        'n': int(len(clean_data))
    }


def normality_test(data, alpha=0.05):
    """
    정규성 검정 (Normality Test - Shapiro-Wilk)

    데이터가 정규분포를 따르는지 검정
    """
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 3:
        raise ValueError("Normality test requires at least 3 observations")

    statistic, p_value = stats.shapiro(clean_data)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'isNormal': bool(p_value > alpha),
        'alpha': float(alpha)
    }


def outlier_detection(data, method='iqr'):
    """
    이상치 탐지 (Outlier Detection)

    IQR 방법 또는 Z-score 방법으로 이상치 탐지
    """
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 4:
        raise ValueError("Outlier detection requires at least 4 observations")

    if method == 'iqr':
        q1 = np.percentile(clean_data, 25)
        q3 = np.percentile(clean_data, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outlier_indices = [i for i, val in enumerate(clean_data)
                          if val < lower_bound or val > upper_bound]
    else:  # z-score
        z_scores = np.abs(stats.zscore(clean_data))
        outlier_indices = [i for i, z in enumerate(z_scores) if z > 3]

    return {
        'outlierIndices': outlier_indices,
        'outlierCount': len(outlier_indices),
        'method': method
    }


def frequency_analysis(values):
    """
    빈도분석 (Frequency Analysis)

    범주형 변수의 빈도표 생성
    """
    values_np = np.array(values)

    if len(values_np) == 0:
        raise ValueError("Empty data for frequency analysis")

    # 고유값과 빈도 계산
    unique_vals, counts = np.unique(values_np, return_counts=True)

    total = len(values_np)
    percentages = (counts / total) * 100
    cumulative = np.cumsum(percentages)

    return {
        'categories': [str(v) for v in unique_vals],
        'frequencies': [int(c) for c in counts],
        'percentages': [float(p) for p in percentages],
        'cumulativePercentages': [float(c) for c in cumulative],
        'total': int(total),
        'uniqueCount': int(len(unique_vals))
    }


def crosstab_analysis(row_values, col_values):
    """
    교차표 분석 (Crosstab Analysis)

    두 범주형 변수의 교차 빈도표
    """
    row_values = np.array(row_values)
    col_values = np.array(col_values)

    if len(row_values) != len(col_values):
        raise ValueError(f"Row and column must have same length: {len(row_values)} != {len(col_values)}")

    if len(row_values) == 0:
        raise ValueError("Empty data for crosstab analysis")

    # 고유 카테고리
    row_categories = np.unique(row_values)
    col_categories = np.unique(col_values)

    # 교차표 행렬
    observed_matrix = np.zeros((len(row_categories), len(col_categories)), dtype=int)

    for i, row_cat in enumerate(row_categories):
        for j, col_cat in enumerate(col_categories):
            count = np.sum((row_values == row_cat) & (col_values == col_cat))
            observed_matrix[i, j] = count

    # 행/열 합계
    row_totals = observed_matrix.sum(axis=1)
    col_totals = observed_matrix.sum(axis=0)
    grand_total = observed_matrix.sum()

    return {
        'rowCategories': [str(c) for c in row_categories],
        'colCategories': [str(c) for c in col_categories],
        'observedMatrix': observed_matrix.tolist(),
        'rowTotals': row_totals.tolist(),
        'colTotals': col_totals.tolist(),
        'grandTotal': int(grand_total)
    }


def one_sample_proportion_test(success_count, total_count, null_proportion=0.5,
                                alternative='two-sided', alpha=0.05):
    """
    일표본 비율검정 (One-Sample Proportion Test)

    표본 비율이 특정 값과 같은지 검정
    """
    if total_count < 10:
        raise ValueError("Proportion test requires at least 10 observations")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    sample_proportion = success_count / total_count

    # 이항검정 (정확검정) - SciPy 1.12+ 호환
    binom_result = binomtest(success_count, total_count, null_proportion, alternative=alternative)
    p_value_exact = binom_result.pvalue

    # 정규근사 (큰 표본)
    z_statistic = (sample_proportion - null_proportion) / np.sqrt(null_proportion * (1 - null_proportion) / total_count)

    if alternative == 'two-sided':
        p_value_approx = 2 * (1 - stats.norm.cdf(abs(z_statistic)))
    elif alternative == 'greater':
        p_value_approx = 1 - stats.norm.cdf(z_statistic)
    else:  # 'less'
        p_value_approx = stats.norm.cdf(z_statistic)

    return {
        'sampleProportion': float(sample_proportion),
        'nullProportion': float(null_proportion),
        'zStatistic': float(z_statistic),
        'pValueExact': float(p_value_exact),
        'pValueApprox': float(p_value_approx),
        'significant': bool(p_value_exact < alpha),
        'alpha': float(alpha)
    }


def cronbach_alpha(items_matrix):
    """
    신뢰도 분석 (Reliability Analysis - Cronbach's Alpha)

    척도의 내적 일관성 신뢰도 계산
    """
    items_matrix = np.array(items_matrix)

    if items_matrix.shape[0] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 respondents")

    if items_matrix.shape[1] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 items")

    # 항목 수
    n_items = items_matrix.shape[1]

    # 각 항목의 분산
    item_variances = np.var(items_matrix, axis=0, ddof=1)

    # 총점의 분산
    total_scores = np.sum(items_matrix, axis=1)
    total_variance = np.var(total_scores, ddof=1)

    # Cronbach's alpha 계산
    alpha = (n_items / (n_items - 1)) * (1 - np.sum(item_variances) / total_variance)

    return {
        'alpha': float(alpha),
        'nItems': int(n_items),
        'nRespondents': int(items_matrix.shape[0])
    }
