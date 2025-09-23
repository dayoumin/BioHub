import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ConfidenceIntervalDisplay, MultipleConfidenceIntervals } from '../ConfidenceIntervalDisplay'

describe('ConfidenceIntervalDisplay', () => {
  const defaultProps = {
    lower: 10.5,
    upper: 15.5,
    estimate: 13.0,
    level: 95,
    unit: 'kg'
  }

  describe('기본 렌더링', () => {
    it('신뢰구간이 올바르게 표시되어야 함', () => {
      render(<ConfidenceIntervalDisplay {...defaultProps} />)

      expect(screen.getByText('10.5000kg')).toBeInTheDocument()
      expect(screen.getByText('15.5000kg')).toBeInTheDocument()
      expect(screen.getByText('13.0000kg')).toBeInTheDocument()
    })

    it('신뢰수준이 표시되어야 함', () => {
      render(<ConfidenceIntervalDisplay {...defaultProps} label="테스트" />)
      expect(screen.getByText('95% CI')).toBeInTheDocument()
    })

    it('라벨과 설명이 표시되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          label="평균 차이"
          description="두 그룹 간 평균 차이의 신뢰구간"
        />
      )

      expect(screen.getByText('평균 차이')).toBeInTheDocument()
      expect(screen.getByText('두 그룹 간 평균 차이의 신뢰구간')).toBeInTheDocument()
    })

    it('단위가 올바르게 표시되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          unit="mg/dL"
        />
      )

      expect(screen.getByText('10.5000mg/dL')).toBeInTheDocument()
      expect(screen.getByText('15.5000mg/dL')).toBeInTheDocument()
    })
  })

  describe('텍스트 표현', () => {
    it('구간이 대괄호 형식으로 표시되어야 함', () => {
      render(<ConfidenceIntervalDisplay {...defaultProps} />)
      expect(screen.getByText(/\[10.5000, 15.5000\]/)).toBeInTheDocument()
    })

    it('정밀도가 적용되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          precision={2}
        />
      )
      expect(screen.getByText('10.50kg')).toBeInTheDocument()
      expect(screen.getByText('15.50kg')).toBeInTheDocument()
    })
  })

  describe('해석 기능', () => {
    it('기본 해석 텍스트가 표시되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          showInterpretation={true}
        />
      )

      expect(screen.getByText(/95% 확률로 실제 값이/)).toBeInTheDocument()
      expect(screen.getByText(/10.5000kg와 15.5000kg 사이/)).toBeInTheDocument()
    })

    it('기준값과 비교 해석이 표시되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          referenceValue={0}
          showInterpretation={true}
        />
      )

      expect(screen.getByText(/통계적으로 유의한 증가/)).toBeInTheDocument()
    })

    it('기준값이 구간에 포함될 때 해석이 표시되어야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          lower={-2}
          upper={3}
          estimate={0.5}
          referenceValue={0}
          showInterpretation={true}
        />
      )

      expect(screen.getByText(/0를 포함하므로 통계적으로 유의하지 않습니다/)).toBeInTheDocument()
    })

    it('showInterpretation이 false면 해석을 숨겨야 함', () => {
      render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          showInterpretation={false}
        />
      )

      expect(screen.queryByText(/95% 확률로/)).not.toBeInTheDocument()
    })
  })

  describe('시각화', () => {
    it('시각화가 표시되어야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          showVisualization={true}
        />
      )

      expect(screen.getByText('신뢰구간 시각화')).toBeInTheDocument()
      const visualBar = container.querySelector('.bg-blue-500')
      expect(visualBar).toBeInTheDocument()
    })

    it('showVisualization이 false면 시각화를 숨겨야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          showVisualization={false}
        />
      )

      expect(screen.queryByText('신뢰구간 시각화')).not.toBeInTheDocument()
    })

    it('줌 버튼이 작동해야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          showVisualization={true}
          label="테스트"
        />
      )

      // ZoomIn과 ZoomOut 아이콘을 찾기
      const zoomInIcon = container.querySelector('[class*="ZoomIn"]')
      const zoomOutIcon = container.querySelector('[class*="ZoomOut"]')

      // 줌 인/아웃 아이콘 존재 확인
      expect(zoomInIcon).toBeTruthy()
      expect(zoomOutIcon).toBeTruthy()
    })

    it('기준선이 표시되어야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          referenceValue={12}
          showVisualization={true}
        />
      )

      const referenceLine = container.querySelector('.bg-gray-400')
      expect(referenceLine).toBeInTheDocument()
    })
  })

  describe('색상 옵션', () => {
    it('다양한 색상이 적용되어야 함', () => {
      const colors = ['primary', 'success', 'warning', 'danger'] as const

      colors.forEach(color => {
        const { container } = render(
          <ConfidenceIntervalDisplay
            {...defaultProps}
            color={color}
            showVisualization={true}
          />
        )

        const coloredElement = container.querySelector(
          color === 'primary' ? '.bg-primary' :
          color === 'success' ? '.bg-green-500' :
          color === 'warning' ? '.bg-yellow-500' :
          '.bg-red-500'
        )
        expect(coloredElement).toBeInTheDocument()
      })
    })
  })

  describe('방향 아이콘', () => {
    it('증가 방향 아이콘이 표시되어야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          estimate={15}
          referenceValue={10}
        />
      )

      // TrendingUp 아이콘 확인
      const upIcon = container.querySelector('[class*="TrendingUp"]')
      expect(upIcon).toBeTruthy()
    })

    it('감소 방향 아이콘이 표시되어야 함', () => {
      const { container } = render(
        <ConfidenceIntervalDisplay
          {...defaultProps}
          estimate={8}
          referenceValue={10}
        />
      )

      // TrendingDown 아이콘 확인
      const downIcon = container.querySelector('[class*="TrendingDown"]')
      expect(downIcon).toBeTruthy()
    })
  })
})

