'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import type { BioToolExtendedMeta } from '@/lib/bio-tools/bio-tool-registry'
import { BIO_ACCENT_VAR } from './bio-styles'

interface BioToolIntroProps {
  meta: BioToolExtendedMeta
  collapsed?: boolean
  className?: string
}

/**
 * 도구 소개 섹션 — 설명 + 기대 결과 + 데이터 형식 가이드.
 * collapsed=true 면 description만 표시 (results 표시 중).
 */
export function BioToolIntro({
  meta,
  collapsed = false,
  className,
}: BioToolIntroProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card overflow-hidden transition-all duration-300',
        'border-l-[3px]',
        className,
      )}
      style={{ borderLeftColor: `var(${BIO_ACCENT_VAR})` }}
    >
      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {meta.descriptionLong}
        </p>

        {collapsed && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/50">
            <ChevronDown className="w-3 h-3" />
            <span>분석 전 가이드</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* 기대 결과 */}
          {meta.outputHighlights.length > 0 && (
            <div>
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

          {/* 데이터 형식 가이드 */}
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
