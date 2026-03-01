/**
 * echarts-converter — km-curve / roc-curve 렌더링 테스트
 *
 * 검증 범위:
 * 1. km-curve 단일 그룹: step 함수 series, CI 밴드(2개 line), 축 설정
 * 2. km-curve 다중 그룹: 그룹별 series 생성, legend 표시
 * 3. km-curve 중도절단 markPoint: isCensored=1 행 → censoredTimes 반영
 * 4. km-curve log-rank p-value: __logRankP → graphic 텍스트
 * 5. km-curve 시간순 정렬: 입력 순서가 달라도 step 함수 올바름
 * 6. roc-curve 기본: 2개 series (Reference + ROC Curve), 대각선 데이터
 * 7. roc-curve AUC graphic: __auc + __aucLo/__aucHi → 텍스트 그래픽
 * 8. roc-curve FPR 오름차순 정렬
 * 9. roc-curve AUC 없을 때 → graphic 미생성
 */

import { describe, it, expect } from 'vitest'
import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter'
import type { ChartSpec } from '@/types/graph-studio'

// ─── 헬퍼 ────────────────────────────────────────────────────

type AnyOption = Record<string, unknown>

function toAny(opt: ReturnType<typeof chartSpecToECharts>): AnyOption {
  return opt as AnyOption
}

function makeKmSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'km-curve',
    data: { sourceId: 'test', columns: [] },
    encoding: {
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'survival', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
    ...overrides,
  }
}

function makeRocSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'roc-curve',
    data: { sourceId: 'test', columns: [] },
    encoding: {
      x: { field: 'fpr', type: 'quantitative' },
      y: { field: 'tpr', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
    ...overrides,
  }
}

// ─── KM 픽스처 ───────────────────────────────────────────────

// 단일 그룹 KM 데이터 (이벤트 시점 + 중도절단 포함)
const kmSingleRows = [
  { time: 0,  survival: 1.0, ciLo: 1.0,  ciHi: 1.0,  isCensored: 0, __logRankP: null },
  { time: 5,  survival: 0.8, ciLo: 0.6,  ciHi: 0.93, isCensored: 0, __logRankP: null },
  { time: 7,  survival: 0.8, ciLo: 0.6,  ciHi: 0.93, isCensored: 1, __logRankP: null }, // 중도절단
  { time: 10, survival: 0.6, ciLo: 0.38, ciHi: 0.79, isCensored: 0, __logRankP: null },
  { time: 20, survival: 0.4, ciLo: 0.2,  ciHi: 0.63, isCensored: 0, __logRankP: null },
]

// log-rank p-value 포함 (row 0에 __logRankP)
const kmWithLogRankRows = [
  { time: 0,  survival: 1.0, ciLo: 1.0, ciHi: 1.0, isCensored: 0, group: 'A', __logRankP: 0.023 },
  { time: 5,  survival: 0.8, ciLo: 0.6, ciHi: 0.93, isCensored: 0, group: 'A', __logRankP: null },
  { time: 0,  survival: 1.0, ciLo: 1.0, ciHi: 1.0, isCensored: 0, group: 'B', __logRankP: null },
  { time: 5,  survival: 0.5, ciLo: 0.3, ciHi: 0.72, isCensored: 0, group: 'B', __logRankP: null },
]

// 순서가 섞인 시간 (정렬 검증용)
const kmUnsortedRows = [
  { time: 20, survival: 0.4, ciLo: 0.2, ciHi: 0.6, isCensored: 0, __logRankP: null },
  { time: 0,  survival: 1.0, ciLo: 1.0, ciHi: 1.0, isCensored: 0, __logRankP: null },
  { time: 10, survival: 0.7, ciLo: 0.5, ciHi: 0.85, isCensored: 0, __logRankP: null },
]

// ─── ROC 픽스처 ──────────────────────────────────────────────

