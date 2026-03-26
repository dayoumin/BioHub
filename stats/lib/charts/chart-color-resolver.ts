/**
 * CSS 변수 → ECharts/SVG 호환 색상 런타임 해석
 *
 * ECharts는 CSS custom property를 직접 받지 못하므로
 * getComputedStyle로 해석한 값을 전달해야 한다.
 */

// ── Fallback (SSR / document 미접근 시) ────────────────────────

export const CHART_PALETTE_FALLBACK = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#e11d48', '#65a30d', '#d97706', '#7c3aed',
] as const

const AXIS_FALLBACK = {
  axisLabel: '#64748b',
  axisLine: '#94a3b8',
  splitLine: '#e2e8f0',
  tooltipText: '#334155',
  tooltipBorder: '#e2e8f0',
  tooltipBg: 'rgba(255,255,255,0.96)',
  annotationMuted: '#999999',
} as const

// ── CSS 변수 해석 (단건) ──────────────────────────────────────

export function resolveCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || fallback
}

// ── Public API ─────────────────────────────────────────────────

/** --chart-1 ~ --chart-N 해석. dark mode 전환 시 자동 반영. */
export function resolveChartPalette(count = 10): string[] {
  if (typeof document === 'undefined') {
    return CHART_PALETTE_FALLBACK.slice(0, count) as string[]
  }
  const style = getComputedStyle(document.documentElement)
  return Array.from({ length: count }, (_, i) => {
    const val = style.getPropertyValue(`--chart-${i + 1}`).trim()
    return val || CHART_PALETTE_FALLBACK[i % CHART_PALETTE_FALLBACK.length]
  })
}

/** ECharts 축·툴팁 등 공통 테마 색상 해석 */
export interface AxisColors {
  axisLabel: string
  axisLine: string
  splitLine: string
  tooltipText: string
  tooltipBorder: string
  tooltipBg: string
  annotationMuted: string
}

/** 1회 getComputedStyle로 축·툴팁 색상 일괄 해석 */
export function resolveAxisColors(): AxisColors {
  if (typeof document === 'undefined') return { ...AXIS_FALLBACK }
  const style = getComputedStyle(document.documentElement)
  const get = (name: string, fb: string): string =>
    style.getPropertyValue(name).trim() || fb
  return {
    axisLabel: get('--muted-foreground', AXIS_FALLBACK.axisLabel),
    axisLine: get('--border', AXIS_FALLBACK.axisLine),
    splitLine: get('--border', AXIS_FALLBACK.splitLine),
    tooltipText: get('--foreground', AXIS_FALLBACK.tooltipText),
    tooltipBorder: get('--border', AXIS_FALLBACK.tooltipBorder),
    tooltipBg: AXIS_FALLBACK.tooltipBg,
    annotationMuted: get('--muted-foreground', AXIS_FALLBACK.annotationMuted),
  }
}

/** 시맨틱 상태 색상 (유의/비유의/중립). 1회 getComputedStyle. */
export function resolveSemanticColors(): { success: string; error: string; neutral: string } {
  if (typeof document === 'undefined') {
    return { success: '#10B981', error: '#EF4444', neutral: '#6B7280' }
  }
  const style = getComputedStyle(document.documentElement)
  const get = (name: string, fb: string): string =>
    style.getPropertyValue(name).trim() || fb
  return {
    success: get('--success', '#10B981'),
    error: get('--error', '#EF4444'),
    neutral: get('--muted-foreground', '#6B7280'),
  }
}
