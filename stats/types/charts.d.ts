/**
 * 차트 및 시각화를 위한 타입 정의
 */

/**
 * 차트 종류
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'scatter'
  | 'histogram'
  | 'boxplot'
  | 'heatmap'
  | 'pie'
  | 'area'
  | 'violin'
  | 'bubble'
  | 'radar'
  | 'sankey'
  | 'treemap'
  | 'sunburst'
  | 'parallel'

/**
 * 차트 데이터 포인트
 */
export interface DataPoint {
  x: number | string
  y: number
  label?: string
  size?: number
  color?: string
  group?: string
  error?: {
    x?: number
    y?: number
  }
}

/**
 * 시계열 데이터 포인트
 */
export interface TimeSeriesPoint {
  timestamp: Date | string | number
  value: number
  label?: string
  group?: string
}

/**
 * 박스플롯 데이터
 */
export interface BoxplotData {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
  mean?: number
  label?: string
}

/**
 * 히스토그램 데이터
 */
export interface HistogramData {
  bins: number[]
  counts: number[]
  binWidth?: number
  density?: boolean
}

/**
 * 히트맵 데이터
 */
export interface HeatmapData {
  matrix: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  colorScale?: string | string[]
}

/**
 * 산점도 데이터
 */
export interface ScatterplotData {
  points: DataPoint[]
  regression?: {
    slope: number
    intercept: number
    rSquared?: number
  }
  groups?: string[]
}

/**
 * 선 그래프 데이터
 */
export interface LineChartData {
  series: Array<{
    name: string
    data: Array<{
      x: number | string | Date
      y: number
    }>
    color?: string
    style?: 'solid' | 'dashed' | 'dotted'
  }>
}

/**
 * 막대 그래프 데이터
 */
export interface BarChartData {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
    color?: string
  }>
  stacked?: boolean
  horizontal?: boolean
}

/**
 * 파이 차트 데이터
 */
export interface PieChartData {
  labels: string[]
  values: number[]
  colors?: string[]
  explode?: number[]
}

/**
 * 바이올린 플롯 데이터
 */
export interface ViolinPlotData {
  groups: string[]
  data: number[][]
  showBox?: boolean
  showMean?: boolean
}

/**
 * 평행 좌표 데이터
 */
export interface ParallelCoordinatesData {
  dimensions: Array<{
    key: string
    title: string
    min?: number
    max?: number
    tickValues?: number[]
  }>
  data: Array<{
    [key: string]: number | string
  }>
}

/**
 * 차트 축 설정
 */
export interface AxisConfig {
  title?: string
  min?: number
  max?: number
  tickCount?: number
  tickFormat?: string | ((value: number | string) => string)
  gridLines?: boolean
  type?: 'linear' | 'log' | 'category' | 'time'
}

/**
 * 차트 범례 설정
 */
export interface LegendConfig {
  show?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  orientation?: 'horizontal' | 'vertical'
  title?: string
}

/**
 * 차트 툴팁 설정
 */
export interface TooltipConfig {
  show?: boolean
  format?: string | ((data: DataPoint) => string)
  shared?: boolean
}

/**
 * 차트 주석
 */
export interface ChartAnnotation {
  type: 'line' | 'rect' | 'text' | 'arrow'
  x?: number | string
  y?: number
  x2?: number | string
  y2?: number
  text?: string
  color?: string
  style?: 'solid' | 'dashed' | 'dotted'
}

/**
 * 차트 기본 설정
 */
export interface BaseChartConfig {
  title?: string
  subtitle?: string
  width?: number | string
  height?: number | string
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  xAxis?: AxisConfig
  yAxis?: AxisConfig
  legend?: LegendConfig
  tooltip?: TooltipConfig
  theme?: 'light' | 'dark' | 'auto'
  responsive?: boolean
  animations?: boolean
  annotations?: ChartAnnotation[]
}

/**
 * Plotly 차트 설정 (호환성)
 */
export interface PlotlyConfig extends BaseChartConfig {
  data: PlotlyData[]
  layout?: PlotlyLayout
  config?: Partial<Plotly.Config>
}

export interface PlotlyData {
  x?: (number | string | Date)[]
  y?: (number | string)[]
  z?: (number | string)[][]
  type?: string
  mode?: string
  name?: string
  marker?: {
    color?: string | string[]
    size?: number | number[]
    symbol?: string
  }
  line?: {
    color?: string
    width?: number
    dash?: string
  }
  [key: string]: unknown
}

export interface PlotlyLayout {
  title?: string | { text: string }
  xaxis?: {
    title?: string | { text: string }
    range?: [number, number]
    type?: string
  }
  yaxis?: {
    title?: string | { text: string }
    range?: [number, number]
    type?: string
  }
  showlegend?: boolean
  hovermode?: string | false
  autosize?: boolean
  width?: number
  height?: number
  margin?: {
    l?: number
    r?: number
    t?: number
    b?: number
  }
  [key: string]: unknown
}

/**
 * 차트 내보내기 옵션
 */
export interface ChartExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf'
  filename?: string
  width?: number
  height?: number
  scale?: number
  background?: string
}

/**
 * 차트 인터랙션 이벤트
 */
export interface ChartEvent {
  type: 'click' | 'hover' | 'select' | 'zoom' | 'pan'
  data?: DataPoint | DataPoint[]
  originalEvent?: MouseEvent
}

/**
 * 차트 컴포넌트 Props
 */
export interface ChartProps<T = unknown> {
  data: T
  config?: BaseChartConfig
  className?: string
  style?: React.CSSProperties
  onEvent?: (event: ChartEvent) => void
  loading?: boolean
  error?: string | null
}

/**
 * 통계 차트용 특수 Props
 */
export interface StatisticalChartProps extends ChartProps {
  showStatistics?: boolean
  showConfidenceInterval?: boolean
  confidenceLevel?: number
  showTrendLine?: boolean
  showDistribution?: boolean
  referenceLines?: Array<{
    value: number
    label: string
    color?: string
    style?: 'solid' | 'dashed' | 'dotted'
  }>
}