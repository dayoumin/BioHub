# Worker 3: Nonparametric ANOVA + Machine Learning Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels, pandas, scikit-learn
# - Estimated memory: ~180MB
# - Cold start time: ~2.8s

import sys
from typing import List, Dict, Union, Literal, Optional, Any
import numpy as np
from scipy import stats
from itertools import combinations
from helpers import clean_array, clean_paired_arrays, clean_groups as clean_groups_helper
from sklearn.cluster import KMeans, DBSCAN
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.decomposition import PCA, FactorAnalysis
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score


def _safe_bool(value: Union[bool, np.bool_]) -> bool:
    """
    Ensure NumPy boolean types are converted to native bool for JSON serialization.
    """
    try:
        return bool(value.item())  # type: ignore[attr-defined]
    except AttributeError:
        return bool(value)


def _to_float_list(data):
    if data is None:
        return []
    try:
        array = np.atleast_1d(np.array(data, dtype=float))
        return array.tolist()
    except Exception:
        if isinstance(data, (list, tuple)):
            result = []
            for value in data:
                try:
                    result.append(float(value))
                except Exception:
                    continue
            return result
        try:
            return [float(data)]
        except Exception:
            return []


def mann_whitney_test(group1, group2):
    group1 = clean_array(group1)
    group2 = clean_array(group2)
    
    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")
    
    statistic, p_value = stats.mannwhitneyu(group1, group2, alternative='two-sided')
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


def wilcoxon_test(values1, values2):
    values1, values2 = clean_paired_arrays(values1, values2)

    if len(values1) < 2:
        raise ValueError("Wilcoxon test requires at least 2 valid pairs")

    # Convert to numpy arrays
    arr1 = np.array(values1)
    arr2 = np.array(values2)
    diffs = arr1 - arr2

    # Wilcoxon signed-rank test
    statistic, p_value = stats.wilcoxon(arr1, arr2)

    # Count positive, negative, and tied differences
    positive = int(np.sum(diffs > 0))
    negative = int(np.sum(diffs < 0))
    ties = int(np.sum(diffs == 0))

    # Calculate descriptive statistics
    def calc_descriptives(data):
        return {
            'median': float(np.median(data)),
            'mean': float(np.mean(data)),
            'iqr': float(np.percentile(data, 75) - np.percentile(data, 25)),
            'min': float(np.min(data)),
            'max': float(np.max(data)),
            'q1': float(np.percentile(data, 25)),
            'q3': float(np.percentile(data, 75))
        }

    # Calculate effect size (rank-biserial correlation)
    n = len(values1)
    effect_size = 1 - (2 * statistic) / (n * (n + 1))

    # Effect size interpretation
    abs_r = abs(effect_size)
    if abs_r < 0.3:
        interpretation = "작은 효과크기"
    elif abs_r < 0.5:
        interpretation = "중간 효과크기"
    else:
        interpretation = "큰 효과크기"

    # Z-score approximation for large samples
    z_score = 0.0
    if n > 10:
        mu = n * (n + 1) / 4
        sigma = np.sqrt(n * (n + 1) * (2 * n + 1) / 24)
        z_score = float((statistic - mu) / sigma)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'nobs': int(n),
        'zScore': z_score,
        'medianDiff': float(np.median(diffs)),
        'effectSize': {
            'value': float(effect_size),
            'interpretation': interpretation
        },
        'descriptives': {
            'before': calc_descriptives(arr1),
            'after': calc_descriptives(arr2),
            'differences': {
                **calc_descriptives(diffs),
                'positive': positive,
                'negative': negative,
                'ties': ties
            }
        }
    }


def kruskal_wallis_test(groups):
    # 입력 검증: 빈 그룹이 있는지 확인 (정제 전)
    group_sizes = [len(g) for g in groups]
    if any(size == 0 for size in group_sizes):
        empty_groups = [i for i, size in enumerate(group_sizes) if size == 0]
        raise ValueError(
            f"Empty groups detected (before cleaning): groups {empty_groups}. "
            f"All group sizes: {group_sizes}. "
            f"Please check variable mapping and data filtering."
        )

    clean_groups = clean_groups_helper(groups)

    # 입력 검증: 정제 후 빈 그룹이 있는지 확인
    clean_sizes = [len(g) for g in clean_groups]
    if any(size == 0 for size in clean_sizes):
        empty_groups = [i for i, size in enumerate(clean_sizes) if size == 0]
        raise ValueError(
            f"Empty groups detected (after cleaning NaN/Inf): groups {empty_groups}. "
            f"Original sizes: {group_sizes}, Clean sizes: {clean_sizes}. "
            f"This means all values in those groups were NaN, Inf, or None."
        )

    statistic, p_value = stats.kruskal(*clean_groups)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'df': int(len(clean_groups) - 1)
    }


def friedman_test(groups):
    clean_groups = clean_groups_helper(groups)

    lengths = [len(g) for g in clean_groups]
    if len(set(lengths)) > 1:
        raise ValueError(f"Friedman test requires equal group sizes, got: {lengths}")

    statistic, p_value = stats.friedmanchisquare(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }



def get_t_critical(df, alpha=0.05):
    """
    Calculate t-critical value for confidence intervals

    Args:
        df: degrees of freedom
        alpha: significance level (default 0.05 for 95% CI)

    Returns:
        t-critical value (two-tailed)
    """
    from scipy.stats import t as t_dist

    if df < 1:
        raise ValueError(f"Degrees of freedom must be >= 1, got {df}")

    # Two-tailed test
    t_critical = t_dist.ppf(1 - alpha/2, df)

    return float(t_critical)


