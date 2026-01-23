/**
 * t-검정 분석 모듈
 */

import { ensurePyodideReady, validateNumericArray, interpretPValue, interpretEffectSize } from './utils'
import { StatisticalResult } from './types'

/**
 * 일표본 t-검정
 */
export async function oneSampleTTest(
  data: number[],
  populationMean: number
): Promise<StatisticalResult> {
  validateNumericArray(data, 2, 'Data')
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    pop_mean = ${populationMean}
    
    # T-test 수행
    t_stat, p_value = stats.ttest_1samp(data, pop_mean)
    
    # 효과크기 (Cohen's d) 계산
    cohens_d = (np.mean(data) - pop_mean) / np.std(data, ddof=1)
    
    # 신뢰구간 계산
    mean = np.mean(data)
    sem = stats.sem(data)
    ci = stats.t.interval(0.95, len(data)-1, loc=mean, scale=sem)
    
    result = {
        'testName': 'One-sample t-test',
        'statistic': float(t_stat),
        'pValue': float(p_value),
        'degreesOfFreedom': int(len(data) - 1),
        'effectSize': float(cohens_d),
        'confidenceInterval': [float(ci[0]), float(ci[1])],
        'sampleMean': float(mean),
        'populationMean': float(pop_mean),
        'sampleStd': float(np.std(data, ddof=1)),
        'n': int(len(data)),
        'interpretation': f"The sample mean ({'is' if p_value < 0.05 else 'is not'} significantly different from {pop_mean} (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  const parsedResult = JSON.parse(result)
  parsedResult.interpretation = `${parsedResult.interpretation}. Effect size: ${interpretEffectSize(parsedResult.effectSize, 'cohens_d')}`
  return parsedResult
}

/**
 * 독립표본 t-검정
 */
export async function twoSampleTTest(
  group1: number[], 
  group2: number[],
  equalVar: boolean = true
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
    
    # T-test 수행
    if ${equalVar}:
        t_stat, p_value = stats.ttest_ind(group1, group2, equal_var=True)
        test_name = "Independent t-test"
    else:
        t_stat, p_value = stats.ttest_ind(group1, group2, equal_var=False)
        test_name = "Welch's t-test"
    
    # 효과크기 (Cohen's d) 계산
    pooled_std = np.sqrt(((len(group1)-1)*np.var(group1, ddof=1) + 
                          (len(group2)-1)*np.var(group2, ddof=1)) / 
                          (len(group1)+len(group2)-2))
    cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std
    
    # 신뢰구간 계산
    mean_diff = np.mean(group1) - np.mean(group2)
    se = pooled_std * np.sqrt(1/len(group1) + 1/len(group2))
    df = len(group1) + len(group2) - 2
    ci = stats.t.interval(0.95, df, loc=mean_diff, scale=se)
    
    result = {
        'testName': test_name,
        'statistic': float(t_stat),
        'pValue': float(p_value),
        'degreesOfFreedom': int(df),
        'effectSize': float(cohens_d),
        'confidenceInterval': [float(ci[0]), float(ci[1])],
        'mean1': float(np.mean(group1)),
        'mean2': float(np.mean(group2)),
        'std1': float(np.std(group1, ddof=1)),
        'std2': float(np.std(group2, ddof=1)),
        'n1': int(len(group1)),
        'n2': int(len(group2)),
        'meanDifference': float(mean_diff),
        'interpretation': f"The difference between groups is {'statistically significant' if p_value < 0.05 else 'not statistically significant'} (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  const parsedResult = JSON.parse(result)
  parsedResult.interpretation = `${parsedResult.interpretation}. Effect size: ${interpretEffectSize(parsedResult.effectSize, 'cohens_d')}`
  return parsedResult
}

/**
 * 대응표본 t-검정
 */
export async function pairedTTest(
  before: number[],
  after: number[]
): Promise<StatisticalResult> {
  validateNumericArray(before, 2, 'Before')
  validateNumericArray(after, 2, 'After')
  
  if (before.length !== after.length) {
    throw new Error('Paired samples must have the same length')
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    before = np.array(${JSON.stringify(before)})
    after = np.array(${JSON.stringify(after)})
    
    # Paired t-test 수행
    t_stat, p_value = stats.ttest_rel(before, after)
    
    # 차이값 계산
    differences = after - before
    mean_diff = np.mean(differences)
    std_diff = np.std(differences, ddof=1)
    
    # 효과크기 (Cohen's d) 계산
    cohens_d = mean_diff / std_diff
    
    # 신뢰구간 계산
    sem = stats.sem(differences)
    ci = stats.t.interval(0.95, len(differences)-1, loc=mean_diff, scale=sem)
    
    result = {
        'testName': 'Paired t-test',
        'statistic': float(t_stat),
        'pValue': float(p_value),
        'degreesOfFreedom': int(len(differences) - 1),
        'effectSize': float(cohens_d),
        'confidenceInterval': [float(ci[0]), float(ci[1])],
        'meanBefore': float(np.mean(before)),
        'meanAfter': float(np.mean(after)),
        'meanDifference': float(mean_diff),
        'stdDifference': float(std_diff),
        'n': int(len(before)),
        'interpretation': f"The change is {'statistically significant' if p_value < 0.05 else 'not statistically significant'} (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  const parsedResult = JSON.parse(result)
  parsedResult.interpretation = `${parsedResult.interpretation}. Effect size: ${interpretEffectSize(parsedResult.effectSize, 'cohens_d')}`
  return parsedResult
}

/**
 * Welch's t-test (unequal variances)
 * Alias for twoSampleTTest with equalVar=false
 */
export async function welchTTest(
  group1: number[],
  group2: number[]
): Promise<StatisticalResult> {
  return twoSampleTTest(group1, group2, false)
}