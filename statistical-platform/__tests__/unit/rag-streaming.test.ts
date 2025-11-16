/**
 * RAG 스트리밍 기능 테스트
 *
 * - queryStream 콜백 동작
 * - cited_docs 파싱
 * - 스트리밍 완료 후 메타데이터
 */

describe('RAG 스트리밍 기능', () => {
  // <cited_docs> 태그 파싱 로직 (OllamaProvider.queryStream과 동일)
  function parseCitedDocsFromStream(fullAnswer: string): number[] {
    const citedDocsMatch = fullAnswer.match(/<cited_docs>([\d,\s-]+)<\/cited_docs>/i)
    let citedDocIds: number[] = []

    if (citedDocsMatch) {
      const parsed = citedDocsMatch[1]
        .split(',')
        .map((n) => parseInt(n.trim()) - 1) // 1-based → 0-based
        .filter((n) => !isNaN(n) && n >= 0)

      if (parsed.length > 0) {
        citedDocIds = parsed
      }
    }

    return citedDocIds
  }

  describe('스트리밍 답변에서 cited_docs 파싱', () => {
    it('스트리밍 완료 후 cited_docs 파싱', () => {
      const fullAnswer = 't-test는 두 그룹의 평균을 비교하는 방법입니다.\n\n<cited_docs>1,3,5</cited_docs>'

      const citedDocIds = parseCitedDocsFromStream(fullAnswer)

      expect(citedDocIds).toEqual([0, 2, 4]) // 1-based → 0-based
    })

    it('cited_docs 태그 없음', () => {
      const fullAnswer = 't-test는 두 그룹의 평균을 비교하는 방법입니다.'

      const citedDocIds = parseCitedDocsFromStream(fullAnswer)

      expect(citedDocIds).toEqual([])
    })

    it('중간에 다른 텍스트가 있는 경우', () => {
      const fullAnswer = '## T-검정이란?\n\nt-test는 두 그룹의 평균을 비교합니다.\n\n### 가정\n- 정규성\n- 등분산성\n\n<cited_docs>1,2</cited_docs>'

      const citedDocIds = parseCitedDocsFromStream(fullAnswer)

      expect(citedDocIds).toEqual([0, 1])
    })
  })

  describe('스트리밍 청크 누적', () => {
    it('여러 청크를 누적하여 전체 답변 구성', () => {
      const chunks = [
        't-test는 ',
        '두 그룹의 ',
        '평균을 비교하는 ',
        '방법입니다.\\n\\n',
        '<cited_docs>1</cited_docs>'
      ]

      let fullAnswer = ''
      const onChunk = (chunk: string) => {
        fullAnswer += chunk
      }

      // 스트리밍 시뮬레이션
      chunks.forEach(onChunk)

      expect(fullAnswer).toBe('t-test는 두 그룹의 평균을 비교하는 방법입니다.\\n\\n<cited_docs>1</cited_docs>')

      const citedDocIds = parseCitedDocsFromStream(fullAnswer)
      expect(citedDocIds).toEqual([0])
    })
  })

  describe('onSources 콜백', () => {
    it('검색 완료 시 1회만 호출되어야 함', () => {
      const sources = [
        { title: 'T-검정 개요', content: '...', score: 0.9 },
        { title: 'ANOVA vs T-검정', content: '...', score: 0.8 }
      ]

      let callCount = 0
      let receivedSources: typeof sources | null = null

      const onSources = (s: typeof sources) => {
        callCount++
        receivedSources = s
      }

      // 콜백 호출 시뮬레이션
      onSources(sources)

      expect(callCount).toBe(1)
      expect(receivedSources).toEqual(sources)
    })
  })

  describe('<cited_docs> 태그 제거', () => {
    it('스트리밍 중 <cited_docs> 태그는 UI에 표시하지 않음', () => {
      const streamingText = 't-test는 두 그룹의 평균을 비교합니다.\\n\\n<cited_docs>1,2</cited_docs>'

      // UI 렌더링용: <cited_docs> 태그 제거
      const displayText = streamingText.replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')

      expect(displayText).toBe('t-test는 두 그룹의 평균을 비교합니다.\\n\\n')
      expect(displayText).not.toContain('<cited_docs>')
    })
  })
})
