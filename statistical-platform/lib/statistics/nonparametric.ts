/**
 * 비모수 검정 모듈
 */

import { ensurePyodideReady, validateNumericArray, validateNumericMatrix, interpretPValue } from './utils'
import { StatisticalResult, PostHocResult } from './types'

/**
 * Mann-Whitney U 검정 (독립 두 그룹)
 */
export async function mannWhitneyU(
  group1: number[],
  group2: number[],
  alternative: 'two-sided' | 'less' | 'greater' = 'two-sided'
): Promise<StatisticalResult> {
  validateNumericArray(group1, 2, 'Group 1')
  validateNumericArray(group2, 2, 'Group 2')
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    group1 = np.array(${JSON.stringify(group1)})
    group2 = np.array(${JSON.stringify(group2)})
    
    # Mann-Whitney U test
    statistic, pValue = stats.mannwhitneyu(group1, group2, alternative='${alternative}')
    
    # 효과크기 (r = Z / sqrt(N))
    n1, n2 = len(group1), len(group2)
    n_total = n1 + n2
    
    # Z-score 계산
    mean_u = n1 * n2 / 2
    std_u = np.sqrt(n1 * n2 * (n_total + 1) / 12)
    z_score = (statistic - mean_u) / std_u if std_u > 0 else 0
    
    # 효과크기 r
    effect_size_r = abs(z_score) / np.sqrt(n_total)
    
    # 중앙값
    median1 = np.median(group1)
    median2 = np.median(group2)
    
    # Hodges-Lehmann 추정량 (중앙값 차이의 추정)
    differences = []
    for x1 in group1:
        for x2 in group2:
            differences.append(x1 - x2)
    hodges_lehmann = np.median(differences)
    
    result = {
        'testName': 'Mann-Whitney U Test',
        'statistic': float(statistic),
        'pValue': float(pValue),
        'zScore': float(z_score),
        'effectSize': float(effect_size_r),
        'median1': float(median1),
        'median2': float(median2),
        'n1': int(n1),
        'n2': int(n2),
        'hodgesLehmann': float(hodges_lehmann),
        'alternative': '${alternative}',
        'interpretation': f"Groups {'differ' if pValue < 0.05 else 'do not differ'} significantly (p = {pValue:.4f}). Effect size r = {effect_size_r:.3f}",
        'isSignificant': pValue < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Wilcoxon 부호순위 검정 (대응표본)
 */
export async function wilcoxonSignedRank(
  x: number[],
  y: number[] | null = null,
  alternative: 'two-sided' | 'less' | 'greater' = 'two-sided'
): Promise<StatisticalResult> {
  validateNumericArray(x, 2, 'X')
  
  if (y !== null) {
    validateNumericArray(y, 2, 'Y')
    if (x.length !== y.length) {
      throw new Error('X and Y must have the same length for paired test')
    }
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    x = np.array(${JSON.stringify(x)})
    y = ${y ? `np.array(${JSON.stringify(y)})` : 'None'}
    
    # Wilcoxon signed-rank test
    if y is not None:
        # 대응표본 검정
        statistic, pValue = stats.wilcoxon(x, y, alternative='${alternative}')
        differences = x - y
        test_type = 'Paired samples'
        median_diff = np.median(differences)
        n_pairs = len(x)
    else:
        # 일표본 검정 (중앙값 = 0)
        statistic, pValue = stats.wilcoxon(x, alternative='${alternative}')
        differences = x
        test_type = 'One sample (median = 0)'
        median_diff = np.median(x)
        n_pairs = len(x)
    
    # 효과크기 계산 (r = Z / sqrt(N))
    n = len(differences)
    # 양의 순위 합과 음의 순위 합 중 작은 값이 통계량
    ranks = stats.rankdata(np.abs(differences[differences != 0]))
    positive_ranks = ranks[differences[differences != 0] > 0]
    
    # Z-score 근사 (큰 표본)
    if n > 20:
        mean_w = n * (n + 1) / 4
        std_w = np.sqrt(n * (n + 1) * (2 * n + 1) / 24)
        z_score = (statistic - mean_w) / std_w if std_w > 0 else 0
    else:
        z_score = 0
    
    effect_size_r = abs(z_score) / np.sqrt(n) if n > 0 else 0
    
    result = {
        'testName': f'Wilcoxon Signed-Rank Test ({test_type})',
        'statistic': float(statistic),
        'pValue': float(pValue),
        'zScore': float(z_score) if n > 20 else None,
        'effectSize': float(effect_size_r),
        'medianDifference': float(median_diff),
        'n': int(n_pairs),
        'alternative': '${alternative}',
        'interpretation': f"{'Significant' if pValue < 0.05 else 'No significant'} difference found (p = {pValue:.4f})",
        'isSignificant': pValue < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Kruskal-Wallis 검정 (3개 이상 독립 그룹)
 */
export async function kruskalWallis(
  groups: number[][],
  groupNames?: string[]
): Promise<StatisticalResult> {
  validateNumericMatrix(groups, 3, 'Groups')
  
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    groups = [np.array(g) for g in ${JSON.stringify(groups)}]
    group_names = ${JSON.stringify(names)}
    
    # Kruskal-Wallis test
    statistic, pValue = stats.kruskal(*groups)
    
    # 그룹별 중앙값과 평균 순위
    all_data = np.concatenate(groups)
    all_ranks = stats.rankdata(all_data)
    
    group_info = []
    start_idx = 0
    for i, group in enumerate(groups):
        n = len(group)
        group_ranks = all_ranks[start_idx:start_idx + n]
        mean_rank = np.mean(group_ranks)
        
        group_info.append({
            'name': group_names[i],
            'n': int(n),
            'median': float(np.median(group)),
            'meanRank': float(mean_rank),
            'q1': float(np.percentile(group, 25)),
            'q3': float(np.percentile(group, 75))
        })
        start_idx += n
    
    # 효과크기 (Epsilon-squared)
    n_total = len(all_data)
    df = len(groups) - 1
    epsilonSquared = (statistic - df) / (n_total - df - 1) if n_total > df + 1 else 0
    
    result = {
        'testName': 'Kruskal-Wallis Test',
        'statistic': float(statistic),
        'pValue': float(pValue),
        'degreesOfFreedom': int(df),
        'effectSize': float(epsilonSquared),
        'groups': group_info,
        'interpretation': f"Groups {'differ' if pValue < 0.05 else 'do not differ'} significantly (p = {pValue:.4f})",
        'isSignificant': pValue < 0.05,
        'requiresPostHoc': pValue < 0.05 and len(groups) > 2
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Dunn's 사후검정 (Kruskal-Wallis 후)
 */
export async function dunnTest(
  groups: number[][],
  groupNames?: string[],
  pAdjust: 'bonferroni' | 'holm' | 'none' = 'bonferroni'
): Promise<PostHocResult[]> {
  validateNumericMatrix(groups, 2, 'Groups')
  
  const pyodide = await ensurePyodideReady()
  const names = groupNames || groups.map((_, i) => `Group ${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    from itertools import combinations
    import json
    
    groups = [np.array(g) for g in ${JSON.stringify(groups)}]
    group_names = ${JSON.stringify(names)}
    p_adjust = '${pAdjust}'
    
    # 전체 데이터의 순위
    all_data = []
    group_labels = []
    for i, group in enumerate(groups):
        all_data.extend(group)
        group_labels.extend([i] * len(group))
    
    all_data = np.array(all_data)
    group_labels = np.array(group_labels)
    ranks = stats.rankdata(all_data)
    
    # 그룹별 평균 순위
    mean_ranks = []
    ns = []
    for i in range(len(groups)):
        group_ranks = ranks[group_labels == i]
        mean_ranks.append(np.mean(group_ranks))
        ns.append(len(group_ranks))
    
    # 전체 평균 순위
    N = len(all_data)
    mean_rank_all = (N + 1) / 2
    
    # 타이 보정
    tied_groups = {}
    for r in ranks:
        if list(ranks).count(r) > 1:
            tied_groups[r] = list(ranks).count(r)
    
    tie_correction = 1 - sum(t**3 - t for t in tied_groups.values()) / (N**3 - N) if N > 1 else 1
    
    # 표준오차
    S2 = ((N * (N + 1) / 12) * tie_correction)
    
    comparisons = []
    k = len(groups)
    
    for i, j in combinations(range(k), 2):
        # Z-score 계산
        diff = mean_ranks[i] - mean_ranks[j]
        se = np.sqrt(S2 * (1/ns[i] + 1/ns[j]))
        z = abs(diff) / se if se > 0 else 0
        
        # p-value (양측검정)
        pValue = 2 * (1 - stats.norm.cdf(abs(z)))
        
        comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'meanRankDiff': float(diff),
            'zScore': float(z),
            'pValue': float(pValue),
            'comparison': f"{group_names[i]} vs {group_names[j]}"
        })
    
    # p-value 조정
    if p_adjust != 'none' and len(comparisons) > 1:
        pValues = [c['pValue'] for c in comparisons]
        
        if p_adjust == 'bonferroni':
            adjusted_p = [min(p * len(comparisons), 1.0) for p in pValues]
        elif p_adjust == 'holm':
            # Holm-Bonferroni method
            sorted_indices = np.argsort(pValues)
            adjusted_p = [0] * len(pValues)
            for rank, idx in enumerate(sorted_indices):
                adjusted_p[idx] = min(pValues[idx] * (len(pValues) - rank), 1.0)
        else:
            adjusted_p = pValues
        
        for i, comp in enumerate(comparisons):
            comp['adjustedPValue'] = float(adjusted_p[i])
            comp['significant'] = adjusted_p[i] < 0.05
    else:
        for comp in comparisons:
            comp['adjustedPValue'] = comp['pValue']
            comp['significant'] = comp['pValue'] < 0.05
    
    json.dumps(comparisons)
  `)
  
  return JSON.parse(result)
}

/**
 * 카이제곱 검정 (독립성/적합도)
 */
export async function chiSquareTest(
  observed: number[][] | number[],
  expected?: number[][] | number[]
): Promise<StatisticalResult> {
  const pyodide = await ensurePyodideReady()
  
  const is2D = Array.isArray(observed[0])
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    observed = np.array(${JSON.stringify(observed)})
    expected = ${expected ? `np.array(${JSON.stringify(expected)})` : 'None'}
    
    if observed.ndim == 2:
        # 독립성 검정 (2차원 분할표)
        chi2_stat, pValue, dof, expected_freq = stats.chi2_contingency(observed)
        test_type = 'Independence Test'
        
        # Cramér's V (효과크기)
        n = observed.sum()
        min_dim = min(observed.shape[0] - 1, observed.shape[1] - 1)
        cramersV = np.sqrt(chi2_stat / (n * min_dim)) if n > 0 and min_dim > 0 else 0
        effect_size = cramersV
        
        result_data = {
            'observed': observed.tolist(),
            'expected': expected_freq.tolist(),
            'tableShape': list(observed.shape)
        }
    else:
        # 적합도 검정 (1차원)
        if expected is None:
            # 균등분포 가정
            expected = np.ones_like(observed) * np.mean(observed)
        
        chi2_stat, pValue = stats.chisquare(observed, expected)
        dof = len(observed) - 1
        test_type = 'Goodness of Fit Test'
        
        # 효과크기 (Cohen's w)
        n = np.sum(observed)
        cohens_w = np.sqrt(chi2_stat / n) if n > 0 else 0
        effect_size = cohens_w
        
        result_data = {
            'observed': observed.tolist(),
            'expected': expected.tolist() if expected is not None else None
        }
    
    result = {
        'testName': f'Chi-Square {test_type}',
        'statistic': float(chi2_stat),
        'pValue': float(pValue),
        'degreesOfFreedom': int(dof),
        'effectSize': float(effect_size),
        'data': result_data,
        'interpretation': f"{'Significant' if pValue < 0.05 else 'No significant'} association found (p = {pValue:.4f})",
        'isSignificant': pValue < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}