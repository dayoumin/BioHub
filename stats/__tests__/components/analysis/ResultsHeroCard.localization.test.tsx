import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ResultsHeroCard } from '@/components/analysis/steps/results/ResultsHeroCard'
import { generic } from '@/lib/terminology/domains/generic'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => {
      const { initial, animate, exit, transition, variants, ...rest } = props
      return <div ref={ref} {...rest}>{children as React.ReactNode}</div>
    }),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

const statisticalResult: StatisticalResult = {
  testName: 'One-Sample t-Test',
  statisticName: 't',
  statistic: 2.3456,
  pValue: 0.012,
  interpretation: 'Statistically significant difference found.',
  description: 'A one-sample t-test was run.',
  variables: ['length_cm', 'weight_g', 'condition_factor', 'year', 'species'],
  effectSize: null,
  confidenceInterval: null,
} as unknown as StatisticalResult

describe('ResultsHeroCard localization', () => {
  it('renders hero metadata labels from terminology in English', () => {
    render(
      <ResultsHeroCard
        statisticalResult={statisticalResult}
        methodId="one-sample-t"
        isSignificant={true}
        assumptionsPassed={true}
        resultTimestamp={new Date('2026-04-23T09:00:00Z')}
        apaFormat="t(19) = 2.35, p = .012"
        uploadedFileName="fish-growth.csv"
        uploadedData={[{ length_cm: 12.3, weight_g: 42.1 }]}
        executionSettingEntries={[{ key: 'alternative', label: 'Alternative', value: 'Greater' }]}
        prefersReducedMotion
        presentationLanguage="en"
        t={{ results: generic.results }}
      />,
    )

    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy APA')).toBeInTheDocument()
    expect(screen.getByText('File · fish-growth.csv')).toBeInTheDocument()
    expect(screen.getByText('R validated')).toBeInTheDocument()
    expect(screen.getByText('Options')).toBeInTheDocument()
  })
})
