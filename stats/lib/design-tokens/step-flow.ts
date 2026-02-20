/**
 * Step Flow 디자인 토큰 시스템
 *
 * 모든 Step Indicator 컴포넌트에서 사용하는 디자인 상수를 정의합니다.
 * 일관된 UI/UX를 위해 애니메이션, 색상, 간격 등을 토큰화합니다.
 */

// ============================================================================
// 애니메이션 토큰
// ============================================================================

export const ANIMATION_TOKENS = {
  duration: {
    fast: 150,      // 빠른 인터랙션 (hover, click)
    normal: 300,    // 일반 전환 (단계 변경, fade-in)
    slow: 500,      // 느린 전환 (progress bar, 복잡한 애니메이션)
  },
  easing: {
    standard: 'ease-in-out',
    entrance: 'ease-out',
    exit: 'ease-in',
  },
  scale: {
    hover: 1.1,     // hover 시 확대
    active: 1.05,   // active 단계 확대
    tap: 0.98,      // 클릭 시 축소
  },
} as const

// ============================================================================
// 색상 Variant 토큰
// ============================================================================

export type ColorVariant = 'gray' | 'blue-purple' | 'emerald-cyan' | 'custom'

export interface VariantColors {
  completed: {
    bg: string
    border: string
    text: string
    shadow: string
  }
  active: {
    bg: string
    border: string
    text: string
    shadow: string
  }
  pending: {
    bg: string
    border: string
    text: string
  }
  progressBar: string
  ripple: string
}

export const COLOR_VARIANTS: Record<ColorVariant, VariantColors> = {
  gray: {
    completed: {
      bg: 'bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-200 dark:to-gray-300',
      border: 'border-gray-700 dark:border-gray-300',
      text: 'text-white dark:text-black',
      shadow: 'shadow-lg shadow-black/20 dark:shadow-white/20',
    },
    active: {
      bg: 'bg-gradient-to-br from-gray-600 to-gray-900 dark:from-gray-300 dark:to-gray-100',
      border: 'border-gray-600 dark:border-gray-300',
      text: 'text-white dark:text-black',
      shadow: 'shadow-lg shadow-black/20 dark:shadow-white/20',
    },
    pending: {
      bg: 'bg-white dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-400',
    },
    progressBar: 'bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100',
    ripple: 'bg-gray-500/20 dark:bg-gray-400/20',
  },

  'blue-purple': {
    completed: {
      bg: 'bg-gradient-to-br from-blue-500 to-purple-600',
      border: 'border-blue-500',
      text: 'text-white',
      shadow: 'shadow-lg shadow-blue-500/20',
    },
    active: {
      bg: 'bg-gradient-to-br from-blue-400 to-purple-500',
      border: 'border-blue-400',
      text: 'text-white',
      shadow: 'shadow-lg shadow-blue-400/20',
    },
    pending: {
      bg: 'bg-white dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-400',
    },
    progressBar: 'bg-gradient-to-r from-blue-500 to-purple-500',
    ripple: 'bg-blue-500/20',
  },

  'emerald-cyan': {
    completed: {
      bg: 'bg-gradient-to-br from-emerald-500 to-cyan-600',
      border: 'border-emerald-500',
      text: 'text-white',
      shadow: 'shadow-lg shadow-emerald-500/20',
    },
    active: {
      bg: 'bg-gradient-to-br from-emerald-400 to-cyan-500',
      border: 'border-emerald-400',
      text: 'text-white',
      shadow: 'shadow-lg shadow-emerald-400/20',
    },
    pending: {
      bg: 'bg-white dark:bg-gray-900',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-400',
    },
    progressBar: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
    ripple: 'bg-emerald-500/20',
  },

  custom: {
    // 커스텀 variant는 props로 전달된 className으로 오버라이드 가능
    completed: {
      bg: 'bg-primary',
      border: 'border-primary',
      text: 'text-primary-foreground',
      shadow: 'shadow-lg shadow-primary/20',
    },
    active: {
      bg: 'bg-primary/80',
      border: 'border-primary/80',
      text: 'text-primary-foreground',
      shadow: 'shadow-lg shadow-primary/30',
    },
    pending: {
      bg: 'bg-muted',
      border: 'border-muted',
      text: 'text-muted-foreground',
    },
    progressBar: 'bg-primary',
    ripple: 'bg-primary/20',
  },
}

