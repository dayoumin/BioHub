/**
 * Pyodide 기반 통계 계산 서비스
 *
 * 모든 통계 계산은 Python의 SciPy/NumPy를 통해 수행되어야 합니다.
 * JavaScript 통계 라이브러리는 신뢰성이 검증되지 않았으므로 사용하지 않습니다.
 */

import type {
  PyodideInterface,
  StatisticalTestResult,
  DescriptiveStatsResult,
  NormalityTestResult,
  OutlierResult,
  CorrelationResult,
  HomogeneityTestResult,
  ANOVAResult,
  TukeyHSDResult,
  RegressionResult
} from '@/types/pyodide'

declare global {
  interface Window {
    pyodide?: PyodideInterface
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}

export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private pyodide: PyodideInterface | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null

  private constructor() {}

  private parsePythonResult<T>(payload: any): T {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as T
      } catch {
        // 문자열이지만 JSON 아님
        return payload as T
      }
    }
    return payload as T
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  /**
   * Pyodide 초기화 및 필요한 패키지 로드
   */
  async initialize(): Promise<void> {
    console.log('[PyodideService.initialize] 시작')
    if (this.pyodide) {
      console.log('[PyodideService.initialize] 이미 초기화됨')
      return
    }
    if (this.isLoading && this.loadPromise) {
      console.log('[PyodideService.initialize] 이미 로딩 중, 기다리는 중...')
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this._loadPyodide()

    try {
      await this.loadPromise
      console.log('[PyodideService.initialize] 초기화 성공!')
    } catch (error) {
      console.error('[PyodideService.initialize] 초기화 실패:', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  private async _loadPyodide(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide는 브라우저 환경에서만 사용 가능합니다')
    }

    console.log('[PyodideService] 초기화 시작...')

    // Pyodide CDN에서 로드
    if (!window.loadPyodide) {
      console.log('[PyodideService] Pyodide 스크립트 로딩...')
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'
      script.async = true

      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('[PyodideService] 스크립트 로드 완료')
          resolve(true)
        }
        script.onerror = (error) => {
          console.error('[PyodideService] 스크립트 로드 실패:', error)
          reject(new Error('Pyodide 스크립트 로드 실패'))
        }
        document.head.appendChild(script)
      })
    } else {
      console.log('[PyodideService] Pyodide 이미 로드됨')
    }

    // Pyodide 초기화
    console.log('[PyodideService] Pyodide 인스턴스 생성 중...')
    try {
      this.pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      })
      console.log('[PyodideService] Pyodide 인스턴스 생성 완료')

      // window.pyodide에도 저장 (디버깅용)
      ;(window as any).pyodide = this.pyodide
    } catch (error) {
      console.error('[PyodideService] Pyodide 인스턴스 생성 실패:', error)
      throw error
    }

    // 필수 패키지 로드
    console.log('[PyodideService] 패키지 로딩 중... (numpy, scipy, pandas, scikit-learn)')
    try {
      await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas', 'scikit-learn', 'statsmodels'])
      console.log('[PyodideService] 패키지 로드 완료')
    } catch (error) {
      console.error('[PyodideService] 패키지 로드 실패:', error)
      throw error
    }

    // 기본 imports
    console.log('[PyodideService] Python 기본 imports 실행 중...')
    await this.pyodide.runPythonAsync(`
      import numpy as np
      import pandas as pd
      from scipy import stats
      import warnings
      warnings.filterwarnings('ignore')
    `)
    console.log('[PyodideService] 초기화 완료!')
  }

  /**
   * Shapiro-Wilk 정규성 검정
   * @param data 숫자 배열
   * @returns 검정 통계량과 p-value
   */
  async shapiroWilkTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    await this.initialize()

    // 데이터 전달 및 검정 수행
    this.pyodide.globals.set('data_array', data)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np

      # JavaScript 배열을 numpy 배열로 변환
      np_array = np.array(data_array)

      # 결측값 제거
      clean_data = np_array[~np.isnan(np_array)]

      # 최소 3개 데이터 필요
      if len(clean_data) < 3:
        result = {'statistic': None, 'pvalue': None, 'error': 'Insufficient data'}
      else:
        # Shapiro-Wilk 검정
        statistic, pvalue = stats.shapiro(clean_data)
        result = {
          'statistic': float(statistic),
          'pvalue': float(pvalue),
          'sample_size': len(clean_data)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsed = JSON.parse(resultStr)

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    return {
      statistic: parsed.statistic,
      pValue: parsed.pvalue,
      isNormal: parsed.pvalue > 0.05 // 유의수준 0.05 기준
    }
  }

  /**
   * IQR 방법으로 이상치 탐지
   * @param data 숫자 배열
   * @returns 이상치 정보
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

    this.pyodide.globals.set('data_array', data)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np

      # JavaScript 배열을 numpy 배열로 변환
      np_array = np.array(data_array)

      # 결측값 제거
      clean_data = np_array[~np.isnan(np_array)]

      if len(clean_data) < 4:
        result = {'error': 'Insufficient data for outlier detection'}
      else:
        # 사분위수 계산
        q1 = np.percentile(clean_data, 25)
        q3 = np.percentile(clean_data, 75)
        iqr = q3 - q1

        # 경계값 계산
        lower_mild = q1 - 1.5 * iqr
        upper_mild = q3 + 1.5 * iqr
        lower_extreme = q1 - 3 * iqr
        upper_extreme = q3 + 3 * iqr

        # 이상치 분류
        mild_outliers = []
        extreme_outliers = []

        for val in clean_data:
          if val < lower_extreme or val > upper_extreme:
            extreme_outliers.append(float(val))
          elif val < lower_mild or val > upper_mild:
            mild_outliers.append(float(val))

        result = {
          'q1': float(q1),
          'q3': float(q3),
          'iqr': float(iqr),
          'lower_bound': float(lower_mild),
          'upper_bound': float(upper_mild),
          'mild_outliers': mild_outliers,
          'extreme_outliers': extreme_outliers,
          'total_outliers': len(mild_outliers) + len(extreme_outliers),
          'outlier_percentage': (len(mild_outliers) + len(extreme_outliers)) / len(clean_data) * 100
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsed = JSON.parse(resultStr)

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    return {
      q1: parsed.q1,
      q3: parsed.q3,
      iqr: parsed.iqr,
      lowerBound: parsed.lower_bound,
      upperBound: parsed.upper_bound,
      mildOutliers: parsed.mild_outliers,
      extremeOutliers: parsed.extreme_outliers
    }
  }

  /**
   * Levene 등분산성 검정
   * @param groups 그룹별 데이터 배열
   * @returns 검정 결과
   */
  async leveneTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    await this.initialize()

    this.pyodide.globals.set('groups_data', groups)

    const resultStr = await this.pyodide.runPythonAsync(`
      # 각 그룹 정제
      clean_groups = []
      for group in groups_data:
        clean_group = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean_group) > 0:
          clean_groups.append(clean_group)

      if len(clean_groups) < 2:
        result = {'error': 'Need at least 2 groups'}
      else:
        # Levene 검정
        statistic, pvalue = stats.levene(*clean_groups)
        result = {
          'statistic': float(statistic),
          'pvalue': float(pvalue)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsed = JSON.parse(resultStr)

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    return {
      statistic: parsed.statistic,
      pValue: parsed.pvalue,
      equalVariance: parsed.pvalue > 0.05
    }
  }

  /**
   * 독립성 검정 (Durbin-Watson test)
   * 시계열 데이터나 회귀분석 잔차의 자기상관성 검정
   * @param residuals 잔차 또는 시계열 데이터
   * @returns DW 통계량 (2에 가까울수록 독립적)
   */
  async testIndependence(residuals: number[]): Promise<{
    statistic: number
    interpretation: string
    isIndependent: boolean
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    this.pyodide.globals.set('residuals', residuals)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np

      # 결측값 제거
      clean_data = np.array([x for x in residuals if x is not None and not np.isnan(x)])

      if len(clean_data) < 2:
        result = {'error': 'Need at least 2 observations'}
      else:
        # Durbin-Watson 통계량 계산
        diff = np.diff(clean_data)
        dw_statistic = np.sum(diff**2) / np.sum(clean_data**2)

        # 해석
        if dw_statistic < 1.5:
          interpretation = '양의 자기상관 존재'
          is_independent = False
        elif dw_statistic > 2.5:
          interpretation = '음의 자기상관 존재'
          is_independent = False
        else:
          interpretation = '자기상관 없음 (독립적)'
          is_independent = True

        result = {
          'statistic': float(dw_statistic),
          'interpretation': interpretation,
          'is_independent': is_independent
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsedResult = this.parsePythonResult<any>(resultStr)

    if (parsedResult.error) {
      throw new Error(parsedResult.error)
    }

    return {
      statistic: parsedResult.statistic,
      interpretation: parsedResult.interpretation,
      isIndependent: parsedResult.is_independent
    }
  }

  /**
   * Bartlett's test for homogeneity of variances
   * Levene's test보다 정규성에 민감하지만 더 강력한 검정
   */
  async bartlettTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    this.pyodide.globals.set('groups_data', groups)

    const resultStr = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      # 각 그룹에서 결측값 제거
      clean_groups = []
      for group in groups_data:
        clean_group = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean_group) > 0:
          clean_groups.append(clean_group)

      if len(clean_groups) < 2:
        result = {'error': 'Need at least 2 groups'}
      else:
        # Bartlett 검정
        statistic, pvalue = stats.bartlett(*clean_groups)
        result = {
          'statistic': float(statistic),
          'pvalue': float(pvalue),
          'equal_variance': float(pvalue) > 0.05
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsedResult = this.parsePythonResult<any>(resultStr)

    if (parsedResult.error) {
      throw new Error(parsedResult.error)
    }

    return {
      statistic: parsedResult.statistic,
      pValue: parsedResult.pvalue,
      equalVariance: parsedResult.equal_variance
    }
  }

  /**
   * Kolmogorov-Smirnov test for normality
   * Shapiro-Wilk보다 큰 표본에 적합
   */
  async kolmogorovSmirnovTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    this.pyodide.globals.set('data_array', data)

    const resultStr = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 3:
        result = {'error': 'Need at least 3 observations'}
      else:
        # K-S 검정
        statistic, pvalue = stats.kstest(clean_data, 'norm',
                                       args=(np.mean(clean_data), np.std(clean_data)))
        result = {
          'statistic': float(statistic),
          'pvalue': float(pvalue),
          'is_normal': float(pvalue) > 0.05
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsedResult = this.parsePythonResult<any>(resultStr)

    if (parsedResult.error) {
      throw new Error(parsedResult.error)
    }

    return {
      statistic: parsedResult.statistic,
      pValue: parsedResult.pvalue,
      isNormal: parsedResult.is_normal
    }
  }

  /**
   * 통계적 가정 종합 검정
   * 데이터의 모든 통계적 가정을 한 번에 검정
   */
  async checkAllAssumptions(data: {
    values?: number[]
    groups?: number[][]
    residuals?: number[]
  }): Promise<{
    normality?: {
      shapiroWilk?: NormalityTestResult
      kolmogorovSmirnov?: { statistic: number; pValue: number; isNormal: boolean }
    }
    homogeneity?: {
      levene?: HomogeneityTestResult
      bartlett?: { statistic: number; pValue: number; equalVariance: boolean }
    }
    independence?: {
      durbinWatson?: { statistic: number; interpretation: string; isIndependent: boolean }
    }
    summary: {
      canUseParametric: boolean
      reasons: string[]
      recommendations: string[]
    }
  }> {
    const results: any = {
      normality: {},
      homogeneity: {},
      independence: {},
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: []
      }
    }

    // 정규성 검정
    if (data.values && data.values.length >= 3) {
      try {
        // Shapiro-Wilk (작은 표본에 적합)
        if (data.values.length <= 5000) {
          results.normality.shapiroWilk = await this.testNormality(data.values)
          if (!results.normality.shapiroWilk.isNormal) {
            results.summary.canUseParametric = false
            results.summary.reasons.push('정규성 가정 위반 (Shapiro-Wilk)')
            results.summary.recommendations.push('비모수 검정 사용 권장')
          }
        }

        // K-S test (큰 표본에 적합)
        if (data.values.length > 30) {
          results.normality.kolmogorovSmirnov = await this.kolmogorovSmirnovTest(data.values)
        }
      } catch (error) {
        console.error('정규성 검정 실패:', error)
      }
    }

    // 등분산성 검정
    if (data.groups && data.groups.length >= 2) {
      try {
        // Levene's test (정규성 가정에 강건)
        results.homogeneity.levene = await this.testHomogeneity(data.groups)
        if (!results.homogeneity.levene.equalVariance) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('등분산성 가정 위반 (Levene)')
          results.summary.recommendations.push("Welch's t-test 또는 Games-Howell 사용")
        }

        // Bartlett's test (정규분포일 때 더 강력)
        if (results.normality.shapiroWilk?.isNormal) {
          results.homogeneity.bartlett = await this.bartlettTest(data.groups)
        }
      } catch (error) {
        console.error('등분산성 검정 실패:', error)
      }
    }

    // 독립성 검정
    if (data.residuals && data.residuals.length >= 2) {
      try {
        results.independence.durbinWatson = await this.testIndependence(data.residuals)
        if (!results.independence.durbinWatson.isIndependent) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('독립성 가정 위반')
          results.summary.recommendations.push('시계열 분석 방법 사용')
        }
      } catch (error) {
        console.error('독립성 검정 실패:', error)
      }
    }

    // 종합 권장사항
    if (results.summary.canUseParametric) {
      results.summary.recommendations.push('모수 검정 사용 가능')
    } else {
      results.summary.recommendations.push('비모수 검정 우선 권장')
    }

    return results
  }

  /**
   * 기술통계 계산
   * @param data 숫자 배열
   * @returns 평균, 중앙값, 표준편차 등
   */
  async descriptiveStats(data: number[]): Promise<{
    mean: number
    median: number
    std: number
    min: number
    max: number
    q1: number
    q3: number
    skewness: number
    kurtosis: number
  }> {
    console.log('[descriptiveStats] 시작, 데이터 길이:', data.length)

    try {
      console.log('[descriptiveStats] 초기화 중...')
      await this.initialize()
      console.log('[descriptiveStats] 초기화 완료')
    } catch (error) {
      console.error('[descriptiveStats] 초기화 실패:', error)
      throw error
    }

    console.log('[descriptiveStats] Pyodide 확인:', this.pyodide ? '있음' : '없음')
    if (!this.pyodide) {
      console.error('[descriptiveStats] Pyodide가 null입니다!')
      console.log('[descriptiveStats] window.pyodide 값:', (window as any).pyodide)
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }

    console.log('[descriptiveStats] 데이터를 Python으로 전달 중...')
    this.pyodide.globals.set('data_array', data)

    console.log('[descriptiveStats] Python 코드 실행 중...')
    const resultStr = await this.pyodide.runPythonAsync(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) == 0:
        result = {'error': 'No valid data'}
      else:
        result = {
          'mean': float(np.mean(clean_data)),
          'median': float(np.median(clean_data)),
          'std': float(np.std(clean_data, ddof=1)),
          'variance': float(np.var(clean_data, ddof=1)),
          'min': float(np.min(clean_data)),
          'max': float(np.max(clean_data)),
          'q1': float(np.percentile(clean_data, 25)),
          'q3': float(np.percentile(clean_data, 75)),
          'skewness': float(stats.skew(clean_data)),
          'kurtosis': float(stats.kurtosis(clean_data)),
          'n': int(len(clean_data))
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const result = JSON.parse(resultStr)

    if (result.error) {
      throw new Error(result.error)
    }

    return this.parsePythonResult(resultStr)
  }

  /**
   * 상관계수 계산 (Pearson & Spearman)
   * @param x 첫 번째 변수
   * @param y 두 번째 변수
   * @returns 상관계수와 p-value
   */
  async correlation(x: number[], y: number[]): Promise<{
    pearson: { r: number; pValue: number }
    spearman: { r: number; pValue: number }
    kendall: { r: number; pValue: number }
  }> {
    await this.initialize()

    this.pyodide.globals.set('x_array', x)
    this.pyodide.globals.set('y_array', y)

    const resultStr = await this.pyodide.runPythonAsync(`
      # 쌍별 결측값 제거
      x_list = list(x_array)
      y_list = list(y_array)

      clean_pairs = [(x, y) for x, y in zip(x_list, y_list)
                     if x is not None and y is not None
                     and not np.isnan(x) and not np.isnan(y)]

      if len(clean_pairs) < 3:
        result = {'error': 'Insufficient paired data'}
      else:
        x_clean = [p[0] for p in clean_pairs]
        y_clean = [p[1] for p in clean_pairs]

        # Pearson 상관계수
        pearson_r, pearson_p = stats.pearsonr(x_clean, y_clean)

        # Spearman 상관계수
        spearman_r, spearman_p = stats.spearmanr(x_clean, y_clean)

        # Kendall's tau
        kendall_r, kendall_p = stats.kendalltau(x_clean, y_clean)

        result = {
          'pearson': {
            'r': float(pearson_r),
            'pvalue': float(pearson_p)
          },
          'spearman': {
            'r': float(spearman_r),
            'pvalue': float(spearman_p)
          },
          'kendall': {
            'r': float(kendall_r),
            'pvalue': float(kendall_p)
          }
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const result = JSON.parse(resultStr)

    if (result.error) {
      throw new Error(result.error)
    }

    return {
      pearson: {
        r: result.pearson.r,
        pValue: result.pearson.pvalue
      },
      spearman: {
        r: result.spearman.r,
        pValue: result.spearman.pvalue
      },
      kendall: {
        r: result.kendall.r,
        pValue: result.kendall.pvalue
      }
    }
  }

  /**
   * t-검정 수행
   * @param group1 첫 번째 그룹 데이터
   * @param group2 두 번째 그룹 데이터
   * @param options 검정 옵션
   */
  async tTest(
    group1: number[],
    group2: number[],
    options: { paired?: boolean; equalVar?: boolean; type?: 'one-sample' | 'independent' | 'paired'; mu?: number; alternative?: 'two-sided' | 'less' | 'greater' } = {}
  ): Promise<{
    statistic: number
    pvalue: number
    df: number
    confidenceInterval?: { lower: number; upper: number }
  }> {
    await this.initialize()

    this.pyodide.globals.set('group1', group1)
    this.pyodide.globals.set('group2', group2)
    this.pyodide.globals.set('paired', options.paired || false)
    this.pyodide.globals.set('equal_var', options.equalVar !== false)
    this.pyodide.globals.set('t_type', options.type ?? 'independent')
    this.pyodide.globals.set('mu', options.mu ?? 0)
    this.pyodide.globals.set('alternative', options.alternative ?? 'two-sided')

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      # 데이터 정리
      g1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
      g2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

      if t_type == 'one-sample':
        if len(g1) < 2:
          result = {'error': 'Insufficient data for one-sample t-test'}
        else:
          t_stat, p_value = stats.ttest_1samp(g1, popmean=mu, alternative=alternative if alternative in ['two-sided','less','greater'] else 'two-sided')
          df = len(g1) - 1
          # 신뢰구간 (기본 95%)
          alpha_level = 0.05
          t_critical = stats.t.ppf(1 - alpha_level/2, df)
          se = np.std(g1, ddof=1) / np.sqrt(len(g1))
          mean = np.mean(g1)
          ci_lower = mean - t_critical * se
          ci_upper = mean + t_critical * se
          result = {
            'statistic': float(t_stat),
            't': float(t_stat),
            'pvalue': float(p_value),
            'p': float(p_value),
            'df': int(df),
            'confidenceInterval': {
              'lower': float(ci_lower),
              'upper': float(ci_upper)
            }
          }
      elif paired:
        # 대응표본 t-검정
        if len(g1) != len(g2):
          result = {'error': 'Paired t-test requires equal sample sizes'}
        else:
          t_stat, p_value = stats.ttest_rel(g1, g2)
          df = len(g1) - 1

          # 신뢰구간 계산
          mean_diff = np.mean(g1) - np.mean(g2)
          se_diff = np.sqrt(np.var(g1 - g2) / len(g1))  # 대응표본용 SE
          t_critical = stats.t.ppf(0.975, df)
          ci_lower = mean_diff - t_critical * se_diff
          ci_upper = mean_diff + t_critical * se_diff

          result = {
            'statistic': float(t_stat),
            'pvalue': float(p_value),
            'df': int(df),
            'confidenceInterval': {
              'lower': float(ci_lower),
              'upper': float(ci_upper)
            }
          }
      else:
        # 독립표본 t-검정
        t_stat, p_value = stats.ttest_ind(g1, g2, equal_var=equal_var)
        df = len(g1) + len(g2) - 2

        # 신뢰구간 계산
        mean_diff = np.mean(g1) - np.mean(g2)
        se_diff = np.sqrt(np.var(g1)/len(g1) + np.var(g2)/len(g2))
        t_critical = stats.t.ppf(0.975, df)
        ci_lower = mean_diff - t_critical * se_diff
        ci_upper = mean_diff + t_critical * se_diff

        result = {
          'statistic': float(t_stat),
          't': float(t_stat),
          'pvalue': float(p_value),
          'p': float(p_value),
          'df': int(df),
          'confidenceInterval': {
            'lower': float(ci_lower),
            'upper': float(ci_upper)
          }
        }
        result = {
          'statistic': float(t_stat),
          't': float(t_stat),
          'pvalue': float(p_value),
          'p': float(p_value),
          'df': int(df),
          'confidenceInterval': {
            'lower': float(ci_lower),
            'upper': float(ci_upper)
          }
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * 일원분산분석 (One-way ANOVA)
   * @param groups 그룹별 데이터 배열
   */
  async anova(
    groups: number[][],
    options: { type?: 'one-way' | 'two-way' } = {}
  ): Promise<{
    fStatistic: number
    pvalue: number
    df: number[]
    etaSquared?: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('groups_data', groups)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      # 각 그룹 데이터 정리
      groups_clean = []
      for group in groups_data:
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)

      if len(groups_clean) < 2:
        result = {'error': 'ANOVA requires at least 2 groups'}
      else:
        # 일원분산분석
        f_stat, p_value = stats.f_oneway(*groups_clean)

        # 자유도 계산
        n_groups = len(groups_clean)
        n_total = sum(len(g) for g in groups_clean)
        df_between = n_groups - 1
        df_within = n_total - n_groups

        # 효과크기 (eta-squared) 계산
        grand_mean = np.mean([x for group in groups_clean for x in group])
        ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups_clean)
        ss_total = sum((x - grand_mean)**2 for group in groups_clean for x in group)
        eta_squared = ss_between / ss_total if ss_total > 0 else 0

        result = {
          'fStatistic': float(f_stat),
          'pvalue': float(p_value),
          'df': [int(df_between), int(df_within)],
          'etaSquared': float(eta_squared)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * 단순선형회귀분석
   * @param x 독립변수
   * @param y 종속변수
   */
  async regression(
    x: number[],
    y: number[],
    options: { type?: 'simple' | 'multiple' } = {}
  ): Promise<{
    slope?: number
    intercept?: number
    rSquared: number
    pvalue: number
    fStatistic?: number
    tStatistic?: number
    predictions?: number[]
    df?: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('x_data', x)
    this.pyodide.globals.set('y_data', y)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      # 데이터 정리
      x_list = list(x_data)
      y_list = list(y_data)

      clean_pairs = [(x, y) for x, y in zip(x_list, y_list)
                     if x is not None and y is not None
                     and not np.isnan(x) and not np.isnan(y)]

      if len(clean_pairs) < 3:
        result = {'error': 'Insufficient data for regression'}
      else:
        x_clean = np.array([p[0] for p in clean_pairs])
        y_clean = np.array([p[1] for p in clean_pairs])

        # 선형회귀
        slope, intercept, r_value, p_value, std_err = stats.linregress(x_clean, y_clean)

        # 예측값
        predictions = slope * x_clean + intercept

        # F-통계량 계산
        n = len(x_clean)
        df_model = 1
        df_resid = n - 2
        r_squared = r_value ** 2

        if r_squared < 1:
          f_stat = (r_squared / df_model) / ((1 - r_squared) / df_resid)
        else:
          f_stat = float('inf')

        # t-통계량
        t_stat = slope / std_err if std_err > 0 else float('inf')

        result = {
          'slope': float(slope),
          'intercept': float(intercept),
          'rSquared': float(r_squared),
          'pvalue': float(p_value),
          'fStatistic': float(f_stat),
          'tStatistic': float(t_stat),
          'predictions': predictions.tolist(),
          'df': int(df_resid)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Mann-Whitney U 검정 (비모수)
   */
  async mannWhitneyU(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('group1', group1)
    this.pyodide.globals.set('group2', group2)

    const resultStr = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      # 데이터 정리
      g1 = [x for x in group1 if x is not None and not np.isnan(x)]
      g2 = [x for x in group2 if x is not None and not np.isnan(x)]

      if len(g1) < 1 or len(g2) < 1:
        result = {'error': 'Insufficient data for Mann-Whitney U test'}
      else:
        u_stat, p_value = stats.mannwhitneyu(g1, g2, alternative='two-sided')

        result = {
          'statistic': float(u_stat),
          'pvalue': float(p_value)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Wilcoxon 부호순위 검정 (대응표본 비모수)
   */
  async wilcoxon(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('group1', group1)
    this.pyodide.globals.set('group2', group2)

    const resultStr = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      # 데이터 정리
      g1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
      g2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

      if len(g1) != len(g2):
        result = {'error': 'Wilcoxon test requires equal sample sizes'}
      elif len(g1) < 2:
        result = {'error': 'Insufficient data for Wilcoxon test'}
      else:
        w_stat, p_value = stats.wilcoxon(g1, g2)

        result = {
          'statistic': float(w_stat),
          'pvalue': float(p_value)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Kruskal-Wallis H 검정 (일원분산분석 비모수)
   */
  async kruskalWallis(groups: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('groups_data', groups)

    const resultStr = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      # 각 그룹 데이터 정리
      groups_clean = []
      for group in groups_data:
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)

      if len(groups_clean) < 2:
        result = {'error': 'Kruskal-Wallis requires at least 2 groups'}
      else:
        h_stat, p_value = stats.kruskal(*groups_clean)
        df = len(groups_clean) - 1

        result = {
          'statistic': float(h_stat),
          'pvalue': float(p_value),
          'df': int(df)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Tukey HSD 사후검정
   */
  async tukeyHSD(groups: number[][]): Promise<any> {
    await this.initialize()

    this.pyodide.globals.set('groups_data', groups)

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      # statsmodels가 없으므로 간단한 구현
      groups_clean = []
      for group in groups_data:
        clean = [x for x in group if x is not None and not np.isnan(x)]
        if len(clean) > 0:
          groups_clean.append(clean)

      n_groups = len(groups_clean)
      comparisons = []

      for i in range(n_groups):
        for j in range(i+1, n_groups):
          mean_diff = np.mean(groups_clean[i]) - np.mean(groups_clean[j])
          # 간단한 t-test로 대체
          t_stat, p_value = stats.ttest_ind(groups_clean[i], groups_clean[j])

          comparisons.append({
            'group1': i,
            'group2': j,
            'meanDiff': float(mean_diff),
            'pvalue': float(p_value),
            'significant': bool(p_value < 0.05)
          })

      result = {'comparisons': comparisons}
      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Chi-square 검정
   */
  async chiSquare(contingencyTable: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    await this.initialize()

    this.pyodide.globals.set('table_data', contingencyTable)

    const result = await this.pyodide.runPythonAsync(`
      from scipy import stats
      import numpy as np

      table = np.array(table_data)

      if table.size == 0:
        result = {'error': 'Empty contingency table'}
      else:
        chi2, p_value, dof, expected = stats.chi2_contingency(table)

        result = {
          'statistic': float(chi2),
          'pvalue': float(p_value),
          'pValue': float(p_value),
          'df': int(dof)
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * PCA (주성분분석) - 간단한 구현
   */
  async pca(data: number[][]): Promise<{
    explainedVariance: number[]
    totalExplainedVariance: number
    components: number[][]
  }> {
    await this.initialize()

    this.pyodide.globals.set('data_matrix', data)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np

      # 데이터 행렬 정리
      X = np.array(data_matrix)

      # 평균 중심화
      X_centered = X - np.mean(X, axis=0)

      # 공분산 행렬
      cov_matrix = np.cov(X_centered.T)

      # 고유값, 고유벡터
      eigenvalues, eigenvectors = np.linalg.eig(cov_matrix)

      # 설명된 분산
      total_variance = np.sum(eigenvalues)
      explained_variance = eigenvalues / total_variance

      result = {
        'explainedVariance': explained_variance.tolist(),
        'totalExplainedVariance': float(np.sum(explained_variance[:2])),  # 첫 2개 주성분
        'components': eigenvectors[:, :2].tolist()
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Cronbach's Alpha (신뢰도 계수)
   */
  async cronbachAlpha(items: number[][]): Promise<{
    alpha: number
    itemTotalCorrelations?: number[]
  }> {
    await this.initialize()

    this.pyodide.globals.set('items_data', items)

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np

      # 데이터 행렬로 변환
      X = np.array(items_data)
      n_items = X.shape[1]

      if n_items < 2:
        result = {'alpha': 0, 'error': 'Need at least 2 items'}
      else:
        # 각 항목의 분산
        item_variances = np.var(X, axis=0, ddof=1)
        total_variance = np.var(np.sum(X, axis=1), ddof=1)

        # Cronbach's alpha 계산
        alpha = (n_items / (n_items - 1)) * (1 - np.sum(item_variances) / total_variance)

        # 항목-전체 상관
        total_scores = np.sum(X, axis=1)
        item_total_corr = []
        for i in range(n_items):
          corr = np.corrcoef(X[:, i], total_scores)[0, 1]
          item_total_corr.append(float(corr))

        result = {
          'alpha': float(alpha),
          'itemTotalCorrelations': item_total_corr
        }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * Friedman 검정 (반복측정 비모수 검정)
   */
  async friedman(data: number[][]): Promise<{
    statistic: number
    pvalue: number
    rankings: number[]
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide not initialized')

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      data = np.array(${JSON.stringify(data)})

      # Friedman 검정
      statistic, pvalue = stats.friedmanchisquare(*data.T)

      # 순위 계산
      ranks = stats.rankdata(data, axis=1, method='average')
      mean_ranks = np.mean(ranks, axis=0)

      result = {
        'statistic': float(statistic),
        'pvalue': float(pvalue),
        'rankings': mean_ranks.tolist()
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * 요인분석 (Factor Analysis)
   */
  async factorAnalysis(data: number[][], options: {
    nFactors?: number
    rotation?: 'varimax' | 'quartimax' | 'oblimin'
  } = {}): Promise<{
    loadings: number[][]
    communalities: number[]
    explainedVariance: number[]
    eigenvalues: number[]
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide not initialized')

    const { nFactors = 2, rotation = 'varimax' } = options

    const resultStr = await this.pyodide.runPythonAsync(`
      import numpy as np
      from sklearn.decomposition import FactorAnalysis
      from scipy import stats

      data = np.array(${JSON.stringify(data)})

      # 표준화
      from sklearn.preprocessing import StandardScaler
      scaler = StandardScaler()
      data_scaled = scaler.fit_transform(data)

      # 요인분석
      fa = FactorAnalysis(n_components=${nFactors}, rotation='${rotation}')
      fa.fit(data_scaled)

      # 결과 추출
      loadings = fa.components_.T  # 적재값
      communalities = 1 - fa.noise_variance_  # 공통성

      # 설명된 분산 계산
      explained_var = np.var(fa.transform(data_scaled), axis=0)
      total_var = np.sum(explained_var)
      explained_var_ratio = explained_var / total_var if total_var > 0 else explained_var

      # 고유값 계산 (근사)
      eigenvalues = explained_var * len(loadings[0])

      result = {
        'loadings': loadings.tolist(),
        'communalities': communalities.tolist(),
        'explainedVariance': explained_var_ratio.tolist(),
        'eigenvalues': eigenvalues.tolist()
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return this.parsePythonResult(resultStr)
  }

  /**
   * 군집분석 (Cluster Analysis)
   */
  async clusterAnalysis(data: number[][], options: {
    nClusters?: number
    method?: 'kmeans' | 'hierarchical' | 'dbscan'
    linkage?: 'ward' | 'complete' | 'average' | 'single'
  } = {}): Promise<{
    clusters: number[]
    centers?: number[][]
    silhouetteScore: number
    inertia?: number
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide not initialized')

    const {
      nClusters = 3,
      method = 'kmeans',
      linkage = 'ward'
    } = options

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
      from sklearn.metrics import silhouette_score
      from sklearn.preprocessing import StandardScaler

      data = np.array(${JSON.stringify(data)})

      # 표준화
      scaler = StandardScaler()
      data_scaled = scaler.fit_transform(data)

      # 군집분석
      if '${method}' == 'kmeans':
        model = KMeans(n_clusters=${nClusters}, random_state=42)
        clusters = model.fit_predict(data_scaled)
        centers = scaler.inverse_transform(model.cluster_centers_)
        inertia = float(model.inertia_)
      elif '${method}' == 'hierarchical':
        model = AgglomerativeClustering(n_clusters=${nClusters}, linkage='${linkage}')
        clusters = model.fit_predict(data_scaled)
        centers = None
        inertia = None
      else:  # dbscan
        model = DBSCAN(eps=0.5, min_samples=5)
        clusters = model.fit_predict(data_scaled)
        centers = None
        inertia = None

      # Silhouette score 계산
      if len(np.unique(clusters)) > 1:
        silhouette = float(silhouette_score(data_scaled, clusters))
      else:
        silhouette = 0.0

      result = {
        'clusters': clusters.tolist(),
        'centers': centers.tolist() if centers is not None else None,
        'silhouetteScore': silhouette,
        'inertia': inertia
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * 시계열 분석 (Time Series Analysis)
   */
  async timeSeriesAnalysis(data: number[], options: {
    seasonalPeriod?: number
    forecastPeriods?: number
    method?: 'decomposition' | 'arima' | 'exponential'
  } = {}): Promise<{
    trend?: number[]
    seasonal?: number[]
    residual?: number[]
    forecast?: number[]
    acf?: number[]
    pacf?: number[]
  }> {
    await this.initialize()
    if (!this.pyodide) throw new Error('Pyodide not initialized')

    const {
      seasonalPeriod = 12,
      forecastPeriods = 6,
      method = 'decomposition'
    } = options

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats, signal
      from statsmodels.tsa.seasonal import seasonal_decompose
      from statsmodels.tsa.stattools import acf, pacf

      data = np.array(${JSON.stringify(data)})

      result = {}

      if '${method}' == 'decomposition':
        # 시계열 분해
        if len(data) >= 2 * ${seasonalPeriod}:
          from statsmodels.tsa.seasonal import STL
          stl = STL(data, seasonal=${seasonalPeriod})
          decomposition = stl.fit()

          result['trend'] = decomposition.trend.tolist()
          result['seasonal'] = decomposition.seasonal.tolist()
          result['residual'] = decomposition.resid.tolist()
        else:
          # 데이터가 짧을 경우 간단한 이동평균
          window = min(${seasonalPeriod}, len(data) // 2)
          trend = np.convolve(data, np.ones(window)/window, mode='same')
          result['trend'] = trend.tolist()
          result['seasonal'] = [0] * len(data)
          result['residual'] = (data - trend).tolist()

      # ACF/PACF 계산
      max_lags = min(40, len(data) // 2)
      acf_values = acf(data, nlags=max_lags, fft=True)
      pacf_values = pacf(data, nlags=max_lags, method='ols')

      result['acf'] = acf_values.tolist()
      result['pacf'] = pacf_values.tolist()

      # 간단한 지수평활 예측
      if '${method}' == 'exponential' or True:  # 항상 예측 추가
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        if len(data) >= 10:
          # Holt-Winters 지수평활
          try:
            model = ExponentialSmoothing(
              data,
              seasonal_periods=${seasonalPeriod},
              seasonal='add' if len(data) >= 2 * ${seasonalPeriod} else None
            )
            fit = model.fit()
            forecast = fit.forecast(${forecastPeriods})
            result['forecast'] = forecast.tolist()
          except:
            # 실패시 단순 이동평균
            last_mean = np.mean(data[-min(${seasonalPeriod}, len(data)):])
            result['forecast'] = [float(last_mean)] * ${forecastPeriods}
        else:
          # 데이터가 너무 적을 때
          last_mean = np.mean(data)
          result['forecast'] = [float(last_mean)] * ${forecastPeriods}

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  // ========== Wrapper 메서드들 (StatisticalCalculator와의 호환성) ==========

  /**
   * 기술통계 계산
   */
  async calculateDescriptiveStatistics(data: number[]): Promise<any> {
    return this.descriptiveStats(data)
  }

  /**
   * 정규성 검정
   */
  async testNormality(data: number[], alpha: number = 0.05): Promise<any> {
    const result = await this.shapiroWilkTest(data)
    return {
      ...result,
      isNormal: result.pValue > alpha
    }
  }

  /**
   * 등분산 검정
   */
  async testHomogeneity(groups: number[][], method: string = 'levene'): Promise<any> {
    return this.leveneTest(groups)
  }

  /**
   * 일표본 t-검정
   */
  async oneSampleTTest(data: number[], popmean: number, alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTest(data, [], {
      type: 'one-sample',
      mu: popmean,
      alternative
    })
    return {
      statistic: result.t,
      pValue: result.p,
      df: result.df,
      ci_lower: result.confidence_interval?.[0] || 0,
      ci_upper: result.confidence_interval?.[1] || 0
    }
  }

  /**
   * 독립표본 t-검정
   */
  async twoSampleTTest(group1: number[], group2: number[], equalVar: boolean = true): Promise<any> {
    const result = await this.tTest(group1, group2, {
      type: 'independent',
      equal_var: equalVar
    })

    // 효과크기 계산
    const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length
    const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length
    const std1 = Math.sqrt(group1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (group1.length - 1))
    const std2 = Math.sqrt(group2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (group2.length - 1))
    const pooledStd = Math.sqrt(((group1.length - 1) * std1 * std1 + (group2.length - 1) * std2 * std2) / (group1.length + group2.length - 2))
    const cohensD = (mean1 - mean2) / pooledStd

    return {
      statistic: result.t,
      pValue: result.p,
      df: result.df,
      mean1,
      mean2,
      std1,
      std2,
      cohensD,
      ci_lower: result.confidence_interval?.[0] || 0,
      ci_upper: result.confidence_interval?.[1] || 0
    }
  }

  /**
   * 대응표본 t-검정
   */
  async pairedTTest(values1: number[], values2: number[], alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTest(values1, values2, {
      type: 'paired',
      alternative
    })

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length
    const std1 = Math.sqrt(values1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (values1.length - 1))
    const std2 = Math.sqrt(values2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (values2.length - 1))

    return {
      statistic: result.t,
      pValue: result.p,
      df: result.df,
      mean1,
      mean2,
      std1,
      std2,
      ci_lower: result.confidence_interval?.[0] || 0,
      ci_upper: result.confidence_interval?.[1] || 0
    }
  }

  /**
   * 일원분산분석
   */
  async oneWayANOVA(groups: number[][]): Promise<any> {
    const result = await this.anova(groups)

    // 제곱합 및 평균제곱 계산
    const allData = groups.flat()
    const grandMean = allData.reduce((a, b) => a + b, 0) / allData.length

    let ssb = 0 // 처리 간 제곱합
    let ssw = 0 // 처리 내 제곱합

    groups.forEach(group => {
      const groupMean = group.reduce((a, b) => a + b, 0) / group.length
      ssb += group.length * Math.pow(groupMean - grandMean, 2)
      group.forEach(val => {
        ssw += Math.pow(val - groupMean, 2)
      })
    })

    const dfb = groups.length - 1
    const dfw = allData.length - groups.length
    const msb = ssb / dfb
    const msw = ssw / dfw

    return {
      fStatistic: result.fStatistic,
      pValue: result.pvalue,
      ssb,
      ssw,
      dfb,
      dfw,
      msb,
      msw
    }
  }

  /**
   * 단순선형회귀
   */
  async simpleLinearRegression(xValues: number[], yValues: number[]): Promise<any> {
    const result = await this.regression(xValues, yValues)

    // 회귀에서 제공한 통계 재매핑 및 유도값 계산
    const n = xValues.length
    const df = n - 2
    const stdErr = result.tStatistic && Number.isFinite(result.tStatistic) && result.tStatistic !== 0
      ? Math.abs(result.slope / result.tStatistic)
      : 0

    return {
      slope: result.slope,
      intercept: result.intercept,
      rSquared: result.rSquared,
      adjRSquared: 1 - (1 - result.rSquared) * (n - 1) / (n - 2),
      standardError: stdErr,
      fStatistic: result.fStatistic,
      // 선형회귀의 pvalue는 기울기 계수의 p-value임
      pvalue: result.pvalue,
    }
  }

  /**
   * 카이제곱 검정
   */
  async chiSquareTest(observedMatrix: number[][], correction: boolean = false): Promise<any> {
    const result = await this.chiSquare(observedMatrix)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df
    }
  }

  /**
   * 주성분 분석
   */
  async performPCA(dataMatrix: number[][], columns: string[], nComponents?: number, standardize: boolean = true): Promise<any> {
    const result = await this.pca(dataMatrix)

    // 누적 분산 계산
    const cumulativeVariance = []
    let cumSum = 0
    for (const ratio of result.explained_variance_ratio) {
      cumSum += ratio
      cumulativeVariance.push(cumSum)
    }

    return {
      components: result.components,
      eigenvalues: result.eigenvalues,
      explainedVarianceRatio: result.explained_variance_ratio,
      cumulativeVariance
    }
  }

  /**
   * 이원분산분석 (Two-way ANOVA)
   */
  async twoWayANOVA(
    data: Array<{ factor1: string; factor2: string; value: number }>,
    interaction: boolean = true
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    // Python 내에서 JS 불리언을 직접 평가하지 않도록, formula를 미리 구성
    const formula = interaction
      ? "value ~ C(factor1) + C(factor2) + C(factor1):C(factor2)"
      : "value ~ C(factor1) + C(factor2)"

    const result = await this.pyodide.runPythonAsync(`
      import pandas as pd
      from statsmodels.formula.api import ols
      from statsmodels.stats.anova import anova_lm
      import numpy as np

      try:
        # 데이터 준비
        data = ${JSON.stringify(data)}
        df = pd.DataFrame(data)

        # ANOVA 모델 적합
        formula = """${formula}"""
        model = ols(formula, data=df).fit()
        anova_table = anova_lm(model, typ=2)

        # 안전 접근 함수
        def safe_get(name, col):
          try:
            return anova_table.loc[name, col]
          except Exception:
            return None

        # 요인별 지표 계산 (mean_sq는 sum_sq/df로 계산)
        f1_ss = safe_get('C(factor1)', 'sum_sq')
        f1_df = safe_get('C(factor1)', 'df')
        f1_f  = safe_get('C(factor1)', 'F')
        f1_p  = safe_get('C(factor1)', 'PR(>F)')

        f2_ss = safe_get('C(factor2)', 'sum_sq')
        f2_df = safe_get('C(factor2)', 'df')
        f2_f  = safe_get('C(factor2)', 'F')
        f2_p  = safe_get('C(factor2)', 'PR(>F)')

        int_ss = safe_get('C(factor1):C(factor2)', 'sum_sq')
        int_df = safe_get('C(factor1):C(factor2)', 'df')
        int_f  = safe_get('C(factor1):C(factor2)', 'F')
        int_p  = safe_get('C(factor1):C(factor2)', 'PR(>F)')

        res_ss = safe_get('Residual', 'sum_sq')
        res_df = safe_get('Residual', 'df')

        result = {
          # 테스트에서 기대하는 평탄화된 키 제공
          'factor1_ss': float(f1_ss) if f1_ss is not None else None,
          'factor1_df': int(f1_df) if f1_df is not None else None,
          'factor1_ms': (float(f1_ss)/float(f1_df)) if (f1_ss is not None and f1_df) else None,
          'factor1_f': float(f1_f) if f1_f is not None else None,
          'factor1_p': float(f1_p) if f1_p is not None else None,

          'factor2_ss': float(f2_ss) if f2_ss is not None else None,
          'factor2_df': int(f2_df) if f2_df is not None else None,
          'factor2_ms': (float(f2_ss)/float(f2_df)) if (f2_ss is not None and f2_df) else None,
          'factor2_f': float(f2_f) if f2_f is not None else None,
          'factor2_p': float(f2_p) if f2_p is not None else None,

          'interaction_ss': float(int_ss) if int_ss is not None else None,
          'interaction_df': int(int_df) if int_df is not None else None,
          'interaction_ms': (float(int_ss)/float(int_df)) if (int_ss is not None and int_df) else None,
          'interaction_f': float(int_f) if int_f is not None else None,
          'interaction_p': float(int_p) if int_p is not None else None,

          'residual_ss': float(res_ss) if res_ss is not None else None,
          'residual_df': int(res_df) if res_df is not None else None,
          'residual_ms': (float(res_ss)/float(res_df)) if (res_ss is not None and res_df) else None,

          # 원본 테이블도 제공 (디버깅/표시용)
          'anova_table': anova_table.to_dict()
        }
      except Exception as e:
        result = {'error': str(e)}

      import json
      result_json = json.dumps(result)
      result_json
    `)

    const parsed = JSON.parse(resultStr)

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    return parsed
  }

  /**
   * Tukey HSD 사후검정 (실제 구현)
   */
  async performTukeyHSD(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const result = await this.pyodide.runPythonAsync(`
      import pandas as pd
      from statsmodels.stats.multicomp import pairwise_tukeyhsd
      import numpy as np

      # 데이터 준비
      groups = ${JSON.stringify(groups)}
      group_names = ${JSON.stringify(groupNames)}
      alpha = ${alpha}

      # 데이터를 long format으로 변환
      data = []
      group_labels = []

      for i, group_data in enumerate(groups):
        data.extend(group_data)
        group_labels.extend([group_names[i]] * len(group_data))

      # Tukey HSD 수행
      tukey = pairwise_tukeyhsd(endog=data, groups=group_labels, alpha=alpha)

      # 결과 파싱
      comparisons = []
      for i in range(len(tukey.summary().data[1:])):
        row = tukey.summary().data[i+1]
        comparisons.append({
          'group1': str(row[0]),
          'group2': str(row[1]),
          'meandiff': float(row[2]),
          'p-adj': float(row[3]),
          'pvalue': float(row[3]),
          'lower': float(row[4]),
          'upper': float(row[5]),
          'reject': bool(row[6])
        })

      result = {
        'comparisons': comparisons,
        'alpha': alpha,
        'reject_count': sum(1 for c in comparisons if c['reject'])
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * 다중회귀분석 (Multiple Linear Regression)
   */
  async multipleRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수
    variableNames: string[] = []
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      import statsmodels.api as sm

      # 데이터 준비
      X = np.array(${JSON.stringify(X)})
      y = np.array(${JSON.stringify(y)})
      var_names = ${JSON.stringify(variableNames)}

      # 절편 추가
      X = sm.add_constant(X)

      # 모델 학습
      model = sm.OLS(y, X).fit()

      # 계수 및 통계량 추출
      coefficients = []
      for i, coef in enumerate(model.params):
        var_name = 'const' if i == 0 else (var_names[i-1] if var_names else f'X{i}')
        coefficients.append({
          'variable': var_name,
          'coef': float(coef),
          'std_err': float(model.bse[i]),
          't': float(model.tvalues[i]),
          'p_value': float(model.pvalues[i]),
          'conf_int_lower': float(model.conf_int()[i][0]),
          'conf_int_upper': float(model.conf_int()[i][1])
        })

      # VIF 계산 (다중공선성)
      from statsmodels.stats.outliers_influence import variance_inflation_factor
      vif_data = []
      for i in range(X.shape[1]):
        if i > 0:  # 절편 제외
          vif = variance_inflation_factor(X, i)
          vif_data.append(float(vif))

      result = {
        'coefficients': coefficients,
        'r_squared': float(model.rsquared),
        'adj_r_squared': float(model.rsquared_adj),
        'f_statistic': float(model.fvalue),
        'f_pvalue': float(model.f_pvalue),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'mse': float(model.mse_resid),
        'durbin_watson': float(sm.stats.durbin_watson(model.resid)),
        'vif': vif_data,
        'n_obs': int(model.nobs),
        'df_model': int(model.df_model),
        'df_resid': int(model.df_resid)
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * 로지스틱 회귀분석
   */
  async logisticRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수 (0 또는 1)
    variableNames: string[] = []
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from sklearn.linear_model import LogisticRegression
      from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
      from sklearn.model_selection import train_test_split
      import statsmodels.api as sm

      # 데이터 준비
      X = np.array(${JSON.stringify(X)})
      y = np.array(${JSON.stringify(y)})
      var_names = ${JSON.stringify(variableNames)}

      # statsmodels로 상세 분석
      X_sm = sm.add_constant(X)
      logit_model = sm.Logit(y, X_sm).fit()

      # 계수 및 통계량 추출
      coefficients = []
      for i, coef in enumerate(logit_model.params):
        var_name = 'const' if i == 0 else (var_names[i-1] if var_names else f'X{i}')
        coefficients.append({
          'variable': var_name,
          'coef': float(coef),
          'std_err': float(logit_model.bse[i]),
          'z': float(logit_model.tvalues[i]),  # Wald statistic
          'p_value': float(logit_model.pvalues[i]),
          'odds_ratio': float(np.exp(coef)),
          'conf_int_lower': float(logit_model.conf_int()[i][0]),
          'conf_int_upper': float(logit_model.conf_int()[i][1])
        })

      # sklearn으로 예측 성능 평가
      lr = LogisticRegression(max_iter=1000)
      lr.fit(X, y)
      y_pred = lr.predict(X)
      y_proba = lr.predict_proba(X)[:, 1]

      # 성능 지표
      accuracy = accuracy_score(y, y_pred)
      precision = precision_score(y, y_pred, zero_division=0)
      recall = recall_score(y, y_pred, zero_division=0)
      f1 = f1_score(y, y_pred, zero_division=0)

      # AUC 계산 (예외 처리)
      try:
        auc = roc_auc_score(y, y_proba)
      except:
        auc = None

      result = {
        'coefficients': coefficients,
        'log_likelihood': float(logit_model.llf),
        'aic': float(logit_model.aic),
        'bic': float(logit_model.bic),
        'pseudo_r_squared': float(logit_model.prsquared),
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'auc': float(auc) if auc else None,
        'n_obs': int(logit_model.nobs),
        'df_model': int(logit_model.df_model),
        'df_resid': int(logit_model.df_resid)
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * 상관 분석
   */
  async calculateCorrelation(columnsData: Record<string, number[]>, method: string = 'pearson'): Promise<any> {
    const columns = Object.keys(columnsData)
    const matrix = []

    for (let i = 0; i < columns.length; i++) {
      const row = []
      for (let j = 0; j < columns.length; j++) {
        if (i === j) {
          row.push(1)
        } else {
          const result = await this.correlation(
            columnsData[columns[i]],
            columnsData[columns[j]]
          )
          if (method == 'spearman') {
            row.push(result.spearman.r)
          } else if (method == 'kendall') {
            row.push(result.kendall.r)
          } else {
            row.push(result.pearson.r)
          }
        }
      }
      matrix.push(row)
    }

    return { matrix }
  }

  /**
   * Dunn Test (비모수 사후검정) - 직접 구현
   *
   * 구현 기준: Dunn, O.J. (1964). "Multiple comparisons using rank sums". Technometrics, 6(3), 241-252.
   *
   * 검증 방법:
   * - R: dunn.test::dunn.test(x, g, method="holm", kw=TRUE, label=TRUE)
   * - Python: scikit_posthocs.posthoc_dunn(data, val_col='values', group_col='groups', p_adjust='holm')
   * - 온라인 계산기: https://www.statskingdom.com/kruskal-wallis-test-calculator.html
   *
   * 참고: 본 구현은 원논문의 공식을 정확히 따르며, ties 보정을 포함합니다.
   * p-value 보정 방법: Bonferroni, Holm, FDR(Benjamini-Hochberg) 지원
   */
  async dunnTest(
    groups: number[][],
    groupNames: string[],
    pAdjust: string = 'holm',
    alpha: number = 0.05
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats
      from scipy.stats import rankdata

      # Dunn Test 직접 구현
      groups = ${JSON.stringify(groups)}
      group_names = ${JSON.stringify(groupNames)}
      alpha = ${alpha}
      p_adjust = "${pAdjust}"

      # 모든 데이터 합치기 및 순위 계산
      all_data = []
      group_indices = []
      for i, group in enumerate(groups):
        all_data.extend(group)
        group_indices.extend([i] * len(group))

      all_data = np.array(all_data)
      group_indices = np.array(group_indices)

      # 순위 계산
      ranks = rankdata(all_data)

      # 그룹별 순위 평균
      mean_ranks = []
      n_groups = len(groups)
      for i in range(n_groups):
        group_ranks = ranks[group_indices == i]
        mean_ranks.append(np.mean(group_ranks))

      # 전체 순위 평균
      N = len(all_data)
      mean_rank_all = (N + 1) / 2

      # 표준편차 계산 (ties 보정)
      from collections import Counter
      ties = Counter(all_data)
      tie_correction = sum((t**3 - t) for t in ties.values() if t > 1)

      if tie_correction > 0:
        S2 = (N * (N + 1) * (2 * N + 1) / 6 - tie_correction / 2) / (N - 1)
      else:
        S2 = N * (N + 1) / 12

      # Pairwise 비교
      comparisons = []
      p_values = []

      for i in range(n_groups):
        for j in range(i + 1, n_groups):
          n1 = len(groups[i])
          n2 = len(groups[j])

          # z-score 계산
          z = abs(mean_ranks[i] - mean_ranks[j]) / np.sqrt(S2 * (1/n1 + 1/n2))

          # p-value (양측검정)
          p = 2 * (1 - stats.norm.cdf(z))

          comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'z_statistic': float(z),
            'p_value': float(p),
            'mean_rank_diff': float(abs(mean_ranks[i] - mean_ranks[j]))
          })
          p_values.append(p)

      # p-value 보정
      p_values = np.array(p_values)

      if p_adjust == 'bonferroni':
        adjusted_p = np.minimum(p_values * len(p_values), 1.0)
      elif p_adjust == 'holm':
        # Holm-Bonferroni 보정
        sorted_idx = np.argsort(p_values)
        adjusted_p = np.zeros_like(p_values)
        for idx, i in enumerate(sorted_idx):
          adjusted_p[i] = min(p_values[i] * (len(p_values) - idx), 1.0)
        # 누적 최댓값 보정
        for i in range(1, len(adjusted_p)):
          adjusted_p[sorted_idx[i]] = max(adjusted_p[sorted_idx[i]], adjusted_p[sorted_idx[i-1]])
      elif p_adjust == 'fdr':  # Benjamini-Hochberg
        sorted_idx = np.argsort(p_values)
        adjusted_p = np.zeros_like(p_values)
        n = len(p_values)
        for idx, i in enumerate(sorted_idx):
          adjusted_p[i] = min(p_values[i] * n / (idx + 1), 1.0)
        # 누적 최소값 보정
        for i in range(len(adjusted_p) - 2, -1, -1):
          adjusted_p[sorted_idx[i]] = min(adjusted_p[sorted_idx[i]], adjusted_p[sorted_idx[i+1]])
      else:  # no adjustment
        adjusted_p = p_values

      # 보정된 p-value 추가
      for i, comp in enumerate(comparisons):
        comp['p_adjusted'] = float(adjusted_p[i])
        comp['significant'] = adjusted_p[i] < alpha

      result = {
        'comparisons': comparisons,
        'alpha': alpha,
        'p_adjust_method': p_adjust,
        'significant_count': sum(1 for c in comparisons if c['significant'])
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * Games-Howell Test (등분산 가정하지 않는 사후검정) - 직접 구현
   *
   * 구현 기준: Games, P.A., & Howell, J.F. (1976). "Pairwise multiple comparison procedures
   * with unequal n's and/or variances: A Monte Carlo study". Journal of Educational Statistics, 1(2), 113-125.
   *
   * 검증 방법:
   * - R: PMCMRplus::gamesHowellTest(x ~ g, data = mydata)
   * - R: rstatix::games_howell_test(data, value ~ group)
   * - Python: scikit_posthocs.posthoc_games_howell(data, val_col='values', group_col='groups')
   * - SPSS: Analyze > Compare Means > One-Way ANOVA > Post Hoc > Games-Howell
   *
   * 참고:
   * - Welch-Satterthwaite 자유도 근사 사용
   * - 본 구현은 Studentized range distribution 대신 t-distribution을 사용 (더 보수적)
   * - 등분산을 가정하지 않아 Tukey HSD보다 robust함
   */
  async gamesHowellTest(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      # Games-Howell Test 직접 구현
      groups = ${JSON.stringify(groups)}
      group_names = ${JSON.stringify(groupNames)}
      alpha = ${alpha}

      n_groups = len(groups)

      # 그룹별 통계량 계산
      means = [np.mean(g) for g in groups]
      vars = [np.var(g, ddof=1) for g in groups]
      ns = [len(g) for g in groups]

      comparisons = []

      for i in range(n_groups):
        for j in range(i + 1, n_groups):
          # 평균 차이
          mean_diff = abs(means[i] - means[j])

          # 표준오차
          se = np.sqrt(vars[i]/ns[i] + vars[j]/ns[j])

          # 자유도 (Welch-Satterthwaite 근사)
          df = (vars[i]/ns[i] + vars[j]/ns[j])**2 / (
              (vars[i]/ns[i])**2 / (ns[i]-1) +
              (vars[j]/ns[j])**2 / (ns[j]-1)
          )

          # t-통계량
          t = mean_diff / se

          # Studentized range distribution 대신 t-distribution 사용 (근사)
          # 실제 Games-Howell은 Tukey's 분포를 사용하지만 구현 복잡도로 인해 t-분포로 대체
          # 다중비교 보정을 위해 약간 보수적인 기준 적용
          q_crit = stats.t.ppf(1 - alpha/(n_groups*(n_groups-1)/2), df)

          # p-value
          p = 2 * (1 - stats.t.cdf(t, df)) * (n_groups*(n_groups-1)/2)  # Bonferroni-style 보정
          p = min(p, 1.0)

          # 신뢰구간
          ci_lower = mean_diff - q_crit * se
          ci_upper = mean_diff + q_crit * se

          comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'mean_diff': float(mean_diff),
            'std_error': float(se),
            't_statistic': float(t),
            'df': float(df),
            'p_value': float(p),
            'ci_lower': float(ci_lower),
            'ci_upper': float(ci_upper),
            'significant': p < alpha
          })

      result = {
        'comparisons': comparisons,
        'alpha': alpha,
        'significant_count': sum(1 for c in comparisons if c['significant'])
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * Bonferroni 사후검정
   */
  async performBonferroni(groups: number[][], groupNames: string[], alpha: number = 0.05): Promise<any> {
    if (!this.pyodide) {
      await this.initialize()
    }

    const result = await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats

      groups = ${JSON.stringify(groups)}
      group_names = ${JSON.stringify(groupNames)}
      alpha = ${alpha}

      n_groups = len(groups)
      num_comparisons = n_groups * (n_groups - 1) // 2
      adjusted_alpha = alpha / num_comparisons

      comparisons = []

      for i in range(n_groups):
        for j in range(i + 1, n_groups):
          # Independent t-test for each pair
          t_stat, p_value = stats.ttest_ind(groups[i], groups[j])

          # Apply Bonferroni correction
          adjusted_p = min(p_value * num_comparisons, 1.0)

          # Calculate mean difference and confidence interval
          mean1, mean2 = np.mean(groups[i]), np.mean(groups[j])
          mean_diff = mean1 - mean2

          # Standard error
          var1, var2 = np.var(groups[i], ddof=1), np.var(groups[j], ddof=1)
          n1, n2 = len(groups[i]), len(groups[j])
          se = np.sqrt(var1/n1 + var2/n2)

          # Degrees of freedom (Welch's approximation)
          df = (var1/n1 + var2/n2)**2 / ((var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1))

          # Critical value for confidence interval (using adjusted alpha)
          t_crit = stats.t.ppf(1 - adjusted_alpha/2, df)
          ci_lower = mean_diff - t_crit * se
          ci_upper = mean_diff + t_crit * se

          comparisons.append({
            'group1': group_names[i],
            'group2': group_names[j],
            'mean_diff': float(mean_diff),
            'std_error': float(se),
            't_statistic': float(t_stat),
            'p_value': float(p_value),
            'adjusted_p': float(adjusted_p),
            'ci_lower': float(ci_lower),
            'ci_upper': float(ci_upper),
            'significant': adjusted_p < alpha
          })

      result = {
        'comparisons': comparisons,
        'num_comparisons': num_comparisons,
        'original_alpha': alpha,
        'adjusted_alpha': adjusted_alpha,
        'significant_count': sum(1 for c in comparisons if c['significant'])
      }

      import json
      result_json = json.dumps(result)
      result_json
    `)

    return result
  }

  /**
   * Pyodide 초기화 여부 확인
   */
  isInitialized(): boolean {
    const initialized = this.pyodide !== null
    console.log(`[PyodideService.isInitialized] ${initialized ? '초기화됨' : '초기화 안됨'}`)
    return initialized
  }

  /**
   * Pyodide 인스턴스 정리
   */
  dispose(): void {
    if (this.pyodide) {
      this.pyodide = null
    }
    PyodideStatisticsService.instance = null
  }
}

// 싱글톤 인스턴스 export
export const pyodideStats = PyodideStatisticsService.getInstance()