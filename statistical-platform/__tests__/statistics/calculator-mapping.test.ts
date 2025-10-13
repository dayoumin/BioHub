// Mock 먼저 정의
const mockService = {
  initialize: jest.fn(),
  performBonferroni: jest.fn(),
  gamesHowellTest: jest.fn(),
  timeSeriesDecomposition: jest.fn(),
  arimaForecast: jest.fn(),
  sarimaForecast: jest.fn(),
  varModel: jest.fn(),
  mixedEffectsModel: jest.fn(),
  kaplanMeierSurvival: jest.fn(),
  coxRegression: jest.fn(),
  manova: jest.fn(),
}

jest.mock('@/lib/services/pyodide-statistics', () => {
  return {
    PyodideStatisticsService: {
      getInstance: () => mockService
    }
  }
})

import { StatisticalCalculator } from '@/lib/statistics/statistical-calculator'

describe('StatisticalCalculator ID 매핑 및 고급분석 연동', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // initialize가 이미 완료된 것으로 mock
    mockService.initialize.mockResolvedValue(undefined)
  })

  test('bonferroniPostHoc → bonferroni 매핑 및 호출', async () => {
    // Arrange
    const data = [
      { g: 'A', v: 1.2 },
      { g: 'A', v: 2.1 },
      { g: 'B', v: 2.9 },
      { g: 'B', v: 3.4 }
    ]

    mockService.performBonferroni.mockResolvedValueOnce({
      comparisons: [
        { group1: 'A', group2: 'B', mean_diff: -1.0, t_statistic: 2.1, p_value: 0.04, adjusted_p: 0.08, ci_lower: -1.8, ci_upper: -0.2, significant: false }
      ],
      num_comparisons: 1,
      significant_count: 0,
      original_alpha: 0.05,
      adjusted_alpha: 0.05
    })

    // Act
    const result = await StatisticalCalculator.calculate('bonferroniPostHoc', data as any[], {
      groupColumn: 'g',
      valueColumn: 'v',
      alpha: 0.05
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.performBonferroni).toHaveBeenCalledTimes(1)
    const args = mockService.performBonferroni.mock.calls[0]
    // [groupArrays, groupNames, alpha]
    expect(Array.isArray(args[0])).toBe(true)
    expect(Array.isArray(args[1])).toBe(true)
    expect(args[2]).toBe(0.05)
  })

  test('gamesHowellPostHoc → gamesHowell 매핑 및 호출', async () => {
    // Arrange
    const data = [
      { g: 'A', v: 1.2 },
      { g: 'A', v: 2.1 },
      { g: 'B', v: 2.9 },
      { g: 'B', v: 3.4 },
      { g: 'C', v: 3.9 }
    ]

    mockService.gamesHowellTest.mockResolvedValueOnce({
      comparisons: [
        { group1: 'A', group2: 'B', mean_diff: -1.7, t_statistic: 2.2, df: 7.5, p_value: 0.06, significant: false }
      ]
    })

    // Act
    const result = await StatisticalCalculator.calculate('gamesHowellPostHoc', data as any[], {
      groupColumn: 'g',
      valueColumn: 'v',
      alpha: 0.05
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.gamesHowellTest).toHaveBeenCalledTimes(1)
    const args = mockService.gamesHowellTest.mock.calls[0]
    expect(Array.isArray(args[0])).toBe(true)
    expect(Array.isArray(args[1])).toBe(true)
    expect(args[2]).toBe(0.05)
  })

  test('timeSeriesDecomposition 계산 경로 동작', async () => {
    // Arrange
    const seriesData = Array.from({ length: 24 }).map((_, i) => ({ y: Math.sin((2 * Math.PI * i) / 12) + i * 0.01 }))

    mockService.timeSeriesDecomposition.mockResolvedValueOnce({
      trend: new Array(24).fill(0),
      seasonal: new Array(24).fill(0),
      residual: new Array(24).fill(0),
      observed: seriesData.map(r => r.y),
      period: 12,
      seasonalStrength: 0.5,
      trendStrength: 0.3,
      length: 24
    })

    // Act
    const result = await StatisticalCalculator.calculate('timeSeriesDecomposition', seriesData as any[], {
      column: 'y',
      period: 12
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.timeSeriesDecomposition).toHaveBeenCalledTimes(1)
    const args = mockService.timeSeriesDecomposition.mock.calls[0]
    expect(Array.isArray(args[0])).toBe(true)
    expect(args[1]).toBe(12)
  })

  test('ARIMA 예측 경로 동작', async () => {
    // Arrange
    const timeData = Array.from({ length: 36 }).map((_, i) => ({
      value: 100 + i * 2 + Math.random() * 10
    }))

    mockService.arimaForecast.mockResolvedValueOnce({
      forecast: new Array(12).fill(150),
      lower_bound: new Array(12).fill(140),
      upper_bound: new Array(12).fill(160),
      residuals: new Array(36).fill(0),
      aic: 123.45,
      bic: 134.56,
      model_params: {
        p: 1,
        d: 1,
        q: 1,
        seasonal_order: [0, 0, 0, 0]
      },
      fitted_values: new Array(36).fill(100),
      mae: 2.5,
      rmse: 3.2,
      confidence_level: 0.95
    })

    // Act
    const result = await StatisticalCalculator.calculate('arimaForecast', timeData as any[], {
      column: 'value',
      p: 1,
      d: 1,
      q: 1,
      steps: 12
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.arimaForecast).toHaveBeenCalledTimes(1)
    const args = mockService.arimaForecast.mock.calls[0]
    expect(Array.isArray(args[0])).toBe(true)
    expect(args[1]).toBe(1) // p
    expect(args[2]).toBe(1) // d
    expect(args[3]).toBe(1) // q
    expect(args[4]).toBe(12) // steps
  })

  test('MANOVA 경로 동작', async () => {
    // Arrange
    const data = [
      { group: 'A', var1: 1.2, var2: 2.3 },
      { group: 'A', var1: 1.5, var2: 2.1 },
      { group: 'B', var1: 2.1, var2: 3.2 },
      { group: 'B', var1: 2.3, var2: 3.5 },
      { group: 'C', var1: 3.1, var2: 4.1 },
      { group: 'C', var1: 3.3, var2: 4.3 }
    ]

    mockService.manova.mockResolvedValueOnce({
      test_statistics: {
        wilks_lambda: {
          statistic: 0.456,
          f_value: 5.67,
          df_num: 4,
          df_den: 6,
          p_value: 0.032
        },
        pillai_trace: {
          statistic: 0.544,
          f_value: 5.45,
          df_num: 4,
          df_den: 8,
          p_value: 0.021
        },
        hotelling_trace: {
          statistic: 1.195,
          f_value: 5.98,
          df_num: 4,
          df_den: 4,
          p_value: 0.058
        },
        roy_greatest_root: {
          statistic: 1.195,
          f_value: 11.95,
          df_num: 2,
          df_den: 4,
          p_value: 0.019
        }
      },
      univariate_anovas: [
        { variable: 'Y1', f_statistic: 8.45, p_value: 0.018, df: [2, 3] },
        { variable: 'Y2', f_statistic: 6.23, p_value: 0.085, df: [2, 3] }
      ],
      n_groups: 3,
      n_dependent_vars: 2,
      n_observations: 6
    })

    // Act
    const result = await StatisticalCalculator.calculate('manova', data as any[], {
      dependentColumns: ['var1', 'var2'],
      groupColumn: 'group'
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.manova).toHaveBeenCalledTimes(1)
    const args = mockService.manova.mock.calls[0]
    expect(Array.isArray(args[0])).toBe(true) // dependent vars
    expect(Array.isArray(args[1])).toBe(true) // groups
    expect(args[0].length).toBe(2) // 2 dependent variables
    expect(args[1].length).toBe(6) // 6 observations
  })

  test('Kaplan-Meier 생존분석 경로 동작', async () => {
    // Arrange
    const survivalData = [
      { time: 5, event: 1 },
      { time: 10, event: 0 },
      { time: 15, event: 1 },
      { time: 20, event: 1 },
      { time: 25, event: 0 }
    ]

    mockService.kaplanMeierSurvival.mockResolvedValueOnce({
      survival_function: {
        time: [0, 5, 15, 20],
        survival_probability: [1.0, 0.8, 0.53, 0.27],
        confidence_interval_lower: [1.0, 0.45, 0.25, 0.05],
        confidence_interval_upper: [1.0, 0.95, 0.75, 0.55]
      },
      median_survival_time: 15.0,
      events_count: 3,
      censored_count: 2,
      risk_table: [
        { time: 0, at_risk: 5, events: 0, censored: 0 },
        { time: 5, at_risk: 5, events: 1, censored: 0 },
        { time: 10, at_risk: 4, events: 0, censored: 1 },
        { time: 15, at_risk: 3, events: 1, censored: 0 },
        { time: 20, at_risk: 2, events: 1, censored: 0 },
        { time: 25, at_risk: 1, events: 0, censored: 1 }
      ]
    })

    // Act
    const result = await StatisticalCalculator.calculate('kaplanMeierSurvival', survivalData as any[], {
      timeColumn: 'time',
      eventColumn: 'event'
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.kaplanMeierSurvival).toHaveBeenCalledTimes(1)
    const args = mockService.kaplanMeierSurvival.mock.calls[0]
    expect(Array.isArray(args[0])).toBe(true) // times
    expect(Array.isArray(args[1])).toBe(true) // events
    expect(args[0]).toEqual([5, 10, 15, 20, 25])
    expect(args[1]).toEqual([1, 0, 1, 1, 0])
  })

  test('Mixed Effects Model 경로 동작', async () => {
    // Arrange
    const data = [
      { student_id: 1, school: 'A', score: 85, method: 'new' },
      { student_id: 2, school: 'A', score: 78, method: 'old' },
      { student_id: 3, school: 'B', score: 92, method: 'new' },
      { student_id: 4, school: 'B', score: 88, method: 'old' },
      { student_id: 5, school: 'C', score: 75, method: 'new' },
      { student_id: 6, school: 'C', score: 70, method: 'old' }
    ]

    mockService.mixedEffectsModel.mockResolvedValueOnce({
      fixed_effects: {
        Intercept: { coefficient: 80.5, std_error: 2.1, z_value: 38.3, p_value: 0.0001, ci_lower: 76.4, ci_upper: 84.6 },
        method_new: { coefficient: 5.2, std_error: 1.8, z_value: 2.9, p_value: 0.004, ci_lower: 1.7, ci_upper: 8.7 }
      },
      random_effects: {
        school: { variance: 42.3, std_dev: 6.5 }
      },
      model_fit: {
        log_likelihood: -123.45,
        aic: 254.9,
        bic: 262.3,
        converged: true
      },
      icc: 0.23,
      r_squared: {
        marginal: 0.15,
        conditional: 0.35
      }
    })

    // Act
    const result = await StatisticalCalculator.calculate('mixedEffectsModel', data as any[], {
      formula: 'score ~ method + (1|school)',
      groups: 'school'
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.mixedEffectsModel).toHaveBeenCalledTimes(1)
  })

  test('SARIMA 예측 경로 동작', async () => {
    // Arrange
    const seasonalData = Array.from({ length: 48 }).map((_, i) => ({
      value: 100 + i * 2 + Math.sin((2 * Math.PI * i) / 12) * 20 + Math.random() * 5
    }))

    mockService.sarimaForecast.mockResolvedValueOnce({
      forecast: new Array(12).fill(180),
      lower_bound: new Array(12).fill(170),
      upper_bound: new Array(12).fill(190),
      seasonal_order: { P: 1, D: 1, Q: 1, s: 12 },
      model_params: { p: 1, d: 1, q: 1, seasonal_order: [1, 1, 1, 12] },
      aic: 234.56,
      bic: 245.67,
      mae: 3.2,
      rmse: 4.1,
      fitted_values: new Array(48).fill(100),
      residuals: new Array(48).fill(0),
      confidence_level: 0.95
    })

    // Act
    const result = await StatisticalCalculator.calculate('sarimaForecast', seasonalData as any[], {
      column: 'value',
      order: [1, 1, 1],
      seasonal_order: [1, 1, 1, 12],
      steps: 12
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.sarimaForecast).toHaveBeenCalledTimes(1)
  })

  test('VAR Model 경로 동작', async () => {
    // Arrange
    const multivarData = Array.from({ length: 50 }).map((_, i) => ({
      var1: Math.random() * 10 + i * 0.5,
      var2: Math.random() * 5 + i * 0.3,
      var3: Math.random() * 8 + i * 0.4
    }))

    mockService.varModel.mockResolvedValueOnce({
      coefficients: [[0.5, 0.2, 0.1], [0.3, 0.6, 0.2], [0.1, 0.3, 0.7]],
      lag_order: 2,
      granger_causality: {
        var1_causes_var2: { test_statistic: 5.43, p_value: 0.021, df: 2 },
        var2_causes_var1: { test_statistic: 2.11, p_value: 0.123, df: 2 }
      },
      forecast: [[110, 65, 85], [112, 66, 86]],
      residuals: new Array(48).fill([0, 0, 0]),
      aic: 456.78,
      bic: 478.90
    })

    // Act
    const result = await StatisticalCalculator.calculate('varModel', multivarData as any[], {
      columns: ['var1', 'var2', 'var3'],
      maxlags: 5,
      steps: 2
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.varModel).toHaveBeenCalledTimes(1)
  })

  test('Cox Regression 경로 동작', async () => {
    // Arrange
    const survivalData = [
      { time: 5, event: 1, age: 55, treatment: 1 },
      { time: 10, event: 0, age: 60, treatment: 0 },
      { time: 15, event: 1, age: 45, treatment: 1 },
      { time: 20, event: 1, age: 70, treatment: 0 },
      { time: 25, event: 0, age: 50, treatment: 1 }
    ]

    mockService.coxRegression.mockResolvedValueOnce({
      coefficients: {
        age: {
          coef: 0.05,
          exp_coef: 1.05,
          se_coef: 0.02,
          z: 2.5,
          p_value: 0.012,
          ci_lower: 1.01,
          ci_upper: 1.09
        },
        treatment: {
          coef: -0.8,
          exp_coef: 0.45,
          se_coef: 0.35,
          z: -2.29,
          p_value: 0.022,
          ci_lower: 0.23,
          ci_upper: 0.89
        }
      },
      concordance: 0.72,
      log_likelihood: -45.67,
      likelihood_ratio_test: {
        test_statistic: 8.34,
        df: 2,
        p_value: 0.015
      },
      n_observations: 5,
      n_events: 3
    })

    // Act
    const result = await StatisticalCalculator.calculate('coxRegression', survivalData as any[], {
      duration_col: 'time',
      event_col: 'event',
      covariates: ['age', 'treatment']
    })

    // Assert
    expect(result.success).toBe(true)
    expect(mockService.coxRegression).toHaveBeenCalledTimes(1)
  })
})



