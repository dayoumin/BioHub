/**
 * HTML Escape Utility 테스트
 *
 * XSS 방어 기능 검증
 */

import { escapeHtml, escapeHtmlArray, escapeHtmlObject } from '@/lib/utils/html-escape'

describe('escapeHtml', () => {
  /**
   * 테스트 1: 기본 XSS 패턴 방어
   */
  it('XSS 공격 패턴을 이스케이프한다', () => {
    expect(escapeHtml('<script>alert("XSS")</script>'))
      .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')

    expect(escapeHtml('<img src=x onerror=alert(1)>'))
      .toBe('&lt;img src=x onerror=alert(1)&gt;')

    expect(escapeHtml('javascript:alert("XSS")'))
      .toBe('javascript:alert(&quot;XSS&quot;)')
  })

  /**
   * 테스트 2: HTML 특수 문자 이스케이프
   */
  it('HTML 특수 문자를 이스케이프한다', () => {
    expect(escapeHtml('&')).toBe('&amp;')
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('>')).toBe('&gt;')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#039;')
  })

  /**
   * 테스트 3: 복합 특수 문자
   */
  it('복합 특수 문자를 이스케이프한다', () => {
    expect(escapeHtml('student_name & score'))
      .toBe('student_name &amp; score')

    expect(escapeHtml('A<B>C"D\'E&F'))
      .toBe('A&lt;B&gt;C&quot;D&#039;E&amp;F')
  })

  /**
   * 테스트 4: 일반 텍스트 변경 없음
   */
  it('일반 텍스트는 변경하지 않는다', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
    expect(escapeHtml('student_name')).toBe('student_name')
    expect(escapeHtml('123.456')).toBe('123.456')
  })

  /**
   * 테스트 5: null/undefined 처리
   */
  it('null과 undefined를 문자열로 변환한다', () => {
    expect(escapeHtml(null)).toBe('null')
    expect(escapeHtml(undefined)).toBe('undefined')
  })

  /**
   * 테스트 6: 숫자/불린 처리
   */
  it('숫자와 불린을 문자열로 변환한다', () => {
    expect(escapeHtml(123)).toBe('123')
    expect(escapeHtml(true)).toBe('true')
    expect(escapeHtml(false)).toBe('false')
  })

  /**
   * 테스트 7: 빈 문자열
   */
  it('빈 문자열을 처리한다', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('escapeHtmlArray', () => {
  it('배열의 모든 요소를 이스케이프한다', () => {
    const input = ['<script>', 'normal text', 'a & b', 123, null]
    const expected = ['&lt;script&gt;', 'normal text', 'a &amp; b', '123', 'null']

    expect(escapeHtmlArray(input)).toEqual(expected)
  })

  it('빈 배열을 처리한다', () => {
    expect(escapeHtmlArray([])).toEqual([])
  })
})

describe('escapeHtmlObject', () => {
  it('객체의 모든 값을 이스케이프한다', () => {
    const input = {
      name: '<script>',
      description: 'normal text',
      score: 'a & b',
      age: 25,
      active: true
    }

    const expected = {
      name: '&lt;script&gt;',
      description: 'normal text',
      score: 'a &amp; b',
      age: '25',
      active: 'true'
    }

    expect(escapeHtmlObject(input)).toEqual(expected)
  })

  it('빈 객체를 처리한다', () => {
    expect(escapeHtmlObject({})).toEqual({})
  })

  it('중첩 객체는 이스케이프하지 않는다', () => {
    const input = {
      name: '<script>',
      nested: { value: '<script>' }
    }

    // nested는 [object Object]로 변환됨
    expect(escapeHtmlObject(input).name).toBe('&lt;script&gt;')
    expect(escapeHtmlObject(input).nested).toBe('[object Object]')
  })
})

/**
 * 실제 사용 시나리오 테스트
 */
describe('실제 사용 시나리오', () => {
  it('CSV 데이터를 안전하게 HTML 테이블로 변환한다', () => {
    type CsvRow = {
      [key: string]: string
    }

    const csvData: CsvRow[] = [
      { name: '<script>alert(1)</script>', age: '25', score: '85 & 90' },
      { name: 'Alice', age: '30', score: '95' }
    ]

    const columns = Object.keys(csvData[0])

    // 테이블 헤더 생성
    const tableHeader = columns.map(col => `<th>${escapeHtml(col)}</th>`).join('')
    expect(tableHeader).toBe('<th>name</th><th>age</th><th>score</th>')

    // 테이블 행 생성 (첫 번째 행 - XSS 포함)
    const firstRow = columns.map(col => `<td>${escapeHtml(csvData[0][col])}</td>`).join('')
    expect(firstRow).toBe(
      '<td>&lt;script&gt;alert(1)&lt;/script&gt;</td><td>25</td><td>85 &amp; 90</td>'
    )

    // 테이블 행 생성 (두 번째 행 - 일반 데이터)
    const secondRow = columns.map(col => `<td>${escapeHtml(csvData[1][col])}</td>`).join('')
    expect(secondRow).toBe('<td>Alice</td><td>30</td><td>95</td>')
  })

  it('파일명을 안전하게 HTML 제목으로 사용한다', () => {
    const maliciousFileName = 'data<script>alert(1)</script>.csv'
    const safeTitle = `<title>데이터 미리보기 - ${escapeHtml(maliciousFileName)}</title>`

    expect(safeTitle).toBe(
      '<title>데이터 미리보기 - data&lt;script&gt;alert(1)&lt;/script&gt;.csv</title>'
    )
  })

  it('변수명을 안전하게 HTML Badge로 렌더링한다', () => {
    const maliciousVariableName = 'var<img src=x onerror=alert(1)>'
    const safeBadge = `<span>${escapeHtml(maliciousVariableName)}</span>`

    expect(safeBadge).toBe(
      '<span>var&lt;img src=x onerror=alert(1)&gt;</span>'
    )
  })
})
