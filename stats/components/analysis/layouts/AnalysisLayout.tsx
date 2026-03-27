'use client'

import React, { ReactNode, useMemo } from 'react'
import {
  HelpCircle,
  X,
  BarChart3,
  Target,
  Settings,
  Play,
  ChevronRight,
  Loader2,
  Home,
  FlaskConical,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FloatingStepIndicator, type StepItem } from '@/components/common/FloatingStepIndicator'
import { cn } from '@/lib/utils'
import { useUI } from '@/contexts/ui-context'
import { SettingsModal } from '@/components/layout/settings-modal'
import { HelpModal } from '@/components/layout/help-modal'
import { STEP_STYLES } from '@/components/analysis/common/style-constants'
import { LAYOUT } from '@/components/common/card-styles'
import { useTerminology } from '@/hooks/use-terminology'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Step icons (라벨은 terminology에서 동적으로 가져옴)
const STEP_ICONS = [BarChart3, Target, Settings, Play] as const



export interface AnalysisLayoutProps {
  currentStep: number
  steps: Array<{ id: number; label: string; completed?: boolean; skipped?: boolean }>
  onStepChange?: (step: number) => void
  children: ReactNode

  // 도움말 (Analysis 전용)
  showHelp?: boolean
  onHelpToggle?: () => void
  systemMemory?: number | null
  /** 우측 히스토리 사이드바 (UnifiedHistorySidebar 래퍼) */
  historySidebar?: ReactNode

  // 분석 상태
  isAnalyzing?: boolean
  analyzingMessage?: string

  // 스테퍼 표시 여부 (Hub 페이지에서는 숨김)
  showStepper?: boolean
  showHub?: boolean
  /** Analysis 모드에서 허브로 돌아가기 */
  onBackToHub?: () => void

  className?: string
  // 플로팅 네비게이션 버튼
  canGoNext?: boolean
  onNext?: () => void
  nextLabel?: string
  showFloatingNav?: boolean
}

/**
 * 스마트 통계 분석 레이아웃 (v7 - Clean Stepper)
 *
 * 변경사항 (2025-11-26):
 * - h-screen 제거 → 부모 레이아웃 스크롤 사용
 * - 이중 스크롤 제거 → Single Page
 * - 헤더(sticky) + 스테퍼(sticky) + 콘텐츠
 * - 좌우 버튼 제거 → 스텝 클릭으로 이동
 */

// S3: 분석 플로우 배경 틴트 (렌더마다 객체 재생성 방지)
const ANALYSIS_FLOW_BG_STYLE = {
  backgroundColor: 'color-mix(in oklch, var(--section-accent-analysis) 4%, var(--background))',
} as const