const rocRows = [
  { fpr: 0.0, tpr: 0.0, __auc: 0.85, __aucLo: 0.78, __aucHi: 0.92 },
  { fpr: 0.1, tpr: 0.6, __auc: null, __aucLo: null, __aucHi: null },
  { fpr: 0.2, tpr: 0.75, __auc: null, __aucLo: null, __aucHi: null },
  { fpr: 0.5, tpr: 0.9, __auc: null, __aucLo: null, __aucHi: null },
  { fpr: 1.0, tpr: 1.0, __auc: null, __aucLo: null, __aucHi: null },
]

// FPR 역순 (정렬 검증용)
const rocUnsortedRows = [
  { fpr: 1.0, tpr: 1.0, __auc: 0.82, __aucLo: null, __aucHi: null },
  { fpr: 0.3, tpr: 0.7, __auc: null, __aucLo: null, __aucHi: null },
  { fpr: 0.0, tpr: 0.0, __auc: null, __aucLo: null, __aucHi: null },
]

// ─── km-curve 단일 그룹 ───────────────────────────────────────

describe('km-curve — 단일 그룹', () => {
  const spec = makeKmSpec()
  const opt = toAny(chartSpecToECharts(spec, kmSingleRows))
  const series = opt.series as AnyOption[]

  it('series가 생성된다 (CI 하한 + CI 밴드 + 주 곡선 = 3개 이상)', () => {
    // 단일 그룹: ciLo(1) + ciHi(1) + mainSeries(1) = 3
    expect(series.length).toBeGreaterThanOrEqual(3)
  })

  it('주 곡선은 step:end line 타입이다', () => {
    const mainSeries = series.find(s => s.step === 'end' && !String(s.name).includes('_ci'))
    expect(mainSeries).toBeDefined()
    expect(mainSeries?.type).toBe('line')
  })

  it('xAxis.type은 value이고 min=0이다', () => {
    const xAxis = opt.xAxis as AnyOption
    expect(xAxis.type).toBe('value')
    expect(xAxis.min).toBe(0)
  })

  it('yAxis.min=0, max=1 (생존율 범위)', () => {
    const yAxis = opt.yAxis as AnyOption
    expect(yAxis.min).toBe(0)
    expect(yAxis.max).toBe(1)
  })

  it('CI 밴드: stack 속성이 있는 line series가 2개 존재한다', () => {
    const ciSeries = series.filter(s => typeof s.stack === 'string')
    expect(ciSeries.length).toBe(2)
  })

  it('CI 밴드: ciLo series의 areaStyle.opacity=1 (불투명 마스크)', () => {
    const ciLoSeries = series.find(s =>
      typeof s.stack === 'string' && String(s.name).endsWith('_ciLo')
    )
    expect(ciLoSeries).toBeDefined()
    const areaStyle = ciLoSeries?.areaStyle as AnyOption
    expect(areaStyle.opacity).toBe(1)
  })

  it('CI 밴드: ciHi series의 areaStyle.opacity < 0.5 (반투명)', () => {
    const ciHiSeries = series.find(s =>
      typeof s.stack === 'string' && String(s.name).endsWith('_ciHi')
    )
    expect(ciHiSeries).toBeDefined()
    const areaStyle = ciHiSeries?.areaStyle as AnyOption
    expect(Number(areaStyle.opacity)).toBeLessThan(0.5)
  })
})

// ─── km-curve 중도절단 markPoint ────────────────────────────

