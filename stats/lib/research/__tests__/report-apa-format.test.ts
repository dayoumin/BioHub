import { describe, expect, it } from 'vitest'
import { generateAnalysisContent } from '../report-apa-format'

describe('report-apa-format', () => {
  it('Welch ANOVA fallback includes variant label and array df', () => {
    const content = generateAnalysisContent('ANOVA Result', {
      kind: 'analysis',
      results: {
        fStatistic: 4.23,
        pValue: 0.017,
        df: [2, 11.4],
        testVariant: 'welch',
      },
      methodId: 'one-way-anova',
      methodCategory: 'anova',
    })

    expect(content.body).toContain('Welch ANOVA:')
    expect(content.body).toContain('F(2, 11.40) = 4.23')
    expect(content.body).toContain('p = 0.017')
  })
})
