/**
 * PurposeCard Component Tests
 *
 * Tests for the reusable selection card component used in:
 * - correlation, t-test, anova, regression pages
 * - Smart Flow purpose selection
 */

import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PurposeCard } from '@/components/common/analysis/PurposeCard'
import { TrendingUp, Activity } from 'lucide-react'

describe('PurposeCard', () => {
  const defaultProps = {
    icon: <TrendingUp data-testid="icon" />,
    title: 'Test Title',
    description: 'Test description text',
    onClick: vi.fn(),
    selected: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(<PurposeCard {...defaultProps} />)

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test description text')).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('renders subtitle when provided', () => {
      render(<PurposeCard {...defaultProps} subtitle="Test Subtitle" />)

      expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
    })

    it('renders examples when provided', () => {
      render(<PurposeCard {...defaultProps} examples="Example text" />)

      expect(screen.getByText(/Example text/)).toBeInTheDocument()
    })

    it('renders children when provided', () => {
      render(
        <PurposeCard {...defaultProps}>
          <div data-testid="custom-content">Custom Content</div>
        </PurposeCard>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })

    it('shows check icon when selected', () => {
      render(<PurposeCard {...defaultProps} selected={true} />)

      // Check icon is rendered in the corner
      const checkIcon = document.querySelector('.absolute.top-0.right-0')
      expect(checkIcon).toBeInTheDocument()
    })

    it('does not show check icon when not selected', () => {
      render(<PurposeCard {...defaultProps} selected={false} />)

      const checkIcon = document.querySelector('.absolute.top-0.right-0')
      expect(checkIcon).not.toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<PurposeCard {...defaultProps} onClick={handleClick} />)

      await user.click(screen.getByRole('radio'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<PurposeCard {...defaultProps} onClick={handleClick} disabled={true} />)

      await user.click(screen.getByRole('radio'))

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('responds to Enter key press', () => {
      const handleClick = vi.fn()

      render(<PurposeCard {...defaultProps} onClick={handleClick} />)

      const card = screen.getByRole('radio')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key press', () => {
      const handleClick = vi.fn()

      render(<PurposeCard {...defaultProps} onClick={handleClick} />)

      const card = screen.getByRole('radio')
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not respond to keyboard when disabled', () => {
      const handleClick = vi.fn()

      render(<PurposeCard {...defaultProps} onClick={handleClick} disabled={true} />)

      const card = screen.getByRole('radio')
      fireEvent.keyDown(card, { key: 'Enter' })
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has correct role attribute', () => {
      render(<PurposeCard {...defaultProps} />)

      expect(screen.getByRole('radio')).toBeInTheDocument()
    })

    it('has aria-checked when selected', () => {
      render(<PurposeCard {...defaultProps} selected={true} />)

      expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'true')
    })

    it('has aria-checked false when not selected', () => {
      render(<PurposeCard {...defaultProps} selected={false} />)

      expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'false')
    })

    it('has aria-disabled when disabled', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      expect(screen.getByRole('radio')).toHaveAttribute('aria-disabled', 'true')
    })

    it('is focusable when not disabled', () => {
      render(<PurposeCard {...defaultProps} />)

      expect(screen.getByRole('radio')).toHaveAttribute('tabIndex', '0')
    })

    it('is not focusable when disabled', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      expect(screen.getByRole('radio')).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<PurposeCard {...defaultProps} className="custom-class" />)

      const card = screen.getByRole('radio')
      expect(card).toHaveClass('custom-class')
    })

    it('applies selected styles when selected', () => {
      render(<PurposeCard {...defaultProps} selected={true} />)

      const card = screen.getByRole('radio')
      expect(card).toHaveClass('border-primary')
    })

    it('applies disabled styles when disabled', () => {
      render(<PurposeCard {...defaultProps} disabled={true} />)

      const card = screen.getByRole('radio')
      expect(card).toHaveClass('opacity-50')
      expect(card).toHaveClass('cursor-not-allowed')
    })
  })

  describe('Integration with statistics pages', () => {
    it('works with correlation-style data', () => {
      const correlationInfo = {
        title: 'Pearson Correlation',
        subtitle: 'Pearson r',
        description: 'Linear correlation between continuous variables',
        example: 'Height and weight relationship'
      }

      render(
        <PurposeCard
          icon={<TrendingUp />}
          title={correlationInfo.title}
          subtitle={correlationInfo.subtitle}
          description={correlationInfo.description}
          examples={correlationInfo.example}
          selected={false}
          onClick={vi.fn()}
        >
          <div>Range: -1 to +1</div>
        </PurposeCard>
      )

      expect(screen.getByText('Pearson Correlation')).toBeInTheDocument()
      expect(screen.getByText('Pearson r')).toBeInTheDocument()
      expect(screen.getByText('Linear correlation between continuous variables')).toBeInTheDocument()
      expect(screen.getByText(/Height and weight relationship/)).toBeInTheDocument()
      expect(screen.getByText('Range: -1 to +1')).toBeInTheDocument()
    })

    it('works with t-test-style data', () => {
      const tTestInfo = {
        title: 'Independent Samples t-test',
        subtitle: 'Two-Sample t-test',
        description: 'Compare means of two independent groups'
      }

      render(
        <PurposeCard
          icon={<Activity />}
          title={tTestInfo.title}
          subtitle={tTestInfo.subtitle}
          description={tTestInfo.description}
          selected={true}
          onClick={vi.fn()}
        />
      )

      expect(screen.getByText('Independent Samples t-test')).toBeInTheDocument()
      expect(screen.getByText('Two-Sample t-test')).toBeInTheDocument()
    })
  })
})
