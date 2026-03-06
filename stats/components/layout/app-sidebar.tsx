'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  BarChart3,
  AreaChart,
  Dna,
  BookOpen,
  Microscope,
  Settings,
  Menu,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUI } from '@/contexts/ui-context'

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
  { href: '/smart-flow', label: '통계 분석', icon: BarChart3, prefix: '/smart-flow' },
  { href: '/graph-studio', label: 'Graph Studio', icon: AreaChart, prefix: '/graph-studio' },
  { href: '/bio-tools', label: 'Bio-Tools', icon: Dna, disabled: true, badge: '예정' },
  { href: '/papers', label: '논문 지원', icon: BookOpen, disabled: true, badge: '예정' },
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
  const [expanded, setExpanded] = useState(false)
  const { openSettings } = useUI()

  // Static export: no SSR cookies, use localStorage after hydration
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'expanded') setExpanded(true)
    } catch {}
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
    <aside
      className={cn(
        'flex-shrink-0 sticky top-0 h-screen flex flex-col z-40 overflow-hidden',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        'transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        expanded ? 'w-[220px]' : 'w-11',
      )}
    >
      {/* 헤더: 토글 버튼 + 앱 타이틀 */}
      <div className="flex items-center h-14 border-b border-sidebar-border px-2 flex-shrink-0">
        <button
          onClick={toggle}
          aria-label={expanded ? '사이드바 접기' : '사이드바 펼치기'}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground flex-shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span
          className={cn(
            'ml-3 text-sm font-bold text-sidebar-foreground whitespace-nowrap',
            'transition-[opacity,max-width] duration-200 overflow-hidden',
            expanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0',
          )}
        >
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
            'transition-colors duration-150 border-l-2',
            active && !item.disabled
              ? 'bg-sidebar-accent text-sidebar-accent-foreground border-primary'
              : 'border-transparent',
            !item.disabled && !active
              ? 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/70'
              : '',
            item.disabled ? 'text-sidebar-foreground/25 cursor-not-allowed' : '',
          )

          const inner = (
            <>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span
                className={cn(
                  'text-sm whitespace-nowrap overflow-hidden',
                  'transition-[opacity,max-width] duration-200',
                  expanded ? 'opacity-100 max-w-[130px]' : 'opacity-0 max-w-0 w-0',
                )}
              >
                {item.label}
              </span>
              {expanded && item.badge && (
                <span className="ml-auto text-[10px] opacity-40 flex-shrink-0">{item.badge}</span>
              )}
            </>
          )

          const tooltipLabel = item.badge ? `${item.label} (${item.badge})` : item.label

          if (item.disabled) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <div className={itemClass}>{inner}</div>
                </TooltipTrigger>
                {!expanded && <TooltipContent side="right">{tooltipLabel}</TooltipContent>}
              </Tooltip>
            )
          }

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href} className={itemClass}>
                  {inner}
                </Link>
              </TooltipTrigger>
              {!expanded && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          )
        })}
      </nav>

      {/* My Menu (예약 공간) */}
      <div className="flex-shrink-0 px-1.5 py-1 border-t border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-2 h-9 px-2 rounded-md w-full',
                'text-sidebar-foreground/20 cursor-default border-l-2 border-transparent',
              )}
            >
              <Star className="w-4 h-4 flex-shrink-0" />
              <span
                className={cn(
                  'text-sm whitespace-nowrap overflow-hidden',
                  'transition-[opacity,max-width] duration-200',
                  expanded ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 w-0',
                )}
              >
                My Menu
              </span>
              {expanded && (
                <span className="ml-auto text-[10px] opacity-40 flex-shrink-0">예정</span>
              )}
            </div>
          </TooltipTrigger>
          {!expanded && <TooltipContent side="right">My Menu (준비 중)</TooltipContent>}
        </Tooltip>
      </div>

      {/* 설정 (하단 고정) */}
      <div className="flex-shrink-0 px-1.5 pb-3 pt-1 border-t border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={openSettings}
              className={cn(
                'flex items-center gap-2 h-9 px-2 rounded-md w-full border-l-2 border-transparent',
                'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                'transition-colors',
              )}
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span
                className={cn(
                  'text-sm whitespace-nowrap overflow-hidden',
                  'transition-[opacity,max-width] duration-200',
                  expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0 w-0',
                )}
              >
                설정
              </span>
            </button>
          </TooltipTrigger>
          {!expanded && <TooltipContent side="right">설정</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  )
}
