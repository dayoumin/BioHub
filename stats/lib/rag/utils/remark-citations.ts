/**
 * remark-citations: Markdown에서 [1], [2] 형태를 인라인 인용으로 변환
 *
 * Perplexity 스타일 구현:
 * - [1] → <sup><a href="#source-1">1</a></sup>
 * - 클릭 시 참조 문서로 자동 스크롤
 *
 * NOTE: RAG/Ollama 의존 - 배포 시 비활성화 예정
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnistNode = { type: string; value?: string; children?: UnistNode[]; [key: string]: any }

function visit(tree: UnistNode, type: string, visitor: (node: UnistNode, index: number | undefined, parent: UnistNode | undefined) => void) {
  function walk(node: UnistNode, parent?: UnistNode, index?: number) {
    if (node.type === type) visitor(node, index, parent)
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], node, i)
      }
    }
  }
  walk(tree)
}

/**
 * remark plugin: [1], [2] 형태의 인용 번호를 클릭 가능한 링크로 변환
 */
export function remarkCitations() {
  return (tree: UnistNode) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return

      const text = node.value ?? ''
      const citationRegex = /\[(\d+)\]/g
      const matches = Array.from(text.matchAll(citationRegex))

      if (matches.length === 0) return

      const newNodes: UnistNode[] = []
      let lastIndex = 0

      for (const match of matches) {
        const fullMatch = match[0]
        const citationNumber = match[1]
        const matchIndex = match.index!

        if (matchIndex > lastIndex) {
          newNodes.push({ type: 'text', value: text.slice(lastIndex, matchIndex) })
        }

        const sourceId = parseInt(citationNumber) - 1
        newNodes.push({
          type: 'link',
          url: `#source-${sourceId}`,
          title: `참조 문서 ${citationNumber}로 이동`,
          children: [{ type: 'text', value: citationNumber }],
          data: { hProperties: { className: ['citation-link'] } }
        })

        lastIndex = matchIndex + fullMatch.length
      }

      if (lastIndex < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastIndex) })
      }

      parent.children!.splice(index, 1, ...newNodes)
    })
  }
}
