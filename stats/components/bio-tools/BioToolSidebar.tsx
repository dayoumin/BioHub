'use client'

import { useCallback } from 'react'
import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import {
  BIO_TOOL_CATEGORIES,
  getBioToolsByCategory,
  type BioTool,
} from '@/lib/bio-tools/bio-tool-registry'
import { BIO_ACCENT_VAR, BIO_HEADER_BORDER, BIO_ICON_COLOR } from './bio-styles'

// ─── 사이드바 토큰 (bio accent 기반) ─────────────

const SIDEBAR_SELECTED_BG = {
  backgroundColor: `color-mix(in oklch, var(${BIO_ACCENT_VAR}) 10%, transparent)`,
} as const

const SIDEBAR_SELECTED_BORDER = {
  borderLeftColor: `var(${BIO_ACCENT_VAR})`,
} as const

// ─── CSS 클래스 기반 hover (JS event handler 대신) ─

/** color-mix는 Tailwind arbitrary value에서 사용 불가하므로 CSS 커스텀 속성 활용 */
const SIDEBAR_ITEM_HOVER_CSS = {
  '--bio-sidebar-hover': `color-mix(in oklch, var(${BIO_ACCENT_VAR}) 5%, transparent)`,
} as React.CSSProperties

// ─── 컴포넌트 ─────────────────────────────────────

interface BioToolSidebarProps {
  selectedToolId: string | null
  onSelectTool: (toolId: string) => void
}

export function BioToolSidebar({
  selectedToolId,
  onSelectTool,
}: BioToolSidebarProps): React.ReactElement {
  return (
    <aside className="flex-shrink-0 w-[200px] h-full flex flex-col border-r border-border/60 bg-card/50">
      {/* 사이드바 헤더 */}
      <div
        className="flex items-center gap-1.5 h-10 px-4 flex-shrink-0 border-b border-border/40"
        style={BIO_HEADER_BORDER}
      >
        <Leaf className="h-3.5 w-3.5 flex-shrink-0" style={BIO_ICON_COLOR} />
        <span className="text-xs font-semibold tracking-tight" style={BIO_ICON_COLOR}>
          Bio-Tools
        </span>
      </div>

      {/* 도구 목록 */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5" aria-label="Bio-Tools 도구 목록">
        {BIO_TOOL_CATEGORIES.map((cat) => {
          const tools = getBioToolsByCategory(cat.id)
          if (tools.length === 0) return null

          return (
            <div key={cat.id} className="mb-3 last:mb-0">
              <div className="px-2 pb-1 pt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {cat.label}
                </span>
              </div>

              <div className="flex flex-col gap-px">
                {tools.map((tool) => (
                  <SidebarToolItem
                    key={tool.id}
                    tool={tool}
                    isSelected={tool.id === selectedToolId}
                    onSelect={onSelectTool}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── 도구 아이템 ──────────────────────────────────

interface SidebarToolItemProps {
  tool: BioTool
  isSelected: boolean
  onSelect: (toolId: string) => void
}

function SidebarToolItem({ tool, isSelected, onSelect }: SidebarToolItemProps): React.ReactElement {
  const disabled = tool.status === 'coming-soon'
  const Icon = tool.icon

  const handleClick = useCallback(() => {
    if (!disabled) onSelect(tool.id)
  }, [disabled, onSelect, tool.id])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-selected={isSelected}
      className={cn(
        'relative flex items-center gap-2 w-full h-8 px-2 rounded-md text-left',
        'border-l-2 border-transparent',
        'transition-all duration-150',
        focusRing,
        disabled && 'opacity-35 cursor-not-allowed',
        !disabled && !isSelected && 'text-foreground/70 hover:bg-[var(--bio-sidebar-hover)] hover:text-foreground',
        isSelected && 'font-medium',
      )}
      style={{
        ...(isSelected ? { ...SIDEBAR_SELECTED_BG, ...SIDEBAR_SELECTED_BORDER, color: `var(${BIO_ACCENT_VAR})` } : {}),
        ...(!disabled ? SIDEBAR_ITEM_HOVER_CSS : {}),
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-sm truncate">{tool.nameEn}</span>
      {disabled && (
        <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground/50 font-medium flex-shrink-0">
          예정
        </span>
      )}
    </button>
  )
}
