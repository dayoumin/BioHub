import { describe, expect, it } from 'vitest'
import { parseQuickGoSummary, QuickGoError } from '@/lib/genetics/quickgo'

describe('parseQuickGoSummary', () => {
  it('term 정의와 계층 정보를 요약한다', () => {
    const summary = parseQuickGoSummary(
      {
        id: 'GO:0005344',
        name: 'oxygen carrier activity',
        aspect: 'molecular_function',
        isObsolete: false,
        definition: { text: 'Binding to oxygen and delivering it.' },
        usage: 'Unrestricted',
        comment: 'Carrier terms move with their cargo.',
        synonyms: [
          { name: 'oxygen-carrying', type: 'narrow' },
          { name: 'globin', type: 'narrow' },
        ],
        children: [
          { id: 'GO:1234567', relation: 'is_a' },
        ],
        ancestors: ['GO:0140104', 'GO:0003674', 'GO:0005344'],
      },
      [
        { id: 'GO:1234567', name: 'example child term' },
      ],
      [
        { id: 'GO:0140104', name: 'molecular carrier activity' },
        { id: 'GO:0003674', name: 'molecular_function' },
      ],
      [
        { child: 'GO:0005344', parent: 'GO:0140104', relationship: 'is_a' },
        { child: 'GO:0140104', parent: 'GO:0003674', relationship: 'is_a' },
      ],
    )

    expect(summary.id).toBe('GO:0005344')
    expect(summary.name).toBe('oxygen carrier activity')
    expect(summary.aspect).toBe('molecular_function')
    expect(summary.definition).toBe('Binding to oxygen and delivering it.')
    expect(summary.synonyms).toEqual([
      { name: 'oxygen-carrying', type: 'narrow' },
      { name: 'globin', type: 'narrow' },
    ])
    expect(summary.children).toEqual([
      { id: 'GO:1234567', name: 'example child term', relation: 'is_a' },
    ])
    expect(summary.ancestors).toEqual([
      { id: 'GO:0140104', name: 'molecular carrier activity' },
      { id: 'GO:0003674', name: 'molecular_function' },
    ])
    expect(summary.pathToRoot).toEqual([
      { child: 'GO:0005344', parent: 'GO:0140104', relationship: 'is_a' },
      { child: 'GO:0140104', parent: 'GO:0003674', relationship: 'is_a' },
    ])
  })

  it('필수 필드가 없으면 에러를 던진다', () => {
    expect(() => parseQuickGoSummary({}, [], [], [])).toThrow(QuickGoError)
  })
})
