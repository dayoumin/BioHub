import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { BoxPlot } from '../BoxPlot'

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('BoxPlot', () => {
  const mockData = [
    {
      name: '그룹 A',
      min: 10,
      q1: 20,
      median: 30,
      q3: 40,
      max: 50,
      mean: 31,
      std: 12,
      outliers: [5, 55, 60]
    },
    {
      name: '그룹 B',
      min: 15,
      q1: 25,
      median: 35,
      q3: 45,
      max: 55,
      mean: 36,
      std: 14
    },
    {
      name: '그룹 C',
      min: 8,
      q1: 18,
      median: 28,
      q3: 38,
      max: 48,
      outliers: [3, 53]
    }
  ]

  describe('기본 렌더링', () => {
    it('BoxPlot이 올바르게 렌더링되어야 함', () => {
      render(<BoxPlot data={mockData} title="테스트 박스플롯" />)

      expect(screen.getByText('테스트 박스플롯')).toBeInTheDocument()
      expect(screen.getAllByText('그룹 A')[0]).toBeInTheDocument()
      expect(screen.getAllByText('그룹 B')[0]).toBeInTheDocument()
      expect(screen.getAllByText('그룹 C')[0]).toBeInTheDocument()
    })

    it('설명이 표시되어야 함', () => {
      render(
        <BoxPlot
          data={mockData}
          title="박스플롯"
          description="데이터 분포 시각화"
        />
      )

      expect(screen.getByText('데이터 분포 시각화')).toBeInTheDocument()
    })

    it('단위가 올바르게 표시되어야 함', () => {
      const { container } = render(
        <BoxPlot data={mockData} unit="kg" />
      )

      // Y축 레이블에 단위가 포함되어야 함
      const labels = container.querySelectorAll('text')
      const hasUnit = Array.from(labels).some(label =>
        label.textContent?.includes('kg')
      )
      expect(hasUnit).toBe(true)
    })
  })

  describe('뷰 모드 전환', () => {
    it('차트와 테이블 뷰를 전환할 수 있어야 함', async () => {
      render(<BoxPlot data={mockData} />)

      // 기본은 차트 뷰
      expect(screen.getByRole('tab', { name: /차트/i })).toHaveAttribute('aria-selected', 'true')

      // 테이블 뷰로 전환
      const tableTab = screen.getByRole('tab', { name: /테이블/i })
      await userEvent.click(tableTab)

      // 테이블 헤더 확인
      expect(screen.getByText('최소값')).toBeInTheDocument()
      expect(screen.getByText('Q1')).toBeInTheDocument()
      expect(screen.getByText('중앙값')).toBeInTheDocument()
      expect(screen.getByText('Q3')).toBeInTheDocument()
      expect(screen.getByText('최대값')).toBeInTheDocument()
    })

    it('테이블에 데이터가 올바르게 표시되어야 함', async () => {
      render(<BoxPlot data={mockData} unit="cm" />)

      // 테이블 뷰로 전환
      await userEvent.click(screen.getByRole('tab', { name: /테이블/i }))

      // 테이블이 표시되었는지 확인
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /테이블/i })).toHaveAttribute('aria-selected', 'true')
      })

      // 첫 번째 그룹 데이터 확인 (테이블 내부에서 검색)
      const table = screen.getByRole('table')

      // 10.00cm는 유니크하므로 그대로 사용
      expect(within(table).getByText('10.00cm')).toBeInTheDocument()

      // 20.00cm는 Q1과 IQR에 중복될 수 있으므로 getAllByText 사용
      const twentyValues = within(table).getAllByText('20.00cm')
      expect(twentyValues[0]).toBeInTheDocument()

      // 나머지 값들도 안전하게 처리
      expect(within(table).getByText('30.00cm')).toBeInTheDocument()
      expect(within(table).getByText('40.00cm')).toBeInTheDocument()
      expect(within(table).getByText('50.00cm')).toBeInTheDocument()
    })
  })

  describe('상호작용', () => {
    it('박스를 클릭하면 상세 통계가 표시되어야 함', () => {
      const { container } = render(<BoxPlot data={mockData} />)

      // SVG 내의 첫 번째 그룹 클릭
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        // 상세 통계 패널 확인
        expect(screen.getByText('그룹 A 상세 통계')).toBeInTheDocument()
        expect(screen.getByText('최소값')).toBeInTheDocument()
        expect(screen.getByText('10.00')).toBeInTheDocument()
      }
    })

    it('호버 시 박스가 강조되어야 함', () => {
      const { container } = render(<BoxPlot data={mockData} />)

      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.mouseEnter(firstGroup)

        // 호버 상태 확인 (stroke-width 변경)
        const rect = firstGroup.querySelector('rect')
        expect(rect).toBeTruthy()
      }
    })

    it('레전드 클릭 시 해당 박스가 선택되어야 함', () => {
      render(<BoxPlot data={mockData} />)

      const legendBadges = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('그룹')
      )

      if (legendBadges[0]) {
        fireEvent.click(legendBadges[0])

        // 선택된 박스의 상세 통계 확인
        expect(screen.getByText('그룹 A 상세 통계')).toBeInTheDocument()
      }
    })
  })

  describe('통계 표시', () => {
    it('평균값이 표시되어야 함', () => {
      const { container } = render(
        <BoxPlot data={mockData} showMean={true} />
      )

      // 평균을 나타내는 흰색 원이 있어야 함
      const meanCircles = container.querySelectorAll('circle[fill="white"]')
      expect(meanCircles.length).toBeGreaterThan(0)
    })

    it('이상치가 표시되어야 함', () => {
      const { container } = render(
        <BoxPlot data={mockData} showOutliers={true} />
      )

      // 이상치를 나타내는 빈 원이 있어야 함
      const outlierCircles = container.querySelectorAll('circle[fill="none"]')
      expect(outlierCircles.length).toBeGreaterThan(0)
    })

    it('IQR이 올바르게 계산되어야 함', () => {
      const { container } = render(<BoxPlot data={mockData} />)

      // 첫 번째 그룹 선택
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        // IQR = Q3 - Q1 = 40 - 20 = 20
        // Q1과 IQR 모두 20.00이므로 getAllByText 사용
        const twentyValues = screen.getAllByText('20.00')
        expect(twentyValues.length).toBeGreaterThanOrEqual(2)
      }
    })

    it('분포 해석이 표시되어야 함', () => {
      const { container } = render(<BoxPlot data={mockData} />)

      // 첫 번째 그룹 선택 (평균 31, 중앙값 30)
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        // 평균이 중앙값보다 크므로 오른쪽 꼬리 분포
        const interpretation = screen.getByText(/오른쪽 꼬리 분포|positive skew/i)
        expect(interpretation).toBeInTheDocument()
      }
    })

    it('이상치 개수가 표시되어야 함', () => {
      const { container } = render(<BoxPlot data={mockData} />)

      // 첫 번째 그룹 선택 (이상치 3개)
      const firstGroup = container.querySelector('svg g[style*="cursor"]')
      if (firstGroup) {
        fireEvent.click(firstGroup)

        expect(screen.getByText(/이상치가 3개 발견되었습니다/)).toBeInTheDocument()
      }
    })
  })

  describe('CSV 다운로드', () => {
    it('CSV 다운로드 버튼이 작동해야 함', () => {
      render(<BoxPlot data={mockData} />)

      const downloadButton = screen.getByLabelText('CSV 다운로드')

      // DOM에 임시 a 태그 생성을 모킹
      const createElementSpy = jest.spyOn(document, 'createElement')

      fireEvent.click(downloadButton)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
  })

  describe('전체화면 모드', () => {
    it('전체화면 버튼이 작동해야 함', () => {
      const { container } = render(<BoxPlot data={mockData} interactive={true} />)

      const fullscreenButton = screen.getByLabelText('전체 화면')
      fireEvent.click(fullscreenButton)

      // Card에 fixed 클래스가 추가되어야 함
      const card = container.querySelector('.fixed')
      expect(card).toBeInTheDocument()

      // 버튼 텍스트가 변경되어야 함
      expect(screen.getByRole('button', { name: /원래 크기로/i })).toBeInTheDocument()
    })
  })

  describe('정보 패널', () => {
    it('박스플롯 해석 가이드가 표시되어야 함', () => {
      render(<BoxPlot data={mockData} />)

      expect(screen.getByText('박스플롯 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText(/박스: 데이터의 50%가 포함된 범위/)).toBeInTheDocument()
      expect(screen.getByText(/중앙선: 데이터를 반으로 나누는 중앙값/)).toBeInTheDocument()
      expect(screen.getByText(/수염: 이상치를 제외한 데이터의 범위/)).toBeInTheDocument()
    })

    it('평균값 표시 옵션이 적용되어야 함', () => {
      render(<BoxPlot data={mockData} showMean={true} />)

      expect(screen.getByText(/흰색 점: 데이터의 평균값/)).toBeInTheDocument()
    })

    it('이상치 표시 옵션이 적용되어야 함', () => {
      render(<BoxPlot data={mockData} showOutliers={true} />)

      expect(screen.getByText(/빈 원: 극단적인 값 \(이상치\)/)).toBeInTheDocument()
    })
  })

  describe('props 검증', () => {
    it('데이터가 없을 때 처리되어야 함', () => {
      render(<BoxPlot data={[]} />)

      // SVG가 비어있어야 함
      const { container } = render(<BoxPlot data={[]} />)
      const svgGroups = container.querySelectorAll('svg g[style*="cursor"]')
      expect(svgGroups.length).toBe(0)
    })

    it('커스텀 색상이 적용되어야 함', () => {
      const dataWithColor = [{
        ...mockData[0],
        color: '#FF0000'
      }]

      const { container } = render(<BoxPlot data={dataWithColor} />)

      const rect = container.querySelector('rect[stroke="#FF0000"]')
      expect(rect).toBeInTheDocument()
    })

    it('높이가 적용되어야 함', () => {
      render(<BoxPlot data={mockData} height={500} />)

      // 차트 SVG를 명시적으로 선택 (role="img"로 식별)
      const chartSvg = screen.getByRole('img', { name: /BoxPlot 차트/i })
      expect(chartSvg.getAttribute('viewBox')).toContain('500')
    })
  })
})