def calculate_statistical_power(f_statistic, df1, df2, alpha=0.05):
    """
    Calculate observed statistical power for ANOVA

    Args:
        f_statistic: F-statistic from ANOVA
        df1: between-groups degrees of freedom
        df2: within-groups degrees of freedom
        alpha: significance level (default 0.05)

    Returns:
        observed power (0-1)
    """
    from scipy.stats import f as f_dist, ncf

    if f_statistic < 0:
        raise ValueError(f"F-statistic must be >= 0, got {f_statistic}")

    # Critical F value
    f_critical = f_dist.ppf(1 - alpha, df1, df2)

    # Non-centrality parameter
    ncp = f_statistic * df1

    # Calculate power using non-central F distribution
    power = 1 - ncf.cdf(f_critical, df1, df2, ncp)

    return float(max(0.0, min(1.0, power)))  # Clamp to [0, 1]


def test_assumptions(groups):
    """
    Test ANOVA assumptions: normality (Shapiro-Wilk) and homogeneity (Levene)

    Args:
        groups: list of arrays for each group

    Returns:
        dict with normality and homogeneity test results
    """
    clean_groups = clean_groups_helper(groups)

    # Shapiro-Wilk test for normality (test each group)
    normality_results = []
    all_passed_normality = True

    for i, group in enumerate(clean_groups):
        if len(group) >= 3:  # Shapiro-Wilk requires at least 3 samples
            stat, p = stats.shapiro(group)
            passed = p > 0.05
            normality_results.append({
                'group': i,
                'statistic': float(stat),
                'pValue': float(p),
                'passed': _safe_bool(passed)
            })
            if not passed:
                all_passed_normality = False
        else:
            normality_results.append({
                'group': i,
                'statistic': None,
                'pValue': None,
                'passed': None,
                'warning': f'Sample size too small ({len(group)})'
            })

    # Levene's test for homogeneity of variances
    levene_stat, levene_p = stats.levene(*clean_groups, center='median')
    levene_passed = levene_p > 0.05

    return {
        'normality': {
            'shapiroWilk': normality_results,
            'passed': _safe_bool(all_passed_normality),
            'interpretation': '정규성 가정 만족' if all_passed_normality else '정규성 가정 위반 (비모수 검정 고려)'
        },
        'homogeneity': {
            'levene': {
                'statistic': float(levene_stat),
                'pValue': float(levene_p)
            },
            'passed': _safe_bool(levene_passed),
            'interpretation': '등분산성 가정 만족' if levene_passed else '등분산성 가정 위반 (Welch ANOVA 고려)'
        }
    }


def one_way_anova(groups):
    clean_groups = clean_groups_helper(groups)

    for i, group in enumerate(clean_groups):
        if len(group) < 2:
            raise ValueError(f"Group {i} must have at least 2 observations")

    f_statistic, p_value = stats.f_oneway(*clean_groups)

    # 효과크기 (eta-squared) 계산
    # eta² = SS_between / SS_total
    all_data = np.concatenate(clean_groups)
    grand_mean = np.mean(all_data)

    # SS_between: 그룹 간 제곱합
    ss_between = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in clean_groups)

    # SS_total: 전체 제곱합
    ss_total = np.sum((all_data - grand_mean) ** 2)

    # eta-squared
    eta_squared = ss_between / ss_total if ss_total > 0 else 0.0

    # omega-squared (덜 편향된 효과크기)
    # ω² = (SS_between - df_between * MS_within) / (SS_total + MS_within)
    df_between = len(clean_groups) - 1
    df_within = len(all_data) - len(clean_groups)
    ss_within = ss_total - ss_between
    ms_within = ss_within / df_within if df_within > 0 else 0

    omega_squared = (ss_between - df_between * ms_within) / (ss_total + ms_within) if (ss_total + ms_within) > 0 else 0.0

    return {
        'fStatistic': float(f_statistic),
        'pValue': float(p_value),
        'dfBetween': int(df_between),
        'dfWithin': int(df_within),
        'etaSquared': float(eta_squared),
        'omegaSquared': float(omega_squared),
        'ssBetween': float(ss_between),
        'ssWithin': float(ss_within),
        'ssTotal': float(ss_total)
    }


def two_way_anova(dataValues, factor1Values, factor2Values):
    import statsmodels.api as sm
    from statsmodels.formula.api import ols
    import pandas as pd

    if len(dataValues) != len(factor1Values) or len(dataValues) != len(factor2Values):
        raise ValueError(
            f"All inputs must have same length: data({len(dataValues)}), "
            f"factor1({len(factor1Values)}), factor2({len(factor2Values)})"
        )

    n_samples = len(dataValues)
    if n_samples < 4:
        raise ValueError(f"Two-way ANOVA requires at least 4 observations, got {n_samples}")

    df = pd.DataFrame({
        'value': dataValues,
        'factor1': factor1Values,
        'factor2': factor2Values
    })

    formula = 'value ~ C(factor1) + C(factor2) + C(factor1):C(factor2)'
    model = ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    result = {
        'factor1': {
            'fStatistic': float(anova_table.loc['C(factor1)', 'F']),
            'pValue': float(anova_table.loc['C(factor1)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1)', 'df'])
        },
        'factor2': {
            'fStatistic': float(anova_table.loc['C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor2)', 'df'])
        },
        'interaction': {
            'fStatistic': float(anova_table.loc['C(factor1):C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor1):C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1):C(factor2)', 'df'])
        },
        'residual': {
            'df': float(anova_table.loc['Residual', 'df'])
        },
        'anovaTable': anova_table.to_dict()
    }

    return result


