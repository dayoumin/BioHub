/**
 * echarts-converter 테스트
 *
 * 검증 범위:
 * 1. 빈 rows → "No data" fallback
 * 2. bar / scatter / boxplot / histogram / heatmap 출력 구조
 * 3. boxplot percentile 수치 (numpy 호환 선형보간)
 * 4. histogram Sturges 빈 계산
 * 5. column→row 변환 로직 (ChartPreview useMemo 시뮬레이션)
 * 6. toStr null/undefined phantom category 확인
 */

import { describe, it, expect } from 'vitest'
import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter'
import type { ChartSpec } from '@/types/graph-studio'

// ─── 픽스처 ───────────────────────────────────────────────

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: { sourceId: 'test', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
    ...overrides,
  }
}

type AnyOption = Record<string, unknown>

function toAny(opt: ReturnType<typeof chartSpecToECharts>): AnyOption {
  return opt as AnyOption
}

// ─── 빈 rows ──────────────────────────────────────────────

describe('빈 rows', () => {
  it('rows가 비어 있으면 No data title을 반환한다', () => {
    const opt = toAny(chartSpecToECharts(makeSpec(), []))
    const title = opt.title as AnyOption
    expect(String(title.text)).toContain('No data')
  })
})

// ─── bar ──────────────────────────────────────────────────

describe('bar chart', () => {
  const rows = [
    { group: 'A', value: 10 },
    { group: 'B', value: 20 },
    { group: 'C', value: 15 },
  ]

  it('series[0].type === bar', () => {
    const opt = toAny(chartSpecToECharts(makeSpec({ chartType: 'bar' }), rows))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('bar')
  })

  it('dataset.source에 rows가 들어간다', () => {
    const opt = toAny(chartSpecToECharts(makeSpec({ chartType: 'bar' }), rows))
    const dataset = opt.dataset as AnyOption
    expect(dataset.source).toEqual(rows)
  })

  it('xAxis.type === category', () => {
    const opt = toAny(chartSpecToECharts(makeSpec({ chartType: 'bar' }), rows))
    const xAxis = opt.xAxis as AnyOption
    expect(xAxis.type).toBe('category')
  })

  it('title이 있으면 base.title.text에 반영된다', () => {
    const opt = toAny(chartSpecToECharts(
      makeSpec({ chartType: 'bar', title: 'My Bar Chart' }),
      rows,
    ))
    const title = opt.title as AnyOption
    expect(title.text).toBe('My Bar Chart')
  })
})

// ─── scatter ──────────────────────────────────────────────

describe('scatter chart', () => {
  const rows = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
    { x: 5, y: 1 },
  ]
  const baseSpec = makeSpec({
    chartType: 'scatter',
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  })

  it('colorField 없음 → dataset + encode 패턴', () => {
    // colorField가 없으면 dataset.source + series[0].encode 경로
    const opt = toAny(chartSpecToECharts(baseSpec, rows))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('scatter')
    const dataset = opt.dataset as AnyOption
    expect(dataset.source).toEqual(rows)
    expect((series[0].encode as AnyOption).x).toBe('x')
  })

  it('colorField 있음 → [number, number][] per group', () => {
    const rowsWithColor = [
      { x: 1, y: 2, grp: 'A' },
      { x: 3, y: 4, grp: 'A' },
      { x: 5, y: 1, grp: 'B' },
    ]
    const specWithColor = makeSpec({
      chartType: 'scatter',
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
        color: { field: 'grp', type: 'nominal' },
      },
    })
    const opt = toAny(chartSpecToECharts(specWithColor, rowsWithColor))
    const series = opt.series as AnyOption[]
    expect(series).toHaveLength(2) // A, B 두 그룹
    const groupA = series[0].data as [number, number][]
    expect(groupA).toHaveLength(2)
    expect(groupA[0]).toEqual([1, 2])
  })
})

// ─── boxplot (percentile 수치 검증) ───────────────────────

