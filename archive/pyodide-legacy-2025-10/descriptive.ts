/**
 * 기술통계 서비스 모듈
 */

import { BasePyodideService } from './base'
import type {
  IDescriptiveService,
  DescriptiveStatsResult,
  NormalityTestResult,
  HomogeneityTestResult,
  OutlierResult
} from './types'

export class DescriptiveService extends BasePyodideService implements IDescriptiveService {
  private static instance: DescriptiveService | null = null

  private constructor() {
    super()
  }

  static getInstance(): DescriptiveService {
    if (!DescriptiveService.instance) {
      DescriptiveService.instance = new DescriptiveService()
    }
    return DescriptiveService.instance
  }

  /**
   * 기술통계량 계산
   */
  async calculateDescriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) == 0:
        py_result = {'error': 'No valid data'}
      else:
        py_result = {
          'count': int(len(clean_data)),
          'mean': float(np.mean(clean_data)),
          'std': float(np.std(clean_data, ddof=1)),
          'min': float(np.min(clean_data)),
          'max': float(np.max(clean_data)),
          'q25': float(np.percentile(clean_data, 25)),
          'median': float(np.median(clean_data)),
          'q75': float(np.percentile(clean_data, 75)),
          'skewness': float(stats.skew(clean_data)),
          'kurtosis': float(stats.kurtosis(clean_data)),
          'variance': float(np.var(clean_data, ddof=1)),
          'sem': float(stats.sem(clean_data)),
          'cv': float(np.std(clean_data, ddof=1) / np.mean(clean_data) * 100),
          'range': float(np.max(clean_data) - np.min(clean_data)),
          'iqr': float(np.percentile(clean_data, 75) - np.percentile(clean_data, 25))
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as DescriptiveStatsResult
  }

  /**
   * 정규성 검정 (Shapiro-Wilk, Anderson-Darling, Jarque-Bera)
   */
  async normalityTest(data: number[], alpha: number = 0.05): Promise<NormalityTestResult> {
    await this.initialize()
    this.setData('data_array', data)
    this.setData('alpha', alpha)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 3:
        py_result = {'error': 'Insufficient data for normality test'}
      else:
        # Shapiro-Wilk 검정
        shapiro_stat, shapiro_p = stats.shapiro(clean_data)

        # Anderson-Darling 검정
        anderson_result = stats.anderson(clean_data, dist='norm')

        # Jarque-Bera 검정
        jb_stat, jb_p = stats.jarque_bera(clean_data)

        py_result = {
          'shapiroWilk': {
            'statistic': float(shapiro_stat),
            'pValue': float(shapiro_p),
            'isNormal': bool(shapiro_p > alpha)
          },
          'andersonDarling': {
            'statistic': float(anderson_result.statistic),
            'criticalValues': [float(cv) for cv in anderson_result.critical_values],
            'significanceLevels': [float(sl) for sl in anderson_result.significance_level],
            'isNormal': bool(anderson_result.statistic < anderson_result.critical_values[2])  # 5% 수준
          },
          'jarqueBera': {
            'statistic': float(jb_stat),
            'pValue': float(jb_p),
            'isNormal': bool(jb_p > alpha)
          },
          'sampleSize': int(len(clean_data))
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as NormalityTestResult
  }

  /**
   * Anderson-Darling 정규성 검정 (단일 메서드)
   * - SciPy는 p-value를 직접 제공하지 않으므로, 임계값 배열과 통계량의 위치로 근사 p-value를 산출합니다.
   */
  async andersonDarlingTest(data: number[]): Promise<{
    statistic: number
    criticalValues: number[]
    significanceLevels: number[]
    pValue: number
    isNormal: boolean
  }> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 3:
        py_result = {'error': 'Insufficient data for Anderson-Darling'}
      else:
        anderson_result = stats.anderson(clean_data, dist='norm')
        stat = float(anderson_result.statistic)
        crit = [float(cv) for cv in anderson_result.critical_values]
        levels = [float(sl) for sl in anderson_result.significance_level]

        # 근사 p-value 산출: 통계량이 통과하는 첫 임계값의 유의수준(%)을 p로 사용
        p_est = None
        for i in range(len(crit)):
          if stat < crit[i]:
            p_est = levels[i] / 100.0
            break
        if p_est is None:
          # 가장 엄격한 임계값보다 크면 p < 최저 유의수준, 보수적으로 절반으로 근사
          p_est = (levels[-1] / 100.0) / 2.0

        py_result = {
          'statistic': stat,
          'criticalValues': crit,
          'significanceLevels': levels,
          'pValue': float(p_est),
          'isNormal': bool(stat < crit[2])  # 통상 5% 기준
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }

  /**
   * D'Agostino-Pearson 정규성 검정 (scipy.stats.normaltest)
   */
  async dagostinoPearsonTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 8:
        py_result = {'error': "Insufficient data for D'Agostino-Pearson"}
      else:
        k2, p = stats.normaltest(clean_data)
        py_result = {
          'statistic': float(k2),
          'pValue': float(p),
          'isNormal': bool(p > 0.05)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }

  /**
   * 등분산성 검정 (Levene, Bartlett, Fligner-Killeen)
   */
  async homogeneityTest(groups: number[][], method: string = 'levene'): Promise<HomogeneityTestResult> {
    await this.initialize()
    this.setData('groups_data', groups)
    this.setData('test_method', method)

    const py_result = await this.runPythonSafely(`
      # 각 그룹에서 결측값 제거
      clean_groups = []
      for group in groups_data:
        clean_group = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean_group) > 0:
          clean_groups.append(clean_group)

      if len(clean_groups) < 2:
        py_result = {'error': 'At least 2 groups required'}
      elif any(len(group) < 2 for group in clean_groups):
        py_result = {'error': 'Each group must have at least 2 observations'}
      else:
        if test_method.lower() == 'levene':
          # Levene 검정 (중앙값 기준)
          test_stat, p_value = stats.levene(*clean_groups, center='median')
          method_name = 'Levene (median)'
        elif test_method.lower() == 'bartlett':
          # Bartlett 검정
          test_stat, p_value = stats.bartlett(*clean_groups)
          method_name = 'Bartlett'
        elif test_method.lower() == 'fligner':
          # Fligner-Killeen 검정
          test_stat, p_value = stats.fligner(*clean_groups)
          method_name = 'Fligner-Killeen'
        else:
          # 기본값: Levene 검정
          test_stat, p_value = stats.levene(*clean_groups, center='median')
          method_name = 'Levene (median)'

        py_result = {
          'statistic': float(test_stat),
          'pValue': float(p_value),
          'method': method_name,
          'isHomogeneous': bool(p_value > 0.05),
          'groups': len(clean_groups),
          'totalSampleSize': sum(len(group) for group in clean_groups)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as HomogeneityTestResult
  }

  /**
   * 이상치 탐지 (IQR, Z-score, Modified Z-score)
   */
  async outlierDetection(data: number[]): Promise<OutlierResult> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 4:
        py_result = {'error': 'Insufficient data for outlier detection'}
      else:
        # IQR 방법
        q1 = np.percentile(clean_data, 25)
        q3 = np.percentile(clean_data, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        # IQR 기준 이상치
        iqr_outlier_mask = (clean_data < lower_bound) | (clean_data > upper_bound)
        iqr_outliers = clean_data[iqr_outlier_mask]
        iqr_indices = np.where(iqr_outlier_mask)[0]

        # Z-score 방법 (|z| > 3)
        z_scores = np.abs(stats.zscore(clean_data))
        z_outlier_mask = z_scores > 3
        z_outliers = clean_data[z_outlier_mask]
        z_indices = np.where(z_outlier_mask)[0]

        # Modified Z-score 방법 (|Modified Z| > 3.5)
        median = np.median(clean_data)
        mad = np.median(np.abs(clean_data - median))
        modified_z_scores = 0.6745 * (clean_data - median) / mad if mad > 0 else np.zeros_like(clean_data)
        mod_z_outlier_mask = np.abs(modified_z_scores) > 3.5
        mod_z_outliers = clean_data[mod_z_outlier_mask]
        mod_z_indices = np.where(mod_z_outlier_mask)[0]

        py_result = {
          'method': 'Multiple methods (IQR, Z-score, Modified Z-score)',
          'iqr': {
            'outlierIndices': [int(i) for i in iqr_indices],
            'outlierValues': [float(v) for v in iqr_outliers],
            'bounds': {'lower': float(lower_bound), 'upper': float(upper_bound)},
            'threshold': 1.5
          },
          'zscore': {
            'outlierIndices': [int(i) for i in z_indices],
            'outlierValues': [float(v) for v in z_outliers],
            'threshold': 3.0
          },
          'modifiedZscore': {
            'outlierIndices': [int(i) for i in mod_z_indices],
            'outlierValues': [float(v) for v in mod_z_outliers],
            'threshold': 3.5
          },
          'summary': {
            'totalOutliers': len(set(iqr_indices) | set(z_indices) | set(mod_z_indices)),
            'sampleSize': int(len(clean_data))
          }
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    // 호환성을 위해 기본 형식도 제공
    const iqrData = result.iqr
    return {
      outlierIndices: iqrData.outlierIndices,
      outlierValues: iqrData.outlierValues,
      method: 'IQR',
      threshold: iqrData.threshold,
      bounds: iqrData.bounds,
      ...result
    } as OutlierResult
  }

  /**
   * Shapiro-Wilk 정규성 검정 (기존 API 호환성)
   */
  async shapiroWilkTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    const normalityResult = await this.normalityTest(data)
    return normalityResult.shapiroWilk
  }

  /**
   * IQR 방법으로 이상치 탐지 (기존 API 호환성)
   */
  async detectOutliersIQR(data: number[]): Promise<{
    q1: number
    q3: number
    iqr: number
    lowerBound: number
    upperBound: number
    mildOutliers: number[]
    extremeOutliers: number[]
  }> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 4:
        py_result = {'error': 'Insufficient data for outlier detection'}
      else:
        # 사분위수 계산
        q1 = np.percentile(clean_data, 25)
        q3 = np.percentile(clean_data, 75)
        iqr = q3 - q1

        # 경계값 계산
        mild_lower = q1 - 1.5 * iqr
        mild_upper = q3 + 1.5 * iqr
        extreme_lower = q1 - 3.0 * iqr
        extreme_upper = q3 + 3.0 * iqr

        # 이상치 분류
        mild_outliers = clean_data[
          ((clean_data < mild_lower) | (clean_data > mild_upper)) &
          ((clean_data >= extreme_lower) & (clean_data <= extreme_upper))
        ]

        extreme_outliers = clean_data[
          (clean_data < extreme_lower) | (clean_data > extreme_upper)
        ]

        py_result = {
          'q1': float(q1),
          'q3': float(q3),
          'iqr': float(iqr),
          'lowerBound': float(mild_lower),
          'upperBound': float(mild_upper),
          'mildOutliers': [float(x) for x in mild_outliers],
          'extremeOutliers': [float(x) for x in extreme_outliers]
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }

  /**
   * Levene 등분산성 검정 (기존 API 호환성)
   */
  async leveneTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    isHomogeneous: boolean
  }> {
    const homogeneityResult = await this.homogeneityTest(groups, 'levene')
    return {
      statistic: homogeneityResult.statistic,
      pValue: homogeneityResult.pValue,
      isHomogeneous: homogeneityResult.isHomogeneous
    }
  }

  /**
   * Bartlett 등분산성 검정 (기존 API 호환성)
   */
  async bartlettTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    isHomogeneous: boolean
  }> {
    const homogeneityResult = await this.homogeneityTest(groups, 'bartlett')
    return {
      statistic: homogeneityResult.statistic,
      pValue: homogeneityResult.pValue,
      isHomogeneous: homogeneityResult.isHomogeneous
    }
  }

  /**
   * Kolmogorov-Smirnov 검정 (정규분포 대비)
   */
  async kolmogorovSmirnovTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    await this.initialize()
    this.setData('data_array', data)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 3:
        py_result = {'error': 'Insufficient data for KS test'}
      else:
        # 표준화
        normalized_data = (clean_data - np.mean(clean_data)) / np.std(clean_data)

        # KS 검정 (정규분포와 비교)
        ks_stat, ks_p = stats.kstest(normalized_data, 'norm')

        py_result = {
          'statistic': float(ks_stat),
          'pValue': float(ks_p),
          'isNormal': bool(ks_p > 0.05),
          'sampleSize': int(len(clean_data))
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }
}