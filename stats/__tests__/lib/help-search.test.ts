/**
 * 도움말 검색 기능 테스트
 */

import {
  searchHelp,
  highlightMatch,
  getAllHelpItems,
  getHelpSectionsByCategory,
  HELP_CATEGORIES,
  SUGGESTED_QUERIES,
} from '../../lib/help'

describe('Help Search System', () => {
  describe('getAllHelpItems', () => {
    it('should return all help items as flat array', () => {
      const items = getAllHelpItems()
      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBeGreaterThan(0)
    })

    it('should have required fields in each item', () => {
      const items = getAllHelpItems()
      items.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('content')
        expect(item).toHaveProperty('keywords')
        expect(Array.isArray(item.keywords)).toBe(true)
      })
    })
  })

  describe('getHelpSectionsByCategory', () => {
    it('should return sections for guide category', () => {
      const sections = getHelpSectionsByCategory('guide')
      expect(sections.length).toBeGreaterThan(0)
      sections.forEach(section => {
        expect(section.category).toBe('guide')
      })
    })

    it('should return sections for faq category', () => {
      const sections = getHelpSectionsByCategory('faq')
      expect(sections.length).toBeGreaterThan(0)
      sections.forEach(section => {
        expect(section.category).toBe('faq')
      })
    })

    it('should return sections for all categories', () => {
      HELP_CATEGORIES.forEach(cat => {
        const sections = getHelpSectionsByCategory(cat.id)
        expect(sections.length).toBeGreaterThan(0)
      })
    })
  })

  describe('searchHelp', () => {
    it('should return empty array for empty query', () => {
      expect(searchHelp('')).toEqual([])
      expect(searchHelp('   ')).toEqual([])
    })

    it('should find results for "결측값"', () => {
      const results = searchHelp('결측값')
      expect(results.length).toBeGreaterThan(0)

      // 결측값 관련 항목이 상위에 있어야 함
      const hasRelevantResult = results.some(
        r => r.item.title.includes('결측') || r.item.keywords.includes('결측값')
      )
      expect(hasRelevantResult).toBe(true)
    })

    it('should find results for "CSV"', () => {
      const results = searchHelp('CSV')
      expect(results.length).toBeGreaterThan(0)

      const hasCsvResult = results.some(
        r => r.item.title.includes('CSV') || r.item.keywords.includes('CSV')
      )
      expect(hasCsvResult).toBe(true)
    })

    it('should find results for "단축키"', () => {
      const results = searchHelp('단축키')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should find results for "ANOVA"', () => {
      const results = searchHelp('ANOVA')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should respect limit parameter', () => {
      const results5 = searchHelp('변수', 5)
      const results10 = searchHelp('변수', 10)

      expect(results5.length).toBeLessThanOrEqual(5)
      expect(results10.length).toBeLessThanOrEqual(10)
    })

    it('should return results sorted by score (descending)', () => {
      const results = searchHelp('데이터')

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })

    it('should include matchedIn information', () => {
      const results = searchHelp('결측')

      results.forEach(result => {
        expect(result).toHaveProperty('matchedIn')
        expect(Array.isArray(result.matchedIn)).toBe(true)
        expect(result.matchedIn.length).toBeGreaterThan(0)
      })
    })

    it('should be case insensitive', () => {
      const resultsLower = searchHelp('csv')
      const resultsUpper = searchHelp('CSV')

      expect(resultsLower.length).toBe(resultsUpper.length)
    })
  })

  describe('highlightMatch', () => {
    it('should wrap matched text with mark tag', () => {
      const result = highlightMatch('결측값은 자동으로 인식됩니다', '결측')
      expect(result).toContain('<mark')
      expect(result).toContain('결측')
      expect(result).toContain('</mark>')
    })

    it('should return original text for empty query', () => {
      const text = '테스트 텍스트'
      expect(highlightMatch(text, '')).toBe(text)
      expect(highlightMatch(text, '   ')).toBe(text)
    })

    it('should be case insensitive', () => {
      const result = highlightMatch('CSV 파일을 지원합니다', 'csv')
      expect(result).toContain('<mark')
    })

    it('should handle multiple matches', () => {
      const result = highlightMatch('CSV 파일과 CSV 데이터', 'CSV')
      const markCount = (result.match(/<mark/g) || []).length
      expect(markCount).toBe(2)
    })

    it('should escape regex special characters', () => {
      // 특수문자가 포함된 검색어도 정상 동작해야 함
      const result = highlightMatch('테스트 (괄호) 텍스트', '(괄호)')
      expect(result).toContain('<mark')
    })
  })

  describe('HELP_CATEGORIES', () => {
    it('should have 5 categories', () => {
      expect(HELP_CATEGORIES).toHaveLength(5)
    })

    it('should have required fields', () => {
      HELP_CATEGORIES.forEach(cat => {
        expect(cat).toHaveProperty('id')
        expect(cat).toHaveProperty('label')
        expect(cat).toHaveProperty('icon')
      })
    })
  })

  describe('SUGGESTED_QUERIES', () => {
    it('should have suggested queries', () => {
      expect(SUGGESTED_QUERIES.length).toBeGreaterThan(0)
    })

    it('should all return search results', () => {
      SUGGESTED_QUERIES.forEach(query => {
        const results = searchHelp(query)
        expect(results.length).toBeGreaterThan(0)
      })
    })
  })
})
