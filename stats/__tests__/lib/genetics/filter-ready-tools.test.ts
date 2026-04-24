import { describe, expect, it } from 'vitest'
import { filterReadyTools } from '@/lib/genetics/filter-ready-tools'

interface TestTool {
  id: string
  title: string
  ready: boolean
}

describe('filterReadyTools', () => {
  it('keeps only tools that exist and are marked ready', () => {
    const toolMap: Readonly<Record<string, TestTool | undefined>> = {
      a: { id: 'a', title: 'Alpha', ready: true },
      b: { id: 'b', title: 'Beta', ready: false },
      c: { id: 'c', title: 'Gamma', ready: true },
    }

    expect(filterReadyTools(['a', 'missing', 'b', 'c'], toolMap)).toEqual([
      { id: 'a', title: 'Alpha', ready: true },
      { id: 'c', title: 'Gamma', ready: true },
    ])
  })

  it('returns an empty list when every tool is missing or not ready', () => {
    const toolMap: Readonly<Record<string, TestTool | undefined>> = {
      a: { id: 'a', title: 'Alpha', ready: false },
    }

    expect(filterReadyTools(['missing', 'a'], toolMap)).toEqual([])
  })
})
