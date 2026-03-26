/**
 * Bio-Tools 차트 색상 팔레트
 *
 * CSS 변수 --chart-1 ~ --chart-10 기반.
 * ECharts/SVG는 CSS 변수를 직접 받지 못하므로 resolveChartPalette()로 해석.
 * BIO_CHART_COLORS는 SSR/비브라우저 환경용 hex 폴백.
 */
import { CHART_PALETTE_FALLBACK } from '@/lib/charts/chart-color-resolver'

/** Hex 폴백 (SSR / 정적 컨텍스트용). 런타임에는 resolveChartPalette() 사용 권장. */
export const BIO_CHART_COLORS = CHART_PALETTE_FALLBACK
