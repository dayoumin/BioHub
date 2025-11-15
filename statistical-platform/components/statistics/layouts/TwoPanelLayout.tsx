'use client'

import React, { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, ChevronRight, ExternalLink } from 'lucide-react'

export interface Step {
  id: number
  label: string
  completed?: boolean
}

export interface TwoPanelLayoutProps {
  // 좌측 사이드바
  currentStep: number
  steps: Step[]
  onStepChange?: (step: number) => void

  // 메인 콘텐츠
  children: ReactNode

  // 하단 데이터 미리보기 (선택)
  bottomPreview?: {
    data: Array<Record<string, unknown>>
    fileName?: string
    maxRows?: number
    onOpenNewWindow?: () => void
  }

  // 옵셔널
  className?: string
}

/**
 * 통계 플랫폼 2-Panel 레이아웃 (데이터 하단 배치)
 *
 * 구조:
 * ┌────────┬──────────────┐
 * │ Steps  │ Main Content │
 * │ (192px)│ (전체 너비)   │
 * │        ├──────────────┤
 * │        │ Data Preview │
 * │        │ (하단, 접기)  │
 * └────────┴──────────────┘
 */
export function TwoPanelLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  bottomPreview,
  className
}: TwoPanelLayoutProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true)

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
            const isCompleted = step.completed
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

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 메인 콘텐츠 */}
        <div className={cn(
          "flex-1 overflow-y-auto p-8",
          bottomPreview && isPreviewExpanded && "pb-4"
        )}>
          {children}
        </div>

        {/* 하단 데이터 미리보기 */}
        {bottomPreview && (
          <div className={cn(
            "border-t border-border bg-muted/10 transition-all duration-300",
            isPreviewExpanded ? "h-[300px]" : "h-12"
          )}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-border/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    isPreviewExpanded && "rotate-90"
                  )} />
                  업로드된 데이터
                </button>
                {bottomPreview.fileName && (
                  <Badge variant="outline" className="text-xs">
                    {bottomPreview.fileName}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {bottomPreview.data.length.toLocaleString()}행 × {Object.keys(bottomPreview.data[0] || {}).length}열
                </span>
              </div>

              <div className="flex items-center gap-2">
                {bottomPreview.onOpenNewWindow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={bottomPreview.onOpenNewWindow}
                    className="h-7 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    새 창으로 보기
                  </Button>
                )}
              </div>
            </div>

            {/* 데이터 테이블 */}
            {isPreviewExpanded && (
              <div className="h-[calc(300px-44px)] overflow-auto p-4">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold border-b border-border/50 w-12">#</th>
                      {Object.keys(bottomPreview.data[0] || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-semibold border-b border-border/50">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bottomPreview.data.slice(0, bottomPreview.maxRows || 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 text-muted-foreground border-b border-border/30">
                          {idx + 1}
                        </td>
                        {Object.values(row).map((value, colIdx) => (
                          <td key={colIdx} className="px-3 py-1.5 border-b border-border/30">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bottomPreview.data.length > (bottomPreview.maxRows || 100) && (
                  <div className="mt-2 text-xs text-muted-foreground text-center py-2">
                    + {(bottomPreview.data.length - (bottomPreview.maxRows || 100)).toLocaleString()}행 더 있음
                    (전체 데이터를 보려면 "새 창으로 보기" 클릭)
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}