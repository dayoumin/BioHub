/**
 * 공통 카드/아이콘 스타일 토큰
 *
 * 앱 전체 일관성을 위한 공유 스타일.
 * 사용처: TrackSuggestions (홈), DataUploadPanel (Graph Studio), 향후 추가 페이지
 */

import { cn } from '@/lib/utils'

// ===== 카드 스타일 =====

/** 클릭 가능한 액션 카드 (아이콘 + 라벨 그리드용) */
export const actionCardBase = cn(
  'flex flex-col items-center justify-center gap-3 p-6 rounded-xl',
  'border border-border bg-card',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  'hover:border-primary/50 hover:shadow-md',
  'group',
)

// ===== 아이콘 컨테이너 =====

/** 둥근 아이콘 래퍼 (카드 내부용) */
export const iconContainerBase = cn(
  'p-3 rounded-full transition-colors duration-200',
)

/** 기본 아이콘 컨테이너 (비활성 상태) */
export const iconContainerMuted = cn(
  iconContainerBase,
  'bg-muted text-muted-foreground',
  'group-hover:bg-primary/10 group-hover:text-primary',
)

/** 강조 아이콘 컨테이너 (Primary CTA용) */
export const iconContainerPrimary = cn(
  iconContainerBase,
  'bg-primary/10 text-primary',
  'group-hover:bg-primary group-hover:text-primary-foreground',
)

// ===== 모션 프리셋 =====

/** 컨테이너 stagger 애니메이션 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const

/** 자식 아이템 fade+slide 애니메이션 */
export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const
