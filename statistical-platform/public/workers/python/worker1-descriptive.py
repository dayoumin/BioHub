# Worker 1: Descriptive Statistics Python Module
# Notes:
# - Dependencies: NumPy, SciPy
# - Estimated memory: ~80MB
# - Cold start time: ~0.8s

from typing import List, Dict, Union, Literal, Optional, Any
import numpy as np
from scipy import stats
from scipy.stats import binomtest
from helpers import clean_array


def _safe_bool(value: Union[bool, np.bool_]) -> bool:
    """
    Ensure NumPy boolean types are converted to native bool for JSON serialization.
    """
    try:
        return bool(value.item())  # type: ignore[attr-defined]
    except AttributeError:
        return bool(value)


def descriptive_stats(data: List[Union[float, int, None]]) -> Dict[str, Union[float, int]]:
    clean_data = clean_array(data)

    if len(clean_data) == 0:
        raise ValueError("No valid data")

    mode_result = stats.mode(clean_data, keepdims=True)
    mode_value = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else float(np.median(clean_data))

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


def normality_test(data: List[Union[float, int, None]], alpha: float = 0.05) -> Dict[str, Union[float, bool]]:
    clean_data = clean_array(data)

    if len(clean_data) < 3:
        raise ValueError("Normality test requires at least 3 observations")

    statistic, p_value = stats.shapiro(clean_data)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'isNormal': _safe_bool(p_value > alpha),
        'alpha': float(alpha)
    }


def outlier_detection(
    data: List[Union[float, int, None]],
    method: Literal['iqr', 'zscore'] = 'iqr'
) -> Dict[str, Union[List[int], int, str]]:
    clean_data = clean_array(data)

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


def frequency_analysis(values: List[Any]) -> Dict[str, Union[List[str], List[int], List[float], int]]:
    values_np = np.array(values)

    if len(values_np) == 0:
        raise ValueError("Empty data for frequency analysis")

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


def crosstab_analysis(
    row_values: List[Any],
    col_values: List[Any]
) -> Dict[str, Union[List[str], List[List[int]], List[int], int]]:
    row_values = np.array(row_values)
    col_values = np.array(col_values)

    if len(row_values) != len(col_values):
        raise ValueError(f"Row and column must have same length: {len(row_values)} != {len(col_values)}")

    if len(row_values) == 0:
        raise ValueError("Empty data for crosstab analysis")

    row_categories = np.unique(row_values)
    col_categories = np.unique(col_values)

    observed_matrix = np.zeros((len(row_categories), len(col_categories)), dtype=int)

    for i, row_cat in enumerate(row_categories):
        for j, col_cat in enumerate(col_categories):
            count = np.sum((row_values == row_cat) & (col_values == col_cat))
            observed_matrix[i, j] = count

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


def one_sample_proportion_test(
    success_count: int,
    total_count: int,
    null_proportion: float = 0.5,
    alternative: Literal['two-sided', 'less', 'greater'] = 'two-sided',
    alpha: float = 0.05
) -> Dict[str, Union[float, bool]]:
    if total_count < 10:
        raise ValueError("Proportion test requires at least 10 observations")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    sample_proportion = success_count / total_count

    binom_result = binomtest(success_count, total_count, null_proportion, alternative=alternative)
    p_value_exact = binom_result.pvalue

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
        'significant': _safe_bool(p_value_exact < alpha),
        'alpha': float(alpha)
    }


def cronbach_alpha(items_matrix: List[List[Union[float, int]]]) -> Dict[str, Union[float, int]]:
    try:
        import pingouin as pg
        import pandas as pd
    except ImportError:
        raise ImportError("pingouin library is required for Cronbach's alpha. Install with: pip install pingouin")

    items_matrix = np.array(items_matrix)

    if items_matrix.shape[0] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 respondents")

    if items_matrix.shape[1] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 items")

    n_items = items_matrix.shape[1]
    n_respondents = items_matrix.shape[0]

    # Convert to DataFrame for pingouin
    df = pd.DataFrame(items_matrix, columns=[f'item_{i}' for i in range(n_items)])

    # Use pingouin for Cronbach's alpha
    alpha_result = pg.cronbach_alpha(df)
    alpha_value = alpha_result[0]  # Returns tuple (alpha, confidence_interval)

    return {
        'alpha': float(alpha_value),
        'nItems': int(n_items),
        'nRespondents': int(n_respondents)
    }


