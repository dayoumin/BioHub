import { describe, it, expect } from 'vitest'
import { buildCitationString, formatAuthors } from '../citation-apa-formatter'
import { citationKey } from '../citation-types'
import type { LiteratureItem } from '@/lib/types/literature'

function makeItem(overrides: Partial<LiteratureItem> = {}): LiteratureItem {
  return {
    id: 'test_1',
    source: 'openalex',
    title: 'Population genetics of marine fish',
    authors: ['Kim Jungwoo', 'Lee Sunghee'],
    year: 2023,
    journal: 'Marine Biology',
    url: 'https://example.com',
    doi: '10.1234/mb.2023',
    searchedName: 'Gadus morhua',
    ...overrides,
  }
}

describe('formatAuthors', () => {
  it('저자 1명', () => {
    expect(formatAuthors(['Kim J'])).toBe('Kim J')
  })

  it('저자 2명: A, & B', () => {
    expect(formatAuthors(['Kim J', 'Lee S'])).toBe('Kim J, & Lee S')
  })

  it('저자 3명: A, B, & C', () => {
    expect(formatAuthors(['Kim J', 'Lee S', 'Park M'])).toBe('Kim J, Lee S, & Park M')
  })

  it('저자 8명 이상: 6명 + ... + 마지막', () => {
    const authors = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']
    expect(formatAuthors(authors)).toBe('A1, A2, A3, A4, A5, A6, ... A8')
  })

  it('저자 없음: Unknown', () => {
    expect(formatAuthors([])).toBe('Unknown')
  })
})

describe('buildCitationString', () => {
  it('doi가 있으면 https://doi.org/ 포함', () => {
    const result = buildCitationString(makeItem())
    expect(result).toContain('https://doi.org/10.1234/mb.2023')
  })

  it('doi 없으면 url 사용', () => {
    const result = buildCitationString(makeItem({ doi: undefined }))
    expect(result).toContain('https://example.com')
  })

  it('year가 null이면 (n.d.) 표시', () => {
    const result = buildCitationString(makeItem({ year: null }))
    expect(result).toContain('(n.d.)')
  })

  it('journal 없으면 생략', () => {
    const result = buildCitationString(makeItem({ journal: undefined }))
    expect(result).not.toContain('undefined')
  })

  it('전체 포맷: "저자. (연도). 제목. 저널. doi."', () => {
    const result = buildCitationString(makeItem({
      authors: ['Kim J'],
      year: 2023,
      title: 'Test Title',
      journal: 'Test Journal',
      doi: '10.0000/test',
    }))
    expect(result).toBe('Kim J. (2023). Test Title. Test Journal. https://doi.org/10.0000/test.')
  })
})

describe('citationKey', () => {
  it('DOI 대소문자를 정규화한다', () => {
    const upper = makeItem({ doi: '10.1234/AB.2023' })
    const lower = makeItem({ doi: '10.1234/ab.2023' })
    expect(citationKey(upper)).toBe(citationKey(lower))
  })

  it('DOI가 있으면 doi: prefix를 붙인다', () => {
    expect(citationKey(makeItem({ doi: '10.1234/test' }))).toBe('doi:10.1234/test')
  })

  it('DOI가 없으면 url을 그대로 사용한다', () => {
    expect(citationKey(makeItem({ doi: undefined, url: 'https://example.com/paper' })))
      .toBe('https://example.com/paper')
  })
})
