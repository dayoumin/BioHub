/**
 * remark-citations 플러그인 로직 테스트
 *
 * Perplexity 스타일 인라인 인용 기능 검증
 * (ESM 모듈 이슈로 정규식 로직만 테스트)
 */

describe('remarkCitations logic', () => {
  // 정규식 추출 (remark-citations.ts와 동일)
  function extractCitations(text: string): Array<{ number: string; sourceId: number }> {
    const citationRegex = /\[(\d+)\]/g
    const matches = Array.from(text.matchAll(citationRegex))

    return matches.map(match => ({
      number: match[1],
      sourceId: parseInt(match[1]) - 1 // 1-based → 0-based
    }))
  }

  describe('정상 케이스', () => {
    it('단일 인용 [1]', () => {
      const input = 't-test의 가정은 정규성입니다[1].'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(1)
      expect(citations[0]).toEqual({ number: '1', sourceId: 0 }) // 1-based → 0-based
    })

    it('여러 인용 [1][2][3]', () => {
      const input = '정규성[1], 등분산성[2], 독립성[3]'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(3)
      expect(citations[0].sourceId).toBe(0) // [1] → 0
      expect(citations[1].sourceId).toBe(1) // [2] → 1
      expect(citations[2].sourceId).toBe(2) // [3] → 2
    })

    it('띄어쓰기 포함 [1] [2]', () => {
      const input = 'ANOVA는 3개 이상 그룹을 비교합니다 [1] [2].'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(2)
      expect(citations.map(c => c.sourceId)).toEqual([0, 1])
    })

    it('두 자리 숫자 [10]', () => {
      const input = '참고문헌 [10]'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(1)
      expect(citations[0]).toEqual({ number: '10', sourceId: 9 }) // 10 - 1 = 9
    })
  })

  describe('엣지 케이스', () => {
    it('인용 없음 (일반 텍스트)', () => {
      const input = 't-test는 두 그룹의 평균을 비교합니다.'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(0)
    })

    it('일반 대괄호 [문자]', () => {
      const input = '배열 [a, b, c]은 변환되지 않습니다.'
      const citations = extractCitations(input)

      // 숫자가 아니므로 매칭 안 됨
      expect(citations).toHaveLength(0)
    })

    it('문장 시작 [1]', () => {
      const input = '[1]번 문서에 따르면...'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(1)
      expect(citations[0].sourceId).toBe(0)
    })

    it('문장 끝 [1].', () => {
      const input = '정규성 검정이 필요합니다[1].'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(1)
      expect(citations[0].sourceId).toBe(0)
    })
  })

  describe('복합 케이스', () => {
    it('같은 번호 여러 번 [1][1][2]', () => {
      const input = '정규성[1]은 필수[1]이며, 등분산성[2]도 확인해야 합니다.'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(3)
      expect(citations.map(c => c.sourceId)).toEqual([0, 0, 1]) // [1], [1], [2]
    })

    it('순서 뒤바뀜 [3][1][2]', () => {
      const input = '참고문헌 [3][1][2]'
      const citations = extractCitations(input)

      expect(citations).toHaveLength(3)
      expect(citations.map(c => c.sourceId)).toEqual([2, 0, 1])
    })
  })
})