def kolmogorov_smirnov_test(data: List[Union[float, int, None]]) -> Dict[str, Union[float, bool]]:
    clean_data = clean_array(data)

    if len(clean_data) < 3:
        raise ValueError("K-S test requires at least 3 observations")

    statistic, p_value = stats.kstest(
        clean_data,
        'norm',
        args=(np.mean(clean_data), np.std(clean_data))
    )

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'isNormal': _safe_bool(p_value > 0.05)
    }


def ks_test_one_sample(values: List[Union[float, int]]) -> Dict[str, Union[float, int, bool, str, Dict]]:
    """
    Kolmogorov-Smirnov one-sample test (normality test)
    """
    clean_values = clean_array(values)
    n = len(clean_values)

    if n < 3:
        raise ValueError("K-S test requires at least 3 observations")

    mean = float(np.mean(clean_values))
    std = float(np.std(clean_values, ddof=1))

    # K-S test against normal distribution
    statistic, pvalue = stats.kstest(clean_values, 'norm', args=(mean, std))

    # Critical value at α = 0.05
    critical_value = 1.36 / np.sqrt(n)

    return {
        'testType': 'one-sample',
        'statisticKS': float(statistic),
        'pValue': float(pvalue),
        'criticalValue': float(critical_value),
        'significant': _safe_bool(statistic > critical_value),
        'sampleSizes': {
            'n1': int(n)
        },
        'distributionInfo': {
            'expectedDistribution': 'normal',
            'observedMean': float(mean),
            'observedStd': float(std),
            'expectedMean': float(mean),
            'expectedStd': float(std)
        }
    }


def ks_test_two_sample(values1: List[Union[float, int]], values2: List[Union[float, int]]) -> Dict[str, Union[float, int, bool, Dict]]:
    """
    Kolmogorov-Smirnov two-sample test
    """
    clean_values1 = clean_array(values1)
    clean_values2 = clean_array(values2)
    n1 = len(clean_values1)
    n2 = len(clean_values2)

    if n1 < 3 or n2 < 3:
        raise ValueError("K-S test requires at least 3 observations in each sample")

    # Two-sample K-S test
    statistic, pvalue = stats.ks_2samp(clean_values1, clean_values2)

    # Critical value at α = 0.05
    critical_value = 1.36 * np.sqrt((n1 + n2) / (n1 * n2))

    # Effect size (Cohen's d)
    mean1 = float(np.mean(clean_values1))
    mean2 = float(np.mean(clean_values2))
    pooled_std = float(np.sqrt(((n1 - 1) * np.var(clean_values1, ddof=1) + (n2 - 1) * np.var(clean_values2, ddof=1)) / (n1 + n2 - 2)))
    effect_size = abs(mean1 - mean2) / pooled_std if pooled_std > 0 else 0.0

    return {
        'testType': 'two-sample',
        'statisticKS': float(statistic),
        'pValue': float(pvalue),
        'criticalValue': float(critical_value),
        'significant': _safe_bool(statistic > critical_value),
        'effectSize': float(effect_size),
        'sampleSizes': {
            'n1': int(n1),
            'n2': int(n2)
        }
    }


def mann_kendall_test(data: List[Union[float, int]]) -> Dict[str, Union[str, float, int]]:
    """
    Mann-Kendall trend test for time series data
    """
    clean_data = clean_array(data)
    n = len(clean_data)

    if n < 3:
        raise ValueError("Mann-Kendall test requires at least 3 observations")

    # Calculate S statistic
    s = 0
    for i in range(n-1):
        for j in range(i+1, n):
            s += np.sign(clean_data[j] - clean_data[i])

    # Calculate variance of S
    var_s = n * (n - 1) * (2 * n + 5) / 18

    # Calculate standardized test statistic Z
    if s > 0:
        z = (s - 1) / np.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / np.sqrt(var_s)
    else:
        z = 0

    # Calculate p-value (two-tailed test)
    p = 2 * (1 - stats.norm.cdf(abs(z)))

    # Calculate Kendall's tau
    tau, _ = stats.kendalltau(range(n), clean_data)

    # Calculate slope (Sen's slope estimator)
    slopes = []
    for i in range(n-1):
        for j in range(i+1, n):
            if j != i:
                slope = (clean_data[j] - clean_data[i]) / (j - i)
                slopes.append(slope)
    sen_slope = np.median(slopes) if slopes else 0

    # Calculate intercept
    intercept = np.median(clean_data) - sen_slope * np.median(range(n))

    # Determine trend
    alpha = 0.05
    if p < alpha:
        if z > 0:
            trend = 'increasing'
        else:
            trend = 'decreasing'
    else:
        trend = 'no trend'

    return {
        'trend': trend,
        'tau': float(tau),
        'zScore': float(z),
        'pValue': float(p),
        'senSlope': float(sen_slope),
        'intercept': float(intercept),
        'n': int(n)
    }

