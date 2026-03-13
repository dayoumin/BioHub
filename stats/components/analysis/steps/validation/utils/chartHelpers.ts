/**
 * 차트 생성 유틸리티
 *
 * @description
 * Plotly 차트 데이터 생성 함수 모음
 * - Q-Q Plot
 * - Histogram
 * - Box Plot
 */

import type { Data, Layout } from 'plotly.js'
import type { ChartLabelsText } from '@/lib/terminology/terminology-types'
import {
  calculateBasicStats,
  generateTheoreticalQuantiles
} from './statisticalTests'

/**
 * 차트 라벨 기본값 (한국어)
 * labels 파라미터 생략 시 하위 호환성을 위해 사용
 */
const DEFAULT_CHART_LABELS: ChartLabelsText = {
  theoreticalNormal: '이론적 정규분포',
  theoreticalQuantile: '이론적 분위수',
  observedValue: '관측값',
  distributionTitle: (colName: string) => `분포: ${colName}`,
  value: '값',
  frequency: '빈도',
  errorMessage: '통계 검정 오류',
}

/**
 * Q-Q Plot 데이터 생성
 *
 * @param values - 숫자 배열
 * @param columnName - 컬럼명
 * @returns Plotly 데이터 객체
 *
 * @description
 * 정규성 검정을 위한 Q-Q Plot 데이터 생성
 * - 관측값을 정렬하여 이론적 분위수와 비교
 * - 정규분포를 따르면 직선에 가까움
 */
export function createQQPlotData(
  values: number[],
  columnName: string,
  labels?: ChartLabelsText
): Data[] {
  const l = labels || DEFAULT_CHART_LABELS

  if (values.length === 0) {
    return []
  }

  // 데이터 정렬
  const sortedValues = [...values].sort((a, b) => a - b)

  // 이론적 분위수 계산
  const theoreticalQuantiles = generateTheoreticalQuantiles(values.length)

  return [
    {
      x: theoreticalQuantiles,
      y: sortedValues,
      mode: 'markers',
      type: 'scatter',
      name: columnName,
      marker: {
        color: 'rgba(55, 128, 191, 0.7)',
        size: 6
      }
    } as Data,
    {
      x: theoreticalQuantiles,
      y: theoreticalQuantiles.map(q => {
        const stats = calculateBasicStats(values)
        return stats.mean + q * stats.std
      }),
      mode: 'lines',
      type: 'scatter',
      name: l.theoreticalNormal,
      line: {
        color: 'rgba(219, 64, 82, 0.7)',
        dash: 'dash'
      }
    } as Data
  ]
}

/**
 * Histogram 데이터 생성
 *
 * @param values - 숫자 배열
 * @param columnName - 컬럼명
 * @param bins - 구간 개수 (기본값: auto)
 * @returns Plotly 데이터 객체
 */
export function createHistogramData(
  values: number[],
  columnName: string,
  bins?: number
): Data[] {
  return [
    {
      x: values,
      type: 'histogram',
      name: columnName,
      nbinsx: bins,
      marker: {
        color: 'rgba(55, 128, 191, 0.7)',
        line: {
          color: 'rgba(55, 128, 191, 1)',
          width: 1
        }
      }
    } as Data
  ]
}

/**
 * Box Plot 데이터 생성
 *
 * @param values - 숫자 배열
 * @param columnName - 컬럼명
 * @returns Plotly 데이터 객체
 */
export function createBoxPlotData(
  values: number[],
  columnName: string
): Data[] {
  return [
    {
      y: values,
      type: 'box',
      name: columnName,
      marker: {
        color: 'rgba(55, 128, 191, 0.7)'
      },
      boxmean: 'sd' // 평균과 표준편차 표시
    } as Data
  ]
}

/**
 * Q-Q Plot 레이아웃 설정
 *
 * @param columnName - 컬럼명
 * @returns Plotly 레이아웃 객체
 */
export function getQQPlotLayout(columnName: string, labels?: ChartLabelsText): Partial<Layout> {
  const l = labels || DEFAULT_CHART_LABELS

  return {
    title: {
      text: `Q-Q Plot: ${columnName}`
    },
    xaxis: {
      title: {
        text: l.theoreticalQuantile
      },
      gridcolor: '#e5e7eb'
    },
    yaxis: {
      title: {
        text: l.observedValue
      },
      gridcolor: '#e5e7eb'
    },
    showlegend: true,
    hovermode: 'closest',
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff'
  }
}

/**
 * Histogram 레이아웃 설정
 *
 * @param columnName - 컬럼명
 * @returns Plotly 레이아웃 객체
 */
export function getHistogramLayout(columnName: string, labels?: ChartLabelsText): Partial<Layout> {
  const l = labels || DEFAULT_CHART_LABELS

  return {
    title: {
      text: l.distributionTitle(columnName)
    },
    xaxis: {
      title: {
        text: l.value
      },
      gridcolor: '#e5e7eb'
    },
    yaxis: {
      title: {
        text: l.frequency
      },
      gridcolor: '#e5e7eb'
    },
    bargap: 0.05,
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff'
  }
}

/**
 * Box Plot 레이아웃 설정
 *
 * @param columnName - 컬럼명
 * @returns Plotly 레이아웃 객체
 */
export function getBoxPlotLayout(columnName: string, labels?: ChartLabelsText): Partial<Layout> {
  const l = labels || DEFAULT_CHART_LABELS

  return {
    title: {
      text: `Box Plot: ${columnName}`
    },
    yaxis: {
      title: {
        text: l.value
      },
      gridcolor: '#e5e7eb'
    },
    showlegend: false,
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff'
  }
}
