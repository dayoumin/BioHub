/**
 * UI 상수 정의 - 흑백 디자인 시스템
 * 일관된 스타일링을 위한 중앙화된 상수
 */

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Circle,
  Square,
  Triangle,
  Diamond
} from 'lucide-react'

/**
 * 상태별 스타일 정의 - 흑백만 사용
 */
export const STATUS_STYLES = {
  success: {
    icon: CheckCircle2,
    className: 'text-gray-900 dark:text-gray-100 font-bold',
    bgClassName: 'bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-gray-100',
    badgeClassName: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-black',
    label: '성공'
  },
  error: {
    icon: XCircle,
    className: 'text-gray-800 dark:text-gray-200 font-semibold',
    bgClassName: 'bg-gray-100 dark:bg-gray-900 border-2 border-gray-800 dark:border-gray-200',
    badgeClassName: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black',
    label: '오류'
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-gray-600 dark:text-gray-400 font-medium',
    bgClassName: 'bg-gray-50 dark:bg-gray-850 border border-gray-600 dark:border-gray-400',
    badgeClassName: 'bg-gray-600 dark:bg-gray-400 text-white dark:text-black',
    label: '경고'
  },
  info: {
    icon: Info,
    className: 'text-gray-500 dark:text-gray-500',
    bgClassName: 'bg-white dark:bg-gray-950 border border-gray-400 dark:border-gray-600',
    badgeClassName: 'bg-gray-500 dark:bg-gray-500 text-white',
    label: '정보'
  },
  loading: {
    icon: Loader2,
    className: 'text-gray-700 dark:text-gray-300 animate-spin',
    bgClassName: 'bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700',
    badgeClassName: 'bg-gray-700 dark:bg-gray-300 text-white dark:text-black',
    label: '처리중'
  }
} as const

/**
 * 차트 마커 스타일 - 모양으로 구분
 */
export const CHART_MARKERS = {
  series1: { symbol: 'circle', size: 8 },
  series2: { symbol: 'square', size: 8 },
  series3: { symbol: 'triangle-up', size: 10 },
  series4: { symbol: 'diamond', size: 10 },
  series5: { symbol: 'cross', size: 10 },
  series6: { symbol: 'x', size: 10 }
} as const

/**
 * 선 스타일 - 패턴으로 구분
 */
export const LINE_STYLES = {
  solid: { dash: undefined },
  dashed: { dash: 'dash' },
  dotted: { dash: 'dot' },
  dashdot: { dash: 'dashdot' },
  longdash: { dash: 'longdash' },
  longdashdot: { dash: 'longdashdot' }
} as const

/**
 * 패턴 채우기 - 막대/영역 차트용
 */
export const FILL_PATTERNS = {
  solid: '',
  diagonal: '/',
  backDiagonal: '\\',
  vertical: '|',
  horizontal: '-',
  cross: '+',
  dots: '.',
  crossHatch: 'x'
} as const

/**
 * 버튼 스타일 - 흑백 호버 효과
 */
export const BUTTON_STYLES = {
  primary: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-black hover:bg-gray-700 dark:hover:bg-gray-300 transition-all duration-150 active:scale-95',
  secondary: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-2 border-gray-900 dark:border-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-all duration-150',
  outline: 'bg-transparent border border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 transition-all duration-150'
} as const

/**
 * 카드 호버 효과
 */
export const CARD_STYLES = {
  default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
  hover: 'hover:shadow-lg hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200',
  active: 'shadow-xl border-2 border-gray-900 dark:border-gray-100',
  muted: 'bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800'
} as const

/**
 * 텍스트 강조 수준
 */
export const TEXT_EMPHASIS = {
  high: 'text-gray-900 dark:text-gray-100 font-bold',
  medium: 'text-gray-700 dark:text-gray-300 font-semibold',
  normal: 'text-gray-600 dark:text-gray-400',
  low: 'text-gray-500 dark:text-gray-500',
  muted: 'text-gray-400 dark:text-gray-600'
} as const

/**
 * 통계 유의성 표시 - 굵기와 크기로 구분
 */
export const SIGNIFICANCE_STYLES = {
  highly: 'text-gray-900 dark:text-gray-100 font-black text-lg',
  significant: 'text-gray-800 dark:text-gray-200 font-bold',
  marginal: 'text-gray-600 dark:text-gray-400 font-medium italic',
  notSignificant: 'text-gray-400 dark:text-gray-600 font-light'
} as const

/**
 * 그림자 효과
 */
export const SHADOW_STYLES = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  inner: 'shadow-inner',
  none: 'shadow-none'
} as const