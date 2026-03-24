import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { BarChartWithCI } from '../BarChartWithCI'

// Mock ChartSkeleton
vi.mock('../ChartSkeleton', () => ({
  ChartSkeleton: () => <div>Loading...</div>
}))

// Mock LazyReactECharts (ECharts는 jsdom에서 렌더링 불가)
vi.mock('@/lib/charts/LazyECharts', () => ({
  LazyReactECharts: (props: { style?: React.CSSProperties }) => (
    <div data-testid="echarts-container" style={props.style}>ECharts</div>
  )
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('BarChartWithCI', () => {
  const mockData = [
    {
      name: '그룹 A',
      value: 25,
      ci: [20, 30] as [number, number],
      se: 2.5
    },
    {
      name: '그룹 B',
      value: 35,
      ci: [32, 38] as [number, number],
      se: 1.5
    },
    {
      name: '그룹 C',
      value: 15,
      ci: [10, 20] as [number, number],
      se: 2.5
    },
    {
      name: '그룹 D',
      value: 30,
      label: '대조군'
    }
  ]

  describe('기본 렌더링', () => {
    it('BarChartWithCI가 올바르게 렌더링되어야 함', () => {
      render(<BarChartWithCI data={mockData} title="테스트 막대차트" />)

      expect(screen.getByText('테스트 막대차트')).toBeInTheDocument()
      // ECharts에서 그룹 이름은 차트 내부에 있으므로 테이블 뷰에서 확인
      expect(screen.getByTestId('echarts-container')).toBeInTheDocument()
    })

    it('설명이 표시되어야 함', () => {
      render(
        <BarChartWithCI
          data={mockData}
          title="막대차트"
          description="그룹별 평균 비교"
        />
      )

      expect(screen.getByText('그룹별 평균 비교')).toBeInTheDocument()
    })

    it('신뢰수준 배지가 표시되어야 함', () => {
      render(<BarChartWithCI data={mockData} showCI={true} ciLevel={95} />)

      expect(screen.getByText('95% 신뢰구간')).toBeInTheDocument()
    })
  })

  describe('뷰 모드 전환', () => {
    it('차트와 테이블 뷰를 전환할 수 있어야 함', async () => {
      render(<BarChartWithCI data={mockData} />)

      // 기본은 차트 뷰
      expect(screen.getByRole('tab', { name: /차트/i })).toHaveAttribute('aria-selected', 'true')

      // 테이블 뷰로 전환
      const tableTab = screen.getByRole('tab', { name: /테이블/i })
      await userEvent.click(tableTab)

      // 테이블이 표시되었는지 확인
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      // 테이블 헤더 확인
      const table = screen.getByRole('table')
      expect(within(table).getByText('그룹')).toBeInTheDocument()
      expect(within(table).getByText('값')).toBeInTheDocument()
      expect(within(table).getByText('하한')).toBeInTheDocument()
      expect(within(table).getByText('상한')).toBeInTheDocument()
      expect(within(table).getByText('CI 너비')).toBeInTheDocument()
    })

    it('테이블에 데이터가 올바르게 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} unit="kg" showCI={true} />)

      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      const table = screen.getByRole('table')
      expect(within(table).getByText('25.000kg')).toBeInTheDocument()
      const twentyValues = within(table).getAllByText('20.000kg')
      expect(twentyValues[0]).toBeInTheDocument()
    })

    it('표준오차가 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} />)

      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      const table = screen.getByRole('table')
      expect(within(table).getByText('표준오차')).toBeInTheDocument()
      const seCells = within(table).getAllByText(/±2\.500/)
      expect(seCells[0]).toBeInTheDocument()
    })
  })

  describe('기준선 기능', () => {
    it('기준선 대비 차이가 테이블에 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} baseline={20} showBaseline={true} />)

      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      const table = screen.getByRole('table')
      expect(within(table).getByText('기준선 대비')).toBeInTheDocument()
      expect(within(table).getByText('+5.000')).toBeInTheDocument()
    })
  })

  describe('신뢰구간 표시', () => {
    it('CI가 없는 데이터에 경고가 표시되어야 함', () => {
      render(<BarChartWithCI data={mockData} showCI={true} />)

      expect(screen.getByText('일부 데이터에 신뢰구간이 없습니다')).toBeInTheDocument()
    })
  })

  describe('CSV 다운로드', () => {
    it('CSV 다운로드 버튼이 작동해야 함', () => {
      render(<BarChartWithCI data={mockData} />)

      const downloadButton = screen.getByRole('button', { name: /csv 다운로드/i })
      const createElementSpy = vi.spyOn(document, 'createElement')

      fireEvent.click(downloadButton)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe('전체화면 모드', () => {
    it('전체화면 버튼이 작동해야 함', () => {
      const { container } = render(<BarChartWithCI data={mockData} interactive={true} />)

      const fullscreenButton = screen.getByRole('button', { name: /전체 화면/i })
      fireEvent.click(fullscreenButton)

      const card = container.querySelector('.fixed')
      expect(card).toBeInTheDocument()

      expect(screen.getByRole('button', { name: /원래 크기로/i })).toBeInTheDocument()
    })
  })

  describe('정보 패널', () => {
    it('해석 가이드가 표시되어야 함', () => {
      render(<BarChartWithCI data={mockData} />)

      expect(screen.getByText('신뢰구간이 있는 막대차트 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText(/막대: 측정된 평균값 또는 추정값/)).toBeInTheDocument()
      expect(screen.getByText(/오차 막대:.*신뢰구간/)).toBeInTheDocument()
    })

    it('기준선 비교 설명이 표시되어야 함', () => {
      render(<BarChartWithCI data={mockData} showBaseline={true} baseline={20} />)

      expect(screen.getByText('기준선 비교:')).toBeInTheDocument()
      expect(screen.getByText(/신뢰구간이 기준선을 포함하지 않으면 통계적으로 유의한 차이/)).toBeInTheDocument()
    })
  })

  describe('로딩/에러 상태', () => {
    it('로딩 상태 처리', () => {
      render(<BarChartWithCI data={mockData} isLoading={true} />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('에러 상태 처리', () => {
      render(<BarChartWithCI data={mockData} error={new Error('테스트 에러')} />)
      expect(screen.getByText(/테스트 에러/)).toBeInTheDocument()
    })
  })
})
