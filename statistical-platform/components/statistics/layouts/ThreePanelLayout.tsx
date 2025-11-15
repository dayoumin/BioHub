'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronRight } from 'lucide-react'

export interface Step {
  id: number
  label: string
  completed?: boolean
}

export interface RightPanelConfig {
  mode: 'preview' | 'results'
  previewData?: Array<Record<string, unknown>>
  results?: unknown
}

export interface ThreePanelLayoutProps {
  // 좌측 사이드바
  currentStep: number
  steps: Step[]
  onStepChange?: (step: number) => void

  // 메인 콘텐츠
  children: ReactNode

  // 우측 패널
  rightPanel: RightPanelConfig
  renderPreview?: (data: Array<Record<string, unknown>>) => ReactNode
  renderResults?: (results: unknown) => ReactNode

  // 옵셔널
  className?: string
  enableResize?: boolean
}

/**
 * 통계 플랫폼 3-Panel 레이아웃
 *
 * 구조:
 * ┌────────┬──────────────┬───────────────┐
 * │ Steps  │ Main Content │ Preview/Results│
 * │ (192px)│ (40-60%)     │ (40%)         │
 * └────────┴──────────────┴───────────────┘
 */
export function ThreePanelLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  rightPanel,
  renderPreview,
  renderResults,
  className,
  enableResize = false
}: ThreePanelLayoutProps) {
  return (
    <div className={cn(
      "flex h-screen overflow-hidden bg-background",
      className
    )}>
      {/* 좌측 사이드바 - Steps */}
      <aside className="w-48 border-r border-border bg-muted/20 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-muted-foreground">분석 단계</h2>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {steps.map((step) => {
            const isActive = step.id === currentStep
            const isCompleted = step.completed || step.id < currentStep
            const isClickable = onStepChange && (step.id <= currentStep || isCompleted)

            return (
              <button
                key={step.id}
                onClick={() => isClickable && onStepChange(step.id)}
                disabled={!isClickable}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                  "hover:bg-muted/50",
                  isActive && "bg-primary/10 border border-primary/20 shadow-sm",
                  !isClickable && "opacity-50 cursor-not-allowed",
                  isClickable && !isActive && "cursor-pointer"
                )}
              >
                {/* 아이콘 */}
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && !isActive && "bg-green-500 text-white",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted && !isActive ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* 라벨 */}
                <span className={cn(
                  "flex-1 text-sm font-medium",
                  isActive && "text-foreground",
                  !isActive && "text-muted-foreground"
                )}>
                  {step.label}
                </span>

                {/* 화살표 (현재 단계) */}
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-primary" />
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-6 min-w-0">
        {children}
      </main>

      {/* 우측 패널 - Preview or Results */}
      <aside className={cn(
        "w-[40%] min-w-[400px] max-w-[600px] border-l border-border overflow-y-auto",
        "bg-muted/10"
      )}>
        <div className="p-6">
          {rightPanel.mode === 'preview' && rightPanel.previewData && (
            <>
              {renderPreview ? (
                renderPreview(rightPanel.previewData)
              ) : (
                <DefaultPreview data={rightPanel.previewData} />
              )}
            </>
          )}

          {rightPanel.mode === 'results' && rightPanel.results && (
            <>
              {renderResults ? (
                renderResults(rightPanel.results)
              ) : (
                <DefaultResults results={rightPanel.results} />
              )}
            </>
          )}

          {/* 데이터 없을 때 */}
          {rightPanel.mode === 'preview' && !rightPanel.previewData && (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                데이터를 업로드하면 여기에 미리보기가 표시됩니다
              </p>
            </Card>
          )}

          {rightPanel.mode === 'results' && !rightPanel.results && (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm text-muted-foreground">
                분석을 실행하면 여기에 결과가 표시됩니다
              </p>
            </Card>
          )}
        </div>
      </aside>
    </div>
  )
}

/**
 * 기본 데이터 미리보기 (renderPreview 미제공 시)
 */
function DefaultPreview({ data }: { data: Array<Record<string, unknown>> }) {
  const columns = data.length > 0 ? Object.keys(data[0]) : []
  const previewRows = data.slice(0, 5)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">데이터 미리보기</h3>
        <Badge variant="secondary">{data.length}개 행</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 font-mono text-xs">
                    {String(row[col] ?? 'null')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 5 && (
        <p className="text-xs text-muted-foreground mt-3">
          처음 5개 행만 표시됩니다. 전체 {data.length}개 행이 분석에 사용됩니다.
        </p>
      )}
    </Card>
  )
}

/**
 * 기본 결과 표시 (renderResults 미제공 시)
 */
function DefaultResults({ results }: { results: unknown }) {
  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">분석 결과</h3>
      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </Card>
  )
}