describe('km-curve — 중도절단 markPoint', () => {
  const spec = makeKmSpec()
  const opt = toAny(chartSpecToECharts(spec, kmSingleRows))
  const series = opt.series as AnyOption[]

  it('isCensored=1 행이 있으면 주 곡선에 markPoint가 추가된다', () => {
    const mainSeries = series.find(s =>
      s.step === 'end' && !String(s.name).includes('_ci')
    )
    expect(mainSeries?.markPoint).toBeDefined()
  })

  it('markPoint.data에 중도절단 시간(t=7)이 포함된다', () => {
    const mainSeries = series.find(s =>
      s.step === 'end' && !String(s.name).includes('_ci')
    ) as AnyOption
    const mpData = (mainSeries?.markPoint as AnyOption)?.data as AnyOption[]
    const hasT7 = mpData?.some(d => {
      const coord = d.coord as number[]
      return coord?.[0] === 7
    })
    expect(hasT7).toBe(true)
  })

  it('중도절단 점의 y좌표는 해당 시점의 생존율이다 (t=7 → S=0.8)', () => {
    const mainSeries = series.find(s =>
      s.step === 'end' && !String(s.name).includes('_ci')
    ) as AnyOption
    const mpData = (mainSeries?.markPoint as AnyOption)?.data as AnyOption[]
    const t7Point = mpData?.find(d => {
      const coord = d.coord as number[]
      return coord?.[0] === 7
    })
    const coord = t7Point?.coord as number[]
    expect(coord?.[1]).toBeCloseTo(0.8)
  })
})

// ─── km-curve 다중 그룹 ───────────────────────────────────────

describe('km-curve — 다중 그룹', () => {
  const spec = makeKmSpec({
    encoding: {
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'survival', type: 'quantitative' },
      color: { field: 'group', type: 'nominal' },
    },
  })
  const opt = toAny(chartSpecToECharts(spec, kmWithLogRankRows))
  const series = opt.series as AnyOption[]

  it('그룹 A, B 각각 주 곡선이 생성된다 (ciLo × 2 + ciHi × 2 + main × 2 = 6개)', () => {
    expect(series.length).toBe(6)
  })

  it('주 곡선 이름에 A, B가 포함된다', () => {
    const mainNames = series
      .filter(s => s.step === 'end' && !String(s.name).includes('_ci'))
      .map(s => String(s.name))
    expect(mainNames).toContain('A')
    expect(mainNames).toContain('B')
  })
})

// ─── km-curve log-rank p-value graphic ───────────────────────

describe('km-curve — log-rank p-value', () => {
  it('__logRankP(row 0) → graphic 텍스트에 p 값이 포함된다', () => {
    const spec = makeKmSpec({
      encoding: {
        x: { field: 'time', type: 'quantitative' },
        y: { field: 'survival', type: 'quantitative' },
        color: { field: 'group', type: 'nominal' },
      },
    })
    const opt = toAny(chartSpecToECharts(spec, kmWithLogRankRows))
    const graphic = opt.graphic as AnyOption[]
    const pGraphic = graphic?.find(g => {
      const style = g.style as AnyOption
      return String(style?.text ?? '').includes('Log-rank')
    })
    expect(pGraphic).toBeDefined()
    const text = String((pGraphic?.style as AnyOption)?.text ?? '')
    expect(text).toContain('0.023')
  })

  it('__logRankP가 null이면 graphic 텍스트가 없다', () => {
    const spec = makeKmSpec()
    const rowsNoP = kmSingleRows.map(r => ({ ...r, __logRankP: null }))
    const opt = toAny(chartSpecToECharts(spec, rowsNoP))
    const graphic = (opt.graphic as AnyOption[]) ?? []
    const pGraphic = graphic.find(g => {
      const style = g.style as AnyOption
      return String(style?.text ?? '').includes('Log-rank')
    })
    expect(pGraphic).toBeUndefined()
  })
})

// ─── km-curve 시간순 정렬 ─────────────────────────────────────

describe('km-curve — 시간순 정렬', () => {
  it('입력 순서가 섞여 있어도 주 곡선 data[0]의 x가 가장 작다', () => {
    const spec = makeKmSpec()
    const opt = toAny(chartSpecToECharts(spec, kmUnsortedRows))
    const series = opt.series as AnyOption[]
    const mainSeries = series.find(s =>
      s.step === 'end' && !String(s.name).includes('_ci')
    ) as AnyOption
    const data = mainSeries?.data as [number, number][]
    expect(data[0][0]).toBe(0)
    expect(data[data.length - 1][0]).toBe(20)
  })
})

// ─── roc-curve 기본 구조 ──────────────────────────────────────

