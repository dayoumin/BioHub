import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TestStatisticDisplay, TestStatisticInline } from '@/components/statistics/common/TestStatisticDisplay'

// Mock clipboard API
const mockWriteText = vi.fn(() => Promise.resolve())

describe('TestStatisticDisplay', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  describe('APA Format Generation', () => {
    it('generates correct APA string for t-test with single df', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.456}
          df={28}
          pValue={0.021}
        />
      )

      // Check APA formatted string is displayed
      expect(screen.getByText(/t\(28\) = 2\.456, p = \.021/)).toBeInTheDocument()
    })

    it('generates correct APA string for F-test with numerator/denominator df', () => {
      render(
        <TestStatisticDisplay
          name="F"
          value={4.123}
          df={{ numerator: 2, denominator: 45 }}
          pValue={0.023}
        />
      )

      expect(screen.getByText(/F\(2, 45\) = 4\.123, p = \.023/)).toBeInTheDocument()
    })

    it('formats p-value < 0.001 as "< .001"', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={5.678}
          df={30}
          pValue={0.0001}
        />
      )

      expect(screen.getByText(/p < \.001/)).toBeInTheDocument()
    })

    it('removes leading zero from p-value', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.0}
          df={20}
          pValue={0.045}
        />
      )

      // Should show ".045" not "0.045"
      expect(screen.getByText(/p = \.045/)).toBeInTheDocument()
    })

    it('handles statistic without df', () => {
      render(
        <TestStatisticDisplay
          name="Z"
          value={1.96}
          pValue={0.05}
        />
      )

      expect(screen.getByText(/Z = 1\.960, p = \.050/)).toBeInTheDocument()
    })
  })

  describe('Significance Indicators', () => {
    it('shows significant indicator when p < alpha', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.5}
          df={28}
          pValue={0.02}
          alpha={0.05}
        />
      )

      expect(screen.getByText('Significant')).toBeInTheDocument()
      // Check for reject H0 text (component uses alpha value)
      expect(screen.getByText(/reject H₀/)).toBeInTheDocument()
    })

    it('shows not significant indicator when p >= alpha', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={1.5}
          df={28}
          pValue={0.15}
          alpha={0.05}
        />
      )

      expect(screen.getByText('Not Significant')).toBeInTheDocument()
      expect(screen.getByText(/fail to reject H₀/)).toBeInTheDocument()
    })

    it('uses custom alpha level', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.0}
          df={28}
          pValue={0.08}
          alpha={0.10}
        />
      )

      // p=0.08 < alpha=0.10, should be significant
      expect(screen.getByText('Significant')).toBeInTheDocument()
    })
  })

  describe('Copy to Clipboard', () => {
    it('copies APA string to clipboard when copy button clicked', async () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.456}
          df={28}
          pValue={0.021}
          showCopyButton={true}
        />
      )

      const copyButton = screen.getByRole('button')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('t(28) = 2.456, p = .021')
      }, { timeout: 1000 })
    })

    it('hides copy button when showCopyButton is false', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.456}
          df={28}
          pValue={0.021}
          showCopyButton={false}
        />
      )

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      const { container } = render(
        <TestStatisticDisplay
          name="t"
          value={2.0}
          df={28}
          pValue={0.05}
          size="sm"
        />
      )

      expect(container.querySelector('.text-lg')).toBeInTheDocument()
    })

    it('renders large size correctly', () => {
      const { container } = render(
        <TestStatisticDisplay
          name="t"
          value={2.0}
          df={28}
          pValue={0.05}
          size="lg"
        />
      )

      expect(container.querySelector('.text-3xl')).toBeInTheDocument()
    })
  })

  describe('Formatting Options', () => {
    it('hides formatted string when showFormatted is false', () => {
      render(
        <TestStatisticDisplay
          name="t"
          value={2.456}
          df={28}
          pValue={0.021}
          showFormatted={false}
        />
      )

      // Main value should still be shown
      expect(screen.getByText(/t\(28\) = 2\.456/)).toBeInTheDocument()
      // But the full APA string in the subtitle should not be shown twice
      const apaStrings = screen.queryAllByText(/t\(28\) = 2\.456, p = \.021/)
      expect(apaStrings.length).toBeLessThanOrEqual(1)
    })
  })
})

describe('TestStatisticInline', () => {
  beforeEach(() => {
    mockWriteText.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  it('renders inline APA string', () => {
    render(
      <TestStatisticInline
        name="t"
        value={2.456}
        df={28}
        pValue={0.021}
      />
    )

    expect(screen.getByText('t(28) = 2.456, p = .021')).toBeInTheDocument()
  })

  it('shows copy button when showCopyButton is true', async () => {
    render(
      <TestStatisticInline
        name="t"
        value={2.456}
        df={28}
        pValue={0.021}
        showCopyButton={true}
      />
    )

    const copyButton = screen.getByRole('button')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('hides copy button by default', () => {
    render(
      <TestStatisticInline
        name="t"
        value={2.456}
        df={28}
        pValue={0.021}
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
