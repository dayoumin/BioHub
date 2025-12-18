# Worker 1: Descriptive Statistics Python Module
# Notes:
# - Dependencies: NumPy, SciPy
# - Estimated memory: ~80MB
# - Cold start time: ~0.8s

from typing import List, Dict, Union, Literal, Optional, Any
import math
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


def descriptive_stats(
    data: List[Union[float, int, None]],
    confidenceLevel: float = 0.95
) -> Dict[str, Union[float, int]]:
    clean_data = clean_array(data)

    if len(clean_data) == 0:
        raise ValueError("No valid data")

    mode_result = stats.mode(clean_data, keepdims=True)
    mode_value = float(mode_result.mode[0]) if len(mode_result.mode) > 0 else float(np.median(clean_data))

    q1 = np.percentile(clean_data, 25)
    q3 = np.percentile(clean_data, 75)

    # Confidence interval calculation
    if not (0 < confidenceLevel < 1):
        raise ValueError("confidenceLevel must be between 0 and 1")

    n = len(clean_data)
    mean = float(np.mean(clean_data))

    sem = float(stats.sem(clean_data)) if n >= 2 else 0.0
    if n >= 2 and sem > 0:
        ci = stats.t.interval(confidenceLevel, df=n - 1, loc=mean, scale=sem)
        ci_lower = float(ci[0])
        ci_upper = float(ci[1])
    else:
        ci_lower = mean
        ci_upper = mean

    return {
        'mean': mean,
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
        'n': int(n),
        'se': sem,
        'sem': sem,
        'confidenceLevel': float(confidenceLevel),
        'ciLower': ci_lower,
        'ciUpper': ci_upper
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
    rowValues: List[Any],
    colValues: List[Any]
) -> Dict[str, Union[List[str], List[List[int]], List[int], int]]:
    row_values = np.array(rowValues)
    col_values = np.array(colValues)

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
    successCount: int,
    totalCount: int,
    nullProportion: float = 0.5,
    alternative: Literal['two-sided', 'less', 'greater'] = 'two-sided',
    alpha: float = 0.05
) -> Dict[str, Union[float, bool]]:
    if totalCount < 10:
        raise ValueError("Proportion test requires at least 10 observations")

    if successCount < 0 or successCount > totalCount:
        raise ValueError(f"Invalid successCount: must be 0 <= {successCount} <= {totalCount}")

    sample_proportion = successCount / totalCount

    binom_result = binomtest(successCount, totalCount, nullProportion, alternative=alternative)
    p_value_exact = binom_result.pvalue

    z_statistic = (sample_proportion - nullProportion) / np.sqrt(nullProportion * (1 - nullProportion) / totalCount)

    if alternative == 'two-sided':
        p_value_approx = 2 * (1 - stats.norm.cdf(abs(z_statistic)))
    elif alternative == 'greater':
        p_value_approx = 1 - stats.norm.cdf(z_statistic)
    else:  # 'less'
        p_value_approx = stats.norm.cdf(z_statistic)

    return {
        'sampleProportion': float(sample_proportion),
        'nullProportion': float(nullProportion),
        'zStatistic': float(z_statistic),
        'pValueExact': float(p_value_exact),
        'pValueApprox': float(p_value_approx),
        'significant': _safe_bool(p_value_exact < alpha),
        'alpha': float(alpha)
    }


