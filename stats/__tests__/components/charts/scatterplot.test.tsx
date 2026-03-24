import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Scatterplot } from '@/components/charts/scatterplot'

type MockChartProps = {
  option: Record<string, unknown>
  style?: React.CSSProperties
}

const lazyEChartsMock = vi.fn((_props: MockChartProps) => (
  <div data-testid="echarts-container">ECharts</div>
))

vi.mock('@/lib/charts/LazyECharts', () => ({
  LazyReactECharts: (props: MockChartProps) => lazyEChartsMock(props),
}))

function getLastOption(): Record<string, unknown> {
  const props = lazyEChartsMock.mock.calls.at(-1)?.[0] as MockChartProps | undefined
  expect(props).toBeDefined()
  return props!.option
}

describe('Scatterplot', () => {
  beforeEach(() => {
    lazyEChartsMock.mockClear()
  })

  it('renders value axes with scale=true', () => {
    render(
      <Scatterplot
        data={[
          { x: 20, y: 21 },
          { x: 24, y: 26 },
          { x: 28, y: 29 },
        ]}
        xAxisLabel="pre"
        yAxisLabel="post"
      />
    )

    expect(screen.getByTestId('echarts-container')).toBeInTheDocument()
    const option = getLastOption()
    const xAxis = option.xAxis as Record<string, unknown>
    const yAxis = option.yAxis as Record<string, unknown>

    expect(xAxis.type).toBe('value')
    expect(xAxis.scale).toBe(true)
    expect(yAxis.type).toBe('value')
    expect(yAxis.scale).toBe(true)
  })

  it('limits trendline endpoints to observed x extent', () => {
    render(
      <Scatterplot
        data={[
          { x: 20, y: 22 },
          { x: 24, y: 25 },
          { x: 28, y: 30 },
        ]}
        showTrendLine
      />
    )

    const option = getLastOption()
    const series = option.series as Array<Record<string, unknown>>
    const trendLine = series.find((item) => item.type === 'line')
    const trendData = trendLine?.data as [number, number][]

    expect(trendData).toHaveLength(2)
    expect(trendData[0]?.[0]).toBe(20)
    expect(trendData[1]?.[0]).toBe(28)
  })
})
