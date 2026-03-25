'use client'

import { Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/components/common/card-styles'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { getBioToolMeta } from '@/lib/bio-tools/bio-tool-metadata'
import { getBioToolEntry, type BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import { TOOL_COMPONENTS } from './tools'
import { BioToolSidebar } from './BioToolSidebar'
import { BioToolsHub } from './BioToolsHub'
import { BioToolHistorySidebar } from './BioToolHistorySidebar'
import {
  BIO_BG_TINT,
  BIO_HEADER_BORDER,
  BIO_ICON_BG,
  BIO_ICON_COLOR,
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

  const tool = toolId ? getBioToolById(toolId) : null
  const meta = toolId ? getBioToolMeta(toolId) : null
  const ToolComponent = toolId ? TOOL_COMPONENTS[toolId] : null
  const initialEntry = historyId
    ? getBioToolEntry(historyId, toolId ?? undefined) ?? undefined
    : undefined

  const handleSelectTool = useCallback((id: string) => {
    router.push(`/bio-tools?tool=${id}`, { scroll: false })
  }, [router])

  const handleLoadHistory = useCallback((entry: BioToolHistoryEntry) => {
    router.push(`/bio-tools?tool=${entry.toolId}&history=${entry.id}`, { scroll: false })
  }, [router])

  const Icon = tool?.icon
  const isToolActive = !!(tool && Icon && ToolComponent)

  return (
    <div className="flex h-full min-h-0" style={BIO_BG_TINT}>
      {/* 도구 사이드바 (왼쪽) */}
      <BioToolSidebar
        selectedToolId={ToolComponent ? toolId : null}
        onSelectTool={handleSelectTool}
      />

      {/* 메인 영역 */}
      <div className="flex-1 flex min-h-0 min-w-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* 도구 헤더 */}
          {isToolActive && (
            <header
              className={cn(LAYOUT.stickyHeader, 'border-b border-border')}
              style={BIO_HEADER_BORDER}
            >
              <div className={cn('h-12 flex items-center gap-3', BIO_LAYOUT.contentPaddingX)}>
                <div className="p-1.5 rounded-md" style={BIO_ICON_BG}>
                  <Icon className="w-4 h-4" style={BIO_ICON_COLOR} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold leading-tight truncate">{tool.nameEn}</h1>
                  <p className="text-xs text-muted-foreground truncate">{tool.nameKo}</p>
                </div>
              </div>
            </header>
          )}

          {/* 워크스페이스 본문 */}
          <div className="flex-1 overflow-y-auto">
            <div className={cn(
              BIO_LAYOUT.contentPaddingX,
              BIO_LAYOUT.contentPaddingY,
            )}>
              {!toolId || !tool || !meta || !ToolComponent ? (
                <div className={LAYOUT.maxWidth}>
                  <BioToolsHub onSelectTool={handleSelectTool} />
                </div>
              ) : (
                <div className="mx-auto max-w-4xl">
                  <Suspense fallback={<ToolLoadingSkeleton />}>
                    <ToolComponent key={`${toolId}-${historyId ?? ''}`} tool={tool} meta={meta} initialEntry={initialEntry} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 히스토리 사이드바 (오른쪽) — 도구 선택 시만 표시 */}
        {isToolActive && (
          <div className="hidden w-56 shrink-0 border-l border-border/40 px-4 pt-8 lg:block">
            <div className="sticky top-24">
              <BioToolHistorySidebar onLoadHistory={handleLoadHistory} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
