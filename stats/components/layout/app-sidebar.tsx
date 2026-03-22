'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  AreaChart,
  Dna,
  FlaskConical,
  BookOpen,
  Microscope,
  Settings,
  PanelLeft,
  Star,
  FolderKanban,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUI } from '@/contexts/ui-context'
import { toast } from 'sonner'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import {
  useResearchProjectStore,
  selectActiveProject,
} from '@/lib/stores/research-project-store'

/** 사이드바 접힐 때 텍스트가 즉시 사라지도록 (width 애니메이션 도중 잔상 방지) */
const textClass = (expanded: boolean) =>
  expanded ? 'opacity-100' : 'opacity-0 invisible'

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
  { href: '/projects', label: '연구 프로젝트', icon: FolderKanban, prefix: '/projects' },
  { href: '/graph-studio', label: 'Graph Studio', icon: AreaChart, prefix: '/graph-studio' },
  { href: '/bio-tools', label: 'Bio-Tools', icon: Dna, prefix: '/bio-tools' },
  { href: '/genetics', label: '유전적 분석', icon: FlaskConical, prefix: '/genetics' },
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
  const [expanded, setExpanded] = useState(true)
  const { openSettings } = useUI()
  const currentStep = useAnalysisStore(s => s.currentStep)
  const selectedMethod = useAnalysisStore(s => s.selectedMethod)
  const results = useAnalysisStore(s => s.results)

  const setShowHub = useModeStore(s => s.setShowHub)

  const activeProject = useResearchProjectStore(selectActiveProject)
  const projects = useResearchProjectStore(s => s.projects)
  const setActiveProject = useResearchProjectStore(s => s.setActiveProject)
  const clearActiveProject = useResearchProjectStore(s => s.clearActiveProject)
  const refreshProjects = useResearchProjectStore(s => s.refreshProjects)

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const availableProjects = projects.filter(p => p.status === 'active')

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

  // Static export: no SSR cookies, use localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'collapsed') setExpanded(false)
      else if (saved === 'expanded') setExpanded(true)
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

      {/* 프로젝트 전환기 */}
      <div className="flex-shrink-0 px-1.5 pt-2 pb-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1.5 w-full h-8 px-2 rounded-md text-xs transition-colors',
                    'border border-sidebar-border/60 hover:bg-sidebar-accent/60',
                    activeProject
                      ? 'text-sidebar-foreground'
                      : 'text-sidebar-foreground/50',
                  )}
                >
                  <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className={cn('flex-1 truncate text-left', textClass(expanded))}>
                    {activeProject?.name ?? '프로젝트 없음'}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 flex-shrink-0', textClass(expanded))} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {!expanded && (
              <TooltipContent side="right">
                {activeProject ? `프로젝트: ${activeProject.name}` : '프로젝트 없음'}
              </TooltipContent>
            )}
          </Tooltip>
          <DropdownMenuContent align="start" className="w-52">
            {availableProjects.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                프로젝트가 없습니다
              </DropdownMenuItem>
            ) : (
              availableProjects.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p.id)
                    toast.success(`'${p.name}' 활성화`)
                  }}
                  className={cn(
                    'text-xs',
                    activeProject?.id === p.id && 'bg-accent',
                  )}
                >
                  {p.presentation?.emoji && (
                    <span className="mr-1.5">{p.presentation.emoji}</span>
                  )}
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => clearActiveProject()}
              disabled={!activeProject}
              className="text-xs text-muted-foreground"
            >
              프로젝트 해제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              {item.badge && (
                <span className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-medium flex-shrink-0", textClass(expanded))}>
                  {item.badge}
                </span>
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
                <Link href={item.href} className={itemClass} onClick={(e) => handleNavClick(e, item)}>
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
              <span className={cn("text-sm whitespace-nowrap overflow-hidden truncate", textClass(expanded))}>
                My Menu
              </span>
              <span className={cn("ml-auto text-[10px] flex-shrink-0", expanded ? 'opacity-40' : 'opacity-0 invisible')}>예정</span>
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
        </Tooltip>
      </div>
    </aside>
  )
}
