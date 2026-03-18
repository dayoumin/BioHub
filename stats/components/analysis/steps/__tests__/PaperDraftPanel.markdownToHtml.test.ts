/**
 * PaperDraftPanel — markdownToHtml XSS 방어 및 마크다운 변환 시뮬레이션
 *
 * 검증 범위:
 * 1. XSS: <script>, 이벤트 핸들러, 중첩 태그
 * 2. HTML 특수문자 이스케이프 (&, <, >, ")
 * 3. 마크다운 변환이 이스케이프 후에도 정상 동작
 * 4. 클립보드 복사 텍스트에 &amp; 등 이스케이프 엔티티 확인
 */

import { describe, it, expect } from 'vitest'
import { markdownToHtml } from '../PaperDraftPanel'

describe('markdownToHtml — XSS 방어', () => {
  it('<script> 태그가 이스케이프된다', () => {
    const result = markdownToHtml('<script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('**bold** 안에 <script>가 있어도 실행되지 않는다', () => {
    const result = markdownToHtml('**<script>alert(1)</script>**')
    expect(result).not.toContain('<script>')
    expect(result).toContain('<strong>')
    expect(result).toContain('&lt;script&gt;')
  })

  it('인라인 이벤트 핸들러가 이스케이프된다', () => {
    const result = markdownToHtml('<img src=x onerror=alert(1)>')
    expect(result).not.toContain('<img')
    expect(result).toContain('&lt;img')
  })

  it('href javascript: 가 이스케이프된다', () => {
    const result = markdownToHtml('<a href="javascript:alert(1)">클릭</a>')
    expect(result).not.toContain('<a ')
    expect(result).toContain('&lt;a ')
    expect(result).toContain('&quot;')
  })

  it('사용자 입력 변수명에 < > & 포함 시 안전하다', () => {
    // 예: variableLabel = 'age > 10 & sex' 처럼 설정한 경우
    const result = markdownToHtml('변수 age > 10 & sex는 p < .05이었다.')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&lt;')
    expect(result).not.toContain('</')
  })

  it('연구 맥락에 HTML 주입 시도 시 이스케이프된다', () => {
    const result = markdownToHtml('<div onmouseover="alert()">연구 맥락</div>')
    expect(result).not.toContain('<div')
    expect(result).toContain('&lt;div')
  })
})

describe('markdownToHtml — 마크다운 변환', () => {
  it('**text** → <strong>text</strong>', () => {
    expect(markdownToHtml('**볼드**')).toBe('<strong>볼드</strong>')
  })

  it('*text* → <em>text</em>', () => {
    expect(markdownToHtml('*이탤릭*')).toBe('<em>이탤릭</em>')
  })

  it('**bold** 와 일반 텍스트 혼합', () => {
    const result = markdownToHtml('평균은 **13.1 cm**이었다.')
    expect(result).toBe('평균은 <strong>13.1 cm</strong>이었다.')
  })

  it('볼드 안의 특수문자도 이스케이프된다', () => {
    const result = markdownToHtml('**p < .05**')
    // < 이스케이프 후 bold 처리 → <strong>p &lt; .05</strong>
    expect(result).toBe('<strong>p &lt; .05</strong>')
    expect(result).not.toContain('<.05')  // < 가 태그로 해석되지 않음
  })

  it('마크다운 없는 순수 텍스트는 그대로 반환된다', () => {
    expect(markdownToHtml('일반 텍스트')).toBe('일반 텍스트')
  })

  it('& 기호는 이스케이프된다', () => {
    expect(markdownToHtml('A & B')).toBe('A &amp; B')
  })

  it('" 기호는 이스케이프된다', () => {
    const result = markdownToHtml('결과는 "유의"하였다.')
    expect(result).toBe('결과는 &quot;유의&quot;하였다.')
  })

  it('빈 문자열 입력 시 빈 문자열 반환', () => {
    expect(markdownToHtml('')).toBe('')
  })
})

describe('markdownToHtml — 학술 논문 실제 패턴', () => {
  it('APA p값 표기: p < .05 이스케이프 후 렌더링 가능', () => {
    const result = markdownToHtml('통계적으로 유의하였다(*p* < .05).')
    expect(result).toContain('<em>p</em>')
    expect(result).toContain('&lt; .05')
  })

  it('효과크기 표기: d = **0.89**', () => {
    const result = markdownToHtml("Cohen's d = **0.89**로 큰 효과크기였다.")
    expect(result).toContain('<strong>0.89</strong>')
  })

  it('사후검정 결과: M(수컷) > F(암컷)', () => {
    const result = markdownToHtml('수컷(M = 13.1 cm) > 암컷(M = 15.3 cm)')
    expect(result).toContain('&gt;')
    expect(result).not.toContain('<암컷')  // > 가 HTML 태그 시작으로 오인되지 않음
  })

  it('실제 Methods 텍스트 (볼드 + 특수문자 혼합)', () => {
    const methods = '**독립표본 t-검정**(Independent Samples t-test)을 실시하였으며, 유의수준 α = .05로 설정하였다.'
    const result = markdownToHtml(methods)
    expect(result).toContain('<strong>독립표본 t-검정</strong>')
    expect(result).toContain('α = .05')
    // α는 HTML 특수문자가 아니므로 그대로 유지
  })
})

describe('markdownToHtml — 클립보드 복사 시 HTML 엔티티 검증', () => {
  it('복사 HTML에서 &amp; 엔티티는 붙여넣기 시 & 로 표시된다 (HTML 표준)', () => {
    // Word/Google Docs에서 &amp; → & 로 렌더링됨
    const html = markdownToHtml('A & B')
    expect(html).toBe('A &amp; B')
    // 이 HTML을 clipboard에 쓰면: 붙여넣기 결과 = "A & B" (정상)
  })

  it('복사 HTML에서 &quot; 엔티티는 붙여넣기 시 " 로 표시된다', () => {
    const html = markdownToHtml('"결과"')
    expect(html).toBe('&quot;결과&quot;')
    // Word에서 붙여넣기 결과 = '"결과"' (정상)
  })
})
