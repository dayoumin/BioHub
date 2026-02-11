/**
 * 클립보드 HTML 복사 로직 시뮬레이션 테스트
 *
 * handleCopyResults의 HTML 생성 로직을 순수 함수로 추출하여 검증
 * - 기본 통계 테이블 HTML 구조
 * - AI 해석 포함/미포함 분기
 * - splitInterpretation 연동
 * - pre 태그 wrap (마크다운 raw 방지)
 */

import { describe, it, expect } from 'vitest'

import { splitInterpretation } from '@/lib/services/export/export-data-builder'

// =====================================================
// HTML 생성 로직 추출 (handleCopyResults 내부 로직)
// =====================================================
interface CopyContext {
  testName: string
  statisticName: string
  statistic: number
  df?: number | number[]
  pValue: number
  effectSize?: number | { value: number }
  confidence?: { lower: number; upper: number }
  interpretation?: string
  apaFormat?: string | null
  aiInterpretation?: string | null
}

function buildCopyHtml(ctx: CopyContext): string {
  const pVal = ctx.pValue < 0.001 ? '< .001' : ctx.pValue.toFixed(4)
  const esValue = ctx.effectSize !== undefined
    ? (typeof ctx.effectSize === 'number'
      ? ctx.effectSize.toFixed(4)
      : ctx.effectSize.value.toFixed(4))
    : '-'

  let html = `<h3>${ctx.testName}</h3>`
  html += `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">`
  html += `<thead><tr style="background:#f3f4f6"><th>항목</th><th>값</th></tr></thead><tbody>`
  html += `<tr><td>통계량 (${ctx.statisticName || 't'})</td><td><b>${(ctx.statistic ?? 0).toFixed(4)}</b></td></tr>`
  if (ctx.df !== undefined) {
    const dfStr = Array.isArray(ctx.df) ? ctx.df.join(', ') : String(ctx.df)
    html += `<tr><td>자유도 (df)</td><td>${dfStr}</td></tr>`
  }
  html += `<tr><td>p-value</td><td><b>${pVal}</b></td></tr>`
  html += `<tr><td>효과크기</td><td>${esValue}</td></tr>`
  if (ctx.confidence) {
    html += `<tr><td>95% 신뢰구간</td><td>[${ctx.confidence.lower.toFixed(4)}, ${ctx.confidence.upper.toFixed(4)}]</td></tr>`
  }
  html += `</tbody></table>`

  if (ctx.interpretation) {
    html += `<p><b>해석:</b> ${ctx.interpretation}</p>`
  }
  if (ctx.apaFormat) {
    html += `<p><b>APA:</b> <i>${ctx.apaFormat}</i></p>`
  }

  if (ctx.aiInterpretation) {
    const { summary, detail } = splitInterpretation(ctx.aiInterpretation)
    html += `<hr/><h4>AI 해석</h4>`
    html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${summary}</pre>`
    if (detail) {
      html += `<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0">${detail}</pre>`
    }
  }

  return html
}

