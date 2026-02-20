/**
 * 수식 렌더링 테스트
 *
 * ReactMarkdown + remark-math + rehype-katex가
 * LaTeX 수식을 올바르게 렌더링하는지 검증
 */

import React from 'react'
import { render } from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

describe('Math Formula Rendering', () => {
  describe('인라인 수식 ($...$)', () => {
    it('간단한 인라인 수식을 렌더링해야 함', () => {
      const markdown = 't-test 통계량은 $t = \\frac{\\bar{x} - \\mu}{s/\\sqrt{n}}$입니다.'

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      // KaTeX가 생성하는 .katex 클래스 확인
      const mathElements = container.querySelectorAll('.katex')
      expect(mathElements.length).toBeGreaterThan(0)
    })

    it('여러 개의 인라인 수식을 렌더링해야 함', () => {
      const markdown = '평균은 $\\bar{x}$이고, 표준편차는 $s$입니다.'

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      const mathElements = container.querySelectorAll('.katex')
      expect(mathElements.length).toBeGreaterThanOrEqual(2) // $\bar{x}$ + $s$
    })
  })

  describe('블록 수식 ($$...$$)', () => {
    it('블록 수식을 렌더링해야 함', () => {
      const markdown = `
## t-검정 공식

$$
t = \\frac{\\bar{x}_1 - \\bar{x}_2}{s_p\\sqrt{\\frac{1}{n_1} + \\frac{1}{n_2}}}
$$

여기서 $s_p$는 합동표준편차입니다.
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      // 블록 수식 (.katex-display)과 인라인 수식 (.katex) 모두 확인
      const displayMath = container.querySelectorAll('.katex-display')
      const inlineMath = container.querySelectorAll('.katex')

      expect(displayMath.length).toBeGreaterThan(0) // 블록 수식
      expect(inlineMath.length).toBeGreaterThan(0) // 인라인 수식 ($s_p$)
    })

    it('ANOVA F-통계량 공식을 렌더링해야 함', () => {
      const markdown = `
$$
F = \\frac{MS_{between}}{MS_{within}} = \\frac{\\frac{SS_{between}}{df_{between}}}{\\frac{SS_{within}}{df_{within}}}
$$
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      const displayMath = container.querySelectorAll('.katex-display')
      expect(displayMath.length).toBeGreaterThan(0)
    })
  })

  describe('복잡한 수식', () => {
    it('그리스 문자와 첨자를 렌더링해야 함', () => {
      const markdown = `
상관계수 공식:

$$
r = \\frac{\\sum{(x_i - \\bar{x})(y_i - \\bar{y})}}{\\sqrt{\\sum{(x_i - \\bar{x})^2}\\sum{(y_i - \\bar{y})^2}}}
$$
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      const displayMath = container.querySelectorAll('.katex-display')
      expect(displayMath.length).toBeGreaterThan(0)

      // HTML에 렌더링된 수식 확인 (KaTeX는 <span> 태그로 변환)
      expect(container.innerHTML).toContain('katex')
    })

    it('행렬 수식을 렌더링해야 함', () => {
      const markdown = `
$$
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
$$
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      const displayMath = container.querySelectorAll('.katex-display')
      expect(displayMath.length).toBeGreaterThan(0)
    })
  })

  describe('수식과 텍스트 혼합', () => {
    it('마크다운 텍스트와 수식을 함께 렌더링해야 함', () => {
      const markdown = `
## t-검정

**t-검정**은 두 그룹의 평균을 비교하는 통계 검정입니다.

### 공식

독립표본 t-검정의 통계량은 다음과 같습니다:

$$
t = \\frac{\\bar{x}_1 - \\bar{x}_2}{s_p\\sqrt{\\frac{1}{n_1} + \\frac{1}{n_2}}}
$$

여기서:
- $\\bar{x}_1$, $\\bar{x}_2$: 각 그룹의 평균
- $s_p$: 합동표준편차
- $n_1$, $n_2$: 각 그룹의 샘플 크기

### 가정사항

1. **정규성**: 각 그룹의 데이터는 정규분포를 따라야 함
2. **등분산성**: 두 그룹의 분산이 같아야 함 ($\\sigma_1^2 = \\sigma_2^2$)
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      // 제목, 굵은 텍스트, 리스트 확인
      expect(container.querySelector('h2')).toBeTruthy()
      expect(container.querySelector('h3')).toBeTruthy()
      expect(container.querySelector('strong')).toBeTruthy()
      expect(container.querySelector('ul')).toBeTruthy()
      expect(container.querySelector('ol')).toBeTruthy()

      // 수식 확인
      const displayMath = container.querySelectorAll('.katex-display')
      const inlineMath = container.querySelectorAll('.katex')

      expect(displayMath.length).toBeGreaterThan(0) // 블록 수식
      expect(inlineMath.length).toBeGreaterThan(5) // 여러 인라인 수식
    })
  })

  describe('엣지 케이스', () => {
    it('수식이 없는 일반 마크다운도 렌더링해야 함', () => {
      const markdown = `
## 기술통계

- 평균
- 중앙값
- 표준편차
`

      const { container } = render(
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {markdown}
        </ReactMarkdown>
      )

      // 수식이 없어도 정상 렌더링
      expect(container.querySelector('h2')).toBeTruthy()
      expect(container.querySelector('ul')).toBeTruthy()

      // KaTeX 요소는 없어야 함
      const mathElements = container.querySelectorAll('.katex')
      expect(mathElements.length).toBe(0)
    })

    it('잘못된 LaTeX 문법도 에러 없이 처리해야 함', () => {
      const markdown = `
잘못된 수식: $\\frac{a{b}$ (닫는 괄호 누락)
`

      // 에러 없이 렌더링되어야 함
      expect(() => {
        render(
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {markdown}
          </ReactMarkdown>
        )
      }).not.toThrow()
    })
  })
})
