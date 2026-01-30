import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResultSummaryCard, ResultSummaryInline } from '@/components/statistics/common/ResultSummaryCard'

// Mock clipboard API
const mockWriteText = vi.fn(() => Promise.resolve())

describe('ResultSummaryCard', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  describe('Basic Rendering', () => {
    it('renders test name in header', () => {
      render(
        <ResultSummaryCard
          testName="Sign Test"
          statistic={{ name: 'S', value: 15 }}
          pValue={0.032}
          isSignificant={true}
        />
      )

      expect(screen.getByText('Sign Test')).toBeInTheDocument()
    })

    it('renders statistic in 3-column grid', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
        />
      )

      expect(screen.getByText('Statistic')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()
      expect(screen.getByText('Effect Size')).toBeInTheDocument()
    })

    it('displays statistic value with df', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
        />
      )

      // Multiple elements may exist (grid + APA reference), so use getAllByText
      const elements = screen.getAllByText(/t\(28\) = 2\.456/)
      expect(elements.length).toBeGreaterThan(0)
    })

    it('displays statistic with numerator/denominator df', () => {
      render(
        <ResultSummaryCard
          testName="ANOVA"
          statistic={{
            name: 'F',
            value: 4.123,
            df: { numerator: 2, denominator: 45 }
          }}
          pValue={0.023}
          isSignificant={true}
        />
      )

      const elements = screen.getAllByText(/F\(2, 45\) = 4\.123/)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('Effect Size Display', () => {
    it('displays effect size when provided', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          effectSize={{
            value: 0.65,
            type: "Cohen's d",
            interpretation: 'medium'
          }}
        />
      )

      // Effect size value appears in grid and possibly in APA reference
      const valueElements = screen.getAllByText(/0\.650/)
      expect(valueElements.length).toBeGreaterThan(0)
      expect(screen.getByText("Cohen's d (medium)")).toBeInTheDocument()
    })

    it('shows dash when effect size not provided', () => {
      render(
        <ResultSummaryCard
          testName="Sign Test"
          statistic={{ name: 'S', value: 15 }}
          pValue={0.032}
          isSignificant={true}
        />
      )

      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  describe('Significance Display', () => {
    it('shows significant badge when isSignificant is true', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
        />
      )

      expect(screen.getByText('Significant')).toBeInTheDocument()
    })

    it('shows not significant badge when isSignificant is false', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 1.2, df: 28 }}
          pValue={0.24}
          isSignificant={false}
        />
      )

      expect(screen.getByText('Not Significant')).toBeInTheDocument()
    })

    it('displays default conclusion for significant result', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
        />
      )

      expect(screen.getByText('Reject null hypothesis')).toBeInTheDocument()
    })

    it('displays default conclusion for non-significant result', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 1.2, df: 28 }}
          pValue={0.24}
          isSignificant={false}
        />
      )

      expect(screen.getByText('Fail to reject null hypothesis')).toBeInTheDocument()
    })

    it('displays custom conclusion when provided', () => {
      render(
        <ResultSummaryCard
          testName="Sign Test"
          statistic={{ name: 'S', value: 15 }}
          pValue={0.032}
          isSignificant={true}
          conclusion="Median differs from hypothesized value"
        />
      )

      expect(screen.getByText('Median differs from hypothesized value')).toBeInTheDocument()
    })
  })

  describe('APA Format Copy', () => {
    it('generates correct APA string', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          effectSize={{ value: 0.65, type: 'd' }}
          showCopyButton={true}
        />
      )

      // APA reference string should be displayed at bottom
      expect(screen.getByText(/t\(28\) = 2\.456, p = \.021, d = 0\.650/)).toBeInTheDocument()
    })

    it('copies full APA string to clipboard', async () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          showCopyButton={true}
        />
      )

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('t(28) = 2.456, p = .021')
      }, { timeout: 1000 })
    })

    it('includes effect size in copied APA string', async () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          effectSize={{ value: 0.65, type: 'd' }}
          showCopyButton={true}
        />
      )

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('t(28) = 2.456, p = .021, d = 0.650')
      }, { timeout: 1000 })
    })

    it('hides copy button when showCopyButton is false', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          showCopyButton={false}
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('renders in compact single-row layout', () => {
      const { container } = render(
        <ResultSummaryCard
          testName="Sign Test"
          statistic={{ name: 'S', value: 15 }}
          pValue={0.032}
          isSignificant={true}
          compact={true}
        />
      )

      // Should not have the 3-column grid
      expect(container.querySelector('.grid-cols-3')).not.toBeInTheDocument()
    })

    it('shows all key information in compact mode', () => {
      render(
        <ResultSummaryCard
          testName="Sign Test"
          statistic={{ name: 'S', value: 15 }}
          pValue={0.032}
          isSignificant={true}
          compact={true}
        />
      )

      expect(screen.getByText('Sign Test')).toBeInTheDocument()
      expect(screen.getByText(/S = 15\.000/)).toBeInTheDocument()
    })

    it('shows effect size in compact mode when provided', () => {
      render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          effectSize={{ value: 0.65, type: 'd' }}
          compact={true}
        />
      )

      expect(screen.getByText(/d = 0\.650/)).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('applies significant border styling', () => {
      const { container } = render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('border-stat-significant/30')
    })

    it('applies non-significant border styling', () => {
      const { container } = render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 1.2, df: 28 }}
          pValue={0.24}
          isSignificant={false}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('border-gray-200')
    })

    it('applies custom className', () => {
      const { container } = render(
        <ResultSummaryCard
          testName="t-Test"
          statistic={{ name: 't', value: 2.456, df: 28 }}
          pValue={0.021}
          isSignificant={true}
          className="custom-class"
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('custom-class')
    })
  })
})

describe('ResultSummaryInline', () => {
  it('renders inline format', () => {
    render(
      <ResultSummaryInline
        statistic={{ name: 't', value: 2.456, df: 28 }}
        pValue={0.021}
      />
    )

    expect(screen.getByText(/t\(28\) = 2\.456/)).toBeInTheDocument()
  })

  it('calculates significance automatically', () => {
    render(
      <ResultSummaryInline
        statistic={{ name: 't', value: 2.456, df: 28 }}
        pValue={0.021}
        alpha={0.05}
      />
    )

    // Should show CheckCircle2 icon (significant)
    const container = screen.getByText(/t\(28\) = 2\.456/).closest('div')
    expect(container).toBeInTheDocument()
  })

  it('shows effect size when provided', () => {
    render(
      <ResultSummaryInline
        statistic={{ name: 't', value: 2.456, df: 28 }}
        pValue={0.021}
        effectSize={{ value: 0.65, type: 'd' }}
      />
    )

    expect(screen.getByText(/d = 0\.650/)).toBeInTheDocument()
  })

  it('respects custom alpha level', () => {
    render(
      <ResultSummaryInline
        statistic={{ name: 't', value: 1.8, df: 28 }}
        pValue={0.08}
        alpha={0.10}
      />
    )

    // p=0.08 < alpha=0.10, should be significant
    const container = screen.getByText(/t\(28\) = 1\.800/).closest('div')
    expect(container).toBeInTheDocument()
  })
})
