/**
 * 공통 카드/아이콘 스타일 토큰
 *
 * 앱 전체 일관성을 위한 공유 스타일.
 * 사용처: TrackSuggestions (홈), DataUploadPanel (Graph Studio), 향후 추가 페이지
 */

import { cn } from '@/lib/utils'

// ===== Focus ring 표준 =====

/** 표준 focus ring — 모든 인터랙티브 요소에 사용 */
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

// ===== 카드 스타일 =====

/** 클릭 가능한 액션 카드 (아이콘 + 라벨 그리드용) */
export const actionCardBase = cn(
  'relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl',
  'border border-transparent bg-muted/20',
  'transition-all duration-300',
  focusRing,
  'hover:bg-card hover:border-border hover:shadow-sm hover:-translate-y-0.5',
  'cursor-pointer group',
)

/** 추천 카드 (왼쪽 컬러 보더 + 호버 강조) */
export const recommendationCardBase = cn(
  'flex flex-col gap-2 p-4 rounded-2xl',
  'border border-border/60 bg-card',
  'border-l-4 border-l-primary/40',
  'transition-all duration-300',
  'hover:border-l-primary hover:border-border hover:shadow-sm hover:-translate-y-0.5',
  'group',
)

/** 카테고리 브라우저 카드 (아이콘 + 라벨 + 메서드 수) */
export const categoryCardBase = cn(
  'flex items-center gap-3 p-4 rounded-2xl',
  'border border-transparent bg-muted/20',
  'transition-all duration-300',
  focusRing,
  'hover:bg-card hover:border-border hover:shadow-sm hover:-translate-y-0.5',
  'cursor-pointer group',
)

/** 선택 가능한 리스트 아이템 (메서드/카테고리/질문 선택용) */
export const selectableItemBase = cn(
  'p-3 rounded-lg border text-left',
  'transition-all duration-200',
  focusRing,
)

/** 호버 가능한 리스트 카드 (템플릿/히스토리 목록용) */
export const listItemBase = cn(
  'p-3 rounded-2xl border border-border/60 bg-card',
  'transition-all duration-200',
  'hover:border-border hover:shadow-sm active:scale-[0.98]',
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

// ===== 전역 레이아웃 토큰 =====

/** 모든 섹션(Analysis, Graph Studio, Bio-Tools, Genetics)에서 공유하는 레이아웃 토큰 */
export const LAYOUT = {
  /** 콘텐츠 최대 너비 + 센터링 */
  maxWidth: 'max-w-7xl mx-auto',
  /** sticky 헤더 베이스 (border는 각 섹션에서 cn()으로 추가) */
  stickyHeader: 'sticky top-0 z-50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80',
} as const

// ===== 글로벌 스페이싱 =====

/** 앱 전체 스페이싱 계층. 영역별 오버라이드보다 이 토큰을 우선 사용. */
export const SPACING = {
  /** 섹션 간 (24px) — 카드 그룹, 결과 블록 사이 */
  sectionGap: 'space-y-6',
  /** 하위 섹션 간 (16px) — 관련 요소 그룹 */
  subsectionGap: 'space-y-4',
  /** 요소 간 (8px) — 라벨+입력, 아이콘+텍스트 그룹 내부 */
  elementGap: 'space-y-2',
  /** 카드 내부 패딩 (16px) */
  cardPadding: 'p-4',
  /** 밀도 높은 영역 패딩 (12px) — 패널 내부, 리스트 아이템 */
  compactPadding: 'p-3',
  /** 페이지 좌우 여백 (24px) */
  pageX: 'px-6',
  /** 페이지 상하 여백 (32px) */
  pageY: 'py-8',
} as const

// ===== 글로벌 타이포그래피 =====

/** 앱 전체 타이포그래피 계층. 커스텀 text-[Npx] 대신 이 토큰 사용. */
export const TYPOGRAPHY = {
  /** 페이지 제목 (h1) */
  pageTitle: 'text-2xl font-bold tracking-tight',
  /** 섹션 제목 (h2/h3) */
  sectionTitle: 'text-lg font-semibold',
  /** 본문 */
  body: 'text-sm',
  /** 보조 텍스트 (메타데이터, 타임스탬프) */
  caption: 'text-xs text-muted-foreground',
} as const

// ===== 글로벌 아이콘 크기 =====

/** 아이콘 크기 3단계. 영역별 혼재(w-3~w-6) 대신 이 토큰 사용. */
export const ICON_SIZE = {
  /** 주요 아이콘 (스텝 헤더, 주요 액션) */
  lg: 'w-5 h-5',
  /** 보조 아이콘 (섹션 헤더, 버튼 내부) */
  md: 'w-4 h-4',
  /** 인라인 아이콘 (뱃지, 접기 토글) */
  sm: 'w-3.5 h-3.5',
} as const

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
