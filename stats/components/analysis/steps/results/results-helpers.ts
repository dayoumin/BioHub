/**
 * Shared helper functions for Results sub-components.
 * Used by: ResultsHeroCard, ResultsStatsCards, ResultsActionStep (parent)
 */

import type { ResultsText } from '@/lib/terminology/terminology-types'
// formatPValue: formatters.ts의 APA 7th 구현을 단일 소스로 re-export
export { formatPValueAPA as formatPValue } from '@/lib/statistics/formatters'

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

/** 효과크기 해석 (L1 배지용 — 지역화 레이블 사용)
 *  기준: Cohen (1988) + Sawilowsky (2009) 확장
 *  Cohen's d: <0.2 negligible, 0.2 small, 0.5 medium, 0.8 large, ≥1.2 veryLarge
 *  η²/η²ₚ/ω²/ε²: <0.01 negligible, 0.01 small, 0.06 medium, 0.14 large, ≥0.20 veryLarge
 *  r/φ/V/W: <0.1 negligible, 0.1 small, 0.3 medium, 0.5 large, ≥0.7 veryLarge
 *  R²: <0.02 negligible, 0.02 small, 0.13 medium, 0.26 large, ≥0.40 veryLarge
 */
export function getEffectSizeInterpretation(value: number, type: string | undefined, labels: ResultsText['effectSizeLabels']): string {
  const absValue = Math.abs(value)
  switch (type) {
    // Cohen's d 계열 (d, g, Δ)
    case 'cohensD':
    case 'hedgesG':
    case 'glassDelta':
      if (absValue < 0.2) return labels.negligible ?? labels.small
      if (absValue < 0.5) return labels.small
      if (absValue < 0.8) return labels.medium
      if (absValue < 1.2) return labels.large
      return labels.veryLarge
    // 분산 설명 비율 계열 (η², η²ₚ, ω², ε²)
    case 'etaSquared':
    case 'partialEtaSquared':
    case 'omegaSquared':
    case 'epsilonSquared':
      if (absValue < 0.01) return labels.negligible ?? labels.small
      if (absValue < 0.06) return labels.small
      if (absValue < 0.14) return labels.medium
      if (absValue < 0.20) return labels.large
      return labels.veryLarge
    // 상관계수 계열 (r, φ, V, W)
    case 'r':
    case 'phi':
    case 'cramersV':
    case 'w':
      if (absValue < 0.1) return labels.negligible ?? labels.small
      if (absValue < 0.3) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.7) return labels.large
      return labels.veryLarge
    // R² (결정계수)
    case 'rSquared':
      if (absValue < 0.02) return labels.negligible ?? labels.small
      if (absValue < 0.13) return labels.small
      if (absValue < 0.26) return labels.medium
      if (absValue < 0.40) return labels.large
      return labels.veryLarge
    // 알 수 없는 타입: Cohen's d 기준 적용
    default:
      if (absValue < 0.2) return labels.negligible ?? labels.small
      if (absValue < 0.5) return labels.small
      if (absValue < 0.8) return labels.medium
      if (absValue < 1.2) return labels.large
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

// formatPValue는 상단에서 formatPValueAPA를 re-export함
