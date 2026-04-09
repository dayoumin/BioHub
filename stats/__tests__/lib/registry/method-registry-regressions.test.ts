import { describe, it, expect } from 'vitest'
import { getSelectorType } from '@/lib/registry'

describe('method registry regressions', () => {
  it('maps discriminant-analysis to the discriminant selector', () => {
    expect(getSelectorType('discriminant-analysis')).toBe('discriminant')
  })
})
