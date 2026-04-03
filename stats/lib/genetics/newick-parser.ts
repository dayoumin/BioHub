/**
 * Newick ↔ ECharts tree 데이터 변환
 *
 * Newick 문자열을 ECharts tree series가 소비하는 트리 구조로 파싱.
 */

export interface TreeNode {
  name: string
  value?: number
  children?: TreeNode[]
}

/** Newick 문자열 → ECharts TreeNode */
export function parseNewick(newick: string): TreeNode {
  const s = newick.replace(/;\s*$/, '').trim()
  let pos = 0

  function parseNode(): TreeNode {
    if (s[pos] === '(') {
      pos++ // skip '('
      const children: TreeNode[] = []
      children.push(parseNode())
      while (s[pos] === ',') {
        pos++ // skip ','
        children.push(parseNode())
      }
      if (s[pos] === ')') pos++ // skip ')'

      // optional label:distance after ')'
      const { name, distance } = parseLabelDistance()
      return { name, value: distance, children }
    }

    // leaf node
    const { name, distance } = parseLabelDistance()
    return { name, value: distance }
  }

  function parseLabelDistance(): { name: string; distance?: number } {
    let name = ''
    // Single-quoted labels (Newick standard for metacharacter escaping)
    if (pos < s.length && s[pos] === "'") {
      pos++ // skip opening quote
      while (pos < s.length) {
        if (s[pos] === "'" && s[pos + 1] === "'") {
          name += "'"
          pos += 2 // escaped quote
        } else if (s[pos] === "'") {
          pos++ // skip closing quote
          break
        } else {
          name += s[pos]
          pos++
        }
      }
    } else {
      while (pos < s.length && s[pos] !== ':' && s[pos] !== ',' && s[pos] !== ')' && s[pos] !== '(') {
        name += s[pos]
        pos++
      }
    }

    let distance: number | undefined
    if (pos < s.length && s[pos] === ':') {
      pos++ // skip ':'
      let numStr = ''
      while (pos < s.length && s[pos] !== ',' && s[pos] !== ')' && s[pos] !== '(') {
        numStr += s[pos]
        pos++
      }
      const parsed = parseFloat(numStr)
      if (!isNaN(parsed)) distance = parsed
    }

    return { name: name.trim(), distance }
  }

  return parseNode()
}
