/**
 * document-docx-export 테스트
 *
 * hasVisibleContent: 섹션 콘텐츠 가시성 판정
 * parseInlineMarks: 마크다운 인라인 마크 파싱
 */

import type { DocumentSection } from '@/lib/research/document-blueprint-types'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return { ...orig, downloadBlob: vi.fn() }
})

import { hasVisibleContent, parseInlineMarks } from '@/lib/services/export/document-docx-export'

// ─── 픽스처 ───

function makeSection(overrides: Partial<DocumentSection> = {}): DocumentSection {
  return {
    id: 'test-section',
    title: 'Test',
    content: '',
    sourceRefs: [],
    editable: true,
    generatedBy: 'user',
    ...overrides,
  }
}

// ─── hasVisibleContent ───

describe('hasVisibleContent', () => {
  it('content만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({ content: '본문 텍스트' }))).toBe(true)
  })

  it('tables만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({
      tables: [{ caption: 'Table 1', headers: ['A'], rows: [['1']] }],
    }))).toBe(true)
  })

  it('figures만 있으면 true', () => {
    expect(hasVisibleContent(makeSection({
      figures: [{ entityId: 'g1', label: 'Figure 1', caption: '차트' }],
    }))).toBe(true)
  })

  it('모두 없으면 false', () => {
    expect(hasVisibleContent(makeSection())).toBe(false)
  })

  it('빈 배열이면 false', () => {
    expect(hasVisibleContent(makeSection({ tables: [], figures: [] }))).toBe(false)
  })
})

// ─── parseInlineMarks ───

describe('parseInlineMarks', () => {
  it('plain text → 단일 run', () => {
    const runs = parseInlineMarks('hello world')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'hello world' })
  })

  it('**bold** → bold run', () => {
    const runs = parseInlineMarks('앞 **굵게** 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '굵게', bold: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('*italic* → italic run', () => {
    const runs = parseInlineMarks('앞 *기울임* 뒤')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: '앞 ' })
    expect(runs[1]).toEqual({ text: '기울임', italic: true })
    expect(runs[2]).toEqual({ text: ' 뒤' })
  })

  it('bold와 italic 혼재', () => {
    const runs = parseInlineMarks('**a** and *b*')
    expect(runs).toHaveLength(3)
    expect(runs[0]).toEqual({ text: 'a', bold: true })
    expect(runs[1]).toEqual({ text: ' and ' })
    expect(runs[2]).toEqual({ text: 'b', italic: true })
  })

  it('마크 없는 텍스트', () => {
    const runs = parseInlineMarks('no formatting here')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: 'no formatting here' })
  })

  it('빈 문자열', () => {
    const runs = parseInlineMarks('')
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual({ text: '' })
  })
})
