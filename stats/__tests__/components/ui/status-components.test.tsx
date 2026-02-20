import { render, screen } from '@testing-library/react'
import {
  StatusBadge,
  SuccessBadge,
  ErrorBadge,
  WarningBadge,
  InfoBadge,
} from '@/components/ui/status-badge'
import {
  StatusIcon,
  SuccessIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
} from '@/components/ui/status-icon'
import {
  StatusText,
  SuccessText,
  ErrorText,
  WarningText,
  InfoText,
} from '@/components/ui/status-text'
import {
  SignificanceIndicator,
  PValueDisplay,
} from '@/components/ui/significance-indicator'

// =============================================================================
// StatusBadge Tests
// =============================================================================

describe('StatusBadge', () => {
  it('renders with default variant (neutral)', () => {
    render(<StatusBadge>Test</StatusBadge>)
    const badge = screen.getByText('Test')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-muted')
  })

  it('renders success variant with correct classes', () => {
    render(<StatusBadge variant="success">Valid</StatusBadge>)
    const badge = screen.getByText('Valid')
    expect(badge).toHaveClass('bg-success-bg')
    expect(badge).toHaveClass('text-success')
    expect(badge).toHaveClass('border-success-border')
  })

  it('renders error variant with correct classes', () => {
    render(<StatusBadge variant="error">Invalid</StatusBadge>)
    const badge = screen.getByText('Invalid')
    expect(badge).toHaveClass('bg-error-bg')
    expect(badge).toHaveClass('text-error')
  })

  it('renders warning variant with correct classes', () => {
    render(<StatusBadge variant="warning">Caution</StatusBadge>)
    const badge = screen.getByText('Caution')
    expect(badge).toHaveClass('bg-warning-bg')
    expect(badge).toHaveClass('text-warning')
  })

  it('renders info variant with correct classes', () => {
    render(<StatusBadge variant="info">Info</StatusBadge>)
    const badge = screen.getByText('Info')
    expect(badge).toHaveClass('bg-info-bg')
    expect(badge).toHaveClass('text-info')
  })

  it('applies size variants correctly', () => {
    const { rerender } = render(<StatusBadge size="sm">Small</StatusBadge>)
    expect(screen.getByText('Small')).toHaveClass('text-[10px]')

    rerender(<StatusBadge size="lg">Large</StatusBadge>)
    expect(screen.getByText('Large')).toHaveClass('text-sm')
  })

  it('applies custom className', () => {
    render(<StatusBadge className="custom-class">Test</StatusBadge>)
    expect(screen.getByText('Test')).toHaveClass('custom-class')
  })
})

describe('Convenience Badge Components', () => {
  it('SuccessBadge renders with success variant', () => {
    render(<SuccessBadge>Passed</SuccessBadge>)
    expect(screen.getByText('Passed')).toHaveClass('bg-success-bg')
  })

  it('ErrorBadge renders with error variant', () => {
    render(<ErrorBadge>Failed</ErrorBadge>)
    expect(screen.getByText('Failed')).toHaveClass('bg-error-bg')
  })

  it('WarningBadge renders with warning variant', () => {
    render(<WarningBadge>Warning</WarningBadge>)
    expect(screen.getByText('Warning')).toHaveClass('bg-warning-bg')
  })

  it('InfoBadge renders with info variant', () => {
    render(<InfoBadge>Info</InfoBadge>)
    expect(screen.getByText('Info')).toHaveClass('bg-info-bg')
  })
})

// =============================================================================
// StatusIcon Tests
// =============================================================================

