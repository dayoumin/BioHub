'use client'

import React, { ReactNode, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, ChevronRight, ExternalLink, ChevronLeft } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AnalyzingOverlay } from '@/components/statistics/common/AnalyzingOverlay'

export interface Step {
  id: number
  label: string
  completed?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface TwoPanelLayoutProps {
  // 좌측 사이드바
  currentStep: number
  steps: Step[]
  onStepChange?: (step: number) => void

  // 분석 제목 (좌측 사이드바 상단)
  analysisTitle?: string
  analysisSubtitle?: string
  analysisIcon?: ReactNode

  // Breadcrumb (상단)
  breadcrumbs?: BreadcrumbItem[]

  // 메인 콘텐츠
  children: ReactNode

  // 하단 데이터 미리보기 (선택)
  bottomPreview?: {
    data: Array<Record<string, unknown>>
    fileName?: string
    maxRows?: number
    onOpenNewWindow?: () => void
  }

  // 분석 중 오버레이
  isAnalyzing?: boolean
  analyzingMessage?: string

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
  analysisTitle,
  analysisSubtitle,
  analysisIcon,
  breadcrumbs,
  children,
  bottomPreview,
  isAnalyzing = false,
  analyzingMessage,
  className
}: TwoPanelLayoutProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className={cn(
      "flex h-full overflow-hidden bg-background relative",
      className
    )}>
      {/* 좌측 사이드바 - Steps (고정, 스크롤 안됨) */}
      <aside className={cn(
        "bg-muted/30 flex-shrink-0 flex flex-col shadow-sm transition-all duration-300 relative",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}>
        {/* 접기/펼치기 버튼 */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 z-10 bg-background border border-border rounded-full p-1 shadow-md hover:bg-muted transition-colors"
          aria-label={isSidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isSidebarCollapsed && "rotate-180"
          )} />
        </button>

        {/* 분석 제목 */}
        {analysisTitle && !isSidebarCollapsed && (
          <div className="p-4 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              {analysisIcon}
              <h2 className="text-lg font-bold text-foreground">{analysisTitle}</h2>
            </div>
            {analysisSubtitle && (
              <p className="text-sm text-muted-foreground font-medium">{analysisSubtitle}</p>
            )}
          </div>
        )}

        {/* 접혔을 때: 아이콘만 표시 */}
        {isSidebarCollapsed && analysisIcon && (
          <div className="p-4 flex justify-center">
            {analysisIcon}
          </div>
        )}

        {!isSidebarCollapsed && (
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">분석 단계</h2>
          </div>
        )}

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
                  "w-full flex items-center gap-3 rounded-lg text-left transition-all",
                  isSidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5",
                  "hover:bg-muted/50",
                  isActive && "bg-primary/10 border border-primary/20 shadow-sm",
                  !isClickable && "opacity-50 cursor-not-allowed",
                  isClickable && !isActive && "cursor-pointer"
                )}
                title={isSidebarCollapsed ? step.label : undefined}
              >
                {/* 아이콘 */}
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && !isActive && "bg-foreground text-background",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted && !isActive ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* 라벨 (펼쳐졌을 때만) */}
                {!isSidebarCollapsed && (
                  <>
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
                  </>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="bg-muted/10 px-8 h-12 shadow-sm flex items-center">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1

                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        ) : item.href ? (
                          <BreadcrumbLink asChild>
                            <Link href={item.href}>{item.label}</Link>
                          </BreadcrumbLink>
                        ) : item.onClick ? (
                          <BreadcrumbLink onClick={item.onClick}>
                            {item.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{item.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <div className={cn(
          "flex-1 overflow-y-auto px-8 pt-6 pb-8 custom-scrollbar",
          bottomPreview && isPreviewExpanded && "pb-4"
        )}>
          {children}
        </div>

        {/* 하단 데이터 미리보기 */}
        {bottomPreview && (
          <div className={cn(
            "bg-muted/10 shadow-sm transition-all duration-300",
            isPreviewExpanded ? "h-[300px]" : "h-12"
          )}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-2">
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

      {/* 분석 중 오버레이 */}
      <AnalyzingOverlay isAnalyzing={isAnalyzing} message={analyzingMessage} />
    </div>
  )
}