def tukey_hsd(groups):
    from scipy.stats import tukey_hsd as scipy_tukey

    clean_groups = clean_groups_helper(groups)

    for idx, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {idx} has no valid observations")

    try:
        result = scipy_tukey(*clean_groups)

        statistic_values = _to_float_list(getattr(result, 'statistic', None))
        p_values = _to_float_list(getattr(result, 'pvalue', None))

        ci_lower = []
        ci_upper = []
        confidence_level = None
        if hasattr(result, 'confidence_interval'):
            try:
                ci_result = result.confidence_interval()
            except Exception:
                ci_result = None
            if ci_result is not None:
                ci_lower = _to_float_list(getattr(ci_result, 'low', None))
                ci_upper = _to_float_list(getattr(ci_result, 'high', None))
                conf_attr = getattr(ci_result, 'confidence_level', None)
                if conf_attr is None:
                    conf_attr = getattr(ci_result, 'confidencelevel', None)
                if conf_attr is not None:
                    try:
                        confidence_level = float(conf_attr)
                    except (TypeError, ValueError):
                        confidence_level = None

        alpha_threshold = 0.05
        if confidence_level is not None:
            try:
                alpha_threshold = max(0.0, min(1.0, 1 - confidence_level))
            except TypeError:
                alpha_threshold = 0.05

        comparisons = []
        pairs = list(combinations(range(len(clean_groups)), 2))
        for idx, (group_i, group_j) in enumerate(pairs):
            mean_diff = float(np.mean(clean_groups[group_i]) - np.mean(clean_groups[group_j]))
            comparison = {
                'group1': int(group_i),
                'group2': int(group_j),
                'meanDiff': mean_diff
            }

            if idx < len(statistic_values):
                stat_val = statistic_values[idx]
                if isinstance(stat_val, (list, tuple)):
                    stat_val = stat_val[0] if len(stat_val) > 0 else 0.0
                comparison['statistic'] = float(stat_val)

            if idx < len(p_values):
                p_val = p_values[idx]
                if isinstance(p_val, (list, tuple)):
                    p_val = p_val[0] if len(p_val) > 0 else 1.0
                p_val = float(p_val)
                comparison['pValue'] = p_val
                comparison['pAdjusted'] = p_val
                comparison['significant'] = p_val < alpha_threshold
            else:
                comparison['pValue'] = None
                comparison['significant'] = False

            if idx < len(ci_lower) and idx < len(ci_upper):
                lower_val = ci_lower[idx]
                upper_val = ci_upper[idx]
                if isinstance(lower_val, (list, tuple)):
                    lower_val = lower_val[0] if len(lower_val) > 0 else 0.0
                if isinstance(upper_val, (list, tuple)):
                    upper_val = upper_val[0] if len(upper_val) > 0 else 0.0
                lower_val = float(lower_val)
                upper_val = float(upper_val)
                # Section 18: 필드명 규칙 - camelCase 사용
                comparison['ciLower'] = lower_val
                comparison['ciUpper'] = upper_val

            comparisons.append(comparison)

        aggregated_statistic = None
        if statistic_values:
            aggregated_statistic = statistic_values if len(statistic_values) > 1 else float(statistic_values[0])

        aggregated_pvalue = None
        if p_values:
            aggregated_pvalue = p_values if len(p_values) > 1 else float(p_values[0])

        confidence_interval = None
        if ci_lower and ci_upper:
            confidence_interval = {
                'lower': ci_lower,
                'upper': ci_upper,
                'confidenceLevel': confidence_level
            }

        return {
            'comparisons': comparisons,
            'statistic': aggregated_statistic,
            'pValue': aggregated_pvalue,
            'confidenceInterval': confidence_interval
        }
    except AttributeError as e:
        raise ValueError(f"SciPy version may not support tukey_hsd: {e}")

# Priority 1 Methods (5 additional)

def sign_test(before, after):
    from scipy.stats import binomtest

    before = np.array(before)
    after = np.array(after)

    if len(before) != len(after):
        raise ValueError("Before and after must have same length")

    n_samples = len(before)
    if n_samples < 5:
        raise ValueError(f"Sign test requires at least 5 observations for reliable results, got {n_samples}")

    diff = after - before

    n_positive = np.sum(diff > 0)
    n_negative = np.sum(diff < 0)
    n_ties = np.sum(diff == 0)
    n_total = n_positive + n_negative

    if n_total == 0:
        raise ValueError("All differences are zero (ties)")

    result = binomtest(n_positive, n_total, 0.5)

    return {
        'statistic': int(n_positive),
        'nPositive': int(n_positive),
        'nNegative': int(n_negative),
        'nTies': int(n_ties),
        'pValue': float(result.pvalue)
    }


def runs_test(sequence):
    from statsmodels.sandbox.stats.runs import runstest_1samp

    sequence = clean_array(sequence)

    if len(sequence) < 10:
        raise ValueError("Runs test requires at least 10 observations")

    z_statistic, p_value = runstest_1samp(sequence, cutoff='median', correction=True)

    median = np.median(sequence)
    binary = (sequence > median).astype(int)
    runs = 1 + np.sum(binary[1:] != binary[:-1])
    n1 = np.sum(binary == 0)
    n2 = np.sum(binary == 1)
    n = n1 + n2
    expected_runs = (2 * n1 * n2) / n + 1

    return {
        'nRuns': int(runs),
        'expectedRuns': float(expected_runs),
        'n1': int(n1),
        'n2': int(n2),
        'zStatistic': float(z_statistic),
        'pValue': float(p_value)
    }


