/**
 * PlotlyChartRenderer Dynamic Import 테스트
 * - 동적 import로 Plotly 로드 확인
 * - plotlyRef 캐싱 확인
 * - cleanup 동작 확인
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const mockNewPlot = vi.fn()
const mockPurge = vi.fn()
const mockDownloadImage = vi.fn()
const mockResize = vi.fn()

vi.mock('plotly.js-basic-dist', () => ({
  default: {
    newPlot: mockNewPlot,
    purge: mockPurge,
    downloadImage: mockDownloadImage,
    Plots: { resize: mockResize },
  },
}))

import { PlotlyChartRenderer } from '@/components/visualizations/plotly-chart-renderer'

const sampleChartData = {
  data: [{ x: [1, 2, 3], y: [4, 5, 6], type: 'scatter' as const }],
  layout: { title: 'Test Chart' },
}

describe('PlotlyChartRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('렌더링 시 Plotly를 동적으로 import해야 함', async () => {
    render(<PlotlyChartRenderer chartData={sampleChartData} title="Test" />)

    await waitFor(() => {
      expect(mockNewPlot).toHaveBeenCalledTimes(1)
    })

    const [element, data, layout] = mockNewPlot.mock.calls[0]
    expect(element).toBeInstanceOf(HTMLDivElement)
    expect(data).toEqual(sampleChartData.data)
    expect(layout).toEqual(sampleChartData.layout)
  })

  it('제목이 올바르게 표시되어야 함', () => {
    render(<PlotlyChartRenderer chartData={sampleChartData} title="My Chart" />)
    expect(screen.getByText('My Chart')).toBeInTheDocument()
  })

  it('기본 제목이 표시되어야 함', () => {
    render(<PlotlyChartRenderer chartData={sampleChartData} />)
    expect(screen.getByText('Interactive Chart')).toBeInTheDocument()
  })

  it('언마운트 시 cleanup이 호출되어야 함', async () => {
    const { unmount } = render(
      <PlotlyChartRenderer chartData={sampleChartData} title="Test" />
    )

    await waitFor(() => {
      expect(mockNewPlot).toHaveBeenCalledTimes(1)
    })

    unmount()
    expect(mockPurge).toHaveBeenCalled()
  })

  it('chartData 변경 시 다시 렌더링해야 함', async () => {
    const { rerender } = render(
      <PlotlyChartRenderer chartData={sampleChartData} title="Test" />
    )

    await waitFor(() => {
      expect(mockNewPlot).toHaveBeenCalledTimes(1)
    })

    const newData = {
      data: [{ x: [10, 20], y: [30, 40], type: 'bar' as const }],
      layout: { title: 'Updated' },
    }

    rerender(<PlotlyChartRenderer chartData={newData} title="Test" />)

    await waitFor(() => {
      expect(mockNewPlot).toHaveBeenCalledTimes(2)
    })
  })

  it('Download as PNG 버튼이 동작해야 함', async () => {
    const user = userEvent.setup()
    render(<PlotlyChartRenderer chartData={sampleChartData} title="Test" />)

    await waitFor(() => {
      expect(mockNewPlot).toHaveBeenCalled()
    })

    const pngButton = screen.getByTitle('Download as PNG')
    await user.click(pngButton)

    expect(mockDownloadImage).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ format: 'png', width: 1200, height: 800 })
    )
  })

  it('3개의 액션 버튼이 존재해야 함', () => {
    render(<PlotlyChartRenderer chartData={sampleChartData} title="Test" />)

    expect(screen.getByTitle('Download as PNG')).toBeInTheDocument()
    expect(screen.getByTitle('Download as Interactive HTML')).toBeInTheDocument()
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument()
  })
})
