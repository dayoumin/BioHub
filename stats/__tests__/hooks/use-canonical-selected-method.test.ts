import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanonicalSelectedMethod } from '@/hooks/use-canonical-selected-method'

describe('useCanonicalSelectedMethod', () => {
  it('normalizes compat aliases to canonical IDs while preserving the display name', () => {
    const { result } = renderHook(() => useCanonicalSelectedMethod({
      id: 't-test',
      name: 't-test (독립표본)',
      category: 't-test',
      description: '',
    }))

    expect(result.current).toEqual(expect.objectContaining({
      id: 'two-sample-t',
      name: 't-test (독립표본)',
      category: 't-test',
    }))
  })

  it('returns null for nullish input', () => {
    const { result } = renderHook(() => useCanonicalSelectedMethod(null))

    expect(result.current).toBeNull()
  })

  it('promotes mann-kendall page alias to its canonical time-series method id', () => {
    const { result } = renderHook(() => useCanonicalSelectedMethod({
      id: 'mann-kendall',
      name: 'Mann-Kendall',
      category: 'timeseries',
      description: '',
    }))

    expect(result.current).toEqual(expect.objectContaining({
      id: 'mann-kendall-test',
      name: 'Mann-Kendall',
      category: 'timeseries',
    }))
  })
})