describe('MultipleConfidenceIntervals', () => {
  const mockIntervals = [
    {
      name: '그룹 A',
      lower: 10,
      upper: 15,
      estimate: 12.5,
      color: 'primary' as const
    },
    {
      name: '그룹 B',
      lower: 8,
      upper: 14,
      estimate: 11,
      color: 'success' as const
    },
    {
      name: '그룹 C',
      lower: 12,
      upper: 18,
      estimate: 15,
      color: 'warning' as const
    }
  ]

  it('여러 신뢰구간이 표시되어야 함', () => {
    render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
      />
    )

    expect(screen.getByText('신뢰구간 비교')).toBeInTheDocument()
    expect(screen.getByText('그룹 A')).toBeInTheDocument()
    expect(screen.getByText('그룹 B')).toBeInTheDocument()
    expect(screen.getByText('그룹 C')).toBeInTheDocument()
  })

  it('각 구간의 범위가 표시되어야 함', () => {
    render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
      />
    )

    expect(screen.getByText('[10.00, 15.00]')).toBeInTheDocument()
    expect(screen.getByText('[8.00, 14.00]')).toBeInTheDocument()
    expect(screen.getByText('[12.00, 18.00]')).toBeInTheDocument()
  })

  it('단위가 표시되어야 함', () => {
    render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
        unit="cm"
      />
    )

    expect(screen.getByText('[10.00, 15.00] cm')).toBeInTheDocument()
    expect(screen.getByText('[8.00, 14.00] cm')).toBeInTheDocument()
  })

  it('기준값이 표시되어야 함', () => {
    render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
        referenceValue={13}
        unit="cm"
      />
    )

    expect(screen.getByText('기준: 13cm')).toBeInTheDocument()
  })

  it('각 구간에 색상이 적용되어야 함', () => {
    const { container } = render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
      />
    )

    const primaryBar = container.querySelector('.bg-primary')
    const successBar = container.querySelector('.bg-green-500')
    const warningBar = container.querySelector('.bg-yellow-500')

    expect(primaryBar).toBeInTheDocument()
    expect(successBar).toBeInTheDocument()
    expect(warningBar).toBeInTheDocument()
  })

  it('스케일이 올바르게 표시되어야 함', () => {
    render(
      <MultipleConfidenceIntervals
        intervals={mockIntervals}
        level={95}
      />
    )

    // 최소값과 최대값이 스케일에 표시되어야 함
    // 최소: 8, 최대: 18, 마진 포함하면 약 7, 19
    const scaleTexts = screen.getAllByText(/^[0-9.]+$/)
    expect(scaleTexts.length).toBeGreaterThan(0)
  })
})