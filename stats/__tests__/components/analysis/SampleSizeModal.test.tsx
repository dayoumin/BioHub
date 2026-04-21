import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SampleSizeModal } from '@/components/analysis/hub/SampleSizeModal'

let mockLanguage: 'ko' | 'en' = 'ko'

vi.mock('@/hooks/use-app-preferences', () => ({
  useAppPreferences: () => ({
    currentLanguage: mockLanguage,
  }),
}))

describe('SampleSizeModal', () => {
  beforeEach(() => {
    mockLanguage = 'ko'
  })

  it('renders English copy and emits an English prompt when UI language is English', async () => {
    mockLanguage = 'en'
    const user = userEvent.setup()
    const onStartAnalysis = vi.fn()

    render(
      <SampleSizeModal
        open={true}
        onClose={vi.fn()}
        onStartAnalysis={onStartAnalysis}
      />
    )

    expect(screen.getByText('Sample Size Calculator')).toBeInTheDocument()
    expect(screen.getByText('Independent t-test')).toBeInTheDocument()
    expect(screen.getByText('Required sample size')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start analysis with this test' }))

    expect(onStartAnalysis).toHaveBeenCalledWith(
      'Run an independent samples t-test to compare the means of two groups'
    )
  })

  it('renders English result labels and validation errors without Korean leakage', async () => {
    mockLanguage = 'en'
    const user = userEvent.setup()

    render(
      <SampleSizeModal
        open={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('per group')).toBeInTheDocument()
    expect(screen.getByText(/Total N/)).toBeInTheDocument()

    const effectSizeInput = screen.getAllByDisplayValue('0.5')[0]
    await user.clear(effectSizeInput)
    await user.type(effectSizeInput, '0')

    expect(screen.getByText("Effect size d must be greater than 0.")).toBeInTheDocument()
    expect(screen.queryByText('그룹당')).not.toBeInTheDocument()
  })
})
