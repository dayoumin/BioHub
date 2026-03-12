'use client'

/**
 * LiveDataSummary — 선택된 변수 실시간 요약 패널
 *
 * UnifiedVariableSelector 우측에 표시.
 * 현재 슬롯 배정 상태에 따라 변수별 N, 결측, 그룹별 n을 실시간 표시.
 */

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SlotConfig, AcceptedType } from './slot-configs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveDataSummaryProps {
  data: Record<string, unknown>[]
  assignments: Record<string, string[]>
  slots: SlotConfig[]
  columns: { name: string; type: AcceptedType }[]
  className?: string
}

interface VariableSummary {
  name: string
  type: AcceptedType
  role: string
  totalN: number
  validN: number
  missingN: number
}

interface GroupCount {
  label: string
  n: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeVariableSummary(
  varName: string,
  varType: AcceptedType,
  role: string,
  data: Record<string, unknown>[],
): VariableSummary {
  const totalN = data.length
  let missingN = 0

  for (const row of data) {
    const val = row[varName]
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) {
      missingN++
    }
  }

  return { name: varName, type: varType, role, totalN, validN: totalN - missingN, missingN }
}

function computeGroupCounts(
  groupVarName: string,
  data: Record<string, unknown>[],
): GroupCount[] {
  const counts = new Map<string, number>()

  for (const row of data) {
    const val = row[groupVarName]
    if (val === null || val === undefined || val === '') continue
    const label = String(val)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, n]) => ({ label, n }))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveDataSummary({
  data,
  assignments,
  slots,
  columns,
  className,
}: LiveDataSummaryProps) {
  // Build variable summaries from current assignments
  const summaries = useMemo((): VariableSummary[] => {
    const result: VariableSummary[] = []
    for (const slot of slots) {
      const vars = assignments[slot.id] ?? []
      for (const varName of vars) {
        const col = columns.find(c => c.name === varName)
        if (!col) continue
        result.push(computeVariableSummary(varName, col.type, slot.label, data))
      }
    }
    return result
  }, [assignments, slots, columns, data])

  // Find group variable for group-wise breakdown
  const groupVar = useMemo((): string | null => {
    for (const slot of slots) {
      if (slot.mappingKey === 'groupVar') {
        const vars = assignments[slot.id] ?? []
        if (vars.length === 1) return vars[0]
      }
    }
    return null
  }, [slots, assignments])

  const groupCounts = useMemo((): GroupCount[] => {
    if (!groupVar) return []
    return computeGroupCounts(groupVar, data)
  }, [groupVar, data])

  const hasAssignments = summaries.length > 0

  return (
    <Card
      className={cn('border-border/40 shadow-sm', className)}
      data-testid="live-data-summary"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          데이터 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Total N */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">전체 표본</span>
          <span className="font-mono tabular-nums font-semibold">{data.length}</span>
        </div>

        {/* No assignments yet */}
        {!hasAssignments && (
          <p className="text-xs text-muted-foreground/60 py-2 text-center">
            변수를 배치하면 요약이 표시됩니다
          </p>
        )}

        {/* Variable summaries */}
        {hasAssignments && (
          <div className="space-y-2">
            {summaries.map(s => (
              <div
                key={`${s.role}-${s.name}`}
                className="p-2 rounded-lg bg-muted/30 border border-border/20 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{s.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] px-1 py-0',
                      s.type === 'numeric'
                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
                    )}
                  >
                    {s.type === 'numeric' ? '연속' : '범주'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    유효 <span className="font-mono tabular-nums font-medium text-foreground">{s.validN}</span>
                  </span>
                  {s.missingN > 0 && (
                    <span className="text-warning">
                      결측 <span className="font-mono tabular-nums font-medium">{s.missingN}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group-wise breakdown */}
        {groupCounts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/20">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              그룹별 n
            </span>
            <div className="space-y-0.5">
              {groupCounts.map(g => (
                <div key={g.label} className="flex items-center justify-between text-xs py-0.5">
                  <span className="truncate text-muted-foreground">{g.label}</span>
                  <span className="font-mono tabular-nums font-medium">{g.n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
