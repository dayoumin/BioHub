import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LiveDataSummary } from '@/components/analysis/variable-selector/LiveDataSummary'
import type { SlotConfig } from '@/components/analysis/variable-selector/slot-configs'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({ language: 'en' }),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
}))

describe('LiveDataSummary', () => {
  it('renders English fallback copy for the active summary panel', () => {
    const slots: SlotConfig[] = [
      {
        id: 'dependent',
        mappingKey: 'dependentVar',
        label: 'Dependent variable',
        description: 'Numeric outcome variable',
        accepts: ['numeric'],
        required: true,
        multiple: false,
        colorScheme: 'info',
      },
      {
        id: 'group',
        mappingKey: 'groupVar',
        label: 'Group variable',
        description: 'Categorical grouping variable',
        accepts: ['categorical'],
        required: false,
        multiple: false,
        colorScheme: 'success',
      },
    ]

    render(
      <LiveDataSummary
        data={[
          { score: 10, treatment: 'A' },
          { score: null, treatment: 'B' },
        ]}
        assignments={{
          dependent: ['score'],
          group: ['treatment'],
        }}
        slots={slots}
        columns={[
          { name: 'score', type: 'numeric' },
          { name: 'treatment', type: 'categorical' },
        ]}
      />
    )

    expect(screen.getByText('Data summary')).toBeInTheDocument()
    expect(screen.getByText('Total samples')).toBeInTheDocument()
    expect(screen.getByText('Numeric')).toBeInTheDocument()
    expect(screen.getAllByText(/Valid/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Missing/)).toBeInTheDocument()
    expect(screen.getByText('Group counts')).toBeInTheDocument()
  })
})