def mcnemar_test(contingencyTable):
    from statsmodels.stats.contingency_tables import mcnemar

    table = np.array(contingencyTable)

    if table.shape != (2, 2):
        raise ValueError("McNemar test requires 2x2 contingency table")

    b = table[0, 1]
    c = table[1, 0]

    # Use statsmodels for McNemar test
    # Automatic correction for small samples (b + c < 25)
    use_correction = (b + c) < 25
    result = mcnemar(table, exact=False, correction=use_correction)

    return {
        'statistic': float(result.statistic),
        'pValue': float(result.pvalue),
        'continuityCorrection': _safe_bool(use_correction),
        'discordantPairs': {'b': int(b), 'c': int(c)}
    }


def cochran_q_test(dataMatrix):
    from statsmodels.stats.contingency_tables import cochrans_q

    data_arr = np.array(dataMatrix)

    if data_arr.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_arr.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n, k = data_arr.shape  # n subjects, k conditions

    if n < 2:
        raise ValueError(f"Cochran Q requires at least 2 subjects, got {n}")

    if k < 3:
        raise ValueError(f"Cochran Q requires at least 3 conditions, got {k}")

    # Use statsmodels for Cochran Q test
    result = cochrans_q(data_arr)

    return {
        'qStatistic': float(result.statistic),
        'pValue': float(result.pvalue),
        'df': int(k - 1)
    }


def mood_median_test(groups):
    if len(groups) < 2:
        raise ValueError("Mood median test requires at least 2 groups")

    statistic, p_value, grand_median, contingency_table = stats.median_test(*groups)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'grandMedian': float(grand_median),
        'contingencyTable': contingency_table.tolist()
    }


# Priority 2 Methods - ANOVA (4 methods)

def repeated_measures_anova(dataMatrix, subjectIds, timeLabels):
    from statsmodels.stats.anova import AnovaRM
    import pandas as pd

    data_array = np.array(dataMatrix)

    if data_array.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_array.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n_subjects, n_timepoints = data_array.shape

    if n_subjects < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 subjects, got {n_subjects}")

    if n_timepoints < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 timepoints, got {n_timepoints}")

    if len(subjectIds) != n_subjects:
        raise ValueError(f"Subject IDs length {len(subjectIds)} must match number of subjects {n_subjects}")

    if len(timeLabels) != n_timepoints:
        raise ValueError(f"Time labels length {len(timeLabels)} must match number of timepoints {n_timepoints}")

    data_long = []
    for i, subject_id in enumerate(subjectIds):
        for j, time_label in enumerate(timeLabels):
            data_long.append({
                'subject': subject_id,
                'time': time_label,
                'value': dataMatrix[i][j]
            })

    df = pd.DataFrame(data_long)

    # Repeated Measures ANOVA
    aovrm = AnovaRM(df, 'value', 'subject', within=['time'])
    res = aovrm.fit()

    # Calculate Mauchly's test for sphericity
    sphericity_result = {
        'mauchlysW': None,
        'chiSquare': None,
        'pValue': None,
        'epsilonGG': None,
        'epsilonHF': None,
        'epsilonLB': None,
        'assumptionMet': True
    }

    if n_timepoints >= 3:
        try:
            # Standard Mauchly's test using orthonormal contrast matrix
            k = n_timepoints
            p = k - 1  # degrees of freedom for within-subject factor

            # Calculate sample covariance matrix of the repeated measures
            S = np.cov(data_array.T)  # k x k covariance matrix

            # Create orthonormal contrast matrix (Helmert-like)
            # This transforms the covariance matrix to test sphericity
            C = np.zeros((p, k))
            for i in range(p):
                # Contrast coefficients
                C[i, :i+1] = 1.0 / (i + 1)
                C[i, i+1] = -1.0
                # Normalize
                C[i, :] = C[i, :] / np.linalg.norm(C[i, :])

            # Transformed covariance matrix
            S_transformed = C @ S @ C.T

            # Mauchly's W = |S_transformed| / (trace(S_transformed)/p)^p
            det_S = np.linalg.det(S_transformed)
            trace_S = np.trace(S_transformed)

            if trace_S > 0 and det_S > 0:
                mauchly_w = det_S / ((trace_S / p) ** p)
            else:
                mauchly_w = 0

            # Chi-square approximation for Mauchly's W
            df_chi = int(p * (p + 1) / 2 - 1)

            # Box's correction factor
            f = (2 * p * p + p + 2) / (6 * p * (n_subjects - 1))
            chi_square = -(n_subjects - 1) * (1 - f) * np.log(max(mauchly_w, 1e-10))

            # p-value from chi-square distribution
            p_value_sphericity = 1 - stats.chi2.cdf(chi_square, df_chi)

            # Greenhouse-Geisser epsilon
            trace_sq = trace_S ** 2
            trace_of_sq = np.trace(S_transformed @ S_transformed)
            epsilon_gg = trace_sq / (p * trace_of_sq) if trace_of_sq > 0 else 1.0
            epsilon_gg = max(1.0 / p, min(epsilon_gg, 1.0))  # Bound between 1/p and 1

            # Huynh-Feldt epsilon
            numerator = n_subjects * (p) * epsilon_gg - 2
            denominator = p * (n_subjects - 1 - p * epsilon_gg)
            if denominator > 0:
                epsilon_hf = numerator / denominator
            else:
                epsilon_hf = 1.0
            epsilon_hf = max(epsilon_gg, min(epsilon_hf, 1.0))  # HF >= GG, <= 1

            # Lower-bound epsilon
            epsilon_lb = 1.0 / p

            sphericity_result = {
                'mauchlysW': float(mauchly_w),
                'chiSquare': float(chi_square),
                'pValue': float(p_value_sphericity),
                'epsilonGG': float(epsilon_gg),
                'epsilonHF': float(epsilon_hf),
                'epsilonLB': float(epsilon_lb),
                'assumptionMet': bool(p_value_sphericity > 0.05)
            }
        except Exception:
            pass

    return {
        'fStatistic': float(res.anova_table['F Value'][0]),
        'pValue': float(res.anova_table['Pr > F'][0]),
        'df': {
            'numerator': float(res.anova_table['Num DF'][0]),
            'denominator': float(res.anova_table['Den DF'][0])
        },
        'sphericityEpsilon': sphericity_result.get('epsilonGG', 1.0),
        'sphericity': sphericity_result,
        'anovaTable': res.anova_table.to_dict()
    }


