/**
 * Shared helper functions for Results sub-components.
 * Used by: ResultsHeroCard, ResultsStatsCards, ResultsActionStep (parent)
 */

import type { ResultsText } from '@/lib/terminology/terminology-types'

// ===== Animation Variants =====

export const heroRevealVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }
  }
}

export const statsContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

export const statsItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
}

export const sectionRevealVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } }
}

// ===== Formatting Helpers =====

/** 효과크기 해석 (L1 배지용 — 지역화 레이블 사용) */
export function getEffectSizeInterpretation(value: number, type: string | undefined, labels: ResultsText['effectSizeLabels']): string {
  const absValue = Math.abs(value)
  switch (type) {
    case 'cohensD':
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
    case 'etaSquared':
      if (absValue < 0.01) return labels.small
      if (absValue < 0.06) return labels.medium
      if (absValue < 0.14) return labels.large
      return labels.veryLarge
    case 'r':
    case 'phi':
    case 'cramersV':
      if (absValue < 0.1) return labels.small
      if (absValue < 0.3) return labels.medium
      if (absValue < 0.5) return labels.large
      return labels.veryLarge
    default:
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
  }
}

/** 효과크기 타입 → 간결한 기호 */
export function formatEffectSizeSymbol(type: string | undefined): string {
  switch (type) {
    case 'cohensD': return 'd'
    case 'hedgesG': return 'g'
    case 'glassDelta': return 'Δ'
    case 'etaSquared': return 'η²'
    case 'partialEtaSquared': return 'η²ₚ'
    case 'omegaSquared': return 'ω²'
    case 'epsilonSquared': return 'ε²'
    case 'r': return 'r'
    case 'phi': return 'φ'
    case 'cramersV': return 'V'
    case 'rSquared': return 'R²'
    case 'w': return 'W'
    default: return type ?? '?'
  }
}

/** p-value 포맷팅 (APA 스타일: 선행 0 생략) */
export function formatPValue(p: number): string {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return '< .001'
  if (p < 0.01) return '< .01'
  if (p < 0.05) return '< .05'
  return p.toFixed(3)
}
