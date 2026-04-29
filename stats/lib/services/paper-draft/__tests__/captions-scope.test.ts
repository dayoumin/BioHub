import { describe, expect, it } from 'vitest'
import { getCaptionsAutomationScope } from '../captions-scope'

describe('getCaptionsAutomationScope', () => {
  it('defines source-based caption facts and conservative prohibited claims', () => {
    const scope = getCaptionsAutomationScope('ko')

    expect(scope.autoFacts.map((item) => item.id)).toEqual(expect.arrayContaining([
      'table-number',
      'figure-number',
      'chart-type',
      'variable-labels',
      'table-statistics',
      'source-provenance',
    ]))
    expect(scope.userInputs.map((item) => item.id)).toEqual(expect.arrayContaining([
      'caption-message',
      'panel-description',
      'equipment-conditions',
      'journal-style',
    ]))
    expect(scope.prohibitedClaims.map((item) => item.id)).toEqual(expect.arrayContaining([
      'unsupported-pattern',
      'invented-panel-label',
      'equipment-inference',
      'magnification-inference',
      'unlinked-figure-result',
      'unlinked-table-result',
    ]))
  })

  it('blocks missing source and reviews figure-message gaps', () => {
    const scope = getCaptionsAutomationScope('en')

    expect(scope.blockedWhen).toEqual([
      'missing-source-provenance',
      'missing-caption-source',
    ])
    expect(scope.reviewWhen).toEqual([
      'missing-variable-metadata',
      'missing-caption-message',
      'missing-panel-description',
    ])
  })
})
