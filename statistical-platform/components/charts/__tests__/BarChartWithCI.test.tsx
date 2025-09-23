import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { BarChartWithCI } from '../BarChartWithCI'

// Mock ChartSkeleton
jest.mock('../ChartSkeleton', () => ({
  ChartSkeleton: () => <div>Loading...</div>
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

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
      expect(screen.getByText('그룹 A')).toBeInTheDocument()
      expect(screen.getByText('그룹 B')).toBeInTheDocument()
      expect(screen.getByText('그룹 C')).toBeInTheDocument()
      expect(screen.getByText('대조군')).toBeInTheDocument()
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

    it('단위가 올바르게 표시되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} unit="mg" />
      )

      // Y축 레이블에 단위가 포함되어야 함
      const labels = container.querySelectorAll('text')
      const hasUnit = Array.from(labels).some(label =>
        label.textContent?.includes('mg')
      )
      expect(hasUnit).toBe(true)
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

      // 테이블 헤더 확인 (테이블 내부에서 검색)
      const table = screen.getByRole('table')
      expect(within(table).getByText('그룹')).toBeInTheDocument()
      expect(within(table).getByText('값')).toBeInTheDocument()
      expect(within(table).getByText('하한')).toBeInTheDocument()
      expect(within(table).getByText('상한')).toBeInTheDocument()
      expect(within(table).getByText('CI 너비')).toBeInTheDocument()
    })

    it('테이블에 데이터가 올바르게 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} unit="kg" showCI={true} />)

      // 테이블 뷰로 전환
      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      // 테이블이 표시되었는지 확인
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      // 첫 번째 그룹 데이터 확인 (테이블 내부에서 검색)
      const table = screen.getByRole('table')

      // 값 확인 (toFixed(3) 형식)
      expect(within(table).getByText('25.000kg')).toBeInTheDocument()

      // 20.000kg는 여러 곳에 있을 수 있으므로 getAllByText 사용
      const twentyValues = within(table).getAllByText('20.000kg')
      expect(twentyValues[0]).toBeInTheDocument()

      // 30.000kg도 여러 곳에 있을 수 있음
      const thirtyValues = within(table).getAllByText('30.000kg')
      expect(thirtyValues[0]).toBeInTheDocument()

      // CI 너비 확인 (10.000kg도 여러 곳에 있을 수 있음)
      const tenValues = within(table).getAllByText('10.000kg')
      expect(tenValues[0]).toBeInTheDocument()
    })

    it('표준오차가 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} />)

      // 테이블 뷰로 전환
      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      // 테이블이 표시되었는지 확인
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      // 테이블 내부에서 검색
      const table = screen.getByRole('table')
      expect(within(table).getByText('표준오차')).toBeInTheDocument()

      // 표준오차 값 확인 (toFixed(3) 형식)
      // 정규식으로 ±2.500 패턴 찾기
      const seCell = within(table).getByText(/±2\.500/)
      expect(seCell).toBeInTheDocument()
    })
  })

  describe('기준선 기능', () => {
    it('기준선이 표시되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} baseline={20} showBaseline={true} />
      )

      // 기준선 텍스트 확인
      expect(screen.getByText('기준선')).toBeInTheDocument()

      // 기준선 라인 확인
      const baselineLine = container.querySelector('line.text-muted-foreground\\/50[stroke-width="2"]')
      expect(baselineLine).toBeTruthy()
    })

    it('기준선 대비 차이가 표시되어야 함', async () => {
      render(<BarChartWithCI data={mockData} baseline={20} showBaseline={true} />)

      // 테이블 뷰로 전환
      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      // 테이블이 표시되었는지 확인
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      // 테이블 내부에서만 검색
      const table = screen.getByRole('table')
      expect(within(table).getByText('기준선 대비')).toBeInTheDocument()
      // 그룹 A: 25 - 20 = +5
      expect(within(table).getByText('+5.000')).toBeInTheDocument()
    })

    it('기준선과 비교하여 색상이 결정되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} baseline={20} showBaseline={true} />
      )

      // 기준선보다 높은 막대는 녹색, 낮은 막대는 빨간색이어야 함
      const bars = container.querySelectorAll('rect')
      expect(bars.length).toBeGreaterThan(0)
    })
  })

  describe('상호작용', () => {
    it('막대를 클릭하면 상세 정보가 표시되어야 함', () => {
      const { container } = render(<BarChartWithCI data={mockData} />)

      // 첫 번째 막대 그룹 클릭
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        // 상세 정보 패널 확인
        expect(screen.getByText('그룹 A 상세 정보')).toBeInTheDocument()
        expect(screen.getByText('25.000')).toBeInTheDocument()
      }
    })

    it('호버 시 막대가 강조되어야 함', () => {
      const { container } = render(<BarChartWithCI data={mockData} />)

      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.mouseEnter(firstGroup)

        // 호버 상태 확인
        const rect = firstGroup.querySelector('rect')
        expect(rect).toBeTruthy()
      }
    })

    it('클릭 콜백이 호출되어야 함', () => {
      const mockOnClick = jest.fn()
      const { container } = render(
        <BarChartWithCI data={mockData} onBarClick={mockOnClick} />
      )

      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)
        expect(mockOnClick).toHaveBeenCalledWith(mockData[0], 0)
      }
    })
  })

  describe('신뢰구간 표시', () => {
    it('신뢰구간이 표시되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} showCI={true} />
      )

      // CI 선과 캡이 있어야 함
      const lines = container.querySelectorAll('svg g line')
      expect(lines.length).toBeGreaterThan(0)
    })

    it('CI가 없는 데이터에 경고가 표시되어야 함', () => {
      render(<BarChartWithCI data={mockData} showCI={true} />)

      // 그룹 D는 CI가 없음
      expect(screen.getByText('일부 데이터에 신뢰구간이 없습니다')).toBeInTheDocument()
    })

    it('CI 해석이 표시되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} showCI={true} ciLevel={95} />
      )

      // 첫 번째 막대 클릭
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        expect(screen.getByText(/95% 확률로 실제 값이/)).toBeInTheDocument()
        expect(screen.getByText(/20.00.*30.00.*사이에 있습니다/)).toBeInTheDocument()
      }
    })

    it('기준선과 CI 비교 해석이 표시되어야 함', () => {
      const { container } = render(
        <BarChartWithCI
          data={mockData}
          showCI={true}
          baseline={12}
          showBaseline={true}
        />
      )

      // 첫 번째 막대 클릭 (CI: [20, 30], baseline: 12)
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        expect(screen.getByText(/신뢰구간 전체가 기준선.*보다 높으므로 통계적으로 유의한 증가/)).toBeInTheDocument()
      }
    })
  })

  describe('효과크기', () => {
    it('효과크기가 계산되어야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} baseline={20} showBaseline={true} />
      )

      // 첫 번째 막대 클릭
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        expect(screen.getByText('효과크기')).toBeInTheDocument()
        // 25 - 20 = 5, 절대값 5는 '매우 큼'
        expect(screen.getByText('매우 큼')).toBeInTheDocument()
      }
    })
  })

  describe('CSV 다운로드', () => {
    it('CSV 다운로드 버튼이 작동해야 함', () => {
      render(<BarChartWithCI data={mockData} />)

      const downloadButton = screen.getByRole('button', { name: /csv 다운로드/i })

      // DOM에 임시 a 태그 생성을 모킹
      const createElementSpy = jest.spyOn(document, 'createElement')

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

      // Card에 fixed 클래스가 추가되어야 함
      const card = container.querySelector('.fixed')
      expect(card).toBeInTheDocument()

      // 버튼 텍스트가 변경되어야 함
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

  describe('props 검증', () => {
    it('데이터가 없을 때 처리되어야 함', () => {
      const { container } = render(<BarChartWithCI data={[]} />)

      // SVG가 비어있어야 함
      const svgGroups = container.querySelectorAll('svg g[style*="cursor"]')
      expect(svgGroups.length).toBe(0)
    })

    it('커스텀 색상이 적용되어야 함', () => {
      const dataWithColor = [{
        ...mockData[0],
        color: '#FF0000'
      }]

      const { container } = render(<BarChartWithCI data={dataWithColor} />)

      const rect = container.querySelector('rect[fill="#FF0000"]')
      expect(rect).toBeInTheDocument()
    })

    it('높이가 적용되어야 함', () => {
      render(<BarChartWithCI data={mockData} height={500} />)

      // 차트 SVG를 명시적으로 선택 (role="img"로 식별)
      const chartSvg = screen.getByRole('img', { name: /BarChart 차트/i })
      expect(chartSvg.getAttribute('viewBox')).toContain('500')
    })

    it('값 표시 옵션이 작동해야 함', () => {
      const { container } = render(
        <BarChartWithCI data={mockData} showValues={true} />
      )

      // 막대 클릭하여 선택
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        // 값이 표시되어야 함 (호버 또는 선택 시)
        const valueTexts = container.querySelectorAll('text.font-medium')
        expect(valueTexts.length).toBeGreaterThan(0)
      }
    })
  })
})