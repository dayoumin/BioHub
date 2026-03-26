/**
 * chart-color-resolver 테스트
 *
 * CSS 커스텀 프로퍼티 → ECharts 색상 해석 + 테마 전환 시뮬레이션
 */

import {
  resolveAxisColors,
  resolveChartPalette,
  resolveSemanticColors,
  resolveCssVar,
  CHART_PALETTE_FALLBACK,
} from '@/lib/charts/chart-color-resolver'

// ── 헬퍼: CSS 변수 일괄 설정/초기화 ──────────────────────────

function setCssVars(vars: Record<string, string>): void {
  for (const [name, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(name, value)
  }
}

function clearAllCssVars(): void {
  document.documentElement.style.cssText = ''
}

// ── 라이트/다크 테마 CSS 변수 시뮬레이션 ─────────────────────

const LIGHT_THEME = {
  '--muted-foreground': '#64748b',
  '--border': '#e2e8f0',
  '--foreground': '#0f172a',
  '--success': '#16a34a',
  '--error': '#dc2626',
  '--chart-1': '#2563eb',
  '--chart-2': '#dc2626',
  '--chart-3': '#16a34a',
}

const DARK_THEME = {
  '--muted-foreground': '#94a3b8',
  '--border': '#334155',
  '--foreground': '#f8fafc',
  '--success': '#4ade80',
  '--error': '#f87171',
  '--chart-1': '#60a5fa',
  '--chart-2': '#f87171',
  '--chart-3': '#4ade80',
}

afterEach(() => {
  clearAllCssVars()
})

// ── resolveCssVar ────────────────────────────────────────────

describe('resolveCssVar', () => {
  it('CSS 변수가 설정되어 있으면 해당 값 반환', () => {
    setCssVars({ '--test-color': '#ff0000' })
    expect(resolveCssVar('--test-color', '#000')).toBe('#ff0000')
  })

  it('CSS 변수가 없으면 폴백 반환', () => {
    expect(resolveCssVar('--nonexistent', '#fallback')).toBe('#fallback')
  })

  it('빈 문자열이면 폴백 반환', () => {
    setCssVars({ '--empty-var': '' })
    expect(resolveCssVar('--empty-var', '#fallback')).toBe('#fallback')
  })
})

// ── resolveAxisColors ────────────────────────────────────────

describe('resolveAxisColors', () => {
  it('CSS 변수가 없으면 모든 필드에 폴백 반환', () => {
    const colors = resolveAxisColors()
    expect(colors.axisLabel).toBe('#64748b')
    expect(colors.axisLine).toBe('#94a3b8')
    expect(colors.splitLine).toBe('#e2e8f0')
    expect(colors.tooltipText).toBe('#334155')
    expect(colors.tooltipBorder).toBe('#e2e8f0')
    expect(colors.tooltipBg).toBe('rgba(255,255,255,0.96)')
    expect(colors.annotationMuted).toBe('#999999')
  })

  it('라이트 테마 CSS 변수 설정 시 해당 값 반환', () => {
    setCssVars(LIGHT_THEME)
    const colors = resolveAxisColors()
    expect(colors.axisLabel).toBe('#64748b')
    expect(colors.axisLine).toBe('#e2e8f0')
    expect(colors.tooltipText).toBe('#0f172a')
  })

  it('다크 테마 CSS 변수 설정 시 다른 값 반환', () => {
    setCssVars(DARK_THEME)
    const colors = resolveAxisColors()
    expect(colors.axisLabel).toBe('#94a3b8')
    expect(colors.axisLine).toBe('#334155')
    expect(colors.tooltipText).toBe('#f8fafc')
  })

  it('매 호출마다 새로운 객체 반환 (캐시 없음)', () => {
    const a = resolveAxisColors()
    const b = resolveAxisColors()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

// ── resolveChartPalette ──────────────────────────────────────

describe('resolveChartPalette', () => {
  it('CSS 변수가 없으면 CHART_PALETTE_FALLBACK 반환', () => {
    const palette = resolveChartPalette()
    expect(palette).toHaveLength(10)
    expect(palette[0]).toBe(CHART_PALETTE_FALLBACK[0])
    expect(palette[9]).toBe(CHART_PALETTE_FALLBACK[9])
  })

  it('count 파라미터로 갯수 제한', () => {
    const palette = resolveChartPalette(3)
    expect(palette).toHaveLength(3)
  })

  it('CSS 변수 설정 시 해당 값 우선 사용', () => {
    setCssVars({ '--chart-1': '#custom01', '--chart-2': '#custom02' })
    const palette = resolveChartPalette(3)
    expect(palette[0]).toBe('#custom01')
    expect(palette[1]).toBe('#custom02')
    expect(palette[2]).toBe(CHART_PALETTE_FALLBACK[2]) // 미설정 → 폴백
  })

  it('다크 테마로 전환하면 다른 팔레트 반환', () => {
    setCssVars(LIGHT_THEME)
    const lightPalette = resolveChartPalette(3)

    clearAllCssVars()
    setCssVars(DARK_THEME)
    const darkPalette = resolveChartPalette(3)

    expect(lightPalette[0]).toBe('#2563eb')
    expect(darkPalette[0]).toBe('#60a5fa')
    expect(lightPalette[0]).not.toBe(darkPalette[0])
  })
})

// ── resolveSemanticColors ────────────────────────────────────

describe('resolveSemanticColors', () => {
  it('CSS 변수가 없으면 폴백 반환', () => {
    const colors = resolveSemanticColors()
    expect(colors.success).toBe('#10B981')
    expect(colors.error).toBe('#EF4444')
    expect(colors.neutral).toBe('#6B7280')
  })

  it('CSS 변수 설정 시 해당 값 반환', () => {
    setCssVars(DARK_THEME)
    const colors = resolveSemanticColors()
    expect(colors.success).toBe('#4ade80')
    expect(colors.error).toBe('#f87171')
    expect(colors.neutral).toBe('#94a3b8')
  })
})

// ── 테마 전환 시뮬레이션 ─────────────────────────────────────

describe('테마 전환 시뮬레이션', () => {
  it('라이트 → 다크 전환 시 axis 색상이 변경됨', () => {
    setCssVars(LIGHT_THEME)
    const lightAxis = resolveAxisColors()

    clearAllCssVars()
    setCssVars(DARK_THEME)
    const darkAxis = resolveAxisColors()

    // 라이트 vs 다크: axisLabel이 다름
    expect(lightAxis.axisLabel).toBe('#64748b')
    expect(darkAxis.axisLabel).toBe('#94a3b8')
    expect(lightAxis.axisLabel).not.toBe(darkAxis.axisLabel)

    // splitLine, tooltipText 등도 변경됨
    expect(lightAxis.splitLine).not.toBe(darkAxis.splitLine)
    expect(lightAxis.tooltipText).not.toBe(darkAxis.tooltipText)
  })

  it('라이트 → 다크 전환 시 차트 팔레트가 변경됨', () => {
    setCssVars(LIGHT_THEME)
    const lightPalette = resolveChartPalette(3)

    clearAllCssVars()
    setCssVars(DARK_THEME)
    const darkPalette = resolveChartPalette(3)

    // 3개 색상 모두 달라짐
    for (let i = 0; i < 3; i++) {
      expect(lightPalette[i]).not.toBe(darkPalette[i])
    }
  })

  it('라이트 → 다크 전환 시 시맨틱 색상이 변경됨', () => {
    setCssVars(LIGHT_THEME)
    const lightSem = resolveSemanticColors()

    clearAllCssVars()
    setCssVars(DARK_THEME)
    const darkSem = resolveSemanticColors()

    expect(lightSem.success).not.toBe(darkSem.success)
    expect(lightSem.error).not.toBe(darkSem.error)
  })

  it('legend에 사용되는 axisLabel 색상이 테마에 반응', () => {
    // Bio-Tools legend.textStyle.color = resolveAxisColors().axisLabel
    setCssVars(LIGHT_THEME)
    const lightLegendColor = resolveAxisColors().axisLabel
    expect(lightLegendColor).toBe('#64748b')

    clearAllCssVars()
    setCssVars(DARK_THEME)
    const darkLegendColor = resolveAxisColors().axisLabel
    expect(darkLegendColor).toBe('#94a3b8')

    // 다크 모드에서 더 밝은 색 → 가독성 확보
    expect(darkLegendColor).not.toBe(lightLegendColor)
  })

  it('다크 → 라이트 복귀 시 원래 색상으로 돌아옴', () => {
    setCssVars(LIGHT_THEME)
    const original = resolveAxisColors()

    clearAllCssVars()
    setCssVars(DARK_THEME)
    resolveAxisColors() // 다크 모드 호출

    clearAllCssVars()
    setCssVars(LIGHT_THEME)
    const restored = resolveAxisColors()

    expect(restored).toEqual(original)
  })
})
