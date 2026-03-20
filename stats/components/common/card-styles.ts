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
  'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
  'border border-border bg-card',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  'hover:border-primary/50 hover:shadow-md',
  'group',
)

/** 추천 카드 (왼쪽 컬러 보더 + 호버 강조) */
export const recommendationCardBase = cn(
  'flex flex-col gap-2 p-4 rounded-xl',
  'border border-border bg-card',
  'border-l-4 border-l-primary/30',
  'transition-all duration-200',
  'hover:border-l-primary hover:shadow-sm',
  'group',
)

/** 카테고리 브라우저 카드 (아이콘 + 라벨 + 메서드 수) */
export const categoryCardBase = cn(
  'flex items-center gap-3 p-4 rounded-xl',
  'border border-border bg-card',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  'hover:border-primary/50 hover:shadow-sm',
  'cursor-pointer group',
)

/** 선택 가능한 리스트 아이템 (메서드/카테고리/질문 선택용) */
export const selectableItemBase = cn(
  'p-3 rounded-lg border text-left',
  'transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
)

/** 호버 가능한 리스트 카드 (템플릿/히스토리 목록용) */
export const listItemBase = cn(
  'p-3 rounded-lg border border-border',
  'transition-colors duration-200',
  'hover:border-primary/50 hover:bg-muted/30',
  'cursor-pointer group',
)

/** 정적 콘텐츠 패널 (가정검정 결과, 상세정보 등 읽기 전용) */
export const staticPanelBase = cn(
  'p-4 rounded-xl border border-border/40 bg-background',
)

/** 마크다운 렌더링 래퍼 (ReactMarkdown 컨테이너) */
export const proseBase = cn(
  'prose prose-sm dark:prose-invert max-w-none',
)

// ===== 아이콘 컨테이너 =====

/** 둥근 아이콘 래퍼 (카드 내부용) */
export const iconContainerBase = cn(
  'p-2.5 rounded-full transition-colors duration-200',
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
