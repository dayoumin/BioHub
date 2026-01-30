import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AnalysisErrorAlert } from '@/components/statistics/common/AnalysisErrorAlert'

describe('AnalysisErrorAlert', () => {
  describe('conditional rendering', () => {
    it('renders nothing when error is null', () => {
      const { container } = render(<AnalysisErrorAlert error={null} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when error is undefined', () => {
      const { container } = render(<AnalysisErrorAlert error={undefined} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when error is empty string', () => {
      const { container } = render(<AnalysisErrorAlert error="" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders alert when error message exists', () => {
      render(<AnalysisErrorAlert error="Something went wrong" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('error message display', () => {
    it('displays the error message', () => {
      render(<AnalysisErrorAlert error="변수를 선택해주세요." />)
      expect(screen.getByText('변수를 선택해주세요.')).toBeInTheDocument()
    })

    it('displays long error messages', () => {
      const longError = '이것은 매우 긴 에러 메시지입니다. '.repeat(10).trim()
      render(<AnalysisErrorAlert error={longError} />)
      expect(screen.getByText(longError)).toBeInTheDocument()
    })
  })

  describe('title', () => {
    it('does not show title by default', () => {
      render(<AnalysisErrorAlert error="Error message" />)
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('shows title when provided', () => {
      render(<AnalysisErrorAlert error="Error message" title="분석 오류" />)
      expect(screen.getByText('분석 오류')).toBeInTheDocument()
    })
  })

  describe('dismiss button', () => {
    it('does not show dismiss button by default', () => {
      render(<AnalysisErrorAlert error="Error" />)
      expect(screen.queryByRole('button', { name: '오류 닫기' })).not.toBeInTheDocument()
    })

    it('does not show dismiss button when showDismiss is true but no onDismiss', () => {
      render(<AnalysisErrorAlert error="Error" showDismiss={true} />)
      expect(screen.queryByRole('button', { name: '오류 닫기' })).not.toBeInTheDocument()
    })

    it('shows dismiss button when showDismiss is true and onDismiss provided', () => {
      const handleDismiss = vi.fn()
      render(
        <AnalysisErrorAlert
          error="Error"
          showDismiss={true}
          onDismiss={handleDismiss}
        />
      )
      expect(screen.getByRole('button', { name: '오류 닫기' })).toBeInTheDocument()
    })

    it('calls onDismiss when dismiss button clicked', () => {
      const handleDismiss = vi.fn()
      render(
        <AnalysisErrorAlert
          error="Error"
          showDismiss={true}
          onDismiss={handleDismiss}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '오류 닫기' }))
      expect(handleDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('variant', () => {
    it('uses destructive variant by default', () => {
      render(<AnalysisErrorAlert error="Error" />)
      const alert = screen.getByRole('alert')
      // destructive variant applies text-destructive class
      expect(alert).toHaveClass('text-destructive')
    })

    it('accepts custom variant', () => {
      render(<AnalysisErrorAlert error="Warning" variant="default" />)
      const alert = screen.getByRole('alert')
      expect(alert).not.toHaveClass('text-destructive')
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<AnalysisErrorAlert error="Error" className="my-custom-class" />)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('my-custom-class')
    })
  })

  describe('accessibility', () => {
    it('has alert role for screen readers', () => {
      render(<AnalysisErrorAlert error="Error message" />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('dismiss button has accessible label', () => {
      render(
        <AnalysisErrorAlert
          error="Error"
          showDismiss={true}
          onDismiss={() => {}}
        />
      )
      expect(screen.getByRole('button', { name: '오류 닫기' })).toBeInTheDocument()
    })
  })

  describe('integration scenarios', () => {
    it('simulates error appearing and being dismissed', () => {
      const handleDismiss = vi.fn()
      const { rerender } = render(
        <AnalysisErrorAlert
          error={null}
          showDismiss={true}
          onDismiss={handleDismiss}
        />
      )

      // Initially no error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      // Error appears
      rerender(
        <AnalysisErrorAlert
          error="분석에 실패했습니다."
          showDismiss={true}
          onDismiss={handleDismiss}
        />
      )
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('분석에 실패했습니다.')).toBeInTheDocument()

      // User dismisses
      fireEvent.click(screen.getByRole('button', { name: '오류 닫기' }))
      expect(handleDismiss).toHaveBeenCalled()
    })

    it('handles rapid error changes', () => {
      const { rerender } = render(<AnalysisErrorAlert error="Error 1" />)
      expect(screen.getByText('Error 1')).toBeInTheDocument()

      rerender(<AnalysisErrorAlert error="Error 2" />)
      expect(screen.getByText('Error 2')).toBeInTheDocument()
      expect(screen.queryByText('Error 1')).not.toBeInTheDocument()

      rerender(<AnalysisErrorAlert error={null} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
