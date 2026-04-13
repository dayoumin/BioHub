/**
 * Bio-Tools 디자인 토큰
 *
 * 기존 디자인 시스템 패턴 (STEP_STYLES, BADGE_*_STYLE, section-accent) 을
 * Bio-Tools 섹션에 맞게 정의.
 */

import { STEP_STYLES } from './analysis'

// ─── 섹션 Accent ─────────────────────────────────

/** Bio-Tools 섹션 accent CSS 변수명 */
export const BIO_ACCENT_VAR = '--section-accent-bio'

/** 아이콘 배경 (12% accent) */
export const BIO_ICON_BG = {
  backgroundColor: `oklch(from var(${BIO_ACCENT_VAR}) l c h / 12%)`,
} as const

/** 아이콘 전경색 */
export const BIO_ICON_COLOR = {
  color: `var(${BIO_ACCENT_VAR})`,
} as const

/** Bio-Tools 본문 강조 텍스트/아이콘 */
export const BIO_ACCENT_TEXT = {
  color: `var(${BIO_ACCENT_VAR})`,
} as const

/** 뱃지 스타일 (BADGE_ANALYSIS_STYLE 패턴) */
export const BADGE_BIO_STYLE = {
  background: `oklch(from var(${BIO_ACCENT_VAR}) l c h / 12%)`,
  color: `var(${BIO_ACCENT_VAR})`,
} as const

/** 허브 섹션용 소프트 패널 */
export const BIO_HUB_PANEL_STYLE = {
  backgroundColor: 'var(--surface-container-low)',
} as const

/** 허브 카테고리 선택 상태 */
export const BIO_HUB_ACTIVE_CARD_STYLE = {
  backgroundColor: `color-mix(in srgb, var(${BIO_ACCENT_VAR}) 14%, var(--surface-container-high))`,
} as const

export const BIO_SUBNAV_SURFACE = {
  backgroundColor: `color-mix(in srgb, var(${BIO_ACCENT_VAR}) 8%, var(--surface-container-lowest))`,
} as const

/** 활성 툴 셸 헤더 배경 */
export const BIO_HEADER_SURFACE = {
  backgroundColor: `color-mix(in srgb, var(${BIO_ACCENT_VAR}) 6%, var(--surface-container-lowest))`,
} as const

/** 페이지 배경 틴트 (AnalysisLayout 패턴 — 4% accent) */
export const BIO_BG_TINT = {
  backgroundColor: `color-mix(in srgb, var(${BIO_ACCENT_VAR}) 4%, var(--background))`,
} as const

// ─── 배지 레이아웃 ────────────────────────────────

/** Bio-Tools 배지 공통 레이아웃 클래스 (색상은 style prop으로 적용) */
export const BIO_BADGE_CLASS = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold' as const

// ─── 유의성 배지 ──────────────────────────────────

/** p-value 유의성 스타일 (CSS 변수 --stat-significant 사용) */
export const SIGNIFICANCE_BADGE = {
  significant: {
    backgroundColor: `oklch(from var(--stat-significant) l c h / 15%)`,
    color: 'var(--stat-significant)',
  },
  nonSignificant: {
    backgroundColor: `oklch(from var(--stat-non-significant) l c h / 15%)`,
    color: 'var(--stat-non-significant)',
  },
} as const

// ─── 테이블 토큰 (STEP_STYLES 재활용) ─────────────

export const BIO_TABLE = {
  headerCell: STEP_STYLES.tableHeaderCell,
  bodyCell: STEP_STYLES.tableBodyCell,
  headerBg: STEP_STYLES.cardHeaderBg,
} as const

// ─── Select 빈 값 sentinel ────────────────────────

/** shadcn Select에서 "없음" 옵션을 표현하기 위한 sentinel 값 (Radix는 value="" 불허) */
export const NONE_VALUE = '__none__' as const

// ─── 레이아웃 토큰 (STEP_STYLES 재활용) ───────────

export const BIO_LAYOUT = {
  sectionGap: STEP_STYLES.sectionGap,
  contentPaddingX: STEP_STYLES.mainContentPaddingX,
  contentPaddingY: STEP_STYLES.mainContentPaddingY,
  /** 도구 콘텐츠 영역 max-width (허브는 LAYOUT.maxWidth 사용) */
  toolContentMaxWidth: 'mx-auto max-w-4xl',
} as const
