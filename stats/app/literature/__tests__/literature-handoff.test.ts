import { describe, expect, it, vi } from 'vitest'
import {
  buildPapersCitationAttachUrl,
  handoffCitationToPapers,
} from '../literature-handoff'

describe('literature handoff', () => {
  it('builds a papers handoff URL with document, section, and citation context', () => {
    expect(buildPapersCitationAttachUrl('doc-1', 'discussion', 'smith-2021')).toBe(
      '/papers?doc=doc-1&section=discussion&attachCitation=smith-2021',
    )
  })

  it('replaces browser history and dispatches popstate instead of forcing a reload', () => {
    const replaceState = vi.fn()
    const dispatchEvent = vi.fn()

    handoffCitationToPapers(
      { replaceState },
      { dispatchEvent },
      'doc-1',
      'discussion',
      'smith-2021',
    )

    expect(replaceState).toHaveBeenCalledWith(
      {},
      '',
      '/papers?doc=doc-1&section=discussion&attachCitation=smith-2021',
    )
    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(dispatchEvent.mock.calls[0]?.[0]).toBeInstanceOf(PopStateEvent)
  })
})
