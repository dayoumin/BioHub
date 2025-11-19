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
    clean_groups = clean_groups_helper(groups)

    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")

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

    return {
        'fStatistic': float(f_statistic),
        'pValue': float(p_value),
        'df1': int(len(clean_groups) - 1),
        'df2': int(sum(len(g) for g in clean_groups) - len(clean_groups))
    }


def two_way_anova(data_values, factor1_values, factor2_values):
    import statsmodels.api as sm
    from statsmodels.formula.api import ols
    import pandas as pd

    if len(data_values) != len(factor1_values) or len(data_values) != len(factor2_values):
        raise ValueError(
            f"All inputs must have same length: data({len(data_values)}), "
            f"factor1({len(factor1_values)}), factor2({len(factor2_values)})"
        )

    n_samples = len(data_values)
    if n_samples < 4:
        raise ValueError(f"Two-way ANOVA requires at least 4 observations, got {n_samples}")

    df = pd.DataFrame({
        'value': data_values,
        'factor1': factor1_values,
        'factor2': factor2_values
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


def mcnemar_test(contingency_table):
    from statsmodels.stats.contingency_tables import mcnemar

    table = np.array(contingency_table)

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


def cochran_q_test(data_matrix):
    from statsmodels.stats.contingency_tables import cochrans_q

    data_matrix = np.array(data_matrix)

    if data_matrix.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_matrix.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n, k = data_matrix.shape  # n subjects, k conditions

    if n < 2:
        raise ValueError(f"Cochran Q requires at least 2 subjects, got {n}")

    if k < 3:
        raise ValueError(f"Cochran Q requires at least 3 conditions, got {k}")

    # Use statsmodels for Cochran Q test
    result = cochrans_q(data_matrix)

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

def repeated_measures_anova(data_matrix, subject_ids, time_labels):
    from statsmodels.stats.anova import AnovaRM
    import pandas as pd

    data_array = np.array(data_matrix)

    if data_array.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_array.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n_subjects, n_timepoints = data_array.shape

    if n_subjects < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 subjects, got {n_subjects}")

    if n_timepoints < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 timepoints, got {n_timepoints}")

    if len(subject_ids) != n_subjects:
        raise ValueError(f"Subject IDs length {len(subject_ids)} must match number of subjects {n_subjects}")

    if len(time_labels) != n_timepoints:
        raise ValueError(f"Time labels length {len(time_labels)} must match number of timepoints {n_timepoints}")

    data_long = []
    for i, subject_id in enumerate(subject_ids):
        for j, time_label in enumerate(time_labels):
            data_long.append({
                'subject': subject_id,
                'time': time_label,
                'value': data_matrix[i][j]
            })

    df = pd.DataFrame(data_long)

    # Repeated Measures ANOVA
    aovrm = AnovaRM(df, 'value', 'subject', within=['time'])
    res = aovrm.fit()

    return {
        'fStatistic': float(res.anova_table['F Value'][0]),
        'pValue': float(res.anova_table['Pr > F'][0]),
        'df': {
            'numerator': float(res.anova_table['Num DF'][0]),
            'denominator': float(res.anova_table['Den DF'][0])
        },
        'sphericityEpsilon': 1.0,
        'anovaTable': res.anova_table.to_dict()
    }


def ancova(y_values, group_values, covariates):
    import statsmodels.formula.api as smf
    import statsmodels.api as sm
    import pandas as pd

    if not covariates or len(covariates) == 0:
        raise ValueError("ANCOVA requires at least 1 covariate")

    if len(y_values) != len(group_values):
        raise ValueError(f"y_values ({len(y_values)}) and group_values ({len(group_values)}) must have same length")

    for i, cov in enumerate(covariates):
        if len(cov) != len(y_values):
            raise ValueError(f"Covariate {i} length ({len(cov)}) must match y_values length ({len(y_values)})")

    n_samples = len(y_values)
    if n_samples < 3:
        raise ValueError(f"ANCOVA requires at least 3 observations, got {n_samples}")

    data = {
        'y': y_values,
        'group': group_values
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


def manova(data_matrix, group_values, var_names):
    from statsmodels.multivariate.manova import MANOVA
    import pandas as pd

    if not data_matrix or len(data_matrix) == 0:
        raise ValueError("Empty data matrix")

    n_obs = len(data_matrix)
    n_vars = len(data_matrix[0]) if n_obs > 0 else 0

    if n_vars < 2:
        raise ValueError(f"MANOVA requires at least 2 variables, got {n_vars}")

    if len(group_values) != n_obs:
        raise ValueError(f"group_values length ({len(group_values)}) must match data_matrix rows ({n_obs})")

    if len(var_names) != n_vars:
        raise ValueError(f"var_names length ({len(var_names)}) must match data_matrix columns ({n_vars})")

    for i, row in enumerate(data_matrix):
        if len(row) != n_vars:
            raise ValueError(f"Row {i} has {len(row)} values, expected {n_vars}")

    df_dict = {'group': group_values}
    for i, var_name in enumerate(var_names):
        df_dict[var_name] = [row[i] for row in data_matrix]

    df = pd.DataFrame(df_dict)

    # MANOVA
    formula = ' + '.join(var_names) + ' ~ group'
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


def dunn_test(groups, p_adjust='holm'):
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

    dunn_result = sp.posthoc_dunn(df, val_col='data', group_col='group', p_adjust=p_adjust)

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
        'pAdjustMethod': p_adjust,
        'nComparisons': len(comparisons)
    }


def games_howell_test(groups):
    try:
        import scikit_posthocs as sp
        import pandas as pd
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

    gh_result = sp.posthoc_gameshowell(df, val_col='data', group_col='group')

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = gh_result.iloc[i, j]
            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'comparisons': comparisons,
        'nComparisons': len(comparisons)
    }


def three_way_anova(data_values, factor1_values, factor2_values, factor3_values):
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
    if len(data_values) != len(factor1_values) or \
       len(data_values) != len(factor2_values) or \
       len(data_values) != len(factor3_values):
        raise ValueError(
            f"All inputs must have same length: data({len(data_values)}), "
            f"factor1({len(factor1_values)}), factor2({len(factor2_values)}), "
            f"factor3({len(factor3_values)})"
        )

    n_samples = len(data_values)
    if n_samples < 8:
        raise ValueError(f"Three-way ANOVA requires at least 8 observations, got {n_samples}")

    # Create DataFrame
    df = pd.DataFrame({
        'value': data_values,
        'factor1': factor1_values,
        'factor2': factor2_values,
        'factor3': factor3_values
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


def friedman_posthoc(groups, p_adjust='holm'):
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
    data_matrix = np.array(clean_groups).T  # Transpose: rows=subjects, cols=conditions

    # Use posthoc_nemenyi_friedman for Friedman post-hoc
    nemenyi_result = sp.posthoc_nemenyi_friedman(data_matrix)

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
        'pAdjustMethod': p_adjust,
        'nComparisons': len(comparisons)
    }

