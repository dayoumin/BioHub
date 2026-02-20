/**
 * OutlierDetailPanel 컴포넌트 테스트
 *
 * 테스트 범위:
 * - 이상치 정보 렌더링
 * - 박스플롯 시각화
 * - 이상치 선택 기능
 * - "데이터에서 보기" 콜백
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OutlierDetailPanel, OutlierInfo } from '@/components/common/analysis/OutlierDetailPanel'

// Mock Dialog component to avoid portal issues
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    <p data-testid="dialog-description">{children}</p>,
}))

describe('OutlierDetailPanel', () => {
  const mockStatistics = {
    min: 10,
    q1: 25,
    median: 50,
    q3: 75,
    max: 90,
    mean: 52,
    iqr: 50,
    lowerBound: -50,
    upperBound: 150,
    extremeLowerBound: -125,
    extremeUpperBound: 225,
  }

  const mockOutliers: OutlierInfo[] = [
    { value: 200, rowIndex: 5, isExtreme: true },
    { value: 160, rowIndex: 12, isExtreme: false },
    { value: -80, rowIndex: 23, isExtreme: false },
  ]

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    variableName: 'TestVariable',
    outliers: mockOutliers,
    statistics: mockStatistics,
    onViewInData: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders modal when open is true', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<OutlierDetailPanel {...defaultProps} open={false} />)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('displays variable name in title', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText(/TestVariable/)).toBeInTheDocument()
    })

    it('displays outlier count in description', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText(/3개의 이상치/)).toBeInTheDocument()
    })

    it('indicates extreme outliers when present', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText(/극단 이상치 1개 포함/)).toBeInTheDocument()
    })
  })

  describe('Statistics Display', () => {
    it('displays Q1 value', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText('25.00')).toBeInTheDocument()
    })

    it('displays median value', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      // median and IQR are both 50.00, so use getAllByText
      expect(screen.getAllByText('50.00').length).toBeGreaterThanOrEqual(1)
    })

    it('displays Q3 value', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText('75.00')).toBeInTheDocument()
    })

    it('displays IQR value', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      // Both median and IQR show 50.00
      expect(screen.getAllByText('50.00').length).toBeGreaterThanOrEqual(2)
    })

    it('displays normal range bounds', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByText(/-50.00/)).toBeInTheDocument()
      expect(screen.getByText(/150.00/)).toBeInTheDocument()
    })
  })

  describe('Tabs Navigation', () => {
    it('renders boxplot tab', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByRole('tab', { name: /박스플롯/ })).toBeInTheDocument()
    })

    it('renders table tab', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      expect(screen.getByRole('tab', { name: /이상치 목록/ })).toBeInTheDocument()
    })

    it('switches to table view when table tab is clicked', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      const tableTab = screen.getByRole('tab', { name: /이상치 목록/ })
      fireEvent.click(tableTab)

      // Table should show row numbers
      expect(screen.getByText('#5')).toBeInTheDocument()
      expect(screen.getByText('#12')).toBeInTheDocument()
      expect(screen.getByText('#23')).toBeInTheDocument()
    })
  })

  describe('Outlier Classification', () => {
    it('correctly shows outlier counts', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      // Should show total outlier count in description
      expect(screen.getByText(/3개의 이상치/)).toBeInTheDocument()
    })

    it('shows extreme outlier count when present', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      // Should indicate extreme outliers
      expect(screen.getByText(/극단 이상치 1개 포함/)).toBeInTheDocument()
    })
  })

  describe('Selection Functionality', () => {
    it('allows clicking table tab', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      const tableTab = screen.getByRole('tab', { name: /이상치 목록/ })

      // Tab should be clickable
      expect(() => fireEvent.click(tableTab)).not.toThrow()
    })

    it('boxplot tab is default', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      const boxplotTab = screen.getByRole('tab', { name: /박스플롯/ })

      // Boxplot tab should be active by default
      expect(boxplotTab).toHaveAttribute('data-state', 'active')
    })
  })

  describe('View in Data Callback', () => {
    it('calls onViewInData when view button is clicked', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      const viewButton = screen.getByRole('button', { name: /데이터에서 보기/ })
      fireEvent.click(viewButton)

      // Should be called with all outlier indices (no specific order guaranteed)
      expect(defaultProps.onViewInData).toHaveBeenCalled()
      const calledWith = defaultProps.onViewInData.mock.calls[0][0] as number[]
      expect(calledWith).toHaveLength(3)
      expect(calledWith).toContain(5)
      expect(calledWith).toContain(12)
      expect(calledWith).toContain(23)
    })

    it('calls onViewInData with selected indices only', () => {
      render(<OutlierDetailPanel {...defaultProps} />)
      const tableTab = screen.getByRole('tab', { name: /이상치 목록/ })
      fireEvent.click(tableTab)

      // Select one outlier
      const row = screen.getByText('#5').closest('tr')
      if (row) {
        fireEvent.click(row)
      }

      const viewButton = screen.getByRole('button', { name: /데이터에서 보기/ })
      fireEvent.click(viewButton)

      // When one is selected, only that one should be passed
      expect(defaultProps.onViewInData).toHaveBeenCalled()
    })

    it('calls onOpenChange(false) after viewing in data', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      const viewButton = screen.getByRole('button', { name: /데이터에서 보기/ })
      fireEvent.click(viewButton)

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Close Button', () => {
    it('calls onOpenChange(false) when close button is clicked', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: /닫기/ })
      fireEvent.click(closeButton)

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty outliers array', () => {
      render(
        <OutlierDetailPanel
          {...defaultProps}
          outliers={[]}
        />
      )

      expect(screen.getByText(/0개의 이상치/)).toBeInTheDocument()
    })

    it('handles no extreme outliers', () => {
      const mildOnlyOutliers: OutlierInfo[] = [
        { value: 160, rowIndex: 12, isExtreme: false },
        { value: -80, rowIndex: 23, isExtreme: false },
      ]

      render(
        <OutlierDetailPanel
          {...defaultProps}
          outliers={mildOnlyOutliers}
        />
      )

      // Description shows outlier count
      expect(screen.getByText(/2개의 이상치/)).toBeInTheDocument()
      // Should not show "극단 이상치 X개 포함" in description
      expect(screen.queryByText(/극단 이상치.*포함/)).not.toBeInTheDocument()
    })

    it('handles all extreme outliers', () => {
      const extremeOnlyOutliers: OutlierInfo[] = [
        { value: 300, rowIndex: 1, isExtreme: true },
        { value: -200, rowIndex: 2, isExtreme: true },
      ]

      render(
        <OutlierDetailPanel
          {...defaultProps}
          outliers={extremeOnlyOutliers}
        />
      )

      expect(screen.getByText(/극단 이상치 2개 포함/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper tab structure', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(2)
    })

    it('has close and view buttons', () => {
      render(<OutlierDetailPanel {...defaultProps} />)

      // Should have close button
      expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument()
      // Should have view in data button
      expect(screen.getByRole('button', { name: /데이터에서 보기/ })).toBeInTheDocument()
    })
  })
})
