/**
 * 사이드바 접기/펴기 버튼 공통 컴포넌트
 *
 * 사용 예시:
 * ```tsx
 * <CollapsibleButton
 *   isCollapsed={isSidebarCollapsed}
 *   onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
 *   direction="left"
 *   variant="absolute"
 *   position={{ top: '1.5rem', right: '-0.75rem' }}
 *   labels={{ collapsed: '사이드바 펼치기', expanded: '사이드바 접기' }}
 * />
 * ```
 */

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface CollapsibleButtonProps {
  /** 접힌 상태 여부 */
  isCollapsed: boolean
  /** 클릭 핸들러 */
  onClick: () => void
  /** 화살표 방향 (좌측 사이드바: left, 우측 패널: right) */
  direction: 'left' | 'right'
  /** 버튼 스타일 변형 */
  variant?: 'absolute' | 'relative' | 'shadcn'
  /** 절대 위치 (variant='absolute'일 때만) */
  position?: {
    top?: string
    left?: string
    right?: string
    bottom?: string
  }
  /** 접근성 레이블 */
  labels?: {
    collapsed: string
    expanded: string
  }
  /** 추가 클래스명 */
  className?: string
}

export function CollapsibleButton({
  isCollapsed,
  onClick,
  direction,
  variant = 'absolute',
  position,
  labels = {
    collapsed: '펼치기',
    expanded: '접기'
  },
  className
}: CollapsibleButtonProps) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  const ariaLabel = isCollapsed ? labels.collapsed : labels.expanded

  // variant별 기본 스타일
  const baseStyles = {
    absolute: cn(
      "absolute z-10",
      "bg-background border border-border rounded-full p-1 shadow-md",
      "hover:bg-muted transition-colors",
      "flex items-center justify-center"
    ),
    relative: cn(
      "bg-background border border-border rounded-full p-1 shadow-md",
      "hover:bg-muted transition-colors",
      "flex items-center justify-center"
    ),
    shadcn: "h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
  }

  // 절대 위치 스타일 생성
  const positionStyle = variant === 'absolute' && position
    ? {
        top: position.top,
        left: position.left,
        right: position.right,
        bottom: position.bottom
      }
    : undefined

  // shadcn Button 사용 (chatbot/page.tsx 패턴)
  if (variant === 'shadcn') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(baseStyles.shadcn, className)}
        onClick={onClick}
        title={ariaLabel}
        aria-label={ariaLabel}
      >
        <Icon className={cn(
          "h-4 w-4 transition-transform",
          isCollapsed && "rotate-180"
        )} />
      </Button>
    )
  }

  // 기본 button 사용 (chat-panel, TwoPanelLayout 패턴)
  return (
    <button
      onClick={onClick}
      className={cn(baseStyles[variant], className)}
      style={positionStyle}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon className={cn(
        "h-4 w-4 transition-transform",
        isCollapsed && "rotate-180"
      )} />
    </button>
  )
}