def bonferroni_correction(p_values, alpha=0.05):
    """
    Bonferroni correction for multiple comparisons

    Parameters:
    - p_values: List[float] - Original p-values
    - alpha: float - Significance level (default: 0.05)

    Returns:
    - Dict with corrected p-values and significance results
    """
    import numpy as np

    if not p_values or len(p_values) == 0:
        return {
            'original_p_values': [],
            'corrected_p_values': [],
            'adjusted_alpha': float(alpha),
            'n_comparisons': 0,
            'significant': []
        }

    p_arr = np.array(p_values)
    n = len(p_arr)

    # Bonferroni correction: multiply p-values by number of tests
    corrected = np.minimum(p_arr * n, 1.0)

    # Adjusted alpha
    adjusted_alpha = alpha / n

    return {
        'original_p_values': [float(p) for p in p_values],
        'corrected_p_values': [float(p) for p in corrected],
        'adjusted_alpha': float(adjusted_alpha),
        'n_comparisons': int(n),
        'significant': [bool(p < adjusted_alpha) for p in p_arr]
    }

def means_plot_data(data, dependent_var, factor_var):
    """
    집단별 평균 플롯 데이터 생성

    Parameters:
    - data: List[Dict] - 전체 데이터
    - dependent_var: str - 종속변수 이름
    - factor_var: str - 요인변수 이름

    Returns:
    - Dict with descriptives, plotData, and interpretation
    """
    import pandas as pd
    import numpy as np
    from scipy import stats

    df = pd.DataFrame(data)

    # 결측값 제거
    df_clean = df[[dependent_var, factor_var]].dropna()

    # 집단별 기술통계량 계산
    groups = df_clean.groupby(factor_var)[dependent_var]

    descriptives = {}
    plot_data = []

    for name, group in groups:
        mean_val = group.mean()
        std_val = group.std()
        count_val = len(group)
        sem_val = std_val / np.sqrt(count_val)

        # 95% 신뢰구간 계산
        t_critical = stats.t.ppf(0.975, count_val - 1)
        margin_error = t_critical * sem_val
        ci_lower = mean_val - margin_error
        ci_upper = mean_val + margin_error

        descriptives[str(name)] = {
            'group': str(name),
            'mean': float(mean_val),
            'std': float(std_val),
            'sem': float(sem_val),
            'count': int(count_val),
            'ciLower': float(ci_lower),
            'ciUpper': float(ci_upper)
        }

        plot_data.append({
            'group': str(name),
            'mean': float(mean_val),
            'error': float(sem_val),
            'count': int(count_val)
        })

    # 해석 생성
    total_groups = len(descriptives)
    means = [desc['mean'] for desc in descriptives.values()]
    max_mean = max(means)
    min_mean = min(means)
    mean_diff = max_mean - min_mean

    interpretation = {
        'summary': f'{total_groups}개 집단의 평균값을 비교했습니다. 가장 높은 평균은 {max_mean:.3f}, 가장 낮은 평균은 {min_mean:.3f}로 차이는 {mean_diff:.3f}입니다.',
        'recommendations': [
            '오차막대는 표준오차(SEM)를 나타냅니다.',
            '집단 간 평균 차이가 통계적으로 유의한지 확인하려면 ANOVA를 실시하세요.',
            '95% 신뢰구간이 겹치지 않으면 집단 간 차이가 있을 가능성이 높습니다.',
            '표본 크기가 작은 집단은 해석 시 주의가 필요합니다.'
        ]
    }

    return {
        'descriptives': descriptives,
        'plotData': plot_data,
        'interpretation': interpretation
    }

