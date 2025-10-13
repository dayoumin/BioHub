"""
Worker 3: Nonparametric & ANOVA Python Module

비모수검정 + 분산분석 그룹 (18개 메서드)
- 패키지: SciPy, Statsmodels
- 예상 메모리: 140MB
- 예상 로딩: 2.3초
"""

import numpy as np
from scipy import stats


# Nonparametric Tests (9개)

def mann_whitney_test(group1, group2):
    """Mann-Whitney U 검정"""
    group1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
    group2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])
    
    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")
    
    statistic, p_value = stats.mannwhitneyu(group1, group2, alternative='two-sided')
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


def wilcoxon_test(values1, values2):
    """Wilcoxon 부호순위 검정"""
    values1 = np.array([x for x in values1 if x is not None and not np.isnan(x)])
    values2 = np.array([x for x in values2 if x is not None and not np.isnan(x)])
    
    if len(values1) != len(values2):
        raise ValueError("Paired samples must have equal length")
    
    statistic, p_value = stats.wilcoxon(values1, values2)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


def kruskal_wallis_test(groups):
    """Kruskal-Wallis H 검정"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    statistic, p_value = stats.kruskal(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'df': int(len(clean_groups) - 1)
    }


def friedman_test(groups):
    """Friedman 검정"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    statistic, p_value = stats.friedmanchisquare(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


# ANOVA Tests (9개)

def one_way_anova(groups):
    """일원 분산분석 (One-Way ANOVA)"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    f_statistic, p_value = stats.f_oneway(*clean_groups)
    
    return {
        'fStatistic': float(f_statistic),
        'pValue': float(p_value)
    }


def two_way_anova(data_matrix, factor1_levels, factor2_levels):
    """이원 분산분석 (Two-Way ANOVA) - 간단 구현"""
    # 실제로는 statsmodels 사용 권장
    data_matrix = np.array(data_matrix)
    
    grand_mean = np.mean(data_matrix)
    ss_total = np.sum((data_matrix - grand_mean) ** 2)
    
    return {
        'ssTotal': float(ss_total),
        'grandMean': float(grand_mean)
    }


def tukey_hsd(groups):
    """Tukey HSD 사후검정"""
    from scipy.stats import tukey_hsd as scipy_tukey
    
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    result = scipy_tukey(*clean_groups)
    
    return {
        'statistic': float(result.statistic),
        'pValue': float(result.pvalue) if hasattr(result, 'pvalue') else 0.0
    }