// =====================================================
// Tests
// =====================================================
describe('클립보드 HTML 복사 로직 시뮬레이션', () => {

  describe('splitInterpretation', () => {
    it('한줄 요약 + 상세 해석 분리', () => {
      const text = '### 한줄 요약\n요약 내용\n\n### 상세 해석\n상세 내용'
      const { summary, detail } = splitInterpretation(text)
      expect(summary).toBe('요약 내용')
      expect(detail).toContain('### 상세 해석')
      expect(detail).toContain('상세 내용')
    })

    it('상세 해석 없으면 전체가 summary', () => {
      const text = '### 한줄 요약\n요약만 있음'
      const { summary, detail } = splitInterpretation(text)
      expect(summary).toBe('요약만 있음')
      expect(detail).toBe('')
    })

    it('마크다운 헤더 없는 평문', () => {
      const text = '그냥 평범한 해석 텍스트입니다.'
      const { summary, detail } = splitInterpretation(text)
      expect(summary).toBe('그냥 평범한 해석 텍스트입니다.')
      expect(detail).toBe('')
    })
  })

  describe('buildCopyHtml — 기본 통계', () => {
    const base: CopyContext = {
      testName: '독립표본 t-검정',
      statisticName: 't',
      statistic: 2.456,
      df: 28,
      pValue: 0.018,
      effectSize: { value: 0.72 },
      confidence: { lower: 0.35, upper: 2.18 },
      interpretation: '두 그룹 간 유의한 차이가 있습니다.',
      apaFormat: 't(28) = 2.46, p = .018',
    }

    it('테이블 구조 포함', () => {
      const html = buildCopyHtml(base)
      expect(html).toContain('<h3>독립표본 t-검정</h3>')
      expect(html).toContain('<table')
      expect(html).toContain('통계량 (t)')
      expect(html).toContain('2.4560')
      expect(html).toContain('p-value')
      expect(html).toContain('0.0180')
      expect(html).toContain('효과크기')
      expect(html).toContain('0.7200')
    })

    it('df 표시', () => {
      const html = buildCopyHtml(base)
      expect(html).toContain('자유도 (df)')
      expect(html).toContain('28')
    })

    it('df가 배열이면 쉼표 구분', () => {
      const html = buildCopyHtml({ ...base, df: [2, 27] })
      expect(html).toContain('2, 27')
    })

    it('df 없으면 행 생략', () => {
      const html = buildCopyHtml({ ...base, df: undefined })
      expect(html).not.toContain('자유도')
    })

    it('신뢰구간 표시', () => {
      const html = buildCopyHtml(base)
      expect(html).toContain('95% 신뢰구간')
      expect(html).toContain('0.3500')
      expect(html).toContain('2.1800')
    })

    it('신뢰구간 없으면 행 생략', () => {
      const html = buildCopyHtml({ ...base, confidence: undefined })
      expect(html).not.toContain('95% 신뢰구간')
    })

    it('p < 0.001이면 "< .001" 표시', () => {
      const html = buildCopyHtml({ ...base, pValue: 0.0001 })
      expect(html).toContain('< .001')
    })

    it('효과크기 숫자형', () => {
      const html = buildCopyHtml({ ...base, effectSize: 0.5 })
      expect(html).toContain('0.5000')
    })

    it('효과크기 없으면 "-"', () => {
      const html = buildCopyHtml({ ...base, effectSize: undefined })
      expect(html).toContain('<td>-</td>')
    })

    it('해석 + APA 포함', () => {
      const html = buildCopyHtml(base)
      expect(html).toContain('<b>해석:</b>')
      expect(html).toContain('두 그룹 간 유의한 차이가 있습니다.')
      expect(html).toContain('<b>APA:</b>')
      expect(html).toContain('t(28) = 2.46, p = .018')
    })
  })

  describe('buildCopyHtml — AI 해석 분기', () => {
    const base: CopyContext = {
      testName: 't-검정',
      statisticName: 't',
      statistic: 2.0,
      pValue: 0.05,
    }

    it('AI 해석 없으면 hr/h4/pre 없음', () => {
      const html = buildCopyHtml({ ...base, aiInterpretation: null })
      expect(html).not.toContain('<hr/>')
      expect(html).not.toContain('AI 해석')
      expect(html).not.toContain('<pre')
    })

    it('AI 해석 있으면 pre 태그로 감싸짐', () => {
      const ai = '### 한줄 요약\np < 0.05이므로 유의합니다.\n\n### 상세 해석\n효과크기가 중간입니다.'
      const html = buildCopyHtml({ ...base, aiInterpretation: ai })

      expect(html).toContain('<hr/><h4>AI 해석</h4>')
      expect(html).toContain('<pre style="white-space:pre-wrap;font-family:inherit;margin:0">')
      expect(html).toContain('p < 0.05이므로 유의합니다.')
      // 상세 해석도 별도 pre
      expect(html).toContain('<pre style="white-space:pre-wrap;font-family:inherit;margin:8px 0 0">')
      expect(html).toContain('효과크기가 중간입니다.')
    })

    it('AI 해석에 **bold** 마크다운이 있어도 <br/>로 치환되지 않음 (pre 보존)', () => {
      const ai = '**유의한 결과**입니다.\n다음 줄'
      const html = buildCopyHtml({ ...base, aiInterpretation: ai })

      // pre 내부이므로 \n이 그대로 유지 (<br/> 없음)
      expect(html).not.toContain('<br/>')
      expect(html).toContain('**유의한 결과**입니다.\n다음 줄')
    })

    it('상세 해석 없는 AI 응답', () => {
      const ai = '### 한줄 요약\n요약만 있는 응답'
      const html = buildCopyHtml({ ...base, aiInterpretation: ai })

      // pre 1개만 (상세 없음)
      const preCount = (html.match(/<pre /g) || []).length
      expect(preCount).toBe(1)
    })
  })
})
