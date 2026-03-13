/**
 * Chart Helpers Utility Functions - Unit Tests
 *
 * @description
 * chartHelpers.ts 모듈의 Plotly 차트 생성 함수들에 대한 단위 테스트
 */

import {
  createQQPlotData,
  createHistogramData,
  createBoxPlotData,
  getQQPlotLayout,
  getHistogramLayout,
  getBoxPlotLayout
} from '../chartHelpers'
import type { PlotData, BoxPlotData } from 'plotly.js'

// Histogram type helper
type HistogramData = PlotData & { nbinsx?: number }

describe('chartHelpers.ts - Plotly Chart Generation Functions', () => {
  describe('createQQPlotData', () => {
    it('정상 데이터에 대해 2개의 trace를 반환해야 함 (scatter + line)', () => {
      const values = [1, 2, 3, 4, 5]
      const result = createQQPlotData(values, 'testColumn')

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('scatter')
      expect((result[0] as PlotData).mode).toBe('markers')
      expect(result[1].type).toBe('scatter')
      expect((result[1] as PlotData).mode).toBe('lines')
    })

    it('빈 배열에 대해 빈 배열을 반환해야 함', () => {
      const values: number[] = []
      const result = createQQPlotData(values, 'empty')

      expect(result).toHaveLength(0)
    })

    it('scatter trace의 x축은 이론적 분위수여야 함', () => {
      const values = [10, 20, 30, 40, 50]
      const result = createQQPlotData(values, 'test')

      const scatterTrace = result[0]
      expect((scatterTrace as PlotData).x).toBeDefined()
      expect(Array.isArray((scatterTrace as PlotData).x)).toBe(true)
      expect(((scatterTrace as PlotData).x as number[]).length).toBe(5)
    })

    it('scatter trace의 y축은 정렬된 관측값이어야 함', () => {
      const values = [50, 10, 30, 20, 40]
      const result = createQQPlotData(values, 'test')

      const scatterTrace = result[0]
      expect((scatterTrace as PlotData).y).toEqual([10, 20, 30, 40, 50]) // 정렬됨
    })

    it('line trace는 이론적 정규분포 선이어야 함', () => {
      const values = [1, 2, 3, 4, 5]
      const result = createQQPlotData(values, 'test')

      const lineTrace = result[1]
      expect(lineTrace.name).toBe('이론적 정규분포')
      expect((lineTrace as PlotData).mode).toBe('lines')
      if ((lineTrace as PlotData).line && typeof (lineTrace as PlotData).line === 'object') {
        expect((lineTrace as PlotData).line.dash).toBe('dash')
      }
    })

    it('단일 값에 대해 정상 작동해야 함', () => {
      const values = [42]
      const result = createQQPlotData(values, 'single')

      expect(result).toHaveLength(2)
      expect((result[0] as PlotData).y).toEqual([42])
    })

    it('컬럼명이 trace name에 포함되어야 함', () => {
      const values = [1, 2, 3]
      const columnName = 'MyColumn'
      const result = createQQPlotData(values, columnName)

      expect(result[0].name).toBe(columnName)
    })
  })

  describe('createHistogramData', () => {
    it('histogram trace를 반환해야 함', () => {
      const values = [1, 2, 3, 4, 5]
      const result = createHistogramData(values, 'testColumn')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('histogram')
    })

    it('빈 배열에 대해서도 trace를 반환해야 함 (Plotly가 빈 배열 처리)', () => {
      const values: number[] = []
      const result = createHistogramData(values, 'empty')

      expect(result).toHaveLength(1)
      expect((result[0] as PlotData).x).toEqual([])
    })

    it('x축 데이터가 입력값과 동일해야 함', () => {
      const values = [10, 20, 30, 40, 50]
      const result = createHistogramData(values, 'test')

      expect((result[0] as PlotData).x).toEqual(values)
    })

    it('컬럼명이 trace name에 포함되어야 함', () => {
      const values = [1, 2, 3]
      const columnName = 'Distribution'
      const result = createHistogramData(values, columnName)

      expect(result[0].name).toBe(columnName)
    })

    it('nbinsx가 설정 가능해야 함 (bins 파라미터)', () => {
      const values = [1, 2, 3, 4, 5]
      const resultAuto = createHistogramData(values, 'test')
      const resultManual = createHistogramData(values, 'test', 10)

      expect((resultAuto[0] as HistogramData).nbinsx).toBeUndefined() // 자동 구간
      expect((resultManual[0] as HistogramData).nbinsx).toBe(10) // 수동 구간
    })
  })

  describe('createBoxPlotData', () => {
    it('box plot trace를 반환해야 함', () => {
      const values = [1, 2, 3, 4, 5]
      const result = createBoxPlotData(values, 'testColumn')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('box')
    })

    it('빈 배열에 대해서도 trace를 반환해야 함 (Plotly가 빈 배열 처리)', () => {
      const values: number[] = []
      const result = createBoxPlotData(values, 'empty')

      expect(result).toHaveLength(1)
      expect((result[0] as PlotData).y).toEqual([])
    })

    it('y축 데이터가 입력값과 동일해야 함', () => {
      const values = [10, 20, 30, 40, 50]
      const result = createBoxPlotData(values, 'test')

      expect((result[0] as PlotData).y).toEqual(values)
    })

    it('컬럼명이 trace name에 포함되어야 함', () => {
      const values = [1, 2, 3]
      const columnName = 'BoxPlot'
      const result = createBoxPlotData(values, columnName)

      expect(result[0].name).toBe(columnName)
    })

    it('boxmean이 "sd"여야 함 (표준편차 표시)', () => {
      const values = [1, 2, 3, 4, 5]
      const result = createBoxPlotData(values, 'test')

      expect((result[0] as BoxPlotData).boxmean).toBe('sd')
    })
  })

  describe('getQQPlotLayout', () => {
    it('title 객체를 포함해야 함', () => {
      const layout = getQQPlotLayout('TestColumn')

      expect(layout.title).toBeDefined()
      expect(typeof layout.title).toBe('object')
      if (layout.title && typeof layout.title === 'object') {
        expect('text' in layout.title).toBe(true)
      }
    })

    it('컬럼명이 title에 포함되어야 함', () => {
      const columnName = 'MyTestColumn'
      const layout = getQQPlotLayout(columnName)

      if (layout.title && typeof layout.title === 'object' && 'text' in layout.title) {
        expect(layout.title.text).toContain(columnName)
      }
    })

    it('xaxis title 객체를 포함해야 함', () => {
      const layout = getQQPlotLayout('test')

      expect(layout.xaxis).toBeDefined()
      if (layout.xaxis && typeof layout.xaxis === 'object') {
        expect('title' in layout.xaxis).toBe(true)
        const title = layout.xaxis.title
        expect(title).toBeDefined()
        expect(typeof title).toBe('object')
      }
    })

    it('yaxis title 객체를 포함해야 함', () => {
      const layout = getQQPlotLayout('test')

      expect(layout.yaxis).toBeDefined()
      if (layout.yaxis && typeof layout.yaxis === 'object') {
        expect('title' in layout.yaxis).toBe(true)
        const title = layout.yaxis.title
        expect(title).toBeDefined()
        expect(typeof title).toBe('object')
      }
    })

    it('showlegend이 true여야 함', () => {
      const layout = getQQPlotLayout('test')
      expect(layout.showlegend).toBe(true)
    })

    it('hovermode가 closest여야 함', () => {
      const layout = getQQPlotLayout('test')
      expect(layout.hovermode).toBe('closest')
    })
  })

  describe('getHistogramLayout', () => {
    it('title 객체를 포함해야 함', () => {
      const layout = getHistogramLayout('TestColumn')

      expect(layout.title).toBeDefined()
      expect(typeof layout.title).toBe('object')
    })

    it('컬럼명이 title에 포함되어야 함', () => {
      const columnName = 'Distribution'
      const layout = getHistogramLayout(columnName)

      if (layout.title && typeof layout.title === 'object' && 'text' in layout.title) {
        expect(layout.title.text).toContain(columnName)
      }
    })

    it('xaxis와 yaxis title 객체를 포함해야 함', () => {
      const layout = getHistogramLayout('test')

      expect(layout.xaxis).toBeDefined()
      expect(layout.yaxis).toBeDefined()
      if (layout.xaxis && typeof layout.xaxis === 'object') {
        expect('title' in layout.xaxis).toBe(true)
      }
      if (layout.yaxis && typeof layout.yaxis === 'object') {
        expect('title' in layout.yaxis).toBe(true)
      }
    })

    it('bargap이 0.05여야 함', () => {
      const layout = getHistogramLayout('test')
      expect(layout.bargap).toBe(0.05)
    })
  })

  describe('getBoxPlotLayout', () => {
    it('title 객체를 포함해야 함', () => {
      const layout = getBoxPlotLayout('TestColumn')

      expect(layout.title).toBeDefined()
      expect(typeof layout.title).toBe('object')
    })

    it('컬럼명이 title에 포함되어야 함', () => {
      const columnName = 'BoxData'
      const layout = getBoxPlotLayout(columnName)

      if (layout.title && typeof layout.title === 'object' && 'text' in layout.title) {
        expect(layout.title.text).toContain(columnName)
      }
    })

    it('yaxis title 객체를 포함해야 함', () => {
      const layout = getBoxPlotLayout('test')

      expect(layout.yaxis).toBeDefined()
      if (layout.yaxis && typeof layout.yaxis === 'object') {
        expect('title' in layout.yaxis).toBe(true)
      }
    })

    it('showlegend이 false여야 함', () => {
      const layout = getBoxPlotLayout('test')
      expect(layout.showlegend).toBe(false)
    })
  })

  describe('Integration Test: Full Chart Generation Workflow', () => {
    it('Q-Q Plot 전체 생성 워크플로우', () => {
      const values = [85, 90, 78, 92, 88, 95, 82, 87, 91, 86]

      // Step 1: 데이터 생성
      const data = createQQPlotData(values, 'Score')
      expect(data).toHaveLength(2)

      // Step 2: 레이아웃 생성
      const layout = getQQPlotLayout('Score')
      expect(layout.title).toBeDefined()

      // Step 3: 전체 차트 구조 검증
      expect((data[0] as PlotData).x).toHaveLength(values.length)
      expect((data[0] as PlotData).y).toHaveLength(values.length)
      expect((data[1] as PlotData).x).toHaveLength(values.length)
      expect((data[1] as PlotData).y).toHaveLength(values.length)
    })

    it('Histogram 전체 생성 워크플로우', () => {
      const values = [1, 2, 2, 3, 3, 3, 4, 4, 5]

      // Step 1: 데이터 생성
      const data = createHistogramData(values, 'Frequency')
      expect(data).toHaveLength(1)

      // Step 2: 레이아웃 생성
      const layout = getHistogramLayout('Frequency')
      expect(layout.title).toBeDefined()

      // Step 3: 전체 차트 구조 검증
      expect((data[0] as PlotData).x).toEqual(values)
    })

    it('Box Plot 전체 생성 워크플로우', () => {
      const values = [10, 15, 20, 25, 30, 35, 40, 100] // 마지막 값은 이상치

      // Step 1: 데이터 생성
      const data = createBoxPlotData(values, 'Outliers')
      expect(data).toHaveLength(1)

      // Step 2: 레이아웃 생성
      const layout = getBoxPlotLayout('Outliers')
      expect(layout.title).toBeDefined()

      // Step 3: 전체 차트 구조 검증
      expect((data[0] as PlotData).y).toEqual(values)
      expect((data[0] as BoxPlotData).boxmean).toBe('sd')
    })

    it('빈 데이터에 대한 모든 차트 함수 안전성 검증', () => {
      const emptyValues: number[] = []

      // Q-Q Plot (빈 배열 시 빈 배열 반환)
      expect(createQQPlotData(emptyValues, 'empty')).toHaveLength(0)

      // Histogram (빈 배열 시 trace는 반환하지만 x는 빈 배열)
      const histogramResult = createHistogramData(emptyValues, 'empty')
      expect(histogramResult).toHaveLength(1)
      expect((histogramResult[0] as PlotData).x).toEqual([])

      // Box Plot (빈 배열 시 trace는 반환하지만 y는 빈 배열)
      const boxPlotResult = createBoxPlotData(emptyValues, 'empty')
      expect(boxPlotResult).toHaveLength(1)
      expect((boxPlotResult[0] as PlotData).y).toEqual([])

      // 레이아웃 함수는 정상 작동해야 함
      expect(getQQPlotLayout('empty')).toBeDefined()
      expect(getHistogramLayout('empty')).toBeDefined()
      expect(getBoxPlotLayout('empty')).toBeDefined()
    })
  })
})
