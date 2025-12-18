/**
 * Framer Motion Variants - 2025 스타일 애니메이션
 *
 * 점진적 질문형 UI를 위한 공통 애니메이션 설정
 * prefers-reduced-motion 지원
 */

import type { Variants, Transition } from 'framer-motion'

// ============================================
// Transition Presets
// ============================================

/**
 * 기본 스프링 전환 (부드러운 바운스)
 */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

/**
 * 빠른 스프링 전환 (즉각 반응)
 */
export const quickSpringTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
}

/**
 * 부드러운 이징 전환
 */
export const easeTransition: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.3,
}

// ============================================
// Page Transition Variants
// ============================================

/**
 * 페이지 전환 (좌우 슬라이드)
 */
export const pageSlideVariants: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: easeTransition,
  },
}

/**
 * 페이지 전환 (페이드 + 위로)
 */
export const pageFadeUpVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: easeTransition,
  },
}

// ============================================
// Card/Item Variants
// ============================================

/**
 * 카드 등장 (stagger 지원)
 */
export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...springTransition,
      delay: i * 0.1,
    },
  }),
}

/**
 * 리스트 아이템 (가로 슬라이드)
 */
export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      ...quickSpringTransition,
      delay: i * 0.05,
    },
  }),
  exit: {
    opacity: 0,
    x: -20,
    transition: easeTransition,
  },
}

/**
 * 컨테이너 (자식 stagger)
 */
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// ============================================
// Interactive Variants
// ============================================

/**
 * 호버 스케일 (카드용)
 */
export const hoverScaleVariants = {
  whileHover: {
    scale: 1.03,
    y: -4,
    transition: quickSpringTransition,
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
}

/**
 * 호버 하이라이트 (리스트 아이템용)
 */
export const hoverHighlightVariants = {
  whileHover: {
    scale: 1.01,
    x: 4,
    transition: quickSpringTransition,
  },
  whileTap: {
    scale: 0.99,
    transition: { duration: 0.1 },
  },
}

// ============================================
// Special Effects
// ============================================

/**
 * 체크마크 등장
 */
export const checkmarkVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
    },
  },
}

/**
 * 타임라인 아이템 (결과 화면용)
 */
export const timelineItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    x: 0,
    transition: {
      ...springTransition,
      delay: i * 0.15,
    },
  }),
}

/**
 * 배지/태그 팝
 */
export const badgePopVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
}

// ============================================
// Reduced Motion Support
// ============================================

/**
 * 모션 감소 모드용 대체 전환
 */
export const reducedMotionTransition: Transition = {
  duration: 0,
}

/**
 * 모션 감소 시 variants 변환
 */
export function getReducedMotionVariants(variants: Variants): Variants {
  const reduced: Variants = {}
  for (const key of Object.keys(variants)) {
    const variant = variants[key]
    if (typeof variant === 'object' && variant !== null) {
      reduced[key] = {
        ...variant,
        transition: reducedMotionTransition,
      }
    } else {
      reduced[key] = variant
    }
  }
  return reduced
}
