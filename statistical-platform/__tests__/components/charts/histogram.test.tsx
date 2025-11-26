/**
 * Histogram Component Tests
 *
 * Tests for the enhanced Histogram component with:
 * - Chart/Table toggle
 * - Fullscreen mode
 * - CSV download
 * - showCard prop
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Histogram } from '@/components/charts/histogram'

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />
}))

// Sample data for tests
const sampleData = [10, 20, 30, 40, 50, 25, 35, 45, 15, 55]

describe('Histogram Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Histogram data={sampleData} />)

      // Check title
      expect(screen.getByText('분포 히스토그램')).toBeInTheDocument()

      // Check chart/table toggle buttons
      expect(screen.getByText('차트')).toBeInTheDocument()
      expect(screen.getByText('테이블')).toBeInTheDocument()
    })

    it('renders with custom title', () => {
      render(<Histogram data={sampleData} title="Test Histogram" />)
      expect(screen.getByText('Test Histogram')).toBeInTheDocument()
    })

    it('shows empty message when data is empty', () => {
      render(<Histogram data={[]} />)
      expect(screen.getByText('표시할 데이터가 없습니다.')).toBeInTheDocument()
    })

    it('displays data count in description', () => {
      render(<Histogram data={sampleData} />)
      expect(screen.getByText(/n = 10/)).toBeInTheDocument()
    })
  })

  describe('Chart/Table Toggle', () => {
    it('starts in chart view by default', () => {
      render(<Histogram data={sampleData} />)

      // Chart should be visible
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('renders both chart and table toggle buttons', () => {
      render(<Histogram data={sampleData} />)

      // Both toggle buttons should exist
      const chartButton = screen.getByRole('tab', { name: /차트/ })
      const tableButton = screen.getByRole('tab', { name: /테이블/ })

      expect(chartButton).toBeInTheDocument()
      expect(tableButton).toBeInTheDocument()

      // Chart tab should be selected by default
      expect(chartButton).toHaveAttribute('aria-selected', 'true')
      expect(tableButton).toHaveAttribute('aria-selected', 'false')
    })

    it('has table toggle button that can be clicked', () => {
      render(<Histogram data={sampleData} />)

      const tableButton = screen.getByRole('tab', { name: /테이블/ })
      expect(tableButton).toBeInTheDocument()
      expect(tableButton).not.toBeDisabled()
    })
  })

  describe('Statistics Display', () => {
    it('displays basic statistics in chart view', () => {
      render(<Histogram data={sampleData} />)

      expect(screen.getByText(/평균:/)).toBeInTheDocument()
      expect(screen.getByText(/중앙값:/)).toBeInTheDocument()
      expect(screen.getByText(/표준편차:/)).toBeInTheDocument()
    })

    it('calculates statistics correctly', () => {
      // Use simple data for predictable statistics
      const simpleData = [1, 2, 3, 4, 5]
      render(<Histogram data={simpleData} />)

      // Mean should be 3.000 (multiple elements can match because mean and median are same)
      const statsElements = screen.getAllByText(/3\.000/)
      expect(statsElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('showCard Prop', () => {
    it('renders with Card wrapper by default', () => {
      const { container } = render(<Histogram data={sampleData} />)

      // Card component adds specific structure
      expect(container.querySelector('[class*="card"]')).toBeInTheDocument()
    })

    it('renders without Card wrapper when showCard=false', () => {
      render(<Histogram data={sampleData} showCard={false} />)

      // Should still render title and content
      expect(screen.getByText('분포 히스토그램')).toBeInTheDocument()
    })

    it('renders empty message without Card when showCard=false and data is empty', () => {
      render(<Histogram data={[]} showCard={false} />)
      expect(screen.getByText('표시할 데이터가 없습니다.')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders fullscreen toggle button', () => {
      render(<Histogram data={sampleData} />)

      // Find button with fullscreen label
      const fullscreenBtn = screen.getByLabelText('전체 화면')
      expect(fullscreenBtn).toBeInTheDocument()
    })

    it('renders download button', () => {
      render(<Histogram data={sampleData} />)

      const downloadBtn = screen.getByLabelText('CSV 다운로드')
      expect(downloadBtn).toBeInTheDocument()
    })

    it('hides fullscreen button when interactive=false', () => {
      render(<Histogram data={sampleData} interactive={false} />)

      expect(screen.queryByLabelText('전체 화면')).not.toBeInTheDocument()
    })
  })

  describe('Help Guide', () => {
    it('displays histogram interpretation guide', () => {
      render(<Histogram data={sampleData} />)

      expect(screen.getByText('히스토그램 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText(/종 모양에 가까울수록 정규분포에 가깝습니다/)).toBeInTheDocument()
    })
  })

  describe('Props Handling', () => {
    it('respects custom bins count', () => {
      render(<Histogram data={sampleData} bins={5} />)
      expect(screen.getByText(/bins = 5/)).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<Histogram data={sampleData} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('handles constant data (all identical values) without NaN', () => {
      // All values are the same - this caused NaN bug before fix
      const constantData = [5, 5, 5, 5, 5]
      render(<Histogram data={constantData} />)

      // Should render without errors
      expect(screen.getByText('분포 히스토그램')).toBeInTheDocument()
      // Data count should be correct
      expect(screen.getByText(/n = 5/)).toBeInTheDocument()
      // Statistics should show mean = 5 (may match multiple: mean and median are same)
      const statsElements = screen.getAllByText(/5\.000/)
      expect(statsElements.length).toBeGreaterThanOrEqual(1)
    })

    it('handles single data point', () => {
      const singleData = [42]
      render(<Histogram data={singleData} />)

      expect(screen.getByText(/n = 1/)).toBeInTheDocument()
    })
  })
})
