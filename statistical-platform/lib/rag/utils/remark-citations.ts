/**
 * remark-citations: Markdown에서 [1], [2] 형태를 인라인 인용으로 변환
 *
 * Perplexity 스타일 구현:
 * - [1] → <sup><a href="#source-1">1</a></sup>
 * - 클릭 시 참조 문서로 자동 스크롤
 */

import { visit } from 'unist-util-visit'
import type { Root, Text, Link } from 'mdast'

/**
 * remark plugin: [1], [2] 형태의 인용 번호를 클릭 가능한 링크로 변환
 *
 * @example
 * Input:  "t-test의 가정은 정규성입니다[1]."
 * Output: "t-test의 가정은 정규성입니다<sup><a href="#source-0">1</a></sup>."
 */
export function remarkCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return

      const text = node.value
      // 정규식: [숫자] 형태 매칭 (예: [1], [2], [10])
      const citationRegex = /\[(\d+)\]/g
      const matches = Array.from(text.matchAll(citationRegex))

      if (matches.length === 0) return

      // 텍스트를 분할하여 인용 번호를 링크로 변환
      const newNodes: Array<Text | Link> = []
      let lastIndex = 0

      for (const match of matches) {
        const fullMatch = match[0] // "[1]"
        const citationNumber = match[1] // "1"
        const matchIndex = match.index!

        // 인용 번호 앞의 텍스트 추가
        if (matchIndex > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, matchIndex)
          })
        }

        // 인용 번호를 링크로 변환 (1-based → 0-based: [1] → #source-0)
        const sourceId = parseInt(citationNumber) - 1
        newNodes.push({
          type: 'link',
          url: `#source-${sourceId}`,
          title: `참조 문서 ${citationNumber}로 이동`,
          children: [
            {
              type: 'text',
              value: citationNumber
            }
          ],
          data: {
            hProperties: {
              className: ['citation-link'] // CSS 스타일링용 클래스
            }
          }
        } as Link)

        lastIndex = matchIndex + fullMatch.length
      }

      // 마지막 인용 번호 뒤의 텍스트 추가
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex)
        })
      }

      // 부모 노드의 children 배열에서 현재 노드를 새 노드들로 교체
      parent.children.splice(index, 1, ...newNodes)
    })
  }
}
