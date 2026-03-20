'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BioTool } from '@/lib/bio-tools/bio-tool-registry'
import { BIO_ICON_BG, BIO_ICON_COLOR, BIO_HEADER_BORDER, BIO_BG_TINT, BIO_LAYOUT } from './bio-styles'

interface BioToolShellProps {
  tool: BioTool
  children: React.ReactNode
  className?: string
}

export function BioToolShell({ tool, children, className }: BioToolShellProps): React.ReactElement {
  const Icon = tool.icon

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)} style={BIO_BG_TINT}>
      {/* 헤더 */}
      <div
        className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm"
        style={BIO_HEADER_BORDER}
      >
        <div className={cn('max-w-5xl mx-auto py-4 flex items-center gap-4', BIO_LAYOUT.contentPaddingX)}>
          <Link
            href="/bio-tools"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Bio-Tools
          </Link>

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md" style={BIO_ICON_BG}>
              <Icon className="w-4 h-4" style={BIO_ICON_COLOR} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">{tool.nameEn}</h1>
              <p className="text-xs text-muted-foreground">{tool.nameKo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto">
        <div className={cn('max-w-5xl mx-auto', BIO_LAYOUT.contentPaddingX, BIO_LAYOUT.contentPaddingY)}>
          {children}
        </div>
      </div>
    </div>
  )
}
