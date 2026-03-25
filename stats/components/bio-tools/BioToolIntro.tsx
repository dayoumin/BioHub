'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { BioToolExtendedMeta } from '@/lib/bio-tools/bio-tool-registry'
import { BIO_ACCENT_VAR } from './bio-styles'

interface BioToolIntroProps {
  meta: BioToolExtendedMeta
  collapsed?: boolean
  className?: string
}

/**
 * 도구 소개 섹션 — 접이식 1줄 요약 + 클릭 시 상세 가이드 펼침.
 * collapsed=true (결과 표시 중)이면 항상 접힌 상태.
 */
export function BioToolIntro({
  meta,
  collapsed = false,
  className,
}: BioToolIntroProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const showDetails = expanded && !collapsed

  return (
    <div
      className={cn(
        'rounded-lg border bg-card overflow-hidden',
        'border-l-[3px]',
        className,
      )}
      style={{ borderLeftColor: `var(${BIO_ACCENT_VAR})` }}
    >
      {/* 1줄 요약 — 항상 표시, 클릭으로 토글 */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={showDetails}
        className="w-full flex items-start gap-2 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground/40 transition-transform duration-200',
            showDetails && 'rotate-90',
          )}
        />
        <p className="text-sm text-muted-foreground leading-relaxed">
          {meta.descriptionLong}
        </p>
      </button>

      {/* 상세 가이드 — 펼침 시만 표시 */}
      {showDetails && (
        <div className="px-4 pb-3 pt-0 space-y-3 border-t border-border/30">
          {meta.outputHighlights.length > 0 && (
            <div className="pt-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
                이런 결과를 얻을 수 있어요
              </h4>
              <ul className="space-y-1">
                {meta.outputHighlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(${BIO_ACCENT_VAR})` }}
                    />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {meta.columns.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">
                필요한 데이터 형식
              </h4>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        컬럼
                      </th>
                      <th className="text-center px-2 py-1.5 text-xs font-medium text-muted-foreground w-12">
                        필수
                      </th>
                      <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        예시
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {meta.columns.map((col) => (
                      <tr key={col.label} className="border-b last:border-b-0">
                        <td className="px-3 py-1.5 text-sm font-medium">{col.label}</td>
                        <td className="text-center px-2 py-1.5">
                          <span
                            className={cn(
                              'inline-block w-2 h-2 rounded-full',
                              col.required ? 'bg-primary' : 'bg-muted-foreground/30',
                            )}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono">
                          {col.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
