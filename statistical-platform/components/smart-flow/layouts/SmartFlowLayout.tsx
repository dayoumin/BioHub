'use client'

import React, { ReactNode, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  HelpCircle,
  X,
  BarChart3,
  Target,
  Settings,
  Play,
  MessageCircle,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FloatingStepIndicator, type StepItem } from '@/components/common/FloatingStepIndicator'
import { cn } from '@/lib/utils'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useUI } from '@/contexts/ui-context'
import { SettingsModal } from '@/components/layout/settings-modal'
import { HelpModal } from '@/components/layout/help-modal'
import { DomainSwitcher } from '@/components/terminology/DomainSwitcher'

// 4단계 스텝 정의
const STEPS: StepItem[] = [
  { id: 1, label: '탐색', icon: BarChart3 },
  { id: 2, label: '방법', icon: Target },
  { id: 3, label: '변수', icon: Settings },
  { id: 4, label: '분석', icon: Play },
]



export interface SmartFlowLayoutProps {
  currentStep: number
  steps: Array<{ id: number; label: string; completed?: boolean }>
  onStepChange?: (step: number) => void
  children: ReactNode

  // 히스토리/도움말 (SmartFlow 전용)
  showHistory?: boolean
  showHelp?: boolean
  onHistoryToggle?: () => void
  onHelpToggle?: () => void
  systemMemory?: number | null
  historyPanel?: ReactNode
  historyCount?: number // 히스토리 개수 (0이면 아이콘 숨김)

  // 분석 상태
  isAnalyzing?: boolean
  analyzingMessage?: string

  // 스테퍼 표시 여부 (Hub 페이지에서는 숨김)
  showStepper?: boolean
  showHub?: boolean

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
export function SmartFlowLayout({
  currentStep,
  steps,
  onStepChange,
  children,
  showHistory = false,
  showHelp = false,
  onHistoryToggle,
  onHelpToggle,
  systemMemory,
  historyPanel,
  historyCount = 0,
  isAnalyzing = false,
  analyzingMessage,
  showStepper = true,
  showHub = false,
  canGoNext = false,
  onNext,
  nextLabel = '다음 단계로',
  showFloatingNav = true,
  className
}: SmartFlowLayoutProps) {
  // STEPS에 completed 정보 병합
  const stepsWithCompleted: StepItem[] = useMemo(() =>
    STEPS.map(step => ({
      ...step,
      completed: steps.find(s => s.id === step.id)?.completed ?? false
    }))
  , [steps])

  // 전역 UI 컨텍스트 (채팅, 설정, 도움말 모달)
  const {
    openChatPanel,
    openSettings,
    openHelp: openGlobalHelp,
    isSettingsOpen,
    isHelpOpen,
    closeSettings,
    closeHelp: closeGlobalHelp,
  } = useUI()

  // 로고 클릭 시 Hub로 돌아가기
  const resetSession = useSmartFlowStore(state => state.resetSession)

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resetSession()
  }, [resetSession])

  return (
    <div className={cn("min-h-full bg-background", className)}>
      {/* ===== 헤더 (Sticky) ===== */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* 좌측: 로고 */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                onClick={handleLogoClick}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors"
              >
                NIFS 통계 분석
              </Link>
            </div>

            {/* 우측: 앱 아이콘 (히스토리, 채팅, 도움말, 설정) */}
            <div className="flex items-center gap-1">
              {/* 히스토리 토글 버튼 (기록 있을 때만 표시) */}
              {onHistoryToggle && (historyCount > 0 || showHistory) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10", showHistory && "bg-muted")}
                  onClick={onHistoryToggle}
                  title={showHistory ? "히스토리 닫기" : `히스토리 (${historyCount}개)`}
                >
                  <Clock className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openChatPanel}
                title="AI 챗봇"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openGlobalHelp}
                title="도움말"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>

              {/* Domain Switcher */}
              <DomainSwitcher compact />

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={openSettings}
                title="설정"
              >
                <Settings className="h-5 w-5" />
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
          topOffset="3.5rem"
        />
      )}

      {/* ===== 메인 콘텐츠 영역 ===== */}
      <main className="max-w-6xl mx-auto">
        <div className="px-6 py-8 space-y-6">
          {/* SmartFlow 전용 도움말 패널 */}
          {showHelp && onHelpToggle && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">데이터 크기 가이드</CardTitle>
                  <Button variant="ghost" size="sm" onClick={onHelpToggle}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">현재 제한사항</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 최대 파일: 50MB</li>
                      <li>• 최대 데이터: 100,000행 × 1,000열</li>
                      <li>• 권장: 10,000행 이하</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">메모리별 권장 크기</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• 4GB RAM: ~10,000행</li>
                      <li>• 8GB RAM: ~30,000행</li>
                      <li>• 16GB RAM: ~60,000행</li>
                      {systemMemory && (
                        <li className="font-medium text-blue-700 dark:text-blue-300">
                          → 감지된 메모리: {systemMemory}GB
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

      {/* ===== 플로팅 히스토리 패널 (Sheet) ===== */}
      <Sheet open={showHistory} onOpenChange={(open) => !open && onHistoryToggle?.()}>
        <SheetContent side="right" className="w-96 sm:w-[400px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              분석 히스토리
            </SheetTitle>
          </SheetHeader>
          <div className="py-4">
            {historyPanel}
          </div>
        </SheetContent>
      </Sheet>

      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-80">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {analyzingMessage || '분석 중...'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 전역 모달들 */}
      <SettingsModal open={isSettingsOpen} onOpenChange={closeSettings} />
      <HelpModal open={isHelpOpen} onOpenChange={closeGlobalHelp} />
      {/* ===== 플로팅 네비게이션 버튼 ===== */}
      {showFloatingNav && !showHub && onNext && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Button
            onClick={onNext}
            disabled={!canGoNext || isAnalyzing}
            size="lg"
            data-testid="floating-next-btn"
            className={cn(
              "shadow-lg px-6 gap-2 transition-all",
              canGoNext && !isAnalyzing
                ? "bg-primary hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      )}

    </div>
  )
}
