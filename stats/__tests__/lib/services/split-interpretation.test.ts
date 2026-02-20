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

// =====================================================
// Tier 2/3 Fallback 시뮬레이션 (### 상세 해석 헤더 없는 경우)
// =====================================================
describe('splitInterpretation — Tier 2: 볼드 소제목 분리', () => {
  it('볼드 소제목(**...**)이 있으면 첫 소제목 기준으로 분리', () => {
    const text = `두 그룹 간에 통계적으로 유의한 차이가 발견되었습니다 (p < 0.001).

**통계량 해석**
t(28) = 3.45, p = 0.002로 유의합니다.

**효과크기**
Cohen's d = 0.82로 큰 효과입니다.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('통계적으로 유의한 차이가 발견')
    expect(detail).toContain('통계량 해석')
    expect(detail).toContain('효과크기')
  })

  it('볼드 소제목이 너무 앞에 있으면 (index <= 10) Tier 3으로 넘어감', () => {
    // index > 10 조건 미충족 → Tier 2 skip
    const text = `짧은요약\n**소제목**\n상세내용이 충분히 길어야 합니다 여기에 더 추가합니다.`

    const { summary, detail } = splitInterpretation(text)

    // Tier 2 skip → Tier 3 또는 전체 summary
    // "짧은요약" (4자) < 10자 → Tier 3도 skip → 전체가 summary
    expect(summary).toContain('짧은요약')
  })

  it('summary가 너무 짧으면 (<=10자) Tier 2 skip', () => {
    // summary.length > 10 조건 미충족
    const text = `요약입니다\n**상세 부분**\n여기에 상세 해석이 충분히 길게 들어갑니다.`

    const { summary } = splitInterpretation(text)

    // "요약입니다" (5자) <= 10 → Tier 2 skip
    // Tier 3: paragraph split → 1 paragraph → 전체가 summary
    expect(summary).toContain('요약입니다')
  })

  it('detail이 너무 짧으면 (<=20자) Tier 2 skip', () => {
    const text = `이 분석의 결과는 통계적으로 유의합니다.\n**짧음**\n짧은 상세.`

    const { summary } = splitInterpretation(text)

    // detail "짧음\n짧은 상세." (약 10자) <= 20 → Tier 2 skip
    expect(summary).toContain('통계적으로 유의')
  })

  it('경계값: summary 11자, detail 21자 → Tier 2 성공', () => {
    // summary > 10 (11자), detail > 20 (21자+)
    const text = `12345678901\n**볼드 소제목 여기입니다**\n123456789012345678901`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('12345678901')
    expect(detail).toContain('볼드 소제목')
  })
})

describe('splitInterpretation — Tier 3: 빈 줄 기반 단락 분리', () => {
  it('2개 이상 단락이면 첫 단락=요약, 나머지=상세', () => {
    const text = `이 분석 결과는 통계적으로 유의한 결과를 보여줍니다.

두 번째 단락에서는 상세한 통계량 해석을 제공합니다. t(28) = 3.45로 유의합니다.

세 번째 단락에서는 효과크기와 실무적 의의를 설명합니다.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('통계적으로 유의한 결과')
    expect(detail).toContain('두 번째 단락')
    expect(detail).toContain('세 번째 단락')
  })

  it('2개 단락이면 분리 (paragraphs.length >= 2)', () => {
    const text = `이 분석에서 두 집단 간 유의한 차이를 발견했습니다.

상세 해석: t값이 2.456이며 자유도 28에서 p값은 0.018입니다.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('유의한 차이를 발견')
    expect(detail).toContain('t값이 2.456')
  })

  it('단일 단락이면 전체가 summary', () => {
    const text = `이 분석 결과는 통계적으로 유의하지 않습니다. p값이 0.5로 높아서 귀무가설을 기각할 수 없습니다.`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('통계적으로 유의하지 않습니다')
    expect(detail).toBe('')
  })

  it('summary가 10자 이하면 Tier 3 skip → 전체 summary', () => {
    const text = `짧은요약\n\n상세 내용이 충분히 길게 여기에 들어가서 threshold를 넘습니다.`

    const { summary, detail } = splitInterpretation(text)

    // "짧은요약" (4자) <= 10 → skip
    expect(detail).toBe('')
    expect(summary).toContain('짧은요약')
  })

  it('detail이 30자 이하면 Tier 3 skip → 전체 summary', () => {
    const text = `이 분석 결과는 통계적으로 유의합니다.\n\n짧은 상세.`

    const { summary, detail } = splitInterpretation(text)

    // detail "짧은 상세." (6자) <= 30 → skip
    expect(detail).toBe('')
    expect(summary).toContain('통계적으로 유의')
  })

  it('경계값: summary 11자, detail 31자 → Tier 3 성공', () => {
    const text = `12345678901\n\n1234567890123456789012345678901`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('12345678901')
    expect(detail).toBe('1234567890123456789012345678901')
  })
})

describe('splitInterpretation — CRLF 호환', () => {
  it('Tier 1: CRLF(\\r\\n) 헤더도 정상 분리', () => {
    const text = '### 한줄 요약\r\n요약 텍스트입니다.\r\n\r\n### 상세 해석\r\n상세 내용입니다.'

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('요약 텍스트입니다.')
    expect(detail).toBe('상세 내용입니다.')
  })

  it('Tier 2: CRLF 볼드 소제목도 분리', () => {
    const text = '이 분석은 통계적으로 유의한 결과입니다.\r\n\r\n**통계량 해석**\r\nt(28) = 3.45, p = 0.002입니다.'

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('통계적으로 유의한 결과')
    expect(detail).toContain('통계량 해석')
  })

  it('Tier 3: CRLF 단락 분리도 동작', () => {
    const text = '이 분석에서 유의한 차이를 발견했습니다.\r\n\r\n상세 해석: t값이 2.456이며 자유도 28에서 p값은 0.018입니다.'

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toContain('유의한 차이를 발견')
    expect(detail).toContain('t값이 2.456')
  })
})

describe('splitInterpretation — Tier 우선순위', () => {
  it('Tier 1이 Tier 2보다 우선', () => {
    // ### 상세 해석 + 볼드 소제목 둘 다 있으면 Tier 1 우선
    const text = `### 한줄 요약
요약 텍스트입니다.

### 상세 해석
**통계량**: t = 2.45
**효과크기**: d = 0.82`

    const { summary, detail } = splitInterpretation(text)

    expect(summary).toBe('요약 텍스트입니다.')
    expect(detail).toContain('통계량')
  })

  it('### 한줄 요약 헤더가 있지만 ### 상세 해석 없으면 → Tier 2/3 시도', () => {
    const text = `### 한줄 요약
이 분석의 결과는 유의한 차이를 보여줍니다.

**통계량 해석**
t(28) = 3.45로 유의합니다.

**효과크기**
Cohen's d = 0.82로 큰 효과입니다.`

    const { summary, detail } = splitInterpretation(text)

    // ### 한줄 요약 헤더 제거 + Tier 2 (볼드 소제목)
    expect(summary).not.toContain('### 한줄 요약')
    expect(summary).toContain('유의한 차이를 보여줍니다')
    expect(detail).toContain('통계량 해석')
  })

  it('LLM이 마크다운 없이 순수 텍스트만 반환한 경우', () => {
    const text = `분석 결과, 두 그룹 간 평균 차이는 통계적으로 유의하지 않습니다 (t(28) = 0.85, p = 0.402). Cohen's d = 0.15로 효과크기가 작습니다. 추가 데이터 수집을 권장합니다.`

    const { summary, detail } = splitInterpretation(text)

    // 단일 단락 → 전체 summary
    expect(summary).toContain('통계적으로 유의하지 않습니다')
    expect(detail).toBe('')
  })
})
