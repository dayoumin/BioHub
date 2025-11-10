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
import {
  calculateBasicStats,
  generateTheoreticalQuantiles
} from './statisticalTests'

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
  columnName: string
): Data[] {
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
      name: '이론적 정규분포',
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
export function getQQPlotLayout(columnName: string): Partial<Layout> {
  return {
    title: {
      text: `Q-Q Plot: ${columnName}`
    },
    xaxis: {
      title: {
        text: '이론적 분위수'
      },
      gridcolor: '#e5e7eb'
    },
    yaxis: {
      title: {
        text: '관측값'
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
export function getHistogramLayout(columnName: string): Partial<Layout> {
  return {
    title: {
      text: `분포: ${columnName}`
    },
    xaxis: {
      title: {
        text: '값'
      },
      gridcolor: '#e5e7eb'
    },
    yaxis: {
      title: {
        text: '빈도'
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
export function getBoxPlotLayout(columnName: string): Partial<Layout> {
  return {
    title: {
      text: `Box Plot: ${columnName}`
    },
    yaxis: {
      title: {
        text: '값'
      },
      gridcolor: '#e5e7eb'
    },
    showlegend: false,
    plot_bgcolor: '#ffffff',
    paper_bgcolor: '#ffffff'
  }
}
