'use client'

import { Suspense, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LAYOUT } from '@/components/common/card-styles'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { getBioToolMeta } from '@/lib/bio-tools/bio-tool-metadata'
import { getBioToolEntry, type BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import { TOOL_COMPONENTS } from './tools'
import { BioToolsHub } from './BioToolsHub'
import { BioToolHistoryPopover } from './BioToolHistoryPopover'
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
  const initialEntry = useMemo(
    () => historyId
      ? getBioToolEntry(historyId, toolId ?? undefined) ?? undefined
      : undefined,
    [historyId, toolId],
  )

  const handleSelectTool = useCallback((id: string) => {
    router.push(`/bio-tools?tool=${id}`, { scroll: false })
  }, [router])

  const handleBack = useCallback(() => {
    router.push('/bio-tools', { scroll: false })
  }, [router])

  const handleLoadHistory = useCallback((entry: BioToolHistoryEntry) => {
    router.push(`/bio-tools?tool=${entry.toolId}&history=${entry.id}`, { scroll: false })
  }, [router])

  const Icon = tool?.icon
  const isToolActive = !!(tool && Icon && ToolComponent)

  return (
    <div className="flex flex-col h-full min-h-0" style={BIO_BG_TINT}>
      {/* 도구 헤더 — 뒤로가기 + 도구명 + 히스토리 */}
      {isToolActive && (
        <header
          className={cn(LAYOUT.stickyHeader, 'border-b border-border')}
          style={BIO_HEADER_BORDER}
        >
          <div className={cn('h-12 flex items-center gap-3', BIO_LAYOUT.contentPaddingX)}>
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Bio-Tools 허브로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-1.5 rounded-md" style={BIO_ICON_BG}>
              <Icon className="w-4 h-4" style={BIO_ICON_COLOR} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold leading-tight truncate">{tool.nameEn}</h1>
              <p className="text-xs text-muted-foreground truncate">{tool.nameKo}</p>
            </div>
            {toolId && <BioToolHistoryPopover toolId={toolId} onLoadHistory={handleLoadHistory} />}
          </div>
        </header>
      )}

      {/* 본문 */}
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
            <div className={BIO_LAYOUT.toolContentMaxWidth}>
              <Suspense fallback={<ToolLoadingSkeleton />}>
                <ToolComponent key={`${toolId}-${historyId ?? ''}`} tool={tool} meta={meta} initialEntry={initialEntry} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
