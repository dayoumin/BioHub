'use client'

import { Suspense, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/components/common/card-styles'
import { getBioToolWithMeta } from '@/lib/bio-tools/bio-tool-metadata'
import { getBioToolEntry, type BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import { BIO_TOOLS } from '@/lib/bio-tools/bio-tool-registry'
import { TOOL_COMPONENTS } from './tools'
import { BioToolsHub } from './BioToolsHub'
import { BioToolSidebar } from './BioToolSidebar'
import {
  BIO_BG_TINT,
  BIO_SUBNAV_SURFACE,
  BIO_ICON_COLOR,
  BIO_ACCENT_TEXT,
  BIO_LAYOUT,
} from './bio-styles'

function ToolLoadingSkeleton(): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin" style={BIO_ICON_COLOR} />
    </div>
  )
}

export function BioToolWorkspace(): React.ReactElement {
  const searchParams = useSearchParams()
  const router = useRouter()
  const toolId = searchParams.get('tool')

  const historyId = searchParams.get('history')

  const found = toolId ? getBioToolWithMeta(toolId) : undefined
  const tool = found?.tool ?? null
  const meta = found?.meta ?? null
  const ToolComponent = toolId ? TOOL_COMPONENTS[toolId] : null
  const initialEntry = useMemo(
    () => historyId
      ? getBioToolEntry(historyId, toolId ?? undefined) ?? undefined
      : undefined,
    [historyId, toolId],
  )

  const handleSelectTool = useCallback((id: string) => {
    router.push(`/bio-tools?tool=${id}`, { scroll: false })
  }, [router])

  const handleLoadHistory = useCallback((entry: BioToolHistoryEntry) => {
    router.push(`/bio-tools?tool=${entry.toolId}&history=${entry.id}`, { scroll: false })
  }, [router])

  const Icon = tool?.icon
  const isToolActive = !!(tool && Icon && ToolComponent)

  return (
    <div className="flex flex-col h-full min-h-0" style={BIO_BG_TINT}>
      {/* 도구 헤더 — 뒤로가기 + 도구 칩 리스트 */}
      {isToolActive && (
        <div className={cn(BIO_LAYOUT.contentPaddingX, 'mt-6 shrink-0')}>
          <div className="flex flex-col gap-4 rounded-[1.5rem] bg-surface-container-low/70 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center gap-2">
              <Link
                href="/bio-tools"
                scroll={false}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-container-lowest hover:text-foreground"
                title="Bio-Tools 허브로 이동"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </Link>
              <div className="flex flex-1 overflow-x-auto whitespace-nowrap gap-1 pb-1 -mb-1 scrollbar-hide">
                {BIO_TOOLS.map(t => {
                  const isActive = t.id === toolId
                  const ToolIcon = t.icon
                  return (
                    <Link
                      key={t.id}
                      href={`/bio-tools?tool=${t.id}`}
                      scroll={false}
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:bg-surface-container-lowest hover:text-foreground'
                      }`}
                      style={isActive ? BIO_SUBNAV_SURFACE : undefined}
                    >
                      <ToolIcon
                        className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground/70'}`}
                        style={isActive ? BIO_ACCENT_TEXT : undefined}
                      />
                      {t.nameKo}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 본문 + 히스토리 사이드바 */}
      <div className="flex flex-1 gap-6 overflow-y-auto">
        <div className={cn(
          'min-w-0 flex-1',
          BIO_LAYOUT.contentPaddingX,
          BIO_LAYOUT.contentPaddingY,
        )}>
          {!toolId || !tool || !meta || !ToolComponent ? (
            <div className={LAYOUT.maxWidth}>
              <BioToolsHub onSelectTool={handleSelectTool} />
            </div>
          ) : (
            <div className={BIO_LAYOUT.toolContentMaxWidth}>
              <Suspense fallback={<ToolLoadingSkeleton />}>
                <ToolComponent key={`${toolId}-${historyId ?? ''}`} tool={tool} meta={meta} initialEntry={initialEntry} />
              </Suspense>
            </div>
          )}
        </div>
        {/* 도구 활성 시 우측 히스토리 사이드바 */}
        {isToolActive && (
          <div className={BIO_LAYOUT.contentPaddingY}>
            <BioToolSidebar toolId={toolId} onLoadHistory={handleLoadHistory} />
          </div>
        )}
      </div>
    </div>
  )
}
