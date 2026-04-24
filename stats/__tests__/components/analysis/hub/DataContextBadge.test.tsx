import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataContextBadge } from '@/components/analysis/hub/DataContextBadge'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({ language: 'en' }),
}))

vi.mock('@/lib/stores/hub-chat-store', () => ({
  useHubChatStore: (selector: (state: {
    dataContext: {
      fileName: string
      totalRows: number
      columnCount: number
      numericColumns: string[]
      categoricalColumns: string[]
    }
  }) => unknown) =>
    selector({
      dataContext: {
        fileName: 'fish-growth.csv',
        totalRows: 24,
        columnCount: 4,
        numericColumns: ['length_cm', 'weight_g'],
        categoricalColumns: ['species'],
      },
    }),
}))

describe('DataContextBadge', () => {
  it('renders English fallback copy for the hub data context badge', () => {
    const onClear = vi.fn()

    render(<DataContextBadge onClear={onClear} />)

    expect(screen.getByLabelText('Toggle data details')).toBeInTheDocument()
    expect(screen.getByText('(24 rows x 4 columns)')).toBeInTheDocument()
    expect(screen.getByLabelText('Remove data')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Toggle data details'))

    expect(screen.getByText('Numeric:')).toBeInTheDocument()
    expect(screen.getByText('Categorical:')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove data'))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