def ancova(yValues, groupValues, covariates):
    import statsmodels.formula.api as smf
    import statsmodels.api as sm
    import pandas as pd

    if not covariates or len(covariates) == 0:
        raise ValueError("ANCOVA requires at least 1 covariate")

    if len(yValues) != len(groupValues):
        raise ValueError(f"yValues ({len(yValues)}) and groupValues ({len(groupValues)}) must have same length")

    for i, cov in enumerate(covariates):
        if len(cov) != len(yValues):
            raise ValueError(f"Covariate {i} length ({len(cov)}) must match yValues length ({len(yValues)})")

    n_samples = len(yValues)
    if n_samples < 3:
        raise ValueError(f"ANCOVA requires at least 3 observations, got {n_samples}")

    data = {
        'y': yValues,
        'group': groupValues
    }

    for i, cov in enumerate(covariates):
        data[f'cov{i}'] = cov

    df = pd.DataFrame(data)

    cov_formula = ' + '.join([f'cov{i}' for i in range(len(covariates))])
    formula = f'y ~ C(group) + {cov_formula}'

    model = smf.ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    group_means = df.groupby('group')['y'].mean()

    return {
        'fStatisticGroup': float(anova_table.loc['C(group)', 'F']),
        'pValueGroup': float(anova_table.loc['C(group)', 'PR(>F)']),
        'fStatisticCovariate': [float(anova_table.loc[f'cov{i}', 'F']) for i in range(len(covariates))],
        'pValueCovariate': [float(anova_table.loc[f'cov{i}', 'PR(>F)']) for i in range(len(covariates))],
        'adjustedMeans': [{'group': g, 'mean': float(m)} for g, m in group_means.items()],
        'anovaTable': anova_table.to_dict()
    }


def manova(dataMatrix, groupValues, varNames):
    from statsmodels.multivariate.manova import MANOVA
    import pandas as pd

    if not dataMatrix or len(dataMatrix) == 0:
        raise ValueError("Empty data matrix")

    n_obs = len(dataMatrix)
    n_vars = len(dataMatrix[0]) if n_obs > 0 else 0

    if n_vars < 2:
        raise ValueError(f"MANOVA requires at least 2 variables, got {n_vars}")

    if len(groupValues) != n_obs:
        raise ValueError(f"groupValues length ({len(groupValues)}) must match data_matrix rows ({n_obs})")

    if len(varNames) != n_vars:
        raise ValueError(f"var_names length ({len(varNames)}) must match data_matrix columns ({n_vars})")

    for i, row in enumerate(dataMatrix):
        if len(row) != n_vars:
            raise ValueError(f"Row {i} has {len(row)} values, expected {n_vars}")

    df_dict = {'group': groupValues}
    for i, var_name in enumerate(varNames):
        df_dict[var_name] = [row[i] for row in dataMatrix]

    df = pd.DataFrame(df_dict)

    # MANOVA
    formula = ' + '.join(varNames) + ' ~ group'
    maov = MANOVA.from_formula(formula, data=df)
    result = maov.mv_test()

    test_results = result.results['group']['stat']

    return {
        'wilksLambda': float(test_results.loc["Wilks' lambda", 'Value']),
        'pillaiTrace': float(test_results.loc["Pillai's trace", 'Value']),
        'hotellingLawley': float(test_results.loc["Hotelling-Lawley trace", 'Value']),
        'royMaxRoot': float(test_results.loc["Roy's greatest root", 'Value']),
        'fStatistic': float(test_results.loc["Wilks' lambda", 'F Value']),
        'pValue': float(test_results.loc["Wilks' lambda", 'Pr > F']),
        'df': {
            'hypothesis': float(test_results.loc["Wilks' lambda", 'Num DF']),
            'error': float(test_results.loc["Wilks' lambda", 'Den DF'])
        }
    }


def scheffe_test(groups):
    try:
        import scikit_posthocs as sp
        import pandas as pd
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Scheffe test. Install with: pip install scikit-posthocs")

    if len(groups) < 3:
        raise ValueError(f"Scheffe test requires at least 3 groups, got {len(groups)}")

    clean_groups = clean_groups_helper(groups)

    for i, group in enumerate(clean_groups):
        if len(group) < 2:
            raise ValueError(f"Group {i} must have at least 2 observations, got {len(group)}")

    # Prepare data for scikit-posthocs
    data_list = []
    group_labels = []
    for i, group in enumerate(clean_groups):
        data_list.extend(group)
        group_labels.extend([i] * len(group))

    df = pd.DataFrame({
        'data': data_list,
        'group': group_labels
    })

    # Use scikit-posthocs for Scheffe test
    scheffe_result = sp.posthoc_scheffe(df, val_col='data', group_col='group')

    # Calculate MSE and df for additional info
    k = len(clean_groups)
    n_total = sum(len(g) for g in clean_groups)
    ss_within = sum(np.sum((g - np.mean(g))**2) for g in clean_groups)
    df_within = n_total - k
    mse = ss_within / df_within

    # Extract pairwise comparisons
    comparisons = []
    for i in range(k):
        for j in range(i + 1, k):
            p_value = scheffe_result.iloc[i, j]
            mean_diff = float(np.mean(clean_groups[i]) - np.mean(clean_groups[j]))

            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'meanDiff': mean_diff,
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'comparisons': comparisons,
        'mse': float(mse),
        'dfWithin': int(df_within)
    }


