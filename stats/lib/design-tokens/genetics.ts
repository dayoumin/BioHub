/**
 * Genetics 디자인 토큰
 *
 * 유전학 분석 허브는 Bio-Tools와 같은 생물학 도메인 흐름이므로
 * 허브/탐색 계층에서는 동일한 bio accent와 surface 로직을 사용한다.
 */

/** Genetics 허브 accent CSS 변수명 */
export const GENETICS_ACCENT_VAR = '--section-accent-bio'

/** Genetics 본문 강조 텍스트/아이콘 */
export const GENETICS_ACCENT_TEXT = {
  color: `var(${GENETICS_ACCENT_VAR})`,
} as const

/** 허브 섹션용 소프트 패널 */
export const GENETICS_HUB_PANEL_STYLE = {
  backgroundColor: 'var(--surface-container-low)',
} as const

/** 허브 카테고리 선택 상태 */
export const GENETICS_HUB_ACTIVE_CARD_STYLE = {
  backgroundColor: `color-mix(in srgb, var(${GENETICS_ACCENT_VAR}) 14%, var(--surface-container-high))`,
} as const

/** 활성 툴 서브내비 배경 */
export const GENETICS_SUBNAV_SURFACE = {
  backgroundColor: `color-mix(in srgb, var(${GENETICS_ACCENT_VAR}) 8%, var(--surface-container-lowest))`,
} as const
