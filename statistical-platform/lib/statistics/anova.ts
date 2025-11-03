/**
 * 분산분석(ANOVA) 및 사후검정 모듈
 */

import { ensurePyodideReady, validateNumericArray, validateNumericMatrix, interpretPValue, interpretEffectSize } from './utils'
import { ANOVAResult, PostHocResult, StatisticalResult } from './types'

/**
 * 일원분산분석 (One-way ANOVA)
 */
export async function oneWayANOVA(
  groups: number[][], 
  groupNames?: string[],
  postHocTest?: 'tukey' | 'bonferroni' | 'games-howell' | 'none'
): Promise<StatisticalResult> {
  validateNumericMatrix(groups, 2, 'Groups')
  groups.forEach((group, i) => {
    if (group.length < 2) {
      throw new Error(`Group ${i + 1} must have at least 2 values`)
    }
  })
  
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    # ANOVA 수행
    f_stat, p_value = stats.f_oneway(*[np.array(g) for g in groups_data])
    
    # 그룹별 통계
    group_means = [float(np.mean(g)) for g in groups_data]
    group_stds = [float(np.std(g, ddof=1)) for g in groups_data]
    group_ns = [len(g) for g in groups_data]
    
    # 전체 평균
    all_data = np.concatenate([np.array(g) for g in groups_data])
    grand_mean = float(np.mean(all_data))
    
    # 효과크기 (eta-squared) 계산
    ss_between = sum(n * (mean - grand_mean)**2 for n, mean in zip(group_ns, group_means))
    ss_total = sum((x - grand_mean)**2 for g in groups_data for x in g)
    eta_squared = ss_between / ss_total if ss_total != 0 else 0
    
    # 자유도
    df_between = len(groups_data) - 1
    df_within = sum(group_ns) - len(groups_data)
    
    # 평균제곱
    ms_between = ss_between / df_between
    ms_within = (ss_total - ss_between) / df_within
    
    result = {
        'testName': 'One-way ANOVA',
        'statistic': float(f_stat),
        'pValue': float(p_value),
        'fStatistic': float(f_stat),
        'dfBetween': int(df_between),
        'dfWithin': int(df_within),
        'msBetween': float(ms_between),
        'msWithin': float(ms_within),
        'groupMeans': group_means,
        'groupStds': group_stds,
        'groupSizes': group_ns,
        'groupNames': group_names,
        'grandMean': grand_mean,
        'etaSquared': float(eta_squared),
        'interpretation': f"Groups {'differ' if p_value < 0.05 else 'do not differ'} significantly (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  const parsedResult = JSON.parse(result)
  
  // 사후검정 수행
  if (postHocTest && postHocTest !== 'none' && parsedResult.isSignificant) {
    let postHocResults
    switch (postHocTest) {
      case 'tukey':
        postHocResults = await tukeyHSD(groups, names)
        break
      case 'bonferroni':
        postHocResults = await bonferroniPostHoc(groups, names)
        break
      case 'games-howell':
        postHocResults = await gamesHowellPostHoc(groups, names)
        break
    }
    parsedResult.postHoc = postHocResults
  }
  
  parsedResult.interpretation = `${parsedResult.interpretation}. Effect size (η²): ${interpretEffectSize(parsedResult.etaSquared, 'eta_squared')}`
  return parsedResult
}

/**
 * 이원분산분석 (Two-way ANOVA)
 */
export async function twoWayANOVA(
  data: number[],
  factorA: string[],
  factorB: string[]
): Promise<StatisticalResult> {
  validateNumericArray(data, 4, 'Data')
  
  if (data.length !== factorA.length || data.length !== factorB.length) {
    throw new Error('Data and factor arrays must have the same length')
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    import pandas as pd
    from scipy import stats
    import json
    
    # 데이터프레임 생성
    df = pd.DataFrame({
        'value': ${JSON.stringify(data)},
        'factorA': ${JSON.stringify(factorA)},
        'factorB': ${JSON.stringify(factorB)}
    })
    
    # 그룹별 평균 계산
    means_a = df.groupby('factorA')['value'].mean().to_dict()
    means_b = df.groupby('factorB')['value'].mean().to_dict()
    means_interaction = df.groupby(['factorA', 'factorB'])['value'].mean().to_dict()
    
    # 간단한 2-way ANOVA (statsmodels 없이)
    # 주효과와 상호작용 효과 계산
    grand_mean = df['value'].mean()
    n = len(df)
    
    # Factor A 주효과
    levels_a = df['factorA'].unique()
    ss_a = sum(len(df[df['factorA'] == level]) * (means_a[level] - grand_mean)**2 for level in levels_a)
    df_a = len(levels_a) - 1
    ms_a = ss_a / df_a if df_a > 0 else 0
    
    # Factor B 주효과
    levels_b = df['factorB'].unique()
    ss_b = sum(len(df[df['factorB'] == level]) * (means_b[level] - grand_mean)**2 for level in levels_b)
    df_b = len(levels_b) - 1
    ms_b = ss_b / df_b if df_b > 0 else 0
    
    # 전체 제곱합
    ss_total = sum((x - grand_mean)**2 for x in df['value'])
    
    # 오차 제곱합 (단순화된 계산)
    ss_error = ss_total - ss_a - ss_b
    df_error = n - len(levels_a) - len(levels_b) + 1
    ms_error = ss_error / df_error if df_error > 0 else 1
    
    # F-통계량
    f_a = ms_a / ms_error if ms_error > 0 else 0
    f_b = ms_b / ms_error if ms_error > 0 else 0
    
    # p-value 계산
    p_a = 1 - stats.f.cdf(f_a, df_a, df_error) if df_a > 0 and df_error > 0 else 1
    p_b = 1 - stats.f.cdf(f_b, df_b, df_error) if df_b > 0 and df_error > 0 else 1
    
    result = {
        'testName': 'Two-way ANOVA',
        'factorA': {
            'fStatistic': float(f_a),
            'pValue': float(p_a),
            'df': int(df_a),
            'ms': float(ms_a),
            'isSignificant': p_a < 0.05
        },
        'factorB': {
            'fStatistic': float(f_b),
            'pValue': float(p_b),
            'df': int(df_b),
            'ms': float(ms_b),
            'isSignificant': p_b < 0.05
        },
        'error': {
            'df': int(df_error),
            'ms': float(ms_error)
        },
        'means': {
            'factorA': means_a,
            'factorB': means_b,
            'grandMean': float(grand_mean)
        },
        'interpretation': f"Factor A: {'significant' if p_a < 0.05 else 'not significant'} (p={p_a:.4f}), Factor B: {'significant' if p_b < 0.05 else 'not significant'} (p={p_b:.4f})"
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Tukey HSD 사후검정
 */
export async function tukeyHSD(
  groups: number[][],
  groupNames?: string[]
): Promise<PostHocResult[]> {
  validateNumericMatrix(groups, 2, 'Groups')
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    from itertools import combinations
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    # 전체 데이터 준비
    all_data = []
    all_groups = []
    for i, group in enumerate(groups_data):
        all_data.extend(group)
        all_groups.extend([i] * len(group))
    
    # MSE 계산 (평균제곱오차)
    group_means = [np.mean(g) for g in groups_data]
    grand_mean = np.mean(all_data)
    
    ss_within = sum(sum((x - group_means[i])**2 for x in group) 
                    for i, group in enumerate(groups_data))
    df_within = len(all_data) - len(groups_data)
    mse = ss_within / df_within
    
    # 모든 쌍별 비교
    comparisons = []
    k = len(groups_data)  # 그룹 수
    
    for i, j in combinations(range(k), 2):
        mean_diff = group_means[i] - group_means[j]
        n_i = len(groups_data[i])
        n_j = len(groups_data[j])
        
        # 표준오차
        se = np.sqrt(mse * (1/n_i + 1/n_j) / 2)
        
        # q-통계량
        q_stat = abs(mean_diff) / se
        
        # Studentized Range Distribution에서 임계값 (근사)
        # 실제로는 정확한 테이블이 필요하지만 여기서는 근사값 사용
        alpha = 0.05
        df = df_within
        
        # Tukey HSD 임계값 근사 (Bonferroni 보정으로 대체)
        n_comparisons = k * (k - 1) / 2
        alpha_adj = alpha / n_comparisons
        t_crit = stats.t.ppf(1 - alpha_adj/2, df)
        
        # p-value 근사
        p_value = 2 * (1 - stats.t.cdf(abs(mean_diff) / se, df))
        
        # 신뢰구간
        ci_lower = mean_diff - t_crit * se
        ci_upper = mean_diff + t_crit * se
        
        comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'meanDiff': float(mean_diff),
            'pValue': float(p_value),
            'ciLower': float(ci_lower),
            'ciUpper': float(ci_upper),
            'significant': p_value < alpha_adj
        })
    
    json.dumps(comparisons)
  `)
  
  return JSON.parse(result)
}

/**
 * Bonferroni 사후검정
 */
export async function bonferroniPostHoc(
  groups: number[][],
  groupNames?: string[]
): Promise<PostHocResult[]> {
  validateNumericMatrix(groups, 2, 'Groups')
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    from itertools import combinations
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    comparisons = []
    k = len(groups_data)
    n_comparisons = k * (k - 1) / 2
    alpha = 0.05
    alpha_adj = alpha / n_comparisons  # Bonferroni 보정
    
    for i, j in combinations(range(k), 2):
        group1 = np.array(groups_data[i])
        group2 = np.array(groups_data[j])
        
        # t-검정 수행
        t_stat, p_value = stats.ttest_ind(group1, group2)
        
        # 평균 차이와 신뢰구간
        mean_diff = np.mean(group1) - np.mean(group2)
        pooled_std = np.sqrt(((len(group1)-1)*np.var(group1, ddof=1) + 
                              (len(group2)-1)*np.var(group2, ddof=1)) / 
                              (len(group1)+len(group2)-2))
        se = pooled_std * np.sqrt(1/len(group1) + 1/len(group2))
        df = len(group1) + len(group2) - 2
        
        t_crit = stats.t.ppf(1 - alpha_adj/2, df)
        ci_lower = mean_diff - t_crit * se
        ci_upper = mean_diff + t_crit * se
        
        comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'meanDiff': float(mean_diff),
            'pValue': float(p_value),
            'adjustedPValue': float(min(p_value * n_comparisons, 1.0)),
            'ciLower': float(ci_lower),
            'ciUpper': float(ci_upper),
            'significant': p_value < alpha_adj
        })
    
    json.dumps(comparisons)
  `)
  
  return JSON.parse(result)
}

/**
 * Games-Howell 사후검정 (등분산 가정 위반 시)
 */
export async function gamesHowellPostHoc(
  groups: number[][],
  groupNames?: string[]
): Promise<PostHocResult[]> {
  validateNumericMatrix(groups, 2, 'Groups')
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    from itertools import combinations
    
    groups_data = ${JSON.stringify(groups)}
    group_names = ${JSON.stringify(names)}
    
    comparisons = []
    alpha = 0.05
    
    for i, j in combinations(range(len(groups_data)), 2):
        group1 = np.array(groups_data[i])
        group2 = np.array(groups_data[j])
        
        n1, n2 = len(group1), len(group2)
        mean1, mean2 = np.mean(group1), np.mean(group2)
        var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
        
        # Games-Howell 표준오차
        se = np.sqrt(var1/n1 + var2/n2)
        
        # Welch-Satterthwaite 자유도
        df = (var1/n1 + var2/n2)**2 / ((var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1))
        
        # t-통계량
        t_stat = (mean1 - mean2) / se
        
        # p-value
        p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df))
        
        # 신뢰구간
        t_crit = stats.t.ppf(1 - alpha/2, df)
        mean_diff = mean1 - mean2
        ci_lower = mean_diff - t_crit * se
        ci_upper = mean_diff + t_crit * se
        
        comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'meanDiff': float(mean_diff),
            'pValue': float(p_value),
            'ciLower': float(ci_lower),
            'ciUpper': float(ci_upper),
            'significant': p_value < alpha,
            'df': float(df)
        })
    
    json.dumps(comparisons)
  `)
  
  return JSON.parse(result)
}