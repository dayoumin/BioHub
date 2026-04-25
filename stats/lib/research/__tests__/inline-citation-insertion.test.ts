import { describe, expect, it, vi } from 'vitest'
import { insertInlineCitationAtCursor } from '../inline-citation-insertion'

describe('insertInlineCitationAtCursor', () => {
  it('prefers deserialized inline nodes when the editor can preserve citation node structure', () => {
    const insertText = vi.fn()
    const insertNodes = vi.fn()

    const strategy = insertInlineCitationAtCursor({
      api: {
        markdown: {
          deserialize: vi.fn(() => [
            {
              type: 'p',
              children: [{ text: '[(Smith & Jones, 2021)](citation:cit_1)' }],
            },
          ]),
        },
      },
      tf: {
        insertText,
        insertNodes,
      },
    }, '[(Smith & Jones, 2021)](citation:cit_1)')

    expect(strategy).toBe('insert-inline-nodes')
    expect(insertNodes).toHaveBeenCalledWith([
      { text: '[(Smith & Jones, 2021)](citation:cit_1)' },
    ])
    expect(insertText).not.toHaveBeenCalled()
  })

  it('unwraps a single deserialized paragraph into inline children before insertion', () => {
    const insertNodes = vi.fn()

    const strategy = insertInlineCitationAtCursor({
      api: {
        markdown: {
          deserialize: vi.fn(() => [
            {
              type: 'p',
              children: [{ text: '[(Smith & Jones, 2021)](citation:cit_1)' }],
            },
          ]),
        },
      },
      tf: {
        insertNodes,
      },
    }, '[(Smith & Jones, 2021)](citation:cit_1)')

    expect(strategy).toBe('insert-inline-nodes')
    expect(insertNodes).toHaveBeenCalledWith([
      { text: '[(Smith & Jones, 2021)](citation:cit_1)' },
    ])
  })

  it('uses insertText when markdown deserialization fails but text insertion is available', () => {
    const insertText = vi.fn()
    const insertNodes = vi.fn()

    const strategy = insertInlineCitationAtCursor({
      api: {
        markdown: {
          deserialize: vi.fn(() => {
            throw new Error('deserialize failed')
          }),
        },
      },
      tf: {
        insertText,
        insertNodes,
      },
    }, '[(Smith & Jones, 2021)](citation:cit_1)')

    expect(strategy).toBe('insert-text')
    expect(insertText).toHaveBeenCalledWith('[(Smith & Jones, 2021)](citation:cit_1)')
    expect(insertNodes).not.toHaveBeenCalled()
  })

  it('falls back to inserting a raw text node when only node insertion is available', () => {
    const insertNodes = vi.fn()

    const strategy = insertInlineCitationAtCursor({
      api: {
        markdown: {
          deserialize: vi.fn(() => {
            throw new Error('deserialize failed')
          }),
        },
      },
      tf: {
        insertNodes,
      },
    }, '[(Smith & Jones, 2021)](citation:cit_1)')

    expect(strategy).toBe('insert-text-node')
    expect(insertNodes).toHaveBeenCalledWith([{ text: '[(Smith & Jones, 2021)](citation:cit_1)' }])
  })
})
