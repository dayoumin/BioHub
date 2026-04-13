import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VariablePicker } from '@/components/analysis/hub/VariablePicker'

describe('VariablePicker', () => {
  it('allows dependent-only clarification to complete with an existing independent variable', () => {
    const onConfirm = vi.fn()

    render(
      <VariablePicker
        candidateColumns={[
          { column: 'age', type: 'numeric', sampleGroups: [] },
          { column: 'outcome', type: 'numeric', sampleGroups: [] },
        ]}
        partialAssignments={{ independent: ['age'] }}
        missingRoles={['dependent']}
        suggestedAnalyses={[]}
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'outcome' })[0]!)
    fireEvent.click(screen.getByTestId('variable-picker-confirm'))

    expect(onConfirm).toHaveBeenCalledWith({
      independent: ['age'],
      dependent: ['outcome'],
    })
  })
})