// ============================================================================
// 레이아웃 토큰
// ============================================================================

export const LAYOUT_TOKENS = {
  size: {
    sm: {
      circle: 'w-8 h-8',      // 작은 원형 아이콘
      icon: 'w-4 h-4',        // 작은 아이콘
      badge: 'w-3 h-3',       // 작은 배지
      ripple: 'w-12 h-12',    // 작은 ripple
    },
    md: {
      circle: 'w-10 h-10',    // 중간 원형 아이콘
      icon: 'w-5 h-5',        // 중간 아이콘
      badge: 'w-4 h-4',       // 중간 배지
      ripple: 'w-14 h-14',    // 중간 ripple
    },
    lg: {
      circle: 'w-12 h-12',    // 큰 원형 아이콘
      icon: 'w-6 h-6',        // 큰 아이콘
      badge: 'w-5 h-5',       // 큰 배지
      ripple: 'w-16 h-16',    // 큰 ripple
    },
  },
  spacing: {
    stepGap: 'space-y-6',       // 단계 사이 수직 간격
    cardPadding: 'p-6',         // 카드 내부 패딩
    sectionGap: 'space-y-4',    // 섹션 사이 간격
    elementGap: 'space-y-2',    // 작은 요소 사이 간격
  },
  border: {
    width: 'border-2',          // 강조 테두리
    radius: 'rounded-full',     // 원형
  },
} as const

// ============================================================================
// 타이포그래피 토큰
// ============================================================================

export const TYPOGRAPHY_TOKENS = {
  stepTitle: 'text-sm font-medium',           // 단계 제목
  stepDescription: 'text-xs',                 // 단계 설명
  stepNumber: 'text-[10px] font-medium',      // 단계 번호 (작은 배지)
  pageTitle: 'text-2xl font-bold',            // 페이지 제목
  cardTitle: 'text-lg font-semibold',         // 카드 제목
  badge: 'text-sm',                           // 배지 텍스트
} as const

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * variant에 따른 색상 클래스 가져오기
 */
export function getVariantColors(variant: ColorVariant = 'gray'): VariantColors {
  return COLOR_VARIANTS[variant]
}

/**
 * 애니메이션 duration을 ms에서 Tailwind 클래스로 변환
 */
export function getDurationClass(duration: keyof typeof ANIMATION_TOKENS.duration): string {
  const ms = ANIMATION_TOKENS.duration[duration]
  return `duration-${ms}`
}

/**
 * 크기별 레이아웃 토큰 가져오기
 */
export function getSizeTokens(size: 'sm' | 'md' | 'lg' = 'md') {
  return LAYOUT_TOKENS.size[size]
}

// ============================================================================
// Framer Motion Variants (공통)
// ============================================================================

export const MOTION_VARIANTS = {
  // 페이지/카드 fade-in
  fadeIn: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: ANIMATION_TOKENS.duration.normal / 1000 }
    },
  },

  // 단계 전환 (좌우 슬라이드)
  slideHorizontal: {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: ANIMATION_TOKENS.duration.normal / 1000 }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: ANIMATION_TOKENS.duration.fast / 1000 }
    },
  },

  // 단계 전환 (상하 슬라이드)
  slideVertical: {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: ANIMATION_TOKENS.duration.normal / 1000 }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: ANIMATION_TOKENS.duration.fast / 1000 }
    },
  },

  // 호버 확대
  scaleHover: {
    scale: ANIMATION_TOKENS.scale.hover,
    transition: { duration: ANIMATION_TOKENS.duration.fast / 1000 }
  },

  // 탭 축소
  scaleTap: {
    scale: ANIMATION_TOKENS.scale.tap,
  },
} as const