export function AnalysisLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  showHelp = false,
  onHelpToggle,
  systemMemory,
  historySidebar,
  isAnalyzing = false,
  analyzingMessage,
  showStepper = true,
  showHub = false,
  onBackToHub,
  canGoNext = false,
  onNext,
  nextLabel,
  showFloatingNav = true,
  className
}: AnalysisLayoutProps) {
  const t = useTerminology()

  // 4단계 스텝 정의 (terminology 기반)
  const STEPS: StepItem[] = useMemo(() => {
    const labels = t.analysis.stepShortLabels
    return [
      { id: 1, label: labels.exploration, icon: STEP_ICONS[0] },
      { id: 2, label: labels.method, icon: STEP_ICONS[1] },
      { id: 3, label: labels.variable, icon: STEP_ICONS[2] },
      { id: 4, label: labels.analysis, icon: STEP_ICONS[3] },
    ]
  }, [t])

  // STEPS에 completed/skipped 정보 병합
  const stepsWithCompleted: StepItem[] = useMemo(() =>
    STEPS.map(step => {
      const src = steps.find(s => s.id === step.id)
      return {
        ...step,
        completed: src?.completed ?? false,
        skipped: src?.skipped ?? false,
      }
    })
    , [steps, STEPS])

  // 전역 UI 컨텍스트 (설정, 도움말 모달)
  const {
    openHelp: openGlobalHelp,
    isSettingsOpen,
    isHelpOpen,
    closeSettings,
    closeHelp: closeGlobalHelp,
  } = useUI()

  const resolvedNextLabel = nextLabel ?? t.analysis.layout.nextStep

  // S3: 분석 플로우 진입 시 미세한 틸 틴트 (Hub/브라우저는 제외)
  const isAnalysisFlow = showStepper && !showHub

  return (
    <div
      className={cn("min-h-screen bg-background", className)}
      style={isAnalysisFlow ? ANALYSIS_FLOW_BG_STYLE : undefined}
    >


      {/* ===== 헤더 (Sticky, 섹션 아이덴티티 + accent bar) ===== */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
        style={{ borderTop: `2px solid var(${showHub ? '--section-accent-hub' : '--section-accent-analysis'})` }}
      >
        <div className={cn(LAYOUT.maxWidth, 'px-6')}>
          <div className="flex items-center justify-between h-10">
            {/* 좌: 섹션명 + 아이콘 */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {showHub ? (
                <>
                  <Home className="h-4 w-4" style={{ color: 'var(--section-accent-hub)' }} />
                  <span className="text-sm font-medium">Hub</span>
                </>
              ) : (
                <>
                  {onBackToHub && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onBackToHub}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span className="text-xs">{t.analysis.buttons.backToHub}</span>
                    </Button>
                  )}
                  <FlaskConical className="h-4 w-4" style={{ color: 'var(--section-accent-analysis)' }} />
                  <span className="text-sm font-medium">Analysis</span>
                </>
              )}
            </div>
            {/* 우: 액션 아이콘 */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={openGlobalHelp}
                title={t.analysis.layout.helpLabel}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ===== 스테퍼 (조건부 표시) ===== */}
      {showStepper && (
        <FloatingStepIndicator
          steps={stepsWithCompleted}
          currentStep={currentStep}
          onStepChange={onStepChange}
          topOffset="3rem"
        />
      )}

      {/* ===== 메인 콘텐츠 + 히스토리 사이드바 ===== */}
      <div className={cn(LAYOUT.maxWidth, 'flex gap-6')}>
        <main className="min-w-0 flex-1">
          <div className={cn(STEP_STYLES.mainContentPaddingX, STEP_STYLES.mainContentPaddingY, STEP_STYLES.sectionGap, showFloatingNav && !showHub && onNext && 'pb-20')}>
            {/* Analysis 전용 도움말 패널 */}
            {showHelp && onHelpToggle && (
              <Card className="border-info-border bg-info-bg">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{t.analysis.layout.dataSizeGuide}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onHelpToggle}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">{t.analysis.layout.currentLimits}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• {t.analysis.layout.limitFileSize}</li>
                        <li>• {t.analysis.layout.limitDataSize}</li>
                        <li>• {t.analysis.layout.limitRecommended}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">{t.analysis.layout.memoryRecommendation}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• {t.analysis.layout.memoryTier4GB}</li>
                        <li>• {t.analysis.layout.memoryTier8GB}</li>
                        <li>• {t.analysis.layout.memoryTier16GB}</li>
                        {systemMemory && (
                          <li className="font-medium text-info-muted">
                            {t.analysis.layout.detectedMemory(systemMemory)}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 메인 콘텐츠 */}
            {children}
          </div>
        </main>

        {/* 우측 히스토리 사이드바 (분석 플로우 진입 시만 표시) */}
        {isAnalysisFlow && historySidebar && (
          <div className={STEP_STYLES.mainContentPaddingY}>
            {historySidebar}
          </div>
        )}
      </div>

      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-80">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {analyzingMessage || t.analysis.layout.analyzingDefault}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 전역 모달들 */}
      <SettingsModal open={isSettingsOpen} onOpenChange={closeSettings} />
      <HelpModal open={isHelpOpen} onOpenChange={closeGlobalHelp} />
      {/* ===== 하단 네비게이션 바 ===== */}
      {showFloatingNav && !showHub && onNext && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/80 backdrop-blur-md">
          <div className={cn(LAYOUT.maxWidth, 'px-6 py-3 flex items-center justify-end')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={onNext}
                    disabled={!canGoNext || isAnalyzing}
                    data-testid="floating-next-btn"
                    className={cn(
                      "px-5 gap-2 transition-all",
                      canGoNext && !isAnalyzing
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.analysis.layout.analyzingDefault}
                      </>
                    ) : (
                      <>
                        {resolvedNextLabel}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canGoNext && !isAnalyzing && (
                <TooltipContent side="top">
                  {t.analysis.layout.floatingNavDisabledHint}
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      )}

    </div>
  )
}
