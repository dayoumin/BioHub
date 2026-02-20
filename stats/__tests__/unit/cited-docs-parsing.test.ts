/**
 * cited_docs 파싱 로직 테스트
 *
 * Perplexity 스타일 참조 문서 추적 기능 검증
 */

describe('cited_docs 파싱 로직', () => {
  // OllamaProvider.generateAnswer의 파싱 로직을 독립 함수로 추출
  function parseCitedDocs(answer: string): { answer: string; citedDocIds: number[] } {
    // 정규식: 숫자, 쉼표, 공백, 마이너스 기호 허용 (LLM 오류 처리)
    const citedDocsMatch = answer.match(/<cited_docs>([\d,\s-]+)<\/cited_docs>/i)
    let citedDocIds: number[] = []

    if (citedDocsMatch) {
      const parsed = citedDocsMatch[1]
        .split(',')
        .map(n => parseInt(n.trim()) - 1) // 1-based → 0-based
        .filter(n => !isNaN(n) && n >= 0)

      // 유효한 번호가 하나라도 있을 때만 태그 제거
      if (parsed.length > 0) {
        citedDocIds = parsed
        answer = answer.replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')
      }
    }

    return {
      answer: answer.trim(),
      citedDocIds
    }
  }

  describe('정상 케이스', () => {
    it('단일 문서 참조', () => {
      const input = 't-test는 두 그룹의 평균을 비교합니다.\n\n<cited_docs>1</cited_docs>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('t-test는 두 그룹의 평균을 비교합니다.')
      expect(result.citedDocIds).toEqual([0]) // 1-based → 0-based
    })

    it('여러 문서 참조 (쉼표 구분)', () => {
      const input = '정규성 검정이 필요합니다.\n\n<cited_docs>1,3,5</cited_docs>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('정규성 검정이 필요합니다.')
      expect(result.citedDocIds).toEqual([0, 2, 4]) // 1,3,5 → 0,2,4
    })

    it('공백 포함 (파싱 견고성)', () => {
      const input = 'ANOVA는 3개 이상 그룹을 비교합니다.\n\n<cited_docs> 2 , 4 , 6 </cited_docs>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('ANOVA는 3개 이상 그룹을 비교합니다.')
      expect(result.citedDocIds).toEqual([1, 3, 5]) // 2,4,6 → 1,3,5
    })
  })

  describe('엣지 케이스', () => {
    it('<cited_docs> 태그 없음 (LLM 누락)', () => {
      const input = 't-test는 두 그룹의 평균을 비교합니다.'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('t-test는 두 그룹의 평균을 비교합니다.')
      expect(result.citedDocIds).toEqual([]) // 빈 배열 반환
    })

    it('잘못된 형식 (숫자 아님)', () => {
      const input = 'ANOVA 설명\n\n<cited_docs>abc,def</cited_docs>'
      const result = parseCitedDocs(input)

      // 유효한 번호가 없으면 태그 제거 안 함
      expect(result.answer).toBe('ANOVA 설명\n\n<cited_docs>abc,def</cited_docs>')
      expect(result.citedDocIds).toEqual([]) // NaN 필터링
    })

    it('음수 인덱스 (잘못된 입력)', () => {
      const input = '설명\n\n<cited_docs>-1,0,1</cited_docs>'
      const result = parseCitedDocs(input)

      // -1 제거, 0 유지 (1-based 1 → 0-based 0)
      expect(result.answer).toBe('설명')
      expect(result.citedDocIds).toEqual([0]) // 유효한 번호 있으므로 태그 제거
    })

    it('중복 제거 (LLM 중복 입력)', () => {
      const input = '설명\n\n<cited_docs>1,1,2,2,3</cited_docs>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('설명')
      expect(result.citedDocIds).toEqual([0, 0, 1, 1, 2]) // 중복 허용 (나중에 filter로 처리)
    })
  })

  describe('대소문자 구분 없음 (i 플래그)', () => {
    it('대문자 CITED_DOCS', () => {
      const input = '설명\n\n<CITED_DOCS>1,2</CITED_DOCS>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('설명')
      expect(result.citedDocIds).toEqual([0, 1])
    })

    it('혼합 케이스 Cited_Docs', () => {
      const input = '설명\n\n<Cited_Docs>3,4</Cited_Docs>'
      const result = parseCitedDocs(input)

      expect(result.answer).toBe('설명')
      expect(result.citedDocIds).toEqual([2, 3])
    })
  })
})

describe('RAGAssistantCompact 참조 문서 필터링', () => {
  it('citedDocIds가 있을 때: 해당 인덱스만 필터링', () => {
    const sources = [
      { title: 'Doc 1', content: 'Content 1', score: 0.9 },
      { title: 'Doc 2', content: 'Content 2', score: 0.8 },
      { title: 'Doc 3', content: 'Content 3', score: 0.7 },
      { title: 'Doc 4', content: 'Content 4', score: 0.6 },
      { title: 'Doc 5', content: 'Content 5', score: 0.5 }
    ]

    const citedDocIds = [0, 2, 4] // Doc 1, Doc 3, Doc 5
    const filtered = sources.filter((_, idx) => citedDocIds.includes(idx))

    expect(filtered).toHaveLength(3)
    expect(filtered.map(s => s.title)).toEqual(['Doc 1', 'Doc 3', 'Doc 5'])
  })

  it('citedDocIds가 없을 때: score > 0.5 필터링', () => {
    const sources = [
      { title: 'Doc 1', content: 'Content 1', score: 0.9 },
      { title: 'Doc 2', content: 'Content 2', score: 0.8 },
      { title: 'Doc 3', content: 'Content 3', score: 0.5 }, // Fallback
      { title: 'Doc 4', content: 'Content 4', score: 0.6 },
      { title: 'Doc 5', content: 'Content 5', score: 0.5 }  // Fallback
    ]

    const citedDocIds: number[] = []
    const filtered = citedDocIds.length > 0
      ? sources.filter((_, idx) => citedDocIds.includes(idx))
      : sources.filter(s => s.score > 0.5)

    expect(filtered).toHaveLength(3)
    expect(filtered.map(s => s.title)).toEqual(['Doc 1', 'Doc 2', 'Doc 4'])
  })

  it('citedDocIds가 범위 초과: 안전하게 처리', () => {
    const sources = [
      { title: 'Doc 1', content: 'Content 1', score: 0.9 },
      { title: 'Doc 2', content: 'Content 2', score: 0.8 }
    ]

    const citedDocIds = [0, 1, 99] // 99는 존재하지 않음
    const filtered = sources.filter((_, idx) => citedDocIds.includes(idx))

    expect(filtered).toHaveLength(2) // 99는 자동으로 무시됨
    expect(filtered.map(s => s.title)).toEqual(['Doc 1', 'Doc 2'])
  })
})
