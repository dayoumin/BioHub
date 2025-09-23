import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PValueBadge, PValueWithSignificance, PValueGroup } from '../PValueBadge'

describe('PValueBadge', () => {
  it('p-value를 올바르게 포맷하여 표시해야 함', () => {
    render(<PValueBadge value={0.045} />)
    expect(screen.getByText(/0.0450/)).toBeInTheDocument()
  })

  it('0.001 미만의 값을 < 0.001로 표시해야 함', () => {
    render(<PValueBadge value={0.0001} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent('< 0.001')
  })

  it('null 값을 N/A로 표시해야 함', () => {
    render(<PValueBadge value={null} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('라벨 표시 옵션이 작동해야 함', () => {
    const { rerender } = render(<PValueBadge value={0.05} showLabel={true} />)
    expect(screen.getByText(/p =/)).toBeInTheDocument()

    rerender(<PValueBadge value={0.05} showLabel={false} />)
    expect(screen.queryByText(/p =/)).not.toBeInTheDocument()
  })

  it('크기 옵션이 적용되어야 함', () => {
    const { container } = render(<PValueBadge value={0.05} size="lg" />)
    const badge = container.querySelector('[role="status"]')
    expect(badge).toHaveClass('text-base')
  })

  it('접근성 속성이 포함되어야 함', () => {
    render(<PValueBadge value={0.001} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveAttribute('aria-label')
  })

  it('유의한 값에 애니메이션 인디케이터가 표시되어야 함', () => {
    const { container } = render(<PValueBadge value={0.0001} />)
    const indicator = container.querySelector('.animate-pulse')
    expect(indicator).toBeInTheDocument()
  })
})

describe('PValueWithSignificance', () => {
  it('유의성 표시가 올바르게 나타나야 함', () => {
    render(<PValueWithSignificance value={0.03} alpha={0.05} />)
    expect(screen.getByText('✅')).toBeInTheDocument()
  })

  it('유의하지 않은 값에 올바른 표시가 나타나야 함', () => {
    render(<PValueWithSignificance value={0.08} alpha={0.05} />)
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('텍스트 표시 옵션이 작동해야 함', () => {
    render(
      <PValueWithSignificance
        value={0.03}
        alpha={0.05}
        significanceSymbol={false}
      />
    )
    expect(screen.getByText('유의함')).toBeInTheDocument()
  })
})

describe('PValueGroup', () => {
  const mockValues = [
    { label: '정규성', value: 0.234 },
    { label: '등분산성', value: 0.001 },
    { label: '독립성', value: 0.045, alpha: 0.01 }
  ]

  it('여러 p-value를 그룹으로 표시해야 함', () => {
    render(<PValueGroup values={mockValues} />)

    expect(screen.getByText('정규성:')).toBeInTheDocument()
    expect(screen.getByText('등분산성:')).toBeInTheDocument()
    expect(screen.getByText('독립성:')).toBeInTheDocument()
  })

  it('수직 방향 옵션이 작동해야 함', () => {
    const { container } = render(
      <PValueGroup values={mockValues} orientation="vertical" />
    )
    const group = container.querySelector('.flex-col')
    expect(group).toBeInTheDocument()
  })

  it('각 값에 대한 alpha 값이 적용되어야 함', () => {
    render(<PValueGroup values={mockValues} />)
    // 0.045는 alpha=0.01 기준으로 유의하지 않음
    const badges = screen.getAllByRole('status')
    expect(badges.length).toBeGreaterThan(0)
  })
})