describe('roc-curve — 기본 구조', () => {
  const spec = makeRocSpec()
  const opt = toAny(chartSpecToECharts(spec, rocRows))
  const series = opt.series as AnyOption[]

  it('series가 2개: Reference 대각선 + ROC Curve', () => {
    expect(series).toHaveLength(2)
  })

  it('series[0]이 Reference 대각선이다', () => {
    expect(series[0].name).toBe('Reference')
    expect(series[0].type).toBe('line')
    const data = series[0].data as [number, number][]
    expect(data).toEqual([[0, 0], [1, 1]])
  })

  it('series[1]이 ROC Curve이다', () => {
    expect(series[1].name).toBe('ROC Curve')
    expect(series[1].type).toBe('line')
  })

  it('ROC Curve에 areaStyle이 있다 (AUC 아래 면적 시각화)', () => {
    const areaStyle = series[1].areaStyle as AnyOption
    expect(areaStyle).toBeDefined()
    expect(Number(areaStyle?.opacity)).toBeGreaterThan(0)
  })

  it('xAxis/yAxis 범위가 [0, 1]이다', () => {
    const xAxis = opt.xAxis as AnyOption
    const yAxis = opt.yAxis as AnyOption
    expect(xAxis.min).toBe(0)
    expect(xAxis.max).toBe(1)
    expect(yAxis.min).toBe(0)
    expect(yAxis.max).toBe(1)
  })
})

// ─── roc-curve AUC graphic ───────────────────────────────────

describe('roc-curve — AUC 그래픽', () => {
  it('__auc가 있으면 AUC 값이 graphic 텍스트에 포함된다', () => {
    const spec = makeRocSpec()
    const opt = toAny(chartSpecToECharts(spec, rocRows))
    const graphic = opt.graphic as AnyOption[]
    const aucGraphic = graphic?.find(g => {
      const style = g.style as AnyOption
      return String(style?.text ?? '').includes('AUC')
    })
    expect(aucGraphic).toBeDefined()
    const text = String((aucGraphic?.style as AnyOption)?.text ?? '')
    expect(text).toContain('0.8500')
  })

  it('__aucLo/__aucHi가 있으면 CI 범위도 텍스트에 포함된다', () => {
    const spec = makeRocSpec()
    const opt = toAny(chartSpecToECharts(spec, rocRows))
    const graphic = opt.graphic as AnyOption[]
    const aucGraphic = graphic?.find(g => {
      const style = g.style as AnyOption
      return String(style?.text ?? '').includes('CI')
    })
    expect(aucGraphic).toBeDefined()
    const text = String((aucGraphic?.style as AnyOption)?.text ?? '')
    expect(text).toContain('0.78')
    expect(text).toContain('0.92')
  })

  it('__auc가 null이면 AUC graphic이 생성되지 않는다', () => {
    const spec = makeRocSpec()
    const rowsNoAuc = rocRows.map(r => ({ ...r, __auc: null }))
    const opt = toAny(chartSpecToECharts(spec, rowsNoAuc))
    const graphic = (opt.graphic as AnyOption[]) ?? []
    const aucGraphic = graphic.find(g => {
      const style = g.style as AnyOption
      return String(style?.text ?? '').includes('AUC')
    })
    expect(aucGraphic).toBeUndefined()
  })
})

// ─── roc-curve FPR 정렬 ──────────────────────────────────────

describe('roc-curve — FPR 오름차순 정렬', () => {
  it('입력이 역순이어도 ROC 데이터는 FPR 오름차순으로 정렬된다', () => {
    const spec = makeRocSpec()
    const opt = toAny(chartSpecToECharts(spec, rocUnsortedRows))
    const series = opt.series as AnyOption[]
    const rocSeries = series.find(s => s.name === 'ROC Curve') as AnyOption
    const data = rocSeries?.data as [number, number][]
    expect(data[0][0]).toBe(0.0)
    expect(data[data.length - 1][0]).toBe(1.0)
  })
})
