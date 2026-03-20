'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  AreaChart,
  Dna,
  BookOpen,
  Microscope,
  Settings,
  PanelLeft,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TooltipProvider, TooltipRoot, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUI } from '@/contexts/ui-context'
import { toast } from 'sonner'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'

/** 사이드바 접힐 때 텍스트를 완전히 숨김 (hidden = display:none → DOM에서 공간 제거) */
const textClass = (expanded: boolean) =>
  expanded ? 'opacity-100' : 'hidden'

/** 뷰포트 폭이 이 값 이하이면 사이드바 자동 접힘 */
const AUTO_COLLAPSE_WIDTH = 1100

const STORAGE_KEY = 'biohub-sidebar'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  prefix?: string
  disabled?: boolean
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '홈', icon: Home },
  { href: '/graph-studio', label: 'Graph Studio', icon: AreaChart, prefix: '/graph-studio' },
  { href: '/bio-tools', label: 'Bio-Tools', icon: Dna, disabled: true, badge: '예정' },
  { href: '/papers', label: '결과 정리', icon: BookOpen, prefix: '/papers', badge: 'NEW' },
  {
    href: '/species-validation',
    label: '학명 유효성 검증',
    icon: Microscope,
    disabled: true,
    badge: '준비 중',
  },
]

const APP_TITLE = process.env.NEXT_PUBLIC_APP_TITLE ?? 'BioHub'

export function AppSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(true)
  const { openSettings } = useUI()
  const currentStep = useAnalysisStore(s => s.currentStep)
  const selectedMethod = useAnalysisStore(s => s.selectedMethod)
  const results = useAnalysisStore(s => s.results)

  const setShowHub = useModeStore(s => s.setShowHub)

  /** 네비게이션 클릭 핸들러:
   *  - 홈 클릭 시 showHub=true로 리셋 (ChatCentricHub 표시)
   *  - 분석 진행 중 다른 페이지 이동 시 토스트 */
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
      // 홈 클릭 → 허브 화면으로 복귀
      if (item.href === '/') {
        setShowHub(true)
      }

      // 분석 진행 중 이탈 경고
      const isHome = pathname === '/'
      const isLeavingHome = isHome && item.href !== '/'
      if (isLeavingHome && currentStep >= 2 && selectedMethod && !results) {
        toast.info('분석이 자동 저장되었습니다', {
          description: '홈으로 돌아가면 이어서 진행할 수 있습니다.',
          duration: 3000,
        })
      }
    },
    [pathname, currentStep, selectedMethod, results, setShowHub],
  )

  // 초기화: 좁은 뷰포트 → 강제 접힘, 넓은 뷰포트 → localStorage 복원
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${AUTO_COLLAPSE_WIDTH}px)`)

    if (mql.matches) {
      setExpanded(false)
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'collapsed') setExpanded(false)
        else if (saved === 'expanded') setExpanded(true)
      } catch {}
    }

    const handleChange = (e: MediaQueryListEvent): void => {
      if (e.matches) {
        setExpanded(false)
      }
    }

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const toggle = useCallback(() => {
    setExpanded(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'expanded' : 'collapsed')
      } catch {}
      return next
    })
  }, [])

  const isActive = useCallback(
    (item: NavItem) => {
      if (item.prefix) return pathname?.startsWith(item.prefix) ?? false
      return pathname === item.href
    },
    [pathname],
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex-shrink-0 sticky top-0 h-screen flex flex-col z-40 overflow-hidden',
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
          'transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          expanded ? 'w-[220px]' : 'w-11',
        )}
      >
        {/* 헤더: 토글 버튼 + 앱 타이틀 */}
        <div className="flex items-center h-12 border-b border-sidebar-border/50 px-2 flex-shrink-0">
          <button
            onClick={toggle}
            aria-label={expanded ? '사이드바 접기' : '사이드바 펼치기'}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className={cn("ml-3 text-sm font-semibold tracking-tight text-sidebar-foreground whitespace-nowrap", textClass(expanded))}>
            {APP_TITLE}
          </span>
        </div>

        {/* 메인 네비게이션 */}
        <nav className="flex-1 flex flex-col gap-0.5 py-2 px-1.5 overflow-hidden">
          {NAV_ITEMS.map(item => {
            const active = isActive(item)
            const Icon = item.icon

            const itemClass = cn(
              'relative flex items-center gap-2 h-9 px-2 rounded-md w-full',
              'transition-colors duration-150',
              active && !item.disabled
                ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                : 'border-l-2 border-transparent',
              !item.disabled && !active
                ? 'hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground'
                : '',
              item.disabled ? 'text-sidebar-foreground/30 cursor-not-allowed' : '',
            )

            const inner = (
              <>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className={cn("text-sm whitespace-nowrap overflow-hidden truncate", textClass(expanded))}>
                  {item.label}
                </span>
                {item.badge && expanded && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-medium flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </>
            )

            const tooltipLabel = item.badge ? `${item.label} (${item.badge})` : item.label

            if (item.disabled) {
              return (
                <TooltipRoot key={item.href}>
                  <TooltipTrigger asChild>
                    <div className={itemClass}>{inner}</div>
                  </TooltipTrigger>
                  {!expanded && <TooltipContent side="right">{tooltipLabel}</TooltipContent>}
                </TooltipRoot>
              )
            }

            return (
              <TooltipRoot key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className={itemClass} onClick={(e) => handleNavClick(e, item)}>
                    {inner}
                  </Link>
                </TooltipTrigger>
                {!expanded && <TooltipContent side="right">{tooltipLabel}</TooltipContent>}
              </TooltipRoot>
            )
          })}
        </nav>

        {/* My Menu (예약 공간) */}
        <div className="flex-shrink-0 px-1.5 py-1 border-t border-sidebar-border">
          <TooltipRoot>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-2 h-9 px-2 rounded-md w-full',
                  'text-sidebar-foreground/20 cursor-default border-l-2 border-transparent',
                )}
              >
                <Star className="w-4 h-4 flex-shrink-0" />
                <span className={cn("text-sm whitespace-nowrap overflow-hidden truncate", textClass(expanded))}>
                  My Menu
                </span>
                {expanded && (
                  <span className="ml-auto text-[10px] flex-shrink-0 opacity-40">예정</span>
                )}
              </div>
            </TooltipTrigger>
            {!expanded && <TooltipContent side="right">My Menu (준비 중)</TooltipContent>}
          </TooltipRoot>
        </div>

        {/* 설정 (하단 고정) */}
        <div className="flex-shrink-0 px-1.5 pb-3 pt-1 border-t border-sidebar-border">
          <TooltipRoot>
            <TooltipTrigger asChild>
              <button
                onClick={openSettings}
                className={cn(
                  'flex items-center gap-2 h-9 px-2 rounded-md w-full border-l-2 border-transparent',
                  'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  'transition-colors',
                )}
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className={cn("text-sm whitespace-nowrap overflow-hidden truncate", textClass(expanded))}>
                  설정
                </span>
              </button>
            </TooltipTrigger>
            {!expanded && <TooltipContent side="right">설정</TooltipContent>}
          </TooltipRoot>
        </div>
      </aside>
    </TooltipProvider>
  )
}
