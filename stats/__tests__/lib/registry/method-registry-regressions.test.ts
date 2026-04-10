import { describe, it, expect } from 'vitest'
import { getSelectorType } from '@/lib/registry'

describe('method registry regressions', () => {
  it('maps discriminant-analysis to the discriminant selector', () => {
    expect(getSelectorType('discriminant-analysis')).toBe('discriminant')
  })

  it('maps one-sample-proportion to the chi-square selector', () => {
    expect(getSelectorType('one-sample-proportion')).toBe('chi-square')
  })
})