describe('boxplot — percentile (numpy 호환)', () => {
  // [1,2,3,4,5]: min=1, Q1=2, median=3, Q3=4, max=5
  const rows = [
    { cat: 'A', val: 1 },
    { cat: 'A', val: 2 },
    { cat: 'A', val: 3 },
    { cat: 'A', val: 4 },
    { cat: 'A', val: 5 },
  ]
  const spec = makeSpec({
    chartType: 'boxplot',
    encoding: {
      x: { field: 'cat', type: 'nominal' },
      y: { field: 'val', type: 'quantitative' },
    },
  })

  it('series[0].type === boxplot', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('boxplot')
  })

  it('[min, Q1, median, Q3, max] = [1, 2, 3, 4, 5]', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    const data = series[0].data as [number, number, number, number, number][]
    expect(data[0]).toEqual([1, 2, 3, 4, 5])
  })

  it('[1,2,3,4]: Q1=1.75, median=2.5, Q3=3.25', () => {
    const rows4 = [
      { cat: 'B', val: 1 },
      { cat: 'B', val: 2 },
      { cat: 'B', val: 3 },
      { cat: 'B', val: 4 },
    ]
    const opt = toAny(chartSpecToECharts(spec, rows4))
    const series = opt.series as AnyOption[]
    const data = series[0].data as [number, number, number, number, number][]
    expect(data[0][1]).toBeCloseTo(1.75, 5) // Q1
    expect(data[0][2]).toBeCloseTo(2.5, 5)  // median
    expect(data[0][3]).toBeCloseTo(3.25, 5) // Q3
  })
})

// ─── histogram (Sturges 빈) ────────────────────────────────

describe('histogram — Sturges bins', () => {
  // 16개 값 → ceil(log2(16) + 1) = 5bins이지만 max(5, ...)이므로 5
  const vals = Array.from({ length: 16 }, (_, i) => ({ v: i + 1 })) // 1~16
  const spec = makeSpec({
    chartType: 'histogram',
    encoding: {
      x: { field: 'v', type: 'quantitative' },
      y: { field: 'v', type: 'quantitative' },
    },
  })

  it('series[0].type === bar', () => {
    const opt = toAny(chartSpecToECharts(spec, vals))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('bar')
  })

  it('binCount >= 5 (Sturges: ceil(log2(n)+1), min=5)', () => {
    const opt = toAny(chartSpecToECharts(spec, vals))
    const xAxis = opt.xAxis as AnyOption
    const labels = xAxis.data as string[]
    expect(labels.length).toBeGreaterThanOrEqual(5)
  })

  it('모든 값이 빈에 할당된다 (counts 합 = rows 수)', () => {
    const opt = toAny(chartSpecToECharts(spec, vals))
    const series = opt.series as AnyOption[]
    const counts = series[0].data as number[]
    const total = counts.reduce((a, b) => a + b, 0)
    expect(total).toBe(16)
  })
})

// ─── heatmap ──────────────────────────────────────────────

describe('heatmap', () => {
  // 2×2 조합: (A,X)=3rows, (A,Y)=1row, (B,X)=2rows, (B,Y)=2rows → count 모드
  const rows = [
    { col: 'A', row: 'X' },
    { col: 'A', row: 'X' },
    { col: 'A', row: 'X' },
    { col: 'A', row: 'Y' },
    { col: 'B', row: 'X' },
    { col: 'B', row: 'X' },
    { col: 'B', row: 'Y' },
    { col: 'B', row: 'Y' },
  ]
  const spec = makeSpec({
    chartType: 'heatmap',
    encoding: {
      x: { field: 'col', type: 'nominal' },
      y: { field: 'row', type: 'nominal' },
    },
  })

  it('series[0].type === heatmap', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('heatmap')
  })

  it('visualMap이 존재한다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect(opt.visualMap).toBeDefined()
  })

  it('(A,X) count=3 인 셀이 data에 포함된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    const data = series[0].data as [number, number, number][]
    // xCats 삽입 순서: A=0, B=1 / yCats: X=0, Y=1
    const cell = data.find(([xi, yi]) => xi === 0 && yi === 0)
    expect(cell?.[2]).toBe(3)
  })
})

