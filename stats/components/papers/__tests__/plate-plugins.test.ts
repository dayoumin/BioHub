/**
 * Papers Plate 플러그인 설정 테스트
 *
 * paperPlugins 배열에 필요한 모든 플러그인이 등록되어 있는지 검증.
 * @platejs/math가 katex CSS를 import하므로 mock 처리.
 */

import { describe, it, expect, vi } from 'vitest'

// @platejs/math/react 가 katex CSS를 import하므로 mock
vi.mock('@platejs/math/react', () => ({
  EquationPlugin: { key: 'equation' },
  InlineEquationPlugin: { key: 'inline_equation' },
}))

// mock 등록 후 import (hoisting에 의해 mock이 먼저 적용됨)
const { paperPlugins } = await import('../plate-plugins')

describe('paperPlugins', () => {
  it('should contain all required plugin keys', () => {
    const keys = paperPlugins.map(p => p.key)

    // 인라인 마크
    expect(keys).toContain('bold')
    expect(keys).toContain('italic')
    expect(keys).toContain('underline')
    expect(keys).toContain('strikethrough')
    expect(keys).toContain('code')

    // 블록 요소
    expect(keys).toContain('heading')
    expect(keys).toContain('blockquote')

    // 리스트
    expect(keys).toContain('indent')
    expect(keys).toContain('list')

    // 표
    expect(keys).toContain('table')

    // 수식
    expect(keys).toContain('equation')
    expect(keys).toContain('inline_equation')

    // 마크다운 직렬화
    expect(keys).toContain('markdown')
  })

  it('should have exactly 13 plugins', () => {
    expect(paperPlugins).toHaveLength(13)
  })

  it('should place MarkdownPlugin last for correct serialization order', () => {
    const last = paperPlugins[paperPlugins.length - 1]
    expect(last.key).toBe('markdown')
  })
})