describe('StatusIcon', () => {
  it('renders success icon with correct color class', () => {
    render(<StatusIcon status="success" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('text-success')
  })

  it('renders error icon with correct color class', () => {
    render(<StatusIcon status="error" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('text-error')
  })

  it('renders warning icon with correct color class', () => {
    render(<StatusIcon status="warning" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('text-warning')
  })

  it('renders info icon with correct color class', () => {
    render(<StatusIcon status="info" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('text-info')
  })

  it('renders neutral icon with correct color class', () => {
    render(<StatusIcon status="neutral" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('text-muted-foreground')
  })

  it('applies filled class when filled prop is true', () => {
    render(<StatusIcon status="success" filled data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('fill-success-bg')
  })

  it('applies custom className', () => {
    render(<StatusIcon status="success" className="h-6 w-6" data-testid="icon" />)
    const icon = screen.getByTestId('icon')
    expect(icon).toHaveClass('h-6')
    expect(icon).toHaveClass('w-6')
  })
})

describe('Convenience Icon Components', () => {
  it('SuccessIcon renders with success status', () => {
    render(<SuccessIcon data-testid="icon" />)
    expect(screen.getByTestId('icon')).toHaveClass('text-success')
  })

  it('ErrorIcon renders with error status', () => {
    render(<ErrorIcon data-testid="icon" />)
    expect(screen.getByTestId('icon')).toHaveClass('text-error')
  })

  it('WarningIcon renders with warning status', () => {
    render(<WarningIcon data-testid="icon" />)
    expect(screen.getByTestId('icon')).toHaveClass('text-warning')
  })

  it('InfoIcon renders with info status', () => {
    render(<InfoIcon data-testid="icon" />)
    expect(screen.getByTestId('icon')).toHaveClass('text-info')
  })
})

// =============================================================================
// StatusText Tests
// =============================================================================

describe('StatusText', () => {
  it('renders with success color', () => {
    render(<StatusText status="success">Valid</StatusText>)
    const text = screen.getByText('Valid')
    expect(text).toHaveClass('text-success')
  })

  it('renders with error color', () => {
    render(<StatusText status="error">Invalid</StatusText>)
    const text = screen.getByText('Invalid')
    expect(text).toHaveClass('text-error')
  })

  it('renders with muted variant', () => {
    render(<StatusText status="success" muted>Muted</StatusText>)
    const text = screen.getByText('Muted')
    expect(text).toHaveClass('text-success-muted')
  })

  it('applies custom className', () => {
    render(<StatusText status="success" className="font-bold">Bold</StatusText>)
    const text = screen.getByText('Bold')
    expect(text).toHaveClass('font-bold')
  })
})

describe('Convenience Text Components', () => {
  it('SuccessText renders with success color', () => {
    render(<SuccessText>Success</SuccessText>)
    expect(screen.getByText('Success')).toHaveClass('text-success')
  })

  it('ErrorText renders with error color', () => {
    render(<ErrorText>Error</ErrorText>)
    expect(screen.getByText('Error')).toHaveClass('text-error')
  })

  it('WarningText renders with warning color', () => {
    render(<WarningText>Warning</WarningText>)
    expect(screen.getByText('Warning')).toHaveClass('text-warning')
  })

  it('InfoText renders with info color', () => {
    render(<InfoText>Info</InfoText>)
    expect(screen.getByText('Info')).toHaveClass('text-info')
  })
})

// =============================================================================
// SignificanceIndicator Tests
// =============================================================================

describe('SignificanceIndicator', () => {
  it('displays "Highly Significant" for p < 0.01', () => {
    render(<SignificanceIndicator pValue={0.005} />)
    expect(screen.getByText('Highly Significant')).toBeInTheDocument()
  })

  it('displays "Significant" for p < 0.05', () => {
    render(<SignificanceIndicator pValue={0.03} />)
    expect(screen.getByText('Significant')).toBeInTheDocument()
  })

  it('displays "Not Significant" for p >= 0.05', () => {
    render(<SignificanceIndicator pValue={0.15} />)
    expect(screen.getByText('Not Significant')).toBeInTheDocument()
  })

  it('respects custom alpha value', () => {
    // With alpha = 0.01, p = 0.03 should be not significant
    render(<SignificanceIndicator pValue={0.03} alpha={0.01} />)
    expect(screen.getByText('Not Significant')).toBeInTheDocument()
  })

  it('hides icon when showIcon is false', () => {
    render(<SignificanceIndicator pValue={0.03} showIcon={false} />)
    // Should only have the text, no icon
    const container = screen.getByText('Significant').parentElement
    expect(container?.children.length).toBe(1)
  })

  it('hides label when showLabel is false', () => {
    render(<SignificanceIndicator pValue={0.03} showLabel={false} />)
    expect(screen.queryByText('Significant')).not.toBeInTheDocument()
  })
})

// =============================================================================
// PValueDisplay Tests
// =============================================================================

describe('PValueDisplay', () => {
  it('displays formatted p-value with default precision', () => {
    render(<PValueDisplay value={0.0234} />)
    expect(screen.getByText(/0\.0234/)).toBeInTheDocument()
  })

  it('displays "< 0.001" for very small p-values', () => {
    render(<PValueDisplay value={0.0001} />)
    expect(screen.getByText(/< 0\.001/)).toBeInTheDocument()
  })

  it('adds ** for highly significant values (p < 0.01)', () => {
    render(<PValueDisplay value={0.005} />)
    expect(screen.getByText(/\*\*/)).toBeInTheDocument()
  })

  it('adds * for significant values (0.01 <= p < 0.05)', () => {
    render(<PValueDisplay value={0.03} />)
    const element = screen.getByText(/0\.0300/)
    expect(element.textContent).toContain('*')
    expect(element.textContent).not.toContain('**')
  })

  it('no asterisk for non-significant values (p >= 0.05)', () => {
    render(<PValueDisplay value={0.15} />)
    const element = screen.getByText(/0\.1500/)
    expect(element.textContent).not.toContain('*')
  })

  it('respects custom precision', () => {
    render(<PValueDisplay value={0.12345} precision={2} />)
    expect(screen.getByText(/0\.12/)).toBeInTheDocument()
  })

  it('applies correct color class for highly significant', () => {
    render(<PValueDisplay value={0.005} data-testid="pvalue" />)
    // The component wraps text in a span, we need to find it differently
    const element = screen.getByText(/0\.0050/).closest('span')
    expect(element).toHaveClass('text-stat-highly-significant')
  })

  it('applies correct color class for significant', () => {
    render(<PValueDisplay value={0.03} />)
    const element = screen.getByText(/0\.0300/).closest('span')
    expect(element).toHaveClass('text-stat-significant')
  })

  it('applies correct color class for not significant', () => {
    render(<PValueDisplay value={0.15} />)
    const element = screen.getByText(/0\.1500/).closest('span')
    expect(element).toHaveClass('text-stat-non-significant')
  })
})