def dunn_test(groups, pAdjust='holm'):
    try:
        import scikit_posthocs as sp
        import pandas as pd
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Dunn test. Install with: pip install scikit-posthocs")

    if len(groups) < 2:
        raise ValueError(f"Dunn test requires at least 2 groups, got {len(groups)}")

    clean_groups = clean_groups_helper(groups)

    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")

    data_list = []
    group_labels = []
    for i, group in enumerate(clean_groups):
        data_list.extend(group)
        group_labels.extend([i] * len(group))

    df = pd.DataFrame({
        'data': data_list,
        'group': group_labels
    })

    dunn_result = sp.posthoc_dunn(df, val_col='data', group_col='group', p_adjust=pAdjust)

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = dunn_result.iloc[i, j]
            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'comparisons': comparisons,
        'pAdjustMethod': pAdjust,
        'nComparisons': len(comparisons)
    }


def games_howell_test(groups):
    """
    Games-Howell post-hoc test for unequal variances.
    Returns meanDiff, pValue, ciLower, ciUpper, significant for each comparison.
    """
    try:
        import scikit_posthocs as sp
        import pandas as pd
        from scipy.stats import t as t_dist
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Games-Howell test")

    if len(groups) < 2:
        raise ValueError(f"Games-Howell test requires at least 2 groups, got {len(groups)}")

    clean_groups = clean_groups_helper(groups)

    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")

    data_list = []
    group_labels = []
    for i, group in enumerate(clean_groups):
        data_list.extend(group)
        group_labels.extend([i] * len(group))

    df = pd.DataFrame({
        'data': data_list,
        'group': group_labels
    })

    # Get p-values from scikit-posthocs
    gh_result = sp.posthoc_gameshowell(df, val_col='data', group_col='group')

    # Calculate group statistics for meanDiff and CI
    group_stats = []
    for i, group in enumerate(clean_groups):
        arr = np.array(group)
        group_stats.append({
            'n': len(arr),
            'mean': float(np.mean(arr)),
            'var': float(np.var(arr, ddof=1))
        })

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = float(gh_result.iloc[i, j])

            # Calculate mean difference
            mean_diff = group_stats[i]['mean'] - group_stats[j]['mean']

            # Calculate SE for Games-Howell (using separate variances)
            n_i, n_j = group_stats[i]['n'], group_stats[j]['n']
            var_i, var_j = group_stats[i]['var'], group_stats[j]['var']
            se = np.sqrt(var_i / n_i + var_j / n_j)

            # Welch-Satterthwaite degrees of freedom
            numerator = (var_i / n_i + var_j / n_j) ** 2
            denominator = (var_i / n_i) ** 2 / (n_i - 1) + (var_j / n_j) ** 2 / (n_j - 1)
            df_welch = numerator / denominator if denominator > 0 else 1

            # 95% CI using t-distribution
            t_crit = t_dist.ppf(0.975, df_welch)
            ci_lower = mean_diff - t_crit * se
            ci_upper = mean_diff + t_crit * se

            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'meanDiff': float(mean_diff),
                'pValue': p_value,
                'pAdjusted': p_value,
                'significant': p_value < 0.05,
                'ciLower': float(ci_lower),
                'ciUpper': float(ci_upper),
                'se': float(se),
                'df': float(df_welch)
            })

    return {
        'comparisons': comparisons,
        'nComparisons': len(comparisons),
        'method': 'Games-Howell'
    }


def three_way_anova(dataValues, factor1Values, factor2Values, factor3Values):
    """
    Three-Way ANOVA using statsmodels

    Parameters:
    - data_values: dependent variable values
    - factor1_values: first factor levels
    - factor2_values: second factor levels
    - factor3_values: third factor levels

    Returns:
    - Dictionary with main effects and interaction effects
    """
    import statsmodels.api as sm
    from statsmodels.formula.api import ols
    import pandas as pd

    # Input validation
    if len(dataValues) != len(factor1Values) or \
       len(dataValues) != len(factor2Values) or \
       len(dataValues) != len(factor3Values):
        raise ValueError(
            f"All inputs must have same length: data({len(dataValues)}), "
            f"factor1({len(factor1Values)}), factor2({len(factor2Values)}), "
            f"factor3({len(factor3Values)})"
        )

    n_samples = len(dataValues)
    if n_samples < 8:
        raise ValueError(f"Three-way ANOVA requires at least 8 observations, got {n_samples}")

    # Create DataFrame
    df = pd.DataFrame({
        'value': dataValues,
        'factor1': factor1Values,
        'factor2': factor2Values,
        'factor3': factor3Values
    })

    # Build formula with all main effects and interactions
    formula = 'value ~ C(factor1) + C(factor2) + C(factor3) + ' + \
              'C(factor1):C(factor2) + C(factor1):C(factor3) + C(factor2):C(factor3) + ' + \
              'C(factor1):C(factor2):C(factor3)'

    model = ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    # Extract results
    result = {
        'factor1': {
            'fStatistic': float(anova_table.loc['C(factor1)', 'F']),
            'pValue': float(anova_table.loc['C(factor1)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1)', 'df'])
        },
        'factor2': {
            'fStatistic': float(anova_table.loc['C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor2)', 'df'])
        },
        'factor3': {
            'fStatistic': float(anova_table.loc['C(factor3)', 'F']),
            'pValue': float(anova_table.loc['C(factor3)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor3)', 'df'])
        },
        'interaction12': {
            'fStatistic': float(anova_table.loc['C(factor1):C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor1):C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1):C(factor2)', 'df'])
        },
        'interaction13': {
            'fStatistic': float(anova_table.loc['C(factor1):C(factor3)', 'F']),
            'pValue': float(anova_table.loc['C(factor1):C(factor3)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1):C(factor3)', 'df'])
        },
        'interaction23': {
            'fStatistic': float(anova_table.loc['C(factor2):C(factor3)', 'F']),
            'pValue': float(anova_table.loc['C(factor2):C(factor3)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor2):C(factor3)', 'df'])
        },
        'interaction123': {
            'fStatistic': float(anova_table.loc['C(factor1):C(factor2):C(factor3)', 'F']),
            'pValue': float(anova_table.loc['C(factor1):C(factor2):C(factor3)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1):C(factor2):C(factor3)', 'df'])
        },
        'residual': {
            'df': float(anova_table.loc['Residual', 'df'])
        },
        'anovaTable': anova_table.to_dict()
    }

    return result