// ─── ChartPreview column→row 변환 시뮬레이션 ─────────────

describe('ChartPreview — column→row 변환 로직', () => {
  // DataPackage.data는 column-based: { colName: [v0, v1, ...] }
  // ChartPreview.useMemo가 row-based로 변환 후 chartSpecToECharts에 전달

  function colToRows(data: Record<string, unknown[]>): Record<string, unknown>[] {
    const columns = Object.keys(data)
    if (!columns.length) return []
    const rowCount = (data[columns[0]] ?? []).length
    return Array.from({ length: rowCount }, (_, i) => {
      const row: Record<string, unknown> = {}
      for (const col of columns) row[col] = data[col][i]
      return row
    })
  }

  it('column-based → row-based 변환이 정확하다', () => {
    const colData = {
      group: ['A', 'B', 'C'],
      value: [10, 20, 30],
    }
    const rows = colToRows(colData)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ group: 'A', value: 10 })
    expect(rows[2]).toEqual({ group: 'C', value: 30 })
  })

  it('빈 data → rows = []', () => {
    expect(colToRows({})).toEqual([])
  })

  it('변환된 rows로 bar chart가 정상 생성된다', () => {
    const colData = { group: ['X', 'Y'], value: [5, 8] }
    const rows = colToRows(colData)
    const opt = toAny(chartSpecToECharts(makeSpec({ chartType: 'bar' }), rows))
    const series = opt.series as AnyOption[]
    expect(series[0].type).toBe('bar')
  })
})

// ─── line — temporal 정렬 ─────────────────────────────────

describe('line — temporal x축 정렬 (colorField 없음)', () => {
  // 날짜 순서가 뒤섞인 입력 → 출력은 시간 순으로 정렬되어야 한다
  const rows = [
    { date: '2024-03-01', value: 30 },
    { date: '2024-01-01', value: 10 },
    { date: '2024-02-01', value: 20 },
  ]
  const spec = makeSpec({
    chartType: 'line',
    encoding: {
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    },
  })

  it('xAxis.type === time', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect((opt.xAxis as AnyOption).type).toBe('time')
  })

  it('data가 날짜 오름차순으로 정렬된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const data = (opt.series as AnyOption[])[0].data as [string, number][]
    expect(data[0][0]).toBe('2024-01-01')
    expect(data[1][0]).toBe('2024-02-01')
    expect(data[2][0]).toBe('2024-03-01')
  })

  it('정렬 후 y값이 x와 대응된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const data = (opt.series as AnyOption[])[0].data as [string, number][]
    expect(data[0]).toEqual(['2024-01-01', 10])
    expect(data[1]).toEqual(['2024-02-01', 20])
    expect(data[2]).toEqual(['2024-03-01', 30])
  })

  it('NaN y값은 제외된다', () => {
    const rowsWithNaN = [
      { date: '2024-01-01', value: 'bad' },
      { date: '2024-02-01', value: 20 },
    ]
    const opt = toAny(chartSpecToECharts(spec, rowsWithNaN))
    const data = (opt.series as AnyOption[])[0].data as [string, number][]
    expect(data).toHaveLength(1)
    expect(data[0][0]).toBe('2024-02-01')
  })
})

// ─── line — temporal + colorField ─────────────────────────

describe('line — temporal x축 + colorField (시간축 유지)', () => {
  // colorField가 있어도 xType=temporal이면 type:'time' 축을 유지해야 한다
  const rows = [
    { date: '2024-03-01', value: 30, region: 'Seoul' },
    { date: '2024-01-01', value: 10, region: 'Seoul' },
    { date: '2024-02-01', value: 5,  region: 'Busan' },
    { date: '2024-01-01', value: 3,  region: 'Busan' },
  ]
  const spec = makeSpec({
    chartType: 'line',
    encoding: {
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
      color: { field: 'region', type: 'nominal' },
    },
  })

  it('xAxis.type === time (category로 강등되지 않는다)', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect((opt.xAxis as AnyOption).type).toBe('time')
  })

  it('그룹 수만큼 series가 생성된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    expect(series).toHaveLength(2) // Seoul, Busan
  })

  it('각 그룹 data가 날짜 오름차순으로 정렬된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    const seoulSeries = series.find(s => s.name === 'Seoul')
    const data = seoulSeries!.data as [string, number][]
    expect(data[0][0]).toBe('2024-01-01')
    expect(data[1][0]).toBe('2024-03-01')
  })

  it('dataset이 없고 각 series가 직접 data 배열을 갖는다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect(opt.dataset).toBeUndefined()
    const series = opt.series as AnyOption[]
    expect(Array.isArray(series[0].data)).toBe(true)
  })
})

