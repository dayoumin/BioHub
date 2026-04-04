import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'

export async function handleTimeSeries(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  const timeData = data.arrays.dependent || []

  // ARIMA 예측 — 전용 Worker 4 함수 사용
  if (method.id === 'arima') {
    const result = await pyodideStats.arimaForecast(timeData)
    const aic = result.aic ?? 0
    const bic = result.bic ?? 0
    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: { totalN: timeData.length, missingRemoved: 0 }
      },
      mainResults: {
        statistic: aic,
        pvalue: 1,
        df: 0,
        significant: false,
        interpretation: `ARIMA 모형 적합 완료 — AIC = ${aic.toFixed(2)}, BIC = ${bic.toFixed(2)}`
      },
      additionalInfo: { aic, bic },
      visualizationData: {
        type: 'time-series',
        data: result
      },
      rawResults: result
    }
  }

  // Mann-Kendall 추세 검정 — 전용 Worker 1 함수 사용 (Generated.MannKendallTestResult)
  if (method.id === 'mann-kendall') {
    const result = await pyodideStats.mannKendallTest(timeData)
    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: { totalN: timeData.length, missingRemoved: 0 }
      },
      mainResults: {
        statistic: result.tau,
        pvalue: result.pValue,
        df: 0,
        significant: result.pValue < 0.05,
        interpretation: result.pValue < 0.05
          ? `Mann-Kendall τ = ${result.tau.toFixed(4)}, p = ${result.pValue.toFixed(4)} → 유의한 ${result.trend === 'increasing' ? '증가' : '감소'} 추세 (Sen's slope = ${result.senSlope.toFixed(4)})`
          : `Mann-Kendall τ = ${result.tau.toFixed(4)}, p = ${result.pValue.toFixed(4)} → 유의한 추세 없음`
      },
      additionalInfo: { tau: result.tau, senSlope: result.senSlope, trend: result.trend },
      visualizationData: {
        type: 'time-series',
        data: result
      },
      rawResults: result
    }
  }

  // time_series_analysis는 seasonalPeriods만 받음 (method 파라미터 없음)
  const result = await pyodideStats.timeSeriesAnalysis(timeData, {
    seasonalPeriods: 12
  })

  const baseMeta = {
    method: method.id,
    methodName: method.name,
    timestamp: '',
    duration: 0,
    dataInfo: {
      totalN: timeData.length,
      missingRemoved: 0
    }
  }

  // method.id별 결과 표현 분기
  switch (method.id) {
    case 'stationarity-test': {
      // ADF 검정 결과가 rawResults에 이미 반환됨
      const adfStat = result.adfStatistic ?? 0
      const adfP = result.adfPValue ?? 1
      const isStationary = result.isStationary ?? adfP < 0.05
      return {
        metadata: baseMeta,
        mainResults: {
          statistic: adfStat,
          pvalue: adfP,
          significant: isStationary,
          interpretation: isStationary
            ? `ADF 통계량 = ${Number(adfStat).toFixed(4)}, p = ${Number(adfP).toFixed(4)} → 시계열이 정상 (stationary)입니다`
            : `ADF 통계량 = ${Number(adfStat).toFixed(4)}, p = ${Number(adfP).toFixed(4)} → 시계열이 비정상 (non-stationary)입니다`
        },
        additionalInfo: { isStationary },
        visualizationData: {
          type: 'time-series',
          data: { values: timeData, trend: result.trend }
        },
        rawResults: result
      }
    }

    case 'seasonal-decompose': {
      // 계절 분해: trend, seasonal, residual 컴포넌트
      const trendSlope = Array.isArray(result.trend) && result.trend.length >= 2
        ? (result.trend[result.trend.length - 1] - result.trend[0]) / result.trend.length
        : 0
      return {
        metadata: baseMeta,
        mainResults: {
          statistic: trendSlope,
          pvalue: 1, // 계절 분해는 가설검정이 아님
          significant: false,
          interpretation: `추세 기울기: ${trendSlope.toFixed(4)}. 시계열이 추세, 계절성, 잔차 성분으로 분해되었습니다.`
        },
        additionalInfo: {
          trendSlope,
          seasonalPeriod: 12
        },
        visualizationData: {
          type: 'time-series',
          data: {
            values: timeData,
            trend: result.trend,
            seasonal: result.seasonal,
            residual: result.residual
          }
        },
        rawResults: result
      }
    }

    default: {
      // 기본 시계열 분석 (ARIMA 등)
      return {
        metadata: baseMeta,
        mainResults: {
          statistic: Array.isArray(result.trend) ? result.trend[0] : (result.trend || 0),
          pvalue: 1,
          significant: false,
          interpretation: '시계열 분석 완료'
        },
        additionalInfo: {},
        visualizationData: {
          type: 'time-series',
          data: {
            values: timeData,
            trend: result.trend,
            seasonal: result.seasonal
          }
        },
        rawResults: result
      }
    }
  }
}
