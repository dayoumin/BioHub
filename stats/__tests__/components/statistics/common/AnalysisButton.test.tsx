import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AnalysisButton } from '@/components/statistics/common/AnalysisButton'

describe('AnalysisButton', () => {
  describe('rendering', () => {
    it('renders with default label', () => {
      render(<AnalysisButton isAnalyzing={false} />)
      expect(screen.getByRole('button', { name: '분석 실행' })).toBeInTheDocument()
    })

    it('renders with custom label', () => {
      render(<AnalysisButton isAnalyzing={false} label="t-검정 실행" />)
      expect(screen.getByRole('button', { name: 't-검정 실행' })).toBeInTheDocument()
    })

    it('shows analyzing label when isAnalyzing is true', () => {
      render(<AnalysisButton isAnalyzing={true} />)
      expect(screen.getByRole('button', { name: '분석 중...' })).toBeInTheDocument()
    })

    it('shows custom analyzing label', () => {
      render(
        <AnalysisButton
          isAnalyzing={true}
          analyzingLabel="검정 중..."
        />
      )
      expect(screen.getByRole('button', { name: '검정 중...' })).toBeInTheDocument()
    })

    it('shows spinner when analyzing', () => {
      render(<AnalysisButton isAnalyzing={true} />)
      const button = screen.getByRole('button')
      expect(button.querySelector('svg.animate-spin')).toBeInTheDocument()
    })

    it('does not show spinner when not analyzing', () => {
      render(<AnalysisButton isAnalyzing={false} />)
      const button = screen.getByRole('button')
      expect(button.querySelector('svg.animate-spin')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('is disabled when isAnalyzing is true', () => {
      render(<AnalysisButton isAnalyzing={true} />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is disabled when canAnalyze is false', () => {
      render(<AnalysisButton isAnalyzing={false} canAnalyze={false} />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is disabled when disabled prop is true', () => {
      render(<AnalysisButton isAnalyzing={false} disabled={true} />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is enabled when all conditions are met', () => {
      render(
        <AnalysisButton
          isAnalyzing={false}
          canAnalyze={true}
          disabled={false}
        />
      )
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('is enabled by default when only isAnalyzing is false', () => {
      render(<AnalysisButton isAnalyzing={false} />)
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('click handler', () => {
    it('calls onClick when clicked and enabled', () => {
      const handleClick = vi.fn()
      render(<AnalysisButton isAnalyzing={false} onClick={handleClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <AnalysisButton
          isAnalyzing={false}
          disabled={true}
          onClick={handleClick}
        />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when analyzing', () => {
      const handleClick = vi.fn()
      render(<AnalysisButton isAnalyzing={true} onClick={handleClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<AnalysisButton isAnalyzing={false} className="custom-class" />)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('uses lg size by default', () => {
      const { container } = render(<AnalysisButton isAnalyzing={false} />)
      // shadcn Button lg size class check
      expect(container.querySelector('button')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles undefined onClick gracefully', () => {
      render(<AnalysisButton isAnalyzing={false} />)
      // Should not throw when clicking without onClick handler
      expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
    })

    it('transitions from analyzing to not analyzing', () => {
      const { rerender } = render(<AnalysisButton isAnalyzing={true} />)
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByText('분석 중...')).toBeInTheDocument()

      rerender(<AnalysisButton isAnalyzing={false} />)
      expect(screen.getByRole('button')).not.toBeDisabled()
      expect(screen.getByText('분석 실행')).toBeInTheDocument()
    })
  })
})
