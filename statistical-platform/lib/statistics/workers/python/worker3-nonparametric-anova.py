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
    """
    Wilcoxon 부호순위 검정
    
    쌍(pair) 단위로 데이터 정제하여 통계적 정확성 보장
    """
    # 쌍 단위로 정제 (양쪽 모두 유효한 값만 선택)
    pairs = [(v1, v2) for v1, v2 in zip(values1, values2) 
             if v1 is not None and v2 is not None 
             and not np.isnan(v1) and not np.isnan(v2)]
    
    if len(pairs) < 2:
        raise ValueError("Wilcoxon test requires at least 2 valid pairs")
    
    values1 = np.array([p[0] for p in pairs])
    values2 = np.array([p[1] for p in pairs])
    
    statistic, p_value = stats.wilcoxon(values1, values2)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'nPairs': int(len(pairs))
    }


def kruskal_wallis_test(groups):
    """Kruskal-Wallis H 검정"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    # 각 그룹이 최소 1개 이상의 관측치를 가져야 함
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
    """Friedman 검정"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    # 모든 그룹이 같은 길이를 가져야 함 (repeated measures)
    lengths = [len(g) for g in clean_groups]
    if len(set(lengths)) > 1:
        raise ValueError(f"Friedman test requires equal group sizes, got: {lengths}")
    
    statistic, p_value = stats.friedmanchisquare(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


# ANOVA Tests (9개)

def one_way_anova(groups):
    """일원 분산분석 (One-Way ANOVA)"""
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    # 각 그룹이 최소 2개 이상의 관측치를 가져야 함
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


def two_way_anova(data_matrix, factor1_levels, factor2_levels):
    """
    이원 분산분석 (Two-Way ANOVA)
    
    주의: 완전한 구현을 위해서는 statsmodels 사용 권장
    현재는 기본적인 제곱합만 계산
    """
    data_matrix = np.array(data_matrix)
    
    if data_matrix.size == 0:
        raise ValueError("Empty data matrix")
    
    grand_mean = np.mean(data_matrix)
    ss_total = np.sum((data_matrix - grand_mean) ** 2)
    
    # 실제 Two-Way ANOVA는 statsmodels 권장
    return {
        'ssTotal': float(ss_total),
        'grandMean': float(grand_mean),
        'warning': 'Use statsmodels for complete two-way ANOVA implementation'
    }


def tukey_hsd(groups):
    """
    Tukey HSD 사후검정
    
    SciPy 1.10+ 필요
    """
    from scipy.stats import tukey_hsd as scipy_tukey
    
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    # 각 그룹이 최소 1개 이상의 관측치를 가져야 함
    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")
    
    try:
        result = scipy_tukey(*clean_groups)
        
        # SciPy 버전에 따라 pvalue 속성이 다를 수 있음
        if hasattr(result, 'pvalue'):
            p_value = float(result.pvalue)
        else:
            p_value = None
        
        return {
            'statistic': float(result.statistic),
            'pValue': p_value,
            'confidenceInterval': result.confidence_interval().tolist() if hasattr(result, 'confidence_interval') else None
        }
    except AttributeError as e:
        raise ValueError(f"SciPy version may not support tukey_hsd: {e}")
