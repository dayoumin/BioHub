/**
 * Unit Tests for splitInterpretation
 *
 * AI 해석 2단 구조 (한줄 요약 / 상세 해석) 분리 로직 검증
 */

import { splitInterpretation } from '@/lib/services/export/export-data-builder'

describe('splitInterpretation', () => {
  it('정상적인 2단 구조를 분리한다', () => {
    const text = `### 한줄 요약
두 그룹 간에 통계적으로 유의한 차이가 있어요 (p < 0.001).
결국 처리군의 평균이 대조군보다 높다는 뜻이에요.

### 상세 해석
**통계량 해석**: t(28) = 3.45, p = 0.002로 유의해요.
**효과크기**: Cohen's d = 0.82로 큰 효과에요.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('두 그룹 간에 통계적으로 유의한 차이')
    expect(summary).not.toContain('### 한줄 요약')
    expect(detail).not.toContain('### 상세 해석')
    expect(detail).toContain('통계량 해석')
    expect(detail).toContain('효과크기')
  })

  it('상세 해석이 없으면 전체를 summary로', () => {
    const text = `### 한줄 요약
p값이 0.05보다 크므로 유의하지 않아요.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('p값이 0.05보다 크므로')
    expect(summary).not.toContain('### 한줄 요약')
    expect(detail).toBe('')
  })

  it('헤더 없는 순수 텍스트도 처리', () => {
    const text = '이것은 단순 텍스트 해석입니다. 유의한 차이가 있습니다.'

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('이것은 단순 텍스트 해석입니다. 유의한 차이가 있습니다.')
    expect(detail).toBe('')
  })

  it('### 상세 해석 헤더의 공백 변형도 매칭', () => {
    const text = `### 한줄 요약
요약 내용

###  상세  해석
상세 내용`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('요약 내용')
    expect(detail).toContain('상세 내용')
  })

  it('빈 문자열 입력', () => {
    const { summary, detail } = splitInterpretation('')

    expect(summary).toBe('')
    expect(detail).toBe('')
  })

  it('스트리밍 중간 상태 (한줄 요약만 부분 도착)', () => {
    const text = `### 한줄 요약
통계적으로 유의한`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('통계적으로 유의한')
    expect(detail).toBe('')
  })

  it('상세 해석에 여러 섹션 포함', () => {
    const text = `### 한줄 요약
요약입니다.

### 상세 해석
**통계량 해석**: 값
**효과크기**: 큼
**주의할 점**: 표본 크기
**추가 분석**: 회귀분석`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('요약입니다.')
    expect(detail).toContain('통계량 해석')
    expect(detail).toContain('효과크기')
    expect(detail).toContain('주의할 점')
    expect(detail).toContain('추가 분석')
  })
})