def friedman_posthoc(groups, pAdjust='holm'):
    """
    Friedman 검정의 사후검정 (Nemenyi test)

    Args:
        groups: List of arrays, each representing a condition (columns from repeated measures)
        p_adjust: p-value adjustment method ('holm', 'bonferroni', 'fdr_bh')

    Returns:
        Dictionary with pairwise comparisons
    """
    try:
        import scikit_posthocs as sp
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Friedman post-hoc test")

    if len(groups) < 2:
        raise ValueError(f"Friedman post-hoc requires at least 2 conditions, got {len(groups)}")

    # Clean data - remove rows with any NaN
    clean_groups = []
    n_obs = len(groups[0])
    valid_rows = []

    for i in range(n_obs):
        row_valid = True
        for group in groups:
            val = group[i]
            if val is None or (isinstance(val, float) and np.isnan(val)):
                row_valid = False
                break
        if row_valid:
            valid_rows.append(i)

    for group in groups:
        clean_groups.append([group[i] for i in valid_rows])

    if len(valid_rows) < 2:
        raise ValueError("Need at least 2 valid observations for Friedman post-hoc test")

    # Create data matrix for Nemenyi test
    dataArr = np.array(clean_groups).T  # Transpose: rows=subjects, cols=conditions

    # Use posthoc_nemenyi_friedman for Friedman post-hoc
    nemenyi_result = sp.posthoc_nemenyi_friedman(dataArr)

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = nemenyi_result.iloc[i, j]
            comparisons.append({
                'group1': f'Condition {i + 1}',
                'group2': f'Condition {j + 1}',
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'method': 'Nemenyi test',
        'comparisons': comparisons,
        'pAdjustMethod': pAdjust,
        'nComparisons': len(comparisons)
    }


def repeated_measures_posthoc(dataMatrix, timeLabels, pAdjust='bonferroni'):
    """
    Repeated Measures ANOVA post-hoc test: Pairwise paired t-tests with correction.

    Args:
        data_matrix: n_subjects x k_timepoints 2D list/array
        time_labels: list of timepoint labels
        p_adjust: 'bonferroni' or 'holm'

    Returns:
        Dictionary with pairwise comparisons including meanDiff, t-statistic, p-values, effect size
    """
    from scipy.stats import ttest_rel
    from itertools import combinations

    data = np.array(dataMatrix, dtype=float)
    n_subjects_orig, n_timepoints = data.shape

    if n_timepoints < 2:
        raise ValueError(f"Need at least 2 timepoints for post-hoc, got {n_timepoints}")

    # Row-wise NaN/Inf cleaning (similar to friedman_posthoc)
    valid_rows = []
    for i in range(n_subjects_orig):
        row = data[i, :]
        if not np.any(np.isnan(row)) and not np.any(np.isinf(row)):
            valid_rows.append(i)

    if len(valid_rows) < 2:
        raise ValueError(f"Need at least 2 valid subjects (without NaN/Inf) for post-hoc, got {len(valid_rows)}")

    # Use only valid rows
    data = data[valid_rows, :]
    n_subjects = len(valid_rows)

    comparisons = []
    raw_p_values = []

    for i, j in combinations(range(n_timepoints), 2):
        col_i = data[:, i]
        col_j = data[:, j]

        # Paired t-test
        t_stat, p_value = ttest_rel(col_i, col_j)

        # Mean difference
        mean_diff = float(np.mean(col_i) - np.mean(col_j))

        # Cohen's d for paired samples
        diff = col_i - col_j
        std_diff = np.std(diff, ddof=1)
        cohens_d = float(np.mean(diff) / std_diff) if std_diff > 0 else 0.0

        # Standard error of the difference
        se_diff = float(std_diff / np.sqrt(n_subjects))

        # 95% CI for mean difference
        from scipy.stats import t as t_dist
        t_crit = t_dist.ppf(0.975, n_subjects - 1)
        ci_lower = float(mean_diff - t_crit * se_diff)
        ci_upper = float(mean_diff + t_crit * se_diff)

        comparisons.append({
            'timepoint1': timeLabels[i] if i < len(timeLabels) else f'Time {i + 1}',
            'timepoint2': timeLabels[j] if j < len(timeLabels) else f'Time {j + 1}',
            'meanDiff': mean_diff,
            'tStatistic': float(t_stat),
            'pValue': float(p_value),
            'cohensD': cohens_d,
            'seDiff': se_diff,
            'ciLower': ci_lower,
            'ciUpper': ci_upper,
            'df': int(n_subjects - 1)
        })
        raw_p_values.append(p_value)

    # Apply p-value correction
    n_comparisons = len(comparisons)
    if pAdjust == 'bonferroni':
        adjusted_p_values = [min(p * n_comparisons, 1.0) for p in raw_p_values]
    elif pAdjust == 'holm':
        # Holm-Bonferroni method
        sorted_indices = sorted(range(n_comparisons), key=lambda k: raw_p_values[k])
        adjusted_p_values = [0.0] * n_comparisons
        for rank, idx in enumerate(sorted_indices):
            multiplier = n_comparisons - rank
            adjusted_p_values[idx] = min(raw_p_values[idx] * multiplier, 1.0)
        # Ensure monotonicity
        for k in range(1, n_comparisons):
            idx = sorted_indices[k]
            prev_idx = sorted_indices[k - 1]
            adjusted_p_values[idx] = max(adjusted_p_values[idx], adjusted_p_values[prev_idx])
    else:
        adjusted_p_values = raw_p_values

    # Update comparisons with adjusted p-values and significance
    for idx, comp in enumerate(comparisons):
        comp['pAdjusted'] = float(adjusted_p_values[idx])
        comp['significant'] = adjusted_p_values[idx] < 0.05

    return {
        'method': f'Paired t-test with {pAdjust.capitalize()} correction',
        'comparisons': comparisons,
        'pAdjustMethod': pAdjust,
        'nComparisons': n_comparisons
    }


def cochran_q_posthoc(dataMatrix, pAdjust='holm'):
    """
    Cochran Q post-hoc test: Pairwise McNemar tests with correction.

    Args:
        data_matrix: n_subjects x k_conditions 2D list/array (binary 0/1)
        p_adjust: 'bonferroni' or 'holm'

    Returns:
        Dictionary with pairwise comparisons
    """
    from itertools import combinations
    from scipy.stats import binom

    data = np.array(dataMatrix, dtype=float)
    n_subjects, n_conditions = data.shape

    if n_conditions < 3:
        raise ValueError(f"Need at least 3 conditions for Cochran Q post-hoc, got {n_conditions}")

    # Validate binary data (0 or 1 only)
    unique_values = np.unique(data[~np.isnan(data)])
    if not np.all(np.isin(unique_values, [0, 1])):
        raise ValueError(f"Cochran Q post-hoc requires binary (0/1) data, found values: {unique_values}")

    # Remove rows with any NaN
    valid_rows = ~np.any(np.isnan(data), axis=1)
    if np.sum(valid_rows) < 2:
        raise ValueError("Need at least 2 valid subjects (without NaN) for post-hoc")
    data = data[valid_rows, :]
    n_subjects = data.shape[0]

    comparisons = []
    raw_p_values = []

    for i, j in combinations(range(n_conditions), 2):
        col_i = data[:, i].astype(int)
        col_j = data[:, j].astype(int)

        # McNemar 2x2 contingency table
        # b = 1->0 (condition i=1, condition j=0)
        # c = 0->1 (condition i=0, condition j=1)
        b = int(np.sum((col_i == 1) & (col_j == 0)))
        c = int(np.sum((col_i == 0) & (col_j == 1)))

        # Use exact test for small samples (b+c < 25), otherwise chi-square with continuity correction
        if b + c == 0:
            chi2_stat = 0.0
            p_value = 1.0
            method_used = 'none'
        elif b + c < 25:
            # Exact binomial test (two-sided)
            # Under H0, b ~ Binomial(b+c, 0.5)
            k = min(b, c)
            p_value = float(2 * binom.cdf(k, b + c, 0.5))
            p_value = min(p_value, 1.0)  # Cap at 1.0
            chi2_stat = float((b - c) ** 2 / (b + c))  # Still report chi2 for reference
            method_used = 'exact'
        else:
            # Chi-square with Yates continuity correction
            chi2_stat = float((abs(b - c) - 0.5) ** 2 / (b + c))
            p_value = float(1 - stats.chi2.cdf(chi2_stat, 1))
            method_used = 'continuity'

        # Success rate difference
        rate_i = float(np.mean(col_i))
        rate_j = float(np.mean(col_j))
        rate_diff = rate_i - rate_j

        comparisons.append({
            'condition1': int(i),
            'condition2': int(j),
            'b': b,
            'c': c,
            'chiSquare': chi2_stat,
            'pValue': p_value,
            'rateDiff': rate_diff,
            'rate1': rate_i,
            'rate2': rate_j
        })
        raw_p_values.append(p_value)

    # Apply p-value correction
    n_comparisons = len(comparisons)
    if pAdjust == 'bonferroni':
        adjusted_p_values = [min(p * n_comparisons, 1.0) for p in raw_p_values]
    elif pAdjust == 'holm':
        sorted_indices = sorted(range(n_comparisons), key=lambda k: raw_p_values[k])
        adjusted_p_values = [0.0] * n_comparisons
        for rank, idx in enumerate(sorted_indices):
            multiplier = n_comparisons - rank
            adjusted_p_values[idx] = min(raw_p_values[idx] * multiplier, 1.0)
        for k in range(1, n_comparisons):
            idx = sorted_indices[k]
            prev_idx = sorted_indices[k - 1]
            adjusted_p_values[idx] = max(adjusted_p_values[idx], adjusted_p_values[prev_idx])
    else:
        adjusted_p_values = raw_p_values

    # Update comparisons with adjusted p-values
    for idx, comp in enumerate(comparisons):
        comp['pAdjusted'] = float(adjusted_p_values[idx])
        comp['significant'] = adjusted_p_values[idx] < 0.05

    return {
        'method': f'McNemar pairwise with {pAdjust.capitalize()} correction',
        'comparisons': comparisons,
        'pAdjustMethod': pAdjust,
        'nComparisons': n_comparisons
    }

