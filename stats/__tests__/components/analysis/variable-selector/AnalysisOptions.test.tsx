import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisOptionsSection } from '@/components/analysis/variable-selector/AnalysisOptions'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'

const mockSetAnalysisOptions = vi.fn()

const storeState = {
  analysisOptions: {
    alpha: 0.05,
    showAssumptions: true,
    showEffectSize: true,
    alternative: 'two-sided' as const,
    methodSettings: {},
  },
  setAnalysisOptions: mockSetAnalysisOptions,
}

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    selectorUI: {
      labels: {
        alpha: 'Alpha',
        testValue: 'Test value',
        assumptionTest: 'Assumptions',
        effectSize: 'Effect size',
      },
    },
  }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('AnalysisOptionsSection', () => {
  beforeEach(() => {
    storeState.analysisOptions = {
      alpha: 0.05,
      showAssumptions: true,
      showEffectSize: true,
      alternative: 'two-sided',
      methodSettings: {},
    }
    mockSetAnalysisOptions.mockClear()
  })

  it('initializes generic method setting defaults from method requirements', () => {
    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('power-analysis')} />
    )

    expect(mockSetAnalysisOptions).toHaveBeenCalledWith({
      methodSettings: {
        power: 0.8,
        effectSize: 0.5,
      },
    })
  })

  it('initializes managed defaults into analysisOptions state', () => {
    storeState.analysisOptions = {
      alpha: 0.05,
      showAssumptions: true,
      showEffectSize: true,
      alternative: 'two-sided',
      methodSettings: {},
    }

    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('proportion-test')} />
    )

    expect(mockSetAnalysisOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        ciMethod: 'wilson',
        nullProportion: 0.5,
      })
    )
  })

  it('initializes alternative when the store value is undefined', () => {
    storeState.analysisOptions = {
      alpha: 0.05,
      showAssumptions: true,
      showEffectSize: true,
      alternative: undefined as unknown as 'two-sided',
      methodSettings: {},
    }

    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('proportion-test')} />
    )

    expect(mockSetAnalysisOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        alternative: 'two-sided',
      })
    )
  })

  it('initializes managed numeric defaults such as testValue', () => {
    storeState.analysisOptions = {
      alpha: 0.05,
      showAssumptions: true,
      showEffectSize: true,
      alternative: 'two-sided',
      methodSettings: {},
    }

    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('one-sample-t')} />
    )

    expect(mockSetAnalysisOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        testValue: 0,
      })
    )
  })

  it('does not re-apply the default testValue while the user is typing a negative value', () => {
    const { rerender } = render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('one-sample-t')} />
    )

    mockSetAnalysisOptions.mockClear()
    storeState.analysisOptions = {
      ...storeState.analysisOptions,
      testValue: undefined,
    }

    rerender(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('one-sample-t')} />
    )

    expect(mockSetAnalysisOptions).not.toHaveBeenCalledWith(
      expect.objectContaining({
        testValue: 0,
      })
    )
  })

  it('renders schema-driven generic controls for select and numeric settings', () => {
    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('one-way-anova')} />
    )

    expect(screen.getByTestId('setting-postHoc-select')).toBeInTheDocument()
    expect(screen.getByTestId('setting-welch-select')).toBeInTheDocument()
  })

  it('updates generic numeric settings through methodSettings', () => {
    render(
      <AnalysisOptionsSection methodRequirements={getMethodRequirements('power-analysis')} />
    )

    mockSetAnalysisOptions.mockClear()

    fireEvent.change(screen.getByTestId('setting-effectSize-input'), {
      target: { value: '0.8' },
    })

    expect(mockSetAnalysisOptions).toHaveBeenCalledWith({
      methodSettings: {
        effectSize: 0.8,
      },
    })
  })
})