// ─── line — category colorField (non-temporal) ─────────────

describe('line — colorField + nominal x (카테고리 피봇)', () => {
  const rows = [
    { cat: 'Jan', value: 10, group: 'A' },
    { cat: 'Feb', value: 20, group: 'A' },
    { cat: 'Jan', value: 15, group: 'B' },
    { cat: 'Feb', value: 25, group: 'B' },
  ]
  const spec = makeSpec({
    chartType: 'line',
    encoding: {
      x: { field: 'cat', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      color: { field: 'group', type: 'nominal' },
    },
  })

  it('xAxis.type === category', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect((opt.xAxis as AnyOption).type).toBe('category')
  })

  it('series 수 = 그룹 수', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    expect((opt.series as AnyOption[]).length).toBe(2)
  })
})

// ─── buildGroupedData — 중복 행 mean ──────────────────────

describe('grouped-bar — 중복 (x, group) 행 → mean', () => {
  // (A, X) 행이 2개: value 10, 20 → mean = 15
  const rows = [
    { cat: 'A', group: 'X', value: 10 },
    { cat: 'A', group: 'X', value: 20 },
    { cat: 'B', group: 'X', value: 30 },
  ]
  const spec = makeSpec({
    chartType: 'grouped-bar',
    encoding: {
      x: { field: 'cat', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      color: { field: 'group', type: 'nominal' },
    },
  })

  it('중복 (x, group) 조합이 sum이 아닌 mean으로 집계된다', () => {
    const opt = toAny(chartSpecToECharts(spec, rows))
    const series = opt.series as AnyOption[]
    const groupX = series.find(s => s.name === 'X')
    const data = groupX!.data as number[]
    // A: mean(10, 20) = 15, B: 30
    expect(data[0]).toBeCloseTo(15, 5) // cat A
    expect(data[1]).toBeCloseTo(30, 5) // cat B
  })

  it('중복 없는 (x, group) 조합은 그대로 유지된다 (count=1 → 나눔 없음)', () => {
    const singleRows = [
      { cat: 'A', group: 'X', value: 42 },
      { cat: 'B', group: 'X', value: 99 },
    ]
    const opt = toAny(chartSpecToECharts(spec, singleRows))
    const series = opt.series as AnyOption[]
    const groupX = series.find(s => s.name === 'X')
    const data = groupX!.data as number[]
    expect(data[0]).toBe(42)
    expect(data[1]).toBe(99)
  })
})

// ─── toStr null/undefined phantom category 확인 ──────────

describe('toStr null/undefined → phantom category', () => {
  it('null 값이 있는 row는 빈 문자열 카테고리로 처리된다 (현재 동작 확인)', () => {
    // ECHARTS_REVIEW Review Question #4: toStr이 null/undefined를 ''로 만들어
    // phantom 카테고리가 생길 수 있음 — 현재 동작을 문서화하는 테스트
    const rows = [
      { group: 'A', value: 10 },
      { group: null, value: 5 },  // null group
      { group: 'B', value: 20 },
    ]
    const opt = toAny(chartSpecToECharts(makeSpec({ chartType: 'bar' }), rows))
    // 현재 동작: null은 '' 카테고리로 dataset에 포함됨
    // 이 테스트는 동작 변경 시 알림 역할
    const dataset = opt.dataset as AnyOption
    const source = dataset.source as typeof rows
    expect(source).toHaveLength(3) // null row가 필터링되지 않음 (현재 동작)
  })
})