def cronbach_alpha(itemsMatrix: List[List[Union[float, int]]]) -> Dict[str, Union[float, int]]:
    try:
        import pingouin as pg
        import pandas as pd
    except ImportError:
        raise ImportError("pingouin library is required for Cronbach's alpha. Install with: pip install pingouin")

    itemsMatrix = np.array(itemsMatrix)

    if itemsMatrix.shape[0] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 respondents")

    if itemsMatrix.shape[1] < 2:
        raise ValueError("Cronbach's alpha requires at least 2 items")

    n_items = itemsMatrix.shape[1]
    n_respondents = itemsMatrix.shape[0]

    # Convert to DataFrame for pingouin
    df = pd.DataFrame(itemsMatrix, columns=[f'item_{i}' for i in range(n_items)])

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

    significant = _safe_bool(statistic > critical_value)
    interpretation = (
        "Reject H0: sample differs from expected distribution"
        if significant
        else "Fail to reject H0: no evidence sample differs from expected distribution"
    )

    return {
        'testType': 'one-sample',
        'statistic': float(statistic),
        'statisticKS': float(statistic),
        'pValue': float(pvalue),
        'n': int(n),
        'criticalValue': float(critical_value),
        'significant': significant,
        'interpretation': interpretation,
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

    significant = _safe_bool(statistic > critical_value)

    # Effect size (Cohen's d)
    mean1 = float(np.mean(clean_values1))
    mean2 = float(np.mean(clean_values2))
    pooled_std = float(np.sqrt(((n1 - 1) * np.var(clean_values1, ddof=1) + (n2 - 1) * np.var(clean_values2, ddof=1)) / (n1 + n2 - 2)))
    effect_size = abs(mean1 - mean2) / pooled_std if pooled_std > 0 else 0.0

    return {
        'testType': 'two-sample',
        'statistic': float(statistic),
        'statisticKS': float(statistic),
        'pValue': float(pvalue),
        'n1': int(n1),
        'n2': int(n2),
        'criticalValue': float(critical_value),
        'significant': significant,
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

def bonferroni_correction(pValues, alpha=0.05):
    """
    Bonferroni correction for multiple comparisons

    Parameters:
    - p_values: List[float] - Original p-values
    - alpha: float - Significance level (default: 0.05)

    Returns:
    - Dict with corrected p-values and significance results
    """
    import numpy as np

    if not pValues or len(pValues) == 0:
        return {
            'originalPValues': [],
            'correctedPValues': [],
            'adjustedAlpha': float(alpha),
            'nComparisons': 0,
            'significant': []
        }

    p_arr = np.array(pValues)
    n = len(p_arr)

    # Bonferroni correction: multiply p-values by number of tests
    corrected = np.minimum(p_arr * n, 1.0)

    # Adjusted alpha
    adjusted_alpha = alpha / n

    return {
        'originalPValues': [float(p) for p in pValues],
        'correctedPValues': [float(p) for p in corrected],
        'adjustedAlpha': float(adjusted_alpha),
        'nComparisons': int(n),
        'significant': [bool(p < adjusted_alpha) for p in p_arr]
    }

def means_plot_data(data, dependentVar, factorVar):
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
    df_clean = df[[dependentVar, factorVar]].dropna()

    # 집단별 기술통계량 계산
    groups = df_clean.groupby(factorVar)[dependentVar]

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


# =============================================================================
# Effect Size Conversion Functions
# =============================================================================
# References:
# - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences
# - Borenstein, M. et al. (2009). Introduction to Meta-Analysis
# - Rosenthal, R. (1994). Parametric measures of effect size

def _safe_float(value: Union[float, np.floating, None]) -> Optional[float]:
    """Convert numpy float to Python float, handling None and special values."""
    if value is None:
        return None
    try:
        result = float(value)
        if np.isnan(result) or np.isinf(result):
            return None
        return result
    except (TypeError, ValueError):
        return None


def _hedges_correction_j(df: int) -> float:
    """
    Small-sample bias correction factor for standardized mean differences (Hedges' g).

    Exact: J(df) = Γ(df/2) / (sqrt(df/2) * Γ((df-1)/2))
    Approx: J(df) ≈ 1 - 3/(4df - 1)

    References:
    - Hedges, L. V., & Olkin, I. (1985). Statistical Methods for Meta-Analysis.
    """
    if df <= 1:
        raise ValueError("df must be > 1 for Hedges' correction")

    half_df = df / 2.0
    log_j = math.lgamma(half_df) - (0.5 * math.log(half_df) + math.lgamma((df - 1) / 2.0))
    return float(math.exp(log_j))


def _interpret_cohens_d(d: float) -> str:
    """Interpret Cohen's d effect size (Cohen, 1988)."""
    abs_d = abs(d)
    if abs_d < 0.2:
        return "negligible"
    elif abs_d < 0.5:
        return "small"
    elif abs_d < 0.8:
        return "medium"
    else:
        return "large"


def _interpret_r(r: float) -> str:
    """Interpret correlation coefficient as effect size (Cohen, 1988)."""
    abs_r = abs(r)
    if abs_r < 0.1:
        return "negligible"
    elif abs_r < 0.3:
        return "small"
    elif abs_r < 0.5:
        return "medium"
    else:
        return "large"


def _interpret_eta_squared(eta2: float) -> str:
    """Interpret eta-squared effect size (Cohen, 1988)."""
    if eta2 < 0.01:
        return "negligible"
    elif eta2 < 0.06:
        return "small"
    elif eta2 < 0.14:
        return "medium"
    else:
        return "large"


def _interpret_odds_ratio(or_val: float) -> str:
    """Interpret odds ratio (Chen et al., 2010)."""
    if or_val < 1:
        or_val = 1 / or_val  # Normalize to >= 1
    if or_val < 1.5:
        return "negligible"
    elif or_val < 2.5:
        return "small"
    elif or_val < 4.3:
        return "medium"
    else:
        return "large"


def effect_size_from_t(
    tValue: float,
    df: float,
    n1: Optional[int] = None,
    n2: Optional[int] = None
) -> Dict[str, Union[float, str, None]]:
    """
    Calculate Cohen's d from t-statistic.

    For independent samples: d = t * sqrt(1/n1 + 1/n2)
    For one-sample/paired: d = t / sqrt(df + 1)

    References:
    - Lakens, D. (2013). Calculating and reporting effect sizes.
    - Rosenthal, R. (1994). Parametric measures of effect size.
    """
    if df <= 0:
        raise ValueError("df must be positive")

    if n1 is not None and n2 is not None:
        if n1 <= 0 or n2 <= 0:
            raise ValueError("n1 and n2 must be positive")
        # Independent samples t-test
        # d = t * sqrt(1/n1 + 1/n2)
        cohens_d = tValue * np.sqrt(1/n1 + 1/n2)
        n_total = n1 + n2
    else:
        # One-sample or paired t-test
        # d = t / sqrt(n) where n = df + 1
        n = df + 1
        if n <= 1:
            raise ValueError("df implies invalid sample size for one-sample/paired t")
        cohens_d = tValue / np.sqrt(n)
        n_total = n

    # Convert t to r (correlation equivalent): r = t / sqrt(t^2 + df)
    r = tValue / np.sqrt(tValue**2 + df)

    # Convert to eta-squared: eta^2 = t^2 / (t^2 + df)
    eta_squared = tValue**2 / (tValue**2 + df)

    return {
        'cohensD': _safe_float(cohens_d),
        'r': _safe_float(r),
        'etaSquared': _safe_float(eta_squared),
        'dInterpretation': _interpret_cohens_d(cohens_d),
        'rInterpretation': _interpret_r(r),
        'inputType': 't-statistic',
        'formula': 'd = t × sqrt(1/n1 + 1/n2)' if n1 is not None and n2 is not None else 'd = t / sqrt(n)'
    }


def effect_size_from_f(
    fValue: float,
    dfBetween: int,
    dfWithin: int
) -> Dict[str, Union[float, str, None]]:
    """
    Calculate effect sizes from F-statistic (ANOVA).

    eta^2 = (df_between * F) / (df_between * F + df_within)
    omega^2 = (df_between * (F - 1)) / (df_between * F + df_within + 1)
    f = sqrt(eta^2 / (1 - eta^2))

    References:
    - Lakens, D. (2013). Calculating and reporting effect sizes.
    """
    # Eta-squared
    eta_squared = (dfBetween * fValue) / (dfBetween * fValue + dfWithin)

    # Omega-squared (less biased)
    omega_squared = (dfBetween * (fValue - 1)) / (dfBetween * fValue + dfWithin + 1)
    omega_squared = max(0, omega_squared)  # Can't be negative

    # Cohen's f
    if eta_squared < 1:
        cohens_f = np.sqrt(eta_squared / (1 - eta_squared))
    else:
        cohens_f = float('inf')

    # Approximate Cohen's d (for 2 groups only, using f)
    cohens_d = 2 * cohens_f if dfBetween == 1 else None

    return {
        'etaSquared': _safe_float(eta_squared),
        'omegaSquared': _safe_float(omega_squared),
        'cohensF': _safe_float(cohens_f),
        'cohensD': _safe_float(cohens_d) if cohens_d else None,
        'etaInterpretation': _interpret_eta_squared(eta_squared),
        'inputType': 'F-statistic',
        'formula': 'η² = (df_b × F) / (df_b × F + df_w)'
    }


def effect_size_from_chi_square(
    chiSquare: float,
    n: int,
    df: Optional[int] = None,
    rows: Optional[int] = None,
    cols: Optional[int] = None
) -> Dict[str, Union[float, str, None]]:
    """
    Calculate effect sizes from chi-square statistic.

    phi = sqrt(chi^2 / n)  (for 2x2 tables)
    Cramer's V = sqrt(chi^2 / (n * min(r-1, c-1)))
    w = sqrt(chi^2 / n)  (Cohen's w)

    References:
    - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
    """
    if chiSquare < 0:
        raise ValueError("Chi-square statistic must be non-negative")
    if n <= 0:
        raise ValueError("n must be positive")

    min_dim_minus_1: Optional[int] = None
    if rows is not None and cols is not None:
        if rows < 2 or cols < 2:
            raise ValueError("rows and cols must be >= 2")
        min_dim_minus_1 = min(rows - 1, cols - 1)
    elif df is not None:
        # NOTE: `df` here represents min(r-1, c-1), not the chi-square test df (which is (r-1)(c-1)).
        if df <= 0:
            raise ValueError("df must be positive")
        min_dim_minus_1 = df

    if min_dim_minus_1 is None:
        raise ValueError("Provide either df (= min(r-1, c-1)) or both rows and cols")

    # Phi coefficient (same as w for df=1)
    phi = np.sqrt(chiSquare / n)

    # Cohen's w (same as phi)
    cohens_w = phi

    # Cramer's V
    cramers_v = np.sqrt(chiSquare / (n * min_dim_minus_1)) if min_dim_minus_1 > 0 else None

    # Chi-square alone does not determine the sign, so we do not report r here.
    r = None

    # Interpret Cohen's w
    if cohens_w < 0.1:
        w_interpretation = "negligible"
    elif cohens_w < 0.3:
        w_interpretation = "small"
    elif cohens_w < 0.5:
        w_interpretation = "medium"
    else:
        w_interpretation = "large"

    return {
        'phi': _safe_float(phi),
        'cramersV': _safe_float(cramers_v) if cramers_v is not None else None,
        'cohensW': _safe_float(cohens_w),
        'r': _safe_float(r) if r is not None else None,
        'wInterpretation': w_interpretation,
        'inputType': 'chi-square',
        'formula': 'phi = sqrt(chi^2 / n); V = sqrt(chi^2 / (n * min(r-1, c-1)))'
    }


def effect_size_from_r(
    r: float,
    n: Optional[int] = None
) -> Dict[str, Union[float, str, None]]:
    """
    Convert correlation coefficient to other effect sizes.

    d = 2r / sqrt(1 - r^2)
    r^2 = coefficient of determination

    References:
    - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
    """
    if abs(r) >= 1:
        raise ValueError("Correlation coefficient must be between -1 and 1 (exclusive)")

    # Cohen's d from r
    cohens_d = (2 * r) / np.sqrt(1 - r**2)

    # R-squared (coefficient of determination)
    r_squared = r**2

    # Fisher's z transformation (useful for meta-analysis)
    fishers_z = 0.5 * np.log((1 + r) / (1 - r))

    # Standard error of Fisher's z (if n provided)
    se_z = 1 / np.sqrt(n - 3) if n and n > 3 else None

    return {
        'r': _safe_float(r),
        'cohensD': _safe_float(cohens_d),
        'rSquared': _safe_float(r_squared),
        'fishersZ': _safe_float(fishers_z),
        'seZ': _safe_float(se_z) if se_z is not None else None,
        'rInterpretation': _interpret_r(r),
        'dInterpretation': _interpret_cohens_d(cohens_d),
        'inputType': 'correlation',
        'formula': 'd = 2r / sqrt(1 - r^2)'
    }


def effect_size_from_d(
    d: float,
    n1: Optional[int] = None,
    n2: Optional[int] = None
) -> Dict[str, Union[float, str, None]]:
    """
    Convert Cohen's d to other effect sizes.

    r = d / sqrt(d^2 + 4)  (approximate, assumes equal n)
    r = d / sqrt(d^2 + (n1+n2)^2/(n1*n2))  (exact)
    eta^2 ≈ d^2 / (d^2 + 4)  (for equal groups)

    References:
    - Borenstein, M. et al. (2009). Introduction to Meta-Analysis.
    """
    # Convert to r
    if n1 and n2:
        # Exact formula
        a = (n1 + n2)**2 / (n1 * n2)
        r = d / np.sqrt(d**2 + a)
    else:
        # Approximate formula (assumes equal n)
        r = d / np.sqrt(d**2 + 4)

    # Eta-squared (approximate)
    eta_squared = d**2 / (d**2 + 4)

    # Hedges' g correction (if sample sizes provided)
    if n1 and n2:
        df = n1 + n2 - 2
        j = 1 - (3 / (4 * df - 1))  # Correction factor
        hedges_g = d * j
    else:
        hedges_g = None

    # Odds ratio (approximate): OR = exp(d * pi / sqrt(3))
    odds_ratio = np.exp(d * np.pi / np.sqrt(3))

    return {
        'cohensD': _safe_float(d),
        'r': _safe_float(r),
        'etaSquared': _safe_float(eta_squared),
        'hedgesG': _safe_float(hedges_g) if hedges_g else None,
        'oddsRatio': _safe_float(odds_ratio),
        'dInterpretation': _interpret_cohens_d(d),
        'rInterpretation': _interpret_r(r),
        'inputType': "Cohen's d",
        'formula': 'r = d / √(d² + 4)'
    }


def effect_size_from_odds_ratio(
    oddsRatio: float,
    ciLower: Optional[float] = None,
    ciUpper: Optional[float] = None
) -> Dict[str, Union[float, str, None]]:
    """
    Convert odds ratio to other effect sizes.

    log(OR) = d * pi / sqrt(3)
    d = log(OR) * sqrt(3) / pi

    References:
    - Chinn, S. (2000). A simple method for converting odds ratio to effect size.
    - Borenstein, M. et al. (2009). Introduction to Meta-Analysis.
    """
    if oddsRatio <= 0:
        raise ValueError("Odds ratio must be positive")

    # Cohen's d from OR
    # d = ln(OR) * sqrt(3) / pi
    log_or = np.log(oddsRatio)
    cohens_d = log_or * np.sqrt(3) / np.pi

    # Convert d to r
    r = cohens_d / np.sqrt(cohens_d**2 + 4)

    # Risk ratio approximation (only valid under certain conditions)
    # RR ≈ OR when outcome is rare

    # CI for Cohen's d (if OR CI provided)
    d_ci_lower = None
    d_ci_upper = None
    if ciLower and ciLower > 0:
        d_ci_lower = np.log(ciLower) * np.sqrt(3) / np.pi
    if ciUpper and ciUpper > 0:
        d_ci_upper = np.log(ciUpper) * np.sqrt(3) / np.pi

    return {
        'oddsRatio': _safe_float(oddsRatio),
        'logOddsRatio': _safe_float(log_or),
        'cohensD': _safe_float(cohens_d),
        'r': _safe_float(r),
        'dCiLower': _safe_float(d_ci_lower) if d_ci_lower else None,
        'dCiUpper': _safe_float(d_ci_upper) if d_ci_upper else None,
        'orInterpretation': _interpret_odds_ratio(oddsRatio),
        'dInterpretation': _interpret_cohens_d(cohens_d),
        'inputType': 'odds ratio',
        'formula': 'd = ln(OR) × √3 / π'
    }


def effect_size_from_means(
    mean1: float,
    std1: float,
    n1: int,
    mean2: float,
    std2: float,
    n2: int,
    pooled: bool = True
) -> Dict[str, Union[float, str, None]]:
    """
    Calculate Cohen's d from group means and standard deviations.

    Pooled SD: s_p = sqrt(((n1-1)*s1^2 + (n2-1)*s2^2) / (n1+n2-2))
    Cohen's d = (M1 - M2) / s_p

    References:
    - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
    """
    mean_diff = mean1 - mean2

    if pooled:
        # Pooled standard deviation
        pooled_var = ((n1 - 1) * std1**2 + (n2 - 1) * std2**2) / (n1 + n2 - 2)
        pooled_std = np.sqrt(pooled_var)
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0
    else:
        # Use control group SD (Glass's delta)
        cohens_d = mean_diff / std2 if std2 > 0 else 0

    # Hedges' g (bias-corrected d)
    df = n1 + n2 - 2
    j = 1 - (3 / (4 * df - 1))
    hedges_g = cohens_d * j

    # Standard error of d
    se_d = np.sqrt((n1 + n2) / (n1 * n2) + cohens_d**2 / (2 * (n1 + n2)))

    # 95% CI for d
    z_crit = 1.96
    d_ci_lower = cohens_d - z_crit * se_d
    d_ci_upper = cohens_d + z_crit * se_d

    # Convert to r
    a = (n1 + n2)**2 / (n1 * n2)
    r = cohens_d / np.sqrt(cohens_d**2 + a)

    return {
        'cohensD': _safe_float(cohens_d),
        'hedgesG': _safe_float(hedges_g),
        'seD': _safe_float(se_d),
        'dCiLower': _safe_float(d_ci_lower),
        'dCiUpper': _safe_float(d_ci_upper),
        'r': _safe_float(r),
        'meanDiff': _safe_float(mean_diff),
        'pooledStd': _safe_float(pooled_std) if pooled else None,
        'dInterpretation': _interpret_cohens_d(cohens_d),
        'inputType': 'means and SDs',
        'formula': 'd = (M₁ - M₂) / s_pooled'
    }


def convert_effect_sizes(
    inputType: str,
    value: float,
    **kwargs
) -> Dict[str, Union[float, str, None, Dict]]:
    """
    Universal effect size converter.

    Parameters:
    - inputType: 't', 'f', 'chi-square', 'r', 'd', 'odds-ratio', 'means'
    - value: The primary value to convert
    - **kwargs: Additional parameters depending on inputType

    Returns all equivalent effect sizes with interpretations.
    """
    result: Dict[str, Union[float, str, None, Dict]] = {}

    if inputType == 't':
        df = kwargs.get('df')
        n1 = kwargs.get('n1')
        n2 = kwargs.get('n2')
        if df is None:
            raise ValueError("df is required for t-statistic conversion")
        result = effect_size_from_t(value, df, n1, n2)

    elif inputType == 'f':
        dfBetween = kwargs.get('dfBetween')
        dfWithin = kwargs.get('dfWithin')
        if dfBetween is None or dfWithin is None:
            raise ValueError("dfBetween and dfWithin are required for F-statistic conversion")
        result = effect_size_from_f(value, dfBetween, dfWithin)

    elif inputType == 'chi-square':
        n = kwargs.get('n')
        df = kwargs.get('df')
        if n is None or df is None:
            raise ValueError("n and df are required for chi-square conversion")
        result = effect_size_from_chi_square(value, n, df)

    elif inputType == 'r':
        n = kwargs.get('n')
        result = effect_size_from_r(value, n)

    elif inputType == 'd':
        n1 = kwargs.get('n1')
        n2 = kwargs.get('n2')
        result = effect_size_from_d(value, n1, n2)

    elif inputType == 'odds-ratio':
        ciLower = kwargs.get('ciLower')
        ciUpper = kwargs.get('ciUpper')
        result = effect_size_from_odds_ratio(value, ciLower, ciUpper)

    elif inputType == 'means':
        mean1 = value
        std1 = kwargs.get('std1')
        n1 = kwargs.get('n1')
        mean2 = kwargs.get('mean2')
        std2 = kwargs.get('std2')
        n2 = kwargs.get('n2')
        pooled = kwargs.get('pooled', True)
        if any(v is None for v in [std1, n1, mean2, std2, n2]):
            raise ValueError("std1, n1, mean2, std2, n2 are required for means conversion")
        result = effect_size_from_means(mean1, std1, n1, mean2, std2, n2, pooled)

    else:
        raise ValueError(f"Unknown inputType: {inputType}. Valid types: t, f, chi-square, r, d, odds-ratio, means")

    # Add interpretation guide
    result['interpretationGuide'] = {
        'cohensD': {'small': 0.2, 'medium': 0.5, 'large': 0.8},
        'r': {'small': 0.1, 'medium': 0.3, 'large': 0.5},
        'etaSquared': {'small': 0.01, 'medium': 0.06, 'large': 0.14},
        'oddsRatio': {'small': 1.5, 'medium': 2.5, 'large': 4.3}
    }

    return result
