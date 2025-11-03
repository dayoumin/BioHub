/**
 * 기술통계 분석 모듈
 */

import { ensurePyodideReady, validateNumericArray, validateNumericMatrix } from './utils'
import { DescriptiveStats } from './types'

/**
 * 기술통계량 계산
 */
export async function calculateDescriptiveStats(data: number[]): Promise<DescriptiveStats> {
  validateNumericArray(data, 1, 'Data')
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    
    # 기본 통계량
    mean = float(np.mean(data))
    median = float(np.median(data))
    std = float(np.std(data, ddof=1))
    
    # Mode 계산
    mode_result = stats.mode(data, keepdims=False)
    mode = float(mode_result.mode) if mode_result.count > 1 else None
    
    # 사분위수
    q1 = float(np.percentile(data, 25))
    q3 = float(np.percentile(data, 75))
    iqr = q3 - q1
    
    # 이상치 탐지 (IQR 방법)
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    outliers = [float(x) for x in data if x < lower_bound or x > upper_bound]
    
    # 정규성 검정 (Shapiro-Wilk)
    if len(data) >= 3:
        stat, p_value = stats.shapiro(data)
        normal_test = {
            'statistic': float(stat),
            'pValue': float(p_value),
            'isNormal': p_value >= 0.05
        }
    else:
        normal_test = {
            'statistic': None,
            'pValue': None,
            'isNormal': None
        }
    
    # 신뢰구간 (95%)
    sem = stats.sem(data)
    ci = stats.t.interval(0.95, len(data)-1, loc=mean, scale=sem)
    
    result = {
        'mean': mean,
        'median': median,
        'mode': mode,
        'std': std,
        'variance': float(np.var(data, ddof=1)),
        'min': float(np.min(data)),
        'max': float(np.max(data)),
        'q1': q1,
        'q3': q3,
        'iqr': iqr,
        'skewness': float(stats.skew(data)),
        'kurtosis': float(stats.kurtosis(data)),
        'cv': float(std / mean * 100) if mean != 0 else None,
        'sem': float(sem),
        'ci95': [float(ci[0]), float(ci[1])],
        'outliers': outliers,
        'normalTest': normal_test
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 정규성 검정 (Shapiro-Wilk & Anderson-Darling)
 */
export async function normalityTest(data: number[]): Promise<any> {
  validateNumericArray(data, 3, 'Data')
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    
    # Shapiro-Wilk Test
    shapiro_stat, shapiro_p = stats.shapiro(data)
    
    # Anderson-Darling Test
    anderson_result = stats.anderson(data)
    
    # Kolmogorov-Smirnov Test (정규분포와 비교)
    ks_stat, ks_p = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data, ddof=1)))
    
    # D'Agostino's K-squared test
    dagostino_stat, dagostino_p = stats.normaltest(data)
    
    result = {
        'shapiroWilk': {
            'statistic': float(shapiro_stat),
            'pValue': float(shapiro_p),
            'isNormal': shapiro_p >= 0.05
        },
        'andersonDarling': {
            'statistic': float(anderson_result.statistic),
            'criticalValues': [float(cv) for cv in anderson_result.critical_values],
            'significanceLevels': [float(sl) for sl in anderson_result.significance_level]
        },
        'kolmogorovSmirnov': {
            'statistic': float(ks_stat),
            'pValue': float(ks_p),
            'isNormal': ks_p >= 0.05
        },
        'dagostino': {
            'statistic': float(dagostino_stat),
            'pValue': float(dagostino_p),
            'isNormal': dagostino_p >= 0.05
        },
        'overallConclusion': 'Data appears normally distributed' if shapiro_p >= 0.05 and ks_p >= 0.05 else 'Data deviates from normal distribution'
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 등분산성 검정 (Levene's & Bartlett's)
 */
export async function homogeneityTest(groups: number[][]): Promise<any> {
  validateNumericMatrix(groups, 2, 'Groups')
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    groups = [np.array(group) for group in ${JSON.stringify(groups)}]
    
    # Levene's Test (중앙값 기반 - 더 강건함)
    levene_stat, levene_p = stats.levene(*groups, center='median')
    
    # Bartlett's Test (정규분포 가정)
    bartlett_stat, bartlett_p = stats.bartlett(*groups)
    
    # Fligner-Killeen Test (비모수)
    fligner_stat, fligner_p = stats.fligner(*groups)
    
    result = {
        'levene': {
            'statistic': float(levene_stat),
            'pValue': float(levene_p),
            'isHomogeneous': levene_p >= 0.05
        },
        'bartlett': {
            'statistic': float(bartlett_stat),
            'pValue': float(bartlett_p),
            'isHomogeneous': bartlett_p >= 0.05
        },
        'fligner': {
            'statistic': float(fligner_stat),
            'pValue': float(fligner_p),
            'isHomogeneous': fligner_p >= 0.05
        },
        'recommendation': 'Use Levene test for general cases, Bartlett if data is normal, Fligner for non-normal data',
        'overallConclusion': 'Variances appear equal' if levene_p >= 0.05 else 'Variances are not equal'